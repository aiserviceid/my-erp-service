const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create a data directory if it doesn't exist
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dataDir = isVercel ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Tables
    db.serialize(() => {
      // 1. Tenants (Stores)
      db.run(`CREATE TABLE IF NOT EXISTS tenants (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT DEFAULT 'free',
        settings TEXT,
        reputation_points INTEGER DEFAULT 0
      )`);
      
      // Try to add column if table already exists from previous version
      db.run("ALTER TABLE tenants ADD COLUMN reputation_points INTEGER DEFAULT 0", (err) => {});
      db.run("ALTER TABLE tenants ADD COLUMN wallet_balance INTEGER DEFAULT 0", (err) => {});
      db.run("ALTER TABLE tenants ADD COLUMN bank_details TEXT", (err) => {});
      db.run("ALTER TABLE tenants ADD COLUMN pin TEXT DEFAULT ''", (err) => {});
      db.run("ALTER TABLE tenants ADD COLUMN phone TEXT DEFAULT ''", (err) => {});

      // 2. Users (Employees/Admins)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        pin TEXT NOT NULL,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);

      // 3. Products
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        stock INTEGER DEFAULT 0,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);

      // 4. Services
      db.run(`CREATE TABLE IF NOT EXISTS services (
        resi TEXT PRIMARY KEY,
        tenant_code TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        device_name TEXT NOT NULL,
        issue TEXT NOT NULL,
        status TEXT DEFAULT 'PROSES',
        jasa_fee INTEGER DEFAULT 0,
        part_fee INTEGER DEFAULT 0,
        technician_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code),
        FOREIGN KEY (technician_id) REFERENCES users(id)
      )`);

      // 5. Transactions (Financials)
      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT,
        type TEXT NOT NULL, -- 'INCOME' or 'EXPENSE'
        amount INTEGER NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);

      // 6. Forum Threads
      db.run(`CREATE TABLE IF NOT EXISTS forum_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT,
        author_name TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        is_solved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);

      // 7. Forum Posts (Replies)
      db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        tenant_code TEXT,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        is_solution INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);

      // 8. Platform Wallet (Developer Balance)
      db.run(`CREATE TABLE IF NOT EXISTS platform_wallet (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        balance INTEGER DEFAULT 0
      )`, () => {
        // Ensure row exists
        db.run(`INSERT OR IGNORE INTO platform_wallet (id, balance) VALUES (1, 0)`);
      });

      // 9. Withdrawals
      db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT NOT NULL,
        amount INTEGER NOT NULL,
        bank_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_name TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_code) REFERENCES tenants(code)
      )`);
    });
  }
});

module.exports = db;
