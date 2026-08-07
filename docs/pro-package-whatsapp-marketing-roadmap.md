# Roadmap Batch 23 — WhatsApp Marketing Fonnte Automation

Versi: 1.0  
Tanggal: 8 Agustus 2026  
Status: Roadmap lanjutan Paket Pro setelah Promo Banner Publik.

---

## Tujuan

Menyelesaikan fitur **WhatsApp Marketing Pro** agar bukan hanya segmentasi pelanggan dan buka WhatsApp manual, tetapi benar-benar bisa mengirim campaign melalui token API Fonnte dengan aman, terkontrol, dan tercatat.

Fitur ini masuk:

| Paket | Akses |
|---|---|
| Free | Terkunci |
| Pro | Aktif |
| Enterprise | Aktif |
| White Label | Aktif sesuai konfigurasi partner |

---

## Kondisi Saat Ini

Yang sudah ada:

- Token Fonnte bisa diisi di `Pengaturan Toko → WhatsApp Gateway`.
- Mode pengiriman bisa dipilih: `SYSTEM` atau `CUSTOM`.
- Token disimpan di `tenant.settings.fonnte_token`.
- Service `notificationService.js` sudah punya fondasi kirim ke endpoint Fonnte.
- CRM pelanggan sudah bisa membuat segmentasi pelanggan.
- Panel WhatsApp Marketing sudah punya template pesan dan tombol buka WA target pertama.

Yang belum selesai:

- Campaign massal belum mengirim via Fonnte.
- Belum ada tombol `Kirim Campaign via Fonnte`.
- Belum ada batch limit.
- Belum ada jeda antar pengiriman.
- Belum ada log sukses/gagal.
- Token masih harus dipindahkan ke backend agar lebih aman.

Kesimpulan:

> Fondasi sudah ada, tapi belum layak dijual sebagai WhatsApp Marketing otomatis penuh.

---

## Keputusan Founder

WhatsApp Marketing otomatis harus menjadi fitur **Paket Pro**, karena manfaatnya langsung ke repeat order dan penjualan ulang.

Kalimat jual yang aman setelah Batch 23 selesai:

> Follow-up pelanggan lama, pelanggan siap ambil, pembeli POS, dan pelanggan prioritas lewat campaign WhatsApp yang tersegmentasi.

Jangan gunakan kalimat ini sebelum Batch 23 selesai:

> Kirim WhatsApp massal otomatis.

---

## Scope Batch 23

### 1. Tombol Kirim Campaign via Fonnte

Di panel CRM / WhatsApp Marketing Pro tambahkan tombol:

```text
Kirim Campaign via Fonnte
```

Tombol hanya aktif jika:

- tenant paket Pro/Enterprise/White Label,
- `wa_sender_mode === CUSTOM`,
- `fonnte_token` tersedia,
- segment memiliki nomor WA,
- jumlah target tidak melebihi batas batch.

Jika syarat belum terpenuhi, tampilkan helper:

```text
Aktifkan Fonnte di Pengaturan WhatsApp Gateway untuk mengirim campaign otomatis.
```

---

### 2. Batch Limit Aman

Aturan awal:

```text
Maksimal 20 nomor per campaign
Jeda 3–5 detik antar pesan
```

Alasan:

- mengurangi risiko dianggap spam,
- menjaga reputasi nomor WA toko,
- lebih mudah diaudit jika ada kegagalan kirim.

---

### 3. Preview Sebelum Kirim

Sebelum campaign dikirim, tampilkan modal konfirmasi:

```text
Campaign WhatsApp Pro
Segment: Pelanggan Lama Tidak Datang
Target: 18 nomor
Template: Promo Pelanggan Lama

[Preview Pesan]

Kirim sekarang?
```

Tombol:

```text
Batal
Kirim Campaign
```

---

### 4. Status Kirim Real-time

Setelah mulai kirim, tampilkan progress:

```text
Mengirim 1/18...
Berhasil: 12
Gagal: 1
Menunggu: 5
```

Status per nomor:

| Status | Arti |
|---|---|
| pending | Menunggu dikirim |
| sent | Berhasil dikirim provider |
| failed | Gagal dikirim |
| skipped | Nomor tidak valid / kosong |

---

### 5. Campaign Log

Setiap campaign harus punya riwayat.

Minimal data:

| Field | Fungsi |
|---|---|
| campaign_id | ID campaign |
| tenant_code | Kode toko |
| segment | Segment pelanggan |
| template | Template yang dipakai |
| total_target | Jumlah target |
| sent_count | Berhasil |
| failed_count | Gagal |
| created_at | Waktu kirim |
| created_by | Admin/kasir/owner |

---

## Struktur Data Disarankan

