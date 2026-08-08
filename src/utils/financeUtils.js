const KASBON_TYPES = new Set(['BON_PENDING', 'BON_KARYAWAN', 'BON_REJECTED']);

export const normalizeMoneyInteger = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const cleaned = String(value ?? '').replace(/[^\d-]/g, '');
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeKasbonAmount = (value, type = 'BON_PENDING') => {
  const amount = normalizeMoneyInteger(value);
  const isKasbon = KASBON_TYPES.has(String(type || '').toUpperCase());

  // Legacy bug: formatted strings such as "50.000" were parsed with Number()
  // and persisted as 50. Kasbon UI enforces a minimum of Rp1.000, therefore
  // positive sub-1.000 values are invalid legacy records and can be repaired
  // safely at the application boundary without mutating historical rows.
  if (isKasbon && amount > 0 && amount < 1000) return amount * 1000;
  return amount;
};

export const normalizeTransactionAmounts = (transactions = []) => (
  (transactions || []).map((transaction) => ({
    ...transaction,
    amount: normalizeKasbonAmount(transaction?.amount, transaction?.type),
  }))
);

export const buildKasbonDescription = (employee = {}) => {
  const employeeId = String(employee?.id ?? '').trim();
  const employeeName = String(employee?.name ?? '').trim();
  const namePart = employeeName ? `|NAME:${encodeURIComponent(employeeName)}` : '';
  return `EMP_${employeeId}${namePart}`;
};

export const parseKasbonDescription = (description = '') => {
  const source = String(description || '');
  const idMatch = source.match(/^EMP_([^|]+)/);
  const nameMatch = source.match(/(?:^|\|)NAME:([^|]*)/);
  let employeeName = '';

  if (nameMatch?.[1]) {
    try {
      employeeName = decodeURIComponent(nameMatch[1]);
    } catch {
      employeeName = nameMatch[1];
    }
  }

  return {
    employeeId: idMatch?.[1] || '',
    employeeName,
  };
};

export const isPaidServiceStatus = (status = '') => (
  ['DIAMBIL', 'DI AMBIL'].includes(String(status || '').trim().toUpperCase())
);
