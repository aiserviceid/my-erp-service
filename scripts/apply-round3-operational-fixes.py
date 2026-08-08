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


def replace_between(text, start, end, replacement, label):
    start_idx = text.find(start)
    if start_idx < 0:
        raise RuntimeError(f'{label}: start marker not found')
    end_idx = text.find(end, start_idx)
    if end_idx < 0:
        raise RuntimeError(f'{label}: end marker not found')
    return text[:start_idx] + replacement + text[end_idx:]

# ---------------------------------------------------------------------------
# API: normalize legacy kasbon reads/writes + idempotent service settlement
# ---------------------------------------------------------------------------
path = 'src/services/api.js'
text = read(path)
text = replace_once(
    text,
    "import { compressImageFile } from '../utils/imageCompressor';\n",
    "import { compressImageFile } from '../utils/imageCompressor';\nimport { normalizeKasbonAmount, normalizeMoneyInteger, normalizeTransactionAmounts } from '../utils/financeUtils';\n",
    'api finance helper import',
)

# getTransactions and generic get both return raw transaction rows today.
text = text.replace('      return data || [];\n    } catch (e) {\n      console.error(\'getTransactions error:\', e);',
                    '      return normalizeTransactionAmounts(data || []);\n    } catch (e) {\n      console.error(\'getTransactions error:\', e);', 1)
text = replace_once(
    text,
    "        return data || [];\n      }\n      if (endpoint.startsWith('/services/')) {",
    "        return normalizeTransactionAmounts(data || []);\n      }\n      if (endpoint.startsWith('/services/')) {",
    'generic transaction read normalization',
)

text = replace_once(
    text,
    "      if (endpoint === '/transactions') {\n        const { data, error } = await supabase.from('transactions').insert(body).select().single();\n        if (error) throw error;\n        return data;\n      }",
    "      if (endpoint === '/transactions') {\n        const transactionBody = {\n          ...body,\n          amount: String(body?.type || '').toUpperCase().startsWith('BON_')\n            ? normalizeKasbonAmount(body?.amount, body?.type)\n            : normalizeMoneyInteger(body?.amount),\n        };\n        const { data, error } = await supabase.from('transactions').insert(transactionBody).select().single();\n        if (error) throw error;\n        return data;\n      }",
    'transaction write normalization',
)

settlement_method = """
  settleServicePickup: async ({
    tenant_code,
    resi,
    part_fee = 0,
    jasa_fee = 0,
    discount = 0,
    technician_id = null,
    issue = '',
    customer_name = '',
  }) => {
    const tenantCode = String(tenant_code || '').trim();
    const serviceResi = String(resi || '').trim();
    if (!tenantCode || !serviceResi) throw new Error('Kode toko dan resi wajib diisi.');

    const partFee = Math.max(0, normalizeMoneyInteger(part_fee));
    const jasaFee = Math.max(0, normalizeMoneyInteger(jasa_fee));
    const discountValue = Math.max(0, normalizeMoneyInteger(discount));
    const jasaAfterDiscount = Math.max(0, jasaFee - discountValue);

    if (partFee <= 0 && jasaAfterDiscount <= 0) {
      throw new Error('Rincian pembayaran servis belum diisi. Tandai Selesai dan isi biaya terlebih dahulu.');
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('transactions')
      .select('id,type,amount,description')
      .eq('tenant_code', tenantCode)
      .ilike('description', `%Resi ${serviceResi}%`);
    if (existingError) throw existingError;

    const existing = existingRows || [];
    const hasCombinedIncome = existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME');
    const hasJasaIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_JASA');
    const hasPartIncome = hasCombinedIncome || existing.some((row) => String(row.type || '').toUpperCase() === 'INCOME_SPAREPART');
    const rowsToInsert = [];
    const customerLabel = String(customer_name || '').trim();
    const customerSuffix = customerLabel ? ` (${customerLabel})` : '';

    if (jasaAfterDiscount > 0 && !hasJasaIncome) {
      rowsToInsert.push({
        tenant_code: tenantCode,
        type: 'INCOME_JASA',
        amount: jasaAfterDiscount,
        description: `Jasa Servis Resi ${serviceResi}${customerSuffix}`,
      });
    }
    if (partFee > 0 && !hasPartIncome) {
      rowsToInsert.push({
        tenant_code: tenantCode,
        type: 'INCOME_SPAREPART',
        amount: partFee,
        description: `Sparepart Servis Resi ${serviceResi}${customerSuffix}`,
      });
    }

    let createdTransactions = [];
    if (rowsToInsert.length > 0) {
      const { data: created, error: createError } = await supabase
        .from('transactions')
        .insert(rowsToInsert)
        .select();
      if (createError) throw createError;
      createdTransactions = created || [];
    }

    const serviceUpdates = {
      status: 'DIAMBIL',
      part_fee: partFee,
      jasa_fee: jasaFee,
      technician_id,
      ...(issue ? { issue } : {}),
    };
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .update(serviceUpdates)
      .eq('tenant_code', tenantCode)
      .eq('resi', serviceResi)
      .select()
      .maybeSingle();
    if (serviceError) throw serviceError;
    if (!service) throw new Error('Servis tidak ditemukan atau bukan milik toko ini.');

    return {
      service,
      createdTransactions,
      alreadySettled: rowsToInsert.length === 0,
    };
  },

"""
text = replace_once(text, '  // 6. Generic Dispatcher (for existing components)\n', settlement_method + '  // 6. Generic Dispatcher (for existing components)\n', 'settlement method insertion')

