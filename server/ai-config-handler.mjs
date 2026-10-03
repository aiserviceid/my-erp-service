import ai from './ai-config.cjs';
import { getBearerToken, resolveServerAuthSecret, verifyServerToken } from './serverless-auth.mjs';

export function createAiConfigHandler({ testOnly = false, verify = verifyServerToken, clientFactory = ai.getAdminClient, test = ai.testConfig } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const allowed = testOnly ? ['POST'] : ['GET', 'PUT', 'POST'];
    if (!allowed.includes(req.method)) {
      res.setHeader('Allow', allowed.join(', '));
      return res.status(405).json({ error: 'Method tidak diizinkan.' });
    }
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Sesi Super Admin tidak ditemukan.' });
    if (!resolveServerAuthSecret()) return res.status(503).json({ error: 'Konfigurasi autentikasi server belum tersedia.', code: 'SERVER_CONFIG_MISSING' });
    let user;
    try { user = verify(token); }
    catch { return res.status(401).json({ error: 'Sesi Super Admin tidak valid atau kedaluwarsa.' }); }
    if (user?.role !== 'super_admin') return res.status(403).json({ error: 'Akses khusus Super Admin diperlukan.' });
    try {
      let body = req.body ?? {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); }
        catch { throw new ai.AiConfigError('Body JSON tidak valid.', 400, 'INVALID_BODY'); }
      }
      const client = clientFactory();
      if (req.method === 'GET') return res.status(200).json(ai.publicConfig(await ai.readConfig(client)));
      if (req.method === 'PUT') return res.status(200).json({ success: true, ...ai.publicConfig(await ai.saveConfig(body, client)) });
      return res.status(200).json(await test(body, client));
    } catch (error) {
      // Only expose controlled errors. Never log bodies, keys or upstream payloads.
      const known = error instanceof ai.AiConfigError;
      return res.status(known ? error.status : 503).json({
        error: known ? error.message : 'Layanan konfigurasi AI tidak dapat diakses. Periksa koneksi dan log server.',
        code: known ? error.code : 'AI_CONFIG_UNAVAILABLE',
      });
    }
  };
}
