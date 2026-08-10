const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_local_testing_secret_key_2026';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENV_GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ENV_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || '';
const AI_CONFIG_KEY = 'unitpro_ai_config';
const CHAT_KEY_PREFIX = 'unitpro_ai_chat:';

const DEFAULT_AGENT_SYSTEM_PROMPT = `Anda adalah UnitPro AI Agent, asisten customer service dan marketing khusus toko servis di Indonesia.

GAYA KOMUNIKASI:
- Balas seperti staf customer service toko yang ramah, singkat, natural, hangat, dan profesional.
- Jangan terdengar seperti robot. Jangan mengulang salam di setiap pesan. Hindari paragraf panjang.
- Boleh memakai emoji secukupnya jika sesuai konteks.
- Jangan pernah mengaku sebagai manusia. Jika ditanya, jelaskan bahwa Anda adalah asisten UnitPro yang membantu tim toko.

KEBENARAN DATA:
- Gunakan HANYA data toko, servis, produk/jasa, CRM, dan riwayat percakapan yang diberikan oleh UnitPro.
- DILARANG mengarang status servis, harga, diskon, stok, garansi, estimasi, nama teknisi, atau informasi pelanggan.
- Jika data tidak tersedia atau Anda tidak yakin, pilih human handoff.
- Jangan bocorkan token, API key, konfigurasi internal, catatan privat, atau data pelanggan lain.

PERILAKU CUSTOMER SERVICE:
- Jawab kebutuhan utama pelanggan terlebih dahulu sebelum menawarkan sesuatu.
- Soft-selling hanya jika relevan dengan konteks dan tidak agresif.
- Untuk status servis, gunakan data servis pelanggan berdasarkan nomor WhatsApp.
- Jika ada beberapa servis aktif dan referensinya tidak jelas, tanyakan perangkat atau resi.
- Pertanyaan lanjutan seperti “berapa totalnya?” harus merujuk ke konteks percakapan sebelumnya bila tersedia.

HUMAN HANDOFF WAJIB jika pelanggan marah/komplain berat, meminta refund, meminta negosiasi khusus, sengketa garansi, meminta bicara dengan admin/manusia, data tidak ditemukan, atau tingkat keyakinan rendah.

FORMAT OUTPUT WAJIB JSON VALID TANPA CODE FENCE:
{"action":"reply"|"handoff","message":"teks WhatsApp singkat","reason":"alasan internal singkat"}`;

const DEFAULT_CAMPAIGN_SYSTEM_PROMPT = `Anda adalah UnitPro AI Marketing Copywriter untuk toko servis Indonesia.
Pengguna cukup menjelaskan campaign dengan bahasa natural. Anda yang menentukan gaya bahasa, CTA, dan variabel dinamis yang tepat.

ATURAN:
- Buat SATU pesan WhatsApp siap kirim, ramah, singkat, natural, dan tidak spammy.
- Semua pesan tetap dapat diedit pengguna setelah dibuat.
- Gunakan placeholder UnitPro secara otomatis jika nilainya berbeda untuk tiap pelanggan.
- Placeholder yang diizinkan hanya: {nama_pelanggan}, {nama_toko}, {resi}, {perangkat}, {biaya}, {link_tracking}, {hari_sejak_terakhir}, {jumlah_transaksi}.
- Jangan meminta pengguna memahami placeholder.
- Jangan mengarang harga, diskon, stok, bonus, garansi, atau tenggat. Jika informasi produk/jasa tersedia pada DATA UNITPRO, Anda boleh memakainya sebagai fakta statis.
- Jika membuat reminder servis, prioritaskan {nama_pelanggan}, {perangkat}, {resi}, {nama_toko}, dan {link_tracking} bila relevan.
- Untuk promo barang/jasa, gunakan data katalog UnitPro yang benar dan CTA yang wajar.
- Jangan keluarkan analisis, judul, JSON, atau code fence. Hanya isi pesan WhatsApp.`;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function parseSettings(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function normalizePhone(value = '') {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireSuperAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Sesi Super Admin tidak ditemukan.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'super_admin') return res.status(403).json({ error: 'Akses Super Admin diperlukan.' });
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesi Super Admin tidak valid atau kedaluwarsa.' });
  }
}

