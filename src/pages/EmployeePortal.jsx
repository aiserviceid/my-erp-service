import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LogIn, CheckCircle, Clock, LogOut, Wallet, Plus, MessageSquare, Printer, X, ShoppingCart, Wrench, ChevronLeft, ChevronRight, ArrowRightLeft, Search } from 'lucide-react';
import { apiService } from '../services/api';
import { buildManualWhatsAppUrl, sendWhatsAppNotification } from '../services/notificationService';
import POSView from '../components/POSView';
import MobileTabBar from '../components/MobileTabBar';
import { SERVICE_STATUSES } from '../config/tierLimits';

export default function EmployeePortal() {
  const { tenant, employee, setEmployee, setTenant } = useStore();
  const navigate = useNavigate();
  
  const [tenantCode, setTenantCode] = useState(tenant?.code || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [activeTab, setActiveTab] = useState('tugas');
  const [kasirTab, setKasirTab] = useState('pos');
  const [cashierServiceSearch, setCashierServiceSearch] = useState('');

  // Modals
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [showPersetujuanModal, setShowPersetujuanModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditServiceNota, setShowEditServiceNota] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
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
  const sparepartCatalog = products.filter(p => (p.category || '').toUpperCase() !== 'JASA');
  const jasaCatalog = products.filter(p => (p.category || '').toUpperCase() === 'JASA');
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
    if (direction > 0 && serviceWizardStep === 1 && !/^(?:\\+?62|0)8\\d{7,12}$/.test(serviceForm.phone.trim())) {
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

      await apiService.post('/services/update', { resi: transferService.resi, technician_id: replacement.id, issue: updatedIssue });

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
    if (!/^(?:\\+?62|0)8\\d{7,12}$/.test(customerPhone)) {
      setServiceWizardStep(1);
      setServiceWizardError('Masukkan nomor WhatsApp yang valid, misalnya 0812xxxxxxx.');
      return;
    }
    const kelengkapan = fd.get('kelengkapan') || '-';
    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;
    const resiGenerated = 'TRX-' + Date.now();
    const technician_id = fd.get('technician_id') || employee.id;
    const serviceData = {
      tenant_code: employee.tenant_code || tenant.code,
      resi: resiGenerated,
      customer_name: fd.get('name'),
      customer_phone: customerPhone,
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
      
      if (confirm(`Servis berhasil ditambahkan (Resi: ${resiGenerated}).\n\nKlik OK untuk mengirim info resi ini ke WhatsApp pelanggan.`)) {
        window.open(waUrl, '_blank');
      }

      if (confirm(`Ingin mencetak Nota Pendaftaran untuk pelanggan?`)) {
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
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    if (!Number.isInteger(amount) || amount <= 0) return alert('Masukkan nominal kasbon yang valid.');
    
    try {
      await apiService.post('/transactions', {
        tenant_code: employee.tenant_code || tenant.code,
        type: 'BON_PENDING',
        amount: amount,
        description: `EMP_${employee.id}`
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
          <h2>Portal Karyawan</h2>
          <p>{tenant?.name || 'Masuk sebagai Karyawan'}</p>
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
                Mode Simulasi Kasir & Teknisi Aktif
              </div>
            )}
            <input 
              type="password" 
              className="input-field" 
              placeholder="Masukkan PIN Anda" 
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
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // calculations for finances
  const myCommissionRate = tenant?.settings?.employee_commissions?.[employee.id] || 0;
  const mySalary = tenant?.settings?.employee_salaries?.[employee.id] || 0;
  const myCompletedServices = services.filter(s => (s.status === 'SELESAI' || s.status === 'DI AMBIL') && s.technician_id === employee.id);
  const totalJasaFee = myCompletedServices.reduce((sum, s) => sum + (s.jasa_fee || 0), 0);
  const totalKomisi = Math.floor(totalJasaFee * (myCommissionRate / 100));

  const myBonTransactions = transactions.filter(t => t.type === 'BON_KARYAWAN' && t.description === `EMP_${employee.id}`);
  const totalBon = myBonTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const sisaBersih = mySalary + totalKomisi - totalBon;

  const isKasir = employee.role === 'Kasir' || employee.role === 'KASIR';
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
  const employeeMobileTabs = isKasir
    ? [
        { id: 'pos', name: 'Kasir', icon: ShoppingCart },
        { id: 'servis', name: 'Servis & Teknisi', icon: Wrench },
      ]
    : [
        { id: 'tugas', name: 'Tugas', icon: Wrench },
        { id: 'keuangan', name: 'Keuangan', icon: Wallet },
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
        <button className="btn btn-ghost" onClick={() => useStore.getState().clearEmployee()} style={{ padding: '6px' }}>
          <LogOut size={18} color="#ef4444" />
        </button>
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
          <p>{isKasir ? 'AREA KASIR' : 'AREA KARYAWAN'}</p>
          <h2>{isKasir ? 'Kasir & Servis' : 'Tugas Hari Ini'}</h2>
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

      {isKasir ? (
        <>
          <div className="employee-section-switcher" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${kasirTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('pos')}>
              Kasir POS
            </button>
            <button className={`btn ${kasirTab === 'servis' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setKasirTab('servis')}>
              Servis & Teknisi
            </button>
          </div>

          {kasirTab === 'pos' ? (
            <POSView products={products} transactions={transactions} onTransactionCreated={fetchTransactions} />
          ) : (
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
          )}
        </>
      ) : (
        <>
          <div className="employee-section-switcher" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <button className={`btn ${activeTab === 'tugas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('tugas')}>
              Daftar Tugas
            </button>
            <button className={`btn ${activeTab === 'keuangan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('keuangan')}>
              Keuangan Saya
            </button>
          </div>

          {activeTab === 'tugas' && (
            <>
              <div className="glass-panel technician-task-list">
                <div className="technician-task-list-header">
                  <div><h3>Daftar Tugas Servis</h3><p>Unit yang ditugaskan kepada Anda.</p></div>
                  <span>{services.filter(s => String(s.technician_id) === String(employee.id) && s.status !== 'DIAMBIL').length} aktif</span>
                </div>
                {services.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada antrian servis.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {services.filter(s => s.technician_id === employee.id).length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Anda belum memiliki tugas servis aktif.</p>
                    ) : services.filter(s => s.technician_id === employee.id).map(s => (
                      <div key={s.resi} className="technician-task-card" style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="technician-task-detail" style={{ flex: 1 }}>
                          <div className="technician-task-title"><strong>{s.device_name}</strong><span className="badge badge-info">{s.status || 'PROSES'}</span></div>
                          <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>Keluhan: {s.issue}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Resi: {s.resi} | Pelanggan: {s.customer_name}</div>
                        </div>
                        <div className="technician-task-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                          
                          {s.status !== 'DIAMBIL' ? (
                            <select 
                              className="input-field" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px', background: 'white' }}
                              value={s.status || 'PROSES'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'SELESAI') {
                                  setSelectedService(s);
                                  setShowSelesaiModal(true);
                                } else if (newStatus === 'DI AMBIL') {
                                  if (!s.part_fee && !s.jasa_fee) {
                                    alert('Isi rincian biaya servis lewat status Selesai terlebih dahulu sebelum menandai Di Ambil.');
                                    return;
                                  }
                                  if(confirm('Ubah status menjadi Di Ambil?\n\n(Pembayaran akan masuk otomatis ke Laporan Keuangan Toko)')) {
                                    try {
                                      let updatedIssue = s.issue;
                                      const warrantyDaysStr = prompt('Berapa HARI garansi untuk servis ini?\n\n(Isi angka saja, misal: 30. Kosongkan jika tidak ada garansi)', '30');
                                      let warrantyDateStr = '';
                                      if (warrantyDaysStr && parseInt(warrantyDaysStr) > 0) {
                                        const d = new Date();
                                        d.setDate(d.getDate() + parseInt(warrantyDaysStr));
                                        warrantyDateStr = d.toLocaleDateString('id-ID');
                                        updatedIssue += `\n[Masa Garansi Servis: s/d ${warrantyDateStr}]`;
                                      }

                                      // Update the status AND the appended warranty info
                                      await apiService.post('/services/finish', {
                                        resi: s.resi,
                                        status: newStatus,
                                        part_fee: s.part_fee,
                                        jasa_fee: s.jasa_fee,
                                        technician_id: s.technician_id,
                                        issue: updatedIssue
                                      });

                                      const discountMatch = (updatedIssue || '').match(/\[Diskon: Rp (.*?)\]/);
                                      const discountStr = discountMatch ? discountMatch[1].replace(/\./g, '') : '0';
                                      const discount = parseInt(discountStr) || 0;

                                      const jasaFee = s.jasa_fee || 0;
                                      const partFee = s.part_fee || 0;
                                      const jasaAfterDiscount = Math.max(0, jasaFee - discount);
                                      
                                      if (jasaAfterDiscount > 0 || (jasaFee === 0 && partFee === 0)) {
                                        await apiService.post('/transactions', {
                                          tenant_code: employee.tenant_code || tenant.code,
                                          type: 'INCOME_JASA',
                                          amount: jasaAfterDiscount,
                                          description: `Jasa Servis Resi ${s.resi} (${s.customer_name})`
                                        });
                                      }
                                      if (partFee > 0) {
                                        await apiService.post('/transactions', {
                                          tenant_code: employee.tenant_code || tenant.code,
                                          type: 'INCOME_SPAREPART',
                                          amount: partFee,
                                          description: `Sparepart Servis Resi ${s.resi} (${s.customer_name})`
                                        });
                                      }
                                      fetchServices();
                                      fetchTransactions();
                                      
                                      if (confirm('Servis Lunas! Ingin mencetak Nota Pengambilan?')) {
                                        setSelectedService({ ...s, issue: updatedIssue });
                                        setPrintType('pengambilan');
                                        setShowPrintModal(true);
                                      }
                                    } catch(err) { alert('Gagal update status / transaksi'); }
                                  }
                                } else {
                                  try {
                                    await apiService.post(`/services/${s.resi}/status`, { status: newStatus });
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
                                  if (s.status !== 'SELESAI') return null; // Only show DIAMBIL if currently SELESAI
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
                  <h2 style={{ margin: 0, color: 'var(--accent)' }}>Rp {totalKomisi.toLocaleString('id-ID')}</h2>
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
            </div>
          )}
        </>
      )}

      {/* Hidden iframe for printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Receipt Printer" />

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
                  status: 'SELESAI',
                  part_fee: partFee,
                  jasa_fee: jasaFee,
                  technician_id: employee.id,
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
                
                const notificationResult = await sendWhatsAppNotification({
                  tenant,
                  target: selectedService.customer_phone,
                  message,
                  openManual: true,
                });
                if (notificationResult.status === 'failed') {
                  console.error('Gagal mengirim WA pelanggan:', notificationResult.error);
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
                  <input type="text" id="partNameManualInput" name="part_name_manual" className="input-field" placeholder="Misal: LCD Samsung J2" style={{ marginBottom: '10px' }} />
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Total Biaya Sparepart (Rp)</label>
                  <input type="number" id="partFeeInput" name="part_fee" className="input-field" defaultValue="0" required style={{ marginBottom: '0' }} />
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
                  <input type="number" id="jasaFeeInput" name="jasa_fee" className="input-field" defaultValue="0" required style={{ marginBottom: '0' }} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>Diskon Khusus (Rp)</label>
                  <input type="number" name="diskon" className="input-field" defaultValue="0" placeholder="Opsional" style={{ marginBottom: '0' }} />
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
              
              const waText = `Halo kak ${selectedService.customer_name}, dari ${tenant?.name || 'Toko Servis'}.\n\nSetelah kami lakukan pengecekan pada perangkat ${selectedService.device_name} kakak, ternyata memerlukan perbaikan/penggantian *${partName}*.\n\nEstimasi biaya totalnya adalah *Rp ${parseInt(estPrice).toLocaleString('id-ID')}*.\n\nApakah kakak setuju untuk kami lanjutkan perbaikannya? Mohon konfirmasinya ya kak. Terima kasih! 🙏`;
              const waUrl = buildManualWhatsAppUrl(selectedService.customer_phone, waText);
              window.open(waUrl, '_blank');
              setShowPersetujuanModal(false);
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Tindakan / Nama Sparepart:</label>
              <input type="text" name="part" className="input-field" placeholder="Misal: Ganti LCD & Baterai" required style={{ marginBottom: '10px' }} />
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Estimasi Total Biaya (Rp):</label>
              <input type="number" name="price" className="input-field" placeholder="Misal: 450000" required style={{ marginBottom: '20px' }} />
              
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
            <label className="label">Biaya Sparepart (Rp)</label>
            <input name="part_fee" type="number" min="0" className="input-field" defaultValue={selectedService.part_fee || 0} required />
            <label className="label">Biaya Jasa (Rp)</label>
            <input name="jasa_fee" type="number" min="0" className="input-field" defaultValue={selectedService.jasa_fee || 0} required />
            <label className="label">Diskon Nota (Rp)</label>
            <input name="discount" type="number" min="0" className="input-field" defaultValue={getServiceDiscount(selectedService.issue || '')} />
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
              <input id="bon-amount" name="amount" type="number" min="1000" step="1000" inputMode="numeric" className="input-field" placeholder="Contoh: 100000" required autoFocus />
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

    </div>
    </div>
  );
}
