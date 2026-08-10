/**
 * UnitPro — WhatsApp dynamic message variables.
 * Fixed campaign templates were intentionally removed. Users now write/edit
 * their own message or generate copy with Gemini, then these variables are
 * resolved per customer immediately before sending.
 */

export const CAMPAIGN_VARIABLES = [
  { token: '{nama_pelanggan}', label: 'Nama Pelanggan', example: 'Budi Santoso' },
  { token: '{nama_toko}', label: 'Nama Toko', example: 'UnitPro Service' },
  { token: '{resi}', label: 'Nomor Resi', example: 'TRX-88219' },
  { token: '{perangkat}', label: 'Perangkat', example: 'iPhone 13 Pro' },
  { token: '{biaya}', label: 'Nilai Transaksi', example: 'Rp 350.000' },
  { token: '{link_tracking}', label: 'Link Tracking', example: '/tracking?resi=...' },
  { token: '{hari_sejak_terakhir}', label: 'Hari Sejak Terakhir', example: '65' },
  { token: '{jumlah_transaksi}', label: 'Jumlah Aktivitas', example: '3' },
];

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `Rp ${Number.isFinite(amount) ? amount.toLocaleString('id-ID') : '0'}`;
};

/**
 * Resolve supported dynamic variables. Unknown placeholders are intentionally
 * left untouched so users can notice and correct custom variables before send.
 */
export function renderCampaignTemplate(templateText = '', data = {}) {
  let result = String(templateText || '');
  const replacements = {
    '{nama_pelanggan}': data.nama_pelanggan || data.customer_name || 'Pelanggan',
    '{nama_toko}': data.nama_toko || data.store_name || 'Toko Servis',
    '{resi}': data.resi || data.id || '-',
    '{perangkat}': data.perangkat || data.device_name || 'Perangkat',
    '{biaya}': formatMoney(data.biaya ?? data.totalSpent ?? data.amount ?? 0),
    '{link_tracking}': data.link_tracking || '',
    '{hari_sejak_terakhir}': String(data.hari_sejak_terakhir ?? data.daysFromLast ?? 0),
    '{jumlah_transaksi}': String(data.jumlah_transaksi ?? data.totalActivity ?? 0),
  };

  Object.entries(replacements).forEach(([token, value]) => {
    result = result.split(token).join(String(value ?? ''));
  });
  return result;
}

export function findUnknownCampaignVariables(templateText = '') {
  const supported = new Set(CAMPAIGN_VARIABLES.map((item) => item.token));
  const found = String(templateText || '').match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return [...new Set(found.filter((token) => !supported.has(token)))];
}
