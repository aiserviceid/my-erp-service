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

const sendThroughBackendGateway = async ({ tenant, target, message, mode, token }) => {
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

const sendDirectCustomGatewayFallback = async ({ target, message, token }) => {
  const response = await fetch(FONNTE_SEND_URL, {
    method: 'POST',
    headers: { Authorization: token },
    body: new URLSearchParams({ target, message }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.reason || payload?.detail || `Fonnte request failed (${response.status}).`);
  }
  return { status: 'sent', provider: 'fonnte', target };
};

export const sendWhatsAppNotification = async ({
  tenant,
  target,
  message,
  openManual = true,
} = {}) => {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) {
    return { status: 'skipped', reason: 'missing_target' };
  }

  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) {
    return { status: 'skipped', reason: 'missing_message' };
  }

  const { mode, token } = getWhatsAppSenderConfig(tenant);
  let gatewayError = null;

  try {
    return await sendThroughBackendGateway({
      tenant,
      target: normalizedTarget,
      message: cleanMessage,
      mode,
      token,
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
