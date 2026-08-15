from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new):
    text = read(path)
    if old not in text:
        raise SystemExit(f"Pattern not found in {path}: {old[:140]!r}")
    write(path, text.replace(old, new, 1))


def replace_all(path, old, new, minimum=1):
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"Expected >= {minimum} matches in {path}, got {count}: {old[:140]!r}")
    write(path, text.replace(old, new))


# Central service flow
path = "src/config/tierLimits.js"
replace_once(path,
    "  { id: 'DICEK',          label: 'Sedang Dicek',    color: '#3B82F6', bg: '#DBEAFE', icon: '🔍', description: 'Teknisi sedang melakukan pengecekan' },\n",
    "")
replace_once(path,
    "  { id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#F59E0B', bg: '#FEF3C7', icon: '🔧', description: 'Perbaikan sedang dilakukan' },\n",
    "  { id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#F59E0B', bg: '#FEF3C7', icon: '🔧', description: 'Perangkat sedang ditangani teknisi' },\n"
    "  { id: 'PERSETUJUAN',    label: 'Minta Persetujuan', color: '#8B5CF6', bg: '#EDE9FE', icon: '💬', description: 'Menunggu persetujuan pelanggan untuk tindakan atau biaya servis' },\n")
replace_once(path,
    "export const getStatusInfo = (statusId) => {\n  return SERVICE_STATUSES.find(s => s.id === statusId) || SERVICE_STATUSES[0];\n};\n\nexport const getNextStatuses = (currentStatus) => {\n  const idx = SERVICE_STATUSES.findIndex(s => s.id === currentStatus);\n  if (idx === -1) return SERVICE_STATUSES;\n  return SERVICE_STATUSES.filter((s, i) => i > idx || s.id === 'DIBATALKAN');\n};",
    "const SERVICE_STATUS_ALIASES = {\n"
    "  DITERIMA: 'PROSES',\n"
    "  DICEK: 'DIKERJAKAN',\n"
    "  SEDANG_DICEK: 'DIKERJAKAN',\n"
    "  SEDANG_DIKERJAKAN: 'DIKERJAKAN',\n"
    "  MENUNGGUPERSETUJUAN: 'PERSETUJUAN',\n"
    "  MENUNGGU_PERSETUJUAN: 'PERSETUJUAN',\n"
    "  DI_AMBIL: 'DIAMBIL',\n"
    "  BATAL: 'DIBATALKAN',\n"
    "};\n\n"
    "export const normalizeServiceStatus = (statusId = '') => {\n"
    "  const normalized = String(statusId || '').trim().toUpperCase().replace(/\\s+/g, '_');\n"
    "  return SERVICE_STATUS_ALIASES[normalized] || normalized || 'PROSES';\n"
    "};\n\n"
    "export const getStatusInfo = (statusId) => {\n"
    "  const normalized = normalizeServiceStatus(statusId);\n"
    "  return SERVICE_STATUSES.find(s => s.id === normalized) || SERVICE_STATUSES[0];\n"
    "};\n\n"
    "export const getNextStatuses = (currentStatus) => {\n"
    "  const normalized = normalizeServiceStatus(currentStatus);\n"
    "  const idx = SERVICE_STATUSES.findIndex(s => s.id === normalized);\n"
    "  if (idx === -1) return SERVICE_STATUSES;\n"
    "  return SERVICE_STATUSES.filter((s, i) => i > idx || s.id === 'DIBATALKAN');\n"
    "};")

# WhatsApp messages
path = "src/services/notificationService.js"
replace_once(path,
    "const normalizeStatus = (value = '') => String(value || '').toUpperCase().replace(/\\s+/g, '');",
    "const normalizeStatus = (value = '') => {\n"
    "  const normalized = String(value || '').trim().toUpperCase().replace(/\\s+/g, '_');\n"
    "  if (normalized === 'DITERIMA') return 'PROSES';\n"
    "  if (normalized === 'DICEK' || normalized === 'SEDANG_DICEK') return 'DIKERJAKAN';\n"
    "  if (normalized === 'MENUNGGUPERSETUJUAN' || normalized === 'MENUNGGU_PERSETUJUAN') return 'PERSETUJUAN';\n"
    "  if (normalized === 'DI_AMBIL') return 'DIAMBIL';\n"
    "  if (normalized === 'BATAL') return 'DIBATALKAN';\n"
    "  return normalized;\n"
    "};")
