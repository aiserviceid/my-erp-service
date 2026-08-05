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
const fs = require('fs');

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

app.put('/api/tenant/settings', (req, res) => {
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

// API: Transactions (POS Checkout)
app.post('/api/transactions', (req, res) => {
  const { tenant_code, type, amount, description } = req.body;
  db.run('INSERT INTO transactions (tenant_code, type, amount, description) VALUES (?, ?, ?, ?)', 
  [tenant_code, type, amount, description], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, success: true });
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
app.get('/api/services/:tenant', (req, res) => {
  db.all('SELECT * FROM services WHERE tenant_code = ? ORDER BY created_at DESC', [req.params.tenant], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/services/finish', (req, res) => {
  const { resi, status, part_fee, jasa_fee, technician_id, issue } = req.body;
  db.run(
    'UPDATE services SET status = COALESCE(?, status), part_fee = COALESCE(?, part_fee), jasa_fee = COALESCE(?, jasa_fee), technician_id = COALESCE(?, technician_id), issue = COALESCE(?, issue) WHERE resi = ?',
    [status, part_fee, jasa_fee, technician_id, issue, resi],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/services/update', (req, res) => {
  const { resi, technician_id, issue } = req.body;
  if (!resi) return res.status(400).json({ error: 'Resi wajib diisi' });
  db.run(
    'UPDATE services SET technician_id = COALESCE(?, technician_id), issue = COALESCE(?, issue) WHERE resi = ?',
    [technician_id, issue, resi],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Servis tidak ditemukan' });
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

app.get('/api/admin/stats', (req, res) => {
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

app.put('/api/admin/withdrawals/:id/approve', (req, res) => {
  db.run('UPDATE withdrawals SET status = ? WHERE id = ?', ['SUCCESS', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Professional Backend API running on port ${PORT}`);
  });
}

module.exports = app;
