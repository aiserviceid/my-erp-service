const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.send({ status: 'OK', message: 'SaaS Tracking ERP Backend API is Running!' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Strict Production Environment Check
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing in production!');
  console.error('The server refuses to start to prevent predictable secret token vulnerabilities.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_local_testing_secret_key_2026';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FONNTE_SYSTEM_TOKEN = process.env.FONNTE_TOKEN || '';
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCK_MS = 15 * 60 * 1000;
const adminLoginAttempts = new Map();

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to verify JWT (Header: Authorization: Bearer <token>)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Akses ditolak: Token autentikasi tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Akses ditolak: Token tidak valid atau kadaluarsa' });
    req.user = user;
    next();
  });
};

const requireSuperAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sesi Super Admin tidak ditemukan.' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.role !== 'super_admin') return res.status(403).json({ error: 'Akses khusus Super Admin diperlukan.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
  }
};

const passwordMatches = (input, expected) => {
  if (!input || !expected) return false;
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(inputBuffer, expectedBuffer);
};

const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
};

app.post('/api/verify-admin', async (req, res) => {
  const attemptKey = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const currentAttempt = adminLoginAttempts.get(attemptKey) || { count: 0, lockedUntil: 0 };
  if (currentAttempt.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.' });
  }

  const inputPassword = String(req.body?.password || '');
  let valid = SUPER_ADMIN_PASSWORD ? passwordMatches(inputPassword, SUPER_ADMIN_PASSWORD) : false;

  if (!valid) {
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.rpc('verify_super_admin', { input_password: inputPassword });
      valid = !error && data === true;
    }
  }

  if (!valid) {
    const count = currentAttempt.count + 1;
    adminLoginAttempts.set(attemptKey, {
      count,
      lockedUntil: count >= ADMIN_LOGIN_MAX_ATTEMPTS ? Date.now() + ADMIN_LOGIN_LOCK_MS : 0,
    });
    return res.status(401).json({ valid: false });
  }
  adminLoginAttempts.delete(attemptKey);
  const token = jwt.sign({ role: 'super_admin' }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ valid: true, token });
});

app.delete('/api/admin/reviews/:id', requireSuperAdmin, async (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId < 1) return res.status(400).json({ error: 'ID komentar tidak valid.' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase service role belum dikonfigurasi di server.' });

  const { error } = await supabaseAdmin.from('platform_reviews').delete().eq('id', reviewId);
  if (error) return res.status(500).json({ error: 'Gagal menghapus komentar.' });
  return res.json({ success: true });
});

// Middleware to enforce Tenant Isolation (Security)
const enforceTenantAccess = (req, res, next) => {
  const requestedTenant = req.body.tenant_code || req.params.tenant || req.body.code;
  const userTenant = req.user.tenant || req.user.code; // Employee uses .tenant, Tenant uses .code
  
  if (requestedTenant && userTenant && requestedTenant !== userTenant) {
     return res.status(403).json({ error: 'Akses Ditolak: Anda mencoba mengakses data dari cabang/toko lain!' });
  }
  next();
};

const secureRoute = [authenticateToken, enforceTenantAccess];

const normalizeGatewayPhone = (value = '') => {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

const parseTenantSettings = (rawSettings) => {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'object') return rawSettings;
  try { return JSON.parse(rawSettings); } catch { return {}; }
};

const WHATSAPP_CONFIG_KEY = 'whatsapp_system_config';

const encryptServerSecret = (value) => {
  if (!value) return '';
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
};

const decryptServerSecret = (value) => {
  if (!value) return '';
  const text = String(value);
  if (!text.startsWith('enc:v1:')) return text;
  try {
    const [, , ivB64, tagB64, ciphertextB64] = text.split(':');
    const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
};

const readStoredWhatsappConfig = async () => {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return {};
  const { data, error } = await supabaseAdmin.from('app_config').select('value').eq('key', WHATSAPP_CONFIG_KEY).maybeSingle();
  if (error || !data?.value) return {};
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  } catch {
    return {};
  }
};

const getSystemWhatsappConfig = async () => {
  const stored = await readStoredWhatsappConfig();
  const storedToken = decryptServerSecret(stored.token || '');
  return {
    provider: 'fonnte',
    enabled: stored.enabled !== false,
    token: storedToken || FONNTE_SYSTEM_TOKEN,
    source: storedToken ? 'super_admin' : (FONNTE_SYSTEM_TOKEN ? 'environment' : 'none'),
    updated_at: stored.updated_at || null,
  };
};

const saveSystemWhatsappConfig = async ({ enabled, token }) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) throw new Error('Supabase service role belum dikonfigurasi di server.');
  const existing = await readStoredWhatsappConfig();
  const next = {
    provider: 'fonnte',
    enabled: enabled !== false,
    token: token ? encryptServerSecret(token) : (existing.token || ''),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from('app_config').upsert({ key: WHATSAPP_CONFIG_KEY, value: JSON.stringify(next) }, { onConflict: 'key' });
  if (error) throw new Error(`Konfigurasi WhatsApp gagal disimpan: ${error.message}`);
  return getSystemWhatsappConfig();
};

