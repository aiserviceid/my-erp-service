# Roadmap Paket Pro UnitPro

Versi: 1.0  
Tanggal: 8 Agustus 2026  
Status: Roadmap fitur Pro setelah sinkronisasi paket Free / Pro / Enterprise / White Label.

---

## Tujuan Paket Pro

Paket Pro adalah paket utama yang dijual untuk toko servis aktif. Free hanya untuk mencoba dan merapikan pencatatan dasar. Pro harus terasa berbeda karena membuka fitur operasional, marketing, laporan, tim, dan pertumbuhan pelanggan.

Prinsip founder:

> Free membuat user mencoba. Pro membuat toko benar-benar berjalan profesional.

---

## Pembagian Paket Terbaru

| Paket | Target | Status |
|---|---|---|
| Free | Toko kecil yang ingin coba dulu | Publik, daftar langsung |
| Pro | Toko servis aktif | Paket utama penjualan |
| Enterprise | Banyak outlet/cabang | Konsultasi / berbayar lebih tinggi |
| White Label / Partner | Brand sendiri / reseller / distributor | Khusus konsultasi, bukan daftar umum |

---

## Batas Paket Free

Free harus cukup berguna untuk mencoba, tapi tidak terlalu kuat sampai mengurangi alasan upgrade.

| Limit | Free |
|---|---:|
| Servis | 25 servis/bulan |
| Transaksi POS | 50 transaksi/bulan |
| Produk / sparepart / jasa | 50 produk |
| Karyawan / teknisi / kasir | 0 akun tambahan |
| Export Excel | Tidak aktif |
| WhatsApp Marketing | Tidak aktif |
| Iklan & Promo | Tidak aktif |
| Katalog publik | Tidak aktif / dibatasi |
| Custom branding toko | Tidak aktif |

---

## Posisi Paket Pro

Paket Pro adalah paket yang harus ditawarkan sebagai rekomendasi utama di landing page dan form daftar.

Harga publik saat ini:

```text
Rp99.000/bulan
Promo tahunan: Rp590.000/tahun pertama
```

Target user:

- toko servis HP,
- toko servis laptop,
- toko servis elektronik,
- konter yang mulai punya kasir/teknisi,
- toko yang ingin mengurangi tanya status dari pelanggan,
- owner yang ingin melihat laporan toko.

---

## Fitur Wajib Paket Pro

| Area | Fitur Pro | Status yang Diinginkan |
|---|---|---|
| Servis | Unlimited servis | Aktif |
| Kasir/POS | Unlimited transaksi | Aktif |
| Produk | Unlimited produk/jasa/sparepart | Aktif |
| Tim | Akun teknisi/kasir sampai 20 | Aktif |
| Teknisi | Penugasan servis ke teknisi | Aktif |
| WhatsApp | WA pelanggan/status/manual/autoflow | Aktif |
| CRM | Segmentasi pelanggan & follow-up | Aktif |
| WA Marketing | Campaign manual berbasis segmen | Aktif |
| Laporan | Laporan owner premium | Aktif |
| Export | Export Excel | Aktif |
| Katalog | Katalog publik toko | Aktif |
| Branding | Logo toko, rekening, QRIS, catatan nota | Aktif |
| Iklan & Promo | Promo banner publik | Aktif khusus Pro/Enterprise |

---

# Batch 22 — Promo Banner Publik Pro

## Tujuan

Menyelesaikan fitur **Iklan & Promo** agar bukan hanya form pengaturan, tetapi benar-benar tampil di halaman publik toko.

Fitur ini masuk **Paket Pro dan Enterprise**, bukan Free.

---

## Kenapa Masuk Paket Pro

Promo Banner adalah fitur marketing. Fitur marketing langsung membantu toko mendapatkan penjualan ulang, repeat order, dan pelanggan lama kembali. Karena itu fitur ini harus menjadi alasan upgrade dari Free ke Pro.

Kalimat jual:

> Dengan Paket Pro, toko tidak hanya mencatat servis, tapi juga bisa menampilkan promo ke pelanggan melalui katalog dan halaman tracking.

---

## Lokasi Tampilan Promo

### 1. Katalog Publik Toko

URL:

```text
/katalog/:tenantCode
```

Tampil di atas daftar produk/jasa.

Contoh tampilan:

```text
Promo Minggu Ini
- Ganti LCD diskon 10%
- Cleaning HP mulai Rp25.000
- Upgrade SSD laptop diskon minggu ini
```

Tujuan:

- mendorong penjualan sparepart,
- menawarkan jasa tambahan,
- membuat katalog terasa hidup,
- membantu toko melakukan promosi tanpa desain manual.

---

### 2. Halaman Tracking Pelanggan

URL:

