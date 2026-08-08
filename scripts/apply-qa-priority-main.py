from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# Utilities
write('src/utils/phoneUtils.js', """export const normalizeWhatsAppNumber = (phone = '') => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const findEmployeePhoneConflict = (phone, users = []) => {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  return users.find((user) => normalizeWhatsAppNumber(user?.phone) === normalized) || null;
};

export const customerPhoneConflictMessage = (employeeName = '') =>
  `Nomor WhatsApp ini sama dengan nomor karyawan${employeeName ? ` ${employeeName}` : ''}. Pastikan ini nomor pelanggan, bukan nomor teknisi/kasir.`;
""")

write('src/utils/productCategory.js', """const SERVICE_CATEGORIES = ['JASA', 'SERVIS', 'SERVICE', 'LAYANAN'];
const PHYSICAL_CATEGORIES = ['SPAREPART', 'SPARE_PART', 'AKSESORIS', 'BARANG', 'PRODUK', 'PRODUCT'];

export const normalizeProductCategory = (product) =>
  String(product?.category || product?.type || product?.jenis || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

export const isServiceItem = (product) => {
  const category = normalizeProductCategory(product);

  if (SERVICE_CATEGORIES.some((item) => category === item || category.includes(item))) return true;
  if (PHYSICAL_CATEGORIES.some((item) => category === item || category.includes(item))) return false;

  const name = String(product?.name || '').toLowerCase();
  const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
  return serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
};
""")

# App route alias
path = 'src/App.jsx'
text = read(path)
text = replace_once(text,
    "import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';",
    "import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';",
    'App router import')
text = replace_once(text,
    "function PageLoader() {\n  return <div style={{ minHeight: '100vh', background: '#f7faf9' }} aria-label=\"Memuat halaman\" />;\n}\n",
    "function PageLoader() {\n  return <div style={{ minHeight: '100vh', background: '#f7faf9' }} aria-label=\"Memuat halaman\" />;\n}\n\nfunction TrackResiRedirect() {\n  const { resi } = useParams();\n  return <Navigate to={`/tracking?resi=${encodeURIComponent(resi || '')}`} replace />;\n}\n",
    'App track redirect helper')
text = replace_once(text,
    '            <Route path="/tracking" element={<PublicTracking />} />\n',
    '            <Route path="/tracking" element={<PublicTracking />} />\n            <Route path="/track/:resi" element={<TrackResiRedirect />} />\n',
    'App legacy track route')
write(path, text)

# Onboarding
path = 'src/components/OnboardingProgressCard.jsx'
text = read(path)
text = replace_once(text,
    "      { key: 'catalog', title: 'Barang & Jasa', desc: 'Isi sparepart dan katalog jasa servis.', done: physicalCount > 0 && jasaCount > 0, tab: 'master', icon: Package },",
    "      { key: 'catalog', title: 'Barang & Jasa', desc: 'Isi sparepart dan katalog jasa servis.', done: products.length > 0, tab: 'master', icon: Package },",
    'onboarding catalog completion')
write(path, text)

# POS category source of truth
path = 'src/components/POSView.jsx'
text = read(path)
text = replace_once(text,
    "import { UNITPRO_LOGO_URL, getTenantLogoUrl, isFreeTier } from '../utils/branding';\n",
    "import { UNITPRO_LOGO_URL, getTenantLogoUrl, isFreeTier } from '../utils/branding';\nimport { normalizeProductCategory, isServiceItem } from '../utils/productCategory';\n",
    'POS category import')
old = """  const getProductCategory = (product) => String(product?.category || product?.type || product?.jenis || '').trim().toUpperCase().replace(/\\s+/g, '_');
  const isServiceItem = (product) => {
    const category = getProductCategory(product);
    const name = String(product?.name || '').toLowerCase();
    const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
    return category === 'JASA' || category === 'SERVIS' || category === 'SERVICE' || category === 'LAYANAN' || category.includes('JASA') || category.includes('SERVIS') || category.includes('SERVICE') || category.includes('LAYANAN') || serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
  };
"""
text = replace_once(text, old, "  const getProductCategory = normalizeProductCategory;\n", 'POS category heuristic replacement')
write(path, text)

# Finance report WA safety
path = 'src/components/PremiumFinanceReport.jsx'
text = read(path)
text = replace_once(text,
    "import UpgradePrompt from './UpgradePrompt';\n",
    "import UpgradePrompt from './UpgradePrompt';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict } from '../utils/phoneUtils';\n",
    'finance phone import')