# Tenant-scope finish update when caller supplies tenant_code.
old_finish = """      if (endpoint === '/services/finish') {
        const { data, error } = await supabase.from('services').update({ 
          status: body.status, 
          part_fee: body.part_fee, 
          jasa_fee: body.jasa_fee,
          technician_id: body.technician_id,
          ...(body.issue ? { issue: body.issue } : {})
        }).eq('resi', body.resi).select().single();
        if (error) throw error;
        return data;
      }"""
new_finish = """      if (endpoint === '/services/finish') {
        let query = supabase.from('services').update({
          status: body.status,
          part_fee: body.part_fee,
          jasa_fee: body.jasa_fee,
          technician_id: body.technician_id,
          ...(body.issue ? { issue: body.issue } : {})
        }).eq('resi', body.resi);
        if (body.tenant_code) query = query.eq('tenant_code', body.tenant_code);
        const { data, error } = await query.select().single();
        if (error) throw error;
        return data;
      }"""
text = replace_once(text, old_finish, new_finish, 'tenant scoped finish')
write(path, text)

# ---------------------------------------------------------------------------
# Employee Portal: kasbon parser, persistent identity, paid commission,
# and non-blocking/idempotent DIAMBIL settlement.
# ---------------------------------------------------------------------------
path = 'src/pages/EmployeePortal.jsx'
text = read(path)
text = replace_once(
    text,
    "import { SERVICE_STATUSES } from '../config/tierLimits';\n",
    "import { SERVICE_STATUSES } from '../config/tierLimits';\nimport { buildKasbonDescription, isPaidServiceStatus, normalizeKasbonAmount, parseKasbonDescription } from '../utils/financeUtils';\n",
    'employee finance import',
)
text = replace_once(
    text,
    "    const amount = Number(new FormData(event.currentTarget).get('amount'));\n",
    "    const amount = normalizeKasbonAmount(new FormData(event.currentTarget).get('amount'), 'BON_PENDING');\n",
    'kasbon formatted amount parser',
)
text = replace_once(
    text,
    "        description: `EMP_${employee.id}`\n",
    "        description: buildKasbonDescription(employee)\n",
    'kasbon explicit employee identity',
)

old_commission = """  const myCompletedServices = services.filter(s => (s.status === 'SELESAI' || s.status === 'DI AMBIL') && s.technician_id === employee.id);
  const totalJasaFee = myCompletedServices.reduce((sum, s) => sum + (s.jasa_fee || 0), 0);
  const totalKomisi = Math.floor(totalJasaFee * (myCommissionRate / 100));

  const myBonTransactions = transactions.filter(t => t.type === 'BON_KARYAWAN' && t.description === `EMP_${employee.id}`);"""
new_commission = """  const myCompletedServices = services.filter(s => isPaidServiceStatus(s.status) && String(s.technician_id) === String(employee.id));
  const totalJasaFee = myCompletedServices.reduce((sum, s) => sum + Number(s.jasa_fee || 0), 0);
  const totalKomisi = Math.floor(totalJasaFee * (myCommissionRate / 100));

  const myBonTransactions = transactions.filter((t) => {
    if (t.type !== 'BON_KARYAWAN') return false;
    return String(parseKasbonDescription(t.description).employeeId) === String(employee.id);
  });"""
text = replace_once(text, old_commission, new_commission, 'paid commission and kasbon matching')

