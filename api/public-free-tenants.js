const EDGE_BASE = 'https://jgnyjgzwzksvheqhysye.supabase.co/functions/v1/unitpro-secure-api';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  try {
    const upstream = await fetch(`${EDGE_BASE}/public-free-tenants`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const payload = await upstream.json().catch(() => ({ free_tenants: [] }));
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: payload.error || 'Gagal memuat akun Lifetime Free.' });
    }
    return res.status(200).json({
      free_tenants: Array.isArray(payload.free_tenants)
        ? payload.free_tenants.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)
        : []
    });
  } catch (error) {
    console.error('public-free-tenants proxy error:', error);
    return res.status(502).json({ error: 'Backend Lifetime Free tidak dapat dihubungi.' });
  }
}