function requireTenant(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Sesi toko tidak ditemukan.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userTenant = String(payload.tenant || payload.code || '').trim().toUpperCase();
    const requestedTenant = String(req.body?.tenant_code || req.params?.tenant || '').trim().toUpperCase();
    if (!userTenant) return res.status(403).json({ error: 'Sesi tidak memiliki akses tenant.' });
    if (requestedTenant && requestedTenant !== userTenant) return res.status(403).json({ error: 'Akses tenant ditolak.' });
    req.user = payload;
    req.tenantCode = requestedTenant || userTenant;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesi toko tidak valid atau kedaluwarsa.' });
  }
}

async function readAppConfig(key) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const { data, error } = await admin.from('app_config').select('value').eq('key', key).maybeSingle();
    if (error) return null;
    return data?.value ?? null;
  } catch {
    return null;
  }
}

async function writeAppConfig(key, value) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase service role belum dikonfigurasi.');
  const { error } = await admin.from('app_config').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(`Penyimpanan app_config gagal: ${error.message}`);
}

function encryptionKey() {
  return crypto.createHash('sha256').update(JWT_SECRET).digest();
}

function encryptSecret(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptSecret(value) {
  if (!value) return '';
  const text = String(value);
  if (!text.startsWith('enc:v1:')) return text;
  const [, , ivB64, tagB64, ciphertextB64] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
}

async function getGlobalAiConfig() {
  const defaults = {
    enabled: Boolean(ENV_GEMINI_API_KEY),
    model: ENV_GEMINI_MODEL,
    apiKey: ENV_GEMINI_API_KEY,
    customInstruction: '',
    source: ENV_GEMINI_API_KEY ? 'environment' : 'none',
  };
  const raw = await readAppConfig(AI_CONFIG_KEY);
  if (!raw) return defaults;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const storedKey = parsed?.api_key_enc ? decryptSecret(parsed.api_key_enc) : '';
    return {
      enabled: parsed?.enabled !== false,
      model: String(parsed?.model || defaults.model),
      apiKey: storedKey || defaults.apiKey,
      customInstruction: String(parsed?.custom_instruction || ''),
      source: storedKey ? 'super_admin' : defaults.source,
    };
  } catch {
    return defaults;
  }
}

async function saveGlobalAiConfig(next = {}) {
  const currentRaw = await readAppConfig(AI_CONFIG_KEY);
  let current = {};
  try { current = currentRaw ? JSON.parse(currentRaw) : {}; } catch { current = {}; }
  const candidateKey = String(next.api_key || '').trim();
  const payload = {
    enabled: next.enabled !== false,
    model: String(next.model || current.model || ENV_GEMINI_MODEL || 'gemini-2.0-flash').trim(),
    api_key_enc: next.clear_api_key ? '' : (candidateKey ? encryptSecret(candidateKey) : (current.api_key_enc || '')),
    custom_instruction: String(next.custom_instruction ?? current.custom_instruction ?? '').slice(0, 8000),
    updated_at: new Date().toISOString(),
  };
  await writeAppConfig(AI_CONFIG_KEY, JSON.stringify(payload));
  return getGlobalAiConfig();
}

function publicAiConfig(config) {
  const key = String(config.apiKey || '');
  return {
    enabled: Boolean(config.enabled),
    model: config.model || 'gemini-2.0-flash',
    has_api_key: Boolean(key),
    masked_key: key ? `••••••••${key.slice(-4)}` : '',
    custom_instruction: config.customInstruction || '',
    source: config.source || 'none',
    built_in_prompt_locked: true,
  };
}

