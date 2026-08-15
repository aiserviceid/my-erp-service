import { apiService } from './api';

const cleanResi = (value = '') => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '')
  .slice(0, 50);

const cleanTenantCode = (value = '') => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '')
  .slice(0, 60);

const decodePayload = () => {
  if (typeof window === 'undefined') return null;
  try {
    const hash = String(window.location.hash || '').replace(/^#/, '');
    const encoded = new URLSearchParams(hash).get('payload') || '';
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

const getTenantFromLocation = () => {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search || '');
    return cleanTenantCode(params.get('tenant_code') || params.get('tenant') || '');
  } catch {
    return '';
  }
};

if (!apiService.__unitproPublicLookupEnhanced) {
  const originalTrackService = apiService.trackService.bind(apiService);

  apiService.trackService = async (resi) => {
    const targetResi = cleanResi(resi);
    if (!targetResi) throw new Error('Nomor resi tidak valid.');

    const localPayload = decodePayload();
    if (cleanResi(localPayload?.service?.resi) === targetResi) {
      return {
        ...localPayload.service,
        tenant_name: localPayload?.tenant?.name || localPayload?.service?.tenant_name || localPayload?.service?.tenant_code || '',
      };
    }

    if (typeof window !== 'undefined') {
      try {
        const query = new URLSearchParams({ resi: targetResi });
        const tenantCode = getTenantFromLocation();
        if (tenantCode) query.set('tenant_code', tenantCode);
        const response = await fetch(`/api/public-service?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.service) {
          return {
            ...payload.service,
            tenant_name: payload?.tenant?.name || payload.service.tenant_name || payload.service.tenant_code || '',
          };
        }
      } catch (error) {
        console.warn('Public service endpoint fallback warning:', error);
      }
    }

    return originalTrackService(targetResi);
  };

  apiService.__unitproPublicLookupEnhanced = true;
}
