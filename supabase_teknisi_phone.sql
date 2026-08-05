-- ============================================================
-- AISERVICE.ID — Migrasi Database: Nomor WhatsApp Teknisi
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- Tambahkan kolom nomor WhatsApp pada tabel users (teknisi/karyawan)
-- Kolom ini dipakai untuk mengirim notifikasi penugasan otomatis via WhatsApp
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- (Opsional) Index untuk mempercepat pencarian berdasarkan nomor WA
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
