/**
 * AISERVICE.ID — Tier Limits & Configuration
 * Central config for Free vs Pro feature gating
 */

// ─── SERVICE STATUS FLOW ────────────────────────────────
export const SERVICE_STATUSES = [
  { id: 'PROSES',         label: 'Diterima',        color: '#64748b', bg: '#f1f5f9', icon: '📥', description: 'Barang sudah diterima di toko' },
  { id: 'DICEK',          label: 'Sedang Dicek',    color: '#0284c7', bg: '#e0f2fe', icon: '🔍', description: 'Teknisi sedang melakukan pengecekan' },
  { id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#d97706', bg: '#fef3c7', icon: '🔧', description: 'Perbaikan sedang dilakukan' },
  { id: 'MENUNGGU_PART',  label: 'Menunggu Part',   color: '#9333ea', bg: '#f3e8ff', icon: '📦', description: 'Menunggu sparepart yang dipesan' },
  { id: 'SELESAI',        label: 'Selesai',         color: '#16a34a', bg: '#dcfce7', icon: '✅', description: 'Perbaikan selesai, siap diambil' },
  { id: 'DIAMBIL',        label: 'Sudah Diambil',   color: '#059669', bg: '#d1fae5', icon: '🤝', description: 'Perangkat sudah diambil pelanggan' },
  { id: 'DIBATALKAN',     label: 'Dibatalkan',      color: '#dc2626', bg: '#fee2e2', icon: '❌', description: 'Servis dibatalkan' },
];

export const getStatusInfo = (statusId) => {
  return SERVICE_STATUSES.find(s => s.id === statusId) || SERVICE_STATUSES[0];
};

export const getNextStatuses = (currentStatus) => {
  const idx = SERVICE_STATUSES.findIndex(s => s.id === currentStatus);
  if (idx === -1) return SERVICE_STATUSES;
  // Can go forward, or jump to DIBATALKAN
  return SERVICE_STATUSES.filter((s, i) => i > idx || s.id === 'DIBATALKAN');
};

// ─── TIER LIMITS ─────────────────────────────────────────
export const TIER_CONFIG = {
  free: {
    label: 'Starter (Gratis)',
    badge: 'FREE',
    color: '#64748b',
    limits: {
      maxServicesPerMonth: 50,
      maxTransactionsPerMonth: 100,
      maxProducts: 100,
      maxEmployees: 0,       // No multi-user
      maxBranches: 1,
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
      // Premium features OFF
      employees: false,
      whatsappNotif: false,
      whatsappMarketing: false,
      catalog: false,
      detailedReport: false,
      exportExcel: false,
      customBranding: false,
      adsSettings: false,
      multiBranch: false,
      wallet: false,
      affiliate: false,
      forum: true,  // Read & write for all
    }
  },
  pro: {
    label: 'Pro Titan',
    badge: 'PRO',
    color: '#0284c7',
    limits: {
      maxServicesPerMonth: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxProducts: Infinity,
      maxEmployees: 20,
      maxBranches: 1,
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
      // Premium ON
      employees: true,
      whatsappNotif: true,
      whatsappMarketing: true,
      catalog: true,
      detailedReport: true,
      exportExcel: true,
      customBranding: true,
      adsSettings: true,
      multiBranch: false,  // Fase 3
      wallet: false,       // Fase 3
      affiliate: false,    // Fase 3
      forum: true,
    }
  },
  enterprise: {
    label: 'Enterprise',
    badge: 'ENTERPRISE',
    color: '#7c3aed',
    limits: {
      maxServicesPerMonth: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxProducts: Infinity,
      maxEmployees: 50,
      maxBranches: 5,
    },
    features: {
      pos: true, services: true, printReceipt: true, barcode: true,
      publicTracking: true, masterProducts: true, basicReport: true,
      themeSettings: true, employees: true, whatsappNotif: true,
      whatsappMarketing: true,
      catalog: true, detailedReport: true, exportExcel: true,
      customBranding: true, adsSettings: true, multiBranch: true,
      wallet: false, affiliate: false, forum: true,
    }
  }
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
  { id: 'master',      name: 'Inventori',          feature: 'masterProducts', iconName: 'Package' },
  { id: 'pelanggan',   name: 'Pelanggan & WA',     feature: 'basicReport',    iconName: 'MessageSquare' },
  { id: 'keuangan',    name: 'Laporan',            feature: 'basicReport',    iconName: 'TrendingUp' },
  { id: 'karyawan',    name: 'Tim',                feature: 'themeSettings',  iconName: 'Users' },
  { id: 'pengaturan',  name: 'Toko',               feature: 'themeSettings',  iconName: 'Settings' },
];
