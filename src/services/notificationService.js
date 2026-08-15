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

const buildRawWhatsAppUrl = (phone, message = '') => {
  const target = normalizeWhatsAppNumber(phone);
  if (!target) return '';
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
};

export const buildManualWhatsAppUrl = (phone, message = '') => buildRawWhatsAppUrl(phone, message);

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

const getRuntimeTenant = () => {
  if (typeof window === 'undefined') return {};
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('TENANT_SETTINGS') || '{}'); } catch {}
  return {
    code: localStorage.getItem('TENANT_CODE') || '',
    tenant_code: localStorage.getItem('TENANT_CODE') || '',
    settings,
    token: localStorage.getItem('EMPLOYEE_TOKEN') || localStorage.getItem('TENANT_TOKEN') || '',
  };
};

const extractResiFromMessage = (message = '') => {
  const text = String(message || '');
  const direct = text.match(/(?:No\.\s*Nota|Resi)\s*:?\s*\*?([A-Z0-9_-]+)/i);
  if (direct) return direct[1].toUpperCase();
  const tracking = text.match(/[?&]resi=([A-Z0-9_-]+)/i);
  return tracking ? tracking[1].toUpperCase() : '';
};

const normalizeStatus = (value = '') => String(value || '').toUpperCase().replace(/\s+/g, '');

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

const looksLikeAccountNumber = (value = '') => {
  const text = String(value || '').trim();
  const digits = text.replace(/\D/g, '');
  return digits.length >= 6 && digits.length >= Math.ceil(text.length * 0.6);
};

const paymentInfoLines = (settings = {}) => {
  const bankName = String(settings.bank_name || '').trim();
  let account = String(settings.bank_account || '').trim();
  let holder = String(settings.bank_holder || '').trim();

  // Older settings can have the account number and account holder entered in
  // reverse fields. Present the payment instruction safely without changing
  // saved store data.
  if (!looksLikeAccountNumber(account) && looksLikeAccountNumber(holder)) {
    [account, holder] = [holder, account];
  }

  if (bankName || account || holder) {
    return [
      '🏦 *PEMBAYARAN*',
      bankName ? `Bank: ${bankName}` : '',
      account ? `No. Rekening: *${account}*` : '',
      holder ? `a.n. ${holder}` : '',
    ].filter(Boolean);
  }

  const legacyPayment = String(settings.store_bank || '').trim();
  return legacyPayment ? ['🏦 *PEMBAYARAN*', legacyPayment] : [];
};

const isPublicHttpUrl = (value = '') => /^https?:\/\//i.test(String(value || '').trim());

const getStoreName = (tenant = {}) => {
  const settings = tenant?.settings || {};
  return settings.storeName || settings.store_name || tenant?.name || 'UnitPro';
};

const joinMessageSections = (...sections) => sections
  .map((section) => (Array.isArray(section) ? section : [section])
    .filter(Boolean)
    .join('\n'))
  .filter(Boolean)
  .join('\n\n');

const buildPublicReceiptUrl = (tenant = {}, service = {}, type = 'completion') => {
  if (typeof window === 'undefined' || !service?.resi) return '';
  const query = new URLSearchParams({ resi: service.resi, type, format: 'a4' });
  const tenantCode = tenant?.code || tenant?.tenant_code || service?.tenant_code || '';
  if (tenantCode) query.set('tenant_code', tenantCode);
  return `${window.location.origin}/print-nota?${query.toString()}`;
};

const fetchServiceByResi = async (tenant, resi) => {
  if (!resi) return null;
  let query = supabase.from('services').select('*').eq('resi', resi);
  const tenantCode = tenant?.code || tenant?.tenant_code || '';
  if (tenantCode) query = query.eq('tenant_code', tenantCode);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
};