const fonnteRequest = async (pathName, token, body = null) => {
  const response = await fetch(`https://api.fonnte.com/${pathName}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: token },
    ...(body ? { body: new URLSearchParams(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    const reason = payload?.reason || payload?.detail || payload?.message || `HTTP ${response.status}`;
    const error = new Error(reason);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
};

const getTenantGatewayConfig = async (tenantCode) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('settings')
        .eq('code', tenantCode)
        .maybeSingle();
      const settings = parseTenantSettings(data?.settings);
      if (settings.wa_sender_mode || settings.fonnte_token) {
        return {
          mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
          token: settings.fonnte_token || '',
        };
      }
    } catch (error) {
      console.warn('Gateway settings Supabase lookup warning:', error.message);
    }
  }

  return new Promise((resolve) => {
    db.get('SELECT settings FROM tenants WHERE code = ?', [tenantCode], (err, row) => {
      if (err || !row) return resolve({ mode: 'SYSTEM', token: '' });
      const settings = parseTenantSettings(row.settings);
      resolve({
        mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
        token: settings.fonnte_token || '',
      });
    });
  });
};

app.post('/api/whatsapp/send', secureRoute, async (req, res) => {
  const tenantCode = String(req.body?.tenant_code || req.user?.tenant || req.user?.code || '').trim().toUpperCase();
  const target = normalizeGatewayPhone(req.body?.target);
  const message = String(req.body?.message || '').trim();
  if (!tenantCode) return res.status(400).json({ error: 'Kode toko wajib diisi.' });
  if (!/^[0-9]{9,15}$/.test(target)) return res.status(400).json({ error: 'Nomor WhatsApp tujuan tidak valid.' });
  if (!message || message.length > 5000) return res.status(400).json({ error: 'Pesan WhatsApp wajib diisi dan maksimal 5000 karakter.' });

  const savedConfig = await getTenantGatewayConfig(tenantCode);
  const requestedMode = String(req.body?.gateway_mode || savedConfig.mode || 'SYSTEM').toUpperCase();
  const customToken = String(req.body?.gateway_token || savedConfig.token || '').trim();
  const systemConfig = requestedMode === 'SYSTEM' ? await getSystemWhatsappConfig() : null;
  if (requestedMode === 'SYSTEM' && systemConfig?.enabled === false) {
    return res.status(503).json({ error: 'Gateway WhatsApp sistem sedang dinonaktifkan oleh Super Admin.', code: 'WA_GATEWAY_DISABLED' });
  }
  const gatewayToken = requestedMode === 'CUSTOM' ? customToken : (systemConfig?.token || customToken);

  if (!gatewayToken) {
    return res.status(503).json({
      error: requestedMode === 'CUSTOM'
        ? 'Token WhatsApp Gateway belum diisi. Simpan token Fonnte di Pengaturan WhatsApp.'
        : 'Gateway sistem belum dikonfigurasi di server.',
      code: 'WA_GATEWAY_NOT_CONFIGURED',
    });
  }

  try {
    await fonnteRequest('send', gatewayToken, { target, message, ...(req.body?.url ? { url: String(req.body.url) } : {}) });
    return res.json({ status: 'sent', provider: 'fonnte', target });
  } catch (error) {
    console.error('WhatsApp gateway proxy error:', error.message);
    return res.status(502).json({ error: `Tidak dapat mengirim melalui WhatsApp Gateway: ${error.message}` });
  }
});

app.get('/api/admin/whatsapp/config', requireSuperAdmin, async (req, res) => {
  try {
    const config = await getSystemWhatsappConfig();
    if (!config.token) {
      return res.json({
        provider: config.provider,
        enabled: config.enabled,
        configured: false,
        status: 'not_configured',
        source: config.source,
        updated_at: config.updated_at,
      });
    }

    try {
      const deviceResult = await fonnteRequest('device', config.token);
      return res.json({
        provider: config.provider,
        enabled: config.enabled,
        configured: true,
        status: config.enabled ? 'connected' : 'disabled',
        source: config.source,
        masked_token: `${config.token.slice(0, 4)}••••${config.token.slice(-4)}`,
        device: deviceResult?.device || deviceResult?.data?.device || deviceResult?.name || '',
        device_status: deviceResult?.device_status || deviceResult?.data?.status || 'connected',
        updated_at: config.updated_at,
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      return res.json({
        provider: config.provider,
        enabled: config.enabled,
        configured: true,
        status: 'error',
        source: config.source,
        masked_token: `${config.token.slice(0, 4)}••••${config.token.slice(-4)}`,
        error: error.message,
        updated_at: config.updated_at,
        checked_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/whatsapp/config', requireSuperAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (token && (token.length < 8 || token.length > 500)) return res.status(400).json({ error: 'Format token Fonnte tidak valid.' });
    const config = await saveSystemWhatsappConfig({ enabled: req.body?.enabled !== false, token });
    return res.json({
      success: true,
      provider: config.provider,
      enabled: config.enabled,
      configured: Boolean(config.token),
      source: config.source,
      masked_token: config.token ? `${config.token.slice(0, 4)}••••${config.token.slice(-4)}` : '',
      updated_at: config.updated_at,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/whatsapp/test', requireSuperAdmin, async (req, res) => {
  const target = normalizeGatewayPhone(req.body?.target);
  const message = String(req.body?.message || 'Tes koneksi WhatsApp Gateway UnitPro dari Super Admin.').trim();
  if (!/^[0-9]{9,15}$/.test(target)) return res.status(400).json({ error: 'Nomor WhatsApp tujuan tidak valid.' });
  if (!message || message.length > 5000) return res.status(400).json({ error: 'Pesan tes wajib diisi dan maksimal 5000 karakter.' });

  try {
    const config = await getSystemWhatsappConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Gateway sistem sedang dinonaktifkan.' });
    if (!config.token) return res.status(503).json({ error: 'Token Fonnte sistem belum dikonfigurasi.' });
    await fonnteRequest('send', config.token, { target, message });
    return res.json({ success: true, status: 'sent', provider: config.provider, target, sent_at: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: `Tes pengiriman gagal: ${error.message}` });
  }
});

const { registerAiAgentRoutes } = require('./ai-agent.cjs');
registerAiAgentRoutes(app, { db });

// Middleware to enforce premium feature limits & tiers on the backend server-side
const requirePremiumFeature = (req, res, next) => {
  const tier = req.user?.tier || 'free';
  if (tier === 'free') {
    return res.status(403).json({ error: 'Fitur Premium Terkunci: Harap upgrade ke paket Pro Titan untuk menggunakan fitur ini.' });
  }
  next();
};

// ── VALIDASI FORMAT INPUT (sesuai jenis data masing-masing field) ──
// Kode Toko: hanya huruf kapital, angka, strip, underscore
const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
// Nama Toko: huruf, angka, spasi, dan beberapa tanda baca umum
const NAME_REGEX = /^[A-Za-z0-9À-ÿ .,'&()-]{2,80}$/;
// No. WhatsApp: hanya angka, 9-15 digit
const PHONE_REGEX = /^[0-9]{9,15}$/;
// PIN: hanya angka, 4-6 digit
const PIN_REGEX = /^[0-9]{4,6}$/;

// API: Register / Login Tenant
app.post('/api/tenant/login', async (req, res) => {
  let { code, name, pin, phone } = req.body;
  code = (code || '').trim().toUpperCase();
  name = (name || '').trim();
  phone = (phone || '').trim();

  if (!code || !pin) return res.status(400).json({ error: 'Kode Cabang dan PIN wajib diisi' });

  // Validasi format Kode Toko
  if (!CODE_REGEX.test(code)) {
    return res.status(400).json({ error: 'Kode Toko hanya boleh berisi huruf, angka, strip (-), dan underscore (_), 3-32 karakter' });
  }
  // Validasi format PIN (harus angka saja)
  if (!PIN_REGEX.test(pin)) {
    return res.status(400).json({ error: 'PIN harus berupa 4-6 digit angka' });
  }

  db.get('SELECT * FROM tenants WHERE code = ?', [code], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      // Validate PIN
      const isMatch = await bcrypt.compare(pin, row.pin || '');
      
      // Fallback for legacy users without PIN
      if (!isMatch && row.pin !== '') {
        return res.status(401).json({ error: 'PIN Salah!' });
      } else if (row.pin === '') {
        const hashedPin = await bcrypt.hash(pin, 10);
        db.run('UPDATE tenants SET pin = ? WHERE code = ?', [hashedPin, code]);
      }

      // Lengkapi nomor WA jika sebelumnya belum tersimpan (akun lama)
      if (phone && PHONE_REGEX.test(phone) && !row.phone) {
        db.run('UPDATE tenants SET phone = ? WHERE code = ?', [phone, code]);
        row.phone = phone;
      }
      
      const token = jwt.sign({ code: row.code, role: 'tenant', tier: row.tier || 'free' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ ...row, token });
    } else {
      // Registrasi toko baru — validasi Nama & No. WhatsApp wajib untuk pendaftaran
      if (!name || !NAME_REGEX.test(name)) {
        return res.status(400).json({ error: 'Nama Toko tidak valid. Gunakan huruf, angka, dan spasi (2-80 karakter)' });
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        return res.status(400).json({ error: 'No. WhatsApp hanya boleh berisi angka (9-15 digit)' });
      }

      // Create new tenant if not exists
      const hashedPin = await bcrypt.hash(pin, 10);
      const defaultSettings = JSON.stringify({ theme: 'laptop', storeName: name || 'Toko Baru', ads: [] });
      db.run('INSERT INTO tenants (code, name, settings, pin, phone) VALUES (?, ?, ?, ?, ?)', [code, name || 'Toko Baru', defaultSettings, hashedPin, phone || ''], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const token = jwt.sign({ code, role: 'tenant', tier: 'free' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ code, name: name || 'Toko Baru', tier: 'free', settings: defaultSettings, phone: phone || '', token });
      });
    }
  });
});

app.put('/api/tenant/settings', secureRoute, (req, res) => {
  const { code, settings } = req.body;
  db.run('UPDATE tenants SET settings = ? WHERE code = ?', [JSON.stringify(settings), code], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// API: Products (Master Barang)
app.get('/api/products/:tenant', (req, res) => {
  db.all('SELECT * FROM products WHERE tenant_code = ?', [req.params.tenant], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { tenant_code, name, price, stock } = req.body;
  db.run('INSERT INTO products (tenant_code, name, price, stock) VALUES (?, ?, ?, ?)', [tenant_code, name, price, stock], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, tenant_code, name, price, stock });
  });
});

const idempotencyStore = new Map();

// API: Transactions (POS Checkout)
app.post('/api/transactions', (req, res) => {
  const { tenant_code, type, amount, description, idempotency_key } = req.body;
  if (idempotency_key && idempotencyStore.has(idempotency_key)) {
    console.log('⚡ [Backend Idempotency] Prevented duplicate transaction:', idempotency_key);
    return res.json(idempotencyStore.get(idempotency_key));
  }
  db.run('INSERT INTO transactions (tenant_code, type, amount, description) VALUES (?, ?, ?, ?)', 
  [tenant_code, type, amount, description], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const result = { id: this.lastID, success: true };
    if (idempotency_key) {
      idempotencyStore.set(idempotency_key, result);
      setTimeout(() => idempotencyStore.delete(idempotency_key), 10 * 60 * 1000);
    }
    res.json(result);
  });
});

// API: Users / Employees
app.get('/api/users/:tenant', (req, res) => {
  db.all('SELECT id, name, role, phone FROM users WHERE tenant_code = ?', [req.params.tenant], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', authenticateToken, requirePremiumFeature, async (req, res) => {
  const { tenant_code, name, role, pin, phone = '' } = req.body;
  const hashedPin = await bcrypt.hash(pin, 10);
  db.run('INSERT INTO users (tenant_code, name, role, pin, phone) VALUES (?, ?, ?, ?, ?)', [tenant_code, name, role, hashedPin, phone], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, role, phone });
  });
});

app.post('/api/employee/login', async (req, res) => {
  const { tenant_code, pin } = req.body;
  if (!tenant_code || !pin) return res.status(400).json({ error: 'Kode Toko dan PIN wajib diisi' });

  db.all('SELECT * FROM users WHERE tenant_code = ?', [tenant_code], async (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Iterate to check hash since PIN is hashed
    let loggedInUser = null;
    for (let u of users) {
      const match = await bcrypt.compare(pin, u.pin);
      if (match || u.pin === pin) { // Fallback if plain text pin exists from before
        loggedInUser = u;
        if (u.pin === pin) {
           const hashedPin = await bcrypt.hash(pin, 10);
           db.run('UPDATE users SET pin = ? WHERE id = ?', [hashedPin, u.id]);
        }
        break;
      }
    }

    if (loggedInUser) {
      const token = jwt.sign({ id: loggedInUser.id, role: loggedInUser.role, tenant: tenant_code }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ id: loggedInUser.id, name: loggedInUser.name, role: loggedInUser.role, token });
    } else {
      res.status(401).json({ error: 'PIN Salah!' });
    }
  });
});

// API: Upload Image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// API: Services
app.get('/api/services/:tenant', secureRoute, (req, res) => {
  db.all('SELECT * FROM services WHERE tenant_code = ? ORDER BY created_at DESC', [req.params.tenant], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/services/finish', secureRoute, (req, res) => {
  const { resi, status, part_fee, jasa_fee, technician_id, issue } = req.body;
  const tenantCode = req.body.tenant_code || req.user?.tenant || req.user?.code;
  if (!resi || !tenantCode) return res.status(400).json({ error: 'Resi dan kode toko wajib diisi' });
  db.run(
    'UPDATE services SET status = COALESCE(?, status), part_fee = COALESCE(?, part_fee), jasa_fee = COALESCE(?, jasa_fee), technician_id = COALESCE(?, technician_id), issue = COALESCE(?, issue) WHERE resi = ? AND tenant_code = ?',
    [status, part_fee, jasa_fee, technician_id, issue, resi, tenantCode],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Servis tidak ditemukan untuk toko ini' });
      res.json({ success: true });
    }
  );
});

app.post('/api/services/update', secureRoute, (req, res) => {
  const { resi, technician_id, issue } = req.body;
  const tenantCode = req.body.tenant_code || req.user?.tenant || req.user?.code;
  if (!resi || !tenantCode) return res.status(400).json({ error: 'Resi dan kode toko wajib diisi' });
  db.run(
    'UPDATE services SET technician_id = COALESCE(?, technician_id), issue = COALESCE(?, issue) WHERE resi = ? AND tenant_code = ?',
    [technician_id, issue, resi, tenantCode],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Servis tidak ditemukan untuk toko ini' });
      res.json({ success: true });
    }
  );
});

app.get('/api/tracking/:resi', (req, res) => {
  db.get('SELECT * FROM services WHERE resi = ?', [req.params.resi], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'Resi tidak ditemukan' });
    }
  });
});

// API: Forum
app.get('/api/forum/threads', (req, res) => {
  const { category, search } = req.query;
  let query = `
    SELECT f.*, t.reputation_points, 
      (SELECT COUNT(*) FROM forum_posts WHERE thread_id = f.id) as reply_count
    FROM forum_threads f 
    LEFT JOIN tenants t ON f.tenant_code = t.code 
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== 'ALL') {
    query += ' AND f.category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (f.title LIKE ? OR f.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY f.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/forum/threads', (req, res) => {
  const { tenant_code, author_name, title, content, category, image_url } = req.body;
  db.run('INSERT INTO forum_threads (tenant_code, author_name, title, content, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [tenant_code, author_name, title, content, category, image_url || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    });
});

app.get('/api/forum/threads/:id', (req, res) => {
  db.get(`
    SELECT f.*, t.reputation_points 
    FROM forum_threads f 
    LEFT JOIN tenants t ON f.tenant_code = t.code 
    WHERE f.id = ?`, [req.params.id], (err, thread) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    
    db.all(`
      SELECT p.*, t.reputation_points 
      FROM forum_posts p 
      LEFT JOIN tenants t ON p.tenant_code = t.code 
      WHERE p.thread_id = ? 
      ORDER BY p.created_at ASC`, [req.params.id], (err, posts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ thread, posts });
    });
  });
});

