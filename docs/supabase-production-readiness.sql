-- UnitPro / ServiceOS — Supabase Production Readiness SQL
-- Jalankan bertahap di Supabase SQL Editor sebelum jual massal.
-- Aman untuk schema dasar karena memakai IF NOT EXISTS.

-- 1) Produk: foto & kategori permanen lintas perangkat
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'SPAREPART';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_code TEXT;

-- 2) User/teknisi: nomor WhatsApp untuk notifikasi tugas
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_code TEXT;

-- 3) Servis: tenant dan metadata nota
ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_code TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS jasa_fee NUMERIC DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS part_fee NUMERIC DEFAULT 0;

-- 4) Transaksi: tenant dan tipe laporan
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tenant_code TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'INCOME';

-- 5) Index penting untuk performa dashboard multi-tenant
CREATE INDEX IF NOT EXISTS idx_products_tenant_code ON products(tenant_code);
CREATE INDEX IF NOT EXISTS idx_services_tenant_code ON services(tenant_code);
CREATE INDEX IF NOT EXISTS idx_services_resi_tenant ON services(resi, tenant_code);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_code ON transactions(tenant_code);
CREATE INDEX IF NOT EXISTS idx_users_tenant_code ON users(tenant_code);

-- 6) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- CATATAN RLS:
-- Jangan langsung ENABLE RLS penuh sebelum semua write/read diarahkan lewat backend aman.
-- Current app masih punya beberapa jalur direct Supabase client.
-- RLS final disarankan setelah endpoint backend transaksi/servis/produk sudah jadi sumber utama.