text = replace_once(text,
    "  products = [],\n  tenant,",
    "  products = [],\n  users = [],\n  tenant,",
    'finance users prop')
text = replace_once(text,
    "                  const billTotal = part + jasa > 0 ? (part + jasa - disc) : est;\n\n                  return (",
    "                  const billTotal = part + jasa > 0 ? (part + jasa - disc) : est;\n                  const phoneConflict = findEmployeePhoneConflict(s.customer_phone, users);\n\n                  return (",
    'finance conflict derived')
text = replace_once(text,
    "                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>\n",
    "                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>\n                        {phoneConflict && (\n                          <small style={{ display: 'block', marginTop: '4px', color: '#dc2626', fontWeight: '800' }}>\n                            ⚠ Sama dengan WA karyawan: {phoneConflict.name}\n                          </small>\n                        )}\n",
    'finance conflict warning')
text = replace_once(text,
    "                                const cleanPhone = s.customer_phone.replace(/^0/, '62');\n",
    "                                if (phoneConflict) {\n                                  alert('Nomor WA pelanggan ini sama dengan nomor karyawan. Perbaiki nomor pelanggan dulu agar tagihan tidak salah alamat.');\n                                  return;\n                                }\n                                const cleanPhone = normalizeWhatsAppNumber(s.customer_phone);\n",
    'finance block conflicting WA')
write(path, text)

# Desktop sidebar guard
path = 'src/index.css'
text = read(path)
if 'QA guard: desktop admin sidebar must remain visible' not in text:
    text += """

/* QA guard: desktop admin sidebar must remain visible while switching Tim sub-tabs. */
@media (min-width: 769px) {
  html:not(.native-app) .dashboard-layout > .sidebar {
    display: flex !important;
    flex-direction: column !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  html:not(.native-app) .dashboard-layout > .sidebar .nav-item {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
}
"""
write(path, text)

# Store logout cleanup
path = 'src/store/useStore.js'
text = read(path)
text = replace_once(text,
    "  clearEmployee: () => {\n    if (typeof window !== 'undefined') localStorage.removeItem('EMP_SESSION');\n    set({ employee: null });\n  },",
    "  clearEmployee: () => {\n    if (typeof window !== 'undefined') {\n      localStorage.removeItem('EMP_SESSION');\n      localStorage.removeItem('EMPLOYEE_TOKEN');\n    }\n    set({ employee: null });\n  },",
    'clear employee tokens')
text = replace_once(text,
    "      localStorage.removeItem('TENANT_TIER');\n",
    "      localStorage.removeItem('TENANT_TIER');\n      localStorage.removeItem('TENANT_PHONE');\n      localStorage.removeItem('TENANT_SETTINGS');\n      localStorage.removeItem('EMPLOYEE_TOKEN');\n      localStorage.removeItem('EMP_SESSION');\n",
    'clear tenant extended tokens')
write(path, text)

# Admin WA safety + logout
path = 'src/pages/AdminDashboard.jsx'
text = read(path)
text = replace_once(text,
    "import { parseKasbonDescription } from '../utils/financeUtils';\n",
    "import { parseKasbonDescription } from '../utils/financeUtils';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict, customerPhoneConflictMessage } from '../utils/phoneUtils';\n",
    'admin phone import')
text = replace_once(text,
    "    const kelengkapan = fd.get('kelengkapan') || '-';\n",
    "    const normalizedPhone = normalizeWhatsAppNumber(phone);\n    const phoneConflict = findEmployeePhoneConflict(normalizedPhone, users);\n    if (phoneConflict) {\n      const shouldContinue = window.confirm(`${customerPhoneConflictMessage(phoneConflict.name)}\n\nKlik OK hanya jika Anda yakin nomor ini memang nomor pelanggan.`);\n      if (!shouldContinue) return;\n    }\n\n    const kelengkapan = fd.get('kelengkapan') || '-';\n",
    'admin create service phone guard')
text = replace_once(text,
    "        customer_phone: phone,\n",
    "        customer_phone: normalizedPhone,\n",
    'admin normalized customer phone')
text = replace_once(text,
    "  const handleLogout = () => {\n    clearTenant();\n    navigate('/');\n  };",
    "  const handleLogout = () => {\n    clearTenant();\n    localStorage.removeItem('TENANT_TOKEN');\n    localStorage.removeItem('EMPLOYEE_TOKEN');\n    localStorage.removeItem('EMP_SESSION');\n    navigate('/login', { replace: true });\n  };",
    'admin logout cleanup')
