import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LogIn, CheckCircle, Clock, LogOut, Wallet, Plus, MessageSquare, Printer, X, ShoppingCart, Wrench, ChevronLeft, ChevronRight, ArrowRightLeft, Search, KeyRound, Settings, ScanLine, UserRound, Download, Languages, Store as StoreIcon, PackageSearch } from 'lucide-react';
import { apiService } from '../services/api';
import { buildManualWhatsAppUrl, sendWhatsAppNotification } from '../services/notificationService';
import POSView from '../components/POSView';
import MobileTabBar from '../components/MobileTabBar';
import UnitProLogo from '../components/UnitProLogo';
import IssueChips from '../components/IssueChips';
import EmployeeFinanceInsights from '../components/EmployeeFinanceInsights';
import AndroidUpdateModal from '../components/AndroidUpdateModal';
import BarcodeScanner from '../components/BarcodeScanner';
import { APP_VERSION, APK_PUBLIC_URL } from '../config/appInfo';
import { SERVICE_STATUSES } from '../config/tierLimits';
import { buildKasbonDescription, isPaidServiceStatus, normalizeKasbonAmount, parseKasbonDescription } from '../utils/financeUtils';
import { normalizeWhatsAppNumber, findEmployeePhoneConflict, customerPhoneConflictMessage } from '../utils/phoneUtils';
import { isServiceItem } from '../utils/productCategory';
import { getAppLanguage, setAppLanguage, t } from '../utils/i18n';
import { fetchAppVersionInfo, isNewerVersion } from '../utils/versionUtils';

