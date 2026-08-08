# UnitPro Master Roadmap V2 — Operasional + Marketing Growth

Versi: 2.0  
Tanggal: 8 Agustus 2026  
Status: Dokumen master gabungan Batch 1 dan seterusnya, termasuk inspirasi marketing dari Cekat.AI yang disesuaikan untuk toko servis.

---

## Tujuan Dokumen

Dokumen ini menyatukan roadmap UnitPro agar tidak tercecer di banyak file.

UnitPro tidak diarahkan menjadi platform chat umum. UnitPro tetap fokus sebagai **SaaS operasional toko servis**, lalu ditambah layer marketing yang relevan:

> Servis → Kasir → Stok → Teknisi → Nota → Tracking → CRM → WhatsApp Follow-up → Pelanggan balik lagi.

North Star:

> Mengurangi pekerjaan admin toko servis dan meningkatkan omzet pemilik toko.

---

## Prinsip Produk

1. Sekali kasir memasukkan data, seluruh sistem ikut bekerja.
2. Sekali teknisi mengubah progres, admin dan pelanggan ikut mengetahui.
3. Sekali transaksi terjadi, stok, keuangan, nota, dashboard, tracking, dan laporan ikut berubah.
4. Free membuat user mencoba.
5. Pro membuat toko benar-benar berjalan profesional.
6. Marketing UnitPro harus spesifik untuk toko servis, bukan menjadi CRM umum.

---

## Inspirasi dari Cekat.AI yang Cocok Diambil

Cekat.AI kuat di area AI Agent, Omnichannel CRM, order otomatis, broadcast marketing, follow-up, dan pengelolaan chat dari banyak channel.

Yang bisa diambil untuk UnitPro:

| Inspirasi | Adaptasi untuk UnitPro |
|---|---|
| Omnichannel CRM | CRM pelanggan servis berbasis riwayat servis/POS |
| Broadcast marketing | WhatsApp campaign pelanggan lama/segment tertentu |
| Follow-up leads otomatis | Reminder ambil unit, follow-up pelanggan lama, promo servis berkala |
| AI agent 24/7 | Nanti: asisten FAQ servis/tracking, bukan prioritas awal |
| Order otomatis | Nanti: booking servis dari chat/katalog |
| Ticketing/handoff agent | Nanti: inbox pelanggan masuk ke admin/kasir |
| Template campaign | Template WA siap pakai untuk servis HP/laptop/POS |
| Riwayat chat/customer | Log follow-up pelanggan dan histori campaign |

Yang **tidak perlu ditiru dulu**:

- full omnichannel Instagram/Facebook/TikTok,
- AI agent kompleks,
- auto-closing order umum,
- marketplace chat,
- platform CRM umum.

Positioning:

> Cekat.AI mengurus chat bisnis. UnitPro mengurus operasional toko servis dan membuat pelanggan servis datang kembali.

---

## Pembagian Paket Final

### Free

Target: toko kecil yang ingin mencoba.

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
| Branding toko | Tidak aktif |

### Pro

Target: toko servis aktif.

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
| Promo publik | Aktif setelah Batch 23 |
| Katalog publik | Aktif |
| Laporan owner | Aktif |
| Export Excel | Aktif |
| Branding toko | Aktif |

### Enterprise

Target: toko dengan banyak cabang/outlet.

| Area | Enterprise |
|---|---|
| Cabang | Sampai 5 outlet tahap awal |
| Karyawan | Sampai 50 akun |
| Laporan cabang | Roadmap |
| Support prioritas | Roadmap |
| Promo dan WA Marketing | Aktif |

### White Label / Partner

Target: partner, komunitas, distributor, atau pihak yang ingin menjual dengan brand sendiri.

| Area | White Label |
|---|---|
| Harga publik | Tidak ditampilkan |
| CTA | Hubungi Partner / Konsultasi |
| Brand sendiri | Ya |
| Domain sendiri | Roadmap |
| APK brand sendiri | Roadmap |
| Panel kelola client | Roadmap |
| Source code | Tidak dijual default |

---

# Roadmap Batch Utama

## Batch 1 — Service Core Fix

