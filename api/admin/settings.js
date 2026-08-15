const EDGE_BASE = 'https://jgnyjgzwzksvheqhysye.supabase.co/functions/v1/unitpro-secure-api';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;

    const upstream = await fetch(`${EDGE_BASE}/admin/settings`, {
      method: req.method,
      headers,
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body || {}) } : {})
    });
    const payload = await upstream.json().catch(() => ({ error: 'Respons backend tidak valid.' }));
    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('admin/settings proxy error:', error);
    return res.status(502).json({ error: 'Backend keamanan Supabase tidak dapat dihubungi.' });
  }
}
