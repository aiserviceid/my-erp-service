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

export const findMatchingEmployee = (phone, employees = []) => {
  const normPhone = normalizeWhatsAppNumber(phone);
  if (!normPhone || !employees || !Array.isArray(employees) || employees.length === 0) return null;
  return employees.find((emp) => {
    const empNorm = normalizeWhatsAppNumber(emp.phone);
    return Boolean(empNorm && empNorm === normPhone);
  }) || null;
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
  employees = [],
  target,
  message,
  openManual = true,
  skipConflictCheck = false,
} = {}) => {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) {
    return { status: 'skipped', reason: 'missing_target' };
  }

  if (!message) {
    return { status: 'skipped', reason: 'missing_message' };
  }

  if (!skipConflictCheck) {
    const matchedEmp = findMatchingEmployee(normalizedTarget, employees);
    if (matchedEmp) {
      if (typeof window !== 'undefined') {
        alert(`⚠ Notifikasi WA tidak terkirim: Nomor WA (${normalizedTarget}) sama dengan nomor karyawan (${matchedEmp.name}). Perbaiki nomor pelanggan terlebih dahulu agar notifikasi tidak salah alamat.`);
      }
      return { status: 'blocked_conflict', reason: 'employee_phone_conflict', matchedEmployee: matchedEmp };
    }
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
        if (response.status === 401 || response.status === 403) {
          throw new Error("Token Fonnte tidak valid atau kadaluarsa.");
        }
        throw new Error(`Gagal menghubungi WhatsApp API (Status: ${response.status}). Periksa kembali token Anda.`);
      }

      const responseData = await response.json().catch(() => ({}));
      if (responseData.status === false) {
        throw new Error(responseData.reason || "Token Fonnte bermasalah atau kuota habis.");
      }

      return { status: 'sent', provider: 'fonnte', target: normalizedTarget };
    } catch (error) {
      if (typeof window !== 'undefined') {
        alert(`Gagal mengirim WhatsApp otomatis: ${error.message}${openManual ? '\\nMengalihkan ke pengiriman manual...' : ''}`);
      }
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

