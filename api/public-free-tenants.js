import { getConfigValue, getSupabaseAdmin } from '../server/superadmin-serverless.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(200).json({ free_tenants: ['AISERVICE'] });
  }

  try {
    const values = await Promise.all([
      getConfigValue(supabase, 'super_admin_free_tenant_1').catch(() => null),
      getConfigValue(supabase, 'super_admin_free_tenant_2').catch(() => null),
      getConfigValue(supabase, 'super_admin_free_tenant_3').catch(() => null)
    ]);

    const freeTenants = values
      .map((value, index) => String(value || (index === 0 ? 'AISERVICE' : '')).trim().toUpperCase())
      .filter(Boolean);

    return res.status(200).json({ free_tenants: [...new Set(freeTenants)] });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Gagal memuat akun Lifetime Free.' });
  }
}
