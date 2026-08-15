import { getSuperAdmin2FASettings, verifySuperAdminPassword } from '../server/superadmin-serverless.mjs';
import { signServerToken } from '../server/serverless-auth.mjs';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map();

const attemptKey = (req) => String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const key = attemptKey(req);
  const current = attempts.get(key) || { count: 0, lockedUntil: 0 };
  if (current.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.' });
  }

  const password = String(req.body?.password || '');
  const valid = await verifySuperAdminPassword(password);
  if (!valid) {
    const count = current.count + 1;
    attempts.set(key, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0
    });
    return res.status(401).json({ valid: false, error: 'Password tidak valid.' });
  }

  attempts.delete(key);

  try {
    const twoFactor = await getSuperAdmin2FASettings();
    if (twoFactor.enabled) {
      return res.status(200).json({
        valid: true,
        two_factor_required: true,
        token: null
      });
    }

    const token = signServerToken({ role: 'super_admin' }, '8h');
    return res.status(200).json({ valid: true, two_factor_required: false, token });
  } catch (error) {
    return res.status(503).json({ error: error?.message || 'Layanan autentikasi Super Admin belum tersedia.' });
  }
}