const buildCompletionInvoiceFromService = (tenant, service, urlMedia = '') => {
  const settings = tenant?.settings || {};
  const storeName = settings.storeName || settings.store_name || tenant?.name || 'UnitPro';
  const discount = getServiceDiscount(service.issue || '');
  const partFee = Number(service.part_fee || 0);
  const jasaFee = Number(service.jasa_fee || 0);
  const total = Math.max(0, partFee + jasaFee - discount);
  const details = extractRepairDetails(service.issue || '');
  const meta = parseCompletionMetaFromIssue(service.issue || '');
  const paymentLines = paymentInfoLines(settings);
  const qrisUrl = settings.qrisUrl || settings.qris_image_url || '';
  const invoiceUrl = buildPublicReceiptUrl(tenant, service, 'completion');

  return {
    type: 'completion',
    message: joinMessageSections(
      ['🧾 *NOTA TAGIHAN SERVIS*', `*${storeName}*`, `No. Nota: \`${service.resi}\``],
      [
        '*DATA SERVIS*',
        `Pelanggan : ${service.customer_name || '-'}`,
        `Perangkat : ${service.device_name || '-'}`,
        details.part ? `Sparepart  : ${details.part}` : '',
        details.service ? `Jasa       : ${details.service}` : '',
        details.result ? `Hasil      : ${details.result}` : '',
      ],
      [
        '───────────────',
        '*RINCIAN TAGIHAN*',
        `Sparepart : Rp ${partFee.toLocaleString('id-ID')}`,
        `Jasa      : Rp ${jasaFee.toLocaleString('id-ID')}`,
        discount > 0 ? `Diskon    : - Rp ${discount.toLocaleString('id-ID')}` : '',
        '───────────────',
        `*TOTAL TAGIHAN: Rp ${total.toLocaleString('id-ID')}*`,
      ],
      ['📌 *STATUS SERVIS*', 'Servis telah selesai dan menunggu pembayaran atau pengambilan.'],
      paymentLines,
      meta.warrantyLabel ? `Garansi Servis: ${meta.warrantyLabel}${meta.warrantyEnd ? ` — sampai ${meta.warrantyEnd}` : ''}` : '',
      meta.pickupMessage
        ? `⚠️ *Batas Pengambilan*\n${meta.pickupMessage}`
        : (meta.pickupDays > 0 ? `⚠️ *Batas Pengambilan*\nHarap ambil perangkat maksimal ${meta.pickupDays} hari setelah servis selesai.` : ''),
      'Silakan lakukan pembayaran dan pengambilan sesuai total tagihan di atas.',
      invoiceUrl ? ['🖨 *Lihat Nota Digital*', invoiceUrl] : [],
      'Setelah barang diambil dan lunas, kami akan mengirim Nota Pelunasan serta Link Garansi.',
    ),
    urlMedia: urlMedia || (isPublicHttpUrl(qrisUrl) ? qrisUrl : ''),
    resi: service.resi,
    mediaLabel: isPublicHttpUrl(qrisUrl) ? 'QRIS pembayaran' : '',
  };
};

const buildPickupReceiptFromService = (tenant, service, urlMedia = '') => {
  const settings = tenant?.settings || {};
  const storeName = settings.storeName || settings.store_name || tenant?.name || 'UnitPro';
  const discount = getServiceDiscount(service.issue || '');
  const subtotal = Number(service.part_fee || 0) + Number(service.jasa_fee || 0);
  const total = Math.max(0, subtotal - discount);
  const meta = parseCompletionMetaFromIssue(service.issue || '');
  const warrantyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/garansi?resi=${encodeURIComponent(service.resi)}`
    : '';
  const qrUrl = warrantyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=16&data=${encodeURIComponent(warrantyUrl)}`
    : '';
  const receiptUrl = buildPublicReceiptUrl(tenant, service, 'pickup');

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
    warrantyUrl ? `🔗 *Link Garansi:* ${warrantyUrl}` : '',
    receiptUrl ? `🖨 *Nota Garansi Digital:* ${receiptUrl}` : '',
    'Simpan nota ini sebagai bukti pembayaran, servis, dan garansi.',
  ].filter(Boolean);

  return {
    type: 'pickup',
    message: lines.join('\n'),
    urlMedia: urlMedia || qrUrl,
    resi: service.resi,
    qrUrl,
    warrantyUrl,
  };
};

