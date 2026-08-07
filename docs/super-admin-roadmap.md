# Roadmap Super Admin UnitPro

Dokumen ini disimpan sebagai rencana lanjutan setelah stabilisasi V1 UnitPro selesai. Fokus Super Admin adalah menjadi pusat kontrol SaaS, bukan menu operasional toko.

## Tujuan Super Admin

Super Admin digunakan oleh pemilik platform UnitPro untuk mengontrol:

- tenant atau toko pengguna,
- paket Free / Pro / Enterprise,
- trial, billing, expired, dan suspend,
- landing page dan pricing,
- broadcast pengumuman,
- monitoring toko,
- support dan audit aktivitas penting.

---

## Ringkasan Batch

| Batch | Fokus | Prioritas |
|---|---|---|
| Batch 13 | Super Admin SaaS Control Center | Wajib |
| Batch 14 | Landing Page CMS + Pricing Control | Wajib |
| Batch 15 | Billing, Trial, Expired, Suspend | Wajib |
| Batch 16 | Support Center + Monitoring Toko | Penting |
| Batch 17 | Security, Audit Log, Role Super Admin | Penting |
| Batch 18 | Broadcast, Announcement, Update APK | Tambahan kuat |

---

# Batch 13 — Super Admin SaaS Control Center

## Tujuan

Membuat Super Admin menjadi pusat kendali semua toko pengguna UnitPro.

## Fitur utama

| Modul | Fungsi |
|---|---|
| Dashboard SaaS | Lihat total toko, toko trial, toko Pro, toko expired, toko suspend |
| Statistik Platform | Total servis semua toko, total transaksi, toko paling aktif |
| Manajemen Tenant | Lihat semua toko, detail toko, owner, nomor WhatsApp, status paket |
| Kontrol Paket | Ubah Free / Pro / Enterprise |
| Kontrol Status | Aktifkan, suspend, expired, perpanjang |
| Pemakaian Toko | Lihat jumlah servis, produk, karyawan, transaksi |

## Tampilan menu Super Admin

```text
Super Admin
├── Dashboard SaaS
├── Manajemen Toko
├── Paket & Limit
├── Billing
├── Landing Page
├── Broadcast
├── Support
├── Security Log
└── Pengaturan Platform
```

## Data yang perlu ditambahkan

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_until TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS internal_note TEXT;
```

## Acceptance Criteria

Batch 13 dianggap selesai kalau:

- Super Admin bisa melihat semua toko.
- Bisa ubah paket toko.
- Bisa suspend / aktifkan toko.
- Bisa lihat toko mana yang trial, Pro, expired.
- Bisa lihat aktivitas toko.
- Tidak mengganggu dashboard admin toko.

---

# Batch 14 — Landing Page CMS + Pricing Control

## Tujuan

Agar landing page bisa diubah dari Super Admin tanpa edit kode.

## Fitur utama

| Modul | Fungsi |
|---|---|
| Hero Section | Ubah headline, subheadline, CTA |
| Harga Paket | Ubah harga Free / Pro / Enterprise |
| Promo Banner | Aktifkan promo 30 hari, diskon, bonus |
| Feature List | Atur fitur unggulan yang muncul di landing page |
| Testimonial | Tambah/edit testimoni toko |
| FAQ | Tambah/edit pertanyaan umum |
| CTA WhatsApp | Ubah nomor WhatsApp admin pusat dan teks default |
| Preview | Lihat hasil sebelum publish |

## Struktur setting

```sql
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  landing_config JSONB DEFAULT '{}',
  pricing_config JSONB DEFAULT '{}',
  whatsapp_config JSONB DEFAULT '{}',
  feature_flags JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Contoh `landing_config`:

```json
{
  "headline": "Software Servis Modern untuk Toko HP & Laptop",
  "subheadline": "Kelola servis, kasir, stok, teknisi, nota, dan WhatsApp dalam satu aplikasi.",
  "ctaText": "Coba Gratis 30 Hari",
  "ctaWhatsapp": "628xxxxxxxxxx",
  "promoBanner": "Promo launching Rp149.000/bulan"
}
```

## Acceptance Criteria

Batch 14 selesai kalau:

- Super Admin bisa edit headline landing page.
- Bisa edit harga paket.
- Bisa edit nomor WhatsApp CTA.
- Bisa aktif/nonaktif promo banner.
- Landing page membaca data dari `platform_settings`.
- Kalau setting kosong, landing page tetap pakai default bawaan.

---

# Batch 15 — Billing, Trial, Expired, Suspend

## Tujuan

Supaya UnitPro siap jadi SaaS berbayar: ada masa trial, expired, dan kontrol pembayaran.

## Fitur utama

| Modul | Fungsi |
|---|---|
| Trial 30 Hari | Set otomatis toko baru trial 30 hari |
| Active Until | Tanggal aktif langganan |
| Expired Warning | Tampilkan peringatan sebelum habis |
| Suspend Toko | Batasi akses kalau masa aktif habis |
| Manual Payment Record | Catat pembayaran manual |
| Reminder WhatsApp | Buka WhatsApp reminder pembayaran |
| Upgrade Button | Toko expired diarahkan upgrade |

## Tabel billing

