# 🗺️ ROADMAP AISERVICE.ID — First Launch Strategy
### Versi: 1.0 | Tanggal: 4 Agustus 2026
### Keputusan Founder: Strategi Fitur Free vs Berlangganan

---

## 📌 FILOSOFI FOUNDER

> **"Buat user Free jatuh cinta dulu, baru tawarkan upgrade."**
>
> Paket Free bukan sekedar "trial terbatas" — tapi harus **benar-benar berguna**
> sehingga pemilik toko merekomendasikan ke teman-temannya.
> Upgrade terjadi ketika bisnis user **tumbuh** dan butuh fitur lebih lanjut.

---

## 🏛️ KEPUTUSAN FOUNDER: PEMBAGIAN FITUR

### ✅ PAKET FREE (Rp 0 — Selamanya)
**Target User:** Toko servis pemula, teknisi perorangan, konter kecil

| No | Fitur | Batas / Catatan |
|----|-------|-----------------|
| 1 | **Kasir POS Lengkap** | Maks 100 transaksi/bulan |
| 2 | **Manajemen Servis** (input, status, resi) | Maks 50 servis aktif |
| 3 | **Cetak Nota Thermal** (pendaftaran & pelunasan) | ✅ Unlimited |
| 4 | **Barcode Resi Otomatis** | ✅ Unlimited |
| 5 | **Tracking Resi Publik** (konsumen cek online) | ✅ Unlimited |
| 6 | **Master Barang / Stok** | Maks 100 produk |
| 7 | **Laporan Keuangan Dasar** (ringkasan bulanan) | Tanpa export Excel |
| 8 | **1 Akun Admin** | Tanpa multi-user |
| 9 | **Pengaturan Tema Bisnis** (HP/Laptop/Motor) | ✅ Tersedia |
| 10 | **Forum Komunitas Teknisi** (baca & posting) | ✅ Tersedia (Fase 2) |

> **Kenapa POS dan Servis diberi di Free?**
> Karena ini adalah HOOK utama. User harus merasakan value inti aplikasi
> tanpa hambatan. Jika ini dibatasi terlalu ketat, user tidak akan bertahan.

---

### 💎 PAKET PRO TITAN (Rp 49.000/bulan)
**Target User:** Toko berkembang, punya 2+ karyawan, butuh kontrol lebih

| No | Fitur | Alasan Jadi Premium |
|----|-------|---------------------|
| 1 | **UNLIMITED Servis & Transaksi POS** | Scaling bisnis |
| 2 | **UNLIMITED Master Barang** | Toko besar butuh banyak SKU |
| 3 | **Portal Karyawan** (Login PIN Kasir/Teknisi) | Butuh multi-user = bisnis sudah besar |
| 4 | **Manajemen Gaji, Komisi & Kasbon** | Kontrol HR sederhana |
| 5 | **Notifikasi WhatsApp Pelanggan** (Manual/Otomatis) | Automasi = value tinggi |
| 6 | **Katalog Digital Publik** | Marketing tool untuk toko |
| 7 | **Laporan Keuangan Lengkap** + Export Excel | Data-driven decision |
| 8 | **Custom Branding** (Logo, Rekening di Nota) | Profesionalisme toko |
| 9 | **Pengaturan Iklan/Promo Toko** | Branding |
| 10 | **Support WhatsApp Prioritas** | Service premium |

> **Kenapa fitur ini jadi premium?**
> Semua fitur di atas dibutuhkan ketika bisnis **sudah jalan dan berkembang**.
> User Free yang bisnisnya tumbuh akan SECARA ALAMI butuh fitur-fitur ini.
> Ini menciptakan upgrade path yang natural, bukan paksaan.

---

### 🏢 PAKET ENTERPRISE (Rp 79.000/bulan) — TUNDA KE FASE 3+
**Keputusan Founder: JANGAN dijual dulu di launching awal.**