export const buildServiceReceivedMessage = ({ tenant, services = [] } = {}) => {
  const list = (Array.isArray(services) ? services : []).filter((service) => service?.resi);
  if (!list.length) return '';

  const storeName = getStoreName(tenant);
  const customer = list[0].customer_name || 'Pelanggan';
  const unitLines = list.map((service, index) => {
    const trackingUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/tracking?resi=${encodeURIComponent(service.resi)}`
      : '';
    return [
      `*${index + 1}. ${service.device_name || 'Perangkat'}*`,
      `No. Resi: ${service.resi}`,
      service.issue ? `Keluhan: ${String(service.issue).split('| Kelengkapan:')[0].trim()}` : '',
      trackingUrl ? `Lacak: ${trackingUrl}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return [
    `Halo Kak ${customer},`,
    '',
    '📥 *KONFIRMASI SERVIS DITERIMA*',
    `Terima kasih, ${list.length === 1 ? 'perangkat Anda telah' : `${list.length} perangkat Anda telah`} kami terima di *${storeName}*.`,
    '',
    unitLines,
    '',
    'Kami akan melakukan pengecekan terlebih dahulu. Bila diperlukan persetujuan biaya, kami akan menghubungi Anda melalui WhatsApp ini.',
    'Simpan nomor resi untuk memantau progres servis kapan saja.',
  ].join('\n');
};

export const buildServiceStatusMessage = ({ tenant, service, status, approval = {} } = {}) => {
  if (!service?.resi) return '';
  const normalizedStatus = normalizeStatus(status || service.status);
  const storeName = getStoreName(tenant);
  const customer = service.customer_name || 'Pelanggan';
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tracking?resi=${encodeURIComponent(service.resi)}`
    : '';

  if (normalizedStatus === 'SELESAI') return buildCompletionInvoiceFromService(tenant, { ...service, status: 'SELESAI' }).message;
  if (normalizedStatus === 'DIAMBIL') return buildPickupReceiptFromService(tenant, { ...service, status: 'DIAMBIL' }).message;

  if (normalizedStatus === 'PERSETUJUAN' || normalizedStatus === 'MENUNGGUPERSETUJUAN') {
    const action = String(approval.action || approval.description || 'perbaikan yang diperlukan').trim();
    const estimate = Number(approval.estimate ?? approval.amount ?? 0);
    return [
      `Halo Kak ${customer},`,
      '',
      '🛠️ *PERSETUJUAN PERBAIKAN DIPERLUKAN*',
      `Perangkat: *${service.device_name || '-'}*`,
      `No. Resi: *${service.resi}*`,
      '',
      `Hasil pengecekan: ${action}`,
      estimate > 0 ? `Estimasi biaya: *Rp ${estimate.toLocaleString('id-ID')}*` : 'Estimasi biaya akan diinformasikan oleh tim kami.',
      '',
      'Mohon balas *SETUJU* bila perbaikan dapat kami lanjutkan, atau hubungi kami bila ingin berkonsultasi terlebih dahulu.',
      trackingUrl ? `Lacak status servis: ${trackingUrl}` : '',
      '',
      `Terima kasih,\n*${storeName}*`,
    ].filter(Boolean).join('\n');
  }

  const statusLabel = normalizedStatus === 'DITERIMA'
    ? 'SERVIS DITERIMA'
    : String(status || service.status || 'DIPROSES').replace(/_/g, ' ');
  return [
    `Halo Kak ${customer},`,
    '',
    `📌 *${statusLabel}*`,
    `Perangkat: *${service.device_name || '-'}*`,
    `No. Resi: *${service.resi}*`,
    '',
    normalizedStatus === 'DITERIMA'
      ? `Perangkat Anda sudah kami terima di *${storeName}* dan akan segera dicek oleh tim.`
      : `Status servis Anda di *${storeName}* telah diperbarui.`,
    trackingUrl ? `Lacak progres: ${trackingUrl}` : '',
    '',
    'Terima kasih atas kepercayaan Anda.',
  ].filter(Boolean).join('\n');
};

export const prepareServiceWhatsAppDelivery = async ({ tenant, message = '', urlMedia = '' } = {}) => {
  const baseMessage = String(message || '').trim();
  const resi = extractResiFromMessage(baseMessage);
  if (!resi) return { type: 'general', message: baseMessage, urlMedia, resi: '' };

  try {
    const service = await fetchServiceByResi(tenant, resi);
    if (!service) return { type: 'general', message: baseMessage, urlMedia, resi };
    const status = normalizeStatus(service.status);

    if (status === 'DIAMBIL') return buildPickupReceiptFromService(tenant, service, urlMedia);
    if (status === 'SELESAI') return buildCompletionInvoiceFromService(tenant, service, urlMedia);

    return { type: 'general', message: baseMessage, urlMedia, resi };
  } catch (error) {
    console.warn('Pesan servis tidak dapat dibentuk:', error);
    return { type: 'general', message: baseMessage, urlMedia, resi };
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

const nativeWindowOpen = typeof window !== 'undefined' && typeof window.open === 'function'
  ? window.open.bind(window)
  : null;

const openExternal = (url) => {
  if (!url || typeof window === 'undefined') return null;
  if (nativeWindowOpen) return nativeWindowOpen(url, '_blank', 'noopener,noreferrer');
  return window.open(url, '_blank', 'noopener,noreferrer');
};

export const sendWhatsAppNotification = async ({ tenant, target, message, urlMedia = '', openManual = true } = {}) => {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) return { status: 'skipped', reason: 'missing_target' };

  const baseMessage = String(message || '').trim();
  if (!baseMessage) return { status: 'skipped', reason: 'missing_message' };

  const prepared = await prepareServiceWhatsAppDelivery({ tenant, message: baseMessage, urlMedia });
  const cleanMessage = prepared.message || baseMessage;
  const mediaUrl = prepared.urlMedia || urlMedia;

  const { mode, token } = getWhatsAppSenderConfig(tenant);
  let gatewayError = null;
  try {
    const result = await sendThroughBackendGateway({ tenant, target: normalizedTarget, message: cleanMessage, mode, token, urlMedia: mediaUrl });
    if (prepared.type === 'pickup') markPickupReceiptSent(prepared.resi);
    return result;
  } catch (error) {
    gatewayError = error;
  }

  if (mode === 'CUSTOM' && token) {
    try {
      const result = await sendDirectCustomGatewayFallback({ target: normalizedTarget, message: cleanMessage, token, urlMedia: mediaUrl });
      if (prepared.type === 'pickup') markPickupReceiptSent(prepared.resi);
      return result;
    } catch (error) {
      gatewayError = error;
    }
  }

  if (openManual && typeof window !== 'undefined') {
    let manualMessage = cleanMessage;
    if (prepared.type === 'completion' && mediaUrl && prepared.mediaLabel) {
      manualMessage += `\n\n${prepared.mediaLabel}:\n${mediaUrl}`;
    }
    const url = buildRawWhatsAppUrl(normalizedTarget, manualMessage);
    if (url) {
      openExternal(url);
      if (prepared.type === 'pickup') markPickupReceiptSent(prepared.resi);
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

// Beberapa alur lama Admin masih membuka wa.me secara langsung setelah update status.
// Interceptor ini mengubah pesan lama tersebut menjadi Nota Tagihan saat SELESAI
// atau Nota Pelunasan + Link Garansi saat DIAMBIL, tanpa mengubah alur WA lain.
if (typeof window !== 'undefined' && nativeWindowOpen && !window.__UNITPRO_SERVICE_WA_OPEN_INTERCEPTOR__) {
  window.__UNITPRO_SERVICE_WA_OPEN_INTERCEPTOR__ = true;
  window.open = (url, target, features) => {
    const rawUrl = String(url || '');
    if (!/^https:\/\/wa\.me\//i.test(rawUrl)) return nativeWindowOpen(url, target, features);

    try {
      const parsed = new URL(rawUrl);
      const originalMessage = parsed.searchParams.get('text') || '';
      const resi = extractResiFromMessage(originalMessage);
      const looksLikeLegacyStatus = Boolean(resi) && (
        /UnitPro\s+sekarang\s*:/i.test(originalMessage)
        || /Cek\s+status\s+langsung/i.test(originalMessage)
        || /\bSELESAI\b/i.test(originalMessage)
        || /\bDI\s*AMBIL\b/i.test(originalMessage)
        || /\bDIAMBIL\b/i.test(originalMessage)
      );
      if (!looksLikeLegacyStatus) return nativeWindowOpen(url, target, features);

      const phone = parsed.pathname.replace(/^\/+/, '');
      const popup = nativeWindowOpen('about:blank', target || '_blank', features);
      prepareServiceWhatsAppDelivery({ tenant: getRuntimeTenant(), message: originalMessage })
        .then((prepared) => {
          const replacement = buildRawWhatsAppUrl(phone, prepared.message || originalMessage);
          if (!replacement) return;
          if (popup && !popup.closed) popup.location.href = replacement;
          else window.location.href = replacement;
        })
        .catch(() => {
          if (popup && !popup.closed) popup.location.href = rawUrl;
          else window.location.href = rawUrl;
        });
      return popup;
    } catch {
      return nativeWindowOpen(url, target, features);
    }
  };
}
