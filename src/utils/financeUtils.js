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
  (transactions || []).map((transaction) => {
    let paymentMethod = transaction?.payment_method || 'Tunai';
    let cleanDescription = transaction?.description || '';

    const match = cleanDescription.match(/\[Metode:\s*([^\]]+)\]/);
    if (match) {
      paymentMethod = match[1].trim();
      cleanDescription = cleanDescription.replace(/\[Metode:\s*[^\]]+\]/, '').trim();
    }

    return {
      ...transaction,
      amount: normalizeKasbonAmount(transaction?.amount, transaction?.type),
      payment_method: paymentMethod,
      description: cleanDescription,
    };
  })
);

export const allocateServiceDiscount = (partFeeValue = 0, jasaFeeValue = 0, discountValue = 0) => {
  const partFee = Math.max(0, normalizeMoneyInteger(partFeeValue));
  const jasaFee = Math.max(0, normalizeMoneyInteger(jasaFeeValue));
  const discount = Math.max(0, normalizeMoneyInteger(discountValue));
  const subtotal = partFee + jasaFee;
  const appliedDiscount = Math.min(discount, subtotal);
  const jasaDiscount = Math.min(appliedDiscount, jasaFee);
  const jasaAfterDiscount = Math.max(0, jasaFee - jasaDiscount);
  const remainingDiscount = Math.max(0, appliedDiscount - jasaDiscount);
  const partAfterDiscount = Math.max(0, partFee - remainingDiscount);

  return {
    partFee,
    jasaFee,
    discount,
    subtotal,
    partAfterDiscount,
    jasaAfterDiscount,
    totalAfterDiscount: partAfterDiscount + jasaAfterDiscount,
  };
};

export const transactionMatchesServiceResi = (description = '', resi = '') => {
  const source = String(description || '').toUpperCase();
  const serviceResi = String(resi || '').trim().toUpperCase();
  if (!serviceResi) return false;
  const markers = [`RESI ${serviceResi}`, `RESI: ${serviceResi}`, `RESI:${serviceResi}`];
  return markers.some((marker) => {
    const index = source.indexOf(marker);
    if (index < 0) return false;
    const nextChar = source[index + marker.length] || '';
    return !/[A-Z0-9_-]/.test(nextChar);
  });
};

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