```sql
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  package_name TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'paid',
  paid_at TIMESTAMP DEFAULT NOW(),
  active_from TIMESTAMP,
  active_until TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant_code ON billing_records(tenant_code);
```

## Flow billing

```text
Toko daftar
↓
Trial 30 hari aktif
↓
H-7 muncul reminder upgrade
↓
H-3 reminder lebih kuat
↓
Expired
↓
Akses dibatasi
↓
Bayar manual
↓
Super Admin perpanjang active_until
↓
Toko aktif lagi
```

## Acceptance Criteria

Batch 15 selesai kalau:

- Super Admin bisa set tanggal aktif toko.
- Super Admin bisa catat pembayaran.
- Toko expired terlihat jelas.
- Toko expired bisa dibatasi.
- Ada tombol WhatsApp reminder pembayaran.
- Paket Pro/Enterprise bisa diperpanjang manual.

---

# Batch 16 — Support Center + Monitoring Toko

## Tujuan

Memudahkan pemilik platform membantu toko yang mengalami masalah.

## Fitur utama

| Modul | Fungsi |
|---|---|
| Detail Toko | Lihat data toko lengkap |
| Health Score | Cek kesiapan toko |
| Error Checklist | Lihat potensi masalah data |
| Kontak Owner | Tombol WhatsApp owner toko |
| Aktivitas Terakhir | Servis terakhir, transaksi terakhir |
| Data Completeness | Cek apakah toko punya produk, teknisi, servis |
| Support Note | Catatan internal dari Super Admin |

## Catatan keamanan

Untuk awal jangan buat impersonate login bebas. Kalau nanti diperlukan, buat mode aman:

```text
Login Bantuan View Only
```

Bukan login penuh yang bisa mengubah data toko.

## Acceptance Criteria

Batch 16 selesai kalau:

- Super Admin bisa buka detail toko.
- Bisa lihat apakah toko aktif atau bermasalah.
- Bisa klik WhatsApp owner.
- Bisa simpan catatan internal.
- Bisa lihat aktivitas terakhir toko.

---

# Batch 17 — Security, Audit Log, Role Super Admin

## Tujuan

Semua aksi penting Super Admin tercatat.

## Aksi yang wajib masuk audit log

| Aksi | Audit Log |
|---|---|
| Ubah paket toko | Ya |
| Suspend toko | Ya |
| Aktifkan toko | Ya |
| Ubah tanggal expired | Ya |
| Ubah harga landing page | Ya |
| Ubah CTA WhatsApp | Ya |
| Kirim broadcast | Ya |

## Tabel audit log

```sql
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at
ON platform_audit_logs(created_at);
```

## Role Super Admin

| Role | Fungsi |
|---|---|
| SUPER_ADMIN | Akses penuh platform |
| SUPPORT_ADMIN | Lihat toko dan support, tidak bisa ubah billing |
| BILLING_ADMIN | Kelola pembayaran dan masa aktif |
| CONTENT_ADMIN | Kelola landing page dan promo |

Untuk awal cukup `SUPER_ADMIN` dulu. Role detail bisa menyusul.

---

# Batch 18 — Broadcast, Announcement, Update APK

## Tujuan

Super Admin bisa mengirim info update ke semua toko.

## Fitur utama

| Modul | Fungsi |
|---|---|
| Announcement | Banner di dashboard toko |
| Broadcast WhatsApp Manual | Generate link WhatsApp untuk owner toko |
| Update APK Notice | Info versi Android terbaru |
| Maintenance Notice | Pengumuman maintenance |
| Promo Upgrade | Dorong toko Free upgrade ke Pro |

## Tabel announcement

```sql
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_tier TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Acceptance Criteria

Batch 18 selesai kalau:

- Super Admin bisa membuat pengumuman.
- Dashboard toko bisa menampilkan pengumuman aktif.
- Bisa target semua toko / Free / Pro.
- Bisa tampilkan info update APK.

---

# Urutan Eksekusi Terbaik

Urutan yang paling aman:

```text
Final QA V1
↓
Merge PR #16
↓
Batch 13 — Super Admin SaaS Control Center
↓
Batch 15 — Billing Trial Expired Suspend
↓
Batch 14 — Landing Page CMS
↓
Batch 16 — Support Center
↓
Batch 17 — Audit Log
↓
Batch 18 — Broadcast & Announcement
```

## Prioritas Final

| Prioritas | Batch | Kenapa |
|---|---|---|
| 1 | Batch 13 | Perlu kontrol semua toko dulu |
| 2 | Batch 15 | SaaS butuh trial, expired, dan perpanjangan |
| 3 | Batch 14 | Landing page harus bisa diubah tanpa edit kode |
| 4 | Batch 16 | Support toko penting setelah mulai dijual |
| 5 | Batch 17 | Audit log penting sebelum tim bertambah |
| 6 | Batch 18 | Broadcast berguna setelah user mulai banyak |

## Catatan Strategis

Super Admin jangan terlalu cepat dibuat rumit seperti WordPress atau ERP internal besar. Untuk fase awal, fokus pada kontrol bisnis SaaS:

1. tenant,
2. paket,
3. billing,
4. landing page dasar,
5. support,
6. audit,
7. broadcast.

Ini sudah cukup untuk mulai menjual UnitPro dengan lebih rapi dan aman.
