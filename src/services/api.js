import { supabase } from './supabase';
import { compressImageFile } from '../utils/imageCompressor';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3001/api');

const PRODUCT_META_OVERRIDES_KEY = 'UNITPRO_PRODUCT_META_OVERRIDES';

const getProductMetaOverrides = () => {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(PRODUCT_META_OVERRIDES_KEY) || '{}'); } catch { return {}; }
};
const getProductMetaKeys = (tenantCode, product = {}) => {
  const tenantKey = tenantCode || product.tenant_code || '';
  const keys = [];
  if (product.id) keys.push(`${tenantKey}:${product.id}`);
  if (product.name) keys.push(`${tenantKey}:name:${String(product.name).trim().toLowerCase()}`);
  return keys;
};
const getProductMetaOverride = (tenantCode, product, field) => {
  const overrides = getProductMetaOverrides();
  for (const key of getProductMetaKeys(tenantCode, product)) {
    if (overrides[key] && overrides[key][field]) return overrides[key][field];
  }
  return '';
};
const saveProductMetaOverride = (tenantCode, product, patch = {}) => {
  if (typeof window === 'undefined' || !product) return;
  const cleanPatch = {};
  if (patch.category) cleanPatch.category = String(patch.category).trim().toUpperCase();
  if (patch.imageUrl) cleanPatch.imageUrl = patch.imageUrl;
  if (Object.keys(cleanPatch).length === 0) return;
  try {
    const overrides = getProductMetaOverrides();
    for (const key of getProductMetaKeys(tenantCode, product)) overrides[key] = { ...(overrides[key] || {}), ...cleanPatch };
    window.localStorage.setItem(PRODUCT_META_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) { console.warn('Product local metadata fallback warning:', err); }
};

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
        .select('name, code, settings, tier')
        .eq('code', tenantCode)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('getTenantPublic error', e);
      return null;
    }
  },

  // 1. Login / Register Tenant (Store) — Express Backend Auth + Supabase Sync
  loginTenant: async (code, name = '', pin = '', phone = '') => {
    const cleanCode = (code || '').trim().toUpperCase();
    let resultTenant = null;
    let resultToken = null;

    try {
      const response = await fetch(`${API_BASE_URL}/tenant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, name, pin, phone })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal login toko. Periksa Kode Toko atau PIN.');
      }

      const resData = await response.json();
      resultToken = resData.token;
      resultTenant = resData;
      if (resultToken) {
        localStorage.setItem('TENANT_TOKEN', resultToken);
      }
    } catch (e) {
      console.error('Login tenant via backend API failed, attempting fallback...', e);
      // Fallback if local backend server is not running
      const { data: existing, error } = await supabase
        .from('tenants')
        .select('code, name, tier, settings, pin')
        .eq('code', cleanCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') console.error('Supabase fallback error:', error);

      if (!existing) {
        if (!name) throw new Error('Kode Toko tidak terdaftar. Silakan daftar terlebih dahulu.');
        const newStore = { 
          code: cleanCode, 
          name: name || cleanCode, 
          tier: 'free', 
          settings: { storeName: name || cleanCode, store_wa: phone || '', qrisUrl: '' }, 
          pin: pin || '' 
        };
        await supabase.from('tenants').insert(newStore);
        resultToken = `dev_token_${cleanCode}`;
        resultTenant = { ...newStore, phone: phone || '' };
      } else {
        resultToken = `dev_token_${cleanCode}`;
        resultTenant = existing;
      }
    }

    // Always ensure tenant record is synced/upserted to Supabase for Super Admin visibility & cloud persistence
    if (resultTenant && resultTenant.code) {
      try {
        const settingsToSave = typeof resultTenant.settings === 'string'
          ? JSON.parse(resultTenant.settings)
          : (resultTenant.settings || {});
        
        if (!settingsToSave.storeName && (name || resultTenant.name)) {
          settingsToSave.storeName = name || resultTenant.name;
        }
        if (!settingsToSave.store_wa && (phone || resultTenant.phone)) {
          settingsToSave.store_wa = phone || resultTenant.phone;
        }
        if (typeof settingsToSave.qrisUrl === 'undefined') {
          settingsToSave.qrisUrl = '';
        }

        const supabaseRecord = {
          code: resultTenant.code,
          name: name || resultTenant.name || resultTenant.code,
          tier: resultTenant.tier || 'free',
          settings: settingsToSave
        };
        if (pin) supabaseRecord.pin = pin;

        await supabase.from('tenants').upsert(supabaseRecord, { onConflict: 'code' });
        resultTenant.settings = settingsToSave;
      } catch (syncErr) {
        console.warn('Syncing tenant to Supabase warning:', syncErr);
      }
    }

    return { token: resultToken, tenant: resultTenant };
  },

  // 2. Login Employee — Express Backend Auth
  loginEmployee: async (tenant_code, pin) => {
    try {
      let cleanCode = (tenant_code || '').trim().toUpperCase();
      
      if (cleanCode === 'DEMO-STORE') {
        const demoUsers = [
          { id: 'EMP-1', name: 'Andi (Teknisi Hardware)', role: 'TEKNISI', pin: '1234', phone: '081234567801', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-2', name: 'Budi (Teknisi Software)', role: 'TEKNISI', pin: '5678', phone: '081234567802', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-3', name: 'Citra (Kasir & Admin)', role: 'KASIR', pin: '1111', phone: '081234567803', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-4', name: 'Dedi (Teknisi Chipset)', role: 'TEKNISI', pin: '2222', phone: '081234567804', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-5', name: 'Eko (Senior Repair)', role: 'TEKNISI', pin: '3333', phone: '081234567805', tenant_code: 'DEMO-STORE' },
        ];
        const user = demoUsers.find(u => u.pin === pin);
        if (user) return { user, token: 'demo-token-123' };
        throw new Error('PIN atau Kode Toko Salah!');
      }
      
      // Attempt to resolve real tenant_code if they accidentally typed the tenant name
      const { data: tenantSearch } = await supabase
        .from('tenants')
        .select('code')
        .or(`code.eq.${cleanCode},name.ilike.${cleanCode}`)
        .maybeSingle();

      if (tenantSearch && tenantSearch.code) {
        cleanCode = tenantSearch.code;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_code', cleanCode)
        .eq('pin', pin)
        .single();

      if (error || !data) {
        throw new Error('PIN atau Kode Toko Salah!');
      }

      const fakeToken = `EMP_${data.id}_${Date.now()}`;
      localStorage.setItem('EMPLOYEE_TOKEN', fakeToken);
      return { token: fakeToken, user: data };
    } catch (e) {
      console.error('Login employee error:', e);
      throw new Error('PIN atau Kode Toko Salah!');
    }
  },

  // 3. Products (Master Barang)
  getProducts: async (tenantCode) => {
    try {
      if (tenantCode === 'DEMO-STORE') {
        const demoProducts = [
          { id: 'PROD-001', name: 'LCD iPhone 11 Original', price: 450000, stock: 12, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-002', name: 'Baterai MacBook Pro Retina 13"', price: 650000, stock: 5, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-003', name: 'RAM DDR4 8GB 3200MHz Laptop', price: 320000, stock: 18, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-004', name: 'SSD NVMe 512GB Kingston', price: 580000, stock: 14, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-005', name: 'Thermal Paste Arctic MX-4 4g', price: 85000, stock: 25, category: 'AKSESORIS', imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-006', name: 'Charger Laptop Universal 90W', price: 175000, stock: 8, category: 'AKSESORIS', imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-007', name: 'Flexible Keyboard Asus TUF FX505', price: 195000, stock: 3, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-008', name: 'Kipas Fan Cooler CPU Laptop Lenovo', price: 140000, stock: 2, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-009', name: 'Jasa Servis Cleaning & Thermal Paste', price: 150000, stock: 999, category: 'JASA', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
          { id: 'PROD-010', name: 'Jasa Flash BIOS & Install Windows 11', price: 100000, stock: 999, category: 'JASA', imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&auto=format&fit=crop&q=80' },
        ];
        const demoImages = [
          'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80'
        ];
        for (let i = 11; i <= 40; i++) {
          demoProducts.push({
            id: `PROD-${100 + i}`,
            name: `Sparepart / Aksesoris Komputer Grade A #${i}`,
            price: (i * 25000) + 50000,
            stock: (i % 7) + 1,
            category: i % 2 === 0 ? 'SPAREPART' : 'AKSESORIS',
            imageUrl: demoImages[i % demoImages.length]
          });
        }
        return demoProducts;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_code', tenantCode)
        .order('id', { ascending: false });

      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        category: p.category || getProductMetaOverride(tenantCode, p, 'category') || 'SPAREPART',
        imageUrl: p.imageUrl || p.image_url || p.image || getProductMetaOverride(tenantCode, p, 'imageUrl') || ''
      }));
    } catch (e) {
      console.error('getProducts error:', e);
      return [];
    }
  },

  addProduct: async (productData, userName = 'Admin') => {
    try {
      const cleanName = (productData.name || '').trim();
      const cleanPrice = Math.max(0, Number(productData.price) || 0);
      const cleanStock = Math.max(0, Number(productData.stock) || 0);
      const cleanCat = (productData.category || 'SPAREPART').toUpperCase();
      const img = productData.imageUrl || productData.image_url || '';

      if (productData.tenant_code === 'DEMO-STORE') {
        return {
          id: `PROD-${Date.now()}`,
          tenant_code: 'DEMO-STORE',
          name: cleanName,
          price: cleanPrice,
          stock: cleanStock,
          category: cleanCat,
          imageUrl: img,
          image_url: img
        };
      }

      // Primary payload
      const primaryPayload = {
        tenant_code: productData.tenant_code,
        name: cleanName,
        price: cleanPrice,
        stock: cleanStock,
        category: cleanCat,
        image_url: img
      };

      let inserted = null;
      let insertErr = null;

      try {
        const res = await supabase
          .from('products')
          .insert(primaryPayload)
          .select()
          .single();
        inserted = res.data;
        insertErr = res.error;
      } catch (err) {
        insertErr = err;
      }

      // Retry with basic columns if table schema differs
      if (insertErr) {
        console.warn('Product insert fallback:', insertErr?.message || insertErr);
        const fallbackPayload = {
          tenant_code: productData.tenant_code,
          name: cleanName,
          price: cleanPrice,
          stock: cleanStock
        };
        // Database lama mungkin belum punya kolom image_url; simpan barang tanpa foto dulu.

        const retryRes = await supabase
          .from('products')
          .insert(fallbackPayload)
          .select()
          .single();

        if (retryRes.error) {
          console.warn('Fallback product insert error:', retryRes.error);
          throw new Error(`Barang gagal disimpan ke database: ${retryRes.error.message || 'schema products tidak cocok'}`);
        }
        inserted = retryRes.data;
      }

      if (cleanStock > 0 && inserted?.id) {
        try {
          await supabase.from('stock_movements').insert({
            tenant_code: productData.tenant_code,
            product_id: inserted.id,
            user_name: userName,
            change_amount: cleanStock,
            description: 'Stok Awal Barang Baru'
          });
        } catch (e) {
          console.warn('Stock movement insert error:', e);
        }
      }

      saveProductMetaOverride(productData.tenant_code, inserted || { name: cleanName }, { category: cleanCat, imageUrl: img });

      return {
        ...inserted,
        category: inserted?.category || cleanCat,
        imageUrl: inserted?.imageUrl || inserted?.image_url || img
      };
    } catch (e) {
      console.error('addProduct exception:', e);
      throw e;
    }
  },

  updateProduct: async (id, productData, currentStock = null, userName = 'Admin', description = 'Edit Manual Stok') => {
    try {
      const cleanPrice = productData.price !== undefined ? Math.max(0, Number(productData.price) || 0) : undefined;
      const cleanStock = productData.stock !== undefined ? Math.max(0, Number(productData.stock) || 0) : undefined;
      const img = productData.imageUrl || productData.image_url || '';

      if (productData.tenant_code === 'DEMO-STORE' || String(id).startsWith('PROD-')) {
        return { id, ...productData, imageUrl: img };
      }

      const payload = { ...productData };
      delete payload.imageUrl;
      delete payload.image;
      if (cleanPrice !== undefined) payload.price = cleanPrice;
      if (cleanStock !== undefined) payload.stock = cleanStock;
      if (img) {
        payload.image_url = img;
      }

      let updated = null;
      let updateErr = null;

      try {
        const res = await supabase.from('products').update(payload).eq('id', id).select().single();
        updated = res.data;
        updateErr = res.error;
      } catch (err) {
        updateErr = err;
      }

      if (updateErr) {
        const basicPayload = {};
        if (productData.name) basicPayload.name = productData.name;
        if (cleanPrice !== undefined) basicPayload.price = cleanPrice;
        if (cleanStock !== undefined) basicPayload.stock = cleanStock;
        if (productData.category) basicPayload.category = String(productData.category || '').toUpperCase();
        if (img) basicPayload.image_url = img;
        const retryRes = await supabase.from('products').update(basicPayload).eq('id', id).select().single();
        if (!retryRes.error) {
          updated = retryRes.data;
        } else {
          return { id, ...productData, imageUrl: img };
        }
      }

      if (cleanStock !== undefined && currentStock !== null) {
        const diff = cleanStock - Number(currentStock);
        if (diff !== 0 && (updated?.id || id)) {
          try {
            await supabase.from('stock_movements').insert({
              tenant_code: updated?.tenant_code || productData.tenant_code,
              product_id: updated?.id || id,
              user_name: userName,
              change_amount: diff,
              description: description
            });
          } catch (e) {
            console.warn('Stock movement update error:', e);
          }
        }
      }

      saveProductMetaOverride(productData.tenant_code || updated?.tenant_code, { ...updated, id, name: productData.name || updated?.name }, { category: productData.category, imageUrl: img });

      return {
        ...updated,
        category: updated?.category || productData.category,
        imageUrl: updated?.imageUrl || updated?.image_url || img
      };
    } catch (e) {
      console.error('updateProduct exception:', e);
      return { id, ...productData };
    }
  },

  deleteProduct: async (id) => {
    try {
      if (String(id).startsWith('PROD-')) {
        return { success: true };
      }
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('deleteProduct error:', e);
      throw e;
    }
  },

  getTransactions: async (tenantCode) => {
    try {
      if (tenantCode === 'DEMO-STORE') {
        const demoTxs = [];
        for (let i = 1; i <= 25; i++) {
          demoTxs.push({
            id: `TRX-POS-${100 + i}`,
            tenant_code: 'DEMO-STORE',
            type: i % 4 === 0 ? 'EXPENSE' : i % 3 === 0 ? 'INCOME' : 'POS_SALES',
            amount: i % 4 === 0 ? 150000 : (i * 85000) + 120000,
            description: i % 4 === 0 ? 'Beli Kertas Struk & Konsumsi Toko' : `Penjualan Kasir / Servis #${i}`,
            created_at: new Date(Date.now() - (i * 3600000 * 6)).toISOString()
          });
        }
        return demoTxs;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_code', tenantCode)
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getTransactions error:', e);
      return [];
    }
  },

  createTransaction: async (txData) => {
    try {
      if (txData.tenant_code === 'DEMO-STORE') {
        const newTx = {
          id: `TRX-${Date.now()}`,
          created_at: txData.created_at || new Date().toISOString(),
          ...txData
        };
        return newTx;
      }
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          tenant_code: txData.tenant_code,
          type: txData.type || 'EXPENSE',
          amount: Number(txData.amount || 0),
          description: txData.description || '',
          payment_method: txData.payment_method || 'Tunai',
          created_at: txData.created_at || new Date().toISOString()
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createTransaction error:', e);
      return {
        id: `TRX-${Date.now()}`,
        created_at: txData.created_at || new Date().toISOString(),
        ...txData
      };
    }
  },

  updateTransaction: async (id, transactionData) => {

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('updateTransaction error:', e);
      throw e;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('deleteTransaction error:', e);
      throw e;
    }
  },

  // 4. Users / Employees
  getUsers: async (tenantCode) => {
    try {
      if (tenantCode === 'DEMO-STORE') {
        return [
          { id: 'EMP-1', name: 'Andi (Teknisi Hardware)', role: 'TEKNISI', pin: '1234', phone: '081234567801', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-2', name: 'Budi (Teknisi Software)', role: 'TEKNISI', pin: '5678', phone: '081234567802', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-3', name: 'Citra (Kasir & Admin)', role: 'KASIR', pin: '1111', phone: '081234567803', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-4', name: 'Dedi (Teknisi Chipset)', role: 'TEKNISI', pin: '2222', phone: '081234567804', tenant_code: 'DEMO-STORE' },
          { id: 'EMP-5', name: 'Eko (Senior Repair)', role: 'TEKNISI', pin: '3333', phone: '081234567805', tenant_code: 'DEMO-STORE' },
        ];
      }

      const supabaseQuery = supabase
        .from('users')
        .select('id, name, role, pin, phone, tenant_code')
        .eq('tenant_code', tenantCode)
        .order('name');

      const { data, error } = await supabaseQuery;
      if (!error) {
        return data || [];
      }

      console.warn('Supabase getUsers failed, falling back to backend:', error);

      const res = await fetch(`${API_BASE_URL}/users/${tenantCode}`, {
        headers: apiService.getHeaders()
      });
      if (!res.ok) throw new Error('Gagal memuat data karyawan');

      const backendUsers = await res.json();
      return Array.isArray(backendUsers) ? backendUsers : [];
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
      if (tenantCode === 'DEMO-STORE') {
        return [
          { resi: 'TRX-1001', customer_name: 'Hendra Saputra', customer_phone: '081234567890', device_name: 'Laptop ASUS ROG Strix GL553', issue: 'Mati total terkena cairan kopi', status: 'DIKERJAKAN', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*24*2).toISOString(), tenant_code: 'DEMO-STORE' },
          { resi: 'TRX-1002', customer_name: 'Siti Rahma', customer_phone: '085712345678', device_name: 'MacBook Air M1 2020', issue: 'Layar blank hitam, suara nyala', status: 'DICEK', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*24*1).toISOString(), tenant_code: 'DEMO-STORE' },
          { resi: 'TRX-1003', customer_name: 'Bambang Wijaya', customer_phone: '081987654321', device_name: 'Lenovo ThinkPad T480', issue: 'Upgrade SSD 512GB & RAM 16GB', status: 'SELESAI', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*12).toISOString(), tenant_code: 'DEMO-STORE' },
          { resi: 'TRX-1004', customer_name: 'Dewi Lestari', customer_phone: '082133445566', device_name: 'Acer Nitro 5 AN515', issue: 'Kipas berisik & panas lemot', status: 'DIAMBIL', technician_id: 'EMP-4', created_at: new Date(Date.now() - 3600000*5).toISOString(), tenant_code: 'DEMO-STORE' },
          { resi: 'TRX-1005', customer_name: 'Rian Pratama', customer_phone: '087811223344', device_name: 'HP Pavilion Gaming 15', issue: 'Keyboard eror pencet sendiri', status: 'MENUNGGU_PART', technician_id: 'EMP-5', created_at: new Date(Date.now() - 3600000*3).toISOString(), tenant_code: 'DEMO-STORE' },
          { resi: 'TRX-1006', customer_name: 'Fikri Haikal', customer_phone: '081299887766', device_name: 'Dell XPS 13 9360', issue: 'Baterai kembung mati diisi', status: 'PROSES', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*1).toISOString(), tenant_code: 'DEMO-STORE' }
        ];
      }

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

  updateService: async (resi, serviceData) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('resi', resi)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('updateService error:', e);
      throw e;
    }
  },

  deleteService: async (resi) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('resi', resi);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('deleteService error:', e);
      throw e;
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
          technician_id: body.technician_id,
          ...(body.issue ? { issue: body.issue } : {})
        }).eq('resi', body.resi).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint === '/services/update') {
        const { resi, tenant_code, ...updates } = body;
        let query = supabase.from('services').update(updates).eq('resi', resi);
        if (tenant_code) query = query.eq('tenant_code', tenant_code);
        const { data, error } = await query.select().single();
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
      if (endpoint.startsWith('/transactions/') && endpoint.endsWith('/update')) {
        const id = endpoint.split('/')[2];
        const { data, error } = await supabase.from('transactions').update(body).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      if (endpoint === '/transactions/update-type') {
        const { id, type } = body;
        const { data, error } = await supabase.from('transactions').update({ type }).eq('id', id).select().single();
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
      if (!file) return { url: '' };
      if (typeof file === 'string') return { url: file };

      const compressedBase64 = await compressImageFile(file, 800, 800, 0.72);
      if (compressedBase64) {
        return { url: compressedBase64 };
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ url: reader.result });
        };
        reader.onerror = (err) => {
          reject(err);
        };
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.error('uploadFile error:', e);
      throw e;
    }
  },

  // 7. Public Tracking
  trackService: async (resi) => {
    try {
      const cleanResi = String(resi || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
      if (!cleanResi) throw new Error('Nomor resi tidak valid.');
      const { data: service, error } = await supabase
        .from('services')
        .select('resi, tenant_code, customer_name, device_name, issue, status, jasa_fee, part_fee, created_at')
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

  // 8. Public landing page reviews
  getPlatformReviews: async () => {
    try {
      const { data, error } = await supabase
        .from('platform_reviews')
        .select('*')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Platform reviews are unavailable:', e.message);
      return [];
    }
  },

  createPlatformReview: async ({ name, role = '', rating, content }) => {
    const authorName = (name || '').trim();
    const authorRole = (role || '').trim();
    const reviewContent = (content || '').trim();
    const reviewRating = Number(rating);

    if (authorName.length < 2 || authorName.length > 50) throw new Error('Nama harus berisi 2-50 karakter.');
    if (authorRole.length > 80) throw new Error('Nama usaha atau peran maksimal 80 karakter.');
    if (reviewContent.length < 10 || reviewContent.length > 500) throw new Error('Komentar harus berisi 10-500 karakter.');
    if (!Number.isInteger(reviewRating) || reviewRating < 1 || reviewRating > 5) throw new Error('Pilih rating dari 1 sampai 5 bintang.');

    const { data, error } = await supabase
      .from('platform_reviews')
      .insert({ author_name: authorName, author_role: authorRole || null, rating: reviewRating, content: reviewContent })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getAdminPlatformReviews: async () => {
    try {
      const { data, error } = await supabase
        .from('platform_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Admin platform reviews are unavailable:', e.message);
      return [];
    }
  },

  deletePlatformReview: async (reviewId, adminToken) => {
    if (!adminToken) throw new Error('Sesi moderasi tidak ditemukan. Keluar lalu masuk kembali ke Super Admin.');
    const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Gagal menghapus komentar.');
    return result;
  },

  // 9. Forum
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

  uploadFile: async (file) => {
    try {
      const base64 = await compressImageFile(file, 800, 0.72);
      return { url: base64 };
    } catch (e) {
      console.error(e);
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

  // 10. Wallet & Tipping
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

  // 11. Super Admin
  getAdminStats: async () => {
    try {
      let backendTenants = [];
      let backendWithdrawals = [];
      let backendPlatformBalance = null;

      try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, {
          headers: apiService.getHeaders()
        });
        if (res.ok) {
          const statsRes = await res.json();
          if (statsRes.tenants) backendTenants = statsRes.tenants;
          if (statsRes.withdrawals) backendWithdrawals = statsRes.withdrawals;
          if (statsRes.platform_balance !== undefined) backendPlatformBalance = statsRes.platform_balance;
        }
      } catch (err) {
        console.warn('Backend fetch for admin stats failed, will fallback to Supabase:', err);
      }

      let supabaseTenants = [];
      let supabaseWithdrawals = [];
      let supabasePlatformBalance = 0;

      try {
        const { data: tenants } = await supabase.from('tenants').select('*');
        if (tenants) supabaseTenants = tenants;
        const { data: withdrawals } = await supabase.from('withdrawals').select('*, tenants(name)').order('created_at', { ascending: false });
        if (withdrawals) supabaseWithdrawals = withdrawals;
        const { data: pWallet } = await supabase.from('platform_wallet').select('balance').eq('id', 1).maybeSingle();
        if (pWallet && pWallet.balance !== undefined) supabasePlatformBalance = pWallet.balance;
      } catch (err) {
        console.warn('Supabase fetch for admin stats failed:', err);
      }

      // Merge tenants cleanly by code
      const tenantMap = new Map();
      supabaseTenants.forEach(t => tenantMap.set(t.code, t));
      backendTenants.forEach(t => {
        if (!tenantMap.has(t.code)) {
          tenantMap.set(t.code, t);
        } else {
          const existing = tenantMap.get(t.code);
          tenantMap.set(t.code, { ...existing, ...t, phone: t.phone || existing.phone, name: t.name || existing.name });
        }
      });
      const allTenants = Array.from(tenantMap.values());

      // Merge withdrawals
      const withdrawalMap = new Map();
      supabaseWithdrawals.forEach(w => withdrawalMap.set(String(w.id), { ...w, tenant_name: w.tenants ? w.tenants.name : w.tenant_code }));
      backendWithdrawals.forEach(w => {
        if (!withdrawalMap.has(String(w.id))) {
          withdrawalMap.set(String(w.id), w);
        }
      });

      return {
        tenants: allTenants,
        withdrawals: Array.from(withdrawalMap.values()),
        platform_balance: backendPlatformBalance !== null ? backendPlatformBalance : supabasePlatformBalance
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

  setTenantTrial: async (tenantCode, targetTier, trialEndsAtMs) => {
    try {
      const { data: tenant } = await supabase.from('tenants').select('settings').eq('code', tenantCode).single();
      const currentSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
      const newSettings = { ...currentSettings, trial_ends_at: trialEndsAtMs };
      
      const { data, error } = await supabase
        .from('tenants')
        .update({ tier: targetTier, settings: newSettings })
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
      await supabase.from('forum_posts').delete().eq('tenant_code', tenantCode);
      await supabase.from('forum_threads').delete().eq('tenant_code', tenantCode);
      await supabase.from('withdrawals').delete().eq('tenant_code', tenantCode);
      
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
  // 12. SISTEM AFILIASI (Komisi 80% Pembelian Pertama)
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
  },

  resetTenantData: async (tenantCode, options = { keepUsers: true }) => {
    try {
      await supabase.from('transactions').delete().eq('tenant_code', tenantCode);
      await supabase.from('services').delete().eq('tenant_code', tenantCode);
      await supabase.from('products').delete().eq('tenant_code', tenantCode);
      if (!options.keepUsers) {
        await supabase.from('users').delete().eq('tenant_code', tenantCode);
      }
      return { success: true };
    } catch (e) {
      console.error('Reset data error:', e);
      throw e;
    }
  }
};