async function callGeminiText({ apiKey, model, systemInstruction, contents, maxOutputTokens = 1200 }) {
  if (!apiKey) throw new Error('Gemini API Key belum dikonfigurasi.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { maxOutputTokens },
      store: false,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  const text = (payload?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();
  if (!text) throw new Error('Gemini tidak mengembalikan teks.');
  return text;
}

async function getTenantRecord(tenantCode) {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from('tenants').select('*').eq('code', tenantCode).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function getTenantGateway(tenantCode) {
  const tenant = await getTenantRecord(tenantCode);
  const settings = parseSettings(tenant?.settings);
  return {
    tenant,
    settings,
    mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
    token: String(settings.fonnte_token || '').trim(),
  };
}

function makeWebhookSecret(tenantCode, token) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${tenantCode}|${token}`).digest('hex').slice(0, 40);
}

function requestOrigin(req) {
  if (PUBLIC_APP_URL) return PUBLIC_APP_URL.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

async function fonnteRequest(path, token, body = null) {
  const response = await fetch(`https://api.fonnte.com/${path}`, {
    method: 'POST',
    headers: { Authorization: token },
    ...(body ? { body: new URLSearchParams(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.reason || payload?.detail || payload?.message || `Fonnte HTTP ${response.status}`);
  }
  return payload;
}

async function sendFonnteReply({ token, target, message, inboxid }) {
  const body = {
    target,
    message,
    typing: 'true',
    duration: '2',
    connectOnly: 'true',
  };
  if (inboxid) body.inboxid = String(inboxid);
  return fonnteRequest('send', token, body);
}

function conversationKey(tenantCode, phone) {
  const hash = crypto.createHash('sha256').update(normalizePhone(phone)).digest('hex').slice(0, 24);
  return `${CHAT_KEY_PREFIX}${tenantCode}:${hash}`;
}

async function getConversationState(tenantCode, phone) {
  const raw = await readAppConfig(conversationKey(tenantCode, phone));
  if (!raw) return { phone: normalizePhone(phone), history: [], human_takeover: false };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      phone: normalizePhone(phone),
      name: parsed.name || '',
      history: Array.isArray(parsed.history) ? parsed.history.slice(-10) : [],
      human_takeover: Boolean(parsed.human_takeover),
      updated_at: parsed.updated_at || null,
    };
  } catch {
    return { phone: normalizePhone(phone), history: [], human_takeover: false };
  }
}

async function saveConversationState(tenantCode, phone, state) {
  try {
    await writeAppConfig(conversationKey(tenantCode, phone), JSON.stringify({
      phone: normalizePhone(phone),
      name: state.name || '',
      history: Array.isArray(state.history) ? state.history.slice(-10) : [],
      human_takeover: Boolean(state.human_takeover),
      updated_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('AI conversation persistence warning:', error.message);
  }
}

function safeService(service = {}) {
  return {
    resi: service.resi,
    device_name: service.device_name,
    issue: service.issue,
    status: service.status,
    jasa_fee: Number(service.jasa_fee || 0),
    part_fee: Number(service.part_fee || 0),
    created_at: service.created_at,
  };
}

function safeProduct(product = {}) {
  return {
    name: product.name,
    category: product.category || '',
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
  };
}

async function buildCustomerContext(tenantCode, sender) {
  const admin = getSupabaseAdmin();
  if (!admin) return { services: [], products: [], customerName: '', crm: {} };
  const normalizedSender = normalizePhone(sender);
  const [{ data: serviceRows }, { data: productRows }, { data: transactionRows }] = await Promise.all([
    admin.from('services').select('*').eq('tenant_code', tenantCode).order('created_at', { ascending: false }).limit(120),
    admin.from('products').select('*').eq('tenant_code', tenantCode).limit(80),
    admin.from('transactions').select('*').eq('tenant_code', tenantCode).order('created_at', { ascending: false }).limit(160),
  ]);
  const matchedServices = (serviceRows || []).filter((item) => normalizePhone(item.customer_phone) === normalizedSender).slice(0, 8);
  const customerName = matchedServices[0]?.customer_name || '';
  const relatedTransactions = (transactionRows || []).filter((tx) => {
    const description = String(tx.description || '');
    return description.includes(normalizedSender) || description.includes(sender);
  }).slice(0, 12);
  return {
    customerName,
    services: matchedServices.map(safeService),
    products: (productRows || []).slice(0, 60).map(safeProduct),
    crm: {
      service_count: matchedServices.length,
      transaction_count: relatedTransactions.length,
      last_service_at: matchedServices[0]?.created_at || null,
    },
  };
}

function cleanStoreSettings(settings = {}) {
  const allowedKeys = ['storeName', 'store_wa', 'address', 'store_address', 'business_hours', 'jam_operasional', 'warranty_policy', 'service_policy'];
  return Object.fromEntries(allowedKeys.filter((key) => settings[key] !== undefined).map((key) => [key, settings[key]]));
}

function parseAgentJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      action: parsed.action === 'handoff' ? 'handoff' : 'reply',
      message: String(parsed.message || '').trim(),
      reason: String(parsed.reason || '').trim(),
    };
  } catch {
    return { action: 'reply', message: cleaned, reason: 'fallback_parse' };
  }
}

function shouldForceHandoff(message = '') {
  const text = String(message || '').toLowerCase();
  return /(refund|uang kembali|komplain berat|lapor polisi|penipuan|rusak setelah servis|minta admin|bicara admin|bicara manusia|hubungkan.*admin|negosiasi khusus)/i.test(text);
}

async function listConversationRows(tenantCode) {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    const prefix = `${CHAT_KEY_PREFIX}${tenantCode}:`;
    const { data, error } = await admin.from('app_config').select('key,value').like('key', `${prefix}%`).limit(80);
    if (error) return [];
    return (data || []).map((row) => {
      try {
        const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        return {
          phone: parsed?.phone || '',
          name: parsed?.name || '',
          human_takeover: Boolean(parsed?.human_takeover),
          updated_at: parsed?.updated_at || null,
          last_message: Array.isArray(parsed?.history) ? parsed.history.at(-1)?.text || '' : '',
        };
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  } catch {
    return [];
  }
}

function registerAiAgentRoutes(app) {
  app.get('/api/admin/ai-config', requireSuperAdmin, async (req, res) => {
    try {
      return res.json(publicAiConfig(await getGlobalAiConfig()));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/ai-config', requireSuperAdmin, async (req, res) => {
    try {
      const model = String(req.body?.model || '').trim();
      if (model && !/^gemini-[a-z0-9.-]+$/i.test(model)) return res.status(400).json({ error: 'Nama model Gemini tidak valid.' });
      const config = await saveGlobalAiConfig({
        enabled: req.body?.enabled !== false,
        model: model || ENV_GEMINI_MODEL,
        api_key: req.body?.api_key || '',
        clear_api_key: Boolean(req.body?.clear_api_key),
        custom_instruction: req.body?.custom_instruction || '',
      });
      return res.json({ success: true, ...publicAiConfig(config) });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/ai-config/test', requireSuperAdmin, async (req, res) => {
    try {
      const current = await getGlobalAiConfig();
      const apiKey = String(req.body?.api_key || '').trim() || current.apiKey;
      const model = String(req.body?.model || current.model || ENV_GEMINI_MODEL).trim();
      const text = await callGeminiText({
        apiKey,
        model,
        systemInstruction: 'Balas hanya dengan teks: UNITPRO_GEMINI_OK',
        contents: [{ role: 'user', parts: [{ text: 'Tes koneksi UnitPro.' }] }],
        maxOutputTokens: 32,
      });
      return res.json({ success: /UNITPRO_GEMINI_OK/i.test(text), model, response: text.slice(0, 80) });
    } catch (error) {
      return res.status(502).json({ error: `Tes Gemini gagal: ${error.message}` });
    }
  });

  app.post('/api/ai/copywriting', requireTenant, async (req, res) => {
    try {
      const ai = await getGlobalAiConfig();
      if (!ai.enabled) return res.status(503).json({ error: 'Gemini dinonaktifkan oleh Super Admin.' });
      if (!ai.apiKey) return res.status(503).json({ error: 'Gemini API Key belum diatur oleh Super Admin.' });
      const tenantCode = req.tenantCode;
      const userPrompt = String(req.body?.prompt || req.body?.goal || '').trim().slice(0, 1800);
      if (!userPrompt) return res.status(400).json({ error: 'Tulis permintaan untuk AI terlebih dahulu.' });
      const currentMessage = String(req.body?.current_message || '').trim().slice(0, 5000);
      const instruction = String(req.body?.instruction || '').trim().slice(0, 500);
      const segmentLabel = String(req.body?.segment_label || 'Pelanggan').trim().slice(0, 120);
      const admin = getSupabaseAdmin();
      let products = [];
      if (admin) {
        const { data } = await admin.from('products').select('*').eq('tenant_code', tenantCode).limit(80);
        products = (data || []).map(safeProduct);
      }
      const tenant = await getTenantRecord(tenantCode);
      const storeSettings = cleanStoreSettings(parseSettings(tenant?.settings));
      const system = `${DEFAULT_CAMPAIGN_SYSTEM_PROMPT}\n\nINSTRUKSI TAMBAHAN SUPER ADMIN:\n${ai.customInstruction || '-'} `;
      const input = [
        `PERMINTAAN PEMILIK TOKO: ${userPrompt}`,
        `SEGMENT AKTIF: ${segmentLabel}`,
        instruction ? `PERINTAH REVISI: ${instruction}` : '',
        currentMessage ? `PESAN SAAT INI YANG BOLEH DIREVISI:\n${currentMessage}` : '',
        `DATA TOKO: ${JSON.stringify(storeSettings)}`,
        `KATALOG BARANG/JASA UNITPRO: ${JSON.stringify(products)}`,
      ].filter(Boolean).join('\n\n');
      const text = await callGeminiText({
        apiKey: ai.apiKey,
        model: ai.model,
        systemInstruction: system,
        contents: [{ role: 'user', parts: [{ text: input }] }],
        maxOutputTokens: 1200,
      });
      return res.json({ text: text.trim(), model: ai.model });
    } catch (error) {
      return res.status(502).json({ error: `Gemini gagal membuat pesan: ${error.message}` });
    }
  });

  app.post('/api/whatsapp/setup-agent', requireTenant, async (req, res) => {
    try {
      const tenantCode = req.tenantCode;
      const gateway = await getTenantGateway(tenantCode);
      if (gateway.mode !== 'CUSTOM' || !gateway.token) {
        return res.status(400).json({ error: 'AI Agent memerlukan mode WhatsApp Gateway CUSTOM dengan token Fonnte toko.' });
      }
      const profile = await fonnteRequest('device', gateway.token);
      const origin = requestOrigin(req);
      if (!origin) return res.status(500).json({ error: 'URL publik aplikasi tidak dapat ditentukan. Atur PUBLIC_APP_URL di server.' });
      const secret = makeWebhookSecret(tenantCode, gateway.token);
      const webhook = `${origin}/api/webhooks/fonnte/${encodeURIComponent(tenantCode)}/${secret}`;
      const device = String(profile.device || '').trim();
      const name = String(profile.name || `UnitPro ${tenantCode}`).slice(0, 30);
      if (!device) return res.status(502).json({ error: 'Fonnte tidak mengembalikan nomor device.' });
      await fonnteRequest('update-device', gateway.token, {
        name,
        device,
        webhook,
        autoread: 'true',
        personal: 'true',
        group: 'false',
        quick: 'false',
        countryCode: '62',
      });
      return res.json({
        success: true,
        provider: 'fonnte',
        device,
        device_status: profile.device_status || profile.status || 'unknown',
        webhook_configured: true,
      });
    } catch (error) {
      return res.status(502).json({ error: `Gagal menyiapkan AI Agent di Fonnte: ${error.message}` });
    }
  });

  app.get('/api/ai-agent/conversations/:tenant', requireTenant, async (req, res) => {
    const conversations = await listConversationRows(req.tenantCode);
    return res.json({ conversations: conversations.slice(0, 30) });
  });

  app.post('/api/ai-agent/conversations/takeover', requireTenant, async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'Nomor pelanggan tidak valid.' });
    const state = await getConversationState(req.tenantCode, phone);
    state.human_takeover = req.body?.takeover !== false;
    await saveConversationState(req.tenantCode, phone, state);
    return res.json({ success: true, human_takeover: state.human_takeover });
  });

  app.post('/api/webhooks/fonnte/:tenant/:secret', async (req, res) => {
    const tenantCode = String(req.params.tenant || '').trim().toUpperCase();
    try {
      const gateway = await getTenantGateway(tenantCode);
      if (!gateway.tenant || !gateway.token) return res.status(200).json({ received: true, ignored: 'gateway_not_configured' });
      const expected = makeWebhookSecret(tenantCode, gateway.token);
      const provided = String(req.params.secret || '');
      if (provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
        return res.status(200).json({ received: true, ignored: 'invalid_signature' });
      }

      const sender = normalizePhone(req.body?.sender);
      const message = String(req.body?.message || req.body?.text || '').trim().slice(0, 4000);
      const member = String(req.body?.member || '').trim();
      const inboxid = req.body?.inboxid || '';
      const senderName = String(req.body?.name || '').trim().slice(0, 100);
      if (!sender || !message || member) return res.status(200).json({ received: true, ignored: 'unsupported_message' });

      const settings = gateway.settings || {};
      if (!settings.ai_agent_enabled) return res.status(200).json({ received: true, ignored: 'agent_off' });
      const pausedUntil = Number(settings.ai_agent_paused_until || 0);
      if (pausedUntil > Date.now()) return res.status(200).json({ received: true, ignored: 'agent_paused' });

      const ai = await getGlobalAiConfig();
      if (!ai.enabled || !ai.apiKey) return res.status(200).json({ received: true, ignored: 'gemini_unavailable' });

      const state = await getConversationState(tenantCode, sender);
      state.name = state.name || senderName;
      if (state.human_takeover) return res.status(200).json({ received: true, ignored: 'human_takeover' });

      const context = await buildCustomerContext(tenantCode, sender);
      const storeSettings = cleanStoreSettings(settings);
      const history = state.history.slice(-8);
      const forceHandoff = shouldForceHandoff(message);
      let decision;
      if (forceHandoff) {
        decision = {
          action: 'handoff',
          message: 'Baik Kak, saya teruskan ke admin toko supaya bisa dibantu langsung ya 😊',
          reason: 'forced_handoff_rule',
        };
      } else {
        const contents = [];
        for (const item of history) {
          contents.push({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.text }] });
        }
        contents.push({
          role: 'user',
          parts: [{ text: [
            `PESAN PELANGGAN: ${message}`,
            `NAMA PENGIRIM: ${context.customerName || senderName || 'Pelanggan'}`,
            `DATA TOKO: ${JSON.stringify(storeSettings)}`,
            `DATA SERVIS PELANGGAN: ${JSON.stringify(context.services)}`,
            `RINGKASAN CRM: ${JSON.stringify(context.crm)}`,
            `KATALOG BARANG/JASA: ${JSON.stringify(context.products)}`,
          ].join('\n\n') }],
        });
        const raw = await callGeminiText({
          apiKey: ai.apiKey,
          model: ai.model,
          systemInstruction: `${DEFAULT_AGENT_SYSTEM_PROMPT}\n\nINSTRUKSI TAMBAHAN SUPER ADMIN:\n${ai.customInstruction || '-'}`,
          contents,
          maxOutputTokens: 700,
        });
        decision = parseAgentJson(raw);
      }

      if (!decision.message) {
        decision = { action: 'handoff', message: 'Saya teruskan ke admin toko ya Kak supaya informasinya bisa dicek dengan tepat 😊', reason: 'empty_ai_message' };
      }
      if (decision.action === 'handoff') state.human_takeover = true;
      state.history = [
        ...history,
        { role: 'user', text: message, at: new Date().toISOString() },
        { role: 'assistant', text: decision.message, at: new Date().toISOString(), action: decision.action },
      ].slice(-10);
      await saveConversationState(tenantCode, sender, state);

      await sendFonnteReply({ token: gateway.token, target: sender, message: decision.message, inboxid });
      return res.status(200).json({ received: true, replied: true, action: decision.action });
    } catch (error) {
      console.error('UnitPro AI Agent webhook error:', error.message);
      // Fonnte retries non-200 responses repeatedly. Return 200 after logging to avoid duplicate replies.
      return res.status(200).json({ received: true, replied: false, error: 'agent_processing_failed' });
    }
  });
}

module.exports = {
  registerAiAgentRoutes,
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_CAMPAIGN_SYSTEM_PROMPT,
};
