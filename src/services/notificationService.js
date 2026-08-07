const FONNTE_SEND_URL = 'https://api.fonnte.com/send';

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
    mode: settings.wa_sender_mode || 'SYSTEM',
    token: settings.fonnte_token || '',
  };
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

  if (!message) {
    return { status: 'skipped', reason: 'missing_message' };
  }

  const { mode, token } = getWhatsAppSenderConfig(tenant);

  if (mode === 'CUSTOM' && token) {
    try {
      const response = await fetch(FONNTE_SEND_URL, {
        method: 'POST',
        headers: { Authorization: token },
        body: new URLSearchParams({ target: normalizedTarget, message }),
      });

      if (!response.ok) {
        throw new Error(`Fonnte request failed with status ${response.status}`);
      }

      return { status: 'sent', provider: 'fonnte', target: normalizedTarget };
    } catch (error) {
      if (!openManual) {
        return { status: 'failed', provider: 'fonnte', target: normalizedTarget, error };
      }
    }
  }

  if (openManual && typeof window !== 'undefined') {
    const url = buildManualWhatsAppUrl(normalizedTarget, message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { status: 'manual', provider: 'wa.me', target: normalizedTarget };
    }
  }

  return { status: 'skipped', reason: 'manual_disabled', target: normalizedTarget };
};
