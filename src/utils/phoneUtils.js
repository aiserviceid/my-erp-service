export const normalizeWhatsAppNumber = (phone = '') => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const findEmployeePhoneConflict = (phone, users = []) => {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  return users.find((user) => normalizeWhatsAppNumber(user?.phone) === normalized) || null;
};

export const customerPhoneConflictMessage = (employeeName = '') =>
  `Nomor WhatsApp ini sama dengan nomor karyawan${employeeName ? ` ${employeeName}` : ''}. Pastikan ini nomor pelanggan, bukan nomor teknisi/kasir.`;
