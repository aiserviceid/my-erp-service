import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { decodeTenantCodeFromToken, getBearerToken } from '../../server/serverless-auth.mjs';

const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
const PIN_REGEX = /^[0-9]{4,12}$/;
const ATTEMPT_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;
const credentialAttempts = new Map();

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

const isMissingRelationError = (error) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return [
    '42P01', // table missing
    '42703', // column missing
    'PGRST204',
    'PGRST205'
  ].includes(code)
    || message.includes('could not find the table')
    || message.includes('could not find the')
    || message.includes('does not exist');
};

const moveTenantRelations = async (supabase, oldCode, newCode) => {
  const movedTables = [];

  for (const table of RELATED_TENANT_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ tenant_code: newCode })
      .eq('tenant_code', oldCode);

    if (error) {
      if (isMissingRelationError(error)) continue;
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

const getAttemptKey = (req, tenantCode) => {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.socket?.remoteAddress || 'unknown');
  return `${ip}:${tenantCode || 'unknown'}`;
};

const checkAttemptLock = (key) => {
  const state = credentialAttempts.get(key);
  if (!state) return 0;
  if (state.lockedUntil > Date.now()) return state.lockedUntil - Date.now();
  if (state.lockedUntil) credentialAttempts.delete(key);
  return 0;
};

const registerFailure = (key) => {
  const current = credentialAttempts.get(key) || { count: 0, lockedUntil: 0 };
  const count = current.count + 1;
  credentialAttempts.set(key, {
    count,
    lockedUntil: count >= ATTEMPT_LIMIT ? Date.now() + LOCK_MS : 0
  });
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase service role belum dikonfigurasi di server.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const requestedNewCode = String(body.newCode || '').trim().toUpperCase();
  const newPin = String(body.newPin || '').trim();
  const currentPin = String(body.currentPin || '').trim();
  const token = getBearerToken(req);
  let oldCode = decodeTenantCodeFromToken(token);

  if (!currentPin) {
    return res.status(400).json({ error: 'PIN / Password saat ini wajib diisi untuk verifikasi keamanan.' });
  }
  if (requestedNewCode && !CODE_REGEX.test(requestedNewCode)) {
    return res.status(400).json({ error: 'Kode Toko hanya boleh berisi huruf kapital, angka, strip (-), dan underscore (_), 3-32 karakter.' });
  }
  if (newPin && !PIN_REGEX.test(newPin)) {
    return res.status(400).json({ error: 'PIN / Password baru harus berupa 4-12 digit angka.' });
  }

  try {
    let tenant = null;

    if (oldCode) {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', oldCode)
        .maybeSingle();
      if (error) throw error;
      tenant = data || null;
    }

    // Token lama bisa menyimpan kode toko sebelum perubahan. Untuk kasus itu,
    // kode pada form boleh dipakai sebagai kandidat setelah PIN tetap diverifikasi.
    if (!tenant && requestedNewCode) {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', requestedNewCode)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        tenant = data;
        oldCode = String(data.code).trim().toUpperCase();
      }
    }

    if (!tenant || !oldCode) {
      return res.status(401).json({ error: 'Sesi toko tidak dapat dikenali. Silakan login ulang lalu coba lagi.' });
    }

    const attemptKey = getAttemptKey(req, oldCode);
    const lockedFor = checkAttemptLock(attemptKey);
    if (lockedFor > 0) {
      return res.status(429).json({ error: `Terlalu banyak percobaan PIN salah. Coba lagi sekitar ${Math.ceil(lockedFor / 60000)} menit.` });
    }

    const validCurrentPin = await pinMatches(currentPin, tenant.pin);
    if (!validCurrentPin) {
      registerFailure(attemptKey);
      return res.status(401).json({ error: 'PIN / Password saat ini tidak valid.' });
    }
    credentialAttempts.delete(attemptKey);

    const newCode = requestedNewCode || oldCode;
    const nextPin = newPin ? await bcrypt.hash(newPin, 10) : tenant.pin;

    if (newCode === oldCode) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ pin: nextPin })
        .eq('code', oldCode);
      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: newPin ? 'PIN / Password toko berhasil diperbarui.' : 'Kredensial toko terverifikasi.',
        token: null,
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

    return res.status(200).json({
      success: true,
      message: 'Kode Toko dan kredensial berhasil diperbarui.',
      token: null,
      code: newCode
    });
  } catch (error) {
    console.error('tenant/credentials error:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal mengubah kredensial toko.'
    });
  }
}
