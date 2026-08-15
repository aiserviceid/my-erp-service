import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const LEGACY_DEV_SECRET = 'dev_only_local_testing_secret_key_2026';

export const sha256Hex = (value = '') => crypto
  .createHash('sha256')
  .update(String(value))
  .digest('hex');

export const getSupabaseServiceRoleKey = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
export const getSupabaseUrl = () => String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();

export const resolveServerAuthSecret = () => {
  const explicit = String(process.env.JWT_SECRET || '').trim();
  if (explicit) return explicit;

  const serviceRole = getSupabaseServiceRoleKey();
  if (serviceRole) return sha256Hex(`unitpro-server-auth-v2:${serviceRole}`);

  const adminPassword = String(process.env.SUPER_ADMIN_PASSWORD || '').trim();
  if (adminPassword) return sha256Hex(`unitpro-server-auth-v2:${adminPassword}`);

  return '';
};

export const getBearerToken = (req) => {
  const header = String(req?.headers?.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

export const signServerToken = (payload, expiresIn = '8h') => {
  const secret = resolveServerAuthSecret();
  if (!secret) throw new Error('Konfigurasi autentikasi server belum tersedia.');
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyServerToken = (token) => {
  const secret = resolveServerAuthSecret();
  if (!secret) throw new Error('Konfigurasi autentikasi server belum tersedia.');
  return jwt.verify(String(token || ''), secret);
};

export const decodeTenantCodeFromToken = (token) => {
  const raw = String(token || '').trim();
  if (!raw) return '';
  if (raw.startsWith('dev_token_')) return raw.slice('dev_token_'.length).trim().toUpperCase();
  try {
    const payload = jwt.decode(raw);
    return String(payload?.code || payload?.tenant || '').trim().toUpperCase();
  } catch {
    return '';
  }
};

export const timingSafeTextEqual = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const decryptServerSecretCompat = (value = '') => {
  const text = String(value || '');
  if (!text) return '';
  if (!text.startsWith('enc:v1:')) return text;

  const candidates = [resolveServerAuthSecret(), LEGACY_DEV_SECRET]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  for (const candidate of [...new Set(candidates)]) {
    try {
      const [, , ivB64, tagB64, ciphertextB64] = text.split(':');
      const key = crypto.createHash('sha256').update(candidate).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextB64, 'base64')),
        decipher.final()
      ]).toString('utf8');
    } catch {
      // Coba kandidat kunci berikutnya.
    }
  }

  return '';
};

export const encryptServerSecret = (value = '') => {
  if (!value) return '';
  const secret = resolveServerAuthSecret();
  if (!secret) throw new Error('Konfigurasi autentikasi server belum tersedia.');
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
};
