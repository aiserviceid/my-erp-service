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

export const useStore = create((set) => ({
  tenant: {
    code: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_CODE') : null) || null,
    name: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_NAME') : null) || null,
    tier: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_TIER') : 'free') || 'free',
    token: (typeof window !== 'undefined' ? localStorage.getItem('TENANT_TOKEN') : null) || null,
    settings: (typeof window !== 'undefined' ? safeParseJSON(localStorage.getItem('TENANT_SETTINGS'), defaultSettings) : defaultSettings)
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
  
  setTenant: (code, name, apiUrl, tier = 'free', token = null, phone = null, customSettings = null) => {
    if (typeof window !== 'undefined') {
      if (code) localStorage.setItem('TENANT_CODE', code);
      if (name) localStorage.setItem('TENANT_NAME', name);
      if (apiUrl) localStorage.setItem('TENANT_API_URL', apiUrl);
      if (tier) localStorage.setItem('TENANT_TIER', tier);
      if (token) localStorage.setItem('TENANT_TOKEN', token);
      if (phone) localStorage.setItem('TENANT_PHONE', phone);
    }
    set((state) => {
      const currentSettings = state.tenant?.settings || defaultSettings;
      const updatedSettings = {
        ...currentSettings,
        ...(customSettings || {}),
        storeName: (customSettings && customSettings.storeName) || name || currentSettings.storeName,
        store_wa: (customSettings && customSettings.store_wa) || phone || currentSettings.store_wa
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('TENANT_SETTINGS', JSON.stringify(updatedSettings));
      }
      return {
        tenant: {
          ...state.tenant,
          code,
          name,
          tier,
          token,
          phone: phone || (typeof window !== 'undefined' ? localStorage.getItem('TENANT_PHONE') : null),
          settings: updatedSettings
        }
      };
    });
  },
  
  updateTenantSettings: (newSettings) => set((state) => {
    const updatedSettings = { ...(state.tenant?.settings || defaultSettings), ...newSettings };
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
