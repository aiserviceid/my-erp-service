// Public receipts must never expose tokens, internal settings or arbitrary nested objects.
export function publicTenant(tenant) {
  if (!tenant) return null;
  let settings = tenant.settings || {};
  if (typeof settings === 'string') { try { settings = JSON.parse(settings); } catch { settings = {}; } }
  const safe = {};
  for (const field of ['storeName', 'store_name', 'store_address', 'address', 'store_wa', 'logoUrl', 'qrisUrl', 'receipt_note_service']) {
    if (typeof settings?.[field] === 'string') safe[field] = settings[field];
  }
  for (const field of ['ads', 'promoBanners']) {
    if (Array.isArray(settings?.[field])) safe[field] = settings[field].slice(0, 20).map(banner => {
      const item = {};
      for (const key of ['title', 'description', 'imageUrl']) if (typeof banner?.[key] === 'string') item[key] = banner[key];
      if (typeof banner?.isActive === 'boolean') item.isActive = banner.isActive;
      return item;
    });
  }
  return { code: tenant.code, name: tenant.name, tier: tenant.tier, settings: safe };
}
