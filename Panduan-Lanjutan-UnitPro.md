# UnitPro — lanjutan autentikasi pegawai dan tanggal komisi
Tanggal 3 Oktober 2026. Belum push/deploy; tidak menyentuh database produksi.

## Patch yang dipilih
- UnitPro-Lengkap-Lanjutan.patch: seluruh perubahan sejak main 547b185da6c42608f8fa2ab05f5193f5c0e66a35, termasuk patch Free Team/foto/Android, Gemini, bug cepat, dan lanjutan ini.
- UnitPro-Lanjutan-Autentikasi.patch: tambahan saja setelah UnitPro-Lengkap-Terbaru.patch sebelumnya. Baseline tree f5046f94e5a0f417119aa2390214d70abf0e0452.
Pilih satu sesuai kode Anda. Jangan menerapkan keduanya atau mengulang patch lama. Cadangkan perubahan lokal lalu gunakan git apply --check sebelum git apply, di repo UnitPro yang benar.

## Perbaikan baru
1. Login pegawai produksi tidak membaca PIN langsung dari browser/database atau membuat token EMP_.
2. Endpoint POST /api/employee/login pada Vercel dan Express memakai database Supabase server-side dengan service role, memverifikasi PIN, menerbitkan JWT HS256 tenant-scoped 8 jam, dan mengembalikan hanya id/nama/peran/telepon/kode toko.
3. PIN plaintext lama 4–12 digit diubah menjadi bcrypt hash saat login berhasil. Update compare-and-swap memeriksa ID, tenant, dan PIN lama. Konflik/failure migrasi tidak menerbitkan token.
4. PIN salah, peran selain TEKNISI/KASIR, tenant berbeda, dan PIN yang cocok lebih dari satu pegawai ditolak. PIN pegawai harus unik di toko; duplikasi perlu reset oleh owner/admin.
5. Validasi input dan pembatasan percobaan per worker: 5 percobaan/15 menit per toko+alamat client. Batas map 10.000 entri. Ini bukan distributed limiter; produksi tetap perlu edge/WAF/shared limiter.
6. Sesi pegawai dipasang setelah pergantian toko, cart/token owner dibersihkan, token pegawai tidak disimpan sebagai token owner. Pemilihan token WhatsApp mengikuti sesi pegawai aktif.
7. Respons kegagalan inisialisasi serverless tidak lagi mengirim stack trace/detail internal ke browser.
8. Tanggal komisi baru memakai tanggal income yang cocok persis dengan resi dan tenant, atau paid_at/picked_up_at eksplisit. Tidak lagi memakai created_at/updated_at servis. Backfill tanpa bukti pembayaran dilewati. Komisi historis yang sudah tersimpan tidak diubah otomatis.

## Konfigurasi dan kompatibilitas
Simpan konfigurasi server di .env lokal proyek atau environment hosting proyek:
- SUPABASE_URL (atau VITE_SUPABASE_URL untuk URL saja)
- SUPABASE_SERVICE_ROLE_KEY: server only, jangan memakai prefix VITE_
- JWT_SECRET: secret privat kuat, harus sama antara login pegawai dan verifier route bisnis.
Tidak ada secret baru dibuat, dicetak, atau diganti di mesin ini. Login serverless gagal tertutup dengan 503 jika JWT_SECRET/service role belum tersedia. Express memakai JWT_SECRET existing; default development-nya bukan untuk produksi.
Express login pegawai kini memakai Supabase persistent, bukan users SQLite lokal. Akun yang hanya ada di SQLite perlu dimigrasikan/ditinjau terlebih dahulu. Tidak ada fallback login ketika Supabase gagal.
Jika VITE_API_URL menunjuk Supabase Edge/backend lain, backend itu harus menyediakan endpoint employee/login dengan format {user, token} dan JWT yang sesuai. Source unitpro-secure-api tidak ada di repo; perubahan ini tidak otomatis memperbaiki Edge tersebut.
Login hanya menerima kode toko, bukan pencarian nama toko di browser. Gunakan kode resmi.
Sesi EMP_ lama perlu logout lalu login ulang. Perpindahan dari owner ke pegawai mengakhiri token owner di browser.
Mode DEMO-STORE tetap lokal, token demo tidak berlaku untuk route produksi.
Perbaikan AI dan Free Team tetap membutuhkan migrasi SQL pada panduan sebelumnya. Tidak ada migrasi SQL baru untuk batch ini.

## Verifikasi
40 tes lokal lulus (10 AI, 22 bug cepat/client, 8 autentikasi pegawai/tanggal komisi), build Vite berhasil, syntax server diperiksa.
Pengujian memakai database mock/transport mock/VM dan JWT nyata untuk tes, bukan database produksi. Bcrypt diverifikasi nyata; tidak menguji deployment, APK baru, migrasi live, atau beban paralel database. Peringatan ukuran bundle Vite masih ada.

## Status audit yang jujur
UP-07 ditangani pada jalur login browser/server, tetapi belum sepenuhnya tertutup: pembuatan/edit pegawai dan daftar users masih memakai jalur database lama, PIN plaintext historis yang belum login serta RLS longgar tetap risiko. Harus dilanjutkan dengan CRUD server-side dan kebijakan RLS tervalidasi, jangan sekadar mematikan akses anon tanpa memigrasikan semua fitur.
UP-31 ditangani untuk pembuatan/backfill komisi baru yang memiliki bukti pembayaran; komisi historis perlu rekonsiliasi terpisah. Race/double commission belum atomik.
Prioritas berikutnya tetap: UP-02 RLS/isolasi tenant; UP-03 rotasi secret/signing key yang terekspos; UP-08/10/11/13/14/15 atomic pickup/stok/withdraw/tip/afiliasi dan idempotensi DB. Jangan menyebut semua 32 bug selesai.
Belum selesai lainnya: sisa route auth, serverless SQLite, kuota server-side, edit qty vs stok, schema, native version, advisori dependency, lint dan build APK nyata. Rincian batch lama ada di Panduan-Bugfix-Cepat.md.
Tidak ada push, deploy, login global, atau perubahan akun Git global. Deployment hanya setelah persetujuan melalui git push atau token .env lokal proyek.
