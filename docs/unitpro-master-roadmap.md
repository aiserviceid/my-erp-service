# UnitPro Master Roadmap — Batch 1 dan Seterusnya

Versi: 1.0  
Tanggal: 8 Agustus 2026  
Status: Dokumen master penyatuan roadmap UnitPro setelah stabilisasi V1, sinkronisasi paket, landing page, Super Admin, Promo Pro, WhatsApp Marketing, dan Android Update.

---

## Tujuan Dokumen

Dokumen ini menyatukan semua roadmap yang sebelumnya tersebar agar tidak membingungkan.

Prinsip utama UnitPro:

> Sekali kasir memasukkan data, seluruh sistem ikut bekerja.  
> Sekali teknisi mengubah progres, admin dan pelanggan ikut mengetahui.  
> Sekali transaksi terjadi, stok, keuangan, nota, dashboard, tracking, dan laporan ikut berubah.

North Star:

> Mengurangi pekerjaan admin toko servis dan meningkatkan omzet pemilik toko.

---

## Status Global Saat Ini

| Area | Status |
|---|---|
| V1 stabilisasi utama | Selesai dan sudah masuk main |
| Dashboard admin premium | Selesai |
| Servis / teknisi / kasir | Selesai untuk V1, perlu QA lanjutan |
| Inventori foto/kategori | Selesai |
| CRM pelanggan | Selesai dasar |
| WhatsApp Marketing manual | Selesai dasar |
| Laporan owner premium | Selesai dasar |
| Security readiness | Selesai panel/dokumen, RLS penuh belum |
| Paket Free/Pro/Enterprise/White Label | Sudah disinkronkan, perlu QA berkala |
| Promo publik Pro | Belum selesai, masuk Batch 23 |
| Fonnte Marketing Automation | Belum selesai, masuk Batch 24 |
| Android update manager otomatis | Belum selesai, masuk Batch 25 |
| Super Admin lengkap | Belum selesai, mulai Batch 20+ |
| V2 backend core aman | Belum, tahap setelah V1 stabil dijual/test user |

---

## Pembagian Paket Final

### Free

Untuk coba dan toko kecil.

| Limit | Free |
|---|---:|
| Servis | 25 servis/bulan |
| Transaksi POS | 50 transaksi/bulan |
| Produk | 50 produk |
| Karyawan / teknisi / kasir | 0 akun tambahan |
| WhatsApp Marketing | Tidak aktif |
| Iklan & Promo | Tidak aktif |
| Export Excel | Tidak aktif |
| Katalog publik | Tidak aktif / dibatasi |

### Pro

Paket utama yang dijual.

| Area | Pro |
|---|---|
| Servis | Unlimited |
| Kasir/POS | Unlimited |
| Produk | Unlimited |
| Karyawan | Sampai 20 akun |
| Teknisi | Penugasan aktif |
| WhatsApp pelanggan | Aktif |
| CRM pelanggan | Aktif |
| WA Marketing | Aktif |
| Iklan & Promo | Aktif setelah Batch 23 |
| Katalog publik | Aktif |
| Laporan owner | Aktif |
| Export Excel | Aktif |
| Branding toko | Aktif |

### Enterprise

Untuk banyak cabang/outlet.

| Area | Enterprise |
|---|---|
| Cabang | Sampai 5 outlet tahap awal |
| Karyawan | Sampai 50 akun |
| Laporan cabang | Roadmap |
| Support prioritas | Roadmap |

### White Label / Partner

Paket khusus, bukan pendaftaran umum.

| Area | White Label |
|---|---|
| Harga publik | Tidak ditampilkan |
| CTA | Hubungi Partner / Konsultasi |
| Brand sendiri | Ya |
| Domain sendiri | Ya, roadmap |
| APK brand sendiri | Ya, roadmap |
| Panel kelola client | Ya, roadmap |
| Source code | Tidak dijual default |

---

# Roadmap Batch Utama

## Batch 1 — Service Core Fix

