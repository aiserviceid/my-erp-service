import { createClient } from '@supabase/supabase-js';
import { getCandidates } from './public-service.js';
import { publicTenant } from '../src/utils/publicTenant.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method tidak diizinkan.' }); }
  const code = String(req.query?.tenant_code || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,60}$/.test(code)) return res.status(400).json({ error: 'Kode toko tidak valid.' });
  let completed = 0;
  for (const candidate of getCandidates()) {
    try {
      const client = createClient(candidate.url, candidate.key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.from('tenants').select('code,name,settings,tier').eq('code', code).maybeSingle();
      if (error) continue;
      completed++;
      if (data) return res.status(200).json(publicTenant(data));
    } catch { /* Try the next configured candidate, never return private error details. */ }
  }
  return res.status(completed ? 404 : 503).json({ error: completed ? 'Toko tidak ditemukan.' : 'Metadata publik toko belum tersedia.' });
}
