import { supabase } from './supabase';

const FONNTE_SEND_URL = 'https://api.fonnte.com/send';
const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3001/api');

export const normalizeWhatsAppNumber = (phone = '') => {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('62')) return cleaned;
  if (cleaned.startsWith('0')) return cleaned.replace(/^0/, '62');
  if (cleaned.startsWith('8')) return `62${cleaned}`;
  return cleaned;
};

export const buildManualWhatsAppUrl = (phone, message = '') => {
  const target = normalizeWhatsAppNumber(phone);
  if (!target) return '';
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
};

export const getWhatsAppSenderConfig = (tenant) => {
  const settings = tenant?.settings || {};
  return {
    mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
    token: settings.fonnte_token || '',
    tenantCode: tenant?.code || tenant?.tenant_code || '',
  };
};

const getApiAuthToken = (tenant) => {
  if (tenant?.token) return tenant.token;
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('TENANT_TOKEN') || localStorage.getItem('EMPLOYEE_TOKEN') || '';
};

const extractResiFromMessage = (message = '') => {
  const text = String(message || '');
  const direct = text.match(/Resi\s*:?\s*\*?([A-Z0-9_-]+)/i);
  if (direct) return direct[1].toUpperCase();
  const tracking = text.match(/[?&]resi=([A-Z0-9_-]+)/i);
  return tracking ? tracking[1].toUpperCase() : '';
};

const isPickupMessage = (message = '') => {
  const text = String(message || '');
  return /\bDI\s*AMBIL\b/i.test(text) || /\bDIAMBIL\b/i.test(text) || /status[^\n]*\bDiambil\b/i.test(text) || /\bSudah Diambil\b/i.test(text);
};

const isCompletionMessage = (message = '') => !isPickupMessage(message) && /\bSELESAI\b/i.test(String(message || ''));

const getServiceDiscount = (issue = '') => {
  const match = String(issue || '').match(/\[Diskon:\s*Rp\s*([^\]]+)\]/i);
  return match ? Number(String(match[1] || '').replace(/\D/g, '')) || 0 : 0;
};

const parseCompletionMetaFromIssue = (issue = '') => {
  const text = String(issue || '');
  const warranty = text.match(/\[Garansi Servis:\s*([^\]|]+?)(?:\s*\|\s*berlaku sampai\s*([^\]]+))?\]/i);
  const pickup = text.match(/\[Batas Pengambilan:\s*(\d+)\s*hari(?:\s*\|\s*maksimal\s*([^\]]+))?\]/i);
  const warning = text.match(/\[Peringatan Pengambilan:\s*([^\]]+)\]/i);
  return {
    warrantyLabel: warranty ? String(warranty[1] || '').trim() : '',
    warrantyEnd: warranty ? String(warranty[2] || '').trim() : '',
    pickupDays: pickup ? Number(pickup[1]) : 0,
    pickupEnd: pickup ? String(pickup[2] || '').trim() : '',
    pickupMessage: warning ? String(warning[1] || '').trim() : '',
  };
};

