import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const publicUser = u => ({ id: u.id, name: u.name, role: u.role, phone: u.phone || '', tenant_code: u.tenant_code });
const hashPattern = /^\$2[aby]\$(\d{2})\$/;
export function employeeClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing database configuration');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function createEmployeeLoginHandler({ clientFactory = employeeClient, secret = () => process.env.JWT_SECRET, now = Date.now, maxAttempts = 5, windowMs = 900000 } = {}) {
  // Defense in depth per worker only; deployment needs a shared edge/WAF rate limiter.
  const attempts = new Map();
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method tidak diizinkan.' }); }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const code = typeof body?.tenant_code === 'string' ? body.tenant_code.trim().toUpperCase() : '';
    const pin = typeof body?.pin === 'string' ? body.pin : '';
    if (!/^[A-Z0-9_-]{1,60}$/.test(code) || !/^[0-9]{4,12}$/.test(pin) || code === 'DEMO-STORE') return res.status(400).json({ error: 'Kode toko dan PIN 4–12 digit wajib valid.' });
    if (!secret()) return res.status(503).json({ error: 'Konfigurasi autentikasi pegawai belum tersedia.' });
    const peer = process.env.VERCEL === '1' ? String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() : String(req.socket?.remoteAddress || req.ip || 'unknown');
    const key = crypto.createHash('sha256').update(code + ':' + peer).digest('hex');
    const stamp = now();
    for (const [k, v] of attempts) if (v.until <= stamp) attempts.delete(k);
    if (attempts.size >= 10000 && !attempts.has(key)) return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
    const entry = attempts.get(key) || { count: 0, until: stamp + windowMs };
    if (entry.count >= maxAttempts) { res.setHeader('Retry-After', String(Math.ceil((entry.until - stamp) / 1000))); return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }); }
    entry.count++; attempts.set(key, entry);
    try {
      const client = clientFactory();
      const { data: users, error } = await client.from('users').select('id,name,role,pin,phone,tenant_code').eq('tenant_code', code).limit(201);
      if (error || !Array.isArray(users) || users.length > 200) throw new Error('Database unavailable');
      const matches = [];
      for (const user of users) {
        if (!['TEKNISI', 'KASIR'].includes(user.role) || user.tenant_code !== code) continue;
        const stored = String(user.pin || '');
        const matchHash = stored.match(hashPattern);
        let matchesPin = false;
        if (matchHash && Number(matchHash[1]) >= 4 && Number(matchHash[1]) <= 14) matchesPin = await bcrypt.compare(pin, stored);
        else if (/^[0-9]{4,12}$/.test(stored)) {
          const a = Buffer.from(pin), b = Buffer.from(stored);
          matchesPin = a.length === b.length && crypto.timingSafeEqual(a, b);
        }
        if (matchesPin) matches.push({ user, legacy: !matchHash });
      }
      // Duplicate PINs are ambiguous; never arbitrarily grant one employee's role.
      if (matches.length !== 1) return res.status(401).json({ error: 'PIN atau kode toko salah, atau PIN pegawai tidak unik.' });
      const { user, legacy } = matches[0];
      if (legacy) {
        const hash = await bcrypt.hash(pin, 10);
        const { data, error: migrationError } = await client.from('users').update({ pin: hash }).eq('id', user.id).eq('tenant_code', code).eq('pin', user.pin).select('id').maybeSingle();
        if (migrationError || !data) throw new Error('PIN migration failed');
      }
      const token = jwt.sign({ id: user.id, role: user.role, tenant: code, code }, secret(), { algorithm: 'HS256', expiresIn: '8h' });
      attempts.delete(key);
      return res.status(200).json({ user: publicUser(user), token });
    } catch {
      return res.status(503).json({ error: 'Login pegawai belum tersedia. Periksa konfigurasi server dan koneksi database.' });
    }
  };
}
