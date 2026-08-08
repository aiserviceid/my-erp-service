from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


# 1) AdminDashboard: WA conflict guard + safe logout
path = 'src/pages/AdminDashboard.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { t, getAppLanguage, setAppLanguage } from '../utils/i18n';",
    "import { t, getAppLanguage, setAppLanguage } from '../utils/i18n';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict, customerPhoneConflictMessage } from '../utils/phoneUtils';",
    'AdminDashboard phone helper import'
)
phone_validation = """    if (!/^(?:\\+?62|0)8\\d{7,12}$/.test(phone)) {
      alert('Masukkan nomor WhatsApp yang valid, contoh: 081234567890.');
      return;
    }
"""
phone_guard = phone_validation + """
    const normalizedPhone = normalizeWhatsAppNumber(phone);
    const phoneConflict = findEmployeePhoneConflict(normalizedPhone, users);
    if (phoneConflict) {
      const shouldContinue = window.confirm(`${customerPhoneConflictMessage(phoneConflict.name)}\n\nKlik OK hanya jika Anda yakin nomor ini memang nomor pelanggan.`);
      if (!shouldContinue) return;
    }
"""
text = replace_once(text, phone_validation, phone_guard, 'AdminDashboard create-service WA guard')
text = replace_once(text, '        customer_phone: phone,', '        customer_phone: normalizedPhone,', 'AdminDashboard normalized customer phone')
text = replace_once(
    text,
    "        await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });",
    """        const phoneConflict = findEmployeePhoneConflict(service.customer_phone, users);
        if (phoneConflict) {
          alert(`Nomor WA pelanggan ini sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan dulu agar notifikasi tidak salah alamat.`);
        } else {
          await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });
        }""",
    'AdminDashboard status notification guard'
)
text = replace_once(
    text,
    """  const handleLogout = () => {
    clearTenant();
    navigate('/');
  };""",
    """  const handleLogout = () => {
    clearTenant();
    localStorage.removeItem('TENANT_TOKEN');
    localStorage.removeItem('EMPLOYEE_TOKEN');
    localStorage.removeItem('EMP_SESSION');
    navigate('/login', { replace: true });
  };""",
    'AdminDashboard logout cleanup'
)
write(path, text)


# 2) PremiumFinanceReport: conflict label + block WA billing
path = 'src/components/PremiumFinanceReport.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "import UpgradePrompt from './UpgradePrompt';",
    "import UpgradePrompt from './UpgradePrompt';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict } from '../utils/phoneUtils';",
    'PremiumFinance phone helper import'
)
text = replace_once(
    text,
    """  products = [],
  tenant,""",
    """  products = [],
  users = [],
  tenant,""",
    'PremiumFinance users prop'
)
text = replace_once(
    text,
    """                  const billTotal = part + jasa > 0 ? (part + jasa - disc) : est;

                  return (""",
    """                  const billTotal = part + jasa > 0 ? (part + jasa - disc) : est;
                  const phoneConflict = findEmployeePhoneConflict(s.customer_phone, users);

                  return (""",
    'PremiumFinance conflict variable'
)
text = replace_once(
    text,
    """                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>""",
    """                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>
                        {phoneConflict && (
                          <small style={{ display: 'block', marginTop: '4px', color: '#dc2626', fontWeight: '800' }}>
                            ⚠ Sama dengan WA karyawan: {phoneConflict.name}
                          </small>
                        )}""",
    'PremiumFinance conflict label'
)
text = replace_once(
    text,
    """                                const cleanPhone = s.customer_phone.replace(/^0/, '62');
                                const msg = `Halo Kak ${s.customer_name}, unit ${s.device_name} di ${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'} (Resi: ${s.resi}) berstatus ${s.status}. Total tagihan: Rp ${formatRupiah(billTotal)}. Terima kasih!`;
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');""",
    """                                if (phoneConflict) {
                                  alert('Nomor WA pelanggan ini sama dengan nomor karyawan. Perbaiki nomor pelanggan dulu agar tagihan tidak salah alamat.');
                                  return;
                                }
                                const cleanPhone = normalizeWhatsAppNumber(s.customer_phone);
                                const msg = `Halo Kak ${s.customer_name}, unit ${s.device_name} di ${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'} (Resi: ${s.resi}) berstatus ${s.status}. Total tagihan: Rp ${formatRupiah(billTotal)}. Terima kasih!`;
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');""",
    'PremiumFinance block conflicting WA billing'
)
write(path, text)