replace_once(path,
    "    'Kami akan melakukan pengecekan terlebih dahulu. Bila diperlukan persetujuan biaya, kami akan menghubungi Anda melalui WhatsApp ini.',",
    "    'Perangkat akan segera diproses oleh teknisi. Jika sebelum perbaikan diperlukan persetujuan tindakan atau biaya, kami akan menghubungi Anda melalui WhatsApp ini.',")

old = """  if (normalizedStatus === 'PERSETUJUAN' || normalizedStatus === 'MENUNGGUPERSETUJUAN') {
    const action = String(approval.action || approval.description || 'perbaikan yang diperlukan').trim();
    const estimate = Number(approval.estimate ?? approval.amount ?? 0);
    return [
      `Halo Kak ${customer},`,
      '',
      '🛠️ *PERSETUJUAN PERBAIKAN DIPERLUKAN*',
      `Perangkat: *${service.device_name || '-'}*`,
      `No. Resi: *${service.resi}*`,
      '',
      `Hasil pengecekan: ${action}`,
      estimate > 0 ? `Estimasi biaya: *Rp ${estimate.toLocaleString('id-ID')}*` : 'Estimasi biaya akan diinformasikan oleh tim kami.',
      '',
      'Mohon balas *SETUJU* bila perbaikan dapat kami lanjutkan, atau hubungi kami bila ingin berkonsultasi terlebih dahulu.',
      trackingUrl ? `Lacak status servis: ${trackingUrl}` : '',
      '',
      `Terima kasih,\n*${storeName}*`,
    ].filter(Boolean).join('\n');
  }

  const statusLabel = normalizedStatus === 'DITERIMA'
    ? 'SERVIS DITERIMA'
    : String(status || service.status || 'DIPROSES').replace(/_/g, ' ');
  return [
    `Halo Kak ${customer},`,
    '',
    `📌 *${statusLabel}*`,
    `Perangkat: *${service.device_name || '-'}*`,
    `No. Resi: *${service.resi}*`,
    '',
    normalizedStatus === 'DITERIMA'
      ? `Perangkat Anda sudah kami terima di *${storeName}* dan akan segera dicek oleh tim.`
      : `Status servis Anda di *${storeName}* telah diperbarui.`,
    trackingUrl ? `Lacak progres: ${trackingUrl}` : '',
    '',
    'Terima kasih atas kepercayaan Anda.',
  ].filter(Boolean).join('\n');"""
new = """  if (normalizedStatus === 'PERSETUJUAN') {
    const action = String(approval.action || approval.description || 'tindakan servis yang diperlukan').trim();
    const estimate = Number(approval.estimate ?? approval.amount ?? 0);
    return [
      `Halo Kak ${customer},`,
      '',
      '💬 *MINTA PERSETUJUAN SERVIS*',
      `Perangkat : *${service.device_name || '-'}*`,
      `No. Resi  : *${service.resi}*`,
      '',
      'Teknisi membutuhkan persetujuan Anda sebelum pekerjaan dilanjutkan.',
      `Rencana tindakan: ${action}`,
      estimate > 0 ? `Estimasi biaya: *Rp ${estimate.toLocaleString('id-ID')}*` : 'Estimasi biaya: akan dikonfirmasi oleh tim kami.',
      '',
      'Mohon balas *SETUJU* bila pekerjaan dapat dilanjutkan, atau *TIDAK SETUJU* bila belum berkenan. Jika ingin berkonsultasi, silakan balas pesan ini.',
      trackingUrl ? `Lacak progres servis: ${trackingUrl}` : '',
      '',
      `Terima kasih,\n*${storeName}*`,
    ].filter(Boolean).join('\n');
  }

  const statusCopy = {
    PROSES: {
      title: 'SERVIS DITERIMA',
      body: `Perangkat Anda sudah kami terima di *${storeName}* dan telah masuk antrean pengerjaan.`,
    },
    DIKERJAKAN: {
      title: 'SEDANG DIKERJAKAN',
      body: 'Teknisi sedang mengerjakan perangkat Anda. Jika diperlukan persetujuan tindakan atau biaya tambahan, kami akan menghubungi Anda.',
    },
    MENUNGGU_PART: {
      title: 'MENUNGGU SPAREPART',
      body: 'Pengerjaan sementara menunggu sparepart yang diperlukan. Kami akan melanjutkan servis setelah sparepart tersedia.',
    },
    DIBATALKAN: {
      title: 'SERVIS DIBATALKAN',
      body: 'Proses servis dihentikan/dibatalkan. Silakan hubungi toko jika Anda membutuhkan informasi lebih lanjut.',
    },
  };
  const copy = statusCopy[normalizedStatus] || {
    title: String(normalizedStatus || 'STATUS SERVIS').replace(/_/g, ' '),
    body: `Status servis Anda di *${storeName}* telah diperbarui.`,
  };
  return [
    `Halo Kak ${customer},`,
    '',
    `📌 *${copy.title}*`,
    `Perangkat : *${service.device_name || '-'}*`,
    `No. Resi  : *${service.resi}*`,
    '',
    copy.body,
    trackingUrl ? `Lacak progres: ${trackingUrl}` : '',
    '',
    'Terima kasih atas kepercayaan Anda.',
  ].filter(Boolean).join('\n');"""
