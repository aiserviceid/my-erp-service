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

    // SuperAdmin.jsx versi saat ini masih memakai operator `||` untuk default
    // slot Lifetime Free. Nilai kosong yang memang sengaja disimpan akan dianggap
    // false lalu berubah lagi menjadi contoh lama. Satu spasi bersifat truthy,
    // tampil kosong di input, dan akan kembali di-trim menjadi '' saat disimpan.
    if (req.method === 'GET' && upstream.ok && payload && typeof payload === 'object') {
      for (const key of [
        'super_admin_free_tenant_1',
        'super_admin_free_tenant_2',
        'super_admin_free_tenant_3'
      ]) {
        if (payload[key] === '') payload[key] = ' ';
      }
    }

    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('admin/settings proxy error:', error);
    return res.status(502).json({ error: 'Backend keamanan Supabase tidak dapat dihubungi.' });
  }
}
