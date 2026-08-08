from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{label}: expected {expected} matches, found {count}')
    return text.replace(old, new)


# 1) Pure finance helpers: discount allocation + exact service resi matching.
path = 'src/utils/financeUtils.js'
text = read(path)
anchor = """export const buildKasbonDescription = (employee = {}) => {
"""
helpers = r"""export const allocateServiceDiscount = (partFeeValue = 0, jasaFeeValue = 0, discountValue = 0) => {
  const partFee = Math.max(0, normalizeMoneyInteger(partFeeValue));
  const jasaFee = Math.max(0, normalizeMoneyInteger(jasaFeeValue));
  const discount = Math.max(0, normalizeMoneyInteger(discountValue));
  const subtotal = partFee + jasaFee;
  const appliedDiscount = Math.min(discount, subtotal);
  const jasaDiscount = Math.min(appliedDiscount, jasaFee);
  const jasaAfterDiscount = Math.max(0, jasaFee - jasaDiscount);
  const remainingDiscount = Math.max(0, appliedDiscount - jasaDiscount);
  const partAfterDiscount = Math.max(0, partFee - remainingDiscount);

  return {
    partFee,
    jasaFee,
    discount,
    subtotal,
    partAfterDiscount,
    jasaAfterDiscount,
    totalAfterDiscount: partAfterDiscount + jasaAfterDiscount,
  };
};

export const transactionMatchesServiceResi = (description = '', resi = '') => {
  const serviceResi = String(resi || '').trim();
  if (!serviceResi) return false;
  const escaped = serviceResi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\bResi\\s*:?\\s*${escaped}(?=$|[^A-Za-z0-9_-])`, 'i');
  return pattern.test(String(description || ''));
};

"""
text = replace_once(text, anchor, helpers + anchor, 'finance helper insertion')
write(path, text)


# 2) Settlement logic: exact idempotence + correct discount allocation.
path = 'src/services/api.js'
text = read(path)
text = replace_once(
    text,
    "import { normalizeKasbonAmount, normalizeMoneyInteger, normalizeTransactionAmounts } from '../utils/financeUtils';",
    "import { allocateServiceDiscount, normalizeKasbonAmount, normalizeMoneyInteger, normalizeTransactionAmounts, transactionMatchesServiceResi } from '../utils/financeUtils';",
    'api finance imports',
)
old_money = """    const partFee = Math.max(0, normalizeMoneyInteger(part_fee));
    const jasaFee = Math.max(0, normalizeMoneyInteger(jasa_fee));
    const discountValue = Math.max(0, normalizeMoneyInteger(discount));
    const jasaAfterDiscount = Math.max(0, jasaFee - discountValue);

    if (partFee <= 0 && jasaAfterDiscount <= 0) {
      throw new Error('Rincian pembayaran servis belum diisi. Tandai Selesai dan isi biaya terlebih dahulu.');
    }
"""
new_money = """    const {
      partFee,
      jasaFee,
      discount: discountValue,
      subtotal,
      partAfterDiscount,
      jasaAfterDiscount,
    } = allocateServiceDiscount(part_fee, jasa_fee, discount);

    if (subtotal <= 0) {
      throw new Error('Rincian pembayaran servis belum diisi. Tandai Selesai dan isi biaya terlebih dahulu.');
    }
    if (discountValue > subtotal) {
      throw new Error('Diskon tidak boleh lebih besar dari total biaya servis.');
    }
"""
text = replace_once(text, old_money, new_money, 'settlement discount allocation')
old_existing = """    const { data: existingRows, error: existingError } = await supabase
      .from('transactions')
      .select('id,type,amount,description')
      .eq('tenant_code', tenantCode)
      .ilike('description', `%Resi ${serviceResi}%`);
    if (existingError) throw existingError;

    const existing = existingRows || [];
    const hasCombinedIncome = existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME');
    const hasJasaIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_JASA');
    const hasPartIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_SPAREPART');
"""
new_existing = """    const { data: existingRows, error: existingError } = await supabase
      .from('transactions')
      .select('id,type,amount,description')
      .eq('tenant_code', tenantCode)
      .ilike('description', `%${serviceResi}%`);
    if (existingError) throw existingError;

    // The DB search is intentionally broad, then narrowed to an exact resi token.
    // This prevents TRX-123 from being treated as already paid because TRX-1234 exists.
    const existing = (existingRows || []).filter((row) => transactionMatchesServiceResi(row.description, serviceResi));
    const hasCombinedIncome = existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME');
    const hasJasaIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_JASA');
    const hasPartIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_SPAREPART');
    const alreadySettledBefore =
      (jasaAfterDiscount <= 0 || hasJasaIncome) &&
      (partAfterDiscount <= 0 || hasPartIncome) &&
      (jasaAfterDiscount > 0 || partAfterDiscount > 0);
"""
text = replace_once(text, old_existing, new_existing, 'settlement exact resi idempotence')
text = replace_once(
    text,
    """    if (partFee > 0 && !hasPartIncome) {
      rowsToInsert.push({
        tenant_code: tenantCode,
        type: 'INCOME_SPAREPART',
        amount: partFee,
""",
    """    if (partAfterDiscount > 0 && !hasPartIncome) {
      rowsToInsert.push({
        tenant_code: tenantCode,
        type: 'INCOME_SPAREPART',
        amount: partAfterDiscount,
""",
    'settlement part discount allocation',
)
text = replace_once(text, '      alreadySettled: rowsToInsert.length === 0,', '      alreadySettled: alreadySettledBefore,', 'settlement alreadySettled semantics')
old_status_dispatch = """      if (endpoint.startsWith('/services/') && endpoint.endsWith('/status')) {
        const resi = endpoint.split('/')[2];
        const { data, error } = await supabase.from('services').update({ status: body.status }).eq('resi', resi).select().single();
        if (error) throw error;
        return data;
      }
"""
new_status_dispatch = """      if (endpoint.startsWith('/services/') && endpoint.endsWith('/status')) {
        const resi = endpoint.split('/')[2];
        let query = supabase.from('services').update({ status: body.status }).eq('resi', resi);
        if (body.tenant_code) query = query.eq('tenant_code', body.tenant_code);
        const { data, error } = await query.select().single();
        if (error) throw error;
        return data;
      }
"""
text = replace_once(text, old_status_dispatch, new_status_dispatch, 'tenant scoped status dispatcher')
write(path, text)