app.post('/api/forum/threads/:id/posts', (req, res) => {
  const { tenant_code, author_name, content, image_url } = req.body;
  db.run('INSERT INTO forum_posts (thread_id, tenant_code, author_name, content, image_url) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, tenant_code, author_name, content, image_url || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    });
});

app.put('/api/forum/threads/:id/solve', (req, res) => {
  const { post_id, solver_tenant_code } = req.body;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Mark thread as solved
    db.run('UPDATE forum_threads SET is_solved = 1 WHERE id = ?', [req.params.id]);
    
    // Mark post as solution
    db.run('UPDATE forum_posts SET is_solution = 1 WHERE id = ?', [post_id]);
    
    // Add reputation points to the solver
    if (solver_tenant_code) {
      db.run('UPDATE tenants SET reputation_points = reputation_points + 10 WHERE code = ?', [solver_tenant_code]);
    }
    
    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// API: Wallet & Tipping
app.post('/api/wallet/sawer', (req, res) => {
  const { solver_tenant_code, amount } = req.body;
  if (!solver_tenant_code || !amount) return res.status(400).json({ error: 'Missing parameters' });

  // 1. Get solver tier
  db.get('SELECT tier FROM tenants WHERE code = ?', [solver_tenant_code], (err, tenant) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const isPremium = tenant.tier && tenant.tier !== 'free';
    const commissionRate = isPremium ? 0.01 : 0.06;
    const commission = Math.floor(amount * commissionRate);
    const solverShare = amount - commission;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      // Add to solver balance
      db.run('UPDATE tenants SET wallet_balance = wallet_balance + ? WHERE code = ?', [solverShare, solver_tenant_code]);
      // Add to platform balance
      db.run('UPDATE platform_wallet SET balance = balance + ? WHERE id = 1', [commission]);

      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, solverShare, commission });
      });
    });
  });
});

