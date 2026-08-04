-- ============================================================
-- AISERVICE.ID — Migrasi Database: Nomor WhatsApp Pelanggan (CRM)
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- Tambahkan kolom nomor WhatsApp pada tabel tenants (toko/pelanggan)
-- Kolom ini dipakai oleh form pendaftaran toko dan ditampilkan
-- di menu CRM Pelanggan pada Super Admin.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- (Opsional) Index untuk mempercepat pencarian berdasarkan nomor WA
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
