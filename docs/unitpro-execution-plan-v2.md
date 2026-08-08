# UnitPro Execution Plan V2 — Roadmap Belum Fix / Belum Sinkron

**Versi:** 2.0  
**Tanggal Update:** 8 Agustus 2026  
**Status:** Dokumen kerja resmi untuk sisa pengembangan UnitPro setelah Finance & Arus Kas dianggap selesai.

---

## Tujuan Dokumen

Dokumen ini menggantikan roadmap eksekusi sebelumnya agar urutan kerja lebih rapi dan tidak mencampur fitur yang sudah dianggap selesai.

**Catatan penting:**

Finance, arus kas, pengeluaran, laba rugi, filter hari/minggu/bulan/tahun/custom, dan laporan owner dianggap sudah selesai atau dikerjakan di batch terpisah. Karena itu fitur keuangan tidak dimasukkan lagi sebagai tugas dalam roadmap ini.

Fokus roadmap ini adalah menyelesaikan fitur yang masih belum fix / belum sinkron:

1. kontrol bisnis SaaS,
2. billing, trial, expired, dan suspend,
3. fitur unggulan paket Pro,
4. CRM dan loyalitas pelanggan,
5. update aplikasi Android,
6. White Label / Partner,
7. backend core aman untuk skala besar.

---

## Prinsip Eksekusi

- Jangan mengubah fitur yang sudah stabil tanpa alasan kuat.
- Jangan mengaktifkan RLS penuh sebelum backend core aman.
- Jangan menjual fitur sebagai aktif jika belum tampil dan belum tersimpan permanen.
- Semua fitur Pro harus benar-benar beda dari Free.
- Semua perubahan wajib lolos `npm run build`.
- Jangan commit langsung ke `main`, kecuali hanya dokumen kecil dan sudah disetujui.
- Untuk fitur besar, gunakan branch dan PR.

---

## Status yang Dianggap Selesai dan Tidak Masuk Roadmap Ini

| Area | Status |
|---|---|
| Stabilisasi V1 | Selesai |
| Landing page sederhana | Selesai dasar |
| Sinkron paket Free / Pro / Enterprise / White Label | Selesai dasar |
| Finance & Arus Kas | Dianggap selesai, tidak masuk roadmap ini |
| Pengeluaran | Dianggap selesai, tidak masuk roadmap ini |
| Laporan Owner | Dianggap selesai, tidak masuk roadmap ini |
| Filter laporan Hari/Minggu/Bulan/Tahun/Custom | Dianggap selesai, tidak masuk roadmap ini |
| Security Readiness Panel | Dihapus dari UI toko |

---

# Ringkasan Urutan Eksekusi Baru

```text
FASE 1 — Kontrol Bisnis & Monetisasi SaaS
Batch 20 — Super Admin Control Center
Batch 21 — Billing, Trial, Expired & Suspend System

FASE 2 — Core Marketing Paket Pro
Batch 23 — Promo Banner Publik Pro
Batch 24 — WhatsApp Marketing Fonnte Automation
Batch 28 — Campaign Template Library

FASE 3 — CRM & Loyalitas Pelanggan
Batch 26 — Service CRM Timeline
Batch 27 — Smart Follow-up Rules
Batch 33 — Campaign Analytics
Batch 34 — Review & Testimonial Engine

FASE 4 — Android Update & Stabilitas Platform
Batch 25 — Android Update Manager
Batch 36 — V2 Backend Core

FASE 5 — White Label / Partner
Batch 35 — Partner / White Label Sales Kit
Batch 37 — White Label Console
Batch 38 — Branded APK / Domain Workflow
```

---

# FASE 1 — Kontrol Bisnis & Monetisasi SaaS

## Batch 20 — Super Admin Control Center

**Prioritas:** Sangat tinggi  
**Status:** Belum fix / belum lengkap

### Tujuan

Membuat Super Admin menjadi pusat kendali SaaS UnitPro.

Super Admin bukan untuk operasional toko, tapi untuk pemilik UnitPro agar bisa mengelola tenant, paket, status toko, trial, expired, billing, dan aktivitas platform.

### Fitur yang harus dibuat

