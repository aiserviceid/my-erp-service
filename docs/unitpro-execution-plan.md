# UnitPro Execution Plan & Task Checklist — Roadmap Eksekusi Teroptimasi

**Versi:** 1.0  
**Tanggal Update:** 8 Agustus 2026  
**Status:** Dokumen Kerja Resmi untuk Tugas Pengembangan Selanjutnya

---

## 🎯 Tujuan Dokumen

Dokumen ini adalah panduan kerja eksekusi (*action plan*) untuk menyelesaikan seluruh sisa fitur Roadmap UnitPro secara terstruktur, memprioritaskan kontrol monetisasi SaaS, fitur unggulan paket Pro, CRM pelanggan, dan stabilitas aplikasi.

---

## 🧭 Rencana Eksekusi Bertahap (Phased Execution Plan)

```text
FASE 1 ➔ Kontrol Bisnis & Monetisasi (Batch 20 & 21)
FASE 2 ➔ Core Marketing Paket Pro (Batch 23, 28, 24)
FASE 3 ➔ CRM & Loyalitas Pelanggan (Batch 26 & 27)
FASE 4 ➔ Stabilitas Aplikasi & Platform (Batch 25 & 36)
```

---

## 📋 Checklist Tugas Eksekusi (Task Checklist)

### 🔴 FASE 1: Kontrol Bisnis & Monetisasi SaaS
Focus: Memastikan sistem langganan, pembatasan trial, expired toko, dan kontrol Super Admin berjalan 100%.

- [ ] **Task 1.1 — Batch 20: Super Admin Control Center**
  - [ ] Dashboard ringkasan SaaS (total toko, trial aktif, toko Pro, toko expired, toko suspend)
  - [ ] Panel manajemen tenant (pencarian toko, ubah status active/suspend, reset PIN)
  - [ ] Panel manajemen langganan (upgrade tier manual Free/Pro/Enterprise)
  - [ ] Log aktivitas administrasi SaaS

- [ ] **Task 1.2 — Batch 21: Billing, Trial, Expired & Suspend System**
  - [ ] Perhitungan otomatis masa trial (30 hari sejak registrasi toko)
  - [ ] Peringatan expired banner pada dashboard admin toko (H-7, H-3, H-1)
  - [ ] Pembatasan fitur otomatis saat masa aktif/trial berakhir (Mode read-only / redirect modal upgrade)
  - [ ] Catat transaksi pembayaran manual & konfirmasi pembaharuan masa aktif
  - [ ] Pengiriman notifikasi WA otomatis untuk tagihan/perpanjangan langganan

---

### 🟠 FASE 2: Core Marketing & Daya Tarik Paket Pro
Focus: Memberikan nilai tambah instan untuk pengguna paket Pro agar mau berlangganan.

- [ ] **Task 2.1 — Batch 23: Promo Banner Publik Pro**
  - [ ] Form kelola iklan & banner promo di Pengaturan Toko (maksimal 3 promo aktif)
  - [ ] Tampilan banner promo interaktif pada halaman Katalog Publik (`/katalog/:tenantCode`)
  - [ ] Tampilan banner promo pada halaman Public Tracking Resi (`/tracking?resi=...`)
  - [ ] Pembatasan fitur: terkunci untuk Free, terbuka penuh untuk Pro & Enterprise

- [ ] **Task 2.2 — Batch 28: Campaign Template Library**
  - [ ] Perpustakaan template pesan WhatsApp promosi (Promo Ganti LCD, Baterai, Service Laptop, Cleaning, dsb.)
  - [ ] Variabel dinamis template (`{nama_pelanggan}`, `{nama_toko}`, `{resi}`, `{link_tracking}`)
  - [ ] Integrasi 1-klik terapkan template ke form pengirim pesan

- [ ] **Task 2.3 — Batch 24: WhatsApp Marketing Fonnte Automation**
  - [ ] Sistem antrean broadcast WA massal terintegrasi Fonnte Gateway
  - [ ] Pengaturan batch limit (maksimal 20 nomor per siklus) dengan jeda aman 3–5 detik per pesan
  - [ ] Log status pengiriman broadcast (Sukses, Gagal, Pending)
  - [ ] Endpoint backend terproteksi untuk eksekusi kirim pesan aman

---

### 🟡 FASE 3: CRM & Loyalitas Pelanggan
Focus: Membantu pemilik toko mengelola hubungan pelanggan dan meningkatkan transaksi berulang (*repeat order*).

- [ ] **Task 3.1 — Batch 26: Service CRM Timeline**
  - [ ] Halaman profil & riwayat komprehensif per pelanggan
  - [ ] Histori gabungan transaksi servis HP/Laptop dan transaksi kasir (POS)
  - [ ] Sistem tagging pelanggan (Pelanggan LCD, Baterai, Laptop, Prioritas, Lama Tak Datang)
  - [ ] Catatan khusus admin per pelanggan

- [ ] **Task 3.2 — Batch 27: Smart Follow-up Rules**
  - [ ] Dashboard rekomendasi follow-up harian otomatis
  - [ ] Rule: Servis `SELESAI` belum `DIAMBIL` (Reminder Pengambilan)
  - [ ] Rule: Pelanggan tidak berkunjung >60 hari (Promo Cleaning / Check-up)
  - [ ] Rule: Pelanggan kategori laptop (Promo Thermal Paste / Upgrade RAM/SSD)
  - [ ] Tombol tindakan instan: Buka WA / Kirim via Fonnte

---

### 🟢 FASE 4: Stabilitas Aplikasi & Platform Final
Focus: Menjaga kinerja aplikasi Android dan keamanan backend masa depan.

- [ ] **Task 4.1 — Batch 25: Android Update Manager**
  - [ ] Integrasi pembacaan file konfigurasi versi `version.json`
  - [ ] Modal pemberitahuan update aplikasi baru pada APK Android
  - [ ] Changelog versi & tombol unduh APK rilis terbaru secara langsung

- [ ] **Task 4.2 — Batch 36: V2 Backend Core**
  - [ ] Transaksi checkout POS atomic di level database
  - [ ] Pembukuan ledger keuangan yang ketat & bebas desinkronisasi
  - [ ] RLS (Row Level Security) penuh pada seluruh tabel Supabase
  - [ ] Secure storage untuk token API gateway & audit logging

---

## 📌 Catatan Pelaksanaan

1. Setiap tugas harus diverifikasi dengan tes build (`npm run build`) sebelum ditandai selesai (`[x]`).
2. Kode tetap mematuhi arsitektur multi-tenant dengan isolasi `tenant_code` yang ketat.
3. Antarmuka (UI) wajib mempertahankan standar estetika modern (clean, responsif, dark/light mode harmonis).