| Alasan Penundaan |
|---|
| Multi-Cabang butuh re-architecture database yang serius |
| Custom Domain butuh infrastruktur DNS management |
| Transfer Stok Antar Cabang belum ada implementasinya |
| Dedicated Account Manager butuh tim support yang ready |
| **Lebih baik jual 2 paket dengan fitur solid daripada 3 paket dengan janji kosong** |

> **Rekomendasi:** Hilangkan paket Enterprise dari Landing Page sampai Fase 3.
> Tampilkan badge "Coming Soon — Daftar Waiting List" saja.

---

## 🚀 FASE 1: "SOLID FOUNDATION" (Minggu 1–6)
### Misi: Bikin core experience SEMPURNA sebelum launching

---

### 🔴 Sprint 0: HOTFIX KRITIS (Minggu 1)
**Harus selesai sebelum apapun. Non-negotiable.**

#### 0.1 — Fix Keamanan Super Admin
```
📁 File: src/pages/SuperAdmin.jsx
❌ SEKARANG: Password hardcoded di client-side (line 10)
   const MASTER_PASSWORD = 'AISERVICE@Syaifudin2026!';
   
✅ HARUS: Pindahkan autentikasi ke server-side (Supabase Auth / API endpoint)
```

**Implementasi:**
- [x] Buat endpoint `/api/super-admin/login` di server (Supabase RPC)
- [x] Hash password dengan bcrypt di server
- [x] Return JWT token jika benar
- [x] Hapus hardcoded password dari client-side
- [x] Tambahkan rate limiting di server

#### 0.2 — Sinkronkan Landing Page dengan Realita
```
📁 File: src/pages/LandingPage.jsx
❌ SEKARANG: Menjual fitur yang belum ada
   - "Otomatisasi Notif WA" → sudah ada tapi perlu dipoles
   - "Custom Domain Pribadi" → BELUM ADA
   - "Transfer Stok Antar Cabang" → BELUM ADA
   - "Dedicated Account Manager" → BELUM SIAP

✅ HARUS: 
   - Hapus/sembunyikan paket Enterprise
   - Pastikan semua fitur yang dijual SUDAH BERFUNGSI
   - Tambahkan badge "Coming Soon" untuk fitur yang belum ready
```

**Implementasi:**
- [x] Revisi tabel pricing di Landing Page (2 paket: Free + Pro)
- [x] Hapus atau tandai "Coming Soon" untuk Enterprise
- [x] Pastikan setiap fitur yang dicantumkan sudah ada di kode

#### 0.3 — Implementasikan Tier Gating yang Benar
```
📁 File: src/pages/AdminDashboard.jsx
❌ SEKARANG: Semua tab muncul untuk semua tier (hanya opacity/disabled)
   
✅ HARUS: Enforcement yang benar
   - Free: Tampilkan HANYA tab yang dibolehkan
   - Tab premium: Tampilkan "upgrade card" yang menarik, bukan sekedar disable
   - Enforce limit 50 servis dan 100 transaksi di backend (bukan hanya frontend)
```

**Implementasi:**
- [x] Buat constant `FREE_LIMITS` dan `PRO_LIMITS` di satu file config
- [x] Enforce di API/Supabase: tolak create service jika melebihi batas
- [x] Tampilkan upgrade prompt yang menarik saat user mendekati limit
- [x] Sidebar: sembunyikan tab Dompet dan Afiliasi untuk Fase 1

---

### 🟡 Sprint 1: KASIR POS SEMPURNA (Minggu 2)

```
📁 File Utama: src/components/POSView.jsx
Tujuan: User bisa menjalankan kasir REAL dengan fitur ini saja
```

#### 1.1 — Metode Pembayaran
- [x] Tambahkan pilihan: **Tunai / Transfer / QRIS**
- [x] Untuk Tunai: input nominal bayar → hitung kembalian otomatis
- [x] Untuk Transfer/QRIS: tandai sebagai "Menunggu Verifikasi"
- [x] Simpan metode bayar di field `payment_method` transaksi