- Dashboard ringkasan SaaS.
- Total toko terdaftar.
- Trial aktif.
- Toko Pro aktif.
- Toko Enterprise aktif.
- Toko expired.
- Toko suspend.
- Total servis lintas toko.
- Total transaksi lintas toko.
- Toko paling aktif.
- Manajemen tenant.
- Pencarian toko berdasarkan nama, kode tenant, owner, atau nomor WA.
- Ubah paket manual: Free / Pro / Enterprise / White Label.
- Ubah status: aktif, trial, expired, suspend.
- Reset PIN owner/admin toko jika diperlukan.
- Catatan internal Super Admin per toko.

### Acceptance Criteria

- Super Admin bisa melihat daftar semua toko.
- Super Admin bisa mengubah paket toko.
- Super Admin bisa suspend dan aktifkan toko.
- Super Admin bisa melihat status trial/expired/pro.
- Perubahan tidak mengganggu dashboard admin toko.
- Semua aksi penting minimal siap untuk audit log di batch lanjutan.

---

## Batch 21 — Billing, Trial, Expired & Suspend System

**Prioritas:** Sangat tinggi  
**Status:** Belum fix / wajib sebelum jual massal

### Tujuan

Membuat sistem langganan UnitPro siap dipakai sebagai SaaS berbayar.

### Fitur yang harus dibuat

- Trial otomatis 30 hari saat toko daftar.
- Field `trial_started_at`.
- Field `trial_ends_at`.
- Field `active_until`.
- Status subscription: trial, active, expired, suspended.
- Banner peringatan expired di dashboard toko:
  - H-7,
  - H-3,
  - H-1,
  - expired.
- Mode expired:
  - user masih bisa login,
  - data lama tetap bisa dilihat,
  - fitur create/update dibatasi,
  - tampil modal upgrade/perpanjangan.
- Catat pembayaran manual.
- Perpanjang masa aktif dari Super Admin.
- Tombol WA reminder pembayaran.

### Catatan WA

Untuk tahap awal, reminder pembayaran cukup manual via tombol WhatsApp. Jangan langsung otomatis penuh sebelum backend WhatsApp aman.

WA otomatis billing baru dikerjakan setelah Batch 24 atau setelah endpoint WhatsApp backend aman.

### Acceptance Criteria

- Toko baru otomatis trial 30 hari.
- Toko expired terlihat jelas.
- Super Admin bisa memperpanjang masa aktif.
- Toko expired dibatasi tanpa menghapus data.
- Owner toko diarahkan upgrade/perpanjang.
- Tidak ada data tenant yang bocor.

---

# FASE 2 — Core Marketing Paket Pro

## Batch 23 — Promo Banner Publik Pro

**Prioritas:** Tinggi  
**Status:** Belum fix

### Tujuan

Menyelesaikan fitur Iklan & Promo agar benar-benar tampil di halaman publik toko, bukan hanya form pengaturan.

Fitur ini adalah fitur Paket Pro / Enterprise. Free terkunci.

### Lokasi tampil

1. Katalog publik:

```text
/katalog/:tenantCode
```

2. Tracking pelanggan:

```text
/tracking?resi=...
```

3. Nota / struk:

```text
Teks promo pendek, bukan gambar besar.
```

### Fitur yang harus dibuat

- Form promo di Pengaturan Toko.
- Maksimal 3 promo aktif.
- Judul promo.
- Deskripsi promo.
- Gambar promo opsional.
- Teks promo untuk nota.
- CTA WhatsApp toko.
- Status aktif/nonaktif.
- Pilihan lokasi tampil:
  - katalog,
  - tracking,
  - nota.
- Upgrade prompt untuk Free.

### Acceptance Criteria

- Free tidak bisa membuat promo.
- Pro/Enterprise bisa tambah promo.
- Promo tampil di katalog publik.
- Promo tampil di tracking pelanggan.
- Teks promo tampil di nota tanpa merusak layout thermal.
- Promo tetap ada setelah refresh.
- Build berhasil.

---

## Batch 24 — WhatsApp Marketing Fonnte Automation

**Prioritas:** Tinggi  
**Status:** Belum fix

### Tujuan

Menyelesaikan WhatsApp Marketing Pro agar token Fonnte bukan hanya disimpan, tapi benar-benar dipakai untuk campaign secara aman.