const extractRepairDetails = (issue = '') => {
  const text = String(issue || '');
  const part = text.match(/\[Sparepart diganti:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  const service = text.match(/\[Jasa Servis:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  const result = text.match(/\[Hasil Perbaikan:\s*([^\]]+)\]/i)?.[1]?.trim() || '';
  return { part, service, result };
};

const paymentInfoText = (settings = {}) => {
  const bankName = settings.bank_name || '';
  const account = settings.bank_account || '';
  const holder = settings.bank_holder || '';
  if (bankName || account || holder) {
    const main = [bankName, account].filter(Boolean).join(' ').trim();
    return holder ? `${main}${main ? ' ' : ''}a/n ${holder}`.trim() : main;
  }
  return String(settings.store_bank || '').trim();
};

const isPublicHttpUrl = (value = '') => /^https?:\/\//i.test(String(value || '').trim());

const fetchServiceForMessage = async (tenant, message) => {
  const resi = extractResiFromMessage(message);
  if (!resi) return { resi: '', service: null };
  let query = supabase.from('services').select('*').eq('resi', resi);
  const tenantCode = tenant?.code || tenant?.tenant_code || '';
  if (tenantCode) query = query.eq('tenant_code', tenantCode);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return { resi, service: data || null };
};

const buildCompletionInvoiceDelivery = async ({ tenant, message, urlMedia = '' }) => {
  if (!isCompletionMessage(message)) return { message, urlMedia, resi: '', mediaLabel: '' };
  try {
    const { resi, service } = await fetchServiceForMessage(tenant, message);
    if (!resi || !service) return { message, urlMedia, resi: '', mediaLabel: '' };

    const settings = tenant?.settings || {};
    const storeName = settings.storeName || tenant?.name || 'Toko Servis';
    const discount = getServiceDiscount(service.issue || '');
    const partFee = Number(service.part_fee || 0);
    const jasaFee = Number(service.jasa_fee || 0);
    const total = Math.max(0, partFee + jasaFee - discount);
    const details = extractRepairDetails(service.issue || '');
    const meta = parseCompletionMetaFromIssue(service.issue || '');
    const paymentInfo = paymentInfoText(settings);
    const qrisUrl = settings.qrisUrl || settings.qris_image_url || '';

    const lines = [
      '🧾 *NOTA TAGIHAN SERVIS*',
      `*${storeName}*`,
      '',
      `No. Nota: ${service.resi}`,
      `Pelanggan: ${service.customer_name || '-'}`,
      `Perangkat: ${service.device_name || '-'}`,
      details.part ? `Sparepart: ${details.part}` : '',
      details.service ? `Jasa: ${details.service}` : '',
      details.result ? `Hasil Perbaikan: ${details.result}` : '',
      '',
      `Biaya Sparepart: Rp ${partFee.toLocaleString('id-ID')}`,
      `Biaya Jasa: Rp ${jasaFee.toLocaleString('id-ID')}`,
      discount > 0 ? `Diskon: - Rp ${discount.toLocaleString('id-ID')}` : '',
      `*TOTAL YANG HARUS DIBAYAR: Rp ${total.toLocaleString('id-ID')}*`,
      '',
      '*Status: SERVIS SELESAI — MENUNGGU PEMBAYARAN / PENGAMBILAN*',
      paymentInfo ? `Pembayaran: ${paymentInfo}` : '',
      meta.warrantyLabel ? `Garansi Servis: ${meta.warrantyLabel}${meta.warrantyEnd ? ` — sampai ${meta.warrantyEnd}` : ''}` : '',
      meta.pickupMessage ? `⚠️ ${meta.pickupMessage}` : (meta.pickupDays > 0 ? `⚠️ Batas pengambilan: ${meta.pickupDays} hari.` : ''),
      '',
      'Setelah pembayaran dan barang diambil, nota pelunasan beserta barcode/QR garansi akan dikirim.',
    ].filter(Boolean);

    return {
      message: lines.join('\n'),
      urlMedia: urlMedia || (isPublicHttpUrl(qrisUrl) ? qrisUrl : ''),
      resi,
      mediaLabel: isPublicHttpUrl(qrisUrl) ? 'QRIS pembayaran' : '',
    };
  } catch (error) {
    console.warn('Nota tagihan servis tidak dapat dibentuk:', error);
    return { message, urlMedia, resi: '', mediaLabel: '' };
  }
};

const buildPickupReceiptDelivery = async ({ tenant, message, urlMedia = '' }) => {
  if (!isPickupMessage(message)) return { message, urlMedia, resi: '', qrUrl: '' };
  try {
    const { resi, service } = await fetchServiceForMessage(tenant, message);
    if (!resi || !service) return { message, urlMedia, resi: '', qrUrl: '' };

    const settings = tenant?.settings || {};
    const storeName = settings.storeName || tenant?.name || 'Toko Servis';
    const discount = getServiceDiscount(service.issue || '');
    const subtotal = Number(service.part_fee || 0) + Number(service.jasa_fee || 0);
    const total = Math.max(0, subtotal - discount);
    const meta = parseCompletionMetaFromIssue(service.issue || '');
    const trackingUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/tracking?resi=${encodeURIComponent(service.resi)}`
      : '';
    const qrUrl = trackingUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=16&data=${encodeURIComponent(trackingUrl)}`
      : '';

    const lines = [
      '🧾 *NOTA PELUNASAN SERVIS (GARANSI)*',
      `*${storeName}*`,
      '',
      `No. Nota: ${service.resi}`,
      `Pelanggan: ${service.customer_name || '-'}`,
      `Perangkat: ${service.device_name || '-'}`,
      `Biaya Sparepart: Rp ${Number(service.part_fee || 0).toLocaleString('id-ID')}`,
      `Biaya Jasa: Rp ${Number(service.jasa_fee || 0).toLocaleString('id-ID')}`,
      discount > 0 ? `Diskon: - Rp ${discount.toLocaleString('id-ID')}` : '',
      `*TOTAL LUNAS: Rp ${total.toLocaleString('id-ID')}*`,
      '',
      meta.warrantyLabel ? `Garansi Servis: *${meta.warrantyLabel}*${meta.warrantyEnd ? ` — sampai ${meta.warrantyEnd}` : ''}` : 'Garansi Servis: Tanpa garansi tambahan',
      '*Status: SUDAH DIAMBIL / LUNAS*',
      '',
      'Barcode/QR garansi terlampir. Simpan nota ini sebagai bukti servis dan garansi.',
    ].filter(Boolean);

    return { message: lines.join('\n'), urlMedia: urlMedia || qrUrl, resi, qrUrl };
  } catch (error) {
    console.warn('Nota pengambilan WA tidak dapat dibentuk:', error);
    return { message, urlMedia, resi: '', qrUrl: '' };
  }
};

const sendThroughBackendGateway = async ({ tenant, target, message, mode, token, urlMedia = '' }) => {
  const tenantCode = tenant?.code || tenant?.tenant_code || '';
  const authToken = getApiAuthToken(tenant);
  if (!tenantCode || !authToken) throw new Error('Sesi toko tidak tersedia untuk mengakses WhatsApp Gateway.');

  const response = await fetch(`${API_BASE_URL}/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      tenant_code: tenantCode,
      target,
      message,
      gateway_mode: mode,
      ...(urlMedia ? { url: urlMedia } : {}),
      ...(mode === 'CUSTOM' && token ? { gateway_token: token } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `WhatsApp Gateway gagal (${response.status}).`);
  return { status: payload.status || 'sent', provider: payload.provider || 'fonnte', target: payload.target || target };
};

const sendDirectCustomGatewayFallback = async ({ target, message, token, urlMedia = '' }) => {
  const params = new URLSearchParams({ target, message });
  if (urlMedia) params.append('url', urlMedia);
  const response = await fetch(FONNTE_SEND_URL, { method: 'POST', headers: { Authorization: token }, body: params }).catch(() => {
    throw new Error('WhatsApp Gateway tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.');
  });
  if (response.status === 401 || response.status === 403) throw new Error('Token Fonnte tidak valid atau kadaluarsa. Periksa kembali token di Pengaturan WhatsApp Gateway.');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) throw new Error(payload?.reason || payload?.detail || payload?.message || `WhatsApp Gateway Fonnte gagal (Status ${response.status}).`);
  return { status: 'sent', provider: 'fonnte', target };
};

const markPickupReceiptSent = (resi) => {
  if (!resi || typeof window === 'undefined') return;
  window.__UNITPRO_PICKUP_RECEIPT_SENT__ = window.__UNITPRO_PICKUP_RECEIPT_SENT__ || {};
  window.__UNITPRO_PICKUP_RECEIPT_SENT__[resi] = Date.now();
};

export const sendWhatsAppNotification = async ({ tenant, target, message, urlMedia = '', openManual = true } = {}) => {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) return { status: 'skipped', reason: 'missing_target' };

  const baseMessage = String(message || '').trim();
  if (!baseMessage) return { status: 'skipped', reason: 'missing_message' };

  const pickupDelivery = await buildPickupReceiptDelivery({ tenant, message: baseMessage, urlMedia });
  const isPickup = Boolean(pickupDelivery.resi);
  const completionDelivery = isPickup
    ? { message: baseMessage, urlMedia, resi: '', mediaLabel: '' }
    : await buildCompletionInvoiceDelivery({ tenant, message: baseMessage, urlMedia });
  const isCompletion = Boolean(completionDelivery.resi);
  const cleanMessage = isPickup ? pickupDelivery.message : (isCompletion ? completionDelivery.message : baseMessage);
  const mediaUrl = isPickup ? pickupDelivery.urlMedia : (isCompletion ? completionDelivery.urlMedia : urlMedia);

  const { mode, token } = getWhatsAppSenderConfig(tenant);
  let gatewayError = null;
  try {
    const result = await sendThroughBackendGateway({ tenant, target: normalizedTarget, message: cleanMessage, mode, token, urlMedia: mediaUrl });
    if (isPickup) markPickupReceiptSent(pickupDelivery.resi);
    return result;
  } catch (error) {
    gatewayError = error;
  }

  if (mode === 'CUSTOM' && token) {
    try {
      const result = await sendDirectCustomGatewayFallback({ target: normalizedTarget, message: cleanMessage, token, urlMedia: mediaUrl });
      if (isPickup) markPickupReceiptSent(pickupDelivery.resi);
      return result;
    } catch (error) {
      gatewayError = error;
    }
  }

  if (openManual && typeof window !== 'undefined') {
    let manualMessage = cleanMessage;
    if (isPickup && pickupDelivery.qrUrl) manualMessage += `\n\nBarcode/QR garansi:\n${pickupDelivery.qrUrl}`;
    else if (isCompletion && mediaUrl && completionDelivery.mediaLabel) manualMessage += `\n\n${completionDelivery.mediaLabel}:\n${mediaUrl}`;
    const url = buildManualWhatsAppUrl(normalizedTarget, manualMessage);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      if (isPickup) markPickupReceiptSent(pickupDelivery.resi);
      return { status: 'manual', provider: 'wa.me', target: normalizedTarget, gatewayError };
    }
  }

  return {
    status: 'failed',
    reason: 'gateway_unavailable',
    target: normalizedTarget,
    error: gatewayError || new Error('WhatsApp Gateway belum dikonfigurasi.'),
  };
};
