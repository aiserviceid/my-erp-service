# UnitPro Regression Checklist

Gunakan checklist ini sebelum merge/deploy perubahan batch stabilisasi.

## 1. Login dan session

- [ ] Owner/Admin bisa login dengan kode toko dan PIN yang valid.
- [ ] Kasir/Teknisi bisa login dari portal karyawan.
- [ ] Setelah refresh halaman, session masih terbaca dengan benar.
- [ ] Logout menghapus session dan kembali ke halaman login.

## 2. Servis dan tracking

- [ ] Kasir/Admin bisa membuat servis baru dengan resi unik.
- [ ] Status awal servis tersimpan sebagai `PROSES`.
- [ ] Servis baru muncul di Admin Dashboard dan Employee Portal.
- [ ] Teknisi yang ditugaskan bisa melihat tugasnya.
- [ ] Status bisa bergerak: `PROSES -> DICEK -> DIKERJAKAN -> MENUNGGU_PART -> SELESAI -> DIAMBIL`.
- [ ] Status `DIBATALKAN` tidak masuk timeline normal.
- [ ] Halaman tracking publik bisa mencari resi valid.
- [ ] Tracking publik tidak menampilkan data internal toko, nomor pelanggan, atau metadata sensitif.

## 3. Nota servis

- [ ] Nota pendaftaran bisa dicetak setelah servis dibuat.
- [ ] Edit nota bisa mengubah keterangan/rincian, biaya sparepart, biaya jasa, dan diskon.
- [ ] Keterangan yang diubah muncul lagi saat modal edit dibuka ulang.
- [ ] Nota pelunasan menampilkan total yang benar setelah diskon.
- [ ] Barcode/QR resi tetap terbaca di mobile dan desktop.

## 4. POS dan stok

- [ ] Produk fisik dengan stok cukup bisa masuk keranjang.
- [ ] Produk kategori `JASA` tidak mengurangi stok fisik.
- [ ] Checkout ditolak jika stok produk fisik kurang.
- [ ] Stok berkurang setelah checkout POS berhasil.
- [ ] Jika update stok gagal, transaksi tidak dibuat atau kasir mendapat pesan koreksi yang jelas.
- [ ] Struk POS tetap bisa dicetak setelah checkout.

## 5. Keuangan

- [ ] Transaksi POS masuk sebagai pemasukan.
- [ ] Pelunasan servis masuk sebagai `INCOME_JASA` dan/atau `INCOME_SPAREPART`.
- [ ] Resi servis yang sudah lunas tidak mencatat income dobel saat status diubah ulang.
- [ ] Pengeluaran tetap tampil sebagai biaya/negatif.
- [ ] Ringkasan laba/omzet tidak menghitung transaksi dobel.

## 6. WhatsApp dan notifikasi

- [ ] Link WhatsApp pelanggan berisi resi/status yang benar.
- [ ] Link WhatsApp toko dari tracking publik memakai nomor toko yang benar.
- [ ] Jika token Fonnte custom tersedia, kiriman tidak mengganggu proses bisnis utama saat gagal.
- [ ] Jika mode manual, fallback `wa.me` tetap terbuka.

## 7. Multi-tenant dan keamanan

- [ ] Data toko A tidak muncul ketika login sebagai toko B.
- [ ] Update servis memakai tenant aktif, bukan hanya resi.
- [ ] Tracking publik hanya menampilkan field yang memang aman untuk pelanggan.
- [ ] Endpoint backend sensitif menolak request tanpa token tenant yang sesuai.

## 8. Mobile/Android UX

- [ ] Dashboard Admin tidak blank di layar mobile.
- [ ] Bottom navigation tidak menutup tombol utama.
- [ ] Modal bisa discroll dan tombol aksi masih terlihat.
- [ ] Form input minimal 44px sehingga nyaman disentuh.
- [ ] Tabel panjang bisa horizontal scroll.
- [ ] Jika terjadi error render, aplikasi menampilkan layar pemulihan, bukan blank screen.

## 9. Smoke test build

- [ ] `npm ci` berhasil.
- [ ] `npm run build` berhasil.
- [ ] Build Vite tidak menghasilkan error import.
- [ ] Setelah deploy preview, halaman `/`, `/login`, `/admin`, `/employee`, `/tracking`, dan `/katalog/:tenantCode` bisa dibuka.
