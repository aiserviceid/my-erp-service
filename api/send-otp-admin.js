import {
  generateOtp,
  getSuperAdmin2FASettings,
  saveAdminOtp,
  sendFonnteMessage,
  verifySuperAdminPassword
} from '../server/superadmin-serverless.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const password = String(req.body?.password || '');
  const valid = await verifySuperAdminPassword(password);
  if (!valid) return res.status(401).json({ error: 'Password tidak valid.' });

  try {
    const settings = await getSuperAdmin2FASettings();
    if (!settings.enabled) {
      return res.status(200).json({ two_factor_required: false });
    }
    if (!/^[0-9]{9,15}$/.test(settings.phone)) {
      return res.status(500).json({ error: 'Nomor WhatsApp 2FA belum valid.' });
    }

    const otp = generateOtp();
    await saveAdminOtp(otp);

    const message = `🚨 *KEAMANAN SUPER ADMIN UNITPRO*\n\nKode verifikasi 2-Factor Authentication (2FA) Anda adalah: *${otp}*.\n\nKode ini hanya berlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun.`;
    await sendFonnteMessage({ target: settings.phone, message });

    return res.status(200).json({
      two_factor_required: true,
      phone: settings.phone
    });
  } catch (error) {
    console.error('send-otp-admin error:', error);
    return res.status(502).json({
      error: error?.message || 'Gagal mengirim kode verifikasi WhatsApp.'
    });
  }
}
