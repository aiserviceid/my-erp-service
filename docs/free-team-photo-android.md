# UnitPro 1.2.15 — Tim Free, foto servis dan ukuran APK

Desain lama dipertahankan. Perubahan dibangun dari main df1d4fddc6312519ce972e26f24dab74d439f117, bukan branch redesign.

## Perubahan
- Free dapat menambah 1 anggota tim (teknisi atau kasir), selain akun pemilik toko. Anggota kedua ditolak melalui UI, API dan trigger database. Akun lama yang sudah memiliki lebih dari 1 anggota tidak dihapus; penambahan baru diblokir.
- Penerimaan servis menyediakan Ambil foto / Pilih dari galeri, pratinjau dan hapus. Foto opsional diperkecil hingga sisi terpanjang 1280 piksel, lalu disimpan bersama servis sebagai data gambar di kolom photo_url. Maksimal satu foto, sekitar 525 KB setelah kompresi. Pada penerimaan beberapa unit, foto terkait unit pertama. Foto ditampilkan pada daftar servis owner dan teknisi.
- Menghapus seluruh dist/downloads sebelum Capacitor sync. GitHub Actions sekarang menggunakan langkah tersebut, npm ci, pemeriksaan APK bersarang, batas ukuran 20 MB dan verifikasi apksigner sebelum distribusi.
- Versi Android dan web 1.2.15, versionCode 26. Kunci rilis yang sama dipertahankan; tanda tangan v1 dan v2 diaktifkan. Kamera dinyatakan opsional, dengan queries untuk aplikasi kamera Android 11+.

## Penerapan
1. Mulai dari main, dengan perubahan lokal lain sudah disimpan. Jangan terapkan paket redesign sebelumnya.
2. Jalankan `git apply --check --unidiff-zero UnitPro-Perbaikan.patch`, lalu `git apply --unidiff-zero UnitPro-Perbaikan.patch`.
3. Jalankan isi `server/migrations/20261003_free_team_service_photo.sql` di Supabase SQL Editor sebelum deploy frontend. Trigger membatasi tim secara atomik. Jika menggunakan backend SQLite, perubahan schema dijalankan saat backend dimulai kembali.
4. Jalankan `npm ci`, `npm run build`, lalu deploy web sesuai proses saat ini. Wrapper Android memakai URL web produksi, sehingga web perlu ikut diperbarui.
5. Commit dan push ke main. Workflow Build Android APK & Release membangun APK 1.2.15, memeriksa ukuran dan tanda tangan, membuat release, serta memperbarui APK stabil untuk landing page.
6. Uji kamera nyata dan instal/upgrade pada Samsung Note 10 sebelum menyatakan dukungan perangkat telah terverifikasi.

## Hasil pemeriksaan
- Build Vite berhasil; pemeriksaan sintaks backend dan git diff berhasil.
- Smoke lima halaman publik berhasil.
- Pengujian browser dengan Supabase tiruan: Free anggota pertama berhasil; anggota kedua ditolak melalui UI dan API; servis tanpa foto berhasil; galeri/kamera, kompresi, pratinjau, hapus dan simpan foto berhasil. Tidak mengubah data produksi.
- Trigger SQLite: anggota kedua dan pemindahan anggota ke toko Free penuh ditolak; penggantian setelah hapus dan penambahan pada Pro berhasil. Trigger PostgreSQL belum dijalankan pada Supabase produksi.
- Capacitor sync berhasil. Native assets 6.8 MB dan tidak memiliki file APK bersarang.
- Verifier menerima APK lama 4.77 MB dan menolak APK stabil 102.41 MB sesuai batas ukuran.
- APK stabil saat ini berisi assets/public/downloads/UnitPro.apk berukuran 93.53 MB dan APK 1.2.3 berukuran 4.77 MB. Inilah penyebab ukuran membengkak setiap build.
- APK stabil: com.trackingservice.app, versionCode 12, versi 1.2.13, minSdk 22, targetSdk 34, memiliki tanda tangan v1/v2. Sertifikat kedua APK lama sama, dan cocok dengan keystore rilis source.
- APK baru belum dihasilkan: Gradle tidak bisa diunduh karena jaringan lingkungan eksekusi memblokir services.gradle.org. Tidak ada APK baru dalam paket ini.
- Perubahan belum dikirim ke GitHub atau database produksi karena akses tulis GitHub tidak tersedia pada sesi ini.

## Diagnosis Note 10
Tidak ditemukan bukti bahwa minSdk atau arsitektur APK menolak Note 10. Belum ada hasil instal langsung, kode error Package Manager atau foto pesan installer, jadi penyebab kegagalan belum pasti. APK bersarang menjelaskan ukuran besar, bukan bukti penyebab gagal instal.

Jika gagal pada APK baru, catat pesan installer, versi Android, apakah aplikasi lama sudah terpasang, dan gunakan `adb install -r UnitPro-Android-v1.2.15.apk` untuk memperoleh kode error. Jangan menghapus aplikasi lama sebelum data dan sesi penting aman. Android mensyaratkan sertifikat yang cocok untuk upgrade: https://developer.android.com/studio/publish/app-signing . Deklarasi queries: https://developer.android.com/training/package-visibility/declaring .

Pengujian browser dapat diulang dengan `node scripts/test-service-photo.mjs` menggunakan Puppeteer/Chromium. Semua permintaan keluar diblokir atau diganti respons tiruan.
