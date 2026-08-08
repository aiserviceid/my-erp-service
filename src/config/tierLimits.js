/**
 * UnitPro — Tier Limits & Configuration
 * Central config for Free / Pro / Enterprise / White Label feature gating
 */

// ─── SERVICE STATUS FLOW ────────────────────────────────
export const SERVICE_STATUSES = [
  { id: 'PROSES',         label: 'Diterima',        color: '#64748b', bg: '#f1f5f9', icon: '📥', description: 'Barang sudah diterima di toko' },
  { id: 'DICEK',          label: 'Sedang Dicek',    color: '#3B82F6', bg: '#DBEAFE', icon: '🔍', description: 'Teknisi sedang melakukan pengecekan' },
  { id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#F59E0B', bg: '#FEF3C7', icon: '🔧', description: 'Perbaikan sedang dilakukan' },
  { id: 'MENUNGGU_PART',  label: 'Menunggu Part',   color: '#F59E0B', bg: '#FEF3C7', icon: '📦', description: 'Menunggu sparepart yang dipesan' },
  { id: 'SELESAI',        label: 'Selesai',         color: '#10B981', bg: '#D1FAE5', icon: '✅', description: 'Perbaikan selesai, siap diambil' },
  { id: 'DIAMBIL',        label: 'Sudah Diambil',   color: '#10B981', bg: '#D1FAE5', icon: '🤝', description: 'Perangkat sudah diambil pelanggan' },
  { id: 'DIBATALKAN',     label: 'Dibatalkan',      color: '#EF4444', bg: '#FEE2E2', icon: '❌', description: 'Servis dibatalkan' },
];

export const getStatusInfo = (statusId) => {
  return SERVICE_STATUSES.find(s => s.id === statusId) || SERVICE_STATUSES[0];
};

export const getNextStatuses = (currentStatus) => {
  const idx = SERVICE_STATUSES.findIndex(s => s.id === currentStatus);
  if (idx === -1) return SERVICE_STATUSES;
  return SERVICE_STATUSES.filter((s, i) => i > idx || s.id === 'DIBATALKAN');
};

// ─── TIER LIMITS ─────────────────────────────────────────
export const TIER_CONFIG = {
  free: {
    label: 'Free',
    badge: 'FREE',
    color: '#64748b',
    headline: 'Untuk mulai coba',
    price: 'Rp0',
    period: '/selamanya',
    description: 'Cocok untuk toko kecil yang ingin merapikan pencatatan servis dasar sebelum upgrade.',
    limits: {
      maxServicesPerMonth: 25,
      maxTransactionsPerMonth: 50,
      maxProducts: 50,
      maxEmployees: 0,
      maxBranches: 1,
      maxCustomers: 100,
    },
    features: {
      pos: true,
      services: true,
      printReceipt: true,
      barcode: true,
      publicTracking: true,
      masterProducts: true,
      basicReport: true,
      themeSettings: true,
      employees: false,
      whatsappNotif: false,
      whatsappMarketing: false,
      catalog: false,
      detailedReport: false,
      exportExcel: false,
      customBranding: false,
      whiteLabel: false,
      customDomain: false,
      brandedApk: false,
      clientManagement: false,
      adsSettings: false,
      multiBranch: false,
      wallet: false,
      affiliate: false,
      forum: true,
    },
    marketingFeatures: [
      '25 servis per bulan',
      '50 transaksi kasir per bulan',
      '50 produk/sparepart',
      'Nota dan tracking pelanggan dasar',
    ],
  },
  pro: {
    label: 'UnitPro Pro',
    badge: 'PRO',
    color: '#0284c7',
    headline: 'Untuk toko servis aktif',
    price: 'Rp99.000',
    period: '/bulan',
    yearlyPromo: 'Promo Rp590.000/tahun pertama',
    description: 'Paket utama untuk toko servis yang ingin kasir, teknisi, stok, pelanggan, dan laporan berjalan dalam satu sistem.',
    limits: {
      maxServicesPerMonth: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxProducts: Infinity,
      maxEmployees: 20,
      maxBranches: 1,
      maxCustomers: Infinity,
    },
    features: {
      pos: true,
      services: true,
      printReceipt: true,
      barcode: true,
      publicTracking: true,
      masterProducts: true,
      basicReport: true,
      themeSettings: true,
      employees: true,
      whatsappNotif: true,
      whatsappMarketing: true,
      catalog: true,
      detailedReport: true,
      exportExcel: true,
      customBranding: true,
      whiteLabel: false,
      customDomain: false,
      brandedApk: false,
      clientManagement: false,
      adsSettings: true,
      multiBranch: false,
      wallet: false,
      affiliate: false,
      forum: true,
    },
    marketingFeatures: [
      'Servis, kasir, stok, dan teknisi unlimited',
      'WhatsApp pelanggan dan CRM marketing',
      'Laporan owner dan export Excel',
      'Katalog online dan branding toko di nota',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    badge: 'ENTERPRISE',
    color: '#7c3aed',
    headline: 'Untuk banyak cabang',
    price: 'Mulai Rp299.000',
    period: '/bulan',
    description: 'Untuk pemilik yang ingin mengendalikan beberapa outlet servis dengan standar operasional yang sama.',
    limits: {
      maxServicesPerMonth: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxProducts: Infinity,
      maxEmployees: 50,
      maxBranches: 5,
      maxCustomers: Infinity,
    },
    features: {
      pos: true,
      services: true,
      printReceipt: true,
      barcode: true,
      publicTracking: true,
      masterProducts: true,
      basicReport: true,
      themeSettings: true,
      employees: true,
      whatsappNotif: true,
      whatsappMarketing: true,
      catalog: true,
      detailedReport: true,
      exportExcel: true,
      customBranding: true,
      whiteLabel: false,
      customDomain: false,
      brandedApk: false,
      clientManagement: false,
      adsSettings: true,
      multiBranch: true,
      wallet: false,
      affiliate: false,
      forum: true,
    },
    marketingFeatures: [
      'Hingga 5 cabang/outlet',
      'Hingga 50 akun karyawan',
      'Kontrol multi-cabang dan laporan cabang',
      'Prioritas setup dan pendampingan',
    ],
  },
  white_label: {
    label: 'White Label',
    badge: 'PARTNER',
    color: '#0f766e',
    headline: 'Aplikasi dengan brand sendiri',
    price: 'Hubungi Partner',
    period: '',
    monthly: 'Konsultasi khusus white label',
    description: 'Untuk partner, distributor, komunitas, atau konsultan yang ingin menjual sistem servis dengan merek sendiri tanpa membeli source code.',
    limits: {
      maxServicesPerMonth: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxProducts: Infinity,
      maxEmployees: 100,
      maxBranches: 20,
      maxCustomers: Infinity,
    },
    features: {
      pos: true,
      services: true,
      printReceipt: true,
      barcode: true,
      publicTracking: true,
      masterProducts: true,
      basicReport: true,
      themeSettings: true,
      employees: true,
      whatsappNotif: true,
      whatsappMarketing: true,
      catalog: true,
      detailedReport: true,
      exportExcel: true,
      customBranding: true,
      whiteLabel: true,
      customDomain: true,
      brandedApk: true,
      clientManagement: true,
      adsSettings: true,
      multiBranch: true,
      wallet: false,
      affiliate: true,
      forum: true,
    },
    marketingFeatures: [
      'Logo, warna, nama aplikasi, dan domain sendiri',
      'APK/branding khusus sesuai merek partner',
      'Panel partner untuk kelola client/toko',
      'Managed service: sistem tetap kami rawat',
    ],
  },
};

// ─── HELPER FUNCTIONS ────────────────────────────────────
export const getTierConfig = (tier) => {
  return TIER_CONFIG[tier] || TIER_CONFIG.free;
};

export const hasFeature = (tier, featureName) => {
  const config = getTierConfig(tier);
  return config.features[featureName] === true;
};

export const isWithinLimit = (tier, limitType, currentCount) => {
  const config = getTierConfig(tier);
  const limit = config.limits[limitType];
  if (limit === Infinity) return { allowed: true, remaining: Infinity, limit };
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
};

export const getUsagePercent = (tier, limitType, currentCount) => {
  const config = getTierConfig(tier);
  const limit = config.limits[limitType];
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((currentCount / limit) * 100));
};

// ─── PAYMENT METHODS ─────────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'TUNAI', label: 'Tunai', icon: '💵', color: '#16a34a' },
  { id: 'TRANSFER', label: 'Transfer Bank', icon: '🏦', color: '#0284c7' },
  { id: 'QRIS', label: 'QRIS', icon: '📱', color: '#7c3aed' },
];

// ─── TABS VISIBILITY PER TIER ──────────────────────────────
export const ADMIN_TABS = [
  { id: 'dashboard',   name: 'Ringkasan',          feature: 'basicReport',    iconName: 'LayoutDashboard' },
  { id: 'servis',      name: 'Servis',             feature: 'services',       iconName: 'Wrench' },
  { id: 'pos',         name: 'Kasir',              feature: 'pos',            iconName: 'ShoppingCart' },
  { id: 'master',      name: 'Barang/Jasa',        feature: 'masterProducts', iconName: 'Package' },
  { id: 'pelanggan',   name: 'Pelanggan & WA',     feature: 'basicReport',    iconName: 'MessageSquare' },
  { id: 'keuangan',    name: 'Laporan',            feature: 'basicReport',    iconName: 'TrendingUp' },
  { id: 'karyawan',    name: 'Tim',                feature: 'employees',      iconName: 'Users' },
  { id: 'pengaturan',  name: 'Pengaturan Toko',    feature: 'themeSettings',  iconName: 'Settings' },
];

