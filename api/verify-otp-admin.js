import {
  getSuperAdmin2FASettings,
  verifyAndConsumeAdminOtp,
  verifySuperAdminPassword
} from '../server/superadmin-serverless.mjs';
import { signServerToken } from '../server/serverless-auth.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const password = String(req.body?.password || '');
  const otp = String(req.body?.otp || '').trim();
  const validPassword = await verifySuperAdminPassword(password);
  if (!validPassword) return res.status(401).json({ error: 'Password tidak valid.' });

  try {
    const twoFactor = await getSuperAdmin2FASettings();
    if (!twoFactor.enabled) {
      const token = signServerToken({ role: 'super_admin' }, '8h');
      return res.status(200).json({ valid: true, token });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Kode verifikasi harus 6 digit.' });
    }

    const verification = await verifyAndConsumeAdminOtp(otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || 'Kode verifikasi tidak valid.' });
    }

    const token = signServerToken({ role: 'super_admin' }, '8h');
    return res.status(200).json({ valid: true, token });
  } catch (error) {
    console.error('verify-otp-admin error:', error);
    return res.status(500).json({ error: error?.message || 'Gagal memverifikasi kode WhatsApp.' });
  }
}
