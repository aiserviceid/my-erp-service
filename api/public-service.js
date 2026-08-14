const { createClient } = require('@supabase/supabase-js');

const cleanResi = (value = '') => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 50);
const cleanTenantCode = (value = '') => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 60);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const resi = cleanResi(req.query?.resi);
  const tenantCode = cleanTenantCode(req.query?.tenant_code || req.query?.tenant);
  if (!resi) return res.status(400).json({ error: 'Nomor nota tidak valid.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRole) {
    return res.status(503).json({ error: 'Layanan nota publik belum tersedia.' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    let query = supabase
      .from('services')
      .select('resi,tenant_code,customer_name,device_name,issue,status,jasa_fee,part_fee,technician_id,created_at,updated_at')
      .eq('resi', resi);
    if (tenantCode) query = query.eq('tenant_code', tenantCode);

    const { data: services, error } = await query.limit(2);
    if (error) throw error;
    if (!services || services.length === 0) return res.status(404).json({ error: 'Nota tidak ditemukan.' });
    if (!tenantCode && services.length > 1) return res.status(409).json({ error: 'Nomor nota tidak unik. Buka nota dari aplikasi UnitPro.' });

    const service = services[0];
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('code,name,settings,tier')
      .eq('code', service.tenant_code)
      .maybeSingle();
    if (tenantError) throw tenantError;

    return res.status(200).json({ service, tenant: tenant || null });
  } catch (error) {
    console.error('public-service error:', error);
    return res.status(500).json({ error: 'Nota tidak dapat dimuat saat ini.' });
  }
};