### Kondisi saat ini

Yang sudah ada:

- Token Fonnte bisa diisi.
- Mode pengiriman bisa dipilih.
- CRM pelanggan sudah punya segmentasi.
- Template pesan sudah ada dasar.
- Tombol manual buka WA sudah ada.

Yang belum ada:

- Kirim campaign massal via Fonnte.
- Queue / antrean kirim.
- Batch limit.
- Jeda kirim.
- Log campaign.
- Endpoint backend aman.

### Fitur yang harus dibuat

- Tombol `Kirim Campaign via Fonnte`.
- Pilih segment pelanggan.
- Preview pesan sebelum kirim.
- Maksimal 20 nomor per batch.
- Jeda 3–5 detik antar pesan.
- Status sukses/gagal/pending.
- Log pengiriman campaign.
- Batal kirim sebelum eksekusi.
- Hanya aktif untuk Pro/Enterprise/White Label.
- Backend endpoint agar token tidak bocor dari browser.

### Endpoint backend disarankan

```text
POST /api/whatsapp/campaign/send
```

Payload:

```json
{
  "tenant_code": "TOKO001",
  "segment": "dormant",
  "template_id": "promo-cleaning",
  "targets": ["628xxxx"],
  "message": "Halo Kak..."
}
```

### Acceptance Criteria

- Campaign tidak berjalan di Free.
- Token tidak tampil di frontend saat kirim.
- Campaign bisa mengirim via Fonnte.
- Ada log status kirim.
- Ada batas aman 20 nomor per batch.
- Tidak mengirim otomatis tanpa konfirmasi user.
- Build berhasil.

---

## Batch 28 — Campaign Template Library

**Prioritas:** Menengah-Tinggi  
**Status:** Belum fix

### Tujuan

Membuat perpustakaan template WhatsApp agar owner toko tidak perlu menulis pesan dari nol.

### Template awal

- Reminder servis siap diambil.
- Promo pelanggan lama.
- Promo ganti LCD.
- Promo baterai.
- Promo cleaning HP.
- Promo cleaning laptop.
- Promo thermal paste.
- Promo upgrade SSD/RAM.
- Promo aksesoris.
- Ucapan terima kasih setelah transaksi.

### Variabel dinamis

- `{nama_pelanggan}`
- `{nama_toko}`
- `{resi}`
- `{link_tracking}`
- `{nama_perangkat}`
- `{tanggal_terakhir}`
- `{promo}`

### Acceptance Criteria

- Template bisa dipilih dari panel CRM/WA Marketing.
- Template bisa diedit sebelum dikirim.
- Variabel otomatis terganti.
- Template default tersedia.
- Bisa tambah template custom untuk Pro.

---

# FASE 3 — CRM & Loyalitas Pelanggan

## Batch 26 — Service CRM Timeline

**Prioritas:** Tinggi  
**Status:** Belum fix

### Tujuan

Membuat halaman pelanggan yang menampilkan riwayat lengkap servis dan transaksi pelanggan.

### Fitur yang harus dibuat

- Detail pelanggan.
- Riwayat servis.
- Riwayat transaksi POS.
- Total belanja.
- Jumlah kunjungan.
- Tanggal terakhir datang.
- Perangkat yang pernah diservis.
- Status servis terakhir.
- Catatan admin.
- Tag pelanggan.

### Tag pelanggan

- Pelanggan LCD.
- Pelanggan baterai.
- Pelanggan laptop.
- Pelanggan prioritas.
- Lama tidak datang.
- Repeat customer.
- Pembeli POS.

### Acceptance Criteria

- Admin bisa klik pelanggan dan melihat timeline.
- Riwayat servis dan POS tergabung.
- Bisa simpan catatan pelanggan.
- Tag pelanggan tampil jelas.
- Data kosong tidak membuat aplikasi error.

---

## Batch 27 — Smart Follow-up Rules

**Prioritas:** Tinggi  
**Status:** Belum fix

### Tujuan

Membuat rekomendasi follow-up harian otomatis berdasarkan data servis dan transaksi.

### Rule awal