Status: Selesai.

Tujuan:
- status awal servis konsisten,
- edit keterangan nota,
- biaya jasa/sparepart/diskon tersimpan,
- update servis aman per tenant.

---

## Batch 2 — Employee Notification Service

Status: Selesai.

Tujuan:
- teknisi/kasir/pelanggan bisa mendapat notifikasi WhatsApp dari Portal Karyawan.

---

## Batch 3 — Admin Notification Service

Status: Selesai.

Tujuan:
- admin bisa mengirim status servis dan link tracking ke pelanggan.

---

## Batch 4 — Security Tenant Guard

Status: Selesai dasar.

Tujuan:
- mencegah data toko bercampur antar tenant.

Catatan:
- RLS penuh belum boleh dipaksa sampai semua jalur baca/tulis lewat backend aman.

---

## Batch 5 — POS Stock Guard

Status: Selesai V1.

Tujuan:
- kasir tidak bisa menjual stok fisik yang kurang.
- jasa tidak mengurangi stok.

Lanjutan:
- atomic backend transaction di V2.

---

## Batch 6 — Finance Guard

Status: Selesai V1.

Tujuan:
- laporan keuangan tidak double count.

---

## Batch 7 — Customer Tracking Privacy

Status: Selesai V1.

Tujuan:
- tracking publik aman dan tidak membocorkan data berlebihan.

---

## Batch 8 — UX Mobile Regression

Status: Selesai V1.

Tujuan:
- aplikasi tidak blank saat error dan punya checklist QA.

---

## Batch 9 — V1 Stabilization Integration

Status: Selesai dan sudah merge ke main.

Tujuan:
- menggabungkan batch stabilisasi menjadi satu jalur release.

---

## Batch 10 — Logo & Branding UnitPro Resmi

Status: Selesai dasar.

Tujuan:
- seluruh aplikasi memakai identitas UnitPro yang konsisten.

---

## Batch 11 — Premium Feedback System

Status: Selesai dasar.

Tujuan:
- mengganti alert browser menjadi toast/modal yang lebih premium.

Lanjutan:
- hapus sisa alert lama secara bertahap.

---

## Batch 12 — Dashboard Admin Premium Simple

Status: Selesai.

Tujuan:
- dashboard owner lebih ringkas dan tidak membingungkan.

---

## Batch 13 — Flow Selesai Servis Final

Status: Selesai V1.

Tujuan:
- admin dan teknisi punya alur selesai servis yang konsisten.

---

## Batch 14 — Flow Kasir/POS Mulus

Status: Selesai V1.

Tujuan:
- POS siap dipakai kasir harian.

Lanjutan:
- transaksi atomic backend di V2.

---

## Batch 15 — Inventori & Stok Mulus

Status: Selesai V1.

Tujuan:
- produk, foto, kategori, dan stok tersimpan permanen.

---

## Batch 16 — Mobile & APK Polish

Status: Selesai dasar.

Tujuan:
- tampilan nyaman untuk Android/PWA.

---

## Batch 17 — CRM Pelanggan Dasar

Status: Selesai dasar.

Tujuan:
- owner melihat pelanggan yang bisa di-follow-up.

Segment awal:
- siap diambil,
- aktif 30 hari,
- lama tidak datang,
- pembeli POS,
- pelanggan laptop,
- pelanggan HP,
- pelanggan prioritas.

---

## Batch 18 — WhatsApp Marketing Pro Manual

Status: Selesai dasar.

Tujuan:
- Pro punya alat follow-up pelanggan.

Sudah:
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

---

## Batch 19 — Laporan Owner Premium + Onboarding + Security Readiness

Status: Selesai dasar.

Tujuan:
- owner lebih mudah membaca laporan dan toko baru punya panduan setup.

---

## Batch 20 — Super Admin SaaS Control Center

Status: Roadmap.

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

---

## Batch 21 — Billing, Trial, Expired, Suspend

Status: Roadmap wajib sebelum jual massal.

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

---

## Batch 22 — Landing Page CMS + Pricing Control

Status: Roadmap.

Tujuan:
- Super Admin bisa mengubah landing page tanpa edit kode.

