-- 1. Tenants (Stores)
CREATE TABLE IF NOT EXISTS tenants (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  settings JSONB,
  reputation_points INTEGER DEFAULT 0,
  wallet_balance INTEGER DEFAULT 0,
  bank_details JSONB,
  pin TEXT DEFAULT '',
  phone TEXT DEFAULT ''
);

-- 2. Users (Employees/Admins)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin TEXT NOT NULL
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  name TEXT NOT NULL,
  price BIGINT NOT NULL,
  stock INTEGER DEFAULT 0
);

-- 4. Services
CREATE TABLE IF NOT EXISTS services (
  resi TEXT PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_name TEXT NOT NULL,
  issue TEXT NOT NULL,
  status TEXT DEFAULT 'PROSES',
  jasa_fee BIGINT DEFAULT 0,
  part_fee BIGINT DEFAULT 0,
  technician_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transactions (Financials)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Forum Threads
CREATE TABLE IF NOT EXISTS forum_threads (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  is_solved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Forum Posts (Replies)
CREATE TABLE IF NOT EXISTS forum_posts (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT REFERENCES forum_threads(id) ON DELETE CASCADE,
  tenant_code TEXT REFERENCES tenants(code),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_solution INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Platform Wallet
CREATE TABLE IF NOT EXISTS platform_wallet (
  id INTEGER PRIMARY KEY DEFAULT 1,
  balance BIGINT DEFAULT 0
);

-- 9. Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  amount BIGINT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO platform_wallet (id, balance) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- 10. Stock Movements (Audit Log)
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  tenant_code TEXT REFERENCES tenants(code),
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  change_amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for open API access
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_wallet DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