replace_once(path, old, new)

# Admin portal
path = "src/pages/AdminDashboard.jsx"
replace_once(path,
    "import { ADMIN_TABS, SERVICE_STATUSES, getStatusInfo, hasFeature, isWithinLimit, getUsagePercent } from '../config/tierLimits';",
    "import { ADMIN_TABS, SERVICE_STATUSES, getStatusInfo, normalizeServiceStatus, hasFeature, isWithinLimit, getUsagePercent } from '../config/tierLimits';")
replace_once(path,
    "  const [showEditServiceNota, setShowEditServiceNota] = useState(false);\n  const [showServiceRegistration, setShowServiceRegistration] = useState(false);",
    "  const [showEditServiceNota, setShowEditServiceNota] = useState(false);\n  const [showApprovalModal, setShowApprovalModal] = useState(false);\n  const [showServiceRegistration, setShowServiceRegistration] = useState(false);")
replace_once(path,
    "    const normalizedStatus = newStatus === 'DI AMBIL' ? 'DIAMBIL' : newStatus;\n    if (normalizedStatus === 'SELESAI') {",
    "    const normalizedStatus = normalizeServiceStatus(newStatus);\n"
    "    if (normalizedStatus === 'PERSETUJUAN') {\n"
    "      setSelectedService({ ...service, status: normalizeServiceStatus(service.status || 'PROSES') });\n"
    "      setShowApprovalModal(true);\n"
    "      return;\n"
    "    }\n"
    "    if (normalizedStatus === 'SELESAI') {")
replace_all(path,
    "const matchStatus = serviceStatusTab === 'ALL' || service.status === serviceStatusTab;",
    "const matchStatus = serviceStatusTab === 'ALL' || normalizeServiceStatus(service.status) === serviceStatusTab;")
replace_all(path,
    "const matchStatus = serviceStatusTab === 'ALL' || s.status === serviceStatusTab;",
    "const matchStatus = serviceStatusTab === 'ALL' || normalizeServiceStatus(s.status) === serviceStatusTab;")
replace_all(path, "value={service.status || 'DITERIMA'}", "value={normalizeServiceStatus(service.status || 'PROSES')}")
replace_all(path, "value={s.status}", "value={normalizeServiceStatus(s.status)}")