Catatan:
- Ini untuk landing UnitPro, bukan promo toko tenant.

---

## Batch 23 — Promo Banner Publik Pro

Status: Roadmap belum selesai.

Tujuan:
- menu Iklan & Promo benar-benar tampil di halaman publik toko.

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

---

## Batch 24 — WhatsApp Marketing Fonnte Automation

Status: Roadmap belum selesai.

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

Endpoint disarankan:

```text
POST /api/whatsapp/campaign/send
```

---

## Batch 25 — Android Update Manager

Status: Roadmap belum selesai.

Tujuan:
- menu Update Aplikasi menjadi sistem update yang rapi.

Fitur:
- `version.json`,
- cek versi terpasang vs versi terbaru,
- changelog,
- link APK release terbaru,
- upload APK otomatis dari GitHub Actions,
- signed release APK/AAB.

---

# Layer Marketing ala Cekat.AI untuk UnitPro

## Batch 26 — Service CRM Timeline

Status: Roadmap baru.

Tujuan:
- setiap pelanggan punya histori lengkap dari servis, POS, WA follow-up, promo, dan status terakhir.

Fitur:
- timeline pelanggan,
- riwayat servis,
- riwayat pembelian POS,
- riwayat campaign WA,
- catatan admin,
- tag pelanggan.

Contoh tag:
- pelanggan LCD,
- pelanggan baterai,
- pelanggan laptop,
- pelanggan sering belanja,
- pelanggan lama tidak datang,
- pelanggan prioritas.

Paket:
- Free: tidak aktif,
- Pro: aktif,
- Enterprise: aktif.

---

## Batch 27 — Smart Follow-up Rules

Status: Roadmap baru.

Tujuan:
- sistem memberi rekomendasi follow-up otomatis berdasarkan kondisi toko servis.

Rule awal:
- status `SELESAI` tapi belum `DIAMBIL` → reminder ambil unit,
- pelanggan tidak datang 60 hari → promo cleaning/cek kondisi,
- pelanggan laptop → promo cleaning/thermal paste/SSD/RAM,
- pelanggan HP → promo LCD/baterai/software,
- pembeli POS → promo aksesoris/sparepart,
- pelanggan high value → follow-up prioritas.

Output:
- daftar pelanggan yang harus difollow-up hari ini,
- template WA yang sesuai,
- tombol buka WA / kirim via Fonnte setelah Batch 24.

---

## Batch 28 — Campaign Template Library

Status: Roadmap baru.

Tujuan:
- owner toko tidak perlu mikir kata-kata promosi.

Template awal:
- reminder unit selesai,
- reminder pelanggan lama,
- promo cleaning HP,
- promo cleaning laptop,
- promo ganti baterai,
- promo upgrade SSD/RAM,
- promo aksesoris POS,
- ucapan setelah transaksi,
- ajakan review/testimoni.

Paket:
- Free: hanya preview terkunci,
- Pro: aktif,
- Enterprise: aktif,
- White Label: bisa custom template partner.

---

## Batch 29 — Lead Inbox Ringan

Status: Roadmap baru.

Tujuan:
- bukan omnichannel penuh, tapi tempat mencatat calon pelanggan yang masuk dari WhatsApp/katalog.

Fitur:
- input lead manual,
- sumber lead: WhatsApp, katalog, offline, referral,
- kebutuhan: servis HP/laptop/sparepart,
- status lead: baru, difollow-up, datang ke toko, batal,
- konversi lead menjadi servis/POS.

Catatan:
- Jangan langsung integrasi IG/FB/TikTok.
- Fokus dulu WhatsApp dan katalog.

---

## Batch 30 — Service Booking dari Katalog

Status: Roadmap baru.

Tujuan:
- pelanggan bisa mengajukan booking servis dari halaman katalog/tracking.

Flow:
- pelanggan buka katalog,
- pilih `Booking Servis`,
- isi nama, WA, perangkat, keluhan,
- data masuk ke Lead Inbox,
- admin konversi menjadi servis resmi.

Paket:
- Pro/Enterprise.

---

## Batch 31 — AI FAQ Servis Ringan