export default function EmployeePortal() {
  const { tenant, employee, setEmployee, setTenant } = useStore();
  const navigate = useNavigate();
  
  const [tenantCode, setTenantCode] = useState(tenant?.code || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [recentEmployeeLogin, setRecentEmployeeLogin] = useState(null);
  
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [activeTab, setActiveTab] = useState('beranda');
  const [kasirTab, setKasirTab] = useState('beranda');
  const [cashierServiceSearch, setCashierServiceSearch] = useState('');
  const [showTeamScanner, setShowTeamScanner] = useState(false);
  const [teamScanResult, setTeamScanResult] = useState('');
  const [currentLang, setCurrentLang] = useState(getAppLanguage());
  const [availableUpdateInfo, setAvailableUpdateInfo] = useState(null);
  const [latestVersionInfo, setLatestVersionInfo] = useState(null);

  // Modals
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [showPersetujuanModal, setShowPersetujuanModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditServiceNota, setShowEditServiceNota] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Change PIN modal state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [empCurrentPin, setEmpCurrentPin] = useState('');
  const [empNewPin, setEmpNewPin] = useState('');
  const [empConfirmPin, setEmpConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const handleChangeEmployeePin = async (e) => {
    e.preventDefault();
    if (!empNewPin || empNewPin.trim().length < 4) {
      alert('PIN Baru minimal 4 digit.');
      return;
    }
    if (empNewPin !== empConfirmPin) {
      alert('Konfirmasi PIN baru tidak cocok.');
      return;
    }
    if (String(empCurrentPin) !== String(employee?.pin)) {
      alert('PIN Saat Ini tidak sesuai.');
      return;
    }
    setIsChangingPin(true);
    try {
      await apiService.updateUser(employee.id, { pin: empNewPin.trim() });
      setEmployee({ ...employee, pin: empNewPin.trim() });
      localStorage.setItem('EMPLOYEE_PIN', empNewPin.trim());
      setShowChangePinModal(false);
      setEmpCurrentPin('');
      setEmpNewPin('');
      setEmpConfirmPin('');
      alert('🔑 PIN Anda berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui PIN: ' + (err?.message || 'kesalahan jaringan'));
    } finally {
      setIsChangingPin(false);
    }
  };
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBonModal, setShowBonModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferService, setTransferService] = useState(null);
  const [transferTechnicianId, setTransferTechnicianId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [serviceWizardStep, setServiceWizardStep] = useState(1);
  const [serviceWizardError, setServiceWizardError] = useState('');
  const [serviceForm, setServiceForm] = useState({
    name: '', phone: '', device: '', kelengkapan: '', issue: '', technician_id: ''
  });
  const [selectedService, setSelectedService] = useState(null);
  const [printType, setPrintType] = useState('pendaftaran');
  const printIframeRef = useRef(null);

  const technicianUsers = users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi');
  const isJasaProduct = isServiceItem;
  const sparepartCatalog = products.filter(p => !isJasaProduct(p));
  const jasaCatalog = products.filter(p => isJasaProduct(p));
  const settings = tenant?.settings || {};
  const paymentInfoText = (() => {
    const bankName = settings.bank_name || '';
    const bankAccount = settings.bank_account || '';
    const bankHolder = settings.bank_holder || '';
    if (bankName || bankAccount || bankHolder) {
      const bankLine = [bankName, bankAccount].filter(Boolean).join(' ').trim();
      return bankHolder ? `${bankLine}${bankLine ? ' ' : ''}a/n ${bankHolder}`.trim() : bankLine;
    }
    return settings.store_bank || '';
  })();
  const qrisImageUrl = settings.qrisUrl || settings.qris_image_url || '';

  const normalizePhone = (phone) => {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('62')) return cleaned;
    if (cleaned.startsWith('0')) return cleaned.replace(/^0/, '62');
    if (cleaned.startsWith('8')) return `62${cleaned}`;
    return cleaned;
  };

  const syncCatalogSelection = (productId, nameFieldId, feeFieldId) => {
    const product = products.find(p => String(p.id) === String(productId));
    const nameInput = document.getElementById(nameFieldId);
    const feeInput = document.getElementById(feeFieldId);
    if (!nameInput || !feeInput) return;

    if (product) {
      nameInput.value = product.name || '';
      feeInput.value = String(product.price || 0);
    } else {
      nameInput.value = '';
      feeInput.value = '0';
    }
  };

    const normalizeMoneyInput = (value) => {
    const parsed = parseInt(String(value || '').replace(/[^\d-]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const formatMoneyInput = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleMoneyInput = (event) => {
    event.currentTarget.value = formatMoneyInput(event.currentTarget.value);
  };


  const getServiceDiscount = (issue = '') => {
    const match = issue.match(/\[Diskon: Rp (.*?)\]/);
    if (!match) return 0;
    return normalizeMoneyInput(match[1]);
  };

  const buildIssueWithDiscount = (issue = '', discount = 0) => {
    const cleanIssue = issue.replace(/\n?\[Diskon: Rp .*?\]/g, '').trim();
    return discount > 0 ? `${cleanIssue}\n[Diskon: Rp ${discount}]`.trim() : cleanIssue;
  };

  const handleServiceNotaEdit = async (event) => {
    event.preventDefault();
    if (!selectedService) return;

    const fd = new FormData(event.currentTarget);
    const note = String(fd.get('note') || '').trim();
    const partFee = normalizeMoneyInput(fd.get('part_fee'));
    const jasaFee = normalizeMoneyInput(fd.get('jasa_fee'));
    const discount = normalizeMoneyInput(fd.get('discount'));

    if (partFee < 0 || jasaFee < 0 || discount < 0) {
      alert('Nominal tidak boleh negatif.');
      return;
    }
    if (discount > partFee + jasaFee) {
      alert('Diskon tidak boleh lebih besar dari total biaya.');
      return;
    }

    const updatedIssue = buildIssueWithDiscount(note || selectedService.issue || '', discount);
    try {
      const updatedService = await apiService.post('/services/update', {
        resi: selectedService.resi,
        tenant_code: selectedService.tenant_code || tenant?.code || employee?.tenant_code,
        part_fee: partFee,
        jasa_fee: jasaFee,
        issue: updatedIssue
      });
      const nextService = { ...selectedService, ...updatedService, part_fee: partFee, jasa_fee: jasaFee, issue: updatedIssue };
      setSelectedService(nextService);
      setServices(services.map(s => s.resi === selectedService.resi ? { ...s, ...nextService } : s));
      setShowEditServiceNota(false);
      alert('Nota servis berhasil dikoreksi.');
    } catch (err) {
      alert('Gagal menyimpan koreksi nota.');
    }
  };

  const openServiceWizard = () => {
    setServiceForm({ name: '', phone: '', device: '', kelengkapan: '', issue: '', technician_id: '' });
    setServiceWizardStep(1);
    setServiceWizardError('');
    setShowServiceModal(true);
  };

  const closeServiceWizard = () => {
    setShowServiceModal(false);
    setServiceWizardError('');
  };

  const updateServiceForm = (field, value) => {
    setServiceForm((current) => ({ ...current, [field]: value }));
    setServiceWizardError('');
  };

  const moveServiceWizard = (direction) => {
    const requiredFields = {
      1: ['name', 'phone'],
      2: ['device', 'kelengkapan'],
      3: ['issue'],
      4: ['technician_id'],
    };
    const missing = (requiredFields[serviceWizardStep] || []).some((field) => !String(serviceForm[field] || '').trim());
    if (direction > 0 && missing) {
      setServiceWizardError('Lengkapi data pada langkah ini sebelum melanjutkan.');
      return;
    }
    if (direction > 0 && serviceWizardStep === 1 && !/^(?:\+?62|0)8\d{7,12}$/.test(serviceForm.phone.trim())) {
      setServiceWizardError('Masukkan nomor WhatsApp yang valid, misalnya 0812xxxxxxx.');
      return;
    }
    setServiceWizardStep((step) => Math.min(4, Math.max(1, step + direction)));
  };

  const openTransferModal = (service) => {
    setTransferService(service);
    setTransferTechnicianId('');
    setTransferReason('');
    setTransferError('');
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferService(null);
    setTransferError('');
  };

  const handleTransferService = async (event) => {
    event.preventDefault();
    if (!transferService || !transferTechnicianId) {
      setTransferError('Pilih teknisi pengganti terlebih dahulu.');
      return;
    }

    const replacement = technicianUsers.find((user) => String(user.id) === String(transferTechnicianId));
    if (!replacement) {
      setTransferError('Teknisi pengganti tidak ditemukan.');
      return;
    }

    setTransferLoading(true);
    try {
      const reason = transferReason.trim();
      const previousTechnician = employee?.name || 'Teknisi sebelumnya';
      const transferNote = `[Tugas dialihkan dari ${previousTechnician} ke ${replacement.name}${reason ? `: ${reason}` : ''}]`;
      const updatedIssue = `${transferService.issue || ''}\n${transferNote}`.trim();

      await apiService.post('/services/update', { resi: transferService.resi, tenant_code: employee.tenant_code || tenant.code, technician_id: replacement.id, issue: updatedIssue });

      if (replacement.phone) {
        const message = `Halo ${replacement.name}, tugas servis dialihkan ke Anda.\n\n*Resi:* ${transferService.resi}\n*Pelanggan:* ${transferService.customer_name}\n*Perangkat:* ${transferService.device_name}\n*Keluhan:* ${transferService.issue}${reason ? `\n*Catatan:* ${reason}` : ''}\n\nSilakan cek di portal karyawan.`;
        sendWhatsAppNotification({
          tenant,
          target: replacement.phone,
          message,
          openManual: false,
        }).then((result) => {
          if (result.status === 'failed') console.error('Gagal mengirim WA teknisi:', result.error);
        });
      }

      closeTransferModal();
      fetchServices();
      alert(`Tugas ${transferService.resi} berhasil dialihkan ke ${replacement.name}.`);
    } catch (error) {
      setTransferError(error.message || 'Gagal mengalihkan tugas servis.');
    } finally {
      setTransferLoading(false);
    }
  };

  useEffect(() => {
    try {
      const savedLogin = JSON.parse(localStorage.getItem('UNITPRO_LAST_EMPLOYEE_LOGIN') || 'null');
      if (savedLogin) {
        setRecentEmployeeLogin(savedLogin);
        if (!tenant?.code && savedLogin.tenantCode) setTenantCode(savedLogin.tenantCode);
      }
    } catch (e) {}
  }, [tenant?.code]);

  useEffect(() => {
    fetchAppVersionInfo()
      .then((data) => {
        setLatestVersionInfo(data);
        if (data?.version && isNewerVersion(data.version, APP_VERSION)) {
          setAvailableUpdateInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (employee) {
      fetchServices();
      fetchTransactions();
      const code = tenant?.code || employee.tenant_code;
      if (code) {
        apiService.getProducts(code).then(setProducts);
      }
    }
    if (employee) {
      const code = tenant?.code || employee.tenant_code;
      if (code) {
        apiService.getUsers(code).then(setUsers);
      }
    }
  }, [employee, tenant?.code]);

  const fetchServices = async () => {
    try {
      const code = tenant?.code || employee?.tenant_code;
      if (!code) return;
      const data = await apiService.get(`/services/${code}`);
      setServices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const code = tenant?.code || employee?.tenant_code;
      if (!code) return;
      const data = await apiService.get(`/transactions/${code}`);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!tenantCode) {
      setError('Kode Toko wajib diisi');
      return;
    }
    try {
      const code = tenantCode.toUpperCase();
      const data = await apiService.loginEmployee(code, pin);
      const empData = { ...data.user, token: data.token };
      setEmployee(empData);
      const loginMemory = {
        tenantCode: code,
        tenantName: tenant?.settings?.storeName || tenant?.name || empData.tenant_name || code,
        employeeName: empData.name || '',
        role: empData.role || '',
        savedAt: Date.now(),
      };
      localStorage.setItem('UNITPRO_LAST_EMPLOYEE_LOGIN', JSON.stringify(loginMemory));
      localStorage.setItem('EMPLOYEE_NAME', empData.name || '');
      setRecentEmployeeLogin(loginMemory);
      
      if (!tenant?.code || tenant.code !== code) {
        setTenant(code, empData.tenant_code || code, '', 'free', data.token);
      }
    } catch (e) {
      setError(e.message || 'PIN Salah atau terjadi kesalahan');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const customerPhone = String(fd.get('phone') || '').trim();
    if (!/^(?:\+?62|0)8\d{7,12}$/.test(customerPhone)) {
      setServiceWizardStep(1);
      setServiceWizardError('Masukkan nomor WhatsApp yang valid, misalnya 0812xxxxxxx.');
      return;
    }
    const normalizedCustomerPhone = normalizeWhatsAppNumber(customerPhone);
    const phoneConflict = findEmployeePhoneConflict(normalizedCustomerPhone, users);
    if (phoneConflict) {
      const shouldContinue = window.confirm(`${customerPhoneConflictMessage(phoneConflict.name)}

Klik OK hanya jika Anda yakin nomor ini memang nomor pelanggan.`);
      if (!shouldContinue) {
        setServiceWizardStep(1);
        setServiceWizardError('Periksa kembali nomor WhatsApp pelanggan sebelum melanjutkan.');
        return;
      }
    }
    const kelengkapan = fd.get('kelengkapan') || '-';
    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;
    const resiGenerated = 'TRX-' + Date.now();
    const technician_id = fd.get('technician_id') || employee.id;
    const serviceData = {
      tenant_code: employee.tenant_code || tenant.code,
      resi: resiGenerated,
      customer_name: fd.get('name'),
      customer_phone: normalizedCustomerPhone,
      device_name: fd.get('device'),
      issue: issueText,
      technician_id: technician_id,
      status: 'PROSES'
    };
    try {
      await apiService.post('/services', serviceData);

      const trackingLink = `${window.location.origin}/tracking?resi=${resiGenerated}`;
      const waText = `Halo ${serviceData.customer_name}, perangkat ${serviceData.device_name} Anda sudah kami terima untuk diperbaiki.\n\n*Nomor Resi:* ${resiGenerated}\n*Keluhan:* ${fd.get('issue')}\n*Kelengkapan:* ${kelengkapan}\n\nAnda dapat mengecek status servis secara berkala melalui link berikut:\n${trackingLink}\n\nTerima kasih!`;
      const waUrl = buildManualWhatsAppUrl(serviceData.customer_phone, waText);
      
      if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Kirim resi ke WhatsApp?', message: `Servis berhasil ditambahkan.\nResi: ${resiGenerated}\n\nKirim info resi ke WhatsApp pelanggan sekarang?`, confirmText: 'Kirim WA', tone: 'success' }) : Promise.resolve(window.confirm(`Servis berhasil ditambahkan (Resi: ${resiGenerated}).\n\nKlik OK untuk mengirim info resi ini ke WhatsApp pelanggan.`)))) {
        window.open(waUrl, '_blank');
      }

      if (await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Cetak nota pendaftaran?', message: 'Nota pendaftaran siap dicetak untuk pelanggan.', confirmText: 'Cetak Nota', tone: 'info' }) : Promise.resolve(window.confirm(`Ingin mencetak Nota Pendaftaran untuk pelanggan?`)))) {
        setSelectedService(serviceData);
        setPrintType('pendaftaran');
        setShowPrintModal(true);
      }
      
      // Kirim WA Notifikasi ke Teknisi
      if (technician_id) {
        const tech = technicianUsers.find(u => String(u.id) === String(technician_id));
        if (tech && tech.phone) {
          const techWaText = `Halo ${tech.name}, ada tugas servis baru:\n\n*Resi:* ${resiGenerated}\n*Pelanggan:* ${serviceData.customer_name}\n*Perangkat:* ${serviceData.device_name}\n*Keluhan:* ${fd.get('issue')}\n\nSilakan cek di portal karyawan.`;
          sendWhatsAppNotification({
            tenant,
            target: tech.phone,
            message: techWaText,
            openManual: false,
          }).then((result) => {
            if (result.status === 'failed') console.error('Gagal mengirim WA tugas teknisi:', result.error);
          });
        }
      }

      e.target.reset();
      setShowServiceModal(false);
      fetchServices();
    } catch (err) {
      alert('Gagal tambah tugas');
    }
  };

  const handleBon = async (event) => {
    event.preventDefault();
    const amount = normalizeKasbonAmount(new FormData(event.currentTarget).get('amount'), 'BON_PENDING');
    if (!Number.isInteger(amount) || amount <= 0) return alert('Masukkan nominal kasbon yang valid.');
    
    try {
      await apiService.post('/transactions', {
        tenant_code: employee.tenant_code || tenant.code,
        type: 'BON_PENDING',
        amount: amount,
        description: buildKasbonDescription(employee)
      });
      alert('Kasbon berhasil dicatat!');
      setShowBonModal(false);
      fetchTransactions();
    } catch (e) {
      alert('Gagal mencatat kasbon');
    }
  };

  const doPrint = (printerType) => {
    if (!selectedService) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    
    let htmlContent = '';
    const dateStr = new Date().toLocaleString('id-ID');
    
    const css = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: ${printerType === 'thermal' ? '0' : '20px'}; }
        .receipt-container { max-width: ${printerType === 'thermal' ? '300px' : '800px'}; margin: 0 auto; background: #fff; border: ${printerType === 'thermal' ? 'none' : '1px solid #e2e8f0'}; padding: ${printerType === 'thermal' ? '10px' : '40px'}; border-radius: 12px; box-shadow: ${printerType === 'thermal' ? 'none' : '0 10px 25px rgba(0,0,0,0.05)'}; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h2 { margin: 0; color: #0f172a; font-size: ${printerType === 'thermal' ? '1.4rem' : '2rem'}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: ${printerType === 'thermal' ? '0.8rem' : '1rem'}; font-weight: 600; letter-spacing: 2px; }
        .divider { border-top: 2px dashed #cbd5e1; margin: 15px 0; }
        .info-grid { display: flex; flex-direction: column; gap: 8px; font-size: ${printerType === 'thermal' ? '0.85rem' : '0.95rem'}; margin-bottom: 20px; }
        .info-item { margin: 0; display: flex; justify-content: space-between; }
        .info-item strong { color: #64748b; font-weight: 600; }
        .info-item span { color: #0f172a; font-weight: 500; text-align: right; max-width: 60%; }
        .issue-box { background: #f8fafc; padding: 12px; border-radius: 8px; font-size: ${printerType === 'thermal' ? '0.85rem' : '0.95rem'}; color: #334155; margin-bottom: 20px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: ${printerType === 'thermal' ? '0.85rem' : '0.95rem'}; }
        .table th { border-bottom: 2px solid #cbd5e1; padding: 8px 0; text-align: left; color: #64748b; font-weight: 600; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: ${printerType === 'thermal' ? '1rem' : '1.2rem'}; color: #0f172a; border-bottom: none; padding-top: 15px; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.85rem; color: #94a3b8; }
        .bank-info { background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; font-size: 0.85rem; margin: 20px 0; border: 1px solid #e2e8f0; color: #475569; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-container { border: none; padding: ${printerType === 'thermal' ? '0' : '10px'}; box-shadow: none; } }
      </style>
    `;
    
    if (printType === 'pendaftaran') {
      htmlContent = `
        <div class="receipt-container">
          <div class="header">
            <h2>${tenant?.name || 'Toko Servis'}</h2>
            <p>NOTA PENDAFTARAN SERVIS</p>
          </div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-item"><strong>No. Resi</strong> <span>${selectedService.resi}</span></div>
            <div class="info-item"><strong>Tanggal</strong> <span>${dateStr}</span></div>
            <div class="info-item"><strong>Pelanggan</strong> <span>${selectedService.customer_name}</span></div>
            <div class="info-item"><strong>No. HP</strong> <span>${selectedService.customer_phone}</span></div>
            <div class="info-item"><strong>Perangkat</strong> <span>${selectedService.device_name}</span></div>
          </div>
          <div><strong style="color: #64748b; font-size: 0.9rem;">Keluhan & Kelengkapan:</strong></div>
          <div class="issue-box">${selectedService.issue}</div>
          
          ${paymentInfoText ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${paymentInfoText.replace(/\n/g, '<br/>')}</div>` : ''}
          ${qrisImageUrl ? `<div class="bank-info"><strong>QRIS PEMBAYARAN:</strong><br/><img src="${qrisImageUrl}" alt="QRIS Pembayaran" style="width:110px;height:110px;object-fit:contain;margin-top:8px;" /><div style="margin-top:6px;">Scan QRIS untuk pembayaran</div></div>` : ''}
          
          <div class="divider"></div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 600;">Simpan struk ini sebagai bukti pengambilan.</p>
            <p style="margin: 0;">Cek status servis Anda secara online dengan Nomor Resi di atas.</p>
          </div>
        </div>
      `;
    } else {
      const discountMatch = (selectedService.issue || '').match(/\[Diskon: Rp (.*?)\]/);
      const discountStr = discountMatch ? discountMatch[1].replace(/\./g, '') : '0';
      const discount = parseInt(discountStr) || 0;
      
      const subtotal = (selectedService.part_fee || 0) + (selectedService.jasa_fee || 0);
      const total = subtotal - discount;
      
      htmlContent = `
        <div class="receipt-container">
          <div class="header">
            <h2>${tenant?.name || 'Toko Servis'}</h2>
            <p>NOTA PELUNASAN SERVIS</p>
          </div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-item"><strong>No. Resi</strong> <span>${selectedService.resi}</span></div>
            <div class="info-item"><strong>Tanggal</strong> <span>${dateStr}</span></div>
            <div class="info-item"><strong>Pelanggan</strong> <span>${selectedService.customer_name}</span></div>
            <div class="info-item"><strong>Perangkat</strong> <span>${selectedService.device_name}</span></div>
          </div>
          
          <div><strong style="color: #64748b; font-size: 0.9rem;">Rincian Perbaikan:</strong></div>
          <div class="issue-box">${(selectedService.issue || '').replace(/\n\[Diskon: .*?\]/, '')}</div>
          
          <table class="table">
            <thead>
              <tr><th>Keterangan</th><th class="text-right">Biaya (Rp)</th></tr>
            </thead>
            <tbody>
              <tr><td>Biaya Sparepart</td><td class="text-right">${selectedService.part_fee?.toLocaleString('id-ID') || 0}</td></tr>
              <tr><td>Biaya Jasa Servis</td><td class="text-right">${selectedService.jasa_fee?.toLocaleString('id-ID') || 0}</td></tr>
              ${discount > 0 ? `
              <tr><td>Subtotal</td><td class="text-right">${subtotal.toLocaleString('id-ID')}</td></tr>
              <tr><td style="color: #ef4444; font-weight: 600;">Diskon Khusus</td><td class="text-right" style="color: #ef4444; font-weight: 600;">- ${discount.toLocaleString('id-ID')}</td></tr>
              ` : ''}
              <tr class="total-row"><td>TOTAL LUNAS</td><td class="text-right">${total.toLocaleString('id-ID')}</td></tr>
            </tbody>
          </table>
          
          ${paymentInfoText ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${paymentInfoText.replace(/\n/g, '<br/>')}</div>` : ''}
          ${qrisImageUrl ? `<div class="bank-info"><strong>QRIS PEMBAYARAN:</strong><br/><img src="${qrisImageUrl}" alt="QRIS Pembayaran" style="width:110px;height:110px;object-fit:contain;margin-top:8px;" /><div style="margin-top:6px;">Scan QRIS untuk pembayaran</div></div>` : ''}
          
          <div class="divider"></div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 600;">Terima kasih atas kepercayaan Anda!</p>
            <p style="margin: 0;">Barang yang sudah diambil tidak dapat dikembalikan / ditukar.</p>
          </div>
        </div>
      `;
    }
    
    doc.write(`<html><head><title>Print Nota</title>${css}</head><body onload="window.print(); window.close();">${htmlContent}</body></html>`);
    doc.close();
    setShowPrintModal(false);
  };

  const doPrintBarcode = () => {
    if (!selectedService) return;
    const barcodeMarkup = document.getElementById('cashier-service-barcode')?.innerHTML || '';
    if (!barcodeMarkup) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    const storeName = settings.storeName || tenant?.name || 'Toko Servis';
    doc.open();
    doc.write(`<!doctype html><html><head><title>Stiker ${selectedService.resi}</title><style>body{margin:0;padding:12px;font-family:Arial,sans-serif;color:#0f172a}.sticker{width:280px;text-align:center}.sticker h3{margin:0 0 4px;font-size:15px}.sticker p{margin:3px 0;font-size:11px}.barcode{margin:10px 0 5px}.resi{font-weight:800;letter-spacing:.04em}@media print{body{padding:0}}</style></head><body onload="window.print();window.close()"><div class="sticker"><h3>${storeName}</h3><p>TANDA TERIMA SERVIS</p><div class="barcode">${barcodeMarkup}</div><p class="resi">${selectedService.resi}</p><p>${selectedService.customer_name || '-'} · ${selectedService.device_name || '-'}</p></div></body></html>`);
    doc.close();
    setShowBarcodeModal(false);
  };

  if (!employee) {
    return (
      <div className="login-container native-employee-login animate-fade-in" style={{ padding: '2rem' }}>
        <div className="glass-panel native-employee-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <UnitProLogo variant="logo" height={46} style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.35rem' }}>Portal Tim</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Masuk dengan PIN yang diberikan admin</p>
          {tenant?.name && <small style={{ display: 'block', marginTop: '6px', color: '#94a3b8', fontWeight: '700' }}>{tenant.name}</small>}
          {recentEmployeeLogin && (
            <button
              type="button"
              className="employee-last-login"
              onClick={() => {
                if (recentEmployeeLogin.tenantCode) setTenantCode(recentEmployeeLogin.tenantCode);
              }}
            >
              <span>Terakhir masuk</span>
              <strong>{recentEmployeeLogin.employeeName || 'Tim'} - {recentEmployeeLogin.tenantName || recentEmployeeLogin.tenantCode}</strong>
            </button>
          )}
          {error && <div style={{ color: 'white', background: 'var(--danger)', padding: '10px', borderRadius: '8px', marginTop: '1rem' }}>{error}</div>}
          <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
            {!tenant?.code && (
              <input 
                type="text" 
                className="input-field" 
                placeholder="Masukkan Kode Toko" 
                value={tenantCode}
                onChange={(e) => { setTenantCode(e.target.value.toUpperCase()); setError(''); }}
                style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '1rem', letterSpacing: '0.1rem' }}
                required
              />
            )}
            {tenant?.code === 'DEMO-STORE' && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Mode Demo Tim Aktif
              </div>
            )}
            <input 
              type="password" 
              className="input-field" 
              placeholder="PIN Tim" 
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <LogIn size={18} /> Masuk
            </button>
            
            {tenant?.code === 'DEMO-STORE' && (
              <button 
                type="button"
                className="btn btn-danger" 
                style={{ width: '100%', marginTop: '0.8rem', background: '#dc2626', color: 'white' }} 
                onClick={() => {
                  useStore.getState().clearTenant();
                  setTenantCode('');
                }}
              >
                Keluar dari Mode Demo
              </button>
            )}
          </form>

          <button className="btn btn-ghost" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/')}>
            Kembali ke UnitPro
          </button>
        </div>
      </div>
    );
  }

  // calculations for finances
  const myCommissionRate = tenant?.settings?.employee_commissions?.[employee.id] || 0;
  const mySalary = tenant?.settings?.employee_salaries?.[employee.id] || 0;
  const myCompletedServices = services.filter(s => isPaidServiceStatus(s.status) && String(s.technician_id) === String(employee.id));
  const totalJasaFee = myCompletedServices.reduce((sum, s) => sum + Number(s.jasa_fee || 0), 0);
  const totalKomisi = Math.floor(totalJasaFee * (myCommissionRate / 100));

  const myBonTransactions = transactions.filter((t) => {
    if (t.type !== 'BON_KARYAWAN') return false;
    return String(parseKasbonDescription(t.description).employeeId) === String(employee.id);
  });
  const totalBon = myBonTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const sisaBersih = mySalary + totalKomisi - totalBon;

  const isKasir = employee.role === 'Kasir' || employee.role === 'KASIR';
  const myServices = services.filter(s => String(s.technician_id) === String(employee.id));
  const activeMyServices = myServices.filter(s => !isPaidServiceStatus(s.status));
  const finishedToday = myServices.filter(s => isPaidServiceStatus(s.status) && new Date(s.updated_at || s.created_at || Date.now()).toDateString() === new Date().toDateString());
  const todayPosTransactions = transactions.filter(t => t.type === 'POS_SALES' && new Date(t.created_at).toDateString() === new Date().toDateString());
  const todayPosTotal = todayPosTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const cashierServices = services.filter((service) => {
    const technician = technicianUsers.find((user) => String(user.id) === String(service.technician_id));
    const searchText = [service.resi, service.customer_name, service.device_name, technician?.name, service.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchText.includes(cashierServiceSearch.trim().toLowerCase());
  });

  const todayDateStr = new Date().toDateString();
  const myAttendanceToday = transactions.filter(t => t.description === `ATTENDANCE_EMP_${employee.id}` && new Date(t.created_at).toDateString() === todayDateStr);
  const hasCheckedIn = myAttendanceToday.some(t => t.type === 'ATTENDANCE_IN');
  const hasCheckedOut = myAttendanceToday.some(t => t.type === 'ATTENDANCE_OUT');
  const handleTeamScan = (decodedText) => {
    const value = String(decodedText || '').trim();
    setTeamScanResult(value);
    if (!value) return;

    const matchedService = services.find((service) => String(service.resi || '').toLowerCase() === value.toLowerCase());
    if (matchedService) {
      setSelectedService(matchedService);
      if (isKasir) {
        setKasirTab('servis');
        setCashierServiceSearch(matchedService.resi);
      } else {
        setActiveTab('tugas');
      }
      setShowTeamScanner(false);
      return;
    }

    if (isKasir) {
      const matchedProduct = products.find((product) => {
        const haystack = [product.id, product.code, product.barcode, product.name].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(value.toLowerCase());
      });
      if (matchedProduct) {
        setKasirTab('pos');
        setShowTeamScanner(false);
        alert(`Produk ditemukan: ${matchedProduct.name}. Buka tab Kasir untuk memasukkan ke keranjang.`);
        return;
      }
    }

    alert(`Kode tidak ditemukan: ${value}`);
  };

  const openEmployeeUpdate = () => {
    const targetUrl = latestVersionInfo?.apkUrl || APK_PUBLIC_URL;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const employeeMobileTabs = isKasir
    ? [
        { id: 'beranda', name: 'Beranda', icon: UserRound },
        { id: 'pos', name: 'Kasir', icon: ShoppingCart },
        { id: 'servis', name: 'Alur Servis', icon: Wrench },
        { id: 'scan', name: 'Scan', icon: ScanLine },
        { id: 'pengaturan', name: 'Pengaturan', icon: Settings },
      ]
    : [
        { id: 'beranda', name: 'Beranda', icon: UserRound },
        { id: 'tugas', name: 'Servis', icon: Wrench },
        { id: 'scan', name: 'Scan', icon: ScanLine },
        { id: 'keuangan', name: 'Komisi', icon: Wallet },
        { id: 'pengaturan', name: 'Pengaturan', icon: Settings },
      ];
  const employeeMobileActiveTab = isKasir ? kasirTab : activeTab;

  const handleAttendance = async (type) => {
    try {
      await apiService.post('/transactions', {
        tenant_code: employee.tenant_code || tenant.code,
        type: type,
        amount: 0,
        description: `ATTENDANCE_EMP_${employee.id}`
      });
      alert(`Berhasil Absen ${type === 'ATTENDANCE_IN' ? 'Masuk' : 'Keluar'}!`);
      fetchTransactions();
    } catch(e) { alert('Gagal mencatat absensi'); }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'block' }}>
      {/* MOBILE TOP BAR (Visible only on mobile) */}
      <header className="mobile-top-bar native-app-header native-employee-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>{tenant?.name || 'Toko Servis'}</h3>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{employee.name} • {employee.role}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="btn btn-ghost" onClick={() => setShowChangePinModal(true)} title="Ubah PIN Saya" style={{ padding: '6px' }}>
            <KeyRound size={18} color="#7c3aed" />
          </button>
          <button className="btn btn-ghost" onClick={() => useStore.getState().clearEmployee()} title="Keluar" style={{ padding: '6px' }}>
            <LogOut size={18} color="#ef4444" />
          </button>
        </div>
      </header>

      <MobileTabBar
        tabs={employeeMobileTabs}
        activeTab={employeeMobileActiveTab}
        primaryTabIds={employeeMobileTabs.map((tab) => tab.id)}
        onChange={(tabId) => {
          if (isKasir) {
            if (tabId === 'servis') {
              setKasirTab('servis');
              return;
            }
            setKasirTab(tabId);
          } else setActiveTab(tabId);
        }}
      />

      <div className="main-content employee-portal-content" style={{ maxWidth: '1000px', margin: '0 auto', background: 'transparent' }}>
        <div className="native-screen-heading native-employee-heading">
          <p>{isKasir ? 'AREA KASIR' : 'AREA TIM'}</p>
          <h2>{isKasir ? 'Kasir & Alur Servis' : 'Servis Hari Ini'}</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }} className="desktop-only-header">
          <div>
            <h2 style={{ margin: '0 0 10px 0' }}>Halo, {employee.name} <span className="badge badge-warning">{employee.role}</span></h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!hasCheckedIn ? (
                <button className="btn" style={{ background: '#059669', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleAttendance('ATTENDANCE_IN')}>✅ Absen Masuk</button>
              ) : !hasCheckedOut ? (
                <button className="btn" style={{ background: '#ef4444', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleAttendance('ATTENDANCE_OUT')}>👋 Absen Keluar</button>
              ) : (
                <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>Absensi Hari Ini Selesai</span>
              )}
            </div>
          </div>
          <button className="btn btn-danger hide-on-mobile" onClick={() => {
            useStore.getState().clearEmployee();
          }}><LogOut size={16} /> Keluar</button>
        </div>

        {/* Mobile Quick Attendance Action */}
        <div className="mobile-only-attendance" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            {!hasCheckedIn ? (
              <button className="btn" style={{ background: '#059669', color: 'white', fontSize: '0.85rem', padding: '10px', flex: 1 }} onClick={() => handleAttendance('ATTENDANCE_IN')}>✅ Absen Masuk</button>
            ) : !hasCheckedOut ? (
              <button className="btn" style={{ background: '#ef4444', color: 'white', fontSize: '0.85rem', padding: '10px', flex: 1 }} onClick={() => handleAttendance('ATTENDANCE_OUT')}>👋 Absen Keluar</button>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '8px', flex: 1, justifyContent: 'center' }}>Absensi Selesai</span>
            )}
          </div>
        </div>

        <section className="employee-work-hero">
          <div className="employee-work-intro">
            <p>{isKasir ? 'PORTAL KASIR' : 'PORTAL TEKNISI'}</p>
            <h2>{settings.storeName || tenant?.name || 'Toko Servis'}</h2>
            <span>{employee.name} - {employee.role}</span>
          </div>
          <div className="employee-work-actions">
            <button type="button" onClick={() => isKasir ? setKasirTab('pos') : setActiveTab('tugas')}>
              {isKasir ? <ShoppingCart size={17} /> : <Wrench size={17} />}
              {isKasir ? 'Buka Kasir' : 'Lihat Tugas'}
            </button>
            <button type="button" onClick={() => setShowTeamScanner(true)}>
              <ScanLine size={17} /> Scan
            </button>
          </div>
        </section>

        <section className="employee-metric-grid">
          <article>
            <span>{isKasir ? 'Transaksi Hari Ini' : 'Tugas Aktif'}</span>
            <strong>{isKasir ? todayPosTransactions.length : activeMyServices.length}</strong>
            <small>{isKasir ? `Rp ${todayPosTotal.toLocaleString('id-ID')}` : 'Unit belum selesai'}</small>
          </article>
          <article>
            <span>{isKasir ? 'Servis Aktif' : 'Selesai Hari Ini'}</span>
            <strong>{isKasir ? services.filter(s => !isPaidServiceStatus(s.status)).length : finishedToday.length}</strong>
            <small>{isKasir ? 'Masih berjalan' : 'Sudah lunas/diambil'}</small>
          </article>
          <article>
            <span>Update APK</span>
            <strong>{latestVersionInfo?.version && isNewerVersion(latestVersionInfo.version, APP_VERSION) ? 'Baru' : 'OK'}</strong>
            <small>v{APP_VERSION}</small>
          </article>
        </section>

      {isKasir ? (
        <>
          <div className="employee-section-switcher" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${kasirTab === 'beranda' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('beranda')}>
              Beranda
            </button>
            <button className={`btn ${kasirTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('pos')}>
              Kasir POS
            </button>
            <button className={`btn ${kasirTab === 'servis' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('servis')}>
              Servis & Teknisi
            </button>
            <button className={`btn ${kasirTab === 'scan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('scan')}>
              Scan
            </button>
            <button className={`btn ${kasirTab === 'pengaturan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('pengaturan')}>
              Pengaturan
            </button>
          </div>

          {kasirTab === 'beranda' ? (
            <div className="employee-pro-panel">
              <div>
                <h3>Ringkasan Kasir</h3>
                <p>Mulai transaksi, scan produk, atau cek alur servis dari satu portal.</p>
              </div>
              <div className="employee-quick-grid">
                <button type="button" onClick={() => setKasirTab('pos')}><ShoppingCart size={18} /> Kasir POS</button>
                <button type="button" onClick={() => setShowTeamScanner(true)}><ScanLine size={18} /> Scan Produk/Resi</button>
                <button type="button" onClick={() => setKasirTab('servis')}><PackageSearch size={18} /> Daftar Servis</button>
                <button type="button" onClick={() => setKasirTab('pengaturan')}><Settings size={18} /> Pengaturan</button>
              </div>
            </div>
          ) : kasirTab === 'pos' ? (
            <POSView products={products} transactions={transactions} onTransactionCreated={fetchTransactions} />
          ) : kasirTab === 'servis' ? (
            <>
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.35rem' }}>Servis & Penugasan Teknisi</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Buat servis baru, cetak nota, lalu tugaskan ke teknisi yang tersedia.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={openServiceWizard}>
                    <Plus size={18} /> Daftarkan & Tugaskan
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '1.25rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: '700' }}>Total Servis</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{services.length}</div>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>Diterima</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{services.filter(s => s.status === 'DITERIMA').length}</div>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: '700' }}>Aktif Dikerjakan</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{services.filter(s => s.status !== 'DIAMBIL' && s.status !== 'SELESAI').length}</div>
                  </div>
                </div>
              </div>

              <div className="glass-panel">
                <div className="cashier-service-list-header">
                  <div>
                    <h3>Daftar Servis</h3>
                    <p>Semua servis dari kasir dan teknisi tersedia untuk dicetak.</p>
                  </div>
                  <label className="cashier-service-search">
                    <Search size={17} />
                    <input
                      type="search"
                      className="input-field"
                      placeholder="Cari resi, pelanggan, perangkat..."
                      value={cashierServiceSearch}
                      onChange={(event) => setCashierServiceSearch(event.target.value)}
                    />
                  </label>
                </div>
                {services.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data servis.</p>
                ) : cashierServices.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada servis yang sesuai dengan pencarian.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {cashierServices.map(s => {
                      const tech = technicianUsers.find(t => String(t.id) === String(s.technician_id));
                      return (
                        <div key={s.resi} className="cashier-recent-service">
                          <div className="cashier-service-summary">
                            <div className="cashier-service-details">
                              <div className="cashier-service-title">{s.customer_name} <span>({s.resi})</span></div>
                              <div className="cashier-service-device">{s.device_name}</div>
                              <div className="cashier-service-tech">Teknisi: {tech ? tech.name : 'Belum ditentukan'}</div>
                            </div>
                            <div className="cashier-service-side">
                              <span className="badge badge-info">{s.status || 'PROSES'}</span>
                              <div className="cashier-service-actions">
                                <button className="btn btn-ghost" onClick={() => { setSelectedService(s); setPrintType(s.status === 'SELESAI' || s.status === 'DIAMBIL' ? 'pengambilan' : 'pendaftaran'); setShowPrintModal(true); }}>
                                  <Printer size={15} /> Cetak Nota
                                </button>
                                <button className="btn btn-ghost" onClick={() => { setSelectedService(s); setShowBarcodeModal(true); }}>
                                  Barcode
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : kasirTab === 'scan' ? (
            <div className="employee-pro-panel">
              <div>
                <h3>Scan Produk atau Resi</h3>
                <p>Gunakan kamera perangkat untuk membaca barcode produk atau QR/resi servis tanpa layanan eksternal.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowTeamScanner(true)}><ScanLine size={18} /> Buka Kamera Scan</button>
              {teamScanResult && <p className="employee-scan-result">Hasil terakhir: <strong>{teamScanResult}</strong></p>}
            </div>
          ) : (
            <div className="employee-settings-grid">
              <div className="employee-setting-card">
                <UserRound size={20} />
                <div><strong>{employee.name}</strong><span>{employee.role} - {employee.phone || 'Nomor belum diisi'}</span></div>
              </div>
              <div className="employee-setting-card">
                <Languages size={20} />
                <div>
                  <strong>Bahasa Aplikasi</strong>
                  <select className="input-field" value={currentLang} onChange={(event) => { setAppLanguage(event.target.value); setCurrentLang(event.target.value); }}>
                    <option value="id">{t('indonesian', 'Bahasa Indonesia', currentLang)}</option>
                    <option value="en">{t('english', 'English', currentLang)}</option>
                  </select>
                </div>
              </div>
              <div className="employee-setting-card">
                <Download size={20} />
                <div>
                  <strong>Update Aplikasi</strong>
                  <span>{latestVersionInfo?.version && isNewerVersion(latestVersionInfo.version, APP_VERSION) ? `Versi baru ${latestVersionInfo.version} tersedia` : `Versi saat ini ${APP_VERSION}`}</span>
                  <button className="btn btn-primary" onClick={openEmployeeUpdate}>Update APK</button>
                </div>
              </div>
              <div className="employee-setting-card">
                <KeyRound size={20} />
                <div><strong>Keamanan</strong><span>Ubah PIN login tim Anda.</span><button className="btn btn-ghost" onClick={() => setShowChangePinModal(true)}>Ubah PIN</button></div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="employee-section-switcher" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <button className={`btn ${activeTab === 'beranda' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('beranda')}>
              Beranda
            </button>
            <button className={`btn ${activeTab === 'tugas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('tugas')}>
              Daftar Tugas
            </button>
            <button className={`btn ${activeTab === 'scan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('scan')}>
              Scan
            </button>
            <button className={`btn ${activeTab === 'keuangan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('keuangan')}>
              Keuangan Saya
            </button>
            <button className={`btn ${activeTab === 'pengaturan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('pengaturan')}>
              Pengaturan
            </button>
          </div>

          {activeTab === 'beranda' && (
            <div className="employee-pro-panel">
              <div>
                <h3>Ringkasan Tugas</h3>
                <p>Lihat pekerjaan aktif, scan resi unit, dan update progres servis dari satu tempat.</p>
              </div>
              <div className="employee-quick-grid">
                <button type="button" onClick={() => setActiveTab('tugas')}><Wrench size={18} /> Tugas Saya</button>
                <button type="button" onClick={() => setShowTeamScanner(true)}><ScanLine size={18} /> Scan Resi</button>
                <button type="button" onClick={() => setActiveTab('keuangan')}><Wallet size={18} /> Komisi</button>
                <button type="button" onClick={() => setActiveTab('pengaturan')}><Settings size={18} /> Pengaturan</button>
              </div>
            </div>
          )}

          {activeTab === 'tugas' && (
            <>
              <div className="glass-panel technician-task-list">
                <div className="technician-task-list-header">
                  <div><h3>Daftar Tugas Servis</h3><p>Unit yang ditugaskan kepada Anda.</p></div>
                  <span>{services.filter(s => String(s.technician_id) === String(employee.id) && !isPaidServiceStatus(s.status)).length} aktif</span>
                </div>
                {services.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada antrian servis.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {services.filter(s => String(s.technician_id) === String(employee.id)).length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Anda belum memiliki tugas servis aktif.</p>
                    ) : services.filter(s => String(s.technician_id) === String(employee.id)).map(s => (
                      <div key={s.resi} className="technician-task-card" style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#ffffff', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="technician-task-detail" style={{ flex: 1, minWidth: '240px' }}>
                          <div className="technician-task-title" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <strong>{s.device_name}</strong>
                            <span className="badge badge-info">{s.status || 'PROSES'}</span>
                          </div>
                          <IssueChips issue={s.issue} />
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Resi: {s.resi} | Pelanggan: {s.customer_name}</div>
                        </div>
                        <div className="technician-task-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          {!['SELESAI', 'DIAMBIL', 'DI AMBIL'].includes(s.status) && technicianUsers.filter((technician) => String(technician.id) !== String(employee.id)).length > 0 && (
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openTransferModal(s)}>
                              <ArrowRightLeft size={14} style={{ marginRight: '5px', display: 'inline' }} /> Alihkan Tugas
                            </button>
                          )}
                          {(s.status === 'PROSES' || s.status === 'MENUNGGU_PART' || s.status === 'DICEK' || s.status === 'DIKERJAKAN') && (
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                              setSelectedService(s);
                              setShowPersetujuanModal(true);
                            }}>
                              <MessageSquare size={14} style={{ marginRight: '5px', display: 'inline' }} /> WA Persetujuan
                            </button>
                          )}
                          
                          {!isPaidServiceStatus(s.status) ? (
                            <select 
                              className="input-field" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px', background: 'white' }}
                              value={s.status || 'PROSES'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'SELESAI') {
                                  setSelectedService(s);
                                  setShowSelesaiModal(true);
                                } else if (newStatus === 'DIAMBIL' || newStatus === 'DI AMBIL') {
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
                                } else {
                                  try {
                                    await apiService.post(`/services/${s.resi}/status`, { status: newStatus, tenant_code: employee.tenant_code || tenant.code });
                                    fetchServices();
                                  } catch(err) { alert('Gagal update status'); }
                                }
                              }}
                            >
                              {SERVICE_STATUSES.map(st => {
                                let style = {};
                                let label = st.label;
                                if (st.id === 'SELESAI') {
                                  style = { color: 'var(--primary)', fontWeight: 'bold' };
                                  label = 'Selesai (Tagihan)';
                                }
                                if (st.id === 'DIAMBIL') {
                                  style = { color: 'var(--accent)', fontWeight: 'bold' };
                                  label = 'Di Ambil (Lunas)';
                                }
                                return <option key={st.id} value={st.id} style={style}>{label}</option>;
                              })}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                              <span className="badge badge-success"><CheckCircle size={14} /> Sudah Di Ambil (Lunas)</span>
                              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => {
                                setSelectedService(s);
                                setPrintType('pengambilan');
                                setShowPrintModal(true);
                              }}>
                                <Printer size={12} style={{ display: 'inline', marginRight: '4px' }} /> Cetak Ulang Nota
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'keuangan' && (
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Laporan Keuangan & Gaji</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Gaji Pokok</p>
                  <h2 style={{ margin: 0, color: 'var(--primary)' }}>Rp {mySalary.toLocaleString('id-ID')}</h2>
                </div>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Komisi ({myCommissionRate}%)</p>
                  <h2 style={{ margin: 0, color: totalKomisi === 0 ? '#6B7280' : '#10B981' }}>Rp {totalKomisi.toLocaleString('id-ID')}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Dari {myCompletedServices.length} Servis</p>
                </div>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Kasbon / Pinjaman</p>
                  <h2 style={{ margin: 0, color: '#ef4444' }}>Rp {totalBon.toLocaleString('id-ID')}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Dari {myBonTransactions.length} Transaksi</p>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Take Home Pay (THP)</p>
                  <h2 style={{ margin: 0 }}>Rp {sisaBersih.toLocaleString('id-ID')}</h2>
                  <button className="btn" style={{ background: 'white', color: 'var(--primary)', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }} onClick={() => setShowBonModal(true)}>
                    <Wallet size={14} style={{ marginRight: '5px', display: 'inline' }}/> Ajukan Kasbon
                  </button>
                </div>
              </div>
              <EmployeeFinanceInsights
                services={services}
                employee={employee}
                salary={mySalary}
                commissionRate={myCommissionRate}
              />
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="employee-pro-panel">
              <div>
                <h3>Scan Resi Servis</h3>
                <p>Arahkan kamera ke barcode/QR resi untuk menemukan tugas servis lebih cepat.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowTeamScanner(true)}><ScanLine size={18} /> Buka Kamera Scan</button>
              {teamScanResult && <p className="employee-scan-result">Hasil terakhir: <strong>{teamScanResult}</strong></p>}
            </div>
          )}

          {activeTab === 'pengaturan' && (
            <div className="employee-settings-grid">
              <div className="employee-setting-card">
                <UserRound size={20} />
                <div><strong>{employee.name}</strong><span>{employee.role} - {employee.phone || 'Nomor belum diisi'}</span></div>
              </div>
              <div className="employee-setting-card">
                <StoreIcon size={20} />
                <div><strong>{settings.storeName || tenant?.name || 'Toko Servis'}</strong><span>Kode toko: {tenant?.code || employee.tenant_code}</span></div>
              </div>
              <div className="employee-setting-card">
                <Languages size={20} />
                <div>
                  <strong>Bahasa Aplikasi</strong>
                  <select className="input-field" value={currentLang} onChange={(event) => { setAppLanguage(event.target.value); setCurrentLang(event.target.value); }}>
                    <option value="id">{t('indonesian', 'Bahasa Indonesia', currentLang)}</option>
                    <option value="en">{t('english', 'English', currentLang)}</option>
                  </select>
                </div>
              </div>
              <div className="employee-setting-card">
                <Download size={20} />
                <div>
                  <strong>Update Aplikasi</strong>
                  <span>{latestVersionInfo?.version && isNewerVersion(latestVersionInfo.version, APP_VERSION) ? `Versi baru ${latestVersionInfo.version} tersedia` : `Versi saat ini ${APP_VERSION}`}</span>
                  <button className="btn btn-primary" onClick={openEmployeeUpdate}>Update APK</button>
                </div>
              </div>
              <div className="employee-setting-card">
                <KeyRound size={20} />
                <div><strong>Keamanan</strong><span>Ubah PIN login tim Anda.</span><button className="btn btn-ghost" onClick={() => setShowChangePinModal(true)}>Ubah PIN</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden iframe for printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Receipt Printer" />

      {availableUpdateInfo && (
        <AndroidUpdateModal
          updateInfo={availableUpdateInfo}
          onClose={() => setAvailableUpdateInfo(null)}
        />
      )}

      {showTeamScanner && (
        <BarcodeScanner
          onScan={handleTeamScan}
          onClose={() => setShowTeamScanner(false)}
        />
      )}

      {/* Modals */}
      {showSelesaiModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '760px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Rincian Biaya Servis</h3>
              <button className="btn btn-ghost" onClick={() => setShowSelesaiModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                const partCatalogId = fd.get('part_product_id');
                const jasaCatalogId = fd.get('jasa_product_id');
                const selectedPartProduct = partCatalogId ? products.find(p => String(p.id) === String(partCatalogId)) : null;
                const selectedJasaProduct = jasaCatalogId ? products.find(p => String(p.id) === String(jasaCatalogId)) : null;
                const partManualName = (fd.get('part_name_manual') || '').trim();
                const jasaManualName = (fd.get('jasa_name_manual') || '').trim();
                const partFeeRaw = normalizeMoneyInput(fd.get('part_fee'));
                const jasaFeeRaw = normalizeMoneyInput(fd.get('jasa_fee'));
                const partFee = partFeeRaw || (selectedPartProduct?.price || 0);
                const jasaFee = jasaFeeRaw || (selectedJasaProduct?.price || 0);
                const diskon = normalizeMoneyInput(fd.get('diskon'));
                const partName = partManualName || selectedPartProduct?.name || '';
                const jasaName = jasaManualName || selectedJasaProduct?.name || '';

                const errors = [];
                if (partCatalogId && !selectedPartProduct) errors.push('Sparepart katalog belum dipilih dengan benar.');
                if (jasaCatalogId && !selectedJasaProduct) errors.push('Jasa katalog belum dipilih dengan benar.');
                if ((partCatalogId || partManualName) && !partName) errors.push('Nama sparepart wajib diisi jika ada sparepart.');
                if ((jasaCatalogId || jasaManualName) && !jasaName) errors.push('Nama jasa wajib diisi jika ada jasa.');
                if (partFee > 0 && !partName) errors.push('Nama sparepart wajib diisi jika ada biaya sparepart.');
                if (jasaFee > 0 && !jasaName) errors.push('Nama jasa wajib diisi jika ada biaya jasa.');
                if ((partCatalogId || partManualName) && partFee <= 0) errors.push('Biaya sparepart harus lebih besar dari 0.');
                if ((jasaCatalogId || jasaManualName) && jasaFee <= 0) errors.push('Biaya jasa harus lebih besar dari 0.');
                if (!partName && !jasaName) errors.push('Isi minimal sparepart atau jasa sebelum menandai selesai.');
                if (diskon > partFee + jasaFee) errors.push('Diskon tidak boleh lebih besar dari total biaya.');
                if (partFee < 0 || jasaFee < 0 || diskon < 0) errors.push('Nominal biaya tidak boleh negatif.');

                if (errors.length > 0) {
                  alert(errors.join('\n'));
                  return;
                }

                const currentUser = localStorage.getItem('EMPLOYEE_NAME') || employee?.name || 'Kasir / Teknisi';
                if (selectedPartProduct && Number(selectedPartProduct.stock || 0) <= 0) {
                  alert(`Stok ${selectedPartProduct.name} sedang habis.`);
                  return;
                }
                
                let updatedIssue = selectedService.issue || '';
                if (partName) updatedIssue += `\n[Sparepart diganti: ${partName}]`;
                if (jasaName) updatedIssue += `\n[Jasa Servis: ${jasaName}]`;
                if (diskon > 0) updatedIssue += `\n[Diskon: Rp ${diskon}]`;

                await apiService.post('/services/finish', {
                  resi: selectedService.resi,
                  tenant_code: employee.tenant_code || tenant.code,
                  status: 'SELESAI',
                  part_fee: partFee,
                  jasa_fee: jasaFee,
                  technician_id: selectedService.technician_id || employee.id,
                  issue: updatedIssue
                });

                if (selectedPartProduct) {
                  const currentStock = Number(selectedPartProduct.stock || 0);
                  const nextStock = Math.max(0, currentStock - 1);
                  await apiService.updateProduct(
                    selectedPartProduct.id,
                    { stock: nextStock },
                    currentStock,
                    currentUser,
                    `Dipakai untuk servis resi ${selectedService.resi}`
                  );
                  setProducts(prev => prev.map(p => String(p.id) === String(selectedPartProduct.id) ? { ...p, stock: nextStock } : p));
                }
                
                const totalTagihan = Math.max(0, partFee + jasaFee - diskon);
                const message = `Halo ${selectedService.customer_name},\n\nServis perangkat ${selectedService.device_name} Anda (Resi: ${selectedService.resi}) telah *SELESAI*.\nTotal Tagihan: Rp ${totalTagihan.toLocaleString('id-ID')}.\n\nSilakan diambil di toko kami. Terima kasih!`;
                
                const phoneConflict = findEmployeePhoneConflict(selectedService.customer_phone, users);
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
                
                alert('Berhasil disimpan & Notifikasi WA diproses!');
                setShowSelesaiModal(false);
                fetchServices();
                if (selectedPartProduct) fetchTransactions();
              } catch (err) { alert('Gagal update status'); }
            }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>Resi: {selectedService.resi}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '10px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Sparepart</h4>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Pilih dari Daftar Barang</label>
                  <select
                    name="part_product_id"
                    className="input-field"
                    style={{ marginBottom: '10px' }}
                    defaultValue=""
                    onChange={(e) => syncCatalogSelection(e.target.value, 'partNameManualInput', 'partFeeInput')}
                  >
                    <option value="">-- Manual / Tidak ada sparepart --</option>
                    {sparepartCatalog.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} | Stok: {p.stock ?? 0} | Rp {Number(p.price || 0).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nama Sparepart Manual</label>
                  <input type="text" id="partNameManualInput" name="part_name_manual" className="input-field" placeholder="Opsional, misal: LCD Samsung J2" style={{ marginBottom: '10px' }} />
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Total Biaya Sparepart Opsional (Rp)</label>
                  <input type="text" inputMode="numeric" id="partFeeInput" name="part_fee" className="input-field" defaultValue="0" style={{ marginBottom: '0' }}  onInput={handleMoneyInput} />
                </div>

                <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '10px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Jasa</h4>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Pilih dari Daftar Jasa</label>
                  <select
                    name="jasa_product_id"
                    className="input-field"
                    style={{ marginBottom: '10px' }}
                    defaultValue=""
                    onChange={(e) => syncCatalogSelection(e.target.value, 'jasaNameManualInput', 'jasaFeeInput')}
                  >
                    <option value="">-- Manual / Tidak ada jasa katalog --</option>
                    {jasaCatalog.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} | Rp {Number(p.price || 0).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nama Jasa Manual</label>
                  <input type="text" id="jasaNameManualInput" name="jasa_name_manual" className="input-field" placeholder="Misal: Reball chipset / install ulang" style={{ marginBottom: '10px' }} />
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Biaya Jasa (Rp)</label>
                  <input type="text" inputMode="numeric" id="jasaFeeInput" name="jasa_fee" className="input-field" defaultValue="0" style={{ marginBottom: '0' }}  onInput={handleMoneyInput} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>Diskon Khusus (Rp)</label>
                  <input type="text" inputMode="numeric" name="diskon" className="input-field" defaultValue="0" placeholder="Opsional" style={{ marginBottom: '0' }}  onInput={handleMoneyInput} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Simpan & Tandai Selesai</button>
            </form>
          </div>
        </div>
      )}

      {showPersetujuanModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Minta Persetujuan WA</h3>
              <button className="btn btn-ghost" onClick={() => setShowPersetujuanModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const partName = e.target.part.value;
              const estPrice = e.target.price.value;
              
              const waText = `Halo kak ${selectedService.customer_name}, dari ${tenant?.name || 'Toko Servis'}.\n\nSetelah kami lakukan pengecekan pada perangkat ${selectedService.device_name} kakak, ternyata memerlukan perbaikan/penggantian *${partName}*.\n\nEstimasi biaya totalnya adalah *Rp ${normalizeMoneyInput(estPrice).toLocaleString('id-ID')}*.\n\nApakah kakak setuju untuk kami lanjutkan perbaikannya? Mohon konfirmasinya ya kak. Terima kasih! 🙏`;
              const waUrl = buildManualWhatsAppUrl(selectedService.customer_phone, waText);
              window.open(waUrl, '_blank');
              setShowPersetujuanModal(false);
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Tindakan / Nama Sparepart:</label>
              <input type="text" name="part" className="input-field" placeholder="Misal: Ganti LCD & Baterai" required style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Estimasi Total Biaya (Rp):</label>
              <input type="text" inputMode="numeric" name="price" className="input-field" placeholder="Misal: 450.000" required style={{ marginBottom: '20px' }}  onInput={handleMoneyInput} />
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Buka WhatsApp</button>
            </form>
          </div>
        </div>
      )}

      {showPrintModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '350px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Cetak {printType === 'pendaftaran' ? 'Nota Pendaftaran' : 'Nota Pengambilan'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Pilih jenis printer yang Anda gunakan:</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doPrint('thermal')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Thermal (58/80mm)
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border-light)' }} onClick={() => doPrint('a4')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Kertas Biasa (A4)
              </button>
            </div>
          </div>
        </div>
      )}


      {showEditServiceNota && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <form onSubmit={handleServiceNotaEdit} className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Edit Nota Servis</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditServiceNota(false)}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>Resi: <strong>{selectedService.resi}</strong></p>
            <label className="label">Keterangan / Rincian Perbaikan</label>
            <textarea
              name="note"
              className="input-field"
              rows="4"
              defaultValue={buildIssueWithDiscount(selectedService.issue || '', 0)}
              placeholder="Contoh: Ganti LCD, cleaning konektor, unit normal kembali"
              style={{ marginBottom: '10px', resize: 'vertical' }}
            />
            <label className="label">Biaya Sparepart Opsional (Rp)</label>
            <input name="part_fee" type="text" inputMode="numeric" min="0" className="input-field" defaultValue={selectedService.part_fee || 0}  onInput={handleMoneyInput} />
            <label className="label">Biaya Jasa (Rp)</label>
            <input name="jasa_fee" type="text" inputMode="numeric" min="0" className="input-field" defaultValue={selectedService.jasa_fee || 0}  onInput={handleMoneyInput} />
            <label className="label">Diskon Nota (Rp)</label>
            <input name="discount" type="text" inputMode="numeric" min="0" className="input-field" defaultValue={getServiceDiscount(selectedService.issue || '')}  onInput={handleMoneyInput} />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Simpan Koreksi Nota
            </button>
          </form>
        </div>
      )}

      {showBarcodeModal && selectedService && (
        <div className="modal-backdrop service-wizard-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel service-wizard-dialog cashier-barcode-dialog" style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-light)', textAlign: 'center' }}>
            <div className="service-wizard-header">
              <div style={{ textAlign: 'left' }}><p>STIKER SERVIS</p><h3>Cetak Barcode</h3></div>
              <button type="button" className="btn btn-ghost service-wizard-close" onClick={() => setShowBarcodeModal(false)} aria-label="Tutup barcode"><X size={20} /></button>
            </div>
            <div id="cashier-service-barcode" className="cashier-service-barcode">
              <p>{settings.storeName || tenant?.name || 'Toko Servis'}</p>
              <Barcode value={selectedService.resi} width={1.35} height={46} fontSize={13} margin={0} />
              <strong>{selectedService.resi}</strong>
              <span>{selectedService.customer_name} · {selectedService.device_name}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '18px' }} onClick={doPrintBarcode}><Printer size={17} /> Cetak Stiker</button>
          </div>
        </div>
      )}

      {showBonModal && (
        <div className="modal-backdrop service-wizard-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1110, padding: '1rem' }}>
          <form className="glass-panel service-wizard-dialog" onSubmit={handleBon} style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-light)' }}>
            <div className="service-wizard-header">
              <div>
                <p>PENGAJUAN KARYAWAN</p>
                <h3>Ajukan Kasbon</h3>
              </div>
              <button type="button" className="btn btn-ghost service-wizard-close" onClick={() => setShowBonModal(false)} aria-label="Tutup formulir"><X size={20} /></button>
            </div>
            <div className="service-wizard-step">
              <h4>Nominal kasbon</h4>
              <p>Masukkan jumlah yang diajukan. Pengajuan akan tercatat untuk persetujuan pemilik atau admin.</p>
              <label className="service-transfer-label" htmlFor="bon-amount">Nominal (Rp)</label>
              <input id="bon-amount" name="amount" type="text" min="1000" step="1000" inputMode="numeric" className="input-field" placeholder="Contoh: 100.000" required autoFocus  onInput={handleMoneyInput} />
            </div>
            <div className="service-wizard-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowBonModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary"><Wallet size={18} /> Kirim Pengajuan</button>
            </div>
          </form>
        </div>
      )}

      {showServiceModal && (
        <div className="modal-backdrop service-wizard-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel service-wizard-dialog" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-light)' }}>
            <div className="service-wizard-header">
              <button type="button" className="btn btn-ghost service-wizard-back" onClick={() => serviceWizardStep > 1 ? moveServiceWizard(-1) : closeServiceWizard()} aria-label={serviceWizardStep > 1 ? 'Kembali ke langkah sebelumnya' : 'Kembali ke menu'}><ChevronLeft size={22} /></button>
              <div>
                <p>INPUT SERVIS</p>
                <h3>Buat Servis & Tugaskan</h3>
              </div>
              <button type="button" className="btn btn-ghost service-wizard-close" onClick={closeServiceWizard} aria-label="Tutup formulir"><X size={20} /></button>
            </div>
            <div className="service-wizard-progress" aria-label={`Langkah ${serviceWizardStep} dari 4`}>
              {[1, 2, 3, 4].map((step) => <span key={step} className={step <= serviceWizardStep ? 'active' : ''} />)}
            </div>
            <form onSubmit={handleAddService}>
              <input type="hidden" name="name" value={serviceForm.name} />
              <input type="hidden" name="phone" value={serviceForm.phone} />
              <input type="hidden" name="device" value={serviceForm.device} />
              <input type="hidden" name="kelengkapan" value={serviceForm.kelengkapan} />
              <input type="hidden" name="issue" value={serviceForm.issue} />
              <input type="hidden" name="technician_id" value={serviceForm.technician_id} />

              <div className="service-wizard-step">
                <span>Langkah {serviceWizardStep} dari 4</span>
                {serviceWizardStep === 1 && <><h4>Data pelanggan</h4><p>Mulai dari orang yang menitipkan unit.</p><input type="text" className="input-field" placeholder="Nama pelanggan" value={serviceForm.name} onChange={(event) => updateServiceForm('name', event.target.value)} autoFocus /><input type="tel" inputMode="numeric" className="input-field" placeholder="Nomor WhatsApp" value={serviceForm.phone} onChange={(event) => updateServiceForm('phone', event.target.value)} /></>}
                {serviceWizardStep === 2 && <><h4>Data unit</h4><p>Catat perangkat dan barang yang ikut dititipkan.</p><input type="text" className="input-field" placeholder="Perangkat, misalnya Laptop ASUS" value={serviceForm.device} onChange={(event) => updateServiceForm('device', event.target.value)} autoFocus /><input type="text" className="input-field" placeholder="Kelengkapan, misalnya charger dan tas" value={serviceForm.kelengkapan} onChange={(event) => updateServiceForm('kelengkapan', event.target.value)} /></>}
                {serviceWizardStep === 3 && <><h4>Keluhan servis</h4><p>Jelaskan kerusakan yang disampaikan pelanggan.</p><textarea className="input-field" rows="4" placeholder="Contoh: layar berkedip saat dinyalakan" value={serviceForm.issue} onChange={(event) => updateServiceForm('issue', event.target.value)} autoFocus /></>}
                {serviceWizardStep === 4 && <><h4>Tugaskan teknisi</h4><p>Pilih teknisi yang menerima pekerjaan ini.</p><select className="input-field" value={serviceForm.technician_id} onChange={(event) => updateServiceForm('technician_id', event.target.value)} autoFocus><option value="">Pilih teknisi</option>{technicianUsers.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.phone ? ` - ${technician.phone}` : ''}</option>)}</select>{technicianUsers.length === 0 && <p className="service-wizard-warning">Belum ada teknisi. Tambahkan akun teknisi dari dashboard terlebih dahulu.</p>}</>}
              </div>
              {serviceWizardError && <p className="service-wizard-error">{serviceWizardError}</p>}
              <div className="service-wizard-actions">
                {serviceWizardStep > 1 ? <button type="button" className="btn btn-ghost" onClick={() => moveServiceWizard(-1)}><ChevronLeft size={18} /> Kembali</button> : <button type="button" className="btn btn-ghost" onClick={closeServiceWizard}>Batal</button>}
                {serviceWizardStep < 4 ? <button type="button" className="btn btn-primary" onClick={() => moveServiceWizard(1)}>Lanjut <ChevronRight size={18} /></button> : <button type="submit" className="btn btn-primary"><Plus size={18} /> Simpan Servis</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && transferService && (
        <div className="modal-backdrop service-wizard-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1120, padding: '1rem' }}>
          <form className="glass-panel service-wizard-dialog" onSubmit={handleTransferService} style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-light)' }}>
            <div className="service-wizard-header">
              <button type="button" className="btn btn-ghost service-wizard-back" onClick={closeTransferModal} aria-label="Kembali ke tugas"><ChevronLeft size={22} /></button>
              <div><p>PENGALIHAN TUGAS</p><h3>Alihkan Job Servis</h3></div>
              <button type="button" className="btn btn-ghost service-wizard-close" onClick={closeTransferModal} aria-label="Tutup"><X size={20} /></button>
            </div>
            <div className="service-transfer-summary"><strong>{transferService.device_name}</strong><span>{transferService.resi}</span><p>{transferService.customer_name}</p></div>
            <label className="service-transfer-label">Teknisi pengganti</label>
            <select className="input-field" value={transferTechnicianId} onChange={(event) => { setTransferTechnicianId(event.target.value); setTransferError(''); }} required>
              <option value="">Pilih teknisi</option>
              {technicianUsers.filter((technician) => String(technician.id) !== String(employee.id)).map((technician) => <option key={technician.id} value={technician.id}>{technician.name}{technician.phone ? ` - ${technician.phone}` : ''}</option>)}
            </select>
            <label className="service-transfer-label">Alasan pengalihan <span>(opsional)</span></label>
            <textarea className="input-field" rows="3" placeholder="Contoh: sedang sakit atau pekerjaan di luar keahlian" value={transferReason} onChange={(event) => setTransferReason(event.target.value)} />
            {transferError && <p className="service-wizard-error">{transferError}</p>}
            <div className="service-wizard-actions"><button type="button" className="btn btn-ghost" onClick={closeTransferModal}>Batal</button><button type="submit" className="btn btn-primary" disabled={transferLoading}><ArrowRightLeft size={18} /> {transferLoading ? 'Mengalihkan...' : 'Alihkan Tugas'}</button></div>
          </form>
        </div>
      )}

      {/* UBAH PIN MODAL */}
      {showChangePinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowChangePinModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="var(--text-muted)" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <KeyRound size={22} color="#7c3aed" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Ubah PIN Saya</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>Perbarui PIN login tim/karyawan Anda secara aman.</p>
            
            <form onSubmit={handleChangeEmployeePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>PIN Saat Ini</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="PIN lama Anda"
                  value={empCurrentPin}
                  onChange={(e) => setEmpCurrentPin(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>PIN Baru</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="PIN baru (min. 4 digit)"
                  value={empNewPin}
                  onChange={(e) => setEmpNewPin(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Konfirmasi PIN Baru</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Ketik ulang PIN baru"
                  value={empConfirmPin}
                  onChange={(e) => setEmpConfirmPin(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowChangePinModal(false)} style={{ flex: 1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isChangingPin} style={{ flex: 2, background: '#7c3aed', borderColor: '#7c3aed', color: '#fff' }}>
                  {isChangingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
