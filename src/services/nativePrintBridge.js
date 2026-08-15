import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const RECEIPT_TYPES = new Set(['pendaftaran', 'tagihan', 'pengambilan']);

const cleanResi = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '')
  .slice(0, 60);

const normalizeStatus = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/[\s_]+/g, '');

export const getServiceReceiptType = (status = '') => {
  const normalized = normalizeStatus(status);
  if (normalized === 'DIAMBIL') return 'pengambilan';
  if (normalized === 'SELESAI') return 'tagihan';
  return 'pendaftaran';
};

export const getServiceReceiptLabel = (type = 'pendaftaran') => ({
  pendaftaran: 'Nota Pendaftaran',
  tagihan: 'Nota Tagihan',
  pengambilan: 'Nota Garansi',
}[type] || 'Nota Servis');

const getPublicReceiptType = (type) => ({
  tagihan: 'completion',
  pengambilan: 'pickup',
  pendaftaran: 'registration',
}[type] || 'registration');

const toBase64Url = (value) => {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return '';
  }
};

// Only fields shown on a receipt are included in its URL payload. Tokens and
// unrelated tenant settings must never be exposed in a browser URL.
const buildSafePayload = (service = {}, tenant = {}) => {
  const settings = tenant?.settings || {};
  return {
    service: {
      resi: cleanResi(service.resi),
      tenant_code: String(service.tenant_code || tenant?.code || tenant?.tenant_code || '').trim().toUpperCase(),
      customer_name: String(service.customer_name || ''),
      device_name: String(service.device_name || ''),
      issue: String(service.issue || ''),
      status: String(service.status || ''),
      jasa_fee: Number(service.jasa_fee || 0),
      part_fee: Number(service.part_fee || 0),
      technician_id: service.technician_id || null,
      created_at: service.created_at || null,
      updated_at: service.updated_at || null,
    },
    tenant: {
      code: String(tenant?.code || tenant?.tenant_code || '').trim().toUpperCase(),
      name: String(tenant?.name || settings.storeName || settings.store_name || 'UnitPro'),
      settings: {
        storeName: settings.storeName || settings.store_name || '',
        store_name: settings.store_name || settings.storeName || '',
        store_address: settings.store_address || settings.address || '',
        address: settings.address || settings.store_address || '',
        store_wa: settings.store_wa || '',
      },
    },
  };
};

/**
 * Opens a receipt from the selected service. The previous implementation
 * inferred a resi from modal text, which can point to a previous service in
 * Android and then produces an empty/error receipt.
 */
export const openNativeServiceReceipt = async ({ service, tenant, format = 'thermal', type } = {}) => {
  if (!Capacitor.isNativePlatform()) return false;

  const payload = buildSafePayload(service, tenant);
  if (!payload.service.resi) throw new Error('Nomor nota tidak tersedia. Tutup dialog lalu pilih servis kembali.');

  const receiptType = RECEIPT_TYPES.has(type) ? type : getServiceReceiptType(payload.service.status);
  const query = new URLSearchParams({
    resi: payload.service.resi,
    format: format === 'thermal' ? 'thermal' : 'a4',
    type: getPublicReceiptType(receiptType),
    autoprint: '1',
  });
  if (payload.tenant.code) query.set('tenant_code', payload.tenant.code);

  const encodedPayload = toBase64Url(payload);
  const url = `${window.location.origin}/print-nota?${query.toString()}${encodedPayload ? `#payload=${encodedPayload}` : ''}`;

  try {
    await Browser.open({ url });
  } catch (error) {
    console.warn('Browser Android gagal dibuka untuk nota:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
};