Status: Selesai / sudah masuk V1.

Tujuan:
- status awal servis konsisten,
- edit keterangan nota,
- biaya jasa, sparepart, dan diskon tersimpan,
- update servis aman per tenant.

Checklist:
- status awal `PROSES`,
- admin bisa edit nota,
- biaya jasa dan sparepart bisa disimpan,
- discount nota bisa disimpan,
- update servis membawa `tenant_code`.

---

## Batch 2 — Employee Notification Service

Status: Selesai / sudah masuk V1.

Tujuan:
- teknisi/kasir/pelanggan bisa mendapat notifikasi WhatsApp dari Portal Karyawan.

Checklist:
- service `notificationService.js`,
- normalisasi nomor WA,
- fallback manual `wa.me`,
- support mode Fonnte dasar.

---

## Batch 3 — Admin Notification Service

Status: Selesai / sudah masuk V1.

Tujuan:
- admin bisa mengirim status servis dan link tracking ke pelanggan.

Checklist:
- kirim WA status servis,
- kirim link tracking,
- template pesan lebih rapi,
- integrasi dengan pengaturan toko.

---

## Batch 4 — Security Tenant Guard

Status: Selesai dasar / RLS penuh belum.

Tujuan:
- mencegah data toko bercampur antar tenant.

Checklist:
- backend guard untuk service update,
- update berdasarkan resi + tenant,
- tenant code dipakai di flow utama.

Catatan:
- Jangan aktifkan RLS penuh sebelum semua jalur baca/tulis lewat backend aman.

---

## Batch 5 — POS Stock Guard

Status: Selesai V1 / atomic backend penuh belum.

Tujuan:
- kasir tidak bisa menjual stok fisik yang kurang.

Checklist:
- validasi stok saat checkout,
- jasa tidak mengurangi stok,
- rollback best-effort jika transaksi gagal,
- format uang Indonesia.

Catatan:
- V2 perlu atomic transaction backend.

---

## Batch 6 — Finance Guard

Status: Selesai V1.

Tujuan:
- laporan keuangan tidak double count.

Checklist:
- transaksi pelunasan servis tidak dobel,
- POS dan servis dibedakan,
- status `DIAMBIL` menjadi acuan pembayaran selesai,
- income/expense lebih konsisten.

---

## Batch 7 — Customer Tracking Privacy

Status: Selesai V1.

Tujuan:
- tracking publik aman dan tidak membocorkan data berlebihan.

Checklist:
- data publik dibatasi,
- nomor pelanggan disamarkan,
- resi disanitasi,
- status tracking tetap jelas.

---

## Batch 8 — UX Mobile Regression

Status: Selesai V1.

Tujuan:
- aplikasi tidak blank saat error dan punya checklist QA.

Checklist:
- AppErrorBoundary,
- regression checklist,
- mobile layout dasar lebih aman.

---

## Batch 9 — V1 Stabilization Integration

Status: Selesai / PR integrasi sudah merge ke main.

Tujuan:
- menggabungkan batch stabilisasi menjadi satu jalur release.

Checklist:
- build web sukses,
- APK debug berhasil dibuat,
- PR stabilisasi merge,
- branch lama tidak perlu dipakai lagi.

Catatan:
- Smoke test lama pernah menggantung, jadi perlu QA manual tetap dilakukan.

---

## Batch 10 — Logo & Branding UnitPro Resmi

Status: Selesai dasar.

Tujuan:
- seluruh aplikasi memakai identitas UnitPro yang konsisten.

Checklist:
- logo UnitPro resmi,
- watermark,
- favicon,
- Android icon vector,
- navbar landing memakai wordmark resmi.

Catatan:
- Jika ada logo PNG resmi baru, asset bisa diganti lagi.

---

## Batch 11 — Premium Feedback System

Status: Selesai dasar.

Tujuan:
- mengganti alert browser menjadi feedback lebih premium.

Checklist:
- global toast,
- premium confirm modal,
- konfirmasi WA/print/delete lebih rapi.