# Replace entire DIAMBIL branch. Remove native prompt that blocks automated/browser flow.
start = "                                } else if (newStatus === 'DIAMBIL' || newStatus === 'DI AMBIL') {\n"
end = "                                } else {\n                                  try {\n                                    await apiService.post(`/services/${s.resi}/status`, { status: newStatus });"
new_branch = """                                } else if (newStatus === 'DIAMBIL' || newStatus === 'DI AMBIL') {
                                  if (!Number(s.part_fee || 0) && !Number(s.jasa_fee || 0)) {
                                    alert('Isi rincian biaya servis lewat status Selesai terlebih dahulu sebelum menandai Di Ambil.');
                                    return;
                                  }
                                  if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Tandai barang diambil?', message: 'Pembayaran akan masuk otomatis ke Laporan toko. Proses ini aman diulang tanpa membuat omzet dobel.', confirmText: 'Tandai Diambil', tone: 'info' }) : Promise.resolve(window.confirm('Ubah status menjadi Di Ambil?\n\n(Pembayaran akan masuk otomatis ke Laporan Keuangan Toko)')))) {
                                    try {
                                      const discountMatch = String(s.issue || '').match(/\[Diskon: Rp (.*?)\]/);
                                      const discount = discountMatch ? normalizeMoneyInput(discountMatch[1]) : 0;
                                      const tenantCode = employee.tenant_code || tenant.code;
                                      const result = await apiService.settleServicePickup({
                                        tenant_code: tenantCode,
                                        resi: s.resi,
                                        part_fee: s.part_fee,
                                        jasa_fee: s.jasa_fee,
                                        discount,
                                        technician_id: s.technician_id,
                                        issue: s.issue,
                                        customer_name: s.customer_name,
                                      });

                                      setServices((current) => current.map((item) => item.resi === s.resi ? { ...item, ...result.service, status: 'DIAMBIL' } : item));
                                      await fetchTransactions();

                                      if (result.alreadySettled) {
                                        alert('Servis sudah ditandai lunas sebelumnya. Omzet tidak dibuat ulang.');
                                      } else {
                                        alert('Servis berhasil ditandai Diambil (Lunas) dan pembayaran sudah masuk ke Laporan.');
                                      }

                                      if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Cetak nota pengambilan?', message: 'Servis sudah lunas. Cetak nota pengambilan untuk pelanggan?', confirmText: 'Cetak Nota', tone: 'success' }) : Promise.resolve(window.confirm('Servis Lunas! Ingin mencetak Nota Pengambilan?')))) {
                                        setSelectedService({ ...s, ...result.service, status: 'DIAMBIL' });
                                        setPrintType('pengambilan');
                                        setShowPrintModal(true);
                                      }
                                    } catch (err) {
                                      console.error('Gagal menyelesaikan pelunasan servis:', err);
                                      alert(`Gagal menandai Diambil: ${err?.message || 'transaksi atau status tidak dapat disimpan'}. Silakan coba lagi; sistem akan mencegah omzet dobel.`);
                                      await fetchServices();
                                      await fetchTransactions();
                                    }
                                  }
"""
text = replace_between(text, start, end, new_branch, 'employee DIAMBIL settlement')
write(path, text)

# ---------------------------------------------------------------------------
# Admin: preserve kasbon history, resolve employee IDs robustly, no delete/recreate.
# ---------------------------------------------------------------------------
path = 'src/pages/AdminDashboard.jsx'
text = read(path)
text = replace_once(
    text,
    "import { t, getAppLanguage, setAppLanguage } from '../utils/i18n';\n",
    "import { t, getAppLanguage, setAppLanguage } from '../utils/i18n';\nimport { parseKasbonDescription } from '../utils/financeUtils';\n",
    'admin kasbon helper import',
)

# Axis zero/small-value formatter.
text = replace_once(
    text,
    "  if (amount > 0) return `Rp ${Math.round(amount / 1000)}rb`;\n  return 'Rp 0';",
    "  if (amount >= 1000) return `Rp ${Math.round(amount / 1000)}rb`;\n  if (amount > 0) return `Rp ${Math.round(amount)}`;\n  return 'Rp 0';",
    'admin compact rupiah formatter',
)

text = replace_once(
    text,
    "  const pendingKasbonCount = transactions.filter(t => t.type === 'BON_PENDING').length;\n",
    "  const pendingKasbonCount = transactions.filter(t => t.type === 'BON_PENDING').length;\n  const kasbonTransactions = transactions\n    .filter((transaction) => ['BON_PENDING', 'BON_KARYAWAN', 'BON_REJECTED'].includes(transaction.type))\n    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));\n  const resolveKasbonEmployee = (transaction) => {\n    const meta = parseKasbonDescription(transaction?.description);\n    const employeeMatch = users.find((user) => String(user.id) === String(meta.employeeId));\n    return {\n      id: meta.employeeId,\n      name: employeeMatch?.name || meta.employeeName || `Karyawan (${meta.employeeId || '-'})`,\n    };\n  };\n",
    'admin kasbon derived data',
)

