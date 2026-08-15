import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
const PIN_REGEX = /^[0-9]{4,12}$/;

const RELATED_TENANT_TABLES = [
  'users',
  'products',
  'transactions',
  'services',
  'stock_movements',
  'forum_threads',
  'forum_posts',
  'withdrawals',
  'customers',
  'expenses',
  'attendance',
  'employee_attendance',
  'cash_advances',
  'kasbon',
  'commissions',
  'employee_commissions',
  'service_status_history',
  'notifications',
  'whatsapp_logs'
];

const getSupabaseAdmin = () => {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const authenticateTenant = (req, res) => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    res.status(503).json({ error: 'JWT_SECRET belum dikonfigurasi di server.' });
    return null;
  }

  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Sesi toko tidak ditemukan. Silakan login ulang.' });
    return null;
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload?.role !== 'tenant' || !payload?.code) {
      res.status(403).json({ error: 'Token bukan sesi Admin Toko yang valid.' });
      return null;
    }
    return payload;
  } catch {
    res.status(401).json({ error: 'Sesi toko tidak valid atau sudah berakhir. Silakan login ulang.' });
    return null;
  }
};

const pinMatches = async (inputPin, storedPin) => {
  const input = String(inputPin || '');
  const stored = String(storedPin || '');
  if (!stored) return input === '';
  if (/^\$2[aby]\$/.test(stored)) {
    try {
      return await bcrypt.compare(input, stored);
    } catch {
      return false;
    }
  }
  return input === stored;
};

const isMissingTableError = (error) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' || message.includes('could not find the table') || message.includes('does not exist');
};

const moveTenantRelations = async (supabase, oldCode, newCode) => {
  const movedTables = [];

  for (const table of RELATED_TENANT_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ tenant_code: newCode })
      .eq('tenant_code', oldCode);

    if (error) {
      if (isMissingTableError(error)) continue;
      const err = new Error(`Gagal memindahkan relasi tabel ${table}: ${error.message}`);
      err.movedTables = movedTables;
      throw err;
    }
    movedTables.push(table);
  }

  return movedTables;
};

const rollbackTenantRelations = async (supabase, tables, fromCode, toCode) => {
  for (const table of [...tables].reverse()) {
    try {
      await supabase
        .from(table)
        .update({ tenant_code: toCode })
        .eq('tenant_code', fromCode);
    } catch {
      // Best-effort rollback. Error utama tetap dikembalikan ke client.
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const session = authenticateTenant(req, res);
  if (!session) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase service role belum dikonfigurasi di server.' });
  }

  const oldCode = String(session.code || '').trim().toUpperCase();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const newCode = String(body.newCode || oldCode).trim().toUpperCase();
  const newPin = String(body.newPin || '').trim();
  const currentPin = String(body.currentPin || '').trim();

  if (!currentPin) {
    return res.status(400).json({ error: 'PIN / Password saat ini wajib diisi untuk verifikasi keamanan.' });
  }
  if (!CODE_REGEX.test(newCode)) {
    return res.status(400).json({ error: 'Kode Toko hanya boleh berisi huruf kapital, angka, strip (-), dan underscore (_), 3-32 karakter.' });
  }
  if (newPin && !PIN_REGEX.test(newPin)) {
    return res.status(400).json({ error: 'PIN / Password baru harus berupa 4-12 digit angka.' });
  }

  try {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', oldCode)
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenant) return res.status(404).json({ error: 'Toko tidak ditemukan.' });

    const validCurrentPin = await pinMatches(currentPin, tenant.pin);
    if (!validCurrentPin) {
      return res.status(401).json({ error: 'PIN / Password saat ini tidak valid.' });
    }

    const nextPin = newPin ? await bcrypt.hash(newPin, 10) : tenant.pin;

    if (newCode === oldCode) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ pin: nextPin })
        .eq('code', oldCode);
      if (updateError) throw updateError;

      const token = jwt.sign(
        { code: oldCode, role: 'tenant', tier: tenant.tier || 'free' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        message: newPin ? 'PIN / Password toko berhasil diperbarui.' : 'Kredensial toko terverifikasi.',
        token,
        code: oldCode
      });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('tenants')
      .select('code')
      .eq('code', newCode)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return res.status(409).json({ error: 'Kode Toko baru sudah digunakan oleh toko lain.' });
    }

    const clone = { ...tenant, code: newCode, pin: nextPin };
    delete clone.id;
    delete clone.created_at;
    delete clone.updated_at;

    const { error: insertError } = await supabase.from('tenants').insert(clone);
    if (insertError) throw insertError;

    let movedTables = [];
    try {
      movedTables = await moveTenantRelations(supabase, oldCode, newCode);

      const { error: deleteOldError } = await supabase
        .from('tenants')
        .delete()
        .eq('code', oldCode);
      if (deleteOldError) throw deleteOldError;
    } catch (moveError) {
      movedTables = moveError?.movedTables || movedTables;
      await rollbackTenantRelations(supabase, movedTables, newCode, oldCode);
      await supabase.from('tenants').delete().eq('code', newCode);
      throw moveError;
    }

    const token = jwt.sign(
      { code: newCode, role: 'tenant', tier: tenant.tier || 'free' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Kode Toko dan kredensial berhasil diperbarui.',
      token,
      code: newCode
    });
  } catch (error) {
    console.error('tenant/credentials error:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal mengubah kredensial toko.'
    });
  }
}
