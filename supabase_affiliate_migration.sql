-- ============================================================
-- AISERVICE.ID — Migrasi Database Sistem Afiliasi
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabel data afiliasi per toko
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT UNIQUE NOT NULL,
  affiliate_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_earned BIGINT DEFAULT 0,     -- total komisi yang sudah dibayar (dalam rupiah)
  total_pending BIGINT DEFAULT 0,    -- total komisi yang menunggu (dalam rupiah)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel riwayat komisi per referral
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_tenant_code TEXT NOT NULL,         -- pemilik kode afiliasi
  referred_tenant_code TEXT NOT NULL,          -- toko yang bergabung via referral
  referred_tenant_name TEXT,
  tier_purchased TEXT NOT NULL,                -- 'pro' atau 'enterprise'
  base_amount BIGINT NOT NULL,                 -- harga paket (49000 atau 79000)
  commission_rate NUMERIC(4,2) DEFAULT 0.80,  -- 80%
  commission_amount BIGINT NOT NULL,           -- komisi yang diterima
  status TEXT DEFAULT 'PENDING',               -- PENDING / PAID
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- 3. Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_affiliates_tenant ON affiliates(tenant_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate ON affiliate_commissions(affiliate_tenant_code);
CREATE INDEX IF NOT EXISTS idx_aff_comm_referred ON affiliate_commissions(referred_tenant_code);
CREATE INDEX IF NOT EXISTS idx_aff_comm_status ON affiliate_commissions(status);

-- 4. Row-Level Security (RLS) — Opsional, aktifkan jika perlu
-- ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELESAI! Setelah menjalankan SQL di atas, sistem afiliasi
-- akan aktif secara otomatis di aplikasi.
-- ============================================================
