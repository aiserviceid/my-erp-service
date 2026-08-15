import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://jgnyjgzwzksvheqhysye.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_q9maq-FDzXKyyEl27EQXUw_SbuEagqv';

const cleanResi = (value = '') => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 50);
const cleanTenantCode = (value = '') => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 60);

const getCandidates = () => {
  const viteUrl = String(process.env.VITE_SUPABASE_URL || '').trim();
  const serverUrl = String(process.env.SUPABASE_URL || '').trim();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const candidates = [];
  const seen = new Set();

  const add = (url, key) => {
    if (!url || !key) return;
    const signature = `${url}|${key.slice(0, 24)}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    candidates.push({ url, key });
  };

  // Utamakan project yang dipakai bundle Vite agar server dan aplikasi membaca database yang sama.
  add(viteUrl, serviceRole);
  add(serverUrl, serviceRole);
  add(viteUrl, anonKey);
  add(serverUrl, anonKey);
  add(FALLBACK_SUPABASE_URL, serviceRole);
  add(FALLBACK_SUPABASE_URL, anonKey || FALLBACK_ANON_KEY);

  return candidates;
};

const findService = async ({ url, key }, resi, tenantCode) => {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = supabase
    .from('services')
    .select('resi,tenant_code,customer_name,device_name,issue,status,jasa_fee,part_fee,technician_id,created_at,updated_at')
    .eq('resi', resi);

  if (tenantCode) query = query.eq('tenant_code', tenantCode);

  const { data: services, error } = await query.limit(2);
  if (error) throw error;
  if (!services || services.length === 0) return null;
  if (!tenantCode && services.length > 1) {
    const ambiguityError = new Error('Nomor nota tidak unik. Buka nota dari aplikasi UnitPro.');
    ambiguityError.code = 'AMBIGUOUS_RESI';
    throw ambiguityError;
  }

  const service = services[0];
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('code,name,settings,tier')
    .eq('code', service.tenant_code)
    .maybeSingle();

  if (tenantError) {
    console.warn('public-service tenant lookup warning:', tenantError.message || tenantError);
  }

  return { service, tenant: tenant || null };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const resi = cleanResi(req.query?.resi);
  const tenantCode = cleanTenantCode(req.query?.tenant_code || req.query?.tenant);
  if (!resi) return res.status(400).json({ error: 'Nomor nota tidak valid.' });

  const candidates = getCandidates();
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const result = await findService(candidate, resi, tenantCode);
      if (result?.service) return res.status(200).json(result);
    } catch (error) {
      if (error?.code === 'AMBIGUOUS_RESI') return res.status(409).json({ error: error.message });
      lastError = error;
      console.warn('public-service candidate warning:', error?.message || error);
    }
  }

  if (lastError && candidates.length === 0) {
    return res.status(503).json({ error: 'Layanan nota publik belum tersedia.' });
  }

  return res.status(404).json({ error: 'Nota tidak ditemukan.' });
}