# 3) Admin DIAMBIL must use the same settlement path as Portal Tim.
path = 'src/pages/AdminDashboard.jsx'
text = read(path)
old_admin_fn = """  const updateServiceStatusFromAction = async (service, newStatus) => {
    if (newStatus === 'SELESAI') {
      setSelectedService({ ...service, __markSelesaiFromAdmin: true });
      setShowEditServiceNota(true);
      return;
    }
    if ((newStatus === 'DIAMBIL' || newStatus === 'DI AMBIL') && !service.part_fee && !service.jasa_fee) {
      alert('Isi rincian biaya servis lewat status Selesai terlebih dahulu sebelum menandai Diambil.');
      return;
    }
    try {
      await apiService.post('/services/update', { resi: service.resi, status: newStatus });
      setServices(services.map((item) => item.resi === service.resi ? { ...item, status: newStatus } : item));
      if (hasFeature(tenant?.tier, 'whatsappNotif') && await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Kirim WhatsApp pelanggan?', message: 'Status berhasil disimpan. Kirim update status ke WhatsApp pelanggan sekarang?', confirmText: 'Kirim WA', tone: 'info' }) : Promise.resolve(window.confirm('Kirim update status ke WhatsApp pelanggan?')))) {
        const storeName = tenant?.settings?.storeName || tenant?.name || 'Toko Servis';
        const trackingUrl = `${window.location.origin}/tracking?resi=${service.resi}`;
        const message = `Halo Kak ${service.customer_name}, status servis ${service.device_name} (Resi: ${service.resi}) dari *${storeName}* sekarang: *${getStatusInfo(newStatus).label}*.\\n\\nCek status langsung di sini:\\n${trackingUrl}`;
        const phoneConflict = findEmployeePhoneConflict(service.customer_phone, users);
        if (phoneConflict) {
          alert(`Nomor WA pelanggan ini sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan dulu agar notifikasi tidak salah alamat.`);
        } else {
          await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });
        }
      }
    } catch (error) {
      alert('Gagal update status');
    }
  };
"""
new_admin_fn = """  const updateServiceStatusFromAction = async (service, newStatus) => {
    const normalizedStatus = newStatus === 'DI AMBIL' ? 'DIAMBIL' : newStatus;
    if (normalizedStatus === 'SELESAI') {
      setSelectedService({ ...service, __markSelesaiFromAdmin: true });
      setShowEditServiceNota(true);
      return;
    }
    if (normalizedStatus === 'DIAMBIL' && !service.part_fee && !service.jasa_fee) {
      alert('Isi rincian biaya servis lewat status Selesai terlebih dahulu sebelum menandai Diambil.');
      return;
    }
    if (normalizedStatus === 'DIAMBIL') {
      const confirmed = await (window.UnitProConfirm
        ? window.UnitProConfirm({
            title: 'Tandai barang diambil?',
            message: 'Pembayaran akan masuk otomatis ke laporan toko dan aman diulang tanpa membuat omzet dobel.',
            confirmText: 'Tandai Diambil',
            tone: 'info',
          })
        : Promise.resolve(window.confirm('Ubah status menjadi Diambil (Lunas)?')));
      if (!confirmed) return;
    }

    try {
      if (normalizedStatus === 'DIAMBIL') {
        const discountMatch = String(service.issue || '').match(/\\[Diskon: Rp (.*?)\\]/);
        const discount = discountMatch ? normalizeMoneyInput(discountMatch[1]) : 0;
        const result = await apiService.settleServicePickup({
          tenant_code: tenant.code,
          resi: service.resi,
          part_fee: service.part_fee,
          jasa_fee: service.jasa_fee,
          discount,
          technician_id: service.technician_id,
          issue: service.issue,
          customer_name: service.customer_name,
        });
        setServices((current) => current.map((item) => item.resi === service.resi ? { ...item, ...result.service, status: 'DIAMBIL' } : item));
        const latestTransactions = await apiService.getTransactions(tenant.code);
        setTransactions(latestTransactions);
        if (result.alreadySettled) {
          alert('Servis sudah lunas sebelumnya. Omzet tidak dibuat ulang.');
        }
      } else {
        const updated = await apiService.post('/services/update', {
          resi: service.resi,
          tenant_code: tenant.code,
          status: normalizedStatus,
        });
        setServices((current) => current.map((item) => item.resi === service.resi ? { ...item, ...updated, status: normalizedStatus } : item));
      }

      if (hasFeature(tenant?.tier, 'whatsappNotif') && await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Kirim WhatsApp pelanggan?', message: 'Status berhasil disimpan. Kirim update status ke WhatsApp pelanggan sekarang?', confirmText: 'Kirim WA', tone: 'info' }) : Promise.resolve(window.confirm('Kirim update status ke WhatsApp pelanggan?')))) {
        const storeName = tenant?.settings?.storeName || tenant?.name || 'Toko Servis';
        const trackingUrl = `${window.location.origin}/tracking?resi=${service.resi}`;
        const message = `Halo Kak ${service.customer_name}, status servis ${service.device_name} (Resi: ${service.resi}) dari *${storeName}* sekarang: *${getStatusInfo(normalizedStatus).label}*.\\n\\nCek status langsung di sini:\\n${trackingUrl}`;
        const phoneConflict = findEmployeePhoneConflict(service.customer_phone, users);
        if (phoneConflict) {
          alert(`Nomor WA pelanggan ini sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan dulu agar notifikasi tidak salah alamat.`);
        } else {
          await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });
        }
      }
    } catch (error) {
      console.error('Gagal update status servis:', error);
      alert(`Gagal update status: ${error?.message || 'data tidak dapat disimpan'}`);
    }
  };
"""
text = replace_once(text, old_admin_fn, new_admin_fn, 'admin settlement flow')
write(path, text)


