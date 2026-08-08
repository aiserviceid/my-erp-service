// Simple Internationalization (i18n) Utility for UnitPro

export const translations = {
  id: {
    // Navigation Tabs
    tab_dashboard: 'Ringkasan',
    tab_servis: 'Servis',
    tab_pos: 'Kasir',
    tab_master: 'Barang/Jasa',
    tab_pelanggan: 'Pelanggan & WA',
    tab_keuangan: 'Laporan',
    tab_karyawan: 'Tim',
    tab_pengaturan: 'Pengaturan Toko',

    // Settings
    store_settings: 'Pengaturan Toko',
    theme_branding: '🎨 Tema & Branding',
    language_label: 'Bahasa Aplikasi / Language',
    select_language: 'Pilih Bahasa Utama Aplikasi',
    indonesian: '🇮🇩 Bahasa Indonesia',
    english: '🇬🇧 English',
    save_changes: '💾 Simpan Perubahan',
    settings_saved: 'Pengaturan berhasil disimpan!',
    save_failed: 'Gagal menyimpan pengaturan',

    // Landing Page
    landing_badge: 'Aplikasi Kasir & Servis No.1',
    landing_hero_title: 'Satu aplikasi untuk mengatur servis, kasir, barang/jasa, teknisi, dan pelanggan.',
    landing_hero_subtitle: 'UnitPro membantu toko servis & penjualan barang/jasa bekerja lebih rapi dari unit masuk sampai unit diambil pelanggan.',
    login_btn: 'Masuk Toko',
    register_free_btn: 'Coba Gratis',
    see_demo_btn: 'Lihat Demo',
    consultation_btn: 'Konsultasi',
    nav_features: 'Fitur',
    nav_pricing: 'Harga',

    // Miscellaneous
    logout: 'Keluar',
    search_placeholder: 'Cari...',
  },
  en: {
    // Navigation Tabs
    tab_dashboard: 'Overview',
    tab_servis: 'Repairs',
    tab_pos: 'POS Cashier',
    tab_master: 'Items & Services',
    tab_pelanggan: 'Customers & WA',
    tab_keuangan: 'Financial Reports',
    tab_karyawan: 'Team',
    tab_pengaturan: 'Store Settings',

    // Settings
    store_settings: 'Store Settings',
    theme_branding: '🎨 Theme & Branding',
    language_label: 'App Language',
    select_language: 'Select Main Application Language',
    indonesian: '🇮🇩 Bahasa Indonesia',
    english: '🇬🇧 English',
    save_changes: '💾 Save Changes',
    settings_saved: 'Settings saved successfully!',
    save_failed: 'Failed to save settings',

    // Landing Page
    landing_badge: '#1 POS & Repair Management App',
    landing_hero_title: 'One platform for repair tracking, POS cashier, items & services, technicians, and customers.',
    landing_hero_subtitle: 'UnitPro helps your repair shop & store operate seamlessly from check-in to completed delivery.',
    login_btn: 'Store Login',
    register_free_btn: 'Try for Free',
    see_demo_btn: 'View Demo',
    consultation_btn: 'Consultation',
    nav_features: 'Features',
    nav_pricing: 'Pricing',

    // Miscellaneous
    logout: 'Logout',
    search_placeholder: 'Search...',
  }
};

/**
 * Helper to retrieve current active language code from localStorage or default settings.
 */
export function getAppLanguage() {
  try {
    return localStorage.getItem('app_language') || 'id';
  } catch (e) {
    return 'id';
  }
}

/**
 * Set active language code in localStorage.
 */
export function setAppLanguage(lang) {
  try {
    localStorage.setItem('app_language', lang);
  } catch (e) {
    console.error('Failed to save language setting', e);
  }
}

/**
 * Translate a given key based on current or specified language code.
 */
export function t(key, fallback = '', lang = null) {
  const currentLang = lang || getAppLanguage();
  const dict = translations[currentLang] || translations.id;
  return dict[key] !== undefined ? dict[key] : (translations.id[key] !== undefined ? translations.id[key] : fallback || key);
}
