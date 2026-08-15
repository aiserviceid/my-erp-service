import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getSupabaseServiceRoleKey, getSupabaseUrl, signServerToken } from '../../server/serverless-auth.mjs';

const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
const PIN_REGEX = /^[0-9]{4,12}$/;
const PHONE_REGEX = /^[0-9]{9,15}$/;

const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

const pinMatches = async (inputPin, storedPin) => {
  const input = String(inputPin || '');
  const stored = String(storedPin || '');
  if (!stored) return false;
  if (/^\$2[aby]\$/.test(stored)) return bcrypt.compare(input, stored).catch(() => false);
  return input === stored;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: 'Supabase service role belum dikonfigurasi di server.' });

  const code = String(req.body?.code || '').trim().toUpperCase();
  const name = String(req.body?.name || '').trim();
  const pin = String(req.body?.pin || '').trim();
  const phone = String(req.body?.phone || '').replace(/\D/g, '');

  if (!CODE_REGEX.test(code)) return res.status(400).json({ error: 'Kode Toko tidak valid.' });
  if (!PIN_REGEX.test(pin)) return res.status(400).json({ error: 'PIN / Password harus berupa 4-12 digit angka.' });
  if (phone && !PHONE_REGEX.test(phone)) return res.status(400).json({ error: 'No. WhatsApp hanya boleh berisi 9-15 digit angka.' });

  try {
    const { data: existing, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;

    if (existing) {
      const valid = await pinMatches(pin, existing.pin);
      if (!valid) return res.status(401).json({ error: 'PIN Salah!' });

      if (existing.pin && !/^\$2[aby]\$/.test(String(existing.pin))) {
        const hashed = await bcrypt.hash(pin, 10);
        await supabase.from('tenants').update({ pin: hashed }).eq('code', code);
      }

      const token = signServerToken({ code, role: 'tenant', tier: existing.tier || 'free' }, '24h');
      return res.status(200).json({
        ...existing,
        token,
        code,
        name: existing.name || code,
        tier: existing.tier || 'free'
      });
    }

    if (!name) return res.status(404).json({ error: 'Kode Toko tidak terdaftar. Silakan daftar terlebih dahulu.' });

    const now = Date.now();
    const trialEndsAt = now + (30 * 24 * 60 * 60 * 1000);
    const settings = {
      theme: 'laptop',
      storeName: name,
      store_wa: phone,
      ads: [],
      trial_started_at: now,
      trial_ends_at: trialEndsAt,
      active_until: trialEndsAt,
      subscription_status: 'trial'
    };
    const hashedPin = await bcrypt.hash(pin, 10);
    const record = {
      code,
      name,
      tier: 'free',
      settings,
      pin: hashedPin,
      phone
    };

    const { data: created, error: insertError } = await supabase
      .from('tenants')
      .insert(record)
      .select('*')
      .single();
    if (insertError) throw insertError;

    const token = signServerToken({ code, role: 'tenant', tier: 'free' }, '24h');
    return res.status(201).json({ ...created, token });
  } catch (error) {
    console.error('tenant/login serverless error:', error);
    return res.status(500).json({ error: error?.message || 'Gagal login toko.' });
  }
}
