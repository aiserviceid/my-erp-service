import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  decryptServerSecretCompat,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  sha256Hex,
  timingSafeTextEqual
} from './serverless-auth.mjs';

const WHATSAPP_CONFIG_KEY = 'whatsapp_system_config';

export const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export const getConfigValue = async (supabase, key) => {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export const verifySuperAdminPassword = async (password) => {
  const input = String(password || '');
  if (!input) return false;

  const envPassword = String(process.env.SUPER_ADMIN_PASSWORD || '');
  if (envPassword && timingSafeTextEqual(input, envPassword)) return true;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc('verify_super_admin', {
      input_password: input
    });
    if (!error && data === true) return true;
  } catch {
    // Fallback ke hash app_config di bawah.
  }

  try {
    const hash = await getConfigValue(supabase, 'super_admin_hash');
    if (!hash) return false;
    return timingSafeTextEqual(sha256Hex(input), String(hash).trim().toLowerCase());
  } catch {
    return false;
  }
};

export const getSuperAdmin2FASettings = async () => {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase service role belum dikonfigurasi di server.');

  const [phone, enabled] = await Promise.all([
    getConfigValue(supabase, 'super_admin_2fa_phone'),
    getConfigValue(supabase, 'super_admin_2fa_enabled')
  ]);

  return {
    phone: String(phone || '085382535050').replace(/\D/g, ''),
    enabled: enabled == null ? true : String(enabled) === 'true'
  };
};

export const saveAdminOtp = async (otp) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase service role belum dikonfigurasi di server.');
  const otpHash = sha256Hex(String(otp || '').trim());
  const expiry = String(Date.now() + (5 * 60 * 1000));
  const { error } = await supabase.from('app_config').upsert([
    { key: 'super_admin_otp_hash', value: otpHash, updated_at: new Date().toISOString() },
    { key: 'super_admin_otp_expiry', value: expiry, updated_at: new Date().toISOString() }
  ], { onConflict: 'key' });
  if (error) throw error;
};

export const verifyAndConsumeAdminOtp = async (otp) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase service role belum dikonfigurasi di server.');

  const [savedHash, legacyOtp, expiry] = await Promise.all([
    getConfigValue(supabase, 'super_admin_otp_hash').catch(() => null),
    getConfigValue(supabase, 'super_admin_otp').catch(() => null),
    getConfigValue(supabase, 'super_admin_otp_expiry').catch(() => null)
  ]);

  if (!expiry || Date.now() > Number(expiry)) return { valid: false, error: 'Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.' };

  const input = String(otp || '').trim();
  const valid = savedHash
    ? timingSafeTextEqual(sha256Hex(input), savedHash)
    : (legacyOtp ? timingSafeTextEqual(input, legacyOtp) : false);

  if (!valid) return { valid: false, error: 'Kode verifikasi salah.' };

  await supabase
    .from('app_config')
    .delete()
    .in('key', ['super_admin_otp_hash', 'super_admin_otp', 'super_admin_otp_expiry']);

  return { valid: true };
};

const readStoredWhatsappConfig = async () => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};
  const raw = await getConfigValue(supabase, WHATSAPP_CONFIG_KEY).catch(() => null);
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

export const getSystemWhatsappConfig = async () => {
  const stored = await readStoredWhatsappConfig();
  const storedToken = decryptServerSecretCompat(stored?.token || '');
  const envToken = String(process.env.FONNTE_TOKEN || '').trim();
  return {
    provider: 'fonnte',
    enabled: stored?.enabled !== false,
    token: storedToken || envToken,
    source: storedToken ? 'super_admin' : (envToken ? 'environment' : 'none')
  };
};

export const sendFonnteMessage = async ({ target, message }) => {
  const config = await getSystemWhatsappConfig();
  if (config.enabled === false) throw new Error('WhatsApp Gateway sistem sedang dinonaktifkan.');
  if (!config.token) throw new Error('WhatsApp Gateway sistem belum dikonfigurasi.');

  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: config.token },
    body: new URLSearchParams({
      target: String(target || '').replace(/\D/g, ''),
      message: String(message || '')
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    const reason = payload?.reason || payload?.detail || payload?.message || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  return payload;
};

export const generateOtp = () => String(crypto.randomInt(100000, 1000000));
