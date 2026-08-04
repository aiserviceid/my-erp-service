-- ============================================================
-- Reset Password Super Admin — AISERVICE.ID
-- Password baru : AISERVICE@Syaifudin2026!
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Pastikan tabel app_config ada (aman dijalankan meski tabel sudah ada)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Simpan hash SHA-256 dari password baru
INSERT INTO app_config (key, value)
VALUES ('super_admin_hash', 'd2196d144201d2b36e3dedd3faa889ed8e815217173dfe08448881876e9f22c8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
