const MONTHS_ID = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

export const normalizeServiceStatus = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/[\s_]+/g, '');

export const parseServiceDiscount = (issue = '') => {
  const match = String(issue || '').match(/\[Diskon:\s*Rp\s*([^\]]+)\]/i);
  return match ? Number(String(match[1] || '').replace(/\D/g, '')) || 0 : 0;
};

export const parseWarrantyMeta = (issue = '') => {
  const text = String(issue || '');
  const warranty = text.match(/\[Garansi Servis:\s*([^\]|]+?)(?:\s*\|\s*berlaku sampai\s*([^\]]+))?\]/i);
  const pickup = text.match(/\[Batas Pengambilan:\s*(\d+)\s*hari(?:\s*\|\s*maksimal\s*([^\]]+))?\]/i);
  const warning = text.match(/\[Peringatan Pengambilan:\s*([^\]]+)\]/i);
  const durationMatch = warranty?.[1]?.match(/(\d+)\s*hari/i);
  return {
    hasWarranty: Boolean(warranty),
    label: warranty ? String(warranty[1] || '').trim() : '',
    durationDays: durationMatch ? Number(durationMatch[1]) : 0,
    endLabel: warranty ? String(warranty[2] || '').trim() : '',
    pickupDays: pickup ? Number(pickup[1]) : 0,
    pickupEndLabel: pickup ? String(pickup[2] || '').trim() : '',
    pickupMessage: warning ? String(warning[1] || '').trim() : '',
  };
};

export const parseIndonesianDateLabel = (label = '') => {
  const value = String(label || '').trim();
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 23, 59, 59, 999);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const id = value.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (!id || MONTHS_ID[id[2]] === undefined) return null;
  const date = new Date(Number(id[3]), MONTHS_ID[id[2]], Number(id[1]), 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateServiceAmounts = (service = {}) => {
  const partFee = Number(service.part_fee || 0);
  const jasaFee = Number(service.jasa_fee || 0);
  const discount = parseServiceDiscount(service.issue || '');
  const subtotal = Math.max(0, partFee + jasaFee);
  const total = Math.max(0, subtotal - discount);
  return { partFee, jasaFee, discount, subtotal, total };
};

export const getWarrantyState = (service = {}, now = new Date()) => {
  const meta = parseWarrantyMeta(service.issue || '');
  const status = normalizeServiceStatus(service.status);
  const isPickedUp = status === 'DIAMBIL';
  const endDate = parseIndonesianDateLabel(meta.endLabel);
  const expired = Boolean(isPickedUp && endDate && now.getTime() > endDate.getTime());
  if (!meta.hasWarranty) return { ...meta, state: 'NONE', stateLabel: 'Tanpa garansi tambahan', endDate };
  if (!isPickedUp) return { ...meta, state: 'PENDING', stateLabel: 'Garansi menunggu barang diambil/lunas', endDate };
  if (expired) return { ...meta, state: 'EXPIRED', stateLabel: 'Garansi berakhir', endDate };
  return { ...meta, state: 'ACTIVE', stateLabel: 'Garansi aktif', endDate };
};

export const maskPublicCustomerName = (name = '') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '-';
  if (parts.length === 1) return parts[0].length <= 2 ? parts[0] : `${parts[0].slice(0, 1)}***`;
  return parts.map((part, index) => index === 0 ? part : `${part.slice(0, 1)}.`).join(' ');
};

export const cleanPublicServiceIssue = (issue = '') => String(issue || '')
  .replace(/\[[^\]]*?\]/g, '')
  .replace(/\| Kelengkapan:.*/i, '')
  .replace(/(?:\+?62|0)8\d{7,12}/g, '[nomor disembunyikan]')
  .trim();

export const buildPublicWarrantyUrl = (resi = '', origin = '') => {
  const cleanResi = String(resi || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
  if (!cleanResi) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/garansi?resi=${encodeURIComponent(cleanResi)}`;
};