Untuk produksi, gunakan tabel khusus:

```sql
CREATE TABLE IF NOT EXISTS wa_campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT NOT NULL,
  segment TEXT DEFAULT '',
  template_key TEXT DEFAULT '',
  message TEXT DEFAULT '',
  total_target INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES wa_campaign_logs(id) ON DELETE CASCADE,
  tenant_code TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  provider_response JSONB DEFAULT '{}',
  error_message TEXT DEFAULT '',
  sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_campaign_logs_tenant_code
ON wa_campaign_logs(tenant_code);

CREATE INDEX IF NOT EXISTS idx_wa_campaign_recipients_campaign_id
ON wa_campaign_recipients(campaign_id);
```

---

## Keamanan Token Fonnte

Untuk produksi, token Fonnte sebaiknya **tidak dipakai langsung dari frontend**.

Rekomendasi arsitektur:

```text
Frontend CRM
↓
Backend endpoint /api/whatsapp/campaign
↓
Backend membaca token tenant
↓
Backend kirim ke Fonnte
↓
Backend menyimpan log sukses/gagal
```

Endpoint yang disarankan:

```text
POST /api/whatsapp/campaign
```

Payload:

```json
{
  "tenant_code": "TOKO001",
  "segment": "dormant",
  "template_key": "dormant",
  "message": "Halo Kak...",
  "targets": [
    { "name": "Budi", "phone": "6281234567890" }
  ]
}
```

---

## Template Campaign Pro

Template awal:

| Template | Target |
|---|---|
| Reminder Siap Diambil | Pelanggan status selesai belum diambil |
| Promo Pelanggan Lama | Tidak datang lebih dari 60 hari |
| Promo Servis Laptop | Riwayat laptop/PC |
| Promo Servis HP | Riwayat HP/tablet |
| Promo Aksesoris/POS | Pembeli POS |
| Pelanggan Prioritas | Total belanja tinggi / repeat |

---

## Anti-Spam Guard

Aturan awal:

- Maksimal 20 nomor per batch.
- Tidak boleh kirim ke nomor kosong.
- Tidak boleh kirim pesan kosong.
- Tampilkan konfirmasi sebelum kirim.
- Simpan log campaign.
- Beri jeda antar nomor.
- Jangan auto-repeat tanpa persetujuan admin.

Catatan founder:

> UnitPro harus membantu follow-up pelanggan, bukan menjadi alat spam.

---

## UI yang Dibutuhkan

Di panel `CRM Pelanggan / WhatsApp Marketing Pro` tambahkan:

1. Pilihan segment.
2. Pilihan template.
3. Preview pesan.
4. Jumlah target.
5. Tombol `Salin Nomor Segment`.
6. Tombol `Buka WA Target Pertama`.
7. Tombol baru `Kirim Campaign via Fonnte`.
8. Modal konfirmasi.
9. Progress pengiriman.
10. Riwayat campaign terakhir.

---

## Acceptance Criteria Batch 23

Batch 23 dianggap selesai kalau:

- Free tidak bisa memakai campaign otomatis.
- Pro/Enterprise bisa memakai campaign otomatis.
- Token Fonnte dari pengaturan bisa digunakan.
- Campaign dikirim maksimal 20 target per batch.
- Ada preview dan konfirmasi sebelum kirim.
- Ada progress pengiriman.
- Ada status sukses/gagal/skipped.
- Ada campaign log.
- Jika token kosong, tombol otomatis disabled dan diarahkan ke Pengaturan WhatsApp Gateway.
- Build berhasil.
- Tidak ada token sensitif bocor di tampilan publik.

---

## Copywriting Landing Page Pro

Tambahkan ke paket Pro setelah Batch 23 selesai:

```text
Campaign WhatsApp pelanggan via Fonnte
```

Copy utama:

```text
Follow-up pelanggan lama, pelanggan siap ambil, dan pembeli POS lewat campaign WhatsApp yang rapi dan tersegmentasi.
```

---

## Urutan Eksekusi

```text
1. Batch 22 — Promo Banner Publik Pro
2. Batch 23 — WhatsApp Marketing Fonnte Automation
3. Test token Fonnte toko
4. Test campaign 1 nomor
5. Test campaign 5 nomor
6. Test campaign 20 nomor
7. Baru promosikan WA Marketing otomatis sebagai fitur Pro
```

---

## Kesimpulan Founder

WhatsApp Marketing otomatis adalah fitur yang layak menjadi alasan upgrade ke Pro, tetapi harus dibuat aman dan terkendali.

Prinsip akhir:

> Jangan jual spam. Jual follow-up pelanggan yang rapi, tersegmentasi, dan membantu toko meningkatkan repeat order.