text = replace_once(text,
    "        await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });\n",
    "        const phoneConflict = findEmployeePhoneConflict(service.customer_phone, users);\n        if (phoneConflict) {\n          alert(`Nomor WA pelanggan ini sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan dulu agar notifikasi tidak salah alamat.`);\n        } else {\n          await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });\n        }\n",
    'admin status WA conflict block')
write(path, text)

# Employee Portal: current main includes finance round3 changes; layer QA guards on top.
path = 'src/pages/EmployeePortal.jsx'
text = read(path)
text = replace_once(text,
    "import { buildKasbonDescription, isPaidServiceStatus, normalizeKasbonAmount, parseKasbonDescription } from '../utils/financeUtils';\n",
    "import { buildKasbonDescription, isPaidServiceStatus, normalizeKasbonAmount, parseKasbonDescription } from '../utils/financeUtils';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict, customerPhoneConflictMessage } from '../utils/phoneUtils';\nimport { isServiceItem } from '../utils/productCategory';\n",
    'employee QA imports')
old = """  const normalizeProductCategory = (product) => String(product?.category || product?.type || product?.jenis || '').trim().toUpperCase().replace(/\\s+/g, '_');
  const isJasaProduct = (product) => {
    const category = normalizeProductCategory(product);
    const name = String(product?.name || '').toLowerCase();
    const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
    return category === 'JASA' || category === 'SERVIS' || category === 'SERVICE' || category === 'LAYANAN' || category.includes('JASA') || category.includes('SERVIS') || category.includes('SERVICE') || category.includes('LAYANAN') || serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
  };
"""
text = replace_once(text, old, "  const isJasaProduct = isServiceItem;\n", 'employee category heuristic replacement')
text = text.replace("!/^(?:\\\\+?62|0)8\\\\d{7,12}$/.test(serviceForm.phone.trim())", "!/^(?:\\+?62|0)8\\d{7,12}$/.test(serviceForm.phone.trim())", 1)
text = text.replace("!/^(?:\\\\+?62|0)8\\\\d{7,12}$/.test(customerPhone)", "!/^(?:\\+?62|0)8\\d{7,12}$/.test(customerPhone)", 1)
text = replace_once(text,
    "    const kelengkapan = fd.get('kelengkapan') || '-';\n    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;",
    "    const normalizedCustomerPhone = normalizeWhatsAppNumber(customerPhone);\n    const phoneConflict = findEmployeePhoneConflict(normalizedCustomerPhone, users);\n    if (phoneConflict) {\n      const shouldContinue = window.confirm(`${customerPhoneConflictMessage(phoneConflict.name)}\n\nKlik OK hanya jika Anda yakin nomor ini memang nomor pelanggan.`);\n      if (!shouldContinue) {\n        setServiceWizardStep(1);\n        setServiceWizardError('Periksa kembali nomor WhatsApp pelanggan sebelum melanjutkan.');\n        return;\n      }\n    }\n    const kelengkapan = fd.get('kelengkapan') || '-';\n    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;",
    'employee create service phone guard')
text = replace_once(text,
    "      customer_phone: customerPhone,\n",
    "      customer_phone: normalizedCustomerPhone,\n",
    'employee normalized customer phone')
text = replace_once(text,
    "                                  if (s.status !== 'SELESAI') return null; // Only show DIAMBIL if currently SELESAI\n",
    "",
    'employee full status dropdown')
old_notify = """                const notificationResult = await sendWhatsAppNotification({
                  tenant,
                  target: selectedService.customer_phone,
                  message,
                  openManual: true,
                });
                if (notificationResult.status === 'failed') {
                  console.error('Gagal mengirim WA pelanggan:', notificationResult.error);
                }
"""
new_notify = """                const phoneConflict = findEmployeePhoneConflict(selectedService.customer_phone, users);
                if (phoneConflict) {
                  alert(`Nomor WA pelanggan ini sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan dulu agar notifikasi tidak salah alamat.`);
                } else {
                  const notificationResult = await sendWhatsAppNotification({
                    tenant,
                    target: selectedService.customer_phone,
                    message,
                    openManual: true,
                  });
                  if (notificationResult.status === 'failed') {
                    console.error('Gagal mengirim WA pelanggan:', notificationResult.error);
                  }
                }
"""
text = replace_once(text, old_notify, new_notify, 'employee status WA conflict block')
write(path, text)

print('QA priority findings applied on current main successfully.')
