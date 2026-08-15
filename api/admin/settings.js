import { createClient } from '@supabase/supabase-js';
import { getBearerToken, verifyServerToken } from '../../server/serverless-auth.mjs';

const getSupabaseAdmin = () => {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const requireSuperAdmin = (req, res) => {
  const token = getBearerToken(req);
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Sesi Super Admin tidak ditemukan. Silakan logout lalu login kembali.' });
    return null;
  }

  try {
    const payload = verifyServerToken(token);
    if (payload?.role !== 'super_admin') {
      res.status(403).json({ error: 'Akses khusus Super Admin diperlukan.' });
      return null;
    }
    return payload;
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('Konfigurasi autentikasi server')) {
      res.status(503).json({ error: 'Konfigurasi autentikasi server belum tersedia. Pastikan Supabase service role aktif.' });
    } else {
      res.status(401).json({ error: 'Sesi Super Admin lama tidak lagi valid. Silakan logout lalu login kembali sekali.' });
    }
    return null;
  }
};

const getConfigValue = async (supabase, key) => {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  if (!requireSuperAdmin(req, res)) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase service role belum dikonfigurasi di server.' });
  }

  try {
    if (req.method === 'GET') {
      const [phone, enabled, freeTenant1, freeTenant2, freeTenant3] = await Promise.all([
        getConfigValue(supabase, 'super_admin_2fa_phone'),
        getConfigValue(supabase, 'super_admin_2fa_enabled'),
        getConfigValue(supabase, 'super_admin_free_tenant_1'),
        getConfigValue(supabase, 'super_admin_free_tenant_2'),
        getConfigValue(supabase, 'super_admin_free_tenant_3')
      ]);

      return res.status(200).json({
        super_admin_2fa_phone: phone || '085382535050',
        super_admin_2fa_enabled: enabled == null ? true : String(enabled) === 'true',
        super_admin_free_tenant_1: freeTenant1 || 'AISERVICE',
        super_admin_free_tenant_2: freeTenant2 || '',
        super_admin_free_tenant_3: freeTenant3 || ''
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates = [];

    if (body.newPasswordHash) {
      const hash = String(body.newPasswordHash).trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(hash)) {
        return res.status(400).json({ error: 'Format password hash tidak valid.' });
      }
      updates.push({ key: 'super_admin_hash', value: hash, updated_at: new Date().toISOString() });
    }

    if (body.phone2fa !== undefined) {
      const phone = String(body.phone2fa || '').replace(/\D/g, '');
      if (body.enabled2fa && !/^[0-9]{9,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Nomor WhatsApp 2FA harus berisi 9-15 digit angka.' });
      }
      updates.push({ key: 'super_admin_2fa_phone', value: phone, updated_at: new Date().toISOString() });
    }

    if (body.enabled2fa !== undefined) {
      updates.push({
        key: 'super_admin_2fa_enabled',
        value: String(Boolean(body.enabled2fa)),
        updated_at: new Date().toISOString()
      });
    }

    const freeSlots = [
      ['super_admin_free_tenant_1', body.freeTenant1],
      ['super_admin_free_tenant_2', body.freeTenant2],
      ['super_admin_free_tenant_3', body.freeTenant3]
    ];

    for (const [key, rawValue] of freeSlots) {
      if (rawValue === undefined) continue;
      const value = String(rawValue || '').trim().toUpperCase();
      if (value && !/^[A-Z0-9_-]{3,32}$/.test(value)) {
        return res.status(400).json({ error: `Kode toko ${value} tidak valid.` });
      }
      updates.push({ key, value, updated_at: new Date().toISOString() });
    }

    if (updates.length > 0) {
      const { error } = await supabase
        .from('app_config')
        .upsert(updates, { onConflict: 'key' });
      if (error) throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Pengaturan berhasil disimpan.'
    });
  } catch (error) {
    console.error('admin/settings error:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal menyimpan pengaturan Super Admin.'
    });
  }
}
