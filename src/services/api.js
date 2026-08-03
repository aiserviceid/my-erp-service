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

  getTenantPublic: async (tenantCode) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, code, settings')
        .eq('code', tenantCode)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getTenantPublic error', e);
      return null;
    }
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
        // Jika tidak ada nama (berasal dari form login), tolak akses
        if (!name) {
          throw new Error('Kode Toko tidak terdaftar. Silakan daftar terlebih dahulu.');
        }

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

      // Check if banned
      const existingSettings = typeof existing.settings === 'string' ? JSON.parse(existing.settings) : (existing.settings || {});
      if (existingSettings.is_banned) {
        throw new Error('Akun Toko Anda telah dinonaktifkan oleh Admin.');
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

  updateProduct: async (id, productData) => {
    try {
      const { data, error } = await supabase.from('products').update(productData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
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

  updateUser: async (id, userData) => {
    try {
      const { data, error } = await supabase.from('users').update(userData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteUser: async (id) => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
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
      if (endpoint === '/services/finish') {
        const { data, error } = await supabase.from('services').update({ 
          status: body.status, 
          part_fee: body.part_fee, 
          jasa_fee: body.jasa_fee,
          technician_id: body.technician_id
        }).eq('resi', body.resi).select().single();
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
  },

  updateTenantTier: async (tenantCode, newTier) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({ tier: newTier })
        .eq('code', tenantCode)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  adjustTenantWallet: async (tenantCode, deltaAmount) => {
    try {
      const { data: tenant } = await supabase.from('tenants').select('wallet_balance').eq('code', tenantCode).maybeSingle();
      const current = (tenant && tenant.wallet_balance) || 0;
      const newBal = Math.max(0, current + Number(deltaAmount));
      const { data, error } = await supabase
        .from('tenants')
        .update({ wallet_balance: newBal })
        .eq('code', tenantCode)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  updateTenantSettings: async (tenantCode, newSettings) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('code', tenantCode)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  resetTenantPin: async (tenantCode, newPin) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({ pin: newPin })
        .eq('code', tenantCode)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  updateTenantStatus: async (tenantCode, isBanned) => {
    try {
      const { data: tenant } = await supabase.from('tenants').select('settings').eq('code', tenantCode).maybeSingle();
      if (!tenant) throw new Error('Toko tidak ditemukan');
      
      let currentSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
      currentSettings.is_banned = isBanned;
      
      const { data, error } = await supabase
        .from('tenants')
        .update({ settings: currentSettings })
        .eq('code', tenantCode)
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteTenant: async (tenantCode) => {
    try {
      await supabase.from('users').delete().eq('tenant_code', tenantCode);
      await supabase.from('products').delete().eq('tenant_code', tenantCode);
      await supabase.from('services').delete().eq('tenant_code', tenantCode);
      await supabase.from('transactions').delete().eq('tenant_code', tenantCode);
      
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('code', tenantCode);
        
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // ============================================================
  // 11. SISTEM AFILIASI (Komisi 80% Pembelian Pertama)
  // ============================================================

  // Ambil atau buat kode afiliasi unik untuk toko ini
  getOrCreateAffiliateCode: async (tenantCode) => {
    try {
      const { data: existing } = await supabase
        .from('affiliates')
        .select('*')
        .eq('tenant_code', tenantCode)
        .maybeSingle();

      if (existing) return existing;

      // Generate kode unik: 8 karakter uppercase
      const code = 'AF-' + tenantCode.slice(0, 4) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data: created, error } = await supabase
        .from('affiliates')
        .insert({ tenant_code: tenantCode, affiliate_code: code, total_earned: 0, total_pending: 0 })
        .select().single();

      if (error) {
        // Mungkin sudah ada (race condition), ambil ulang
        const { data: retry } = await supabase.from('affiliates').select('*').eq('tenant_code', tenantCode).maybeSingle();
        return retry;
      }
      return created;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Ambil data afiliasi + riwayat komisi
  getAffiliateData: async (tenantCode) => {
    try {
      const affiliate = await apiService.getOrCreateAffiliateCode(tenantCode);
      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_tenant_code', tenantCode)
        .order('created_at', { ascending: false });

      return {
        affiliate,
        commissions: commissions || []
      };
    } catch (e) {
      console.error(e);
      return { affiliate: null, commissions: [] };
    }
  },

  // Proses referral baru (dipanggil saat registrasi toko baru dengan kode afiliasi)
  processAffiliateReferral: async (affiliateCode, newTenantCode, newTenantName, tier) => {
    try {
      // Cek apakah kode afiliasi valid
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('affiliate_code', affiliateCode.toUpperCase().trim())
        .maybeSingle();

      if (!affiliate) throw new Error('Kode afiliasi tidak valid!');

      // Cek apakah toko baru sudah pernah dapat dari kode ini (prevent double)
      const { data: existing } = await supabase
        .from('affiliate_commissions')
        .select('id')
        .eq('referred_tenant_code', newTenantCode)
        .maybeSingle();

      if (existing) throw new Error('Toko ini sudah terdaftar dari afiliasi sebelumnya.');

      // Hitung komisi 80% dari pembelian pertama
      const COMMISSION_RATE = 0.80;
      const tierPrices = { pro: 49000, enterprise: 79000, free: 0 };
      const basePrice = tierPrices[tier] || 0;
      const commissionAmount = Math.floor(basePrice * COMMISSION_RATE);

      if (commissionAmount === 0) {
        return { success: true, commissionAmount: 0, message: 'Paket gratis tidak menghasilkan komisi.' };
      }

      // Catat komisi ke tabel affiliate_commissions
      const { error: commErr } = await supabase.from('affiliate_commissions').insert({
        affiliate_tenant_code: affiliate.tenant_code,
        referred_tenant_code: newTenantCode,
        referred_tenant_name: newTenantName,
        tier_purchased: tier,
        base_amount: basePrice,
        commission_amount: commissionAmount,
        commission_rate: COMMISSION_RATE,
        status: 'PENDING'
      });

      if (commErr) throw commErr;

      // Update total pending di tabel affiliates
      await supabase.from('affiliates').update({
        total_pending: (affiliate.total_pending || 0) + commissionAmount,
        total_referrals: (affiliate.total_referrals || 0) + 1
      }).eq('tenant_code', affiliate.tenant_code);

      return { success: true, commissionAmount, affiliateTenantCode: affiliate.tenant_code };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Super Admin: Ambil semua data afiliasi untuk approve
  getAffiliateAdminData: async () => {
    try {
      const { data: affiliates } = await supabase.from('affiliates').select('*').order('total_pending', { ascending: false });
      const { data: commissions } = await supabase.from('affiliate_commissions').select('*').order('created_at', { ascending: false });
      return { affiliates: affiliates || [], commissions: commissions || [] };
    } catch (e) {
      console.error(e);
      return { affiliates: [], commissions: [] };
    }
  },

  // Super Admin: Approve & bayar komisi ke dompet afiliasi
  approveAffiliateCommission: async (commissionId, affiliateTenantCode, amount) => {
    try {
      // Update status komisi ke PAID
      const { error: updErr } = await supabase
        .from('affiliate_commissions')
        .update({ status: 'PAID' })
        .eq('id', commissionId);
      if (updErr) throw updErr;

      // Tambahkan saldo ke dompet afiliasi
      const { data: aff } = await supabase.from('affiliates').select('total_earned, total_pending').eq('tenant_code', affiliateTenantCode).maybeSingle();
      await supabase.from('affiliates').update({
        total_earned: ((aff && aff.total_earned) || 0) + amount,
        total_pending: Math.max(0, ((aff && aff.total_pending) || 0) - amount)
      }).eq('tenant_code', affiliateTenantCode);

      // Tambahkan ke wallet tenant
      await apiService.adjustTenantWallet(affiliateTenantCode, amount);

      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

