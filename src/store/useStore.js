import { create } from 'zustand';

const safeParseJSON = (str, fallback) => {
  if (!str || str === 'undefined' || str === 'null') return fallback;
  try {
    const parsed = JSON.parse(str);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
};

const defaultSettings = {
  logoUrl: '',
  storeName: 'UnitPro Toko',
  theme: 'laptop', // 'hp', 'laptop', 'motor'
  qrisUrl: '',
  ads: [
    { id: 1, title: 'Promo Diskon 50%', imageUrl: 'https://via.placeholder.com/800x200?text=Promo+Diskon' }
  ]
};

const normalizeLifetimeSettings = (rawSettings) => {
  const settings = { ...(rawSettings || {}) };
  const isLifetimeFree = settings.lifetime_free === true || String(settings.lifetime_free || '').toLowerCase() === 'true';
  if (isLifetimeFree) {
    settings.lifetime_free = true;
    settings.subscription_status = 'active';
    settings.active_until = null;
    settings.trial_ends_at = null;
    settings.is_banned = false;
  }
  return settings;
};

const getInitialSettings = () => {
  if (typeof window === 'undefined') return defaultSettings;
  return normalizeLifetimeSettings(safeParseJSON(localStorage.getItem('TENANT_SETTINGS'), defaultSettings));
};

export const useStore = create((set) => ({
  tenant: {
    code: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_CODE') : null) || null,
    name: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_NAME') : null) || null,
    tier: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_TIER') : 'free') || 'free',
    token: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_TOKEN') : null) || null,
    settings: getInitialSettings()
  },
  employee: typeof window !== 'undefined' ? safeParseJSON(localStorage.getItem('EMP_SESSION'), null) : null,
  setEmployee: (emp) => {
    if (typeof window !== 'undefined') {
      if (emp) localStorage.setItem('EMP_SESSION', JSON.stringify(emp));
      else localStorage.removeItem('EMP_SESSION');
    }
    set({ employee: emp });
  },
  clearEmployee: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('EMP_SESSION');
      localStorage.removeItem('EMPLOYEE_TOKEN');
    }
    set({ employee: null });
  },
  cart: [],
  
  addToCart: (product) => set((state) => {
    const existing = state.cart.find(p => p.id === product.id);
    if (existing) {
      return { cart: state.cart.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p) };
    }
    return { cart: [...state.cart, { ...product, qty: 1 }] };
  }),
  
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(p => p.id !== productId)
  })),

  updateCartQty: (productId, newQty) => set((state) => ({
    cart: newQty <= 0 
      ? state.cart.filter(p => p.id !== productId)
      : state.cart.map(p => p.id === productId ? { ...p, qty: newQty } : p)
  })),
  
  clearCart: () => set({ cart: [] }),
  
  // Backward-compatible: supports both the original positional arguments
  // and a complete tenant object. This prevents an object from accidentally
  // being stored as tenant.code when callers update credentials after rename.
  setTenant: (codeOrTenant, name, apiUrl, tier = 'free', token = null, phone = null, customSettings = null) => {
    const objectMode = Boolean(codeOrTenant && typeof codeOrTenant === 'object' && !Array.isArray(codeOrTenant));
    const source = objectMode ? codeOrTenant : null;
    const resolvedCode = objectMode ? source.code : codeOrTenant;
    const resolvedName = objectMode ? source.name : name;
    const resolvedApiUrl = objectMode ? source.apiUrl : apiUrl;
    const resolvedTier = objectMode ? (source.tier || 'free') : tier;
    const resolvedToken = objectMode ? (source.token ?? token) : token;
    const resolvedPhone = objectMode ? (source.phone ?? phone) : phone;
    const resolvedSettings = objectMode ? (source.settings || customSettings) : customSettings;

    if (typeof window !== 'undefined') {
      if (resolvedCode) localStorage.setItem('TENANT_CODE', String(resolvedCode));
      if (resolvedName) localStorage.setItem('TENANT_NAME', String(resolvedName));
      if (resolvedApiUrl) localStorage.setItem('TENANT_API_URL', String(resolvedApiUrl));
      if (resolvedTier) localStorage.setItem('TENANT_TIER', String(resolvedTier));
      if (resolvedToken) localStorage.setItem('TENANT_TOKEN', String(resolvedToken));
      if (resolvedPhone) localStorage.setItem('TENANT_PHONE', String(resolvedPhone));
    }

    set((state) => {
      const currentSettings = state.tenant?.settings || defaultSettings;
      const updatedSettings = normalizeLifetimeSettings({
        ...currentSettings,
        ...(resolvedSettings || {}),
        storeName: (resolvedSettings && resolvedSettings.storeName) || resolvedName || currentSettings.storeName,
        store_wa: (resolvedSettings && resolvedSettings.store_wa) || resolvedPhone || currentSettings.store_wa
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('TENANT_SETTINGS', JSON.stringify(updatedSettings));
      }
      return {
        tenant: {
          ...state.tenant,
          ...(source || {}),
          code: resolvedCode || state.tenant?.code || null,
          name: resolvedName || state.tenant?.name || null,
          tier: resolvedTier || state.tenant?.tier || 'free',
          token: resolvedToken || state.tenant?.token || null,
          phone: resolvedPhone || state.tenant?.phone || (typeof window !== 'undefined' ? localStorage.getItem('TENANT_PHONE') : null),
          settings: updatedSettings
        }
      };
    });
  },
  
  updateTenantSettings: (newSettings) => set((state) => {
    const updatedSettings = normalizeLifetimeSettings({ ...(state.tenant?.settings || defaultSettings), ...newSettings });
    if (typeof window !== 'undefined') {
      localStorage.setItem('TENANT_SETTINGS', JSON.stringify(updatedSettings));
    }
    return { tenant: { ...(state.tenant || {}), settings: updatedSettings } };
  }),
  
  clearTenant: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('TENANT_CODE');
      localStorage.removeItem('TENANT_NAME');
      localStorage.removeItem('TENANT_API_URL');
      localStorage.removeItem('TENANT_TOKEN');
      localStorage.removeItem('TENANT_TIER');
      localStorage.removeItem('TENANT_PHONE');
      localStorage.removeItem('TENANT_SETTINGS');
      localStorage.removeItem('EMPLOYEE_TOKEN');
      localStorage.removeItem('EMP_SESSION');
    }
    set({ 
      tenant: { 
        code: null, 
        name: null,
        apiUrl: '',
        tier: 'free',
        settings: defaultSettings
      } 
    });
  },

  showOnboarding: false,
  setShowOnboarding: (val) => set({ showOnboarding: val }),
}));

// Keep Lifetime Free status synchronized for an already-open admin session.
// This fixes stale localStorage after a Super Admin changes a tenant status
// or after the tenant code/username is renamed.
if (typeof window !== 'undefined') {
  let lifetimeSyncInFlight = false;
  const syncLifetimeStatus = async () => {
    const code = String(localStorage.getItem('TENANT_CODE') || '').trim().toUpperCase();
    if (!code || lifetimeSyncInFlight) return;
    lifetimeSyncInFlight = true;
    try {
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
      const response = await fetch(`${apiBase}/public-free-tenants`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      const freeTenants = Array.isArray(payload?.free_tenants)
        ? payload.free_tenants.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
        : [];
      if (freeTenants.includes(code)) {
        useStore.getState().updateTenantSettings({
          lifetime_free: true,
          subscription_status: 'active',
          active_until: null,
          trial_ends_at: null,
          is_banned: false
        });
      }
    } catch (error) {
      console.warn('Lifetime Free session sync warning:', error);
    } finally {
      lifetimeSyncInFlight = false;
    }
  };

  queueMicrotask(syncLifetimeStatus);
  window.addEventListener('focus', syncLifetimeStatus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncLifetimeStatus();
  });
}