# 4) Portal Tim: tenant scoping and technician-id type consistency.
path = 'src/pages/EmployeePortal.jsx'
text = read(path)
text = replace_once(
    text,
    "await apiService.post('/services/update', { resi: transferService.resi, technician_id: replacement.id, issue: updatedIssue });",
    "await apiService.post('/services/update', { resi: transferService.resi, tenant_code: employee.tenant_code || tenant.code, technician_id: replacement.id, issue: updatedIssue });",
    'employee transfer tenant scope',
)
text = replace_once(
    text,
    "<span>{services.filter(s => String(s.technician_id) === String(employee.id) && s.status !== 'DIAMBIL').length} aktif</span>",
    "<span>{services.filter(s => String(s.technician_id) === String(employee.id) && !isPaidServiceStatus(s.status)).length} aktif</span>",
    'employee active task count paid alias',
)
text = replace_count(
    text,
    'services.filter(s => s.technician_id === employee.id)',
    'services.filter(s => String(s.technician_id) === String(employee.id))',
    2,
    'employee task id comparisons',
)
text = replace_once(
    text,
    "{s.status !== 'DIAMBIL' ? (",
    "{!isPaidServiceStatus(s.status) ? (",
    'employee paid status selector guard',
)
text = replace_once(
    text,
    "await apiService.post(`/services/${s.resi}/status`, { status: newStatus });",
    "await apiService.post(`/services/${s.resi}/status`, { status: newStatus, tenant_code: employee.tenant_code || tenant.code });",
    'employee status tenant scope',
)
text = replace_once(
    text,
    """                await apiService.post('/services/finish', {
                  resi: selectedService.resi,
                  status: 'SELESAI',
                  part_fee: partFee,
                  jasa_fee: jasaFee,
                  technician_id: employee.id,
                  issue: updatedIssue
                });
""",
    """                await apiService.post('/services/finish', {
                  resi: selectedService.resi,
                  tenant_code: employee.tenant_code || tenant.code,
                  status: 'SELESAI',
                  part_fee: partFee,
                  jasa_fee: jasaFee,
                  technician_id: selectedService.technician_id || employee.id,
                  issue: updatedIssue
                });
""",
    'employee finish tenant and technician preservation',
)
write(path, text)

print('QA Round 4 stabilization patch applied successfully.')