Lanjutan:
- hapus sisa alert lama secara bertahap.

---

## Batch 12 — Dashboard Admin Premium Simple

Status: Selesai.

Tujuan:
- dashboard owner lebih ringkas dan tidak membingungkan.

Checklist:
- Ringkasan Owner,
- metric harian,
- tren omzet 7 hari compact,
- stok kritis,
- servis terbaru.

---

## Batch 13 — Flow Selesai Servis Final

Status: Selesai V1.

Tujuan:
- admin dan teknisi punya alur selesai servis yang konsisten.

Checklist:
- selesai servis bisa isi jasa tanpa sparepart,
- modal tagihan jelas,
- kirim WA pelanggan setelah selesai,
- teknisi bisa menyelesaikan tugas,
- jasa dikenali dari kategori/nama.

---

## Batch 14 — Flow Kasir/POS 100% Mulus

Status: Selesai V1.

Tujuan:
- POS siap dipakai kasir harian.

Checklist:
- jual produk fisik,
- jual jasa,
- stok jasa tidak berkurang,
- diskon tervalidasi,
- cash/kembalian format Indonesia,
- mobile POS lebih nyaman.

Lanjutan:
- atomic backend transaction untuk V2.

---

## Batch 15 — Inventori & Stok Mulus

Status: Selesai V1.

Tujuan:
- produk, foto, kategori, dan stok tersimpan permanen.

Checklist:
- `category`,
- `image_url`,
- edit barang aktif,
- upload foto,
- kategori JASA/SPAREPART,
- data tetap setelah refresh.

SQL penting:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'SPAREPART';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
NOTIFY pgrst, 'reload schema';
```

---

## Batch 16 — Mobile & APK Polish

Status: Selesai dasar.

Tujuan:
- tampilan nyaman untuk Android/PWA.

Checklist:
- tidak overflow horizontal,
- grid produk 2 kolom mobile,
- search sticky,
- cart sticky aman,
- checkout bottom sheet,
- touch target lebih besar.

---

## Batch 17 — CRM Pelanggan Dasar

Status: Selesai V1.

Tujuan:
- owner melihat pelanggan yang bisa di-follow-up.

Checklist:
- total pelanggan,
- nomor WA tersedia,
- repeat customer,
- siap diambil,
- aktif 30 hari,
- lama tidak datang,
- pembeli POS.

---

## Batch 18 — WhatsApp Marketing Pro Manual

Status: Selesai dasar / belum otomatis Fonnte.

Tujuan:
- Pro punya alat follow-up pelanggan.

Checklist:
- segmentasi pelanggan,
- template pesan,
- preview pesan,
- salin nomor segment,
- buka WA target pertama.

Belum:
- kirim massal via Fonnte,
- log campaign,
- batch limit,
- endpoint backend aman.

Lanjutan: Batch 24.

---

## Batch 19 — Laporan Owner Premium + Onboarding + Security Readiness

Status: Selesai dasar.

Tujuan:
- owner lebih mudah membaca laporan dan toko baru punya panduan setup.

Checklist:
- laporan owner premium,
- omzet hari ini,
- pengeluaran,
- net profit bulan ini,
- sumber uang POS/servis,
- onboarding toko baru,
- security readiness panel,
- SQL readiness.

Catatan:
- RLS penuh belum diaktifkan.

---

## Batch 20 — Super Admin SaaS Control Center

Status: Roadmap / belum lengkap.

Tujuan:
- Super Admin menjadi pusat kontrol SaaS UnitPro.

Fitur:
- dashboard SaaS,
- total toko,
- toko trial,
- toko Pro,
- toko expired,
- toko suspend,
- manajemen tenant,
- ubah paket,
- aktifkan/suspend toko,
- lihat penggunaan toko.

Acceptance Criteria:
- Super Admin bisa lihat semua toko,
- bisa ubah paket,
- bisa suspend/aktifkan,
- bisa lihat aktivitas toko,
- tidak mengganggu dashboard admin toko.

---

## Batch 21 — Billing, Trial, Expired, Suspend

Status: Roadmap / wajib sebelum jual massal.

Tujuan:
- SaaS punya kontrol masa aktif dan pembayaran.

Fitur:
- trial 30 hari,
- active_until,
- expired warning,
- suspend toko,
- catat pembayaran manual,
- reminder WA pembayaran,
- upgrade button.

Tabel disarankan:

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
```