1. Servis selesai belum diambil.
2. Pelanggan tidak datang lebih dari 60 hari.
3. Pelanggan laptop cocok untuk promo thermal paste / SSD / RAM.
4. Pelanggan HP cocok untuk promo LCD / baterai / cleaning.
5. Pelanggan high value diberi follow-up prioritas.
6. Pembeli POS ditawari aksesoris/sparepart relevan.

### Fitur yang harus dibuat

- Panel rekomendasi follow-up hari ini.
- Alasan kenapa pelanggan direkomendasikan.
- Tombol buka WA manual.
- Tombol kirim via Fonnte jika Batch 24 sudah selesai.
- Snooze / abaikan rekomendasi.
- Tandai sudah di-follow-up.

### Acceptance Criteria

- Sistem memberi daftar pelanggan prioritas.
- Admin tahu alasan follow-up.
- Tidak ada spam otomatis.
- Ada riwayat follow-up.

---

## Batch 33 — Campaign Analytics

**Prioritas:** Menengah  
**Status:** Roadmap lanjutan

### Tujuan

Mengukur efektivitas campaign WhatsApp dan promo.

### Fitur

- Jumlah pesan terkirim.
- Jumlah pesan gagal.
- Segment yang paling sering dikirimi.
- Campaign terakhir.
- Follow-up yang menghasilkan transaksi ulang.
- Estimasi omzet dari pelanggan yang kembali setelah campaign.

### Acceptance Criteria

- Owner bisa melihat performa campaign.
- Data campaign tidak membingungkan.
- Tidak perlu analytics rumit di awal.

---

## Batch 34 — Review & Testimonial Engine

**Prioritas:** Menengah  
**Status:** Roadmap lanjutan

### Tujuan

Membantu toko mengumpulkan review/testimoni dari pelanggan setelah servis selesai.

### Fitur

- Template WA minta review.
- Link Google Maps toko jika diisi.
- Catatan testimonial manual.
- Tampilkan testimonial pilihan di katalog publik.
- Follow-up pelanggan puas.

### Acceptance Criteria

- Admin bisa kirim permintaan review manual.
- Testimonial bisa disimpan.
- Testimonial bisa ditampilkan di katalog jika aktif.

---

# FASE 4 — Android Update & Stabilitas Platform

## Batch 25 — Android Update Manager

**Prioritas:** Menengah-Tinggi  
**Status:** Belum fix

### Tujuan

Membuat update aplikasi Android lebih jelas dan profesional.

### Kondisi saat ini

Menu update hanya membuka link APK:

```text
/downloads/UnitPro.apk
```

Belum ada auto upload, version check, signed release workflow, atau changelog lengkap.

### Fitur yang harus dibuat

- File `version.json` publik.
- Versi terbaru.
- Changelog.
- URL APK terbaru.
- Deteksi versi app yang terpasang.
- Modal update tersedia.
- Tombol unduh update.
- Signed release APK.
- Workflow GitHub Actions untuk build APK release.
- Upload otomatis APK ke lokasi download.

### Catatan

Android tidak bisa auto install diam-diam. User tetap harus klik dan setujui install/update.

### Acceptance Criteria

- App bisa cek versi terbaru.
- User melihat notifikasi update jika ada versi baru.
- APK yang didownload adalah release/signed, bukan debug.
- Link update stabil.
- Build berhasil.

---

## Batch 36 — V2 Backend Core

**Prioritas:** Sangat tinggi untuk skala besar, tapi dikerjakan setelah V1 dipakai user nyata  
**Status:** Belum fix

### Tujuan

Memindahkan flow kritis dari frontend direct Supabase ke backend aman.

### Fitur utama

- POS checkout atomic di backend.
- Stock movement konsisten.
- Service payment ledger.
- Transaction items.
- Service event log.
- Notification log.
- WhatsApp token secure storage.
- Audit log.
- Role permission backend.
- RLS penuh Supabase.
- Tenant isolation ketat.

### Acceptance Criteria

- POS tidak bisa double stock.
- Transaksi dan stok selalu sinkron.
- Finance tidak double count.
- Token gateway tidak bocor.
- RLS bisa diaktifkan tanpa mematikan aplikasi.
- Semua endpoint memakai tenant guard.

---

# FASE 5 — White Label / Partner