app.get('/api/wallet/balance/:tenant', (req, res) => {
  db.get('SELECT wallet_balance, bank_details FROM tenants WHERE code = ?', [req.params.tenant], (err, tenant) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    db.all('SELECT * FROM withdrawals WHERE tenant_code = ? ORDER BY created_at DESC', [req.params.tenant], (err, withdrawals) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ balance: tenant.wallet_balance || 0, bank_details: tenant.bank_details, withdrawals });
    });
  });
});

app.post('/api/wallet/withdraw', (req, res) => {
  const { tenant_code, amount, bank_name, account_number, account_name } = req.body;
  
  db.get('SELECT wallet_balance FROM tenants WHERE code = ?', [tenant_code], (err, tenant) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tenant || tenant.wallet_balance < amount) return res.status(400).json({ error: 'Saldo tidak mencukupi' });

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('UPDATE tenants SET wallet_balance = wallet_balance - ? WHERE code = ?', [amount, tenant_code]);
      db.run('INSERT INTO withdrawals (tenant_code, amount, bank_name, account_number, account_name) VALUES (?, ?, ?, ?, ?)',
        [tenant_code, amount, bank_name, account_number, account_name]);

      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      });
    });
  });
});

app.post('/api/wallet/bank', (req, res) => {
  const { tenant_code, bank_details } = req.body;
  db.run('UPDATE tenants SET bank_details = ? WHERE code = ?', [JSON.stringify(bank_details), tenant_code], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/platform/balance', (req, res) => {
  db.get('SELECT balance FROM platform_wallet WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ balance: row ? row.balance : 0 });
  });
});