---

## Batch 22 — Landing Page CMS + Pricing Control

Status: Roadmap / sebagian pricing landing sudah disinkronkan.

Tujuan:
- Super Admin bisa mengubah landing page tanpa edit kode.

Fitur:
- headline,
- subheadline,
- harga paket,
- promo banner landing UnitPro,
- FAQ,
- testimonial,
- CTA WhatsApp,
- preview sebelum publish.

Catatan:
- Ini untuk landing UnitPro, bukan promo toko tenant.

---

## Batch 23 — Promo Banner Publik Pro

Status: Roadmap / belum selesai.

Tujuan:
- menu Iklan & Promo benar-benar tampil di halaman publik toko.

Fitur masuk Paket Pro/Enterprise.

Lokasi tampil:
- `/katalog/:tenantCode`,
- `/tracking?resi=...`,
- teks pendek di nota/struk.

Aturan:
- Free terkunci,
- Pro aktif,
- Enterprise aktif,
- maksimal 3 promo aktif,
- bisa aktif/nonaktif,
- data tetap setelah refresh.

Acceptance Criteria:
- form promo menyimpan data permanen,
- promo muncul di katalog,
- promo muncul di tracking,
- teks promo muncul di nota tanpa merusak thermal,
- build berhasil.

---

## Batch 24 — WhatsApp Marketing Fonnte Automation

Status: Roadmap / belum selesai.

Tujuan:
- token Fonnte bukan hanya disimpan, tapi dipakai untuk campaign marketing Pro.

Fitur:
- tombol `Kirim Campaign via Fonnte`,
- pilih segment pelanggan,
- preview sebelum kirim,
- batch limit maksimal 20 nomor,
- jeda kirim 3–5 detik,
- status sukses/gagal,
- log campaign,
- hanya Pro/Enterprise,
- backend endpoint agar token tidak bocor.

Catatan keamanan:
- Token Fonnte jangan dikirim langsung dari browser untuk produksi besar.
- Buat endpoint backend: `/api/whatsapp/campaign/send`.

---

## Batch 25 — Android Update Manager

Status: Roadmap / belum selesai.

Tujuan:
- menu Update Aplikasi tidak hanya tombol download manual, tapi punya sistem versi.

Kondisi sekarang:
- tombol membuka `APK_PUBLIC_URL`,
- user download dan install manual,
- belum auto upload APK,
- belum cek versi otomatis.

Fitur yang dibuat:
- `version.json`,
- cek versi terpasang vs versi terbaru,
- changelog update,
- link APK release,
- GitHub Actions build signed APK,
- upload otomatis ke `/downloads/UnitPro.apk`,
- tombol update muncul hanya jika versi baru ada.

Catatan:
- Android tidak bisa auto install diam-diam.
- User tetap harus konfirmasi install/update.

---

## Batch 26 — Support Center + Monitoring Toko

Status: Roadmap.

Tujuan:
- pemilik UnitPro mudah membantu toko pengguna.

Fitur:
- detail toko,
- health score,
- kontak owner,
- aktivitas terakhir,
- data completeness,
- support note,
- tombol WA owner.

Catatan:
- Jangan buat impersonate bebas dulu.
- Kalau perlu, buat mode `view only`.

---

## Batch 27 — Security, Audit Log, Role Super Admin

Status: Roadmap.

Tujuan:
- semua aksi penting Super Admin tercatat.

Aksi yang dilog:
- ubah paket,
- suspend toko,
- aktifkan toko,
- ubah expired,
- ubah harga landing,
- ubah CTA WhatsApp,
- broadcast.

