-- UnitPro - Komentar dan Rating Landing Page
-- Jalankan sekali di Supabase Dashboard > SQL Editor.

CREATE TABLE IF NOT EXISTS platform_reviews (
  id BIGSERIAL PRIMARY KEY,
  author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 2 AND 50),
  author_role TEXT CHECK (author_role IS NULL OR char_length(author_role) <= 80),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_reviews_created_at
  ON platform_reviews (created_at DESC);

-- Pengunjung hanya dapat membaca ulasan yang tampil dan mengirim ulasan baru.
-- Menghapus ulasan tidak dapat dilakukan dari browser publik; endpoint Super
-- Admin memakai Supabase service role di server.
ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON platform_reviews TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE platform_reviews_id_seq TO anon, authenticated;
REVOKE UPDATE, DELETE ON platform_reviews FROM anon, authenticated;

DROP POLICY IF EXISTS "public can read visible platform reviews" ON platform_reviews;
CREATE POLICY "public can read visible platform reviews"
  ON platform_reviews FOR SELECT
  USING (is_visible = TRUE);

DROP POLICY IF EXISTS "public can submit platform reviews" ON platform_reviews;
CREATE POLICY "public can submit platform reviews"
  ON platform_reviews FOR INSERT
  WITH CHECK (
    is_visible = TRUE
    AND char_length(author_name) BETWEEN 2 AND 50
    AND (author_role IS NULL OR char_length(author_role) <= 80)
    AND rating BETWEEN 1 AND 5
    AND char_length(content) BETWEEN 10 AND 500
  );