#### 1.2 — Kembalian Otomatis
- [x] Input field "Uang Diterima" saat checkout
- [x] Display kembalian dengan font besar dan warna hijau
- [x] Suara "ting" (opsional) saat checkout berhasil

#### 1.3 — Riwayat Transaksi POS
- [x] Tab baru atau modal "Riwayat Penjualan Hari Ini"
- [x] Filter: Hari Ini / Minggu Ini / Bulan Ini
- [x] Bisa cetak ulang struk dari riwayat
- [x] Total penjualan hari ini ditampilkan di header POS

#### 1.4 — Stok Alert
- [x] Indikator warna merah jika stok ≤ 5
- [x] Badge "HABIS" jika stok = 0, disable tombol tambah ke keranjang
- [x] Notifikasi daftar barang yang hampir habis

#### 1.5 — Diskon per Item & Total
- [x] Diskon per item (persen atau nominal)
- [x] Diskon total belanja (sudah ada dasar, perlu dipoles)
- [x] Tampilkan "Anda Hemat Rp X" di struk

---

### 🟡 Sprint 2: MANAJEMEN SERVIS SEMPURNA (Minggu 3)

```
📁 File Utama: src/pages/AdminDashboard.jsx (tab servis)
Tujuan: Workflow servis dari masuk → selesai → ambil TANPA CELAH
```

#### 2.1 — Status Flow yang Lengkap
- [x] Status yang jelas dan berurutan:
  ```
  DITERIMA → SEDANG DICEK → DIKERJAKAN → MENUNGGU PART → 
  SELESAI → SUDAH DIAMBIL → BATAL
  ```
- [x] Setiap perubahan status: simpan timestamp + nama user yang mengubah
- [ ] History log per servis (siapa ubah apa, kapan)

#### 2.2 — Foto Kondisi Barang
- [ ] Upload foto saat terima barang (bukti kondisi awal)
- [ ] Upload foto setelah selesai (bukti perbaikan)
- [ ] Simpan di Supabase Storage
- [ ] Tampilkan foto di halaman tracking publik

#### 2.3 — Estimasi Waktu & Biaya
- [x] Input estimasi waktu penyelesaian (1-7 hari)
- [x] Input estimasi biaya awal saat terima barang
- [x] Tampilkan di nota pendaftaran dan tracking publik
- [ ] Notifikasi jika lewat estimasi waktu (untuk admin)

#### 2.4 — Pencarian & Filter Servis
- [x] Search by: nama pelanggan, nomor HP, resi, device
- [x] Filter by: status (dropdown), tanggal range
- [ ] Sortir: terbaru, terlama, belum dikerjakan dulu

#### 2.5 — Notifikasi WhatsApp (Pro Only)
- [x] Saat servis DITERIMA: kirim pesan "Barang Anda sudah kami terima, resi: XXX"
- [x] Saat SELESAI: kirim pesan "Barang sudah selesai, silakan ambil"
- [x] Template pesan yang bisa dikustomisasi di Pengaturan
- [x] Metode Manual: buka WhatsApp Web dengan pesan pre-filled
- [ ] Metode Otomatis: kirim via API Fonnte (sudah ada UI, perlu wiring)

---

### 🟡 Sprint 3: CETAK NOTA & TRACKING PUBLIK (Minggu 4)

```
📁 File: AdminDashboard.jsx (print), PublicTracking.jsx
Tujuan: Nota terlihat profesional & tracking mudah diakses konsumen
```

#### 3.1 — Polesan Nota Cetak
- [x] Tambahkan logo toko di header nota (Pro Only)
- [x] QR Code di nota → langsung ke halaman tracking resi
- [x] Footer nota: custom text dari pengaturan (misal: alamat, jam buka)
- [x] Preview nota sebelum cetak (tampilkan di modal)