## Batch 35 — Partner / White Label Sales Kit

**Prioritas:** Menengah  
**Status:** Roadmap bisnis

### Tujuan

Menyiapkan paket penjualan White Label tanpa menjual source code.

### Fitur / materi

- Halaman penjelasan White Label.
- CTA Hubungi Partner.
- Brosur digital.
- Paket harga konsultasi.
- Scope layanan:
  - logo sendiri,
  - warna sendiri,
  - domain sendiri,
  - APK brand sendiri,
  - panel client.
- Batasan jelas:
  - source code tidak dijual default,
  - maintenance tetap dikelola UnitPro,
  - perubahan custom masuk biaya tambahan.

### Acceptance Criteria

- White Label tidak muncul di daftar umum.
- Harga publik tidak ditampilkan.
- CTA hanya konsultasi.
- Materi sales siap dikirim ke calon partner.

---

## Batch 37 — White Label Console

**Prioritas:** Menengah  
**Status:** Roadmap lanjutan

### Tujuan

Memberi partner panel terbatas untuk mengelola client/toko mereka sendiri.

### Fitur

- Partner dashboard.
- Daftar client/toko partner.
- Status langganan client.
- Branding partner.
- Batas tenant sesuai kontrak.
- Support note.

### Acceptance Criteria

- Partner hanya melihat client miliknya.
- Partner tidak melihat tenant UnitPro lain.
- Admin UnitPro tetap punya kontrol tertinggi.

---

## Batch 38 — Branded APK / Domain Workflow

**Prioritas:** Menengah-Rendah  
**Status:** Roadmap lanjutan

### Tujuan

Membuat proses pembuatan APK/domain brand partner lebih rapi.

### Fitur

- Konfigurasi brand partner.
- Nama aplikasi partner.
- Logo partner.
- Warna partner.
- Package name Android partner.
- Domain/subdomain partner.
- Build APK partner.
- Dokumentasi setup partner.

### Acceptance Criteria

- Bisa membuat APK partner tanpa mengubah core UnitPro manual terlalu banyak.
- Brand partner terpisah dari UnitPro.
- Update tetap bisa dikelola.

---

# Urutan Prioritas Final

## Paling Wajib

```text
1. Batch 20 — Super Admin Control Center
2. Batch 21 — Billing, Trial, Expired & Suspend System
3. Batch 23 — Promo Banner Publik Pro
4. Batch 24 — WhatsApp Marketing Fonnte Automation
```

## Setelah itu

```text
5. Batch 28 — Campaign Template Library
6. Batch 26 — Service CRM Timeline
7. Batch 27 — Smart Follow-up Rules
8. Batch 25 — Android Update Manager
```

## Setelah user mulai banyak

```text
9. Batch 33 — Campaign Analytics
10. Batch 34 — Review & Testimonial Engine
11. Batch 36 — V2 Backend Core
```

## Setelah siap jual partner

```text
12. Batch 35 — Partner / White Label Sales Kit
13. Batch 37 — White Label Console
14. Batch 38 — Branded APK / Domain Workflow
```

---

# Checklist Cara Eksekusi Setiap Batch

Untuk setiap batch:

1. Buat branch baru dari `main`.
2. Jangan ubah fitur di luar scope.
3. Implementasi kecil dan terukur.
4. Jalankan:

```bash
npm ci
npm run build
```

5. Buat PR.
6. Review tampilan.
7. Merge jika aman.
8. Update lokal:

```powershell
cd "D:\data ipud\aiservice beckup\TRACKING SERVICE"
git checkout main
git pull origin main
```

---

# Kesimpulan Founder

Roadmap ini dibuat lebih bersih dari dokumen sebelumnya.

Finance dan arus kas tidak dimasukkan karena dianggap selesai.

Fokus selanjutnya adalah membuat UnitPro benar-benar siap dijual sebagai SaaS:

1. Super Admin bisa mengontrol toko.
2. Billing/trial/expired berjalan.
3. Paket Pro punya nilai marketing nyata.
4. CRM membuat pelanggan toko kembali.
5. Android update lebih profesional.
6. Backend V2 disiapkan untuk keamanan dan skala besar.
7. White Label dijadikan paket mahal khusus partner.