admin_modal = """
      {showApprovalModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1110, padding: '1rem' }}>
          <form className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-light)' }} onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const action = String(formData.get('approval_action') || '').trim();
            const estimate = normalizeMoneyInput(formData.get('approval_estimate'));
            if (!action) return alert('Isi tindakan/perbaikan yang perlu disetujui pelanggan.');
            try {
              const updated = await apiService.post('/services/update', {
                resi: selectedService.resi,
                tenant_code: selectedService.tenant_code || tenant.code,
                status: 'PERSETUJUAN',
              });
              const approvalService = { ...selectedService, ...updated, status: 'PERSETUJUAN' };
              setServices((current) => current.map((item) => item.resi === selectedService.resi ? approvalService : item));
              setSelectedService(approvalService);
              if (hasFeature(tenant?.tier, 'whatsappNotif')) {
                const phoneConflict = findEmployeePhoneConflict(approvalService.customer_phone, users);
                if (phoneConflict) {
                  alert(`Status sudah menjadi Minta Persetujuan, tetapi nomor WA pelanggan sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan sebelum mengirim pesan.`);
                  return;
                }
                const notificationResult = await sendWhatsAppNotification({
                  tenant,
                  target: approvalService.customer_phone,
                  message: buildServiceStatusMessage({ tenant, service: approvalService, status: 'PERSETUJUAN', approval: { action, estimate } }),
                  openManual: true,
                });
                if (notificationResult?.status === 'failed') {
                  alert('Status Minta Persetujuan sudah tersimpan, tetapi WhatsApp belum terkirim. Periksa nomor pelanggan atau WhatsApp Gateway lalu coba lagi.');
                  return;
                }
              }
              setShowApprovalModal(false);
              alert(hasFeature(tenant?.tier, 'whatsappNotif') ? 'Status Minta Persetujuan tersimpan dan WhatsApp pelanggan diproses.' : 'Status Minta Persetujuan tersimpan. Hubungi pelanggan untuk meminta persetujuan.');
            } catch (error) {
              alert(`Gagal menyimpan permintaan persetujuan: ${error?.message || 'data tidak dapat disimpan'}`);
            }
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div><h3 style={{ margin: 0 }}>Minta Persetujuan Pelanggan</h3><p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Resi: {selectedService.resi}</p></div>
              <button type="button" className="btn btn-ghost" onClick={() => setShowApprovalModal(false)}><X size={20}/></button>
            </div>
            <label className="label">Tindakan / perbaikan yang perlu disetujui</label>
            <textarea name="approval_action" className="input-field" rows="3" required placeholder="Contoh: Ganti keyboard karena terjadi short pada jalur keyboard" style={{ resize: 'vertical', marginBottom: '10px' }} />
            <label className="label">Estimasi total biaya (Rp)</label>
            <input name="approval_estimate" type="text" inputMode="numeric" className="input-field" placeholder="Contoh: 350.000" onInput={handleMoneyInput} />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Simpan & Kirim WhatsApp</button>
          </form>
        </div>
      )}

"""
replace_once(path, "      {showEditServiceNota && selectedService && (", admin_modal + "      {showEditServiceNota && selectedService && (")
replace_all(path, "status: 'DICEK'", "status: 'DIKERJAKAN'", minimum=1)

# Team portal
path = "src/pages/EmployeePortal.jsx"
replace_once(path,
    "import { SERVICE_STATUSES } from '../config/tierLimits';",
    "import { SERVICE_STATUSES, getStatusInfo, normalizeServiceStatus } from '../config/tierLimits';")
replace_once(path,
    "      const data = await apiService.get(`/services/${code}`);\n      setServices(data);",
    "      const data = await apiService.get(`/services/${code}`);\n      setServices((data || []).map((service) => ({ ...service, status: normalizeServiceStatus(service.status) })));" )
replace_once(path,
    "                            <span className=\"badge badge-info\">{s.status || 'PROSES'}</span>",
    "                            <span className=\"badge badge-info\">{getStatusInfo(s.status)?.label || normalizeServiceStatus(s.status)}</span>")

old = """                          {(s.status === 'PROSES' || s.status === 'MENUNGGU_PART' || s.status === 'DICEK' || s.status === 'DIKERJAKAN') && (
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                              setSelectedService(s);
                              setShowPersetujuanModal(true);
                            }}>
                              <MessageSquare size={14} style={{ marginRight: '5px', display: 'inline' }} /> WA Persetujuan
                            </button>
                          )}"""
new = """                          {normalizeServiceStatus(s.status) === 'PERSETUJUAN' && (
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                              setSelectedService(s);
                              setShowPersetujuanModal(true);
                            }}>
                              <MessageSquare size={14} style={{ marginRight: '5px', display: 'inline' }} /> Kirim Ulang WA
                            </button>
                          )}"""
replace_once(path, old, new)
replace_once(path, "                              value={s.status || 'PROSES'}", "                              value={normalizeServiceStatus(s.status || 'PROSES')}")
replace_once(path,
    "                                const newStatus = e.target.value;\n                                if (newStatus === 'SELESAI') {",
    "                                const newStatus = normalizeServiceStatus(e.target.value);\n"
    "                                if (newStatus === 'PERSETUJUAN') {\n"
    "                                  setSelectedService(s);\n"
    "                                  setShowPersetujuanModal(true);\n"
    "                                  return;\n"
    "                                }\n"
    "                                if (newStatus === 'SELESAI') {")

old = """              const partName = e.target.part.value;
              const estPrice = e.target.price.value;
              const waText = buildServiceStatusMessage({
                tenant,
                service: selectedService,
                status: 'PERSETUJUAN',
                approval: { action: partName, estimate: normalizeMoneyInput(estPrice) },
              });
              const result = await sendWhatsAppNotification({ tenant, target: selectedService.customer_phone, message: waText, openManual: true });
              if (result.status === 'failed') {
                alert('Pesan persetujuan belum terkirim. Periksa nomor pelanggan dan WhatsApp Gateway.');
                return;
              }
              setShowPersetujuanModal(false);"""