#### 3.2 — Halaman Tracking Publik yang Polished
- [x] Redesign tampilan tracking agar lebih menarik
- [x] Tampilkan timeline visual (progress bar per status)
- [ ] Tampilkan foto kondisi barang (jika ada)
- [x] Tampilkan estimasi waktu selesai
- [x] Branded: tampilkan nama & logo toko di halaman tracking
- [x] Responsive: harus bagus di HP (mayoritas konsumen akses dari HP)

---

### 🟡 Sprint 4: LAPORAN KEUANGAN DASAR (Minggu 5)

```
📁 File: AdminDashboard.jsx (tab keuangan)
Tujuan: Owner bisa lihat ringkasan bisnis tanpa buka Excel
```

#### 4.1 — Dashboard Ringkasan (Free)
- [x] Card: Total Pendapatan Bulan Ini
- [x] Card: Total Servis Bulan Ini (selesai vs belum)
- [x] Card: Total Penjualan POS Bulan Ini
- [x] Grafik batang: pendapatan 7 hari terakhir (sudah ada Recharts)

#### 4.2 — Detail Arus Kas (Pro Only)
- [x] Tabel transaksi dengan filter (tipe, tanggal, kategori)
- [x] Kategori: Pendapatan Servis | Penjualan POS | Pengeluaran | Gaji | Kasbon
- [x] Kalkulasi otomatis: Laba Bersih = Pendapatan - Pengeluaran - Gaji
- [x] Export ke Excel dengan format rapi (header, summary row)
- [x] Input pengeluaran manual (beli sparepart, sewa tempat, listrik, dll)

---

### 🟢 Sprint 5: QA, TESTING & SOFT LAUNCH (Minggu 6)

#### 5.1 — Testing Menyeluruh
- [x] Test flow lengkap: Daftar → Input Servis → Ubah Status → Cetak Nota → Tracking
- [x] Test flow POS: Tambah Produk → Jual → Cetak Struk → Cek Riwayat
- [x] Test tier gating: pastikan Free tidak bisa akses fitur Pro
- [x] Test di HP Android (APK) — responsive & functional
- [x] Test di browser desktop (Chrome, Firefox)
- [x] Test kecepatan loading (optimasi jika lambat)

#### 5.2 — Soft Launch (10–20 Toko Pilot)
- [ ] Rekrut 10-20 toko servis sebagai pilot tester
- [ ] Beri akses gratis paket Pro selama 30 hari (trial)
- [ ] Kumpulkan feedback harian via WhatsApp Group
- [ ] Perbaiki bug dan UX berdasarkan feedback real
- [ ] Dokumentasikan semua masalah yang ditemukan

#### 5.3 — Landing Page Final Polish
- [x] Pastikan hanya 2 paket yang ditampilkan (Free + Pro)
- [x] Tambahkan testimonial dari pilot tester (jika ada)
- [x] Optimasi SEO: meta title, description, Open Graph
- [ ] Tambahkan video demo singkat (opsional)

---

## 🚀 FASE 2: "GROWTH ENGINE" (Minggu 7–14)
### Misi: Fitur yang bikin user upgrade & merekomendasikan ke teman

---

### 🟡 Sprint 6: PORTAL KARYAWAN SOLID (Minggu 7-8)

```
📁 File: src/pages/EmployeePortal.jsx
Tujuan: Owner bisa tinggalkan toko karena karyawan bisa operasikan sendiri
TIER: Pro Only
```

#### 6.1 — Login Karyawan yang Aman
- [ ] Login via Kode Toko + PIN (sudah ada, perlu dipoles)
- [ ] Role: **Kasir** (akses POS) dan **Teknisi** (akses servis)
- [ ] Dashboard berbeda per role
- [ ] Kasir: hanya lihat POS, tidak bisa lihat harga modal
- [ ] Teknisi: hanya lihat daftar servis yang ditugaskan

#### 6.2 — Manajemen Karyawan di Admin
- [ ] CRUD karyawan (sudah ada dasar di tab Karyawan)
- [ ] Set gaji pokok per karyawan
- [ ] Set persentase komisi per servis yang diselesaikan
- [ ] Lihat aktivitas karyawan (servis yang dikerjakan, POS yang dihandle)