Status: Roadmap baru / tunda sampai core stabil.

Tujuan:
- meniru bagian AI Agent secara terbatas, bukan membuat AI chat umum.

Fungsi AI yang masuk akal:
- menjawab jam buka toko,
- cara cek resi,
- estimasi umum servis,
- daftar layanan toko,
- format booking servis.

Catatan:
- Jangan dibuat dulu sebelum CRM, promo, dan Fonnte automation stabil.
- Bisa menjadi fitur Pro Plus/Enterprise nanti.

---

## Batch 32 — Human Handoff / Assignment Chat

Status: Roadmap baru / tunda.

Tujuan:
- jika nanti ada inbox chat, percakapan bisa ditugaskan ke kasir/admin.

Fitur:
- assign lead ke kasir,
- status follow-up,
- catatan internal,
- reminder follow-up.

---

## Batch 33 — Campaign Analytics

Status: Roadmap baru.

Tujuan:
- owner tahu campaign mana yang berhasil.

Fitur:
- jumlah target,
- terkirim,
- gagal,
- dibuka manual,
- respon pelanggan,
- pelanggan datang kembali,
- omzet dari campaign.

Catatan:
- Untuk awal, metrik bisa sederhana: campaign dikirim, pelanggan yang kemudian transaksi lagi dalam 14 hari.

---

## Batch 34 — Review & Testimonial Engine

Status: Roadmap baru.

Tujuan:
- setelah servis selesai, toko bisa minta review/testimoni.

Flow:
- status servis `DIAMBIL`,
- sistem rekomendasikan kirim WA minta review,
- pelanggan diarahkan ke Google Maps/WhatsApp testimoni,
- testimoni pilihan bisa dipakai di landing/katalog toko.

Paket:
- Pro/Enterprise.

---

## Batch 35 — Partner / White Label Sales Kit

Status: Roadmap baru.

Tujuan:
- paket White Label punya bahan jualan yang jelas.

Fitur:
- partner dashboard,
- materi promosi partner,
- demo tenant partner,
- daftar client partner,
- custom logo/warna,
- custom domain roadmap,
- branded APK roadmap.

---

## Batch 36 — V2 Backend Core

Status: Roadmap besar / setelah V1 stabil dipakai user nyata.

Tujuan:
- semua transaksi penting lewat backend aman.

Fitur:
- atomic POS checkout,
- finance ledger,
- transaction items,
- service event log,
- notification log,
- strict role permission,
- RLS final,
- audit log,
- secure WhatsApp token storage.

---

# Prioritas Eksekusi Setelah Ini

Urutan yang disarankan:

```text
1. Merge/cek PR paket publik terakhir jika belum
2. Batch 20 — Super Admin Control Center
3. Batch 21 — Billing Trial Expired Suspend
4. Batch 23 — Promo Banner Publik Pro
5. Batch 24 — WhatsApp Marketing Fonnte Automation
6. Batch 26 — Service CRM Timeline
7. Batch 27 — Smart Follow-up Rules
8. Batch 28 — Campaign Template Library
9. Batch 25 — Android Update Manager
10. Batch 36 — V2 Backend Core
```

Urutan marketing ala Cekat.AI jangan dimulai dari AI. Mulai dari CRM, template, follow-up, campaign log, baru AI.

---

# Kesimpulan Founder

UnitPro harus mengambil kekuatan marketing dari Cekat.AI, tetapi tetap spesifik untuk toko servis.

Arah paling tajam:

> UnitPro bukan hanya aplikasi catat servis. UnitPro membantu toko servis bekerja rapi, pelanggan tidak terus bertanya status, dan pelanggan lama bisa datang kembali lewat CRM + WhatsApp follow-up.

Fitur marketing yang paling layak dijual di Pro:

1. CRM pelanggan servis.
2. Smart follow-up pelanggan.
3. WhatsApp campaign Fonnte.
4. Promo banner publik.
5. Template campaign siap pakai.
6. Riwayat follow-up dan campaign.
7. Booking servis dari katalog.

AI Agent boleh masuk nanti, tapi jangan menjadi fondasi awal.