# 3) POSView: category is authoritative when present
path = 'src/components/POSView.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { UNITPRO_LOGO_URL, getTenantLogoUrl, isFreeTier } from '../utils/branding';",
    "import { UNITPRO_LOGO_URL, getTenantLogoUrl, isFreeTier } from '../utils/branding';\nimport { normalizeProductCategory, isServiceItem } from '../utils/productCategory';",
    'POSView category helper import'
)
old_category = """  const getProductCategory = (product) => String(product?.category || product?.type || product?.jenis || '').trim().toUpperCase().replace(/\\s+/g, '_');
  const isServiceItem = (product) => {
    const category = getProductCategory(product);
    const name = String(product?.name || '').toLowerCase();
    const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
    return category === 'JASA' || category === 'SERVIS' || category === 'SERVICE' || category === 'LAYANAN' || category.includes('JASA') || category.includes('SERVIS') || category.includes('SERVICE') || category.includes('LAYANAN') || serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
  };
"""
text = replace_once(text, old_category, "  const getProductCategory = normalizeProductCategory;\n", 'POSView category logic')
write(path, text)


# 4) EmployeePortal: same category logic + WA conflict guard + unified status list
path = 'src/pages/EmployeePortal.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { SERVICE_STATUSES } from '../config/tierLimits';",
    "import { SERVICE_STATUSES } from '../config/tierLimits';\nimport { normalizeWhatsAppNumber, findEmployeePhoneConflict, customerPhoneConflictMessage } from '../utils/phoneUtils';\nimport { isServiceItem } from '../utils/productCategory';",
    'EmployeePortal helper imports'
)
old_emp_category = """  const technicianUsers = users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi');
  const normalizeProductCategory = (product) => String(product?.category || product?.type || product?.jenis || '').trim().toUpperCase().replace(/\\s+/g, '_');
  const isJasaProduct = (product) => {
    const category = normalizeProductCategory(product);
    const name = String(product?.name || '').toLowerCase();
    const serviceKeywords = /(jasa|servis|service|layanan|install|instal|reball|reballing|flash|flashing|cleaning|thermal|software|setting|backup|upgrade|cek|diagnosa)/i;
    return category === 'JASA' || category === 'SERVIS' || category === 'SERVICE' || category === 'LAYANAN' || category.includes('JASA') || category.includes('SERVIS') || category.includes('SERVICE') || category.includes('LAYANAN') || serviceKeywords.test(name) || (Number(product?.stock || 0) >= 900 && serviceKeywords.test(name));
  };
"""
text = replace_once(text, old_emp_category, """  const technicianUsers = users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi');
  const isJasaProduct = isServiceItem;
""", 'EmployeePortal category logic')
old_emp_validation = """    if (!/^(?:\\+?62|0)8\\d{7,12}$/.test(customerPhone)) {
      setServiceWizardStep(1);
      setServiceWizardError('Masukkan nomor WhatsApp yang valid, misalnya 0812xxxxxxx.');
      return;
    }
"""
new_emp_validation = old_emp_validation + """
    const normalizedCustomerPhone = normalizeWhatsAppNumber(customerPhone);
    const phoneConflict = findEmployeePhoneConflict(normalizedCustomerPhone, users);
    if (phoneConflict) {
      const shouldContinue = window.confirm(`${customerPhoneConflictMessage(phoneConflict.name)}\n\nKlik OK hanya jika Anda yakin nomor ini memang nomor pelanggan.`);
      if (!shouldContinue) {
        setServiceWizardStep(1);
        setServiceWizardError('Periksa kembali nomor WhatsApp pelanggan sebelum melanjutkan.');
        return;
      }
    }
"""
text = replace_once(text, old_emp_validation, new_emp_validation, 'EmployeePortal create-service WA guard')
text = replace_once(text, '      customer_phone: customerPhone,', '      customer_phone: normalizedCustomerPhone,', 'EmployeePortal normalized customer phone')
old_finish_notification = """                const notificationResult = await sendWhatsAppNotification({
                  tenant,
                  target: selectedService.customer_phone,
                  message,
                  openManual: true,
                });
                if (notificationResult.status === 'failed') {
                  console.error('Gagal mengirim WA pelanggan:', notificationResult.error);
                }"""