#### 6.3 — Sistem Kasbon Karyawan
- [ ] Karyawan bisa ajukan kasbon dari portal mereka
- [ ] Admin approve/reject kasbon
- [ ] Otomatis potong dari gaji bulan depan
- [ ] Riwayat kasbon per karyawan

#### 6.4 — Ringkasan Gaji Bulanan
- [ ] Kalkulasi: Gaji Pokok + Komisi Servis - Kasbon = Take Home Pay
- [ ] Admin bisa cetak slip gaji sederhana
- [ ] Riwayat pembayaran gaji per bulan

---

### 🟡 Sprint 7: KATALOG DIGITAL PUBLIK (Minggu 9-10)

```
📁 File: src/pages/PublicCatalog.jsx
Tujuan: Mini-website toko yang bisa dishare ke konsumen via WhatsApp
TIER: Pro Only
```

#### 7.1 — Halaman Katalog yang Menarik
- [ ] URL: `/katalog/{KODE_TOKO}` (sudah ada route-nya)
- [ ] Tampilkan semua produk dengan foto, harga, stok
- [ ] Kategori produk (Sparepart, Aksesoris, Jasa)
- [ ] Search & filter di halaman katalog
- [ ] Branding toko (nama, logo, tema warna)

#### 7.2 — Tombol Order via WhatsApp
- [ ] Setiap produk ada tombol "Pesan via WhatsApp"
- [ ] Klik → buka WhatsApp dengan pesan: "Halo, saya ingin pesan [Nama Produk]..."
- [ ] Nomor WA tujuan = nomor toko dari pengaturan (`store_wa`)

#### 7.3 — Share Katalog
- [ ] Tombol "Bagikan Katalog" → copy link / share ke WA
- [ ] Meta tags Open Graph agar tampil bagus saat dishare
- [ ] QR Code untuk cetak dan ditaruh di etalase toko

---

### 🟡 Sprint 8: FORUM KOMUNITAS TEKNISI (Minggu 11-12)

```
📁 File: src/components/ForumCommunity.jsx
Tujuan: Differentiator unik — teknisi saling bantu, membangun komunitas
TIER: Free (baca & posting), Pro (fitur ekstra)
```

#### 8.1 — Forum Dasar untuk Semua User
- [ ] Kategori: Servis Laptop | Servis HP | Bengkel Motor | Tips & Trik | Lainnya
- [ ] Posting pertanyaan dengan judul, deskripsi, foto
- [ ] Reply/jawaban dari teknisi lain
- [ ] Tandai jawaban terbaik (oleh pembuat thread)
- [ ] Search thread berdasarkan keyword

#### 8.2 — Sistem Reputasi
- [ ] Setiap jawaban yang ditandai "terbaik" → +10 poin reputasi
- [ ] Badge: Pemula (0-50) → Teknisi (50-200) → Ahli (200-500) → Master (500+)
- [ ] Leaderboard teknisi top bulan ini
- [ ] Tampilkan badge di profil dan setiap posting

#### 8.3 — Moderasi Dasar
- [ ] Tombol "Laporkan" posting yang melanggar
- [ ] Super Admin bisa hapus posting & ban user dari forum
- [ ] Filter kata kasar otomatis (word blacklist)

> **PENTING:** Fitur Saweran/Dompet TIDAK diluncurkan di Fase ini.
> Terlalu berisiko tanpa legal counsel. Reputasi/badge sudah cukup
> sebagai insentif untuk berbagi ilmu.

---

### 🟡 Sprint 9: UPGRADE FLOW & PAYMENT (Minggu 13)

```
Tujuan: User Free bisa upgrade ke Pro dengan smooth & tanpa hambatan
```

