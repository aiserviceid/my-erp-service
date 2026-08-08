/**
 * UnitPro — WhatsApp Campaign Template Library (Batch 28)
 * Template pesan promosi & follow-up pelanggan dengan variabel dinamis
 */

export const CAMPAIGN_TEMPLATES = [
  {
    id: 'promo_lcd',
    title: '📱 Promo Ganti LCD Original & Garansi',
    category: 'PROMO_SERVIS',
    badge: 'Populer',
    description: 'Penawaran promo pergantian layar/LCD HP atau Laptop dengan diskon & garansi resmi.',
    template: `Halo Kak {nama_pelanggan}! 👋\n\nAda promo khusus dari *{nama_toko}* nih! 🚀\nDapatkan diskon *15% untuk Ganti LCD/Layar Original* untuk semua tipe HP & Laptop!\n\n✨ *Keunggulan di {nama_toko}:*\n• LCD kualitas Original / Premium OLED\n• Pengerjaan cepat & bisa ditunggu\n• Garansi resmi toko hingga 30 Hari\n\nTunjukkan pesan ini saat berkunjung ke toko kami atau reply pesan ini untuk booking antrean servis ya! 🙏`
  },
  {
    id: 'promo_baterai',
    title: '🔋 Promo Baterai Awet & Fast Charging',
    category: 'PROMO_SERVIS',
    badge: 'Hemat',
    description: 'Penawaran ganti baterai boros/kembung dengan baterai kesehatan 100%.',
    template: `Halo Kak {nama_pelanggan}! 🔋\n\nBaterai HP atau Laptop Kakak sering cepat habis atau ngedrop?\nYuk ganti baterai baru kesehatan 100% di *{nama_toko}*!\n\n🎁 *Promo Baterai Hemat:* Diskon *Rp 30.000* + Gratis Pengecekan Sistem Listrik!\n\nMasa berlaku promo s/d minggu ini. Balas *MAU* untuk reservasi slot servis! 🙌`
  },
  {
    id: 'promo_cleaning_laptop',
    title: '💻 Promo Maintenance & Thermal Paste Laptop',
    category: 'PROMO_LAPTOP',
    badge: 'Rekomendasi',
    description: 'Layanan pembersihan debu kipas & penggantian pasta pendingin (thermal paste).',
    template: `Halo Kak {nama_pelanggan}! 💻⚡\n\nLaptop terasa makin panas atau sering kipas berisik?\nJangan dibiarkan overheat karena bisa merusak processor & VGA!\n\n🛠️ *Paket Complete Laptop Care di {nama_toko}:*\n• Pembersihan debu & fan internal 100% bersih\n• Ganti Thermal Paste High-Performance\n• Check-up kesehatan SSD & RAM\n\n🔥 *Harga Promo:* Hanya Rp 85.000 (Harga normal Rp 150.000).\nBalas WA ini untuk konsultasi & booking jam kedatangan!`
  },
  {
    id: 'reminder_pengambilan',
    title: '📦 Pengingat Pengambilan Servis Selesai',
    category: 'REMINDER',
    badge: 'Penting',
    description: 'Pesan pengingat untuk unit servis yang sudah selesai tetapi belum diambil.',
    template: `Halo Kak {nama_pelanggan}! 😊\n\nMemberitahukan bahwa perangkat *{perangkat}* milik Kakak dengan No. Resi *{resi}* telah *SELESAI DIPERBAIKI* dan sudah siap diambil di toko *{nama_toko}*.\n\n📍 *Lokasi Toko:* {nama_toko}\n🔗 *Cek Detail Nota & Tracking:* {link_tracking}\n\nMohon dapat diambil pada jam operasional toko kami. Terima kasih atas kepercayaan Kakak! 🙏`
  },
  {
    id: 'followup_lama',
    title: '💬 Follow-up Pelanggan Setia (>60 Hari)',
    category: 'CRM',
    badge: 'Loyalitas',
    description: 'Sapaan hangat & promo perawatan berkala untuk pelanggan yang sudah lama tidak berkunjung.',
    template: `Halo Kak {nama_pelanggan}! 👋😊\n\nSudah lebih dari 2 bulan nih sejak kunjungan terakhir Kakak ke *{nama_toko}*.\nBagaimana performa perangkat Kakak saat ini?\n\nSebagai bentuk apresiasi pelanggan setia, kami berikan *VOUCHER CHECK-UP GRATIS* & Diskon Aksesori 20% khusus untuk Kakak!\n\nYuk mampir ke toko kami atau reply pesan ini untuk info promo terbaru! ☕`
  },
  {
    id: 'terima_kasih_rating',
    title: '⭐ Ucapan Terima Kasih & Minta Ulasan',
    category: 'CRM',
    badge: 'Ulasan',
    description: 'Pesan apresiasi setelah unit diambil sekaligus ajakan memberikan ulasan toko.',
    template: `Terima kasih banyak Kak {nama_pelanggan} telah mempercayakan perbaikan *{perangkat}* di *{nama_toko}*! 🙏✨\n\nKepuasan Kakak adalah kebanggaan kami. Jika ada kendala, jangan ragu untuk menghubungi kami karena transaksi Kakak dilindungi Garansi Toko.\n\nBantu kami berkembang dengan memberikan ulasan bintang 5 ya Kak! Terima kasih & sehat selalu! 😊`
  }
];

/**
 * Utility untuk mengganti variabel dinamis template dengan data sebenarnya
 */
export function renderCampaignTemplate(templateText = '', data = {}) {
  let result = String(templateText || '');
  result = result.replace(/\{nama_pelanggan\}/g, data.nama_pelanggan || data.customer_name || 'Pelanggan');
  result = result.replace(/\{nama_toko\}/g, data.nama_toko || data.store_name || 'Toko Servis');
  result = result.replace(/\{resi\}/g, data.resi || data.id || '-');
  result = result.replace(/\{perangkat\}/g, data.perangkat || data.device_name || 'Perangkat');
  result = result.replace(/\{link_tracking\}/g, data.link_tracking || (data.resi ? `https://unitpro.app/tracking?resi=${data.resi}` : ''));
  result = result.replace(/\{biaya\}/g, data.biaya ? `Rp ${Number(data.biaya).toLocaleString('id-ID')}` : 'Rp 0');
  return result;
}