Tabel disarankan:

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
```

---

## Batch 28 — Broadcast, Announcement, Update APK Notice

Status: Roadmap.

Tujuan:
- Super Admin bisa mengirim pengumuman ke toko.

Fitur:
- announcement dashboard,
- target Free/Pro/Enterprise,
- update APK notice,
- maintenance notice,
- promo upgrade.

Tabel disarankan:

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

---

## Batch 29 — White Label / Partner Foundation

Status: Roadmap khusus, jangan didahulukan sebelum Pro stabil.

Tujuan:
- partner bisa jual aplikasi dengan brand sendiri tanpa membeli source code.

Fitur:
- brand name sendiri,
- logo sendiri,
- warna sendiri,
- custom domain,
- branded APK,
- panel client/toko,
- billing partner,
- batas client sesuai kontrak.

Catatan:
- Jangan tampil di form daftar umum.
- Landing page cukup CTA `Hubungi Partner`.
- Jangan jual source code murah.

---

## Batch 30 — V2 Backend Core Aman

Status: Roadmap besar setelah V1 terbukti dipakai.

Tujuan:
- memindahkan transaksi penting ke backend agar aman dan scalable.

Fitur:
- semua create/update/delete lewat backend,
- atomic POS checkout,
- ledger keuangan,
- transaction_items,
- service_event_logs,
- notification_logs,
- role permission kuat,
- RLS final,
- audit database.

Catatan:
- Jangan bongkar besar sebelum V1 stabil dipakai user.
- Ini proyek besar, sebaiknya branch khusus: `v2/backend-core`.

---

# Prioritas Eksekusi Terdekat

Urutan paling aman setelah V1 stabil:

```text
1. Final QA lokal dan HP
2. Pastikan PR paket/roadmap sudah masuk main
3. Batch 20 — Super Admin SaaS Control Center
4. Batch 21 — Billing Trial Expired Suspend
5. Batch 23 — Promo Banner Publik Pro
6. Batch 24 — WhatsApp Marketing Fonnte Automation
7. Batch 25 — Android Update Manager
8. Batch 22 — Landing Page CMS Pricing Control
9. Batch 26–28 — Support, Audit, Broadcast
10. Batch 29 — White Label
11. Batch 30 — V2 Backend Core
```

---

# Fitur yang Jangan Diklaim Sebagai Selesai Dulu

| Fitur | Alasan |
|---|---|
| WA Marketing otomatis massal | Belum ada Fonnte campaign backend |
| Promo tampil di publik | Form ada, tampilan publik belum selesai |
| Auto update APK penuh | Baru tombol download manual |
| RLS penuh | Bisa merusak direct Supabase path |
| White Label siap jual besar | Belum ada domain/APK/client panel |
| Super Admin billing otomatis | Masih roadmap |
| Payment gateway otomatis | Belum dibuat |

---

# Kalimat Jual yang Aman Saat Ini

## Free

```text
Mulai gratis untuk mencatat servis, stok, kasir dasar, nota, dan tracking pelanggan.
```

## Pro

```text
UnitPro Pro membantu toko servis menjalankan kasir, teknisi, stok, pelanggan, WhatsApp, laporan, katalog, dan CRM dalam satu sistem.
```

## Enterprise

```text
Untuk toko dengan banyak outlet dan kebutuhan operasional lebih besar. Hubungi kami untuk setup.
```

## White Label

```text
Untuk partner yang ingin memakai sistem UnitPro dengan brand sendiri. Hubungi Partner untuk konsultasi.
```

---

# Catatan Founder

Fokus utama jangan melebar terlalu cepat. UnitPro harus dijual sebagai alat operasional toko servis yang praktis, bukan sekadar aplikasi dengan banyak menu.

Urutan kemenangan:

```text
Stabil → Dipakai toko → Pro upgrade → Billing rapi → Marketing toko jalan → Super Admin kuat → Baru White Label dan V2 backend besar.
```
