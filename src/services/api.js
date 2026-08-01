import { supabase } from './supabase';

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

  // 1. Login / Register Tenant (Store)
  loginTenant: async (code, name = '', pin = '') => {
    try {
      const cleanCode = (code || '').trim().toUpperCase();
      const { data: existing, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase query error:', error);
      }

      if (!existing) {
        // Auto register new store
        const newStore = {
          code: cleanCode,
          name: name || cleanCode,
          tier: 'free',
          settings: {},
          reputation_points: 0,
          wallet_balance: 0,
          bank_details: null,
          pin: pin || ''
        };
        const { data: created, error: insertErr } = await supabase
          .from('tenants')
          .insert(newStore)
          .select()
          .single();
          
        if (insertErr) throw insertErr;
        return { token: `tenant_${cleanCode}`, tenant: created || newStore };
      }

      // Check pin if set
      if (existing.pin && pin && existing.pin !== pin) {
        throw new Error('PIN Toko salah!');
      }

      return { token: `tenant_${cleanCode}`, tenant: existing };
    } catch (e) {
      console.error('Login tenant error:', e);
      throw e;
    }
  },

  // 2. Login Employee
  loginEmployee: async (tenant_code, pin) => {
    try {
      const cleanCode = (tenant_code || '').trim().toUpperCase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_code', cleanCode)
        .eq('pin', pin)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('PIN Karyawan tidak ditemukan!');

      return { token: `emp_${data.id}`, user: data };
    } catch (e) {
      console.error('Login employee error:', e);
      throw e;
    }
  },

  // 3. Products
  getProducts: async (tenantCode) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_code', tenantCode)
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addProduct: async (productData) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // 4. Users / Employees
  getUsers: async (tenantCode) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_code', tenantCode);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // 5. Services
  getServices: async (tenantCode) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_code', tenantCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // 6. Generic Dispatcher (for existing components)
  post: async (endpoint, body) => {
    try {
      if (endpoint === '/services') {
        const { data, error } = await supabase.from('services').insert(body).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint.startsWith('/services/') && endpoint.endsWith('/status')) {
        const resi = endpoint.split('/')[2];
        const { data, error } = await supabase.from('services').update({ status: body.status }).eq('resi', resi).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint === '/transactions') {
        const { data, error } = await supabase.from('transactions').insert(body).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint === '/users') {
        const { data, error } = await supabase.from('users').insert(body).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint === '/products') {
        const { data, error } = await supabase.from('products').insert(body).select().single();
        if (error) throw error;
        return data;
      }

      // Fallback
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: apiService.getHeaders(),
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  get: async (endpoint) => {
    try {
      if (endpoint.startsWith('/transactions/')) {
        const tenantCode = endpoint.split('/')[2];
        const { data, error } = await supabase.from('transactions').select('*').eq('tenant_code', tenantCode).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      if (endpoint.startsWith('/services/')) {
        const tenantCode = endpoint.split('/')[2];
        const { data, error } = await supabase.from('services').select('*').eq('tenant_code', tenantCode).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      if (endpoint.startsWith('/products/')) {
        const tenantCode = endpoint.split('/')[2];
        return await apiService.getProducts(tenantCode);
      }
      if (endpoint.startsWith('/users/')) {
        const tenantCode = endpoint.split('/')[2];
        return await apiService.getUsers(tenantCode);
      }

      // Fallback
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: apiService.getHeaders() });
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  uploadFile: async (file) => {
    try {
      // Direct base64 or upload
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ url: reader.result });
        };
        reader.readAsDataURL(file);
      });
    } catch (e) {
      throw e;
    }
  },

  // 7. Public Tracking
  trackService: async (resi) => {
    try {
      const cleanResi = (resi || '').trim().toUpperCase();
      const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('resi', cleanResi)
        .maybeSingle();

      if (error || !service) throw new Error('Nomor resi tidak ditemukan atau belum terdaftar.');

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('code', service.tenant_code)
        .maybeSingle();

      return {
        ...service,
        tenant_name: tenant ? tenant.name : service.tenant_code
      };
    } catch (e) {
      throw e;
    }
  },

  // 8. Forum
  getForumThreads: async (category = 'ALL', search = '') => {
    try {
      let query = supabase.from('forum_threads').select('*').order('created_at', { ascending: false });
      if (category && category !== 'ALL') {
        query = query.eq('category', category);
      }
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      const { data: threads, error } = await query;
      if (error) throw error;

      // Attach reply counts
      const enriched = await Promise.all((threads || []).map(async (t) => {
        const { count } = await supabase.from('forum_posts').select('*', { count: 'exact', head: true }).eq('thread_id', t.id);
        return { ...t, reply_count: count || 0 };
      }));

      return enriched;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  getForumThreadDetail: async (id) => {
    try {
      const { data: thread, error: tErr } = await supabase.from('forum_threads').select('*').eq('id', id).single();
      if (tErr || !thread) throw new Error('Thread tidak ditemukan');

      const { data: posts, error: pErr } = await supabase.from('forum_posts').select('*').eq('thread_id', id).order('created_at', { ascending: true });
      if (pErr) throw pErr;

      return { thread, posts: posts || [] };
    } catch (e) {
      throw e;
    }
  },

  createForumThread: async (threadData) => {
    try {
      const { data, error } = await supabase.from('forum_threads').insert(threadData).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  replyForumThread: async (threadId, postData) => {
    try {
      const { data, error } = await supabase.from('forum_posts').insert({
        thread_id: threadId,
        ...postData
      }).select().single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  createForumPost: async (threadId, postData) => {
    return await apiService.replyForumThread(threadId, postData);
  },

  markForumSolution: async (threadId, postId, solverTenantCode) => {
    try {
      await supabase.from('forum_threads').update({ is_solved: 1 }).eq('id', threadId);
      await supabase.from('forum_posts').update({ is_solution: 1 }).eq('id', postId);
      
      if (solverTenantCode) {
        // Award 25 reputation points
        const { data: tenant } = await supabase.from('tenants').select('reputation_points').eq('code', solverTenantCode).maybeSingle();
        const currentPoints = (tenant && tenant.reputation_points) || 0;
        await supabase.from('tenants').update({ reputation_points: currentPoints + 25 }).eq('code', solverTenantCode);
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // 9. Wallet & Tipping
  sawerTeknisi: async (solverTenantCode, amount) => {
    try {
      const amt = Number(amount);
      const feePlatform = Math.floor(amt * 0.01);
      const feeDev = Math.floor(amt * 0.06);
      const netToTechnician = amt - feePlatform - feeDev;

      // Update technician wallet
      const { data: tenant } = await supabase.from('tenants').select('wallet_balance').eq('code', solverTenantCode).maybeSingle();
      const currentBalance = (tenant && tenant.wallet_balance) || 0;
      await supabase.from('tenants').update({ wallet_balance: currentBalance + netToTechnician }).eq('code', solverTenantCode);

      // Update platform wallet
      const { data: pWallet } = await supabase.from('platform_wallet').select('balance').eq('id', 1).maybeSingle();
      const currentPlatform = (pWallet && pWallet.balance) || 0;
      await supabase.from('platform_wallet').upsert({ id: 1, balance: currentPlatform + feePlatform });

      return { success: true, net: netToTechnician, feePlatform, feeDev };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  getWalletBalance: async (tenantCode) => {
    try {
      const { data: tenant } = await supabase.from('tenants').select('wallet_balance, bank_details').eq('code', tenantCode).maybeSingle();
      const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('tenant_code', tenantCode).order('created_at', { ascending: false });

      return {
        balance: (tenant && tenant.wallet_balance) || 0,
        bank_details: tenant ? tenant.bank_details : null,
        withdrawals: withdrawals || []
      };
    } catch (e) {
      console.error(e);
      return { balance: 0, bank_details: null, withdrawals: [] };
    }
  },

  updateBankDetails: async (tenantCode, bankDetails) => {
    try {
      const { data, error } = await supabase.from('tenants').update({ bank_details: bankDetails }).eq('code', tenantCode).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  requestWithdraw: async (data) => {
    try {
      const { tenant_code, amount, bank_name, account_number, account_name } = data;
      const amt = Number(amount);

      const { data: tenant } = await supabase.from('tenants').select('wallet_balance').eq('code', tenant_code).maybeSingle();
      if (!tenant || (tenant.wallet_balance || 0) < amt) {
        throw new Error('Saldo tidak mencukupi untuk penarikan.');
      }

      // Deduct balance
      await supabase.from('tenants').update({ wallet_balance: tenant.wallet_balance - amt }).eq('code', tenant_code);

      // Create withdrawal request
      const { data: created, error } = await supabase.from('withdrawals').insert({
        tenant_code,
        amount: amt,
        bank_name,
        account_number,
        account_name,
        status: 'PENDING'
      }).select().single();

      if (error) throw error;
      return created;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  getPlatformBalance: async () => {
    try {
      const { data } = await supabase.from('platform_wallet').select('balance').eq('id', 1).maybeSingle();
      return { balance: (data && data.balance) || 0 };
    } catch (e) {
      return { balance: 0 };
    }
  },

  // 10. Super Admin
  getAdminStats: async () => {
    try {
      const { data: tenants } = await supabase.from('tenants').select('*');
      const { data: withdrawals } = await supabase.from('withdrawals').select('*, tenants(name)').order('created_at', { ascending: false });
      const { data: pWallet } = await supabase.from('platform_wallet').select('balance').eq('id', 1).maybeSingle();

      const formattedWithdrawals = (withdrawals || []).map(w => ({
        ...w,
        tenant_name: w.tenants ? w.tenants.name : w.tenant_code
      }));

      return {
        tenants: tenants || [],
        withdrawals: formattedWithdrawals,
        platform_balance: (pWallet && pWallet.balance) || 0
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  approveWithdrawal: async (id) => {
    try {
      const { data, error } = await supabase.from('withdrawals').update({ status: 'SUCCESS' }).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};
