# UnitPro — perbaikan Gemini dan penyimpanan API key

## Status dan basis

Paket dibangun dari main `547b185da6c42608f8fa2ab05f5193f5c0e66a35` dan mempertahankan patch `UnitPro-Free-Team-Foto-APK (1).zip` dari pengguna. Desain lama dipertahankan. Tidak ada push, deployment, perubahan database produksi, atau penggunaan API key asli. Paket ini tidak mengandung seluruh repo atau APK baru; isinya patch gabungan dan file yang berubah.

## Temuan dan perbaikan

- Endpoint Vercel sebelumnya memakai fallback anon/publishable untuk mengakses `app_config`, padahal tabel privat tersebut tidak memberikan izin kepada frontend. Kini hanya `SUPABASE_SERVICE_ROLE_KEY` server yang dipakai, dan konfigurasi yang belum lengkap menghasilkan 503 dengan petunjuk, bukan 500 generik.
- Endpoint Vercel sebelumnya tidak memverifikasi sesi Super Admin dan menyimpan field plaintext `api_key`. Backend Express membaca `api_key_enc`, sehingga key yang disimpan di satu endpoint tidak dapat dipakai backend lain. Kini semua endpoint berbagi modul persistensi, memverifikasi akses Super Admin, menyimpan AES-256-GCM, dan tidak mengembalikan key asli. Record plaintext lama tetap bisa dibaca dan dienkripsi pada penyimpanan berikutnya. Key kosong mempertahankan key sebelumnya; field eksplisit `clear_api_key: true` menghapus key database, dengan environment tetap sebagai fallback.
- Baca database yang gagal tidak dianggap sebagai konfigurasi kosong dan tidak boleh menimpa key. Tidak mengurangi RLS atau memberi anon akses demi membuat tombol simpan bekerja.
- Model 1.5/2.0 lama tidak lagi ditawarkan; konfigurasi lama dialihkan ke `gemini-3.8-flash`. Pilihan hemat `gemini-3.5-flash-lite`, 3.1 Flash-Lite dan model 2.5 dengan catatan akses akun lama tersedia. Akses aktual tetap bergantung pada key/kuota; Tes Koneksi membedakan model tidak tersedia, akses key, kuota, koneksi, dan respons kosong. Tes tidak selalu mengaku sukses setelah menerima HTTP 200.
- Properti `store: false` yang bukan field permintaan Gemini generateContent dihapus. Request memiliki timeout dan mengabaikan part pemikiran internal.
- Formulir tidak boleh menyimpan setelah konfigurasi gagal dimuat, tidak mengaku berhasil ketika menerima HTML atau JSON yang tidak lengkap, menyediakan muat ulang, dan lebih rapi pada layar sempit.

Dokumentasi model yang diperiksa pada 3 Oktober 2026: https://ai.google.dev/gemini-api/docs/deprecations . Google mencatat penghentian Gemini 2.0 pada 1 Juni 2026, serta menyarankan 3.8 Flash/3.5 Flash-Lite untuk proyek baru. Model 2.5 dibatasi untuk akun yang sudah pernah memakainya.

## Penerapan aman

