# UnitPro — batch perbaikan bug cepat
Tanggal: 3 Oktober 2026. Perubahan lokal, belum di-push/deploy.

## Pilih satu patch
- UnitPro-Lengkap-Terbaru.patch: untuk checkout main dasar 547b185da6c42608f8fa2ab05f5193f5c0e66a35 yang belum menerima patch sebelumnya. Termasuk perbaikan Gemini, Free Team/foto/Android, dan batch bug ini.
- UnitPro-Bugfix-Cepat.patch: hanya tambahan bug cepat untuk kode yang sudah menerima UnitPro-Gabungan.patch sebelumnya. Baseline tree: 0810fc20271f092dd3e5f0fe4de931649966b7fd.
Jangan menerapkan kedua patch berurutan. Cadangkan perubahan yang belum di-commit terlebih dahulu. Jika main atau kode lokal sudah berbeda, periksa konflik; jangan memakai --reject atau menimpa perubahan pengguna secara otomatis.

Di folder repo UnitPro yang benar:
1. git status --short
2. git apply --check "LOKASI_PATCH"
3. git apply "LOKASI_PATCH"
4. npm ci
5. node --test scripts/test-ai-config.mjs scripts/test-quick-bugs.mjs
6. npm run build
Tidak ada login CLI global atau perubahan akun global. Deployment hanya setelah persetujuan pengguna, lewat git push pada repo yang benar atau token .env lokal. Patch tidak berisi API key privat.

## Temuan yang ditangani dalam batch ini
- UP-01: login gagal/HTML/network tidak lagi jatuh ke fallback database yang menerima PIN salah dan menulis ulang PIN/tier.
- UP-04: respons nota dan metadata toko publik menggunakan allowlist, tidak mengirim seluruh settings/token WhatsApp. Ditambahkan /api/public-tenant untuk Vercel dan Express.
- UP-05: escape teks pelanggan di dua renderer HTML dan nota cetak, URL gambar disaring. Bukan jaminan seluruh template lain bebas XSS.
- UP-06/20: guard tenant menangani GET tanpa body dan memeriksa seluruh petunjuk tenant yang bertentangan. Beberapa route produk/transaksi/user/upload/settings/wallet ditambahkan autentikasi dan pembatasan role. Route lain masih perlu audit.
- UP-09: kegagalan update stok tidak lagi dilaporkan sukses atau dilanjutkan dengan stock movement palsu.
- UP-12: withdrawal/tip menolak nominal negatif, nol, pecahan, NaN, dan integer tidak aman sebelum akses database.
- UP-16: logout/pergantian tenant membersihkan cart, pegawai, dan token lama.
- UP-17: snapshot unsigned dari URL tidak dapat menggantikan data server; pilihan tipe cetak pickup tidak membuat transaksi otomatis dianggap lunas.
- UP-18: ID produk numerik tidak menyebabkan pencarian POS/barcode crash.
- UP-23: reset berhenti dan melaporkan error saat delete gagal; belum transaksi atomik sehingga penghapusan sebagian masih mungkin.
- UP-24/25: query nota publik tidak lagi meminta updated_at yang tidak tersedia; kegagalan seluruh kandidat database dilaporkan 503, bukan 404.
- UP-30: respons HTML 200/status kosong dari gateway WhatsApp tidak lagi dianggap terkirim.
- UP-32: toleransi keterlambatan 0 tetap dihormati.

## Perubahan perilaku / kebutuhan integrasi
Login owner wajib menerima token server yang valid. Login lama dengan PIN kosong sekarang ditolak dan perlu recovery admin yang aman. Tidak ada PIN produksi diubah.
Endpoint login Supabase Edge unitpro-secure-api tidak ada source-nya dalam repo ini. JWT_SECRET server harus sesuai issuer login; token pegawai palsu EMP_ tidak menjadi autentikasi yang sah untuk route yang kini dilindungi.
Metadata internal masih memakai jalur database lama agar pengaturan komisi/gaji tidak hilang. getTenantForSession bukan security boundary: RLS dan autentikasi database tetap WAJIB diperbaiki. Mengamankan endpoint publik saja tidak mencegah akses anon langsung jika RLS masih longgar.
VITE_API_URL yang menunjuk backend lain harus menyediakan /public-tenant. Endpoint tersebut tersedia pada Express repo dan /api/public-tenant Vercel; belum diuji pada deployment pengguna.
Nota offline dari snapshot URL tidak lagi dipercaya; cetak publik perlu data server.
Perbaikan AI memerlukan migrasi 20261003_ai_config.sql, service role dan kunci enkripsi server lokal per proyek. Lihat Panduan-UnitPro-Gemini.md; secret tidak boleh memakai prefix VITE_.
Patch gabungan juga berisi migrasi Free Team/foto yang disertakan pada output sebelumnya. APK belum dibangun ulang atau dipasang.

## Belum selesai — jangan dianggap seluruh 32 temuan tertutup
Prioritas tinggi: RLS/isolasi tenant (UP-02), rotasi secret/signing key yang pernah terekspos (UP-03), autentikasi pegawai plaintext/token palsu (UP-07), pickup/stok/withdraw/tip/afiliasi atomik dan idempotensi database (UP-08/10/11/13/14/15), tanggal komisi (UP-31).
Lainnya: route bisnis yang belum dilindungi (sisa UP-06), SQLite /tmp di serverless (UP-19), kuota server-side (UP-21), edit qty nota vs stok (UP-22), sisa mismatch schema (UP-24), pembandingan versi native Android (UP-26), advisori dependency (UP-28), konfigurasi lint (UP-29).
UP-27 mitigasi recursive APK ada dalam patch Free Team sebelumnya, tetapi perlu build/verifikasi APK nyata.

## Verifikasi
30 tes lokal lulus: 10 AI configuration dan 20 regresi bug cepat. Mencakup handler publik dengan mocked transport, JWT guard AI, renderer HTML nyata melalui VM, login fail-closed, stok, reset, nominal, sesi, dan WhatsApp.
npm run build dan node --check server/index.cjs berhasil. Vite masih memberi peringatan ukuran bundle.
Tes menggunakan mock/VM, bukan transaksi di database produksi. Tidak ada akses secret, migrasi produksi, push, atau deploy dalam batch ini.
