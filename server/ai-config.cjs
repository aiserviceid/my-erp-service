// Shared persistence for Vercel and Express. Never use an anon/publishable key here.
const crypto = require('node:crypto');
const DEFAULT_MODEL = 'gemini-3.8-flash';
const CONFIG_KEY = 'unitpro_ai_config';
const MODEL_OPTIONS = [
  { id: DEFAULT_MODEL, label: 'Gemini 3.8 Flash — rekomendasi' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — cepat & hemat' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — akun lama yang masih memiliki akses' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — akun lama yang masih memiliki akses' },
];
class AiConfigError extends Error {
  constructor(message, status = 500, code = 'AI_CONFIG_ERROR') {
    super(message); this.status = status; this.code = code;
  }
}
function normalizeModel(value) {
  const model = String(value || '').trim().replace(/^models\//, '');
  if (!model || /^gemini-(1\.5|2\.0)(-|$)/.test(model)) return DEFAULT_MODEL;
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw new AiConfigError('Nama model Gemini tidak valid.', 400, 'INVALID_MODEL');
  return model;
}
function authSecret() {
  const env = process.env;
  if (env.JWT_SECRET?.trim()) return env.JWT_SECRET.trim();
  const base = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPER_ADMIN_PASSWORD?.trim();
  return base ? crypto.createHash('sha256').update(`unitpro-server-auth-v2:${base}`).digest('hex') : '';
}
function encryptSecret(value) {
  if (!value) return '';
  const secret = authSecret();
  if (!secret) throw new AiConfigError('JWT_SECRET server belum dikonfigurasi.', 503, 'SERVER_CONFIG_MISSING');
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}
function decryptSecret(value) {
  if (!value) return '';
  if (!String(value).startsWith('enc:v1:')) return String(value);
  // Read old encrypted records, but never write using the old development key.
  for (const secret of [...new Set([authSecret(), 'dev_only_local_testing_secret_key_2026'])].filter(Boolean)) {
    try {
      const [, , iv, tag, data] = value.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret).digest(), Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch { /* Try the previous encryption key. */ }
  }
  throw new AiConfigError('API key tersimpan tidak dapat dibuka. Pulihkan JWT_SECRET sebelumnya atau masukkan ulang API key.', 503, 'KEY_DECRYPT_FAILED');
}
function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AiConfigError('Server memerlukan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY. Kunci publik tidak dapat menyimpan konfigurasi AI.', 503, 'SERVER_CONFIG_MISSING');
  return require('@supabase/supabase-js').createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function databaseError(error) {
  if (['42P01', 'PGRST205'].includes(error?.code)) return new AiConfigError('Tabel app_config belum tersedia. Terapkan migrasi 20261003_ai_config.sql di Supabase.', 503, 'CONFIG_TABLE_MISSING');
  if (['42501', 'PGRST301'].includes(error?.code)) return new AiConfigError('Akses konfigurasi ditolak. Periksa SUPABASE_SERVICE_ROLE_KEY server; jangan membuka akses tabel untuk anon.', 503, 'CONFIG_ACCESS_DENIED');
  return new AiConfigError('Konfigurasi AI gagal diakses di database. Periksa koneksi dan log server.', 503, 'CONFIG_DATABASE_ERROR');
}
async function readStored(client) {
  const { data, error } = await client.from('app_config').select('value').eq('key', CONFIG_KEY).maybeSingle();
  if (error) throw databaseError(error);
  if (!data?.value) return {};
  try {
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new AiConfigError('Konfigurasi AI tersimpan rusak. Pulihkan record unitpro_ai_config sebelum menyimpan.', 503, 'CONFIG_INVALID'); }
}
function privateConfig(stored) {
  const key = stored.api_key_enc ? decryptSecret(stored.api_key_enc) : String(stored.api_key || '');
  const envKey = process.env.GEMINI_API_KEY || '';
  return {
    enabled: stored.enabled ?? Boolean(key || envKey),
    model: normalizeModel(stored.model || process.env.GEMINI_MODEL),
    apiKey: key || envKey,
    customInstruction: String(stored.custom_instruction || ''),
    source: key ? 'super_admin' : envKey ? 'environment' : 'none',
  };
}
async function readConfig(client = getAdminClient()) { return privateConfig(await readStored(client)); }
function publicConfig(config) {
  return {
    enabled: Boolean(config.enabled), model: normalizeModel(config.model),
    has_api_key: Boolean(config.apiKey), masked_key: config.apiKey ? `••••••••${config.apiKey.slice(-4)}` : '',
    custom_instruction: config.customInstruction, source: config.source,
    built_in_prompt_locked: true, available_models: MODEL_OPTIONS,
  };
}
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AiConfigError('Body harus berupa objek JSON.', 400, 'INVALID_BODY');
  for (const field of ['enabled', 'clear_api_key']) if (body[field] !== undefined && typeof body[field] !== 'boolean') throw new AiConfigError(`${field} harus boolean.`, 400, 'INVALID_BODY');
  for (const field of ['api_key', 'model', 'custom_instruction']) if (body[field] !== undefined && typeof body[field] !== 'string') throw new AiConfigError(`${field} harus teks.`, 400, 'INVALID_BODY');
  if ((body.api_key || '').length > 512) throw new AiConfigError('API key terlalu panjang.', 400, 'INVALID_BODY');
  if ((body.api_key || '').startsWith('enc:v1:')) throw new AiConfigError('Masukkan API key asli, bukan ciphertext.', 400, 'INVALID_BODY');
  return body;
}
async function saveConfig(body, client = getAdminClient()) {
  validateBody(body);
  const stored = await readStored(client); // Do not overwrite records when a read fails.
  const newKey = String(body.api_key || '').trim();
  let encrypted = stored.api_key_enc || '';
  if (body.clear_api_key) encrypted = '';
  else if (newKey) encrypted = encryptSecret(newKey);
  else if (encrypted) encrypted = encryptSecret(decryptSecret(encrypted)); // Upgrade legacy encryption without changing the key.
  else if (stored.api_key) encrypted = encryptSecret(String(stored.api_key)); // Migrate plaintext on save.
  const next = {
    enabled: body.enabled ?? stored.enabled ?? Boolean(encrypted || process.env.GEMINI_API_KEY),
    model: normalizeModel(body.model || stored.model || process.env.GEMINI_MODEL),
    api_key_enc: encrypted,
    custom_instruction: String(body.custom_instruction ?? stored.custom_instruction ?? '').slice(0, 8000),
    updated_at: new Date().toISOString(),
  };
  const result = privateConfig(next); // Fail before write if an existing key cannot be decrypted.
  const { error } = await client.from('app_config').upsert({ key: CONFIG_KEY, value: JSON.stringify(next) }, { onConflict: 'key' });
  if (error) throw databaseError(error);
  return result;
}
async function callGeminiText({ apiKey, model, systemInstruction, contents, maxOutputTokens = 1200 }, fetchImpl = fetch) {
  if (!apiKey) throw new AiConfigError('Gemini API Key belum diisi atau disimpan.', 400, 'API_KEY_MISSING');
  const selected = normalizeModel(model);
  let response;
  try {
    response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selected)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}), contents, generationConfig: { maxOutputTokens } }),
    });
  } catch { throw new AiConfigError('Gemini tidak dapat dihubungi atau melewati batas waktu. Coba kembali.', 502, 'GEMINI_NETWORK_ERROR'); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = response.status === 404 ? `Model ${selected} tidak tersedia untuk API key ini. Pilih model lain yang memiliki akses.`
      : response.status === 429 ? 'Kuota Gemini habis atau terlalu banyak permintaan. Periksa kuota Google AI Studio.'
      : [400, 401, 403].includes(response.status) ? 'API key ditolak atau tidak memiliki akses Gemini. Periksa key dan pembatasannya di Google AI Studio.'
      : 'Layanan Gemini sedang gagal. Coba kembali.';
    throw new AiConfigError(reason, 502, `GEMINI_HTTP_${response.status}`);
  }
  const text = (payload.candidates || []).flatMap(c => c?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('\n').trim();
  if (!text) throw new AiConfigError('Gemini tidak mengembalikan teks. Periksa model atau batas token.', 502, 'GEMINI_EMPTY_RESPONSE');
  return text;
}
async function testConfig(body, client = getAdminClient(), fetchImpl = fetch) {
  validateBody(body);
  const current = await readConfig(client);
  const model = normalizeModel(body.model || current.model);
  const text = await callGeminiText({ apiKey: body.api_key?.trim() || current.apiKey, model,
    contents: [{ role: 'user', parts: [{ text: 'Balas persis: UNITPRO_GEMINI_OK' }] }], maxOutputTokens: 256 }, fetchImpl);
  return { success: /\bUNITPRO_GEMINI_OK\b/.test(text), model, response: /\bUNITPRO_GEMINI_OK\b/.test(text) ? 'UNITPRO_GEMINI_OK' : 'Respons tes tidak sesuai.' };
}
module.exports = { DEFAULT_MODEL, MODEL_OPTIONS, AiConfigError, normalizeModel, getAdminClient, readConfig, saveConfig, publicConfig, testConfig, callGeminiText, authSecret };