1. Simpan seluruh perubahan lokal lain terlebih dahulu. Patch gabungan ditujukan ke main dengan hash di atas. Jangan menerapkannya bersamaan dengan patch Free/Foto/APK lama karena perubahan itu sudah disertakan. Bila main berubah atau patch lama sudah diterapkan, gunakan patch AI-only pada folder `patches/` dan cek konflik terlebih dahulu. Perubahan lain yang sedang dilakukan di chat/cloud, namun tidak ada di ZIP pengguna, tidak termasuk paket ini.
2. Di root repo jalankan `git apply --check <path-ke-UnitPro-Gabungan.patch>`, lalu `git apply <path-ke-UnitPro-Gabungan.patch>`. Untuk pekerjaan yang sudah memakai patch Free/Foto/APK, gunakan `UnitPro-Gemini-only.patch` sebagai gantinya.
3. Terapkan kedua SQL dari folder `migrations/` menggunakan Supabase SQL Editor: `20261003_free_team_service_photo.sql` dan `20261003_ai_config.sql`. Migrasi AI membuat tabel bila belum ada, mempertahankan RLS, dan memberi izin hanya kepada service_role. Tidak menghapus record konfigurasi.
4. Isi environment SERVER proyek: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`. Untuk lokal, gunakan `.env` lokal proyek, misalnya `node --env-file=.env server/index.cjs` (Node yang mendukung flag tersebut). `.env` tidak boleh masuk Git. Vercel perlu nilai yang sama pada environment proyek/deployment; file `.env` lokal tidak otomatis dibaca server produksi. Jangan memakai prefiks `VITE_` untuk service role, JWT secret atau Gemini key. Opsional `GEMINI_API_KEY`, `GEMINI_MODEL` sebagai fallback server.
5. PENTING: login produksi saat ini diproksikan ke Supabase Edge Function `unitpro-secure-api`, yang source-nya tidak ada dalam repo ini. `JWT_SECRET` verifier Vercel/Express harus sama dengan secret penerbit token Edge Function. Pertahankan secret yang sudah digunakan untuk enkripsi. Jangan mengganti secret atau melewati verifikasi JWT untuk menghilangkan error sesi. Bila secret tidak cocok, simpan/test akan mendapat 401 sampai environment disamakan. Uji juga login/2FA yang berlaku sebelum deploy.
6. Jalankan `npm ci`, `node --test scripts/test-ai-config.mjs`, `npm run build`. Git identity, bila diperlukan untuk commit, hanya diatur via `git config --local user.name` dan `git config --local user.email` sesuai identitas pemilik; tidak ada login atau konfigurasi global.
7. Setelah pengguna menyetujui publikasi, gunakan git push untuk auto-deploy. Tidak ada publikasi yang dilakukan saat membuat paket ini. APK baru harus dibangun dan diuji tersendiri; semua batasan pengujian Note 10 pada panduan patch awal masih berlaku.
8. Uji produksi secara terkontrol: login Super Admin, buka AI, pastikan tidak gagal memuat, masukkan key melalui formulir (jangan lewat chat), Tes Koneksi, Simpan, reload, tes ulang tanpa mengisi key, dan tes penggunaan AI tenant dengan data uji. Pastikan tenant/tanpa token ditolak dari endpoint admin. Record database hanya mengandung `api_key_enc`; key tidak muncul di respons browser.

## Pengujian yang selesai

- 10 tes lokal otomatis: migrasi model, enkripsi/read/key kosong, migrasi plaintext, fallback environment/hapus key, kegagalan tabel/izin, validasi input, kegagalan Gemini, auth JWT/role endpoint Vercel, larangan anon key, integrasi Express.
- Build Vite berhasil; pemeriksaan sintaks backend/handler dan `git diff --check` lolos.
- Browser lokal dengan API tiruan: formulir model baru, tes koneksi, simpan dan pembersihan input key; 503 menampilkan instruksi server serta menonaktifkan simpan/test agar data tidak tertimpa.
- API/database produksi dan key asli tidak digunakan. Pengujian kamera/APK dari patch awal belum diulang pada perangkat nyata.
- Audit dependency menunjukkan risiko yang sudah ada: 8 temuan production (5 moderate, 3 high); audit seluruh dependency mencatat 14 temuan, termasuk 1 critical. Tidak menjalankan upgrade paksa yang bisa merusak fitur lain. Audit perlu penanganan terpisah.

## Batasan

Tidak menyatakan seluruh bug aplikasi selesai. Source Edge Function, konfigurasi deployment aktif dan log produksi belum tersedia. Patch memperbaiki masalah yang ditemukan pada source repo, tetapi error live memerlukan environment server dan migrasi yang benar. Tidak mengubah akun lain di komputer atau kredensial global.