app.get('/api/admin/stats', requireSuperAdmin, (req, res) => {
  db.all('SELECT * FROM tenants', (err, tenants) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all('SELECT w.*, t.name as tenant_name FROM withdrawals w LEFT JOIN tenants t ON w.tenant_code = t.code ORDER BY w.created_at DESC', (err, withdrawals) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT balance FROM platform_wallet WHERE id = 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          tenants,
          withdrawals,
          platform_balance: row ? row.balance : 0
        });
      });
    });
  });
});

app.put('/api/admin/withdrawals/:id/approve', requireSuperAdmin, async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('withdrawals').update({ status: 'SUCCESS' }).eq('id', req.params.id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Permintaan penarikan tidak ditemukan.' });
    return res.json({ success: true, data });
  }

  db.run('UPDATE withdrawals SET status = ? WHERE id = ?', ['SUCCESS', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Permintaan penarikan tidak ditemukan.' });
    return res.json({ success: true });
  });
});

app.post('/api/admin/platform/withdraw', requireSuperAdmin, async (req, res) => {
  const note = String(req.body?.note || 'Penarikan saldo komisi platform').trim().slice(0, 500);
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const { data: wallet, error: walletError } = await supabaseAdmin.from('platform_wallet').select('balance').eq('id', 1).maybeSingle();
      if (walletError) throw walletError;
      const amount = Number(wallet?.balance || 0);
      if (amount <= 0) return res.status(400).json({ error: 'Saldo komisi platform kosong.' });

      const { error: updateError } = await supabaseAdmin.from('platform_wallet').update({ balance: 0 }).eq('id', 1);
      if (updateError) throw updateError;

      await supabaseAdmin.from('saas_admin_logs').insert({
        id: `LOG_${Date.now()}_PLATFORM`,
        tenant_code: 'SYSTEM',
        action_type: 'WITHDRAW_PLATFORM_BALANCE',
        details: `${note}. Nominal: Rp ${amount}`,
        operator: 'Super Admin',
        created_at: new Date().toISOString(),
      }).then(() => null).catch(() => null);

      return res.json({ success: true, amount, remaining_balance: 0, recorded_at: new Date().toISOString() });
    } catch (error) {
      return res.status(500).json({ error: `Penarikan saldo platform gagal: ${error.message}` });
    }
  }

  db.get('SELECT balance FROM platform_wallet WHERE id = 1', (readError, row) => {
    if (readError) return res.status(500).json({ error: readError.message });
    const amount = Number(row?.balance || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Saldo komisi platform kosong.' });
    db.run('UPDATE platform_wallet SET balance = 0 WHERE id = 1', (updateError) => {
      if (updateError) return res.status(500).json({ error: updateError.message });
      return res.json({ success: true, amount, remaining_balance: 0, recorded_at: new Date().toISOString() });
    });
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Professional Backend API running on port ${PORT}`);
  });
}

module.exports = app;
