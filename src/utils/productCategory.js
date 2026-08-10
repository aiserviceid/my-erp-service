const SERVICE_CATEGORIES = ['JASA', 'SERVIS', 'SERVICE', 'LAYANAN'];
const PHYSICAL_CATEGORIES = ['SPAREPART', 'SPARE_PART', 'AKSESORIS', 'BARANG', 'PRODUK', 'PRODUCT'];

export const normalizeProductCategory = (product) =>
  String(product?.category || product?.type || product?.jenis || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

export const isServiceItem = (product) => {
  const category = normalizeProductCategory(product);

  if (SERVICE_CATEGORIES.some((item) => category === item || category.includes(item))) return true;
  if (PHYSICAL_CATEGORIES.some((item) => category === item || category.includes(item))) return false;

  const name = String(product?.name || '').toLowerCase();
  const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
  return serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
};
