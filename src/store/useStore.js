import { create } from 'zustand';

export const useStore = create((set) => ({
  tenant: {
    code: localStorage.getItem('TENANT_CODE') || null,
    name: localStorage.getItem('TENANT_NAME') || null,
    tier: localStorage.getItem('TENANT_TIER') || 'free',
    token: localStorage.getItem('TENANT_TOKEN') || null,
    settings: JSON.parse(localStorage.getItem('TENANT_SETTINGS')) || {
      logoUrl: '',
      storeName: 'Nama Toko Default',
      theme: 'laptop', // 'hp', 'laptop', 'motor'
      ads: [
        { id: 1, title: 'Promo Diskon 50%', imageUrl: 'https://via.placeholder.com/800x200?text=Promo+Diskon' }
      ]
    }
  },
  employee: JSON.parse(localStorage.getItem('EMP_SESSION') || 'null'),
  setEmployee: (emp) => {
    localStorage.setItem('EMP_SESSION', JSON.stringify(emp));
    set({ employee: emp });
  },
  clearEmployee: () => {
    localStorage.removeItem('EMP_SESSION');
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
  
  clearCart: () => set({ cart: [] }),
  
  setTenant: (code, name, apiUrl, tier = 'free', token = null) => {
    localStorage.setItem('TENANT_CODE', code);
    localStorage.setItem('TENANT_NAME', name);
    localStorage.setItem('TENANT_API_URL', apiUrl);
    localStorage.setItem('TENANT_TIER', tier);
    if (token) localStorage.setItem('TENANT_TOKEN', token);
    set((state) => ({ tenant: { ...state.tenant, code, name, tier, token } }));
  },
  
  updateTenantSettings: (newSettings) => set((state) => {
    const updatedSettings = { ...state.tenant.settings, ...newSettings };
    localStorage.setItem('TENANT_SETTINGS', JSON.stringify(updatedSettings));
    return { tenant: { ...state.tenant, settings: updatedSettings } };
  }),
  
  clearTenant: () => {
    localStorage.removeItem('TENANT_CODE');
    localStorage.removeItem('TENANT_NAME');
    localStorage.removeItem('TENANT_API_URL');
    localStorage.removeItem('TENANT_TOKEN');
    set({ 
      tenant: { 
        code: '', 
        name: 'Toko Demo', 
        apiUrl: '',
        tier: 'free',
        settings: {
          theme: 'laptop',
          storeName: 'AI SERVICE (Pusat)',
          ads: []
        }
      } 
    });
  },

  setEmployee: (empData) => {
    localStorage.setItem('EMP_SESSION', JSON.stringify(empData));
    set({ employee: empData });
  },

  clearEmployee: () => {
    localStorage.removeItem('EMP_SESSION');
    set({ employee: null });
  },

  addToCart: (product) => set((state) => {
    const existing = state.cart.find(p => p.id === product.id);
    if (existing) {
      return { cart: state.cart.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p) };
    }
    return { cart: [...state.cart, { ...product, qty: 1 }] };
  }),

  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter(p => p.id !== id)
  })),

  clearCart: () => set({ cart: [] }),
}));