new = """              const partName = String(e.target.part.value || '').trim();
              const estPrice = normalizeMoneyInput(e.target.price.value);
              if (!partName) return alert('Isi tindakan/perbaikan yang perlu disetujui pelanggan.');
              try {
                const tenantCode = employee.tenant_code || tenant.code;
                const updated = await apiService.post(`/services/${selectedService.resi}/status`, { status: 'PERSETUJUAN', tenant_code: tenantCode });
                const approvalService = { ...selectedService, ...updated, status: 'PERSETUJUAN' };
                setServices((current) => current.map((item) => item.resi === selectedService.resi ? approvalService : item));
                setSelectedService(approvalService);
                const phoneConflict = findEmployeePhoneConflict(approvalService.customer_phone, users);
                if (phoneConflict) {
                  alert(`Status sudah menjadi Minta Persetujuan, tetapi nomor WA pelanggan sama dengan nomor karyawan ${phoneConflict.name}. Perbaiki nomor pelanggan sebelum mengirim pesan.`);
                  setShowPersetujuanModal(false);
                  return;
                }
                const waText = buildServiceStatusMessage({ tenant, service: approvalService, status: 'PERSETUJUAN', approval: { action: partName, estimate: estPrice } });
                const result = await sendWhatsAppNotification({ tenant, target: approvalService.customer_phone, message: waText, openManual: true });
                if (result.status === 'failed') {
                  alert('Status Minta Persetujuan sudah tersimpan, tetapi pesan WhatsApp belum terkirim. Periksa nomor pelanggan atau WhatsApp Gateway lalu gunakan Kirim Ulang WA.');
                  setShowPersetujuanModal(false);
                  return;
                }
                setShowPersetujuanModal(false);
                alert('Status Minta Persetujuan tersimpan dan WhatsApp pelanggan diproses.');
                fetchServices();
              } catch (error) {
                alert(`Gagal meminta persetujuan: ${error?.message || 'data tidak dapat disimpan'}`);
              }"""
replace_once(path, old, new)
replace_once(path,
    "              <button type=\"submit\" className=\"btn btn-primary\" style={{ width: '100%' }}>Buka WhatsApp</button>",
    "              <button type=\"submit\" className=\"btn btn-primary\" style={{ width: '100%' }}>Simpan & Buka WhatsApp</button>")

# Customer tracking follows the same flow
path = "src/pages/PublicTracking.jsx"
replace_once(path,
    "import { SERVICE_STATUSES, getStatusInfo } from '../config/tierLimits';",
    "import { SERVICE_STATUSES, getStatusInfo, normalizeServiceStatus } from '../config/tierLimits';")
old = """  // Get status index for timeline
  const getStatusIndex = (status) => {
    // Map legacy statuses
    const statusMap = {
      'DITERIMA': 0, 'DICEK': 1, 'SEDANG_DICEK': 1,
      'DIKERJAKAN': 2, 'SEDANG_DIKERJAKAN': 2,
      'MENUNGGU_PART': 3, 'MENUNGGU PART': 3,
      'SELESAI': 4, 'DIAMBIL': 5, 'DI AMBIL': 5, 'DI_AMBIL': 5,
      'DIBATALKAN': 6, 'BATAL': 6,
    };
    return statusMap[status] ?? 0;
  };

  const currentStatusIdx = result ? getStatusIndex(result.status) : -1;
  const isCancelled = result && (result.status === 'DIBATALKAN' || result.status === 'BATAL');
  const isCompleted = result && (result.status === 'SELESAI' || result.status === 'DIAMBIL' || result.status === 'DI AMBIL' || result.status === 'DI_AMBIL');"""
new = """  // Timeline selalu mengikuti konfigurasi status pusat agar Admin, Portal Tim, dan pelanggan sinkron.
  const getStatusIndex = (status) => {
    const normalized = normalizeServiceStatus(status);
    const flow = SERVICE_STATUSES.filter((item) => item.id !== 'DIBATALKAN');
    const index = flow.findIndex((item) => item.id === normalized);
    return index >= 0 ? index : 0;
  };

  const normalizedResultStatus = result ? normalizeServiceStatus(result.status) : '';
  const currentStatusIdx = result ? getStatusIndex(normalizedResultStatus) : -1;
  const isCancelled = normalizedResultStatus === 'DIBATALKAN';
  const isCompleted = ['SELESAI', 'DIAMBIL'].includes(normalizedResultStatus);"""
replace_once(path, old, new)

print("Service flow patch applied successfully")
