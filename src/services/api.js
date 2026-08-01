const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3001/api');

export const apiService = {
  // Helper to get headers
  getHeaders: () => {
    const token = localStorage.getItem('TENANT_TOKEN');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  // Login Tenant
  loginTenant: async (code, name = '', pin = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/tenant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, pin })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed');
      }
      return await response.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Login Employee
  loginEmployee: async (tenant_code, pin) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_code, pin })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed');
      }
      return await response.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Products
  getProducts: async (tenantCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${tenantCode}`, { headers: apiService.getHeaders() });
      return await response.json();
    } catch (e) { return []; }
  },
  
  addProduct: async (data) => {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  // Users
  getUsers: async (tenantCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${tenantCode}`);
      return await response.json();
    } catch (e) { return []; }
  },

  // Services / Tracking
  getServices: async (tenantCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${tenantCode}`);
      return await response.json();
    } catch (e) { return []; }
  },

  // Generic Methods
  post: async (endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  get: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: apiService.getHeaders() });
    return await response.json();
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData // No Content-Type header so browser sets multipart/form-data boundary
    });
    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
  },

  trackService: async (resi) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracking/${resi}`);
      if (!response.ok) throw new Error('Resi tidak ditemukan');
      return await response.json();
    } catch (e) {
      throw e;
    }
  },

  // Forum Methods
  getForumThreads: async (category = 'ALL', search = '') => {
    try {
      const url = new URL(`${API_BASE_URL}/forum/threads`);
      if (category) url.searchParams.append('category', category);
      if (search) url.searchParams.append('search', search);
      const response = await fetch(url);
      return await response.json();
    } catch (e) { return []; }
  },

  getForumThreadDetail: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/threads/${id}`);
      if (!response.ok) throw new Error('Thread not found');
      return await response.json();
    } catch (e) { throw e; }
  },

  createForumThread: async (data) => {
    const response = await fetch(`${API_BASE_URL}/forum/threads`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  replyForumThread: async (threadId, data) => {
    const response = await fetch(`${API_BASE_URL}/forum/threads/${threadId}/reply`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  createForumPost: async (threadId, data) => {
    const response = await fetch(`${API_BASE_URL}/forum/threads/${threadId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  markForumSolution: async (threadId, postId, solverTenantCode) => {
    const response = await fetch(`${API_BASE_URL}/forum/threads/${threadId}/solve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, solver_tenant_code: solverTenantCode })
    });
    return await response.json();
  },

  // Wallet & Tipping Methods
  sawerTeknisi: async (solverTenantCode, amount) => {
    const response = await fetch(`${API_BASE_URL}/wallet/sawer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solver_tenant_code: solverTenantCode, amount })
    });
    return await response.json();
  },
  
  getWalletBalance: async (tenantCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/balance/${tenantCode}`);
      return await response.json();
    } catch (e) { return { balance: 0, bank_details: null, withdrawals: [] }; }
  },
  
  updateBankDetails: async (tenantCode, bankDetails) => {
    const response = await fetch(`${API_BASE_URL}/wallet/bank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_code: tenantCode, bank_details: bankDetails })
    });
    return await response.json();
  },
  
  requestWithdraw: async (data) => {
    const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gagal request penarikan');
    }
    return await response.json();
  },

  getPlatformBalance: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/platform/balance`);
      return await response.json();
    } catch (e) { return { balance: 0 }; }
  },

  // Super Admin Methods
  getAdminStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      return await response.json();
    } catch (e) { throw e; }
  },

  approveWithdrawal: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/withdrawals/${id}/approve`, {
      method: 'PUT'
    });
    return await response.json();
  }
};