```text
/tracking?resi=TRX-xxxx
```

Tampil setelah status servis.

Contoh:

```text
Promo untuk pelanggan servis:
Tunjukkan resi ini untuk diskon cleaning berikutnya.
```

Tujuan:

- repeat order,
- cross-sell jasa lain,
- pelanggan yang sedang cek status melihat promo toko.

---

### 3. Nota / Struk

Untuk nota thermal, jangan tampilkan gambar besar. Cukup teks pendek.

Contoh:

```text
Promo: Tunjukkan nota ini untuk diskon servis berikutnya.
```

Tujuan:

- tetap hemat kertas,
- tidak mengganggu layout thermal printer,
- promo tetap terbaca.

---

## Pengaturan di Admin

Menu:

```text
Pengaturan Toko → Iklan & Promo
```

Field yang dibutuhkan:

| Field | Fungsi |
|---|---|
| Judul promo | Contoh: Promo Service Laptop |
| Deskripsi singkat | Contoh: Diskon 10% untuk upgrade SSD |
| Gambar promo | Opsional untuk katalog/tracking |
| Teks nota | Teks pendek untuk struk thermal |
| Link CTA | Opsional, misal WhatsApp toko |
| Status aktif | Aktif/nonaktif |
| Lokasi tampil | Katalog, Tracking, Nota |

---

## Aturan Fitur

| Paket | Akses Iklan & Promo |
|---|---|
| Free | Terkunci, tampil upgrade prompt |
| Pro | Aktif |
| Enterprise | Aktif |
| White Label | Aktif sesuai konfigurasi partner |

Batas aman awal:

```text
Maksimal 3 promo aktif per toko
```

Alasan:

- halaman publik tidak ramai,
- lebih mudah dikelola,
- tidak membuat pelanggan bingung.

---

## Struktur Data Disarankan

Untuk tahap awal, promo bisa tetap disimpan di `tenant.settings.ads`.

Contoh struktur:

```json
[
  {
    "id": "promo-001",
    "title": "Promo Cleaning Laptop",
    "description": "Cleaning laptop mulai Rp50.000 minggu ini.",
    "imageUrl": "base64-or-url",
    "receiptText": "Promo cleaning laptop mulai Rp50.000.",
    "ctaText": "Tanya Promo",
    "ctaUrl": "https://wa.me/628xxxx",
    "isActive": true,
    "showOnCatalog": true,
    "showOnTracking": true,
    "showOnReceipt": true
  }
]
```

Untuk jangka panjang, jika jumlah tenant sudah banyak, pindahkan ke tabel khusus:

```sql
CREATE TABLE IF NOT EXISTS tenant_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  receipt_text TEXT DEFAULT '',
  cta_text TEXT DEFAULT 'Hubungi Toko',
  cta_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  show_on_catalog BOOLEAN DEFAULT true,
  show_on_tracking BOOLEAN DEFAULT true,
  show_on_receipt BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_promotions_tenant_code
ON tenant_promotions(tenant_code);
```

Tahap awal tidak wajib tabel baru, agar implementasi cepat dan tidak mengganggu flow saat ini.

---

## Acceptance Criteria Batch 22

Batch 22 dianggap selesai kalau:

- Paket Free tidak bisa membuat promo.
- Pro/Enterprise bisa tambah promo.
- Maksimal 3 promo aktif.
- Promo bisa aktif/nonaktif.
- Promo tampil di `/katalog/:tenantCode`.
- Promo tampil di `/tracking` setelah status servis.
- Teks promo bisa tampil di nota/struk tanpa merusak layout thermal.
- Data promo tersimpan setelah refresh.
- Build berhasil.

---

## Copywriting Landing Page untuk Paket Pro

Tambahkan benefit di paket Pro:

```text
Iklan & Promo toko tampil di katalog dan tracking pelanggan
```

Atau versi pendek:

```text
Promo Banner Publik
```

Copy utama:

```text
Paket Pro membantu toko bukan hanya mencatat servis, tapi juga menjaga pelanggan lama agar datang kembali lewat CRM, WhatsApp, katalog, dan promo publik.
```

---

## Urutan Eksekusi Setelah PR Paket Publik

```text
1. Merge PR #21 — Finalize Public Packages and White Label CTA
2. Update local main
3. Batch 22 — Promo Banner Publik Pro
4. Test katalog publik
5. Test tracking pelanggan
6. Test nota thermal
7. Baru promosikan Paket Pro sebagai paket utama
```

---

## Kesimpulan Founder

Fitur **Iklan & Promo** harus diposisikan sebagai fitur Pro karena manfaatnya langsung ke marketing toko.

Free cukup untuk mencoba pencatatan. Pro harus menjadi alat kerja dan alat jualan toko.
