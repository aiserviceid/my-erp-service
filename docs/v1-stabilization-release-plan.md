# V1 Stabilization Release Plan

Dokumen ini adalah release gate untuk PR #16: **V1 Stabilization Integration**.

## Tujuan Rilis

Rilis ini bukan V2 dan bukan bongkar total. Tujuannya adalah membuat versi v1 lebih stabil, aman, dan siap dites/dijual sebelum masuk ke arsitektur V2 backend-core.

Prinsip produk:

> Sekali kasir memasukkan data, seluruh sistem ikut bekerja.
> Sekali teknisi mengubah progres, admin dan pelanggan ikut mengetahui.
> Sekali transaksi terjadi, stok, keuangan, nota, dan dashboard ikut berubah.

## Scope yang Masuk

- Service core: status awal `PROSES`, edit keterangan/rincian nota, tenant guard update nota.
- Notification service: WhatsApp flow dipusatkan untuk Employee Portal dan Admin Dashboard.
- Security tenant guard: backend service/settings endpoint lebih aman dengan tenant validation.
- POS stock guard: stok divalidasi dan dikurangi sebelum transaksi POS dibuat.
- Finance guard: mencegah pelunasan servis dobel masuk laporan keuangan.
- Customer tracking privacy: field publik dibatasi dan nama pelanggan disamarkan.
- UX recovery: error boundary agar aplikasi tidak blank screen.
- Regression checklist: checklist manual sebelum deploy.

## Hal yang Sengaja Belum Masuk

- Full database transaction atomic untuk POS.
- Full finance ledger.
- Full Supabase RLS.
- Notification logs database.
- Service event timeline database.
- Migrasi semua write/read sensitif ke backend.

Semua hal tersebut masuk kandidat **V2 backend-core**, bukan stabilisasi v1.

## Risiko Utama yang Harus Dicek Manual

1. **Servis baru**
   - Kasir/admin bisa membuat servis baru.
   - Status awal menjadi `PROSES`.
   - Resi muncul di tracking publik.
   - Nota pendaftaran bisa dicetak.

2. **Edit nota servis**
   - Keterangan/rincian bisa diedit.
   - Biaya sparepart, jasa, dan diskon tersimpan.
   - Nota pelunasan membaca rincian dengan benar.

3. **WhatsApp**
   - Link manual WhatsApp tetap terbuka.
   - Nomor WA dinormalisasi ke format Indonesia.
   - Fallback manual tetap jalan jika token Fonnte/CUSTOM tidak tersedia.

4. **POS dan stok**
   - Produk fisik tidak bisa checkout kalau stok kurang.
   - Produk kategori `JASA` tidak mengurangi stok fisik.
   - Jika transaksi gagal setelah stok berubah, rollback best-effort berjalan.

5. **Keuangan**
   - Pelunasan servis tidak tercatat dobel saat status diubah berulang.
   - `INCOME_JASA` dan `INCOME_SPAREPART` tampil sebagai pemasukan.
   - POS income tetap tampil normal.

6. **Tracking publik**
   - Resi valid tetap bisa dicari.
   - Nama pelanggan tersamarkan.
   - Nomor HP tidak bocor dari teks keluhan.
   - Link WA toko tetap jalan.

7. **Mobile/Android**
   - Login tidak blank.
   - Dashboard tidak blank.
   - Jika render error terjadi, halaman recovery tampil.
   - Tombol Muat Ulang dan Ke Login bekerja.

## Go / No-Go Rule

### Go jika:

- `npm run build` berhasil.
- Checklist manual di `docs/regression-checklist.md` lulus untuk alur utama.
- Tidak ada data toko lain yang terlihat di tenant berbeda.
- Servis, POS, finance, tracking, dan WhatsApp manual tetap bisa dipakai.

### No-Go jika:

- Login tenant/karyawan gagal.
- Servis baru tidak bisa dibuat.
- POS checkout normal gagal.
- Tracking publik tidak bisa menemukan resi valid.
- Laporan keuangan berubah drastis tanpa alasan.
- Mobile/Android blank screen di alur utama.

## Rollback Plan

Jika PR #16 sudah merge lalu terjadi masalah besar:

1. Revert merge commit PR #16 dari GitHub.
2. Deploy ulang commit `main` sebelum PR #16.
3. Jika memakai Vercel, gunakan rollback deployment ke versi sebelumnya.
4. Jangan mengaktifkan Supabase RLS baru selama rollback, karena PR ini tidak membutuhkan migrasi RLS.
5. Catat modul penyebab: service, POS, finance, tracking, notification, atau mobile.

## Catatan Founder

PR #16 adalah jalur utama rilis stabilisasi v1. PR batch lama sudah ditutup agar tidak ada double merge dan conflict history. Jangan merge PR #7 sampai PR #15 satu per satu setelah PR #16 dipakai.

Setelah PR #16 lulus manual test dan masuk `main`, fase berikutnya adalah **V2 backend-core** dengan pondasi backend, ledger, event log, notification log, dan security yang lebih kuat.