start = "             {empTab === 'kasbon' && (\n"
end = "             {/* TAB CONTENT: ABSENSI */}\n"
kasbon_block = """             {empTab === 'kasbon' && (
               <div className="animate-fade-in">
                 <table className="table">
                   <thead><tr><th>Nama Karyawan</th><th>Nominal (Rp)</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
                   <tbody>
                     {kasbonTransactions.map((transaction) => {
                       const kasbonEmployee = resolveKasbonEmployee(transaction);
                       const statusLabel = transaction.type === 'BON_PENDING' ? 'Menunggu' : transaction.type === 'BON_KARYAWAN' ? 'Disetujui' : 'Ditolak';
                       const statusClass = transaction.type === 'BON_PENDING' ? 'badge-warning' : transaction.type === 'BON_KARYAWAN' ? 'badge-success' : 'badge-danger';
                       return (
                         <tr key={transaction.id}>
                           <td><strong>{kasbonEmployee.name}</strong></td>
                           <td style={{ color: '#ef4444', fontWeight: 'bold' }}>Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}</td>
                           <td>{new Date(transaction.created_at).toLocaleString('id-ID')}</td>
                           <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                           <td>
                             {transaction.type === 'BON_PENDING' ? (
                               <div style={{ display: 'flex', gap: '5px' }}>
                                 <button className="btn btn-success" style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#10b981', color: 'white', border: 'none' }} onClick={async () => {
                                   if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Setujui kasbon?', message: 'Nominal ini akan memotong THP anggota tim dan tetap tersimpan di riwayat.', confirmText: 'Setujui', tone: 'warning' }) : Promise.resolve(window.confirm('Setujui kasbon ini? Nominal akan memotong THP karyawan.')))) {
                                     try {
                                       await apiService.post(`/transactions/${transaction.id}/update`, { type: 'BON_KARYAWAN' });
                                       setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, type: 'BON_KARYAWAN' } : item));
                                       alert('Kasbon disetujui dan tersimpan di riwayat.');
                                     } catch (error) {
                                       console.error('Gagal menyetujui kasbon:', error);
                                       alert('Gagal update kasbon');
                                     }
                                   }
                                 }}>Setujui</button>
                                 <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                                   if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Tolak kasbon?', message: 'Pengajuan akan ditandai Ditolak dan tetap tersimpan di riwayat.', confirmText: 'Tolak', tone: 'warning' }) : Promise.resolve(window.confirm('Tolak kasbon ini?')))) {
                                     try {
                                       await apiService.post(`/transactions/${transaction.id}/update`, { type: 'BON_REJECTED' });
                                       setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, type: 'BON_REJECTED' } : item));
                                     } catch (error) {
                                       console.error('Gagal menolak kasbon:', error);
                                       alert('Gagal tolak kasbon');
                                     }
                                   }
                                 }}>Tolak</button>
                               </div>
                             ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tersimpan</span>}
                           </td>
                         </tr>
                       );
                     })}
                     {kasbonTransactions.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada riwayat kasbon.</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}

"""
text = replace_between(text, start, end, kasbon_block, 'admin kasbon history table')

text = replace_once(
    text,
    "            const empId = bon.description.replace('EMP_', '');\n            const emp = users.find(u => u.id === empId);\n",
    "            const kasbonEmployee = resolveKasbonEmployee(bon);\n",
    'notification employee resolution',
)
text = replace_once(
    text,
    "                  <strong>{emp ? emp.name : `Karyawan (${empId})`}</strong> mengajukan Kasbon sebesar <strong>Rp {bon.amount.toLocaleString('id-ID')}</strong>.\n",
    "                  <strong>{kasbonEmployee.name}</strong> mengajukan Kasbon sebesar <strong>Rp {Number(bon.amount || 0).toLocaleString('id-ID')}</strong>.\n",
    'notification employee display',
)
text = text.replace("                      setTransactions(transactions.map(t => t.id === bon.id ? { ...t, type: 'BON_KARYAWAN' } : t));",
                    "                      setTransactions((current) => current.map(t => t.id === bon.id ? { ...t, type: 'BON_KARYAWAN' } : t));", 1)
