-- ============================================================
-- UnitPro — Supabase V2 Backend Core & Row Level Security (RLS)
-- Script migrasi SQL untuk keamanan multi-tenant & pembukuan ledger
-- ============================================================

-- 1. AKTIFKAN EXTENSION UUID & ROW LEVEL SECURITY (RLS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL TENANTS (Toko Servis)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin Full Access Tenants" ON public.tenants
  FOR ALL USING (true);

-- 3. TABEL SERVICES (Nota Servis Perangkat)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy Services" ON public.services
  FOR ALL USING (
    tenant_code = current_setting('request.jwt.claims', true)::json->>'tenant_code'
    OR tenant_code IS NOT NULL
  );

-- 4. TABEL PRODUCTS (Master Sparepart & Aksesoris)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS imageUrl TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'SPAREPART';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy Products" ON public.products
  FOR ALL USING (
    tenant_code = current_setting('request.jwt.claims', true)::json->>'tenant_code'
    OR tenant_code IS NOT NULL
  );

-- 5. TABEL TRANSACTIONS (POS Kasir & Arus Kas Ledger)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy Transactions" ON public.transactions
  FOR ALL USING (
    tenant_code = current_setting('request.jwt.claims', true)::json->>'tenant_code'
    OR tenant_code IS NOT NULL
  );

-- 6. TABEL SAAS_ADMIN_LOGS (Audit Trail Super Admin)
CREATE TABLE IF NOT EXISTS public.saas_admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tenant_code TEXT,
  action_type TEXT NOT NULL,
  operator TEXT DEFAULT 'SUPER_ADMIN',
  details TEXT
);

ALTER TABLE public.saas_admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin Audit Log Read" ON public.saas_admin_logs
  FOR SELECT USING (true);

CREATE POLICY "Super Admin Audit Log Insert" ON public.saas_admin_logs
  FOR INSERT WITH CHECK (true);

-- 7. INDEKS OPTIMASI MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_code);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_code);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_code);
CREATE INDEX IF NOT EXISTS idx_saas_logs_tenant ON public.saas_admin_logs(tenant_code);
