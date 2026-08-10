const SERVICE_CATEGORIES = ['JASA', 'SERVIS', 'SERVICE', 'LAYANAN'];
const PHYSICAL_CATEGORIES = ['SPAREPART', 'SPARE_PART', 'AKSESORIS', 'BARANG', 'PRODUK', 'PRODUCT'];

export const normalizeProductCategory = (product) =>
  String(product?.category || product?.type || product?.jenis || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

export const isServiceItem = (product) => {
  const category = normalizeProductCategory(product);
  return SERVICE_CATEGORIES.some((item) => category === item || category.includes(item));
};