text = text.replace("                      setTransactions(transactions.map(t => t.id === bon.id ? { ...t, type: 'BON_REJECTED' } : t));",
                    "                      setTransactions((current) => current.map(t => t.id === bon.id ? { ...t, type: 'BON_REJECTED' } : t));", 1)
write(path, text)

# ---------------------------------------------------------------------------
# Finance report + employee finance chart: natural Rp 0 and paid-only commission.
# ---------------------------------------------------------------------------
path = 'src/components/PremiumFinanceReport.jsx'
text = read(path)
text = replace_once(
    text,
    "  if (amount > 0) return `Rp ${Math.round(amount / 1000)}rb`;\n  return 'Rp 0';",
    "  if (amount >= 1000) return `Rp ${Math.round(amount / 1000)}rb`;\n  if (amount > 0) return `Rp ${Math.round(amount)}`;\n  return 'Rp 0';",
    'finance compact rupiah formatter',
)
write(path, text)

path = 'src/components/EmployeeFinanceInsights.jsx'
text = read(path)
text = replace_once(
    text,
    "import {\n  LineChart,",
    "import { isPaidServiceStatus } from '../utils/financeUtils';\nimport {\n  LineChart,",
    'employee finance paid status import',
)
text = replace_once(
    text,
    "  if (amount > 0) return `Rp ${Math.round(amount / 1000)}rb`;\n  return 'Rp 0';",
    "  if (amount >= 1000) return `Rp ${Math.round(amount / 1000)}rb`;\n  if (amount > 0) return `Rp ${Math.round(amount)}`;\n  return 'Rp 0';",
    'employee finance compact rupiah formatter',
)
text = replace_once(
    text,
    "    .filter((service) => ['SELESAI', 'DIAMBIL', 'DI AMBIL'].includes(String(service.status || '').toUpperCase()))\n",
    "    .filter((service) => isPaidServiceStatus(service.status))\n",
    'employee commission paid only',
)
text = text.replace('Ringkasan pendapatan berdasarkan servis yang diselesaikan.', 'Ringkasan pendapatan berdasarkan servis yang sudah lunas/diambil.', 1)
text = text.replace('10 servis selesai terbaru.', '10 servis lunas terbaru.', 1)
text = text.replace('Tren akan muncul setelah servis pertama selesai.', 'Tren akan muncul setelah servis pertama lunas/diambil.', 1)
write(path, text)

# ---------------------------------------------------------------------------
# Issue chips: collapse duplicate value and prefer Jasa over Sparepart.
# ---------------------------------------------------------------------------
path = 'src/components/IssueChips.jsx'
text = read(path)
old_loop = """  while ((match = bracketPattern.exec(source)) !== null) {
    tags.push({ label: match[1].trim(), value: match[2].trim() });
  }
"""
new_loop = """  while ((match = bracketPattern.exec(source)) !== null) {
    const candidate = { label: match[1].trim(), value: match[2].trim() };
    const normalizedValue = candidate.value.toLowerCase().replace(/\\s+/g, ' ').trim();
    const existingIndex = tags.findIndex((tag) => tag.normalizedValue === normalizedValue);

    if (existingIndex === -1) {
      tags.push({ ...candidate, normalizedValue });
      continue;
    }

    const existing = tags[existingIndex];
    const existingLabel = existing.label.toLowerCase();
    const candidateLabel = candidate.label.toLowerCase();
    const existingIsSparepart = existingLabel.includes('sparepart');
    const candidateIsService = candidateLabel.includes('jasa') || candidateLabel.includes('servis') || candidateLabel.includes('service');

    // A legacy note can contain the same value twice (e.g. "service mainboard")
    // as both Sparepart and Jasa. Keep one chip and prefer the more specific Jasa tag.
    if (existingIsSparepart && candidateIsService) {
      tags[existingIndex] = { ...candidate, normalizedValue };
    }
  }
"""
text = replace_once(text, old_loop, new_loop, 'issue chip dedupe')
write(path, text)

# CSS nowrap for chip labels.
path = 'src/unitpro-ui-polish.css'
text = read(path)
marker = ".issue-chip {\n"
idx = text.find(marker)
if idx < 0:
    raise RuntimeError('issue chip CSS marker not found')
insert_at = text.find('}', idx)
block = text[idx:insert_at]
if 'white-space:' not in block:
    text = text[:insert_at] + '  white-space: nowrap;\n' + text[insert_at:]
write(path, text)

print('Round 3 operational fixes applied successfully.')
