// Internationalization (i18n) Utility for UnitPro

export const translations = {
  id: {
    // Navigation Tabs & Header
    tab_dashboard: 'Ringkasan',
    tab_servis: 'Servis',
    tab_pos: 'Kasir',
    tab_master: 'Barang/Jasa',
    tab_pelanggan: 'Pelanggan & WA',
    tab_keuangan: 'Laporan',
    tab_karyawan: 'Tim',
    tab_pengaturan: 'Pengaturan Toko',

    // Employee & Kasir Portal
    nav_home: 'Beranda',
    nav_tasks: 'Tugas Saya',
    nav_pos: 'Kasir POS',
    nav_scan: 'Scan Barcode',
    nav_history: 'Riwayat Pekerjaan',
    nav_settings: 'Pengaturan',
    emp_role_cashier: 'Kasir',
    emp_role_technician: 'Teknisi',
    emp_role_admin: 'Admin / Owner',
    emp_task_active: 'Tugas Aktif',
    emp_task_done: 'Selesai Hari Ini',
    emp_task_pending: 'Menunggu',

    // Login & Account
    login_store: 'Masuk Toko',
    register_store: 'Daftar Toko Baru',
    store_code: 'Kode ID Toko',
    security_pin: 'PIN Keamanan',
    remember_store: 'Ingat Toko Ini',
    last_stores: 'Toko Terakhir',
    login_btn: 'Masuk Toko',
    register_free_btn: 'Coba Gratis',

    // App Update
    update_title: 'Pembaruan Aplikasi Tersedia',
    update_current: 'Versi Saat Ini',
    update_latest: 'Versi Terbaru',
    update_up_to_date: 'Aplikasi Sudah Versi Terbaru',
    update_available: 'Versi Baru Tersedia',
    update_download_btn: 'Unduh & Update APK Sekarang',
    update_later: 'Nanti Saja',

    // Network & Errors
    conn_slow_title: 'Koneksi Lambat / Offline',
    conn_slow_msg: 'Aplikasi sedang kesulitan menghubungkan ke server. Silakan periksa jaringan internet Anda.',
    conn_retry: 'Coba Lagi',
    camera_denied: 'Akses kamera ditolak. Aktifkan izin kamera di pengaturan browser/HP Anda.',

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
    see_demo_btn: 'Lihat Demo',
    consultation_btn: 'Konsultasi',
    nav_features: 'Fitur',
    nav_pricing: 'Harga',
    nav_apk: 'Download APK',

    // Miscellaneous
    logout: 'Keluar',
    search_placeholder: 'Cari...',
  },
  en: {
    // Navigation Tabs & Header
    tab_dashboard: 'Overview',
    tab_servis: 'Repairs',
    tab_pos: 'POS Cashier',
    tab_master: 'Items & Services',
    tab_pelanggan: 'Customers & WA',
    tab_keuangan: 'Financial Reports',
    tab_karyawan: 'Team',
    tab_pengaturan: 'Store Settings',

    // Employee & Kasir Portal
    nav_home: 'Home',
    nav_tasks: 'My Tasks',
    nav_pos: 'POS Cashier',
    nav_scan: 'Scan Barcode',
    nav_history: 'Work History',
    nav_settings: 'Settings',
    emp_role_cashier: 'Cashier',
    emp_role_technician: 'Technician',
    emp_role_admin: 'Admin / Owner',
    emp_task_active: 'Active Tasks',
    emp_task_done: 'Done Today',
    emp_task_pending: 'Pending',

    // Login & Account
    login_store: 'Store Login',
    register_store: 'Register New Store',
    store_code: 'Store ID Code',
    security_pin: 'Security PIN',
    remember_store: 'Remember This Store',
    last_stores: 'Recent Stores',
    login_btn: 'Store Login',
    register_free_btn: 'Try for Free',

    // App Update
    update_title: 'Application Update Available',
    update_current: 'Current Version',
    update_latest: 'Latest Version',
    update_up_to_date: 'App is Up to Date',
    update_available: 'New Version Available',
    update_download_btn: 'Download & Update APK Now',
    update_later: 'Maybe Later',

    // Network & Errors
    conn_slow_title: 'Slow / Offline Connection',
    conn_slow_msg: 'The application is having trouble connecting to the server. Please check your internet connection.',
    conn_retry: 'Retry Connection',
    camera_denied: 'Camera access denied. Please allow camera permissions in your device/browser settings.',

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
    see_demo_btn: 'View Demo',
    consultation_btn: 'Consultation',
    nav_features: 'Features',
    nav_pricing: 'Pricing',
    nav_apk: 'Download APK',

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
