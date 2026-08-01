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

const JWT_SECRET = 'rahasia-negara-erp-saas-2026';

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API: Register / Login Tenant
app.post('/api/tenant/login', async (req, res) => {
  const { code, name, pin } = req.body;
  if (!code || !pin) return res.status(400).json({ error: 'Kode Cabang dan PIN wajib diisi' });

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
      
      const token = jwt.sign({ code: row.code, role: 'tenant' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ ...row, token });
    } else {
      // Create new tenant if not exists
      const hashedPin = await bcrypt.hash(pin, 10);
      const defaultSettings = JSON.stringify({ theme: 'laptop', storeName: name || 'Toko Baru', ads: [] });
      db.run('INSERT INTO tenants (code, name, settings, pin) VALUES (?, ?, ?, ?)', [code, name || 'Toko Baru', defaultSettings, hashedPin], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const token = jwt.sign({ code, role: 'tenant' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ code, name: name || 'Toko Baru', tier: 'free', settings: defaultSettings, token });
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
  db.all('SELECT id, name, role FROM users WHERE tenant_code = ?', [req.params.tenant], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', async (req, res) => {
  const { tenant_code, name, role, pin } = req.body;
  const hashedPin = await bcrypt.hash(pin, 10);
  db.run('INSERT INTO users (tenant_code, name, role, pin) VALUES (?, ?, ?, ?)', [tenant_code, name, role, hashedPin], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, role });
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
  const { resi, status, part_fee, jasa_fee } = req.body;
  db.run('UPDATE services SET status = ?, part_fee = ?, jasa_fee = ? WHERE resi = ?', 
  [status, part_fee, jasa_fee, resi], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
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

app.listen(PORT, () => {
  console.log(`Professional Backend API running on port ${PORT}`);
});
