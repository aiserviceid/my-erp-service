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

const metaFromRuntimeStore = (resi = '') => {
  if (typeof window === 'undefined' || !resi) return null;
  const raw = window.__UNITPRO_SERVICE_COMPLETION_META__?.[resi];
  if (!raw) return null;
  const warrantyMode = String(raw.warrantyMode || 'none');
  let warrantyLabel = '';
  if (warrantyMode !== 'none') warrantyLabel = warrantyMode === 'custom' ? 'Tanggal khusus' : `${warrantyMode} hari`;
  let warrantyEnd = '';
  if (warrantyMode === 'custom') warrantyEnd = raw.warrantyEnd || '';
  return {
    warrantyLabel,
    warrantyEnd,
    pickupDays: raw.pickupEnabled ? Math.max(1, Number(raw.pickupDays || 15)) : 0,
    pickupEnd: '',
    pickupMessage: raw.pickupEnabled ? String(raw.pickupMessage || '').trim() : '',
  };
};

const enrichServiceCompletionMessage = async (message = '') => {
  const text = String(message || '').trim();
  if (!/\bSELESAI\b/i.test(text)) return text;
  const resiMatch = text.match(/Resi\s*:?\s*\*?([A-Z0-9_-]+)/i);
  const resi = resiMatch ? resiMatch[1].toUpperCase() : '';
  if (!resi) return text;

  let meta = metaFromRuntimeStore(resi);
  if (!meta || (!meta.warrantyLabel && !meta.pickupMessage && !meta.pickupDays)) {
    try {
      const { data } = await supabase.from('services').select('issue').eq('resi', resi).maybeSingle();
      if (data?.issue) meta = parseCompletionMetaFromIssue(data.issue);
    } catch (error) {
      console.warn('Metadata garansi WA tidak dapat dimuat:', error);
    }
  }
  if (!meta) return text;

  const extras = [];
  if (meta.warrantyLabel && !/Garansi servis:/i.test(text)) {
    extras.push(`Garansi servis: *${meta.warrantyLabel}*${meta.warrantyEnd ? ` (sampai ${meta.warrantyEnd})` : ''}.`);
  }
  if (meta.pickupMessage && !text.includes(meta.pickupMessage)) {
    extras.push(`⚠️ ${meta.pickupMessage}`);
  } else if (meta.pickupDays > 0 && !/batas pengambilan/i.test(text)) {
    extras.push(`⚠️ Batas pengambilan barang: ${meta.pickupDays} hari setelah servis selesai.`);
  }
  if (!extras.length) return text;
  return `${text}\n\n${extras.join('\n')}`;
};

const sendThroughBackendGateway = async ({ tenant, target, message, mode, token, urlMedia = '' }) => {
  const tenantCode = tenant?.code || tenant?.tenant_code || '';
  const authToken = getApiAuthToken(tenant);
  if (!tenantCode || !authToken) {
    throw new Error('Sesi toko tidak tersedia untuk mengakses WhatsApp Gateway.');
  }

  const response = await fetch(`${API_BASE_URL}/whatsapp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
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
  if (!response.ok) {
    throw new Error(payload.error || `WhatsApp Gateway gagal (${response.status}).`);
  }
  return {
    status: payload.status || 'sent',
    provider: payload.provider || 'fonnte',
    target: payload.target || target,
  };
};

const sendDirectCustomGatewayFallback = async ({ target, message, token, urlMedia = '' }) => {
  const params = new URLSearchParams({ target, message });
  if (urlMedia) params.append('url', urlMedia);
  const response = await fetch(FONNTE_SEND_URL, {
    method: 'POST',
    headers: { Authorization: token },
    body: params,
  }).catch(() => {
    throw new Error('WhatsApp Gateway tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.');
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('Token Fonnte tidak valid atau kadaluarsa. Periksa kembali token di Pengaturan WhatsApp Gateway.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.reason || payload?.detail || payload?.message || `WhatsApp Gateway Fonnte gagal (Status ${response.status}).`);
  }
  return { status: 'sent', provider: 'fonnte', target };
};

export const sendWhatsAppNotification = async ({
  tenant,
  target,
  message,
  urlMedia = '',
  openManual = true,
} = {}) => {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) {
    return { status: 'skipped', reason: 'missing_target' };
  }

  const baseMessage = String(message || '').trim();
  if (!baseMessage) {
    return { status: 'skipped', reason: 'missing_message' };
  }
  const cleanMessage = await enrichServiceCompletionMessage(baseMessage);

  const { mode, token } = getWhatsAppSenderConfig(tenant);
  let gatewayError = null;

  try {
    return await sendThroughBackendGateway({
      tenant,
      target: normalizedTarget,
      message: cleanMessage,
      mode,
      token,
      urlMedia,
    });
  } catch (error) {
    gatewayError = error;
  }

  // Compatibility fallback for existing CUSTOM-token installations. The
  // backend proxy is preferred because it avoids provider CORS differences.
  if (mode === 'CUSTOM' && token) {
    try {
      return await sendDirectCustomGatewayFallback({
        target: normalizedTarget,
        message: cleanMessage,
        token,
        urlMedia,
      });
    } catch (error) {
      gatewayError = error;
    }
  }

  if (openManual && typeof window !== 'undefined') {
    const url = buildManualWhatsAppUrl(normalizedTarget, cleanMessage);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return {
        status: 'manual',
        provider: 'wa.me',
        target: normalizedTarget,
        gatewayError,
      };
    }
  }

  return {
    status: 'failed',
    reason: 'gateway_unavailable',
    target: normalizedTarget,
    error: gatewayError || new Error('WhatsApp Gateway belum dikonfigurasi.'),
  };
};