new_finish_notification = """                const phoneConflict = findEmployeePhoneConflict(selectedService.customer_phone, users);
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
                }"""
text = replace_once(text, old_finish_notification, new_finish_notification, 'EmployeePortal finish notification guard')
text = text.replace("                                  if (s.status !== 'SELESAI') return null; // Only show DIAMBIL if currently SELESAI\n", '')
write(path, text)


# 5) Onboarding: any existing product/service completes catalog step
path = 'src/components/OnboardingProgressCard.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "      { key: 'catalog', title: 'Barang & Jasa', desc: 'Isi sparepart dan katalog jasa servis.', done: physicalCount > 0 && jasaCount > 0, tab: 'master', icon: Package },",
    "      { key: 'catalog', title: 'Barang & Jasa', desc: 'Isi sparepart dan katalog jasa servis.', done: products.length > 0, tab: 'master', icon: Package },",
    'Onboarding catalog readiness'
)
write(path, text)


# 6) App: /track/:resi redirect helper
path = 'src/App.jsx'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';",
    "import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';",
    'App useParams import'
)
loader = """function PageLoader() {
  return <div style={{ minHeight: '100vh', background: '#f7faf9' }} aria-label=\"Memuat halaman\" />;
}
"""
redirect = loader + """
function TrackResiRedirect() {
  const { resi } = useParams();
  return <Navigate to={`/tracking?resi=${encodeURIComponent(resi || '')}`} replace />;
}
"""
text = replace_once(text, loader, redirect, 'App tracking redirect component')
text = replace_once(
    text,
    "            <Route path=\"/tracking\" element={<PublicTracking />} />",
    "            <Route path=\"/tracking\" element={<PublicTracking />} />\n            <Route path=\"/track/:resi\" element={<TrackResiRedirect />} />",
    'App track route'
)
write(path, text)


# 7) Store: logout/session cleanup
path = 'src/store/useStore.js'
text = (ROOT / path).read_text(encoding='utf-8')
text = replace_once(
    text,
    """  clearEmployee: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('EMP_SESSION');
    set({ employee: null });
  },""",
    """  clearEmployee: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('EMP_SESSION');
      localStorage.removeItem('EMPLOYEE_TOKEN');
    }
    set({ employee: null });
  },""",
    'Store employee logout cleanup'
)
text = replace_once(
    text,
    """      localStorage.removeItem('TENANT_TOKEN');
      localStorage.removeItem('TENANT_TIER');""",
    """      localStorage.removeItem('TENANT_TOKEN');
      localStorage.removeItem('TENANT_TIER');
      localStorage.removeItem('TENANT_PHONE');
      localStorage.removeItem('TENANT_SETTINGS');
      localStorage.removeItem('EMPLOYEE_TOKEN');""",
    'Store tenant logout cleanup'
)
write(path, text)


# 8) Desktop sidebar guard without changing native/mobile behavior
path = 'src/index.css'
text = (ROOT / path).read_text(encoding='utf-8')
guard = """

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
if 'QA guard: desktop admin sidebar must remain visible' not in text:
    text += guard
write(path, text)

print('QA priority fixes applied successfully.')