#### 9.1 — In-App Upgrade Prompts
- [ ] Saat user mendekati limit (45/50 servis): tampilkan banner kuning
- [ ] Saat user mencapai limit: tampilkan modal upgrade yang menarik
- [ ] Setiap tab premium: tampilkan preview fitur + CTA upgrade
- [ ] "Coba Gratis 7 Hari" trial button untuk paket Pro

#### 9.2 — Flow Pembayaran
- [ ] User klik upgrade → tampilkan instruksi transfer (BRI/DANA)
- [ ] User upload bukti transfer / klik konfirmasi WA
- [ ] Admin (Super Admin) verifikasi dan set tier = 'pro'
- [ ] Sistem otomatis set `trial_ends_at` jika trial
- [ ] Email/WA konfirmasi setelah upgrade berhasil

#### 9.3 — Trial Management
- [ ] Trial 7 hari untuk Pro (sudah ada mekanisme `trial_ends_at`)
- [ ] Countdown "Sisa X hari trial" di sidebar (sudah ada)
- [ ] Auto-downgrade ke Free saat trial habis (sudah ada logic-nya)
- [ ] Kirim reminder WA 3 hari sebelum trial habis

---

### 🟢 Sprint 10: POLISH, OPTIMIZE & GRAND LAUNCH (Minggu 14)

#### 10.1 — Performance Optimization
- [ ] Lazy loading untuk tab yang jarang diakses
- [ ] Optimasi query Supabase (indeks, pagination)
- [ ] Image optimization (compress foto servis & produk)
- [ ] Bundle size analysis & code splitting

#### 10.2 — Mobile Experience (APK)
- [ ] Test APK di 5+ perangkat Android berbeda
- [ ] Pastikan barcode scanner bekerja di semua device
- [ ] Pastikan cetak nota ke printer Bluetooth berfungsi
- [ ] Fix layout issues di layar kecil (≤ 360px width)

#### 10.3 — Grand Launch Checklist
- [ ] Landing Page final dengan 2 paket (Free + Pro)
- [ ] APK tersedia di GitHub Releases
- [ ] Dokumentasi/panduan pengguna (minimal FAQ)
- [ ] WhatsApp Business untuk customer support
- [ ] Social media posts untuk launch
- [ ] Metrics tracking: jumlah pendaftaran, upgrade rate

---

## 📊 TIMELINE VISUAL

```
FASE 1: SOLID FOUNDATION (Minggu 1-6)
═══════════════════════════════════════════════════
 M1    M2       M3          M4         M5       M6
 ┃     ┃        ┃           ┃          ┃        ┃
 ┣━━━┓ ┣━━━━━┓  ┣━━━━━━━━┓  ┣━━━━━━━┓  ┣━━━━━┓ ┣━━━━━━━┓
 ┃HOT┃ ┃ POS ┃  ┃ SERVIS ┃  ┃ NOTA  ┃  ┃ LAP ┃ ┃ QA &  ┃
 ┃FIX┃ ┃KASIR┃  ┃TRACKING┃  ┃ CETAK ┃  ┃KEUAG┃ ┃LAUNCH ┃
 ┗━━━┛ ┗━━━━━┛  ┗━━━━━━━━┛  ┗━━━━━━━┛  ┗━━━━━┛ ┗━━━━━━━┛
                                               ↑
                                          SOFT LAUNCH
                                         (10-20 toko)

FASE 2: GROWTH ENGINE (Minggu 7-14)
═══════════════════════════════════════════════════
 M7-8      M9-10       M11-12      M13     M14
 ┃         ┃           ┃           ┃       ┃
 ┣━━━━━━┓  ┣━━━━━━━━┓  ┣━━━━━━━━┓  ┣━━━━┓  ┣━━━━━━━━┓
 ┃PORTAL┃  ┃KATALOG ┃  ┃ FORUM  ┃  ┃UPG ┃  ┃ GRAND  ┃
 ┃KARY. ┃  ┃DIGITAL ┃  ┃TEKNISI ┃  ┃FLOW┃  ┃LAUNCH! ┃
 ┗━━━━━━┛  ┗━━━━━━━━┛  ┗━━━━━━━━┛  ┗━━━━┛  ┗━━━━━━━━┛
                                            ↑
                                       GRAND LAUNCH
                                       (publik)
```

---

## 🎯 RINGKASAN KEPUTUSAN FOUNDER

### Paket yang Dijual Saat Launching:

| | **Free (Rp 0)** | **Pro Titan (Rp 49.000/bln)** |
|---|---|---|
| **Slogan** | "Mulai kelola toko servis Anda gratis" | "Semua yang Anda butuhkan untuk toko yang berkembang" |
| **Servis** | 50/bulan | ♾️ Unlimited |
| **POS Transaksi** | 100/bulan | ♾️ Unlimited |
| **Produk** | 100 SKU | ♾️ Unlimited |
| **Cetak Nota** | ✅ | ✅ + Logo Toko |
| **Tracking Publik** | ✅ | ✅ + Foto & Timeline |
| **Laporan Keuangan** | Ringkasan saja | Detail + Export Excel |
| **Multi-Karyawan** | ❌ | ✅ PIN Login |
| **Gaji & Kasbon** | ❌ | ✅ |
| **Notif WhatsApp** | ❌ | ✅ Manual + Otomatis |
| **Katalog Digital** | ❌ | ✅ |
| **Custom Branding** | ❌ | ✅ Logo + Rekening |
| **Forum Teknisi** | ✅ Baca & Tulis | ✅ + Badge Reputasi |
| **Support** | FAQ & Dokumentasi | WhatsApp Prioritas |

### Paket yang TIDAK Dijual Dulu:
- ❌ **Enterprise** (Rp 79.000) → Tunda ke Fase 3+
- ❌ **Dompet & Saweran** → Tunda sampai ada legal counsel
- ❌ **Program Afiliasi** → Tunda sampai ada 200+ tenant aktif

---

## 📋 PERUBAHAN KODE YANG DIBUTUHKAN

### File yang Perlu Dimodifikasi di Fase 1:

| File | Perubahan |
|------|-----------|
| `src/pages/SuperAdmin.jsx` | Pindahkan auth ke server-side |
| `src/pages/LandingPage.jsx` | Revisi pricing (2 paket saja) |
| `src/pages/AdminDashboard.jsx` | Tier gating, hide tab Dompet/Afiliasi |
| `src/components/POSView.jsx` | Metode bayar, kembalian, riwayat |
| `src/pages/PublicTracking.jsx` | Redesign timeline visual |
| `src/services/api.js` | Enforce tier limits di API calls |
| `src/store/useStore.js` | Tambah config FREE_LIMITS |
| `api/index.js` | Super Admin auth endpoint |
| `server/index.cjs` | Enforce limits di backend |

### File Baru yang Perlu Dibuat:

| File | Tujuan |
|------|--------|
| `src/config/tierLimits.js` | Konstanta limit per tier |
| `src/components/UpgradePrompt.jsx` | Komponen reusable untuk upgrade CTA |
| `src/components/ServiceTimeline.jsx` | Timeline visual status servis |
| `src/components/ReceiptPreview.jsx` | Preview nota sebelum cetak |

---

## 📝 CATATAN PENTING

1. **Jangan bikin fitur baru sebelum Sprint 0 (Hotfix) selesai**
2. **Setiap sprint harus di-test di HP Android sebelum lanjut**
3. **Kumpulkan feedback dari 3+ orang real user setiap 2 minggu**
4. **Dokumentasikan setiap keputusan perubahan di file ini**
5. **Ukur: jumlah sign-up, retention 7 hari, upgrade rate**

---

> *"Ship fast, but ship RIGHT. Lebih baik launching dengan 5 fitur yang
> sempurna daripada 15 fitur yang 'ya lumayan jalan'."*
>
> — Keputusan Founder, 4 Agustus 2026
