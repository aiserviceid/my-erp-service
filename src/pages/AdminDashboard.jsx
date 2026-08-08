import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { LogOut, LayoutDashboard, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, MessageSquare, DollarSign, X, Trash, Plus, Wallet, Building2, Check, ExternalLink, Gift, Printer, Camera, AlertTriangle, Download, Smartphone, Image as ImageIcon, Edit, Upload, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import Barcode from 'react-barcode';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import { apiService } from '../services/api';
import { buildManualWhatsAppUrl, sendWhatsAppNotification } from '../services/notificationService';
import { compressImageFile } from '../utils/imageCompressor';
import ForumCommunity from '../components/ForumCommunity';
import POSView from '../components/POSView';
import BarcodeScanner from '../components/BarcodeScanner';
import UpgradePrompt from '../components/UpgradePrompt';
import MobileTabBar from '../components/MobileTabBar';
import PremiumDashboardSummary from '../components/PremiumDashboardSummary';
import CustomerCRMInsights from '../components/CustomerCRMInsights';
import PremiumFinanceReport from '../components/PremiumFinanceReport';
import OnboardingProgressCard from '../components/OnboardingProgressCard';
import SecurityReadinessPanel from '../components/SecurityReadinessPanel';
import { ADMIN_TABS, SERVICE_STATUSES, getStatusInfo, hasFeature, isWithinLimit, getUsagePercent } from '../config/tierLimits';
import { APP_VERSION, APK_PUBLIC_URL } from '../config/appInfo';
import { UNITPRO_LOGO_URL, getTenantLogoUrl } from '../utils/branding';
import { t, getAppLanguage, setAppLanguage } from '../utils/i18n';

export default function AdminDashboard() {
  const { tenant, setTenant, clearTenant, updateTenantSettings, cart, addToCart, removeFromCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentLang, setCurrentLang] = useState(getAppLanguage());
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditServiceNota, setShowEditServiceNota] = useState(false);
  const [showServiceRegistration, setShowServiceRegistration] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [printType, setPrintType] = useState('pendaftaran');
  const printIframeRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Bulan Ini');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [obStoreName, setObStoreName] = useState('');
  const [obStoreWa, setObStoreWa] = useState('');
  const [obTheme, setObTheme] = useState('hp');
  const [obEmpName, setObEmpName] = useState('');
  const [obEmpPin, setObEmpPin] = useState('');
  const [obEmpRole, setObEmpRole] = useState('TEKNISI');
  const [settingTab, setSettingTab] = useState('umum'); // 'umum' | 'wa' | 'rekening' | 'nota' | 'promo'
  const [previewTab, setPreviewTab] = useState('servis');
  const [empTab, setEmpTab] = useState('daftar'); // 'daftar' | 'kasbon' | 'absensi'
  const [masterTab, setMasterTab] = useState('stok'); // 'stok' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [serviceTechTab, setServiceTechTab] = useState('ALL');
  const [serviceStatusTab, setServiceStatusTab] = useState('ALL');
  const [customerTab, setCustomerTab] = useState('servis');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('SPAREPART');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('0');
  const [newProdImage, setNewProdImage] = useState('');
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const appVersion = APP_VERSION;
  const latestApkUrl = APK_PUBLIC_URL;

  const openAppUpdate = async () => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: latestApkUrl });
      return;
    }
    window.open(latestApkUrl, '_blank', 'noopener,noreferrer');
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.7);
      if (compressed && callback) callback(compressed);
    } catch (err) {
      console.error('Error uploading/compressing image:', err);
      alert('Gagal memproses gambar. Pastikan format gambar valid.');
    }
  };

  const handleCreateService = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const phone = String(fd.get('phone') || '').replace(/\s/g, '');
    if (!/^(?:\+?62|0)8\d{7,12}$/.test(phone)) {
      alert('Masukkan nomor WhatsApp yang valid, contoh: 081234567890.');
      return;
    }

    const kelengkapan = fd.get('kelengkapan') || '-';
    const estWaktu = fd.get('estimasi_waktu') || '';
    const estBiaya = fd.get('estimasi_biaya') || '';
    const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}${estWaktu ? ` | Est. Waktu: ${estWaktu}` : ''}${estBiaya ? ` | Est. Biaya: Rp ${normalizeMoneyInput(estBiaya).toLocaleString('id-ID')}` : ''}`;
    const resiGenerated = `TRX-${Date.now()}`;

    try {
      await apiService.post('/services', {
        tenant_code: tenant.code,
        resi: resiGenerated,
        customer_name: fd.get('name'),
        customer_phone: phone,
        device_name: fd.get('device'),
        issue: issueText,
        technician_id: fd.get('technician_id'),
        status: 'PROSES'
      });
      alert(`Servis berhasil didaftarkan.\nResi: ${resiGenerated}\n\nTugas sudah dikirim ke teknisi yang dipilih.`);
      form.reset();
      setShowServiceRegistration(false);
      apiService.getServices(tenant.code).then(setServices);
    } catch (error) {
      alert('Gagal mendaftarkan servis. Periksa koneksi lalu coba lagi.');
    }
  };

  useEffect(() => {
    if (tenant) {
      const isReg = Boolean(
        (tenant?.name && tenant?.name !== 'AISERVICE.ID Toko' && tenant?.name !== 'UnitPro Toko') ||
        (tenant?.settings?.storeName && tenant?.settings?.storeName !== 'AISERVICE.ID Toko' && tenant?.settings?.storeName !== 'UnitPro Toko')
      );
      if (!isReg) {
        setShowOnboardingModal(true);
        setOnboardingStep(1);
      } else {
        setShowOnboardingModal(false);
      }
      setObStoreName(tenant?.settings?.storeName || tenant?.name || '');
      setObStoreWa(tenant?.settings?.store_wa || tenant?.phone || '');
      setObTheme(tenant?.settings?.theme || 'hp');
    }
  }, [tenant]);

  // Generator Demo Data Instan (40 Barang, 25 Transaksi, 10 Servis, 5 Teknisi)
  const loadDemoData = () => {
    const demoProducts = [
      { id: 'PROD-001', name: 'LCD iPhone 11 Original', price: 450000, stock: 12, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-002', name: 'Baterai MacBook Pro Retina 13"', price: 650000, stock: 5, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-003', name: 'RAM DDR4 8GB 3200MHz Laptop', price: 320000, stock: 18, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-004', name: 'SSD NVMe 512GB Kingston', price: 580000, stock: 14, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-005', name: 'Thermal Paste Arctic MX-4 4g', price: 85000, stock: 25, category: 'AKSESORIS', imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-006', name: 'Charger Laptop Universal 90W', price: 175000, stock: 8, category: 'AKSESORIS', imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-007', name: 'Flexible Keyboard Asus TUF FX505', price: 195000, stock: 3, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-008', name: 'Kipas Fan Cooler CPU Laptop Lenovo', price: 140000, stock: 2, category: 'SPAREPART', imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-009', name: 'Jasa Servis Cleaning & Thermal Paste', price: 150000, stock: 999, category: 'JASA', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
      { id: 'PROD-010', name: 'Jasa Flash BIOS & Install Windows 11', price: 100000, stock: 999, category: 'JASA', imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&auto=format&fit=crop&q=80' },
    ];
    const demoImages = [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80'
    ];
    for (let i = 11; i <= 40; i++) {
      demoProducts.push({
        id: `PROD-${100 + i}`,
        name: `Sparepart / Aksesoris Komputer Grade A #${i}`,
        price: (i * 25000) + 50000,
        stock: (i % 7) + 1,
        category: i % 2 === 0 ? 'SPAREPART' : 'AKSESORIS',
        imageUrl: demoImages[i % demoImages.length]
      });
    }

    const demoUsers = [
      { id: 'EMP-1', name: 'Andi (Teknisi Hardware)', role: 'TEKNISI', pin: '1234', phone: '081234567801' },
      { id: 'EMP-2', name: 'Budi (Teknisi Software)', role: 'TEKNISI', pin: '5678', phone: '081234567802' },
      { id: 'EMP-3', name: 'Citra (Kasir & Admin)', role: 'KASIR', pin: '1111', phone: '081234567803' },
      { id: 'EMP-4', name: 'Dedi (Teknisi Chipset)', role: 'TEKNISI', pin: '2222', phone: '081234567804' },
      { id: 'EMP-5', name: 'Eko (Senior Repair)', role: 'TEKNISI', pin: '3333', phone: '081234567805' },
    ];

    const demoServices = [
      { resi: 'TRX-1001', customer_name: 'Hendra Saputra', customer_phone: '081234567890', device_name: 'Laptop ASUS ROG Strix GL553', issue: 'Mati total terkena cairan kopi', status: 'DIKERJAKAN', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*24*2).toISOString() },
      { resi: 'TRX-1002', customer_name: 'Siti Rahma', customer_phone: '085712345678', device_name: 'MacBook Air M1 2020', issue: 'Layar blank hitam, suara nyala', status: 'DICEK', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*24*1).toISOString() },
      { resi: 'TRX-1003', customer_name: 'Bambang Wijaya', customer_phone: '081987654321', device_name: 'Lenovo ThinkPad T480', issue: 'Upgrade SSD 512GB & RAM 16GB', status: 'SELESAI', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*12).toISOString() },
      { resi: 'TRX-1004', customer_name: 'Dewi Lestari', customer_phone: '082133445566', device_name: 'Acer Nitro 5 AN515', issue: 'Kipas berisik & panas lemot', status: 'DIAMBIL', technician_id: 'EMP-4', created_at: new Date(Date.now() - 3600000*5).toISOString() },
      { resi: 'TRX-1005', customer_name: 'Rian Pratama', customer_phone: '087811223344', device_name: 'HP Pavilion Gaming 15', issue: 'Keyboard eror pencet sendiri', status: 'MENUNGGU_PART', technician_id: 'EMP-5', created_at: new Date(Date.now() - 3600000*3).toISOString() },
      { resi: 'TRX-1006', customer_name: 'Fikri Haikal', customer_phone: '081299887766', device_name: 'Dell XPS 13 9360', issue: 'Baterai kembung mati diisi', status: 'PROSES', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*1).toISOString() },
      { resi: 'TRX-1007', customer_name: 'Maya Indah', customer_phone: '085244556677', device_name: 'Asus Vivobook A412F', issue: 'Engsel patah & casing pecah', status: 'DIKERJAKAN', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*4).toISOString() },
      { resi: 'TRX-1008', customer_name: 'Guntur Pamungkas', customer_phone: '081377889900', device_name: 'PC Desktop Gaming i5-12400F', issue: 'No display vga tidak terbaca', status: 'DICEK', technician_id: 'EMP-4', created_at: new Date(Date.now() - 3600000*8).toISOString() },
      { resi: 'TRX-1009', customer_name: 'Tania Putri', customer_phone: '089655443322', device_name: 'Lenovo Ideapad Slim 3', issue: 'Install ulang Windows 11 Original', status: 'SELESAI', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*2).toISOString() },
      { resi: 'TRX-1010', customer_name: 'Eka Kurniawan', customer_phone: '081266778899', device_name: 'MacBook Pro 15" 2017', issue: 'Ganti baterai & cleaning pasta', status: 'SELESAI', technician_id: 'EMP-5', created_at: new Date(Date.now() - 3600000*6).toISOString() }
    ];

    const demoTransactions = [];
    for (let i = 1; i <= 25; i++) {
      demoTransactions.push({
        id: `TRX-POS-${100 + i}`,
        tenant_code: tenant.code,
        type: i % 4 === 0 ? 'EXPENSE' : i % 3 === 0 ? 'INCOME' : 'POS_SALES',
        amount: i % 4 === 0 ? 150000 : (i * 85000) + 120000,
        description: i % 4 === 0 ? 'Beli Kertas Struk & Konsumsi Toko' : `Penjualan Kasir / Servis #${i}`,
        created_at: new Date(Date.now() - (i * 3600000 * 6)).toISOString()
      });
    }

    setProducts(demoProducts);
    setUsers(demoUsers);
    setServices(demoServices);
    setTransactions(demoTransactions);
    alert('✨ Demo Data Instan Berhasil Dimuat!\n\n40 Barang, 25 Transaksi, 10 Servis, & 5 Teknisi aktif sekarang.');
  };
  
  const exportToExcel = (txs) => {
    // 1. Kalkulasi Ringkasan
    const totalServisJasa = txs.filter(t => t.type === 'INCOME' || t.type === 'INCOME_JASA').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalServisSparepart = txs.filter(t => t.type === 'INCOME_SPAREPART').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPOS = txs.filter(t => t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpense = txs.filter(t => t.type === 'BON_KARYAWAN' || t.type === 'EXPENSE' || t.type === 'WITHDRAWAL').reduce((sum, t) => sum + (t.amount || 0), 0);
    const netProfit = (totalServisJasa + totalServisSparepart + totalPOS) - totalExpense;

    // 2. Buat Struktur Laporan (Array of Arrays)
    const aoa = [
      [`LAPORAN KEUANGAN TOKO - ${(tenant?.name || 'UMUM').toUpperCase()}`],
      [`Tanggal Ekspor:`, new Date().toLocaleString('id-ID')],
      [`Filter Rentang:`, timeFilter],
      [],
      ['=== RINGKASAN KEUANGAN ==='],
      ['Pemasukan Servis (Jasa)', totalServisJasa],
      ['Pemasukan Servis (Sparepart)', totalServisSparepart],
      ['Penjualan Kasir (POS)', totalPOS],
      ['Total Pengeluaran / Kasbon', totalExpense],
      ['LABA BERSIH KAS', netProfit],
      [],
      ['=== RINCIAN TRANSAKSI ==='],
      ['Tanggal & Waktu', 'Kategori', 'Keterangan', 'Nominal (Rp)', 'Tipe Sistem']
    ];

    // 3. Masukkan Data Transaksi
    txs.forEach(t => {
      const typeStr = t.type === 'INCOME' || t.type.startsWith('INCOME_') ? 'Pendapatan Servis' : t.type === 'POS_SALES' ? 'Penjualan Kasir' : t.type === 'BON_KARYAWAN' ? 'Kasbon/Pinjaman' : t.type === 'EXPENSE' ? 'Pengeluaran Lain' : t.type === 'WITHDRAWAL' ? 'Tarik Saldo Laba' : 'Lainnya';
      const amount = (t.type === 'INCOME' || t.type.startsWith('INCOME_') || t.type === 'POS_SALES' ? t.amount : -t.amount);
      aoa.push([
        new Date(t.created_at).toLocaleString('id-ID'),
        typeStr,
        t.description || '-',
        amount,
        t.type
      ]);
    });

    // 4. Konversi ke Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    // 5. Percantik Tampilan Excel (Styling, Lebar Kolom & Merge Cell)
    
    // Define styles
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } };
    const sectionTitleStyle = { font: { bold: true, color: { rgb: "0F172A" }, sz: 12 }, fill: { fgColor: { rgb: "F1F5F9" } }, border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } }, top: { style: "thin", color: { rgb: "CBD5E1" } } } };
    const subHeaderStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "334155" } }, alignment: { horizontal: "center" }, border: { bottom: { style: "medium", color: { rgb: "000000" } } } };
    const moneyStyle = { numFmt: '"Rp"#,##0;[Red]\-"Rp"#,##0', font: { name: "Arial" } };
    const profitStyle = { font: { bold: true, color: { rgb: "059669" }, sz: 12 }, fill: { fgColor: { rgb: "ECFDF5" } }, numFmt: '"Rp"#,##0;[Red]\-"Rp"#,##0' };
    const expenseStyle = { font: { color: { rgb: "DC2626" }, bold: true }, numFmt: '"Rp"#,##0;[Red]\-"Rp"#,##0' };
    const boldStyle = { font: { bold: true } };

    // Apply Styles to specific cells
    for (const cellAddress in worksheet) {
      if (cellAddress[0] === '!') continue;
      const cell = worksheet[cellAddress];
      const col = cellAddress.replace(/[0-9]/g, '');
      const row = parseInt(cellAddress.replace(/\D/g, '')) - 1; // 0-indexed

      // Default font
      if (!cell.s) cell.s = { font: { name: "Arial", sz: 11 }, alignment: { vertical: "center" } };

      // Number formatting for money
      if ((row >= 5 && row <= 8 && col === 'B') || (row >= 13 && col === 'D')) {
        cell.s = { ...cell.s, ...moneyStyle };
      }

      // Title (Row 0)
      if (row === 0) cell.s = headerStyle;
      
      // Section Headers (Row 4 and 11)
      if (row === 4 || row === 11) cell.s = sectionTitleStyle;
      
      // Ringkasan Labels bold
      if (row >= 5 && row <= 8 && col === 'A') cell.s = { ...cell.s, ...boldStyle };

      // Laba Bersih Kas (Row 9)
      if (row === 9) cell.s = { ...cell.s, ...profitStyle };

      // Pengeluaran di Ringkasan (Row 8)
      if (row === 8 && col === 'B') cell.s = { ...cell.s, ...expenseStyle };

      // Header Tabel Rincian (Row 12)
      if (row === 12) cell.s = subHeaderStyle;
      
      // Highlight row for expense/income in details table
      if (row >= 13 && col === 'D') {
         if (cell.v < 0) cell.s = { ...cell.s, font: { color: { rgb: "DC2626" }, bold: true }, numFmt: '"Rp"#,##0;[Red]\-"Rp"#,##0' };
         else cell.s = { ...cell.s, font: { color: { rgb: "059669" }, bold: true }, numFmt: '"Rp"#,##0;[Red]\-"Rp"#,##0' };
      }
    }

    worksheet['!cols'] = [
      {wch: 22}, // Tanggal
      {wch: 25}, // Kategori
      {wch: 45}, // Keterangan
      {wch: 20}, // Nominal
      {wch: 20}  // Tipe
    ];

    worksheet['!merges'] = [
      { s: {r:0, c:0}, e: {r:0, c:4} }, // Merge Judul Utama
      { s: {r:4, c:0}, e: {r:4, c:4} }, // Merge Header Ringkasan
      { s: {r:11, c:0}, e: {r:11, c:4} } // Merge Header Rincian
    ];

    // 6. Simpan File
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
    const safeName = tenant?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Toko';
    XLSX.writeFile(workbook, `Laporan_Keuangan_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const doPrint = (printerType) => {
    if (!selectedService) return;
    const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow.document;
    doc.open();
    
    let htmlContent = '';
    const dateStr = new Date().toLocaleString('id-ID');
    const trackingUrl = `${window.location.origin}/track`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedService.resi)}`;
    
    const css = `
      <style>
        body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: ${printerType === 'thermal' ? '0' : '20px'}; background: #fff; }
        .receipt-container { position: relative; overflow: hidden; max-width: ${printerType === 'thermal' ? '300px' : '700px'}; margin: 0 auto; background: #fff; border: ${printerType === 'thermal' ? 'none' : '1px solid #e2e8f0'}; padding: ${printerType === 'thermal' ? '12px' : '40px'}; border-radius: 12px; }
        .free-watermark { position: absolute; left: 50%; top: 54%; width: ${printerType === 'thermal' ? '230px' : '500px'}; max-width: 86%; transform: translate(-50%, -50%) rotate(-14deg); opacity: ${printerType === 'thermal' ? '0.08' : '0.07'}; pointer-events: none; z-index: 0; }
        .receipt-container > :not(.free-watermark) { position: relative; z-index: 1; }
        .header { text-align: center; margin-bottom: 24px; }
        .header-title-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; }
        .logo { max-height: ${printerType === 'thermal' ? '35px' : '50px'}; }
        .header h2 { margin: 0; color: #0f172a; font-size: ${printerType === 'thermal' ? '1.2rem' : '1.8rem'}; font-weight: 800; text-transform: uppercase; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: ${printerType === 'thermal' ? '0.75rem' : '0.95rem'}; font-weight: 600; letter-spacing: 1px; }
        .divider { border-top: 1px dashed #cbd5e1; margin: 16px 0; }
        .info-grid { display: grid; grid-template-columns: ${printerType === 'thermal' ? '1fr' : '1fr 1fr'}; gap: ${printerType === 'thermal' ? '8px' : '16px'}; font-size: ${printerType === 'thermal' ? '0.8rem' : '0.95rem'}; margin-bottom: 24px; }
        .info-item { margin: 0; display: flex; flex-direction: ${printerType === 'thermal' ? 'row' : 'column'}; justify-content: space-between; gap: 4px; }
        .info-item strong { color: #64748b; font-weight: 600; font-size: 0.85em; text-transform: uppercase; }
        .info-item span { color: #0f172a; font-weight: 700; text-align: ${printerType === 'thermal' ? 'right' : 'left'}; }
        .issue-box { background: #f8fafc; padding: 12px; border-radius: 8px; font-size: ${printerType === 'thermal' ? '0.8rem' : '0.95rem'}; color: #334155; margin-bottom: 24px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.5; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: ${printerType === 'thermal' ? '0.8rem' : '0.95rem'}; }
        .table th { border-bottom: 1px solid #cbd5e1; padding: 8px 0; text-align: left; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: ${printerType === 'thermal' ? '1.1rem' : '1.3rem'}; color: #0f172a; border-bottom: none; border-top: 2px solid #cbd5e1; padding-top: 12px; }
        .qr-section { text-align: center; margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; }
        .qr-section img { width: ${printerType === 'thermal' ? '100px' : '120px'}; height: ${printerType === 'thermal' ? '100px' : '120px'}; margin-bottom: 8px; }
        .qr-section p { margin: 0; font-size: ${printerType === 'thermal' ? '0.75rem' : '0.9rem'}; color: #64748b; font-weight: 600; }
        .footer { text-align: center; margin-top: 32px; font-size: ${printerType === 'thermal' ? '0.75rem' : '0.85rem'}; color: #94a3b8; }
        .bank-info { background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; font-size: ${printerType === 'thermal' ? '0.75rem' : '0.85rem'}; margin: 20px 0; border: 1px solid #e2e8f0; color: #475569; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-container { border: none; padding: ${printerType === 'thermal' ? '0' : '10px'}; box-shadow: none; } }
      </style>
    `;
    
    const activeLogoUrl = getTenantLogoUrl(tenant?.tier, tenant?.settings);
    const freeWatermarkHtml = isFree ? `<img src="${UNITPRO_LOGO_URL}" class="free-watermark" alt="" />` : '';
    const logoHtml = `<img src="${activeLogoUrl}" class="logo" alt="Logo" />`;

    if (printType === 'pendaftaran') {
      htmlContent = `
        <div class="receipt-container">
          ${freeWatermarkHtml}
          <div class="header">
            <div class="header-title-row">
              ${logoHtml}
              <h2>${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}</h2>
            </div>
            <p>NOTA PENDAFTARAN SERVIS</p>
          </div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-item"><strong>No. Resi</strong> <span>${selectedService.resi}</span></div>
            <div class="info-item"><strong>Tanggal</strong> <span>${dateStr}</span></div>
            <div class="info-item"><strong>Pelanggan</strong> <span>${selectedService.customer_name}</span></div>
            <div class="info-item"><strong>No. HP</strong> <span>${selectedService.customer_phone}</span></div>
            <div class="info-item" style="grid-column: 1 / -1;"><strong>Perangkat</strong> <span>${selectedService.device_name}</span></div>
          </div>
          <div><strong style="color: #64748b; font-size: 0.85em; text-transform: uppercase;">Keluhan & Kelengkapan:</strong></div>
          <div class="issue-box">${selectedService.issue}</div>
          
          <div class="qr-section">
            <img src="${qrCodeUrl}" alt="QR Code Tracking" />
            <p>Scan QR untuk cek status servis<br/>atau kunjungi: <strong>${trackingUrl}</strong></p>
          </div>

          ${paymentInfoText ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${paymentInfoText.replace(/\n/g, '<br/>')}</div>` : ''}
          ${qrisImageUrl ? `<div class="qr-section"><img src="${qrisImageUrl}" alt="QRIS Pembayaran" /><p>Scan QRIS untuk pembayaran</p></div>` : ''}
          
          <div class="divider"></div>
          <div class="footer">
            ${tenant?.settings?.receipt_note_service ? `<p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">${tenant.settings.receipt_note_service.replace(/\n/g, '<br/>')}</p>` : `<p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">Simpan struk ini sebagai bukti pengambilan.</p>`}
            <p style="margin: 0;">Terima kasih atas kepercayaan Anda.</p>
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
          ${freeWatermarkHtml}
          <div class="header">
            <div class="header-title-row">
              ${logoHtml}
              <h2>${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}</h2>
            </div>
            <p>NOTA PELUNASAN SERVIS</p>
          </div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-item"><strong>No. Resi</strong> <span>${selectedService.resi}</span></div>
            <div class="info-item"><strong>Tanggal</strong> <span>${dateStr}</span></div>
            <div class="info-item"><strong>Pelanggan</strong> <span>${selectedService.customer_name}</span></div>
            <div class="info-item"><strong>Perangkat</strong> <span>${selectedService.device_name}</span></div>
          </div>
          
          <div><strong style="color: #64748b; font-size: 0.85em; text-transform: uppercase;">Rincian Perbaikan:</strong></div>
          <div class="issue-box">${(selectedService.issue || '').replace(/\n\[Diskon: .*?\]/, '')}</div>
          
          <table class="table">
            <thead>
              <tr><th>Keterangan</th><th class="text-right">Biaya (Rp)</th></tr>
            </thead>
            <tbody>
              <tr><td>Biaya Sparepart</td><td class="text-right">${(selectedService.part_fee || 0).toLocaleString('id-ID')}</td></tr>
              <tr><td>Biaya Jasa Servis</td><td class="text-right">${(selectedService.jasa_fee || 0).toLocaleString('id-ID')}</td></tr>
              ${discount > 0 ? `
              <tr><td>Subtotal</td><td class="text-right">${subtotal.toLocaleString('id-ID')}</td></tr>
              <tr><td style="color: #ef4444; font-weight: 600;">Diskon Khusus</td><td class="text-right" style="color: #ef4444; font-weight: 600;">- ${discount.toLocaleString('id-ID')}</td></tr>
              ` : ''}
              <tr class="total-row"><td>TOTAL LUNAS</td><td class="text-right">${total.toLocaleString('id-ID')}</td></tr>
            </tbody>
          </table>
          
          ${paymentInfoText ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${paymentInfoText.replace(/\n/g, '<br/>')}</div>` : ''}
          ${qrisImageUrl ? `<div class="qr-section"><img src="${qrisImageUrl}" alt="QRIS Pembayaran" /><p>Scan QRIS untuk pembayaran</p></div>` : ''}
          
          <div class="qr-section">
            <img src="${qrCodeUrl}" alt="QR Code Tracking" />
            <p>Scan QR untuk cek garansi & status<br/>atau kunjungi: <strong>${trackingUrl}</strong></p>
          </div>

          <div class="divider"></div>
          <div class="footer">
            ${tenant?.settings?.receipt_note_service ? `<p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">${tenant.settings.receipt_note_service.replace(/\n/g, '<br/>')}</p>` : `<p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">Terima kasih atas kepercayaan Anda!</p>`}
            <p style="margin: 0;">Barang yang sudah diambil tidak dapat dikembalikan / ditukar.</p>
          </div>
        </div>
      `;
    }
    
    doc.write(`<html><head><title>Print Nota - ${selectedService.resi}</title>${css}</head><body onload="setTimeout(function(){ window.print(); window.close(); }, 500);">${htmlContent}</body></html>`);
    doc.close();
    setShowPrintModal(false);
  };
  
  // Multi Branch States
  const [branches, setBranches] = useState([]);
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');

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
  const normalizeMoneyInput = (value) => {
    const parsed = parseInt(String(value || '').replace(/[^\d]/g, ''));
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
        tenant_code: selectedService.tenant_code || tenant?.code,
        ...(selectedService.__markSelesaiFromAdmin ? { status: 'SELESAI' } : {}),
        part_fee: partFee,
        jasa_fee: jasaFee,
        issue: updatedIssue
      });
      const nextService = { ...selectedService, ...updatedService, ...(selectedService.__markSelesaiFromAdmin ? { status: 'SELESAI' } : {}), part_fee: partFee, jasa_fee: jasaFee, issue: updatedIssue };
      setSelectedService(nextService);
      setServices(services.map(s => s.resi === selectedService.resi ? { ...s, ...nextService } : s));
      setShowEditServiceNota(false);
      alert(selectedService.__markSelesaiFromAdmin ? 'Rincian tagihan berhasil disimpan dan status menjadi Selesai.' : 'Nota servis berhasil dikoreksi.');
    } catch (err) {
      alert('Gagal menyimpan koreksi nota.');
    }
  };
  const isFree = tenant?.tier === 'free';
  const isEnterprise = tenant?.tier === 'enterprise';
  const canUseCustomBranding = hasFeature(tenant?.tier, 'customBranding');
  const tenantLogoUrl = getTenantLogoUrl(tenant?.tier, settings);
  const tenantLogoOpacity = 1;

  const trialDaysLeft = settings.trial_ends_at 
    ? Math.max(0, Math.ceil((settings.trial_ends_at - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  useEffect(() => {
    if (tenant?.code === 'DEMO-STORE') {
      loadDemoData();
    } else if (tenant?.code) {
      apiService.getProducts(tenant.code).then(setProducts);
      if (apiService.getAuditLogs) apiService.getAuditLogs(tenant.code).then(setAuditLogs).catch(() => {});
      apiService.getServices(tenant.code).then(setServices);
      apiService.getUsers(tenant.code).then(setUsers);
      apiService.get(`/transactions/${tenant.code}`).then(setTransactions).catch(() => {});
      
      // Auto-sync tier and settings from server
      apiService.getTenantPublic(tenant.code).then(async data => {
        if (data) {
          let updatedTier = data.tier;
          let updatedSettings = typeof data.settings === 'string' ? JSON.parse(data.settings) : (data.settings || {});

          // Trial Expiration Logic
          if (updatedSettings.trial_ends_at) {
            if (Date.now() > updatedSettings.trial_ends_at) {
              try {
                const newSet = { ...updatedSettings };
                delete newSet.trial_ends_at;
                
                await apiService.updateTenantSettings(tenant.code, newSet);
                await apiService.updateTenantTier(tenant.code, 'free');
                
                updatedTier = 'free';
                updatedSettings = newSet;
                alert('⏳ Masa uji coba (trial) paket Anda telah berakhir. Akun Anda kembali ke versi Starter (Gratis).');
              } catch (e) {
                console.error('Gagal downgrade trial:', e);
              }
            }
          }

          if (updatedTier && updatedTier !== tenant.tier) {
            setTenant(tenant.code, data.name || tenant.name, '', updatedTier, tenant.token);
          }
          if (JSON.stringify(updatedSettings) !== JSON.stringify(tenant.settings)) {
            updateTenantSettings(updatedSettings);
          }
        }
      }).catch(() => {});
    }
  }, [tenant?.code]);

  useEffect(() => {
    // Load saved branches from settings or localStorage
    const savedBranches = settings.branches || [
      { code: tenant?.code, name: tenant?.name || 'Cabang Utama (Pusat)' }
    ];
    setBranches(savedBranches);
  }, [tenant?.code, settings.branches]);

  const handleLogout = () => {
    clearTenant();
    navigate('/');
  };

  const handleAddBranch = async () => {
    if (!isEnterprise) {
      return alert('Fitur Multi-Cabang khusus untuk paket Enterprise (Rp 79rb/bln). Hubungi Admin untuk upgrade.');
    }
    const cleanCode = newBranchCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    const cleanName = newBranchName.trim();
    if (!cleanCode || !cleanName) return alert('Kode Cabang dan Nama Cabang wajib diisi!');
    if (branches.length >= 5) return alert('Batas maksimal 5 cabang telah tercapai untuk paket Enterprise.');

    try {
      // Auto register the new branch tenant in Supabase
      await apiService.loginTenant(cleanCode, cleanName, '');
      const updatedList = [...branches, { code: cleanCode, name: cleanName }];
      setBranches(updatedList);
      updateTenantSettings({ branches: updatedList });
      setNewBranchCode('');
      setNewBranchName('');
      alert(`Cabang "${cleanName}" (${cleanCode}) berhasil ditambahkan!`);
    } catch (e) {
      alert('Gagal menambahkan cabang: ' + e.message);
    }
  };

  const handleSwitchBranch = (b) => {
    setTenant(b.code, b.name, '', tenant.tier, tenant.token);
    alert(`Berhasil beralih ke cabang: ${b.name} (${b.code})`);
  };

  // Icon mapping for dynamic tabs
  const iconMap = { LayoutDashboard, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, MessageSquare };

  const todayStr = new Date().toDateString();
  const newServiceCount = services.filter(s => new Date(s.created_at || Date.now()).toDateString() === todayStr && s.status === 'PROSES').length;
  const newAttendanceCount = transactions.filter(t => t.type === 'ATTENDANCE_IN' && new Date(t.created_at).toDateString() === todayStr).length;
  const pendingKasbonCount = transactions.filter(t => t.type === 'BON_PENDING').length;

  // Build tabs based on tier config — hide wallet/affiliate/multi-branch for Fase 1
  const tabs = ADMIN_TABS.map(tabItem => {
    let badge = tabItem.proOnly && isFree ? 'PRO' : null;
    if (tabItem.id === 'servis' && newServiceCount > 0) badge = newServiceCount;
    if (tabItem.id === 'karyawan' && (newAttendanceCount + pendingKasbonCount) > 0) badge = newAttendanceCount + pendingKasbonCount;
    return {
      ...tabItem,
      name: t('tab_' + tabItem.id, tabItem.name, currentLang),
      icon: iconMap[tabItem.iconName] || Package,
      badge: badge,
    };
  });


  // Monthly service/transaction counts for limit enforcement  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyServiceCount = services.filter(s => {
    const d = new Date(s.created_at || Date.now());
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  const monthlyTxCount = transactions.filter(t => {
    const d = new Date(t.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'POS_SALES';
  }).length;
  const serviceLimit = isWithinLimit(tenant?.tier, 'maxServicesPerMonth', monthlyServiceCount);
  const txLimit = isWithinLimit(tenant?.tier, 'maxTransactionsPerMonth', monthlyTxCount);

  const updateServiceStatusFromAction = async (service, newStatus) => {
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
        const message = `Halo Kak ${service.customer_name}, status servis ${service.device_name} (Resi: ${service.resi}) dari *${storeName}* sekarang: *${getStatusInfo(newStatus).label}*.\n\nCek status langsung di sini:\n${trackingUrl}`;
        await sendWhatsAppNotification({ tenant, target: service.customer_phone, message, openManual: true });
      }
    } catch (error) {
      alert('Gagal update status');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* MOBILE TOP BAR (Visible only on mobile) */}
      <header className="mobile-top-bar native-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={tenantLogoUrl} alt="Logo" style={{ height: '42px', maxWidth: '160px', objectFit: 'contain', opacity: tenantLogoOpacity }} />
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.95rem' }}>{settings.storeName || 'UnitPro'}</h3>
            <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={10} /> {tenant?.name || tenant?.code}
            </div>
            {trialDaysLeft !== null && (
              <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 'bold' }}>
                ⏳ Sisa Trial: {trialDaysLeft} Hari
              </div>
            )}
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '6px' }}>
          <LogOut size={18} color="#ef4444" />
        </button>
      </header>

      <MobileTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* SIDEBAR (Desktop only) */}
      <div className="sidebar animate-slide-in">
        <div style={{ padding: '1.2rem 1rem 0.8rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
          <img src={tenantLogoUrl} alt="Logo" style={{ height: '78px', maxWidth: '220px', objectFit: 'contain', opacity: tenantLogoOpacity, display: 'block', margin: '0 auto 2px auto' }} />
          <div style={{ margin: '2px 0 4px 0', color: '#475569', fontSize: '0.82rem', fontWeight: '600' }}>{settings.storeName || 'UnitPro Toko'}</div>

          
          {/* Active Branch Badge */}
          <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
            <Building2 size={12} /> {tenant?.name || tenant?.code}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Tier: <strong style={{ color: isEnterprise ? '#7c3aed' : isFree ? '#64748b' : '#0284c7', textTransform: 'uppercase' }}>{tenant?.tier || 'free'}</strong>
          </div>
          {trialDaysLeft !== null && (
            <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: '2px', fontWeight: 'bold' }}>
              ⏳ Sisa Trial: {trialDaysLeft} Hari
            </div>
          )}
        </div>

        {/* Branch Quick Switcher for Enterprise */}
        {isEnterprise && branches.length > 1 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Beralih Cabang:</label>
            <select 
              value={tenant?.code} 
              onChange={(e) => {
                const target = branches.find(b => b.code === e.target.value);
                if (target) handleSwitchBranch(target);
              }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '600', background: '#f8fafc' }}
            >
              {branches.map(b => (
                <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1 }}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <tab.icon size={18} /> {tab.name}
              </div>
              {tab.badge && (
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: isEnterprise ? '#dcfce7' : '#fee2e2', color: isEnterprise ? '#166534' : '#991b1b', fontWeight: '800' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%' }}>
          <LogOut size={18} /> Keluar
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content animate-fade-in">
        <div className="native-screen-heading">
          <p>OPERASIONAL TOKO</p>
          <h2 style={{ marginBottom: '1.5rem' }}>{tabs.find(t => t.id === activeTab)?.name}</h2>
        </div>
        
        {/* Usage Banner for Free tier */}
        {isFree && (activeTab === 'pos' || activeTab === 'servis') && (
          <UpgradePrompt
            mode="banner"
            currentUsage={activeTab === 'pos' ? monthlyTxCount : monthlyServiceCount}
            maxUsage={activeTab === 'pos' ? txLimit.limit : serviceLimit.limit}
            usageLabel={activeTab === 'pos' ? 'transaksi POS bulan ini' : 'servis bulan ini'}
          />
        )}

        {/* 0. EXECUTIVE DASHBOARD (FASE 1 ROADMAP) */}
        {activeTab === 'dashboard' ? (
          <div className="dashboard-overview" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            <PremiumDashboardSummary
              services={services}
              transactions={transactions}
              products={products}
              onCreateService={() => setShowServiceRegistration(true)}
              onOpenCashier={() => setActiveTab('pos')}
              onOpenCustomers={() => setActiveTab('pelanggan')}
              onOpenTracking={() => window.open('/tracking', '_blank', 'noopener,noreferrer')}
            />
            
            {/* TOP BAR / MAGIC DEMO BUTTON BAR */}
            <div className="dashboard-store-hero" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '1.2rem 1.6rem', borderRadius: '18px', color: 'white', flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <p className="dashboard-hero-kicker">RINGKASAN OPERASIONAL</p>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>
                  {tenant?.settings?.storeName || tenant?.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Mode: <span style={{ color: '#38bdf8', fontWeight: '800' }}>Paket {tenant?.tier === 'pro' ? 'Pro Titan' : tenant?.tier === 'enterprise' ? 'Enterprise' : 'Starter'}</span> • ID Toko: <span style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{tenant?.code}</span>
                </div>
              </div>
              <div className="dashboard-quick-actions">
                <button className="btn btn-primary" onClick={() => { setActiveTab('servis'); setShowServiceRegistration(true); }}>
                  <Plus size={17} /> Terima Servis
                </button>
                <button className="btn btn-ghost" onClick={() => setActiveTab('pos')}>
                  <ShoppingCart size={17} /> Buka Kasir
                </button>
                <button className="btn btn-ghost" onClick={() => setActiveTab('keuangan')}>
                  <TrendingUp size={17} /> Laporan
                </button>
                {tenant?.code === 'DEMO-STORE' && <button
                  onClick={loadDemoData}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
                    border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '800',
                    fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  ✨ Muat Demo Data Instan
                </button>}
              </div>
            </div>

            {/* 🔥 CTA UPGRADE BANNER — hanya untuk tier Free */}
            {isFree && (
              <div className="dashboard-upgrade-banner" style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                borderRadius: '20px', padding: '1.5rem 1.8rem',
                boxShadow: '0 10px 30px rgba(2, 132, 199, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '16px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>⚡</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>Anda menggunakan Paket Gratis</h3>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800' }}>FREE</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['🤖 WA Bot Otomatis', '👷 Portal Teknisi', '📊 Laporan Laba', '📤 Export Excel', '♾️ Unlimited Servis'].map(f => (
                      <span key={f} style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '3px 9px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>🔒 {f}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px' }}>
                  <a
                    href={`https://wa.me/6285382535050?text=Halo%20Admin%20AISERVICE%2C%20saya%20ingin%20upgrade%20ke%20Paket%20Pro%20(Rp%20149.000%2Fbln).%0AID%20Toko%3A%20${tenant?.code}%0ANama%3A%20${tenant?.name}`}
                    target="_blank" rel="noreferrer"
                    style={{
                      padding: '11px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '0.92rem',
                      background: 'white', color: '#0284c7', textDecoration: 'none', textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.12)', display: 'block'
                    }}
                  >
                    ⭐ Upgrade ke Pro — Rp 149rb/bln
                  </a>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', textAlign: 'center' }}>Aktivasi cepat 1 menit via WhatsApp</p>
                </div>
              </div>
            )}

            <OnboardingProgressCard tenant={tenant} users={users} products={products} services={services} setActiveTab={setActiveTab} />

            {/* METRICS CARDS: HARI INI */}
            <div className="dashboard-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p>RINGKASAN HARI INI</p>
                <h4>Kondisi toko saat ini</h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveTab('keuangan')}
                  style={{ padding: '7px 14px', fontSize: '0.82rem', fontWeight: '800' }}
                >
                  Lihat Laporan Lengkap →
                </button>
              </div>
            </div>

            <div className="dashboard-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              
              {/* Card 1: Omzet Hari Ini */}
              <div className="dashboard-metric-card" style={{
                background: '#ffffff', padding: '1.4rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Pendapatan Hari Ini</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981', margin: '4px 0' }}>
                  Rp {transactions.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString() && (t.type === 'POS_SALES' || t.type.startsWith('INCOME'))).reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString('id-ID')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>✓ Kasir & Jasa Servis</div>
              </div>

              {/* Card 2: Servis Masuk */}
              <div className="dashboard-metric-card" style={{
                background: '#ffffff', padding: '1.4rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #0284c7'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Servis Masuk</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0284c7', margin: '4px 0' }}>
                  {services.filter(s => new Date(s.created_at || Date.now()).toDateString() === new Date().toDateString()).length} Unit
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: '600' }}>Total Aktif: {services.filter(s => s.status !== 'DIAMBIL' && s.status !== 'DIBATALKAN').length} Unit</div>
              </div>

              {/* Card 3: Servis Selesai */}
              <div className="dashboard-metric-card" style={{
                background: '#ffffff', padding: '1.4rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #16a34a'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Servis Selesai</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#16a34a', margin: '4px 0' }}>
                  {services.filter(s => s.status === 'SELESAI').length} Unit
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>Siap Diambil Pelanggan</div>
              </div>

              {/* Card 4: Teknisi Aktif */}
              <div className="dashboard-metric-card" style={{
                background: '#ffffff', padding: '1.4rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #7c3aed'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Teknisi Aktif</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#7c3aed', margin: '4px 0' }}>
                  {users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi').length} Orang
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: '600' }}>Siap Terima Tugas</div>
              </div>

              {/* Card 5: Stok Hampir Habis */}
              <div className="dashboard-metric-card" style={{
                background: '#ffffff', padding: '1.4rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #f59e0b'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Stok Hampir Habis</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#f59e0b', margin: '4px 0' }}>
                  {products.filter(p => p.stock > 0 && p.stock <= 3).length} Barang
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '600' }}>Perlu Re-Order Sparepart</div>
              </div>

            </div>

            {/* GRAPH & 5 RECENT SERVICES GRID */}
            <div className="dashboard-insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Grafik Pemasukan */}
              <div className="dashboard-insight-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 1.2rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Grafik Omzet & Arus Kas 7 Hari Terakhir
                </h4>
                <div className="dashboard-chart-area" style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      Array.from({length: 7}).map((_, i) => {
                        const d = new Date(); d.setDate(d.getDate() - (6 - i));
                        const dStr = d.toDateString();
                        const txs = transactions.filter(t => new Date(t.created_at).toDateString() === dStr);
                        const masuk = txs.filter(t => t.type === 'INCOME' || t.type.startsWith('INCOME_') || t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount||0), 0);
                        const keluar = txs.filter(t => t.type === 'BON_KARYAWAN' || t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount||0), 0);
                        return { name: dStr.substring(0,3) + ' ' + d.getDate(), Pendapatan: masuk, Pengeluaran: keluar };
                      })
                    }>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `Rp ${v/1000}k`} width={60} />
                      <Tooltip formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
                      <Bar dataKey="Pendapatan" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5 Servis Terbaru */}
              <div className="dashboard-insight-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                    📋 5 Servis Terbaru Toko
                  </h4>
                  <button onClick={() => setActiveTab('servis')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer' }}>
                    Lihat Semua →
                  </button>
                </div>
                {services.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                    Belum ada servis terdaftar. Klik "+ Buat Servis" di menu Servis.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {services.slice(0, 5).map(s => {
                      const st = getStatusInfo(s.status);
                      return (
                        <div key={s.resi} className="dashboard-service-row" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{s.customer_name} •</span>
                              <a 
                                href={`${window.location.origin}/tracking?resi=${s.resi}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: '#0284c7', fontWeight: '800', textDecoration: 'underline' }}
                                title="Klik untuk cek status otomatis"
                              >
                                {s.resi} 🔗
                              </a>
                            </div>
                          <span style={{
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800',
                            background: st.bg, color: st.color
                          }}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : 

        /* 1. POS */
        activeTab === 'pos' ? (
          <POSView 
            products={products} 
            transactions={transactions}
            onTransactionCreated={() => apiService.get(`/transactions/${tenant.code}`).then(setTransactions).catch(() => {})}
          />
        ) : 

        /* 2. MULTI-CABANG TAB */
        activeTab === 'cabang' ? (
          <div style={{ maxWidth: '800px' }}>
            {!isEnterprise ? (
              <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', border: '2px solid #bae6fd', background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}>
                <Building2 size={48} color="#0284c7" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>Fitur Multi-Cabang Terpusat</h3>
                <p style={{ color: '#475569', maxWidth: '550px', margin: '0 auto 1.8rem auto', lineHeight: '1.6' }}>
                  Kelola hingga <strong>5 cabang toko/bengkel</strong> dari satu dashboard terpusat. Pantau penjualan tiap cabang, transfer stok sparepart, dan beri akun terpisah untuk kasir cabang masing-masing.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '100px', fontSize: '0.88rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                  ⭐ Termasuk dalam Paket Enterprise (Promo Rp 79.000/bln)
                </div>
                <div>
                  <a 
                    href="https://wa.me/6285382535050?text=Halo%20Admin%20AISERVICE,%20saya%20ingin%20upgrade%20ke%20Paket%20Enterprise%20Multi-Cabang." 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: '800', textDecoration: 'none' }}
                  >
                    Upgrade ke Enterprise Sekarang →
                  </a>
                </div>
              </div>
            ) : (
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Daftar Cabang Toko Anda</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Batas: {branches.length} / 5 Cabang Terdaftar</p>
                  </div>
                </div>

                {/* Form Tambah Cabang */}
                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Tambah Cabang Baru:</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="Kode Cabang (cth: IPUD-MALL)" 
                      value={newBranchCode}
                      onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                      className="input-field" 
                      style={{ flex: 1, minWidth: '180px' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Nama Cabang (cth: Cabang Mall Center)" 
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="input-field" 
                      style={{ flex: 1, minWidth: '180px' }}
                    />
                    <button className="btn btn-primary" onClick={handleAddBranch}>
                      <Plus size={16} /> Tambah Cabang
                    </button>
                  </div>
                </div>

                {/* Tabel Cabang */}
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode ID</th>
                      <th>Nama Cabang</th>
                      <th>Status Aktif</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(b => (
                      <tr key={b.code}>
                        <td><span className="badge">{b.code}</span></td>
                        <td><strong>{b.name}</strong></td>
                        <td>
                          {tenant?.code === b.code ? (
                            <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Sedang Aktif
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Tidak Aktif</span>
                          )}
                        </td>
                        <td>
                          {tenant?.code !== b.code && (
                            <button 
                              className="btn btn-ghost" 
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => handleSwitchBranch(b)}
                            >
                              Beralih ke Cabang Ini ➔
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'pelanggan' ? (
          /* MODUL CRM DATABASE PELANGGAN & WA BLAST */
          <div className="glass-panel customer-management" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="customer-management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>
                  👥 Pelanggan & WhatsApp Marketing
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Pantau pelanggan, segmentasi follow-up, dan siapkan WhatsApp Marketing sebagai fitur Pro.
                </p>
              </div>
            </div>

            <CustomerCRMInsights services={services} transactions={transactions} tenant={tenant} settings={settings} />

            {/* TABEL DATABASE PELANGGAN */}
            {(() => {
              const displayedCustomers = customerTab === 'servis' 
                ? services 
                : transactions.filter(t => t.type === 'POS_SALES' && t.description?.includes('| Cust: ')).map(t => {
                    const desc = t.description || '';
                    const custMatch = desc.match(/\| Cust: ([^\|]+)/);
                    const waMatch = desc.match(/\| WA: ([^\|]+)/);
                    return {
                      resi: 'pos_' + t.id,
                      customer_name: custMatch ? custMatch[1].trim() : 'Anonim',
                      customer_phone: waMatch ? waMatch[1].trim() : '',
                      device_name: 'Pembelian Kasir (POS)',
                      created_at: t.created_at,
                      status: 'SELESAI'
                    };
                  });
              
              return (
                <details className="customer-detail-disclosure" style={{ marginTop: '1rem', border: '1px solid #dbeafe', borderRadius: '18px', background: '#ffffff', overflow: 'hidden' }}>
                  <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontWeight: 900, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                    <span>Detail Riwayat Pelanggan <small style={{ display: 'block', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Lihat daftar pelanggan, nomor WA, status terakhir, dan sumber data.</small></span>
                    <span style={{ background: '#ecfeff', color: '#0f766e', borderRadius: '999px', padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Buka Detail</span>
                  </summary>
                  <div style={{ padding: '16px 18px' }}>
                  <div className="customer-category-tabs" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                    <button onClick={() => setCustomerTab('servis')} style={{ padding: '6px 12px', border: 'none', background: customerTab === 'servis' ? 'var(--accent)' : '#e2e8f0', color: customerTab === 'servis' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>Kategori Servis</button>
                    <button onClick={() => setCustomerTab('pos')} style={{ padding: '6px 12px', border: 'none', background: customerTab === 'pos' ? 'var(--accent)' : '#e2e8f0', color: customerTab === 'pos' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>Pembelian POS</button>
                  </div>

                  <div className="customer-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>Daftar Riwayat Pelanggan {customerTab === 'servis' ? 'Servis' : 'POS Toko'}:</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn"
                        style={{ background: '#e2e8f0', color: '#475569', fontWeight: '600', padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => {
                          const numbers = [...new Set(displayedCustomers.map(s => s.customer_phone).filter(Boolean))].map(n => n.replace(/^0/, '62')).join(', ');
                          if(!numbers) return alert('Tidak ada nomor WA yang tersedia di kategori ini.');
                          navigator.clipboard.writeText(numbers);
                          alert('Berhasil disalin!\n\nSilakan "Paste" nomor-nomor ini di HP Anda untuk membuat Broadcast List WhatsApp.\n\nTotal: ' + [...new Set(displayedCustomers.map(s => s.customer_phone).filter(Boolean))].length + ' Nomor');
                        }}
                      >
                        📋 Salin Semua Nomor (WhatsApp Marketing)
                      </button>
                      <button 
                        className="btn"
                        style={{ background: '#25D366', color: 'white', fontWeight: 'bold', padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => {
                          const msgInput = document.getElementById('waBlastMessage');
                          const msgText = msgInput ? msgInput.value : `Halo Kak, salam dari ${settings.storeName || tenant?.name || 'Toko Servis'}!`;
                          
                          // Hilangkan duplikat nomor HP
                          const uniqueServices = displayedCustomers.filter((v,i,a)=>a.findIndex(t=>(t.customer_phone === v.customer_phone))===i).filter(s => s.customer_phone);
                          if(uniqueServices.length === 0) return alert('Tidak ada nomor WA yang valid untuk dikirim.');
                          
                          if(!confirm(`PERINGATAN POPUP: Aksi ini akan membuka ${uniqueServices.length} tab WhatsApp secara berurutan.\n\nPastikan fitur "Popup Blocker" di browser Anda sudah DIIZINKAN (Allow Popups) untuk situs ini.\n\nLanjutkan mengirim WhatsApp Marketing?`)) return;
                          
                          uniqueServices.forEach((s, idx) => {
                            setTimeout(() => {
                              const cleanPhone = (s.customer_phone || '').replace(/^0/, '62');
                              let personalizedMsg = msgText.replace(/{STORE_NAME}/g, settings.storeName || tenant?.name || 'Toko Servis');
                              window.open(buildManualWhatsAppUrl(cleanPhone, personalizedMsg), '_blank');
                            }, idx * 800);
                          });
                        }}
                      >
                        🚀 Buka WhatsApp Campaign
                      </button>
                    </div>
                  </div>
                  <div className="customer-table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nama Pelanggan</th>
                          <th>Nomor WhatsApp</th>
                          <th>Terakhir Transaksi</th>
                          <th>Aksi WhatsApp Marketing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedCustomers.length === 0 ? (
                          <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>Belum ada data pelanggan {customerTab === 'servis' ? 'Servis' : 'POS'} terdaftar. Data otomatis terkumpul dari menu {customerTab === 'servis' ? 'Servis' : 'Kasir'}.</td></tr>
                        ) : (
                          displayedCustomers.map(s => {
                            const cleanPhone = (s.customer_phone || '').replace(/^0/, '62');
                            return (
                              <tr key={s.resi}>
                                <td><strong>{s.customer_name}</strong> <br/><small style={{ color: '#64748b' }}>Kategori: {s.device_name}</small></td>
                                <td><span className="badge badge-info">{s.customer_phone || '-'}</span></td>
                                <td>{new Date(s.created_at || Date.now()).toLocaleDateString('id-ID')} ({s.status})</td>
                                <td>
                                  {cleanPhone ? (
                                    <button 
                                      className="btn btn-accent"
                                      style={{ padding: '4px 12px', fontSize: '0.78rem', background: '#25D366', color: 'white', border: 'none' }}
                                      onClick={() => {
                                        const msgInput = document.getElementById('waBlastMessage');
                                        const msgText = msgInput ? msgInput.value : `Halo Kak ${s.customer_name}, salam dari ${settings.storeName || 'Toko Servis'}!`;
                                        window.open(buildManualWhatsAppUrl(cleanPhone, msgText), '_blank');
                                      }}
                                    >
                                      Kirim WA 📲
                                    </button>
                                  ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Tanpa No. WA</span>}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </details>
              );
            })()}
          </div>
        ) : activeTab === 'pengaturan' ? (
          <div className="glass-panel store-settings" style={{ maxWidth: '100%', padding: '0' }}>
            <div className="store-settings-layout" style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', minHeight: '600px' }}>
              
              {/* Sidebar Tabs */}
              <div className="store-settings-nav" style={{ width: window.innerWidth < 768 ? '100%' : '260px', borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border-light)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border-light)' : 'none', padding: '1.5rem', background: 'rgba(248, 250, 252, 0.5)', borderTopLeftRadius: '16px', borderBottomLeftRadius: window.innerWidth < 768 ? '0' : '16px' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Pengaturan Toko</h3>
                <div className="store-settings-nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => setSettingTab('umum')} className={`btn ${settingTab === 'umum' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'umum' ? 'var(--primary)' : 'transparent', color: settingTab === 'umum' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'umum' ? '800' : '600' }}>🎨 Tema & Branding</button>
                  <button onClick={() => setSettingTab('wa')} className={`btn ${settingTab === 'wa' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'wa' ? '#059669' : 'transparent', color: settingTab === 'wa' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'wa' ? '800' : '600' }}>💬 WhatsApp Gateway</button>
                  <button onClick={() => setSettingTab('rekening')} className={`btn ${settingTab === 'rekening' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'rekening' ? '#0284c7' : 'transparent', color: settingTab === 'rekening' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'rekening' ? '800' : '600' }}>Kontak & Rekening</button>
                  <button onClick={() => setSettingTab('nota')} className={`btn ${settingTab === 'nota' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'nota' ? '#0ea5e9' : 'transparent', color: settingTab === 'nota' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'nota' ? '800' : '600' }}>Catatan Nota</button>
                  <button onClick={() => setSettingTab('promo')} className={`btn ${settingTab === 'promo' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'promo' ? '#f59e0b' : 'transparent', color: settingTab === 'promo' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'promo' ? '800' : '600' }}>📢 Iklan & Promo</button>
                  <button onClick={() => setSettingTab('aplikasi')} className={`btn ${settingTab === 'aplikasi' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'aplikasi' ? '#0f766e' : 'transparent', color: settingTab === 'aplikasi' ? '#fff' : 'var(--text)', border: 'none', textAlign: 'left', fontWeight: settingTab === 'aplikasi' ? '800' : '600' }}><Smartphone size={17} /> Update Aplikasi</button>
                  <div style={{ height: '2px', background: 'var(--border-light)', margin: '10px 0' }}></div>
                  <button onClick={() => setSettingTab('danger')} className={`btn ${settingTab === 'danger' ? 'btn-danger' : ''}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', background: settingTab === 'danger' ? '#dc2626' : 'transparent', color: settingTab === 'danger' ? '#fff' : '#ef4444', border: 'none', textAlign: 'left', fontWeight: settingTab === 'danger' ? '800' : '600' }}>⚠️ Reset Data</button>
                </div>
              </div>

              {/* Content Area */}
              <div className="store-settings-content" style={{ flex: 1, padding: '2rem' }}>
                
                {settingTab === 'umum' && (
                  <div style={{ maxWidth: '500px', animation: 'fadeIn 0.3s ease-out' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Konfigurasi Tema & Branding</h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="label">Nama Toko</label>
                      <input type="text" className="input-field" 
                        value={settings.storeName || ''} 
                        onChange={(e) => updateTenantSettings({ storeName: e.target.value })} 
                      />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="label">Logo Toko {canUseCustomBranding ? '(Opsional - Otomatis disesuaikan)' : '(Paket Pro / Enterprise)'}</label>
                      <input type="file" accept="image/*" className="input-field" disabled={!canUseCustomBranding}
                        onChange={(e) => {
                          if (!canUseCustomBranding) return;
                          const file = e.target.files[0];
                          if(file) {
                             handleImageUpload(file, (base64) => {
                               updateTenantSettings({ logoUrl: base64 });
                             });
                          }
                        }} 
                      />
                      {!canUseCustomBranding && (
                        <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.82rem' }}>
                          Paket Free otomatis memakai watermark UnitPro tipis di logo dan nota.
                        </div>
                      )}
                      {canUseCustomBranding && settings.logoUrl && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                          <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '60px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                          <button className="btn" style={{ padding: '4px 10px', marginLeft: '10px', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={() => updateTenantSettings({ logoUrl: '' })}>Hapus Logo</button>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="label">Tema</label>
                      <select className="input-field" 
                        value={settings.theme || 'default'} 
                        onChange={(e) => updateTenantSettings({ theme: e.target.value })}
                      >
                        <option value="default">Default (Mode Terang)</option>
                        <option value="dark">Dark (Mode Gelap)</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="label" style={{ fontWeight: '700' }}>🌐 {t('language_label', 'Bahasa Aplikasi / Language', currentLang)}</label>
                      <select className="input-field" 
                        value={settings.language || currentLang} 
                        onChange={(e) => {
                          const langVal = e.target.value;
                          updateTenantSettings({ language: langVal });
                          setAppLanguage(langVal);
                          setCurrentLang(langVal);
                        }}
                      >
                        <option value="id">{t('indonesian', '🇮🇩 Bahasa Indonesia', currentLang)}</option>
                        <option value="en">{t('english', '🇬🇧 English', currentLang)}</option>
                      </select>
                    </div>


                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" onClick={async () => {
                        try {
                          await apiService.updateTenantSettings(tenant.code, settings);
                          alert('Tema & Branding berhasil disimpan!');
                        } catch(e) {
                          alert('Gagal menyimpan');
                        }
                      }}>💾 Simpan Perubahan</button>
                    </div>
                  </div>
                )}

                {settingTab === 'wa' && (
                  <div style={{ maxWidth: '600px', animation: 'fadeIn 0.3s ease-out', opacity: isFree ? 0.6 : 1 }}>
                    <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Otomatisasi WhatsApp {isFree && <span className="badge badge-warning">Premium</span>}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      Pilih metode pengiriman notifikasi WhatsApp. Anda dapat menggunakan server terpusat sistem kami atau nomor WA toko Anda sendiri.
                    </p>
                    <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Mode Pengiriman WA:</label>
                        <select 
                          className="input-field" 
                          id="waSenderModeInput"
                          value={tenant?.settings?.wa_sender_mode || 'SYSTEM'} 
                          disabled={isFree}
                          onChange={async (e) => {
                            const mode = e.target.value;
                            const newSettings = { ...tenant?.settings, wa_sender_mode: mode };
                            try {
                              await apiService.updateTenantSettings(tenant.code, newSettings);
                              updateTenantSettings(newSettings);
                            } catch(err) { alert('Gagal mengubah mode'); }
                          }}
                        >
                          <option value="SYSTEM">🟢 Server Terpusat AIService.ID (Sistem Global)</option>
                          <option value="CUSTOM">⚙️ Custom API Key Mandiri (Toko Sendiri)</option>
                        </select>
                      </div>

                      {tenant?.settings?.wa_sender_mode === 'CUSTOM' ? (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label className="label">Token API Fonnte / Wablas Toko Anda:</label>
                          <input 
                            type="password" 
                            className="input-field" 
                            placeholder="Masukkan Token Fonnte/Wablas Toko Anda..."
                            defaultValue={tenant?.settings?.fonnte_token || ''}
                            id="fonnteTokenInput"
                            disabled={isFree}
                          />
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '8px' }}>
                            🔑 Pesan notifikasi akan dikirimkan langsung menggunakan nomor server WhatsApp Anda sendiri.
                          </span>
                        </div>
                      ) : (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '10px', color: '#15803d', fontSize: '0.85rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                          ✓ Layanan WA otomatis aktif menggunakan Server Gateway AIService.ID. Tidak perlu konfigurasi API Key tambahan.
                        </div>
                      )}

                      <button 
                        className="btn" 
                        style={{ background: '#059669', color: 'white', border: 'none' }}
                        disabled={isFree} 
                        onClick={async () => {
                          const token = tenant?.settings?.wa_sender_mode === 'CUSTOM' ? document.getElementById('fonnteTokenInput')?.value : '';
                          try {
                            const newSettings = { ...tenant?.settings, fonnte_token: token };
                            await apiService.updateTenantSettings(tenant.code, newSettings);
                            updateTenantSettings(newSettings);
                            alert('Pengaturan WhatsApp berhasil disimpan!');
                          } catch(e) { alert('Gagal menyimpan pengaturan'); }
                        }}
                      >
                        💾 Simpan Pengaturan WA
                      </button>
                    </div>
                  </div>
                )}

                {settingTab === 'rekening' && (
                  <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Kontak & Rekening</h3>
                    
                    <div style={{ display: 'flex', gap: '2rem', flexDirection: window.innerWidth < 1100 ? 'column' : 'row' }}>
                      <div style={{ flex: 1, minWidth: '300px', opacity: isFree ? 0.6 : 1 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Lengkapi nomor kontak, rekening, dan gambar QRIS toko agar pelanggan lebih mudah membayar.
                        </p>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label className="label">Nomor WhatsApp Penerima Order (Dari Katalog)</label>
                          <input type="text" className="input-field" placeholder="Contoh: 08123456789" defaultValue={tenant?.settings?.store_wa || ''} id="storeWaInput" disabled={isFree} onChange={(e) => updateTenantSettings({ store_wa: e.target.value })} />
                        </div>

                        <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                          <h5 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>Info Rekening Pembayaran</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            <select id="bankNameSelect" className="input-field" disabled={isFree} defaultValue={tenant?.settings?.bank_name || ''} onChange={(e) => updateTenantSettings({ bank_name: e.target.value })}>
                              <option value="">-- Pilih Bank / E-Wallet --</option>
                              <optgroup label="Bank Nasional">
                                <option value="BCA">BCA</option><option value="Mandiri">Mandiri</option><option value="BNI">BNI</option><option value="BRI">BRI</option><option value="BSI">BSI</option><option value="CIMB Niaga">CIMB Niaga</option>
                              </optgroup>
                              <optgroup label="Bank Digital">
                                <option value="Seabank">Seabank</option><option value="Bank Jago">Bank Jago</option><option value="Blu BCA">Blu by BCA</option><option value="Neo Bank">Neo Bank</option>
                              </optgroup>
                              <optgroup label="E-Wallet">
                                <option value="DANA">DANA</option><option value="GoPay">GoPay</option><option value="OVO">OVO</option><option value="ShopeePay">ShopeePay</option><option value="LinkAja">LinkAja</option>
                              </optgroup>
                            </select>
                            <input type="text" id="accNumberInput" className="input-field" placeholder="Nomor Rekening / No. HP" disabled={isFree} defaultValue={tenant?.settings?.bank_account || ''} onChange={(e) => updateTenantSettings({ bank_account: e.target.value })} />
                            <input type="text" id="accNameInput" className="input-field" placeholder="Atas Nama (A/N)" disabled={isFree} defaultValue={tenant?.settings?.bank_holder || ''} onChange={(e) => updateTenantSettings({ bank_holder: e.target.value })} />
                          </div>
                        </div>

                        <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>Upload Gambar QRIS Toko</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.4' }}>Unggah QRIS resmi toko agar pelanggan bisa scan langsung dari nota.</p>
                          <input type="file" accept="image/*" className="input-field" disabled={isFree} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              handleImageUpload(file, (base64) => updateTenantSettings({ qrisUrl: base64 }));
                            }
                          }} />
                          {qrisImageUrl ? (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', alignItems: 'center', gap: '12px' }}>
                              <img src={qrisImageUrl} alt="QRIS Toko" style={{ width: '160px', height: '160px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }} />
                              <button className="btn" style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={() => updateTenantSettings({ qrisUrl: '' })}>Hapus QRIS</button>
                            </div>
                          ) : (
                            <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Belum ada gambar QRIS yang diunggah.</p>
                          )}
                        </div>

                        <button className="btn" style={{ background: '#0ea5e9', color: 'white', border: 'none', width: '100%', padding: '12px' }} disabled={isFree} onClick={async () => {
                          const storeWa = document.getElementById('storeWaInput').value;
                          const bankName = document.getElementById('bankNameSelect').value;
                          const accNumber = document.getElementById('accNumberInput').value;
                          const accName = document.getElementById('accNameInput').value;
                          const qrisUrl = settings.qrisUrl || '';
                          const bankLine = [bankName, accNumber].filter(Boolean).join(' ').trim();
                          const storeBank = bankLine ? `${bankLine}${accName ? ` a/n ${accName}` : ''}`.trim() : '';
                          
                          try {
                            const newSettings = { ...tenant?.settings, store_wa: storeWa, store_bank: storeBank, bank_name: bankName, bank_account: accNumber, bank_holder: accName, qrisUrl };
                            await apiService.updateTenantSettings(tenant.code, newSettings);
                            updateTenantSettings(newSettings);
                            alert('Informasi kontak, rekening, dan QRIS berhasil disimpan!');
                          } catch(e) { alert('Gagal menyimpan'); }
                        }}>💾 Simpan Perubahan</button>
                      </div>

                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'sticky', top: '20px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#334155', textAlign: 'center', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>👀 Live Preview Kontak & Pembayaran</h4>
                          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)', fontSize: '0.8rem', color: '#1e293b' }}>
                            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                              <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Nomor WhatsApp</div>
                              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{settings.store_wa || '-'}</div>
                            </div>
                            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                              <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Info Rekening</div>
                              <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{paymentInfoText || '-'}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>QRIS Toko</div>
                              {qrisImageUrl ? (
                                <>
                                  <img src={qrisImageUrl} alt="QRIS Toko" style={{ width: '160px', height: '160px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: '#fff' }} />
                                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>Scan QRIS ini untuk pembayaran.</div>
                                </>
                              ) : (
                                <div style={{ padding: '24px 12px', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>QRIS belum diunggah.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingTab === 'nota' && (
                  <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Catatan Nota</h3>
                    
                    <div style={{ display: 'flex', gap: '2rem', flexDirection: window.innerWidth < 1100 ? 'column' : 'row' }}>
                      <div style={{ flex: 1, minWidth: '300px', opacity: isFree ? 0.6 : 1 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Atur catatan kaki untuk nota servis dan struk penjualan kasir.
                        </p>

                        <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>Catatan Kaki Nota (Servis)</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.4' }}>Contoh: "Garansi servis 1 minggu dari tanggal pengambilan."</p>
                          <textarea className="input-field" placeholder="Ketik aturan garansi / ucapan terima kasih di sini..." defaultValue={tenant?.settings?.receipt_note_service || tenant?.settings?.receipt_note || ''} id="receiptNoteServiceInput" style={{ width: '100%', minHeight: '80px', resize: 'vertical', marginBottom: '1rem' }} disabled={isFree} onChange={(e) => updateTenantSettings({ receipt_note_service: e.target.value, receipt_note: e.target.value })} />

                          <h5 style={{ margin: '0 0 8px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>Catatan Kaki Nota (Penjualan Kasir)</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.4' }}>Contoh: "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan."</p>
                          <textarea className="input-field" placeholder="Ketik ucapan terima kasih / aturan retur di sini..." defaultValue={tenant?.settings?.receipt_note_pos || ''} id="receiptNotePosInput" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} disabled={isFree} onChange={(e) => updateTenantSettings({ receipt_note_pos: e.target.value })} />
                        </div>

                        <button className="btn" style={{ background: '#0ea5e9', color: 'white', border: 'none', width: '100%', padding: '12px' }} disabled={isFree} onClick={async () => {
                          const receiptNoteService = document.getElementById('receiptNoteServiceInput').value;
                          const receiptNotePos = document.getElementById('receiptNotePosInput').value;
                          
                          try {
                            const newSettings = { ...tenant?.settings, receipt_note_service: receiptNoteService, receipt_note_pos: receiptNotePos, receipt_note: receiptNoteService };
                            await apiService.updateTenantSettings(tenant.code, newSettings);
                            updateTenantSettings(newSettings);
                            alert('Catatan nota berhasil disimpan!');
                          } catch(e) { alert('Gagal menyimpan'); }
                        }}>💾 Simpan Catatan</button>
                      </div>

                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'sticky', top: '20px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#334155', textAlign: 'center', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>👀 Live Preview Nota</h4>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', justifyContent: 'center' }}>
                            <button onClick={() => setPreviewTab('servis')} className={`btn ${previewTab === 'servis' ? 'btn-primary' : ''}`} style={{ padding: '6px 12px', fontSize: '0.8rem', background: previewTab === 'servis' ? '#0ea5e9' : '#e2e8f0', color: previewTab === 'servis' ? 'white' : '#475569', border: 'none', borderRadius: '6px' }}>Servis</button>
                            <button onClick={() => setPreviewTab('pos')} className={`btn ${previewTab === 'pos' ? 'btn-primary' : ''}`} style={{ padding: '6px 12px', fontSize: '0.8rem', background: previewTab === 'pos' ? '#0ea5e9' : '#e2e8f0', color: previewTab === 'pos' ? 'white' : '#475569', border: 'none', borderRadius: '6px' }}>Kasir (POS)</button>
                          </div>
                          <div style={{ position: 'relative', overflow: 'hidden', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)', fontSize: '0.8rem', color: '#1e293b', fontFamily: 'monospace' }}>
                            {isFree && <img src={UNITPRO_LOGO_URL} alt="" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '52%', width: '82%', transform: 'translate(-50%, -50%) rotate(-14deg)', opacity: 0.07, pointerEvents: 'none' }} />}
                            <div style={{ position: 'relative', zIndex: 1 }}>
                            {previewTab === 'servis' ? (
                              <>
                                <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <img src={tenantLogoUrl} alt="Logo" style={{ maxHeight: '35px', maxWidth: '130px', objectFit: 'contain', opacity: tenantLogoOpacity }} />
                                    <h2 style={{ margin: '0', fontSize: '1.2rem', fontWeight: '900', fontFamily: 'sans-serif' }}>{settings.storeName || tenant?.name || 'Toko Servis'}</h2>
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.7rem', fontFamily: 'sans-serif' }}>NOTA PELUNASAN SERVIS</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                                  <div><strong>No. Resi</strong><br/>SRV-12345</div>
                                  <div><strong>Tanggal</strong><br/>{new Date().toLocaleDateString('id-ID')}</div>
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                  <strong>Rincian Perbaikan:</strong><br/>
                                  Ganti LCD (Part) - Rp 350.000<br/>
                                  Jasa Pasang - Rp 100.000<br/>
                                  <strong>TOTAL: Rp 450.000</strong>
                                </div>
                                
                                {paymentInfoText ? (
                                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px', fontFamily: 'sans-serif' }}>
                                    <strong>INFO REKENING PEMBAYARAN:</strong><br/>
                                    {paymentInfoText}
                                  </div>
                                ) : null}

                                {qrisImageUrl ? (
                                  <div style={{ textAlign: 'center', margin: '15px 0', padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                    <img src={qrisImageUrl} alt="QRIS Pembayaran" style={{ width: '110px', height: '110px', objectFit: 'contain', marginBottom: '5px' }} />
                                    <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b', fontFamily: 'sans-serif' }}>Scan QRIS untuk pembayaran</p>
                                  </div>
                                ) : null}

                                <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', color: '#64748b', fontFamily: 'sans-serif' }}>
                                  <strong style={{ color: '#0f172a' }}>{settings.receipt_note_service || settings.receipt_note || 'Terima kasih atas kepercayaan Anda!'}</strong><br/>
                                  Barang yang sudah diambil tidak dapat dikembalikan / ditukar.
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <img src={tenantLogoUrl} alt="Logo" style={{ maxHeight: '35px', maxWidth: '130px', objectFit: 'contain', opacity: tenantLogoOpacity }} />
                                    <h2 style={{ margin: '0', fontSize: '1.2rem', fontWeight: '900', fontFamily: 'sans-serif' }}>{settings.storeName || tenant?.name || 'Toko Servis'}</h2>
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.7rem', fontFamily: 'sans-serif' }}>STRUK PENJUALAN</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                                  <div><strong>No. Transaksi</strong><br/>POS-12345</div>
                                  <div><strong>Tanggal</strong><br/>{new Date().toLocaleDateString('id-ID')}</div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                                  <thead>
                                    <tr><th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Item</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Qty</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Total</th></tr>
                                  </thead>
                                  <tbody>
                                    <tr><td style={{ padding: '6px 0', borderBottom: '1px dotted #eee' }}>Charger Laptop</td><td style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px dotted #eee' }}>1x</td><td style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px dotted #eee' }}>Rp 175.000</td></tr>
                                  </tbody>
                                </table>
                                <div style={{ borderTop: '2px dashed #ccc', paddingTop: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Subtotal</span><span>Rp 175.000</span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.1rem', margin: '10px 0', borderTop: '2px solid #333', borderBottom: '2px solid #333', padding: '8px 0' }}><span>TOTAL</span><span>Rp 175.000</span></div>
                                </div>
                                {paymentInfoText ? (
                                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '15px 0', fontFamily: 'sans-serif', textAlign: 'center' }}>
                                    <strong>INFO REKENING PEMBAYARAN:</strong><br/>
                                    {paymentInfoText}
                                  </div>
                                ) : null}
                                {qrisImageUrl ? (
                                  <div style={{ textAlign: 'center', margin: '15px 0', padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                    <img src={qrisImageUrl} alt="QRIS Pembayaran" style={{ width: '110px', height: '110px', objectFit: 'contain', marginBottom: '5px' }} />
                                    <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b', fontFamily: 'sans-serif' }}>Scan QRIS untuk pembayaran</p>
                                  </div>
                                ) : null}
                                <div style={{ textAlign: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
                                  {settings.receipt_note_pos ? <><strong style={{ color: '#0f172a' }}>{settings.receipt_note_pos}</strong></> : <><strong style={{ color: '#0f172a' }}>Terima kasih atas pembelian Anda!</strong><br/>Barang yang sudah dibeli tidak dapat dikembalikan.</>}
                                </div>
                              </>
                            )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingTab === 'aplikasi' && (
                  <div style={{ maxWidth: '580px', animation: 'fadeIn 0.3s ease-out' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Update Aplikasi UnitPro</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                      Perbarui aplikasi Android untuk mendapatkan fitur dan perbaikan terbaru. File dibuka langsung untuk diunduh, tanpa melalui landing page.
                    </p>
                    <div style={{ border: '1px solid #99f6e4', background: '#f0fdfa', borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1rem' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#0f766e', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Smartphone size={24} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '800', color: '#134e4a' }}>UnitPro Android</div>
                        <div style={{ color: '#0f766e', fontSize: '0.82rem', marginTop: '3px' }}>Versi terbaru: {appVersion}</div>
                      </div>
                    </div>
                    <button type="button" className="btn" onClick={openAppUpdate} style={{ width: '100%', justifyContent: 'center', background: '#0f766e', color: '#fff', border: 'none', padding: '12px 16px' }}>
                      <Download size={18} /> Unduh Update Android
                    </button>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: '1.5', margin: '12px 0 0' }}>
                      Setelah selesai diunduh, buka file APK dan pilih Perbarui. Data toko dan akun Anda tetap tersimpan.
                    </p>
                  </div>
                )}

                {settingTab === 'promo' && (
                  <div style={{ maxWidth: '600px', animation: 'fadeIn 0.3s ease-out', opacity: isFree ? 0.6 : 1 }}>
                    <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Iklan & Promo {isFree && <span className="badge badge-warning">Premium</span>}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Iklan akan tampil di Halaman Beranda Publik.</p>
                    {settings.ads?.map((ad, index) => (
                      <div key={ad.id} style={{ padding: '1.2rem', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '1rem', background: 'rgba(255,255,255,0.5)' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label className="label">Judul Promo</label>
                          <input type="text" className="input-field" value={ad.title} disabled={isFree}
                            onChange={(e) => { const newAds = [...settings.ads]; newAds[index].title = e.target.value; updateTenantSettings({ ads: newAds }); }} 
                          />
                        </div>
                        <div>
                          <label className="label">Upload Gambar Promo (Otomatis dikompres oleh AI)</label>
                          <input type="file" accept="image/*" className="input-field" disabled={isFree} 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if(file) {
                                handleImageUpload(file, (base64) => {
                                  const newAds = [...settings.ads];
                                  newAds[index].imageUrl = base64;
                                  updateTenantSettings({ ads: newAds });
                                });
                              }
                            }} 
                          />
                          {ad.imageUrl && (
                            <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                              <img src={ad.imageUrl} alt="Promo" style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
                              <button onClick={() => { const newAds = [...settings.ads]; newAds[index].imageUrl = ''; updateTenantSettings({ ads: newAds }); }} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <button className="btn" style={{ background: '#f59e0b', color: 'white', border: 'none' }} onClick={() => updateTenantSettings({ ads: [...(settings.ads||[]), {id: Date.now().toString(), title: '', imageUrl: '', isActive: true}] })} disabled={isFree}>
                      + Tambah Promo Baru
                    </button>
                  </div>
                )}

                {settingTab === 'danger' && (
                  <div style={{ maxWidth: '600px', animation: 'fadeIn 0.3s ease-out' }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>Zona Bahaya (Danger Zone)</h3>
                    <div style={{ padding: '1.5rem', border: '1px solid #fecaca', borderRadius: '12px', background: '#fef2f2' }}>
                      <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Tindakan ini akan <strong>menghapus seluruh data transaksi, servis, dan produk</strong> dari toko Anda. Akun karyawan (kasir/teknisi) akan tetap dipertahankan. <br/><br/><strong>Aksi ini bersifat permanen dan tidak dapat dibatalkan.</strong>
                      </p>
                      <button 
                        className="btn btn-danger"
                        onClick={async () => {
                          const confirm1 = window.confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA DATA (Transaksi, Servis, Produk)?');
                          if (!confirm1) return;
                          const confirm2 = window.prompt('Peringatan Terakhir! Aksi ini permanen dan tidak bisa dikembalikan.\n\nKetik "RESET" untuk melanjutkan:');
                          if (confirm2 !== 'RESET') return alert('Batal mereset data.');
                          try {
                            await apiService.resetTenantData(tenant.code, { keepUsers: true });
                            alert('Berhasil! Seluruh data transaksi, servis, dan produk telah dihapus.');
                            window.location.reload();
                          } catch (e) { alert('Gagal mereset data: ' + e.message); }
                        }}
                      >
                        🗑️ Saya Mengerti, Reset Data Sekarang
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : activeTab === 'forum' ? (
          <ForumCommunity />
        ) : activeTab === 'harga' ? (
          <div className="glass-panel" style={{ minHeight: '400px' }}>
             <h3>Katalog Harga Pasaran Global (Simulasi)</h3>
             <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Rata-rata harga jasa & part berdasarkan data toko lain.</p>
             <table className="table">
               <thead><tr><th>Tindakan / Part</th><th>Estimasi Harga</th></tr></thead>
               <tbody>
                 <tr><td>Ganti LCD iPhone 11 (Part Ori)</td><td>Rp 1.200.000 - Rp 1.500.000</td></tr>
                 <tr><td>Instal Ulang Windows + Backup</td><td>Rp 100.000 - Rp 150.000</td></tr>
                 <tr><td>Ganti Baterai Asus X441</td><td>Rp 350.000 - Rp 450.000</td></tr>
               </tbody>
             </table>
          </div>
        ) : activeTab === 'servis' ? (
          <div className="glass-panel service-management" style={{ minHeight: '400px' }}>
              
              <div className="service-action-card">
                <div>
                  <p>PENERIMAAN UNIT</p>
                  <h3>Daftarkan servis tanpa memenuhi layar</h3>
                  <span>Data pelanggan, unit, keluhan, dan teknisi diisi dalam satu formulir ringkas.</span>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setShowServiceRegistration(true)}>
                  <Plus size={18} /> Daftarkan & Tugaskan
                </button>
              </div>

              <div className="service-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>Daftar Servis Aktif ({tenant?.name})</h3>
                <div className="service-list-search" style={{ display: 'flex', gap: '8px', minWidth: '300px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Cari Resi atau Nama Pelanggan..." 
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn" style={{ background: '#0284c7', color: 'white', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowScanner(true)}>
                    <Camera size={18} /> Scan
                  </button>
                </div>
              </div>
              
              {(() => {
                const techIds = [...new Set(services.map(s => s.technician_id))];
                return (
                  <div className="service-filter-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid var(--border-light)' }}>
                    <button onClick={() => setServiceTechTab('ALL')} style={{ padding: '6px 12px', border: 'none', background: serviceTechTab === 'ALL' ? 'var(--accent)' : '#e2e8f0', color: serviceTechTab === 'ALL' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>Semua Teknisi</button>
                    {techIds.map(tId => {
                      const tech = users.find(u => u.id === tId);
                      const tName = tech ? tech.name.replace(/\s*\(.*\)/, '') : (tId ? 'Teknisi ID: '+tId : 'Belum Dipilih');
                      const tabId = tId || 'unassigned';
                      return (
                        <button key={tabId} onClick={() => setServiceTechTab(tabId)} style={{ padding: '6px 12px', border: 'none', background: serviceTechTab === tabId ? 'var(--accent)' : '#e2e8f0', color: serviceTechTab === tabId ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>{tName}</button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="service-filter-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px' }}>
                <button onClick={() => setServiceStatusTab('ALL')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: serviceStatusTab === 'ALL' ? '#334155' : 'white', color: serviceStatusTab === 'ALL' ? 'white' : '#475569', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: serviceStatusTab === 'ALL' ? 'bold' : 'normal' }}>Semua Status</button>
                {typeof SERVICE_STATUSES !== 'undefined' && SERVICE_STATUSES.map(st => (
                  <button key={st.id} onClick={() => setServiceStatusTab(st.id)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: serviceStatusTab === st.id ? st.bg : 'white', color: serviceStatusTab === st.id ? 'white' : '#475569', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: serviceStatusTab === st.id ? 'bold' : 'normal' }}>{st.label}</button>
                ))}
              </div>

              <div className="service-active-mobile-list">
                {(() => {
                  const filteredServices = services.filter((service) => {
                    const matchQuery = (service.resi || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (service.customer_name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (service.device_name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase());
                    const matchTech = serviceTechTab === 'ALL' || (serviceTechTab === 'unassigned' ? !service.technician_id : service.technician_id === serviceTechTab);
                    const matchStatus = serviceStatusTab === 'ALL' || service.status === serviceStatusTab;
                    return matchQuery && matchTech && matchStatus;
                  });

                  if (filteredServices.length === 0) return <p className="service-mobile-empty">Tidak ada servis yang sesuai dengan filter.</p>;

                  return filteredServices.map((service) => {
                    const technician = users.find((user) => user.id === service.technician_id);
                    const status = getStatusInfo(service.status);
                    return (
                      <article className="service-active-mobile-card" key={`mobile-${service.resi}`}>
                        <div className="service-mobile-card-top">
                          <div>
                            <strong>{service.customer_name}</strong>
                            <a href={`${window.location.origin}/tracking?resi=${service.resi}`} target="_blank" rel="noreferrer">{service.resi}</a>
                          </div>
                          <span style={{ background: status?.bg, color: status?.color }}>{status?.label || service.status || 'PROSES'}</span>
                        </div>
                        <p className="service-mobile-device">{service.device_name}</p>
                        <p className="service-mobile-meta">Teknisi: {technician?.name || 'Belum ditugaskan'}</p>
                        <label className="service-mobile-status-label">Ubah status
                          <select className="input-field" value={service.status || 'DITERIMA'} onChange={(event) => updateServiceStatusFromAction(service, event.target.value)}>
                            {SERVICE_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                          </select>
                        </label>
                        <div className="service-mobile-actions">
                          <button className="btn btn-ghost" onClick={() => { setSelectedResi(service.resi); setShowBarcodeModal(true); }}>Stiker</button>
                          <button className="btn btn-ghost" onClick={() => { setSelectedService(service); setPrintType(service.status === 'SELESAI' || service.status === 'DI AMBIL' ? 'pengambilan' : 'pendaftaran'); setShowPrintModal(true); }}>Nota</button>
                          <button className="btn btn-ghost" style={{ color: '#0284c7', fontWeight: 'bold' }} onClick={() => { setSelectedService(service); setShowEditServiceNota(true); }}>✏️ Edit Nota</button>
                          {service.customer_phone && <a className="btn btn-primary" target="_blank" rel="noreferrer" href={`https://wa.me/${service.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Kak ${service.customer_name}, ini link cek servis ${service.device_name} (Resi: ${service.resi}) dari *${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}*:\n${window.location.origin}/tracking?resi=${service.resi}`)}`}>Kirim WA</a>}
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>

              <div className="service-desktop-table" style={{ overflowX: 'auto' }}>
                 <table className="table">
                  <thead><tr><th>Resi</th><th>Pelanggan</th><th>Perangkat</th><th>Kerusakan</th><th>Garansi</th><th>Teknisi</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {(() => {
                      const filteredServices = services.filter(s => {
                        const matchQuery = (s.resi || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.customer_name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase());
                        const matchTech = serviceTechTab === 'ALL' || (serviceTechTab === 'unassigned' ? !s.technician_id : s.technician_id === serviceTechTab);
                        const matchStatus = serviceStatusTab === 'ALL' || s.status === serviceStatusTab;
                        return matchQuery && matchTech && matchStatus;
                      });

                      if (filteredServices.length === 0) {
                        return <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{serviceSearchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada data servis di tab ini.'}</td></tr>;
                      }

                      return filteredServices.map(s => {
                        const tech = users.find(u => u.id === s.technician_id);
                        const garansiMatch = (s.issue || '').match(/\[Masa Garansi Servis: s\/d (.*?)\]/);
                        const garansiStatus = garansiMatch ? garansiMatch[1] : '-';
                        const cleanIssue = (s.issue || '').replace(/\[Masa Garansi Servis: s\/d .*?\]/, '').trim();
                        return (
                          <tr key={s.resi}>
                            <td>
                              <a 
                                href={`${window.location.origin}/tracking?resi=${s.resi}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: '#0284c7', fontWeight: '800', textDecoration: 'underline' }}
                                title="Klik untuk membuka link tracking otomatis"
                              >
                                {s.resi} 🔗
                              </a>
                            </td>
                            <td>{s.customer_name} <br/><small style={{color: 'var(--text-muted)'}}>{s.customer_phone}</small></td>
                            <td>{s.device_name}</td>
                            <td style={{ whiteSpace: 'pre-wrap', maxWidth: '200px' }}>{cleanIssue}</td>
                            <td>{garansiStatus !== '-' ? <span className="badge badge-success" style={{background: '#dcfce7', color: '#16a34a'}}>s/d {garansiStatus}</span> : '-'}</td>
                            <td>{tech ? <span className="badge badge-warning">{tech.name}</span> : <span style={{ color: 'var(--text-muted)' }}>Belum Dipilih</span>}</td>
                            <td>
                              <select 
                                className="input-field" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '130px', background: getStatusInfo(s.status)?.bg, color: getStatusInfo(s.status)?.color, fontWeight: 'bold' }}
                                value={s.status}
                                onChange={(e) => updateServiceStatusFromAction(s, e.target.value)}
                              >
                                {SERVICE_STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={() => { setSelectedResi(s.resi); setShowBarcodeModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>Cetak Stiker</button>
                                <button className="btn btn-primary" onClick={() => { setSelectedService(s); setPrintType(s.status === 'SELESAI' || s.status === 'DI AMBIL' ? 'pengambilan' : 'pendaftaran'); setShowPrintModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px', background: '#0ea5e9' }}>Cetak Nota</button>
                                <button className="btn btn-warning" onClick={() => { setSelectedService(s); setShowEditServiceNota(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px', fontWeight: 'bold' }}>✏️ Edit Nota</button>
                                <a 
                                  href={`https://wa.me/${s.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Kak ${s.customer_name}, ini link untuk cek status servis ${s.device_name} Anda (Resi: ${s.resi}) dari *${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}*:\n${window.location.origin}/tracking?resi=${s.resi}`)}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="btn btn-accent" 
                                  style={{ fontSize: '0.8rem', padding: '5px 10px', textDecoration: 'none' }}
                                >
                                  Kirim WA 📲
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
               </div>
          </div>
        ) : activeTab === 'master' ? (
          <div className="glass-panel inventory-management" style={{ minHeight: '400px' }}>
             <div className="inventory-management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <h3 style={{ margin: 0 }}>Master Barang & Sparepart ({tenant?.name})</h3>
             </div>
             
             <div className="inventory-tabs" style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-light)' }}>
               <button onClick={() => setMasterTab('stok')} className={`tab-btn ${masterTab === 'stok' ? 'active' : ''}`} style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: 'bold', color: masterTab === 'stok' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: masterTab === 'stok' ? '3px solid var(--accent)' : '3px solid transparent', cursor: 'pointer' }}>📦 Daftar & Stok Barang</button>
               <button onClick={() => setMasterTab('audit')} className={`tab-btn ${masterTab === 'audit' ? 'active' : ''}`} style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: 'bold', color: masterTab === 'audit' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: masterTab === 'audit' ? '3px solid var(--accent)' : '3px solid transparent', cursor: 'pointer' }}>📜 Log Aktivitas Stok</button>
             </div>

             {masterTab === 'stok' && (
               <>
             {/* FORM TAMBAH BARANG DENGAN UPLOAD GAMBAR */}
             <details className="management-action-disclosure">
                <summary><Plus size={18} /> Tambah barang atau jasa baru</summary>
             <div className="inventory-add-form" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', marginBottom: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18} color="var(--accent)" /> Tambah Barang Baru</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Nama Barang/Jasa <span style={{color: 'red'}}>*</span></label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ketik nama barang..." 
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Kategori</label>
                    <select 
                      className="input-field" 
                      value={newProdCat}
                      onChange={(e) => setNewProdCat(e.target.value)}
                    >
                      <option value="SPAREPART">Sparepart</option>
                      <option value="AKSESORIS">Aksesoris</option>
                      <option value="JASA">Jasa Servis</option>
                      <option value="UNIT">Unit/Laptop/HP</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Harga Jual (Rp) <span style={{color: 'red'}}>*</span></label>
                    <input 
                      type="text" inputMode="numeric" 
                      className="input-field" 
                      placeholder="0" 
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(formatMoneyInput(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Stok Awal</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="0" 
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <label className="label" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Foto Produk (Upload dari Galeri / Kamera / URL)</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {newProdImage ? (
                        <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #0284c7', flexShrink: 0 }}>
                          <img src={newProdImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            onClick={() => setNewProdImage('')} 
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '0 0 0 8px', padding: '2px 4px', cursor: 'pointer' }}
                            title="Hapus foto"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null}
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="https://... atau klik Upload Foto" 
                        value={newProdImage}
                        onChange={(e) => setNewProdImage(e.target.value)}
                        style={{ flex: 1 }} 
                      />
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isUploadingProdImage ? '#cbd5e1' : '#e0f2fe', color: '#0369a1', padding: '0 15px', height: '42px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', cursor: isUploadingProdImage ? 'not-allowed' : 'pointer', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                        {isUploadingProdImage ? <RefreshCw size={16} className="animate-spin" /> : <Camera size={16} />}
                        {isUploadingProdImage ? 'Memproses...' : 'Upload Foto'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          disabled={isUploadingProdImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setIsUploadingProdImage(true);
                                const compressedBase64 = await compressImageFile(file, 800, 800, 0.7);
                                setNewProdImage(compressedBase64);
                              } catch (err) {
                                alert('Gagal memproses gambar. Pastikan format gambar valid.');
                              } finally {
                                setIsUploadingProdImage(false);
                              }
                            }
                          }} 
                        />
                      </label>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    disabled={isAddingProduct}
                    style={{ padding: '0 25px', fontWeight: 'bold', height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }} 
                    onClick={async () => {
                      const name = newProdName.trim();
                      const price = normalizeMoneyInput(newProdPrice);
                      const category = newProdCat;
                      const rawStock = parseInt(newProdStock) || 0;
                      const stock = category === 'JASA' ? 999 : rawStock;
                      const imageUrl = newProdImage;
                      
                      if (!name || isNaN(price)) return alert('Nama dan Harga wajib diisi!');
                      
                      const isDuplicate = products.some(p => p.name.toLowerCase() === name.toLowerCase());
                      if (isDuplicate) return alert(`⚠️ Peringatan: Barang dengan nama "${name}" sudah ada di data stok Anda! Silakan gunakan nama lain atau edit barang yang sudah ada.`);
                      
                      try {
                        setIsAddingProduct(true);
                        const currentUser = localStorage.getItem('EMPLOYEE_NAME') || 'Kasir / Admin';
                        const newProd = await apiService.addProduct({ tenant_code: tenant.code, name, price, stock: stock || 0, category, imageUrl }, currentUser);
                        const savedProduct = { ...newProd, category: newProd.category || category, imageUrl: newProd.imageUrl || newProd.image_url || imageUrl };
                        setProducts(prev => [savedProduct, ...prev.filter(p => String(p.id) !== String(savedProduct.id))]);
                        apiService.getProducts(tenant.code).then(setProducts).catch(() => {});
                        setNewProdName('');
                        setNewProdPrice('');
                        setNewProdStock('0');
                        setNewProdImage('');
                        alert('✅ Barang berhasil ditambahkan ke Master Data!');
                      } catch (e) {
                        alert('Gagal menambah barang: ' + (e.message || 'Error'));
                      } finally {
                        setIsAddingProduct(false);
                      }
                    }}
                  >
                    {isAddingProduct ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                    {isAddingProduct ? 'Menyimpan...' : 'Simpan Barang'}
                  </button>
                </div>
             </div>
             </details>

             <div className="inventory-table-wrap"><table className="table inventory-table">
               <thead><tr><th>Foto</th><th>ID</th><th>Nama Barang</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
               <tbody>
                 {products.map(p => (
                   <tr key={p.id}>
                     <td>
                       {(p.imageUrl || p.image_url || p.image) ? (
                         <img src={p.imageUrl || p.image_url || p.image} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                       ) : (
                         <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800' }}>
                           NO IMG
                         </div>
                       )}
                     </td>
                     <td><small style={{ fontFamily: 'monospace' }}>{p.id}</small></td>
                     <td style={{ fontWeight: '800' }}>{p.name}</td>
                     <td><span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem' }}>{p.category || 'SPAREPART'}</span></td>
                     <td style={{ fontWeight: '800', color: '#0284c7' }}>Rp {p.price.toLocaleString('id-ID')}</td>
                     <td>
                       <span className={`badge ${p.stock <= 3 ? 'badge-danger' : 'badge-success'}`}>
                         {String(p.category || '').toUpperCase() === 'JASA' ? 'Jasa' : `${p.stock} pcs`}
                       </span>
                     </td>
                     <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            className="btn btn-warning" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                            onClick={() => {
                              setEditingProduct({ ...p });
                              setShowEditProductModal(true);
                            }}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                            onClick={async () => {
                              if(await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Hapus barang?', message: `Barang "${p.name}" akan dihapus dari inventori.`, confirmText: 'Hapus', tone: 'warning' }) : Promise.resolve(window.confirm(`Yakin ingin menghapus "${p.name}"?`)))) {
                                try {
                                  await apiService.deleteProduct(p.id);
                                  setProducts(products.filter(x => x.id !== p.id));
                                } catch(e) { alert('Gagal hapus barang'); }
                              }
                            }}
                          >
                            <Trash size={12} /> Hapus
                          </button>
                        </div>
                     </td>
                   </tr>
                 ))}
                 {products.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data barang.</td></tr>}
                </tbody>
              </table></div>
                </>
              )}

              {masterTab === 'audit' && (
                <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', overflowX: 'auto' }}>
                   <h4 style={{ margin: '0 0 1rem 0' }}>Riwayat Pergerakan Stok</h4>
                   <table className="table" style={{ width: '100%', minWidth: '700px' }}>
                     <thead><tr><th>Waktu</th><th>Nama Barang</th><th>Karyawan</th><th>Perubahan</th><th>Keterangan</th></tr></thead>
                     <tbody>
                       {auditLogs.length > 0 ? auditLogs.map((log) => (
                         <tr key={log.id}>
                           <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                           <td style={{ fontWeight: 'bold' }}>{log.products?.name || '-'}</td>
                           <td>{log.user_name}</td>
                           <td style={{ color: log.change_amount > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                             {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                           </td>
                           <td>{log.description}</td>
                         </tr>
                       )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada aktivitas stok.</td></tr>}
                     </tbody>
                   </table>
                </div>
              )}
           </div>
        ) : activeTab === 'keuangan' ? (
          <div className="glass-panel finance-report" style={{ minHeight: '400px', animation: 'fadeIn 0.3s ease-in-out', padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <PremiumFinanceReport
              transactions={transactions}
              services={services}
              products={products}
              users={users}
              tenant={tenant}
              settings={settings}
              onRefreshData={() => {
                apiService.getTransactions(tenant?.code).then(setTransactions).catch(() => {});
                apiService.getServices(tenant?.code).then(setServices).catch(() => {});
              }}
            />
          </div>

        ) : activeTab === 'karyawan' ? (
          isFree ? (
            <UpgradePrompt
              mode="card"
              featureName="Portal Multi-Karyawan"
              featureDescription="Tambahkan teknisi dan kasir dengan PIN login masing-masing. Kelola gaji, komisi, kasbon, dan pantau absensi — semua dari satu dashboard."
              icon={<Users size={28} />}
            />
          ) :
          <div className="glass-panel employee-management" style={{ minHeight: '400px' }}>
             <h3 className="employee-management-title" style={{ marginBottom: '1.5rem' }}>Manajemen Karyawan ({tenant?.name})</h3>

             {/* TABS HEADER */}
             <div className="employee-management-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', overflowX: 'auto' }}>
               <button onClick={() => setEmpTab('daftar')} className={`btn ${empTab === 'daftar' ? 'btn-primary' : 'btn-ghost'}`}>👥 Daftar Karyawan</button>
               <button onClick={() => setEmpTab('kasbon')} className={`btn ${empTab === 'kasbon' ? 'btn-primary' : 'btn-ghost'}`}>
                 💰 Permintaan Kasbon {pendingKasbonCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>{pendingKasbonCount}</span>}
               </button>
               <button onClick={() => setEmpTab('absensi')} className={`btn ${empTab === 'absensi' ? 'btn-primary' : 'btn-ghost'}`}>
                 📅 Laporan Absensi {newAttendanceCount > 0 && <span className="badge badge-success" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>{newAttendanceCount}</span>}
               </button>
             </div>

             {/* TAB CONTENT: DAFTAR KARYAWAN */}
             {empTab === 'daftar' && (
               <div className="animate-fade-in">
                 <details className="management-action-disclosure employee-action-disclosure">
                   <summary><Plus size={18} /> Tambah karyawan</summary>
                 <div className="employee-add-form" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input type="text" className="input-field" placeholder="Nama Karyawan..." id="newEmpName" style={{ flex: 1, minWidth: '150px' }} />
                    <input type="text" className="input-field" placeholder="No WhatsApp (Opsional)" id="newEmpPhone" style={{ width: '180px' }} />
                    <input type="text" className="input-field" placeholder="PIN (Angka)" id="newEmpPin" style={{ width: '120px' }} />
                    <select className="input-field" id="newEmpRole" style={{ width: '120px' }}>
                      <option value="TEKNISI">Teknisi</option>
                      <option value="KASIR">Kasir</option>
                    </select>
                    <input type="number" className="input-field" placeholder="Gaji/Bulan (Rp)" id="newEmpSalary" style={{ width: '150px' }} />
                    <input type="number" className="input-field" placeholder="% Komisi" id="newEmpComm" style={{ width: '100px' }} />
                    <button className="btn btn-primary" onClick={async () => {
                      const name = document.getElementById('newEmpName').value;
                      const phone = document.getElementById('newEmpPhone').value;
                      const pin = document.getElementById('newEmpPin').value;
                      const role = document.getElementById('newEmpRole').value;
                      const salary = document.getElementById('newEmpSalary').value || '0';
                      const comm = document.getElementById('newEmpComm').value || '0';
                      if (!name || !pin) return alert('Nama dan PIN wajib diisi');
                      try {
                        const newUser = await apiService.post('/users', { tenant_code: tenant.code, name, role, pin, phone });
                        
                        const currentSettings = tenant.settings || {};
                        const employee_commissions = currentSettings.employee_commissions || {};
                        const employee_salaries = currentSettings.employee_salaries || {};
                        employee_commissions[newUser.id] = parseInt(comm);
                        employee_salaries[newUser.id] = parseInt(salary);
                        const newSettings = { ...currentSettings, employee_commissions, employee_salaries };
                        await apiService.updateTenantSettings(tenant.code, newSettings);
                        updateTenantSettings(newSettings);

                        setUsers([...users, newUser]);
                        document.getElementById('newEmpName').value = '';
                        document.getElementById('newEmpPhone').value = '';
                        document.getElementById('newEmpPin').value = '';
                        document.getElementById('newEmpSalary').value = '';
                        document.getElementById('newEmpComm').value = '';
                        alert('Karyawan Berhasil Ditambah!');
                      } catch (e) { alert('Gagal'); }
                    }}>
                      <Plus size={18} /> Tambah
                    </button>
                 </div>
                 </details>
                 <p style={{ color: 'var(--text-muted)' }}>*Karyawan ini nantinya bisa login melalui Portal Karyawan menggunakan PIN.</p>
                 <div className="employee-table-wrap"><table className="table employee-table" style={{ marginTop: '1.5rem' }}>
                   <thead><tr><th>Nama Karyawan</th><th>No. WA</th><th>Peran (Role)</th><th>PIN Login</th><th>Gaji (Rp)</th><th>Komisi (%)</th><th>Aksi</th></tr></thead>
                   <tbody>
                     {users.map(u => (
                       <tr key={u.id}>
                         <td>{u.name}</td>
                         <td>{u.phone || '-'}</td>
                         <td><span className={`badge ${u.role === 'KASIR' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span></td>
                         <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.pin}</td>
                         <td>Rp {(tenant.settings?.employee_salaries?.[u.id] || 0).toLocaleString('id-ID')}</td>
                         <td>{tenant.settings?.employee_commissions?.[u.id] || 0}%</td>
                         <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button className="btn btn-warning" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                                const newName = prompt('Nama Karyawan:', u.name);
                                if (newName === null) return;
                                const newPhone = prompt('No WhatsApp:', u.phone || '');
                                if (newPhone === null) return;
                                const newPin = prompt('PIN Login:', u.pin);
                                if (newPin === null) return;
                                const newSalaryStr = prompt('Gaji Pokok/Bulan (Rp):', tenant.settings?.employee_salaries?.[u.id] || 0);
                                if (newSalaryStr === null) return;
                                const newCommStr = prompt('Komisi (%):', tenant.settings?.employee_commissions?.[u.id] || 0);
                                if (newCommStr === null) return;

                                try {
                                  await apiService.updateUser(u.id, { name: newName, pin: newPin, phone: newPhone });
                                  
                                  const currentSettings = tenant.settings || {};
                                  const employee_commissions = currentSettings.employee_commissions || {};
                                  const employee_salaries = currentSettings.employee_salaries || {};
                                  employee_commissions[u.id] = parseInt(newCommStr);
                                  employee_salaries[u.id] = parseInt(newSalaryStr);
                                  const newSettings = { ...currentSettings, employee_commissions, employee_salaries };
                                  await apiService.updateTenantSettings(tenant.code, newSettings);
                                  updateTenantSettings(newSettings);

                                  setUsers(users.map(x => x.id === u.id ? { ...x, name: newName, pin: newPin, phone: newPhone } : x));
                                } catch(e) { alert('Gagal edit karyawan'); }
                              }}>Edit</button>
                              <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                                if(await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Hapus anggota tim?', message: 'Akun tim ini akan dihapus dari toko.', confirmText: 'Hapus', tone: 'warning' }) : Promise.resolve(window.confirm('Yakin ingin menghapus karyawan ini?')))) {
                                  try {
                                    await apiService.deleteUser(u.id);
                                    setUsers(users.filter(x => x.id !== u.id));
                                  } catch(e) { alert('Gagal hapus karyawan'); }
                                }
                              }}>Hapus</button>
                            </div>
                         </td>
                       </tr>
                     ))}
                     {users.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada karyawan terdaftar.</td></tr>}
                   </tbody>
                 </table></div>
               </div>
             )}

             {/* TAB CONTENT: KASBON */}
             {empTab === 'kasbon' && (
               <div className="animate-fade-in">
                 <table className="table">
                   <thead><tr><th>Nama Karyawan</th><th>Nominal (Rp)</th><th>Tanggal</th><th>Aksi</th></tr></thead>
                   <tbody>
                     {transactions.filter(t => t.type === 'BON_PENDING').map(t => {
                       const empId = t.description.replace('EMP_', '');
                       const emp = users.find(u => u.id === empId);
                       return (
                         <tr key={t.id}>
                           <td>{emp ? emp.name : 'Unknown'}</td>
                           <td style={{ color: '#ef4444', fontWeight: 'bold' }}>Rp {t.amount?.toLocaleString('id-ID')}</td>
                           <td>{new Date(t.created_at).toLocaleString('id-ID')}</td>
                           <td>
                             <div style={{ display: 'flex', gap: '5px' }}>
                               <button className="btn btn-success" style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#10b981', color: 'white', border: 'none' }} onClick={async () => {
                                 if(await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Setujui kasbon?', message: 'Nominal ini akan memotong THP anggota tim.', confirmText: 'Setujui', tone: 'warning' }) : Promise.resolve(window.confirm('Setujui kasbon ini? Nominal akan memotong THP karyawan.')))) {
                                   try {
                                     await apiService.post('/transactions/update-type', { id: t.id, type: 'BON_KARYAWAN' });
                                     await apiService.delete(`/transactions/${t.id}`);
                                     await apiService.post('/transactions', { tenant_code: tenant.code, type: 'BON_KARYAWAN', amount: t.amount, description: t.description });
                                     apiService.get(`/transactions/${tenant.code}`).then(setTransactions);
                                     alert('Kasbon disetujui!');
                                   } catch(e) { alert('Gagal update kasbon'); }
                                 }
                               }}>Setujui</button>
                               <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                                 if(await (window.UnitProConfirm ? window.UnitProConfirm({ title: 'Tolak kasbon?', message: 'Pengajuan kasbon ini akan ditolak dan dihapus dari daftar.', confirmText: 'Tolak', tone: 'warning' }) : Promise.resolve(window.confirm('Tolak kasbon ini?')))) {
                                   try {
                                     await apiService.delete(`/transactions/${t.id}`);
                                     apiService.get(`/transactions/${tenant.code}`).then(setTransactions);
                                   } catch(e) { alert('Gagal tolak kasbon'); }
                                 }
                               }}>Tolak</button>
                             </div>
                           </td>
                         </tr>
                       )
                     })}
                     {transactions.filter(t => t.type === 'BON_PENDING').length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada permintaan kasbon.</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}

             {/* TAB CONTENT: ABSENSI */}
             {empTab === 'absensi' && (
               <div className="animate-fade-in">
                 <table className="table">
                   <thead><tr><th>Nama Karyawan</th><th>Status Absen</th><th>Jam Masuk</th><th>Jam Pulang</th></tr></thead>
                   <tbody>
                     {users.map(u => {
                       const todayStr = new Date().toDateString();
                       const absensi = transactions.filter(t => t.description === `ATTENDANCE_EMP_${u.id}` && new Date(t.created_at).toDateString() === todayStr);
                       const masuk = absensi.find(t => t.type === 'ATTENDANCE_IN');
                       const keluar = absensi.find(t => t.type === 'ATTENDANCE_OUT');
                       
                       return (
                         <tr key={u.id}>
                           <td>{u.name}</td>
                           <td>
                             {masuk && keluar ? <span className="badge badge-success">Selesai Shift</span> :
                              masuk ? <span className="badge badge-warning" style={{ background: '#fef08a', color: '#854d0e' }}>Sedang Bekerja</span> : 
                              <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Belum Hadir</span>}
                           </td>
                           <td>{masuk ? new Date(masuk.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                           <td>{keluar ? new Date(keluar.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                         </tr>
                       )
                     })}
                     {users.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada karyawan.</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ) : null}
      </div>

      {/* MODAL CETAK BARCODE (Stiker Thermal) */}
      {showBarcodeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '300px', backgroundColor: 'white', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowBarcodeModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="var(--text-muted)" />
            </button>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Cetak Stiker Barcode</h3>
            
            <div id="print-area" style={{ padding: '10px', border: '1px dashed #ccc', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{settings.storeName}</h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.7rem' }}>Tanda Terima Servis</p>
              <Barcode value={selectedResi} width={1.5} height={40} fontSize={14} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
              Cetak ke Printer Thermal
            </button>
          </div>
        </div>
      )}

      {/* KASBON APPROVAL NOTIFICATION */}
      {transactions.filter(t => t.type === 'BON_PENDING').length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {transactions.filter(t => t.type === 'BON_PENDING').map(bon => {
            const empId = bon.description.replace('EMP_', '');
            const emp = users.find(u => u.id === empId);
            return (
              <div key={bon.id} className="glass-panel animate-fade-in" style={{ padding: '15px', background: 'var(--bg-light)', borderLeft: '4px solid var(--warning)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '300px' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>Ajuan Kasbon Baru</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                  <strong>{emp ? emp.name : `Karyawan (${empId})`}</strong> mengajukan Kasbon sebesar <strong>Rp {bon.amount.toLocaleString('id-ID')}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={async () => {
                    try {
                      await apiService.post(`/transactions/${bon.id}/update`, { type: 'BON_KARYAWAN' });
                      setTransactions(transactions.map(t => t.id === bon.id ? { ...t, type: 'BON_KARYAWAN' } : t));
                    } catch(e) { alert('Gagal menyetujui'); }
                  }}>Setujui</button>
                  <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={async () => {
                    try {
                      await apiService.post(`/transactions/${bon.id}/update`, { type: 'BON_REJECTED' });
                      setTransactions(transactions.map(t => t.id === bon.id ? { ...t, type: 'BON_REJECTED' } : t));
                    } catch(e) { alert('Gagal menolak'); }
                  }}>Tolak</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SERVICE REGISTRATION MODAL */}
      {showServiceRegistration && (
        <div className="modal-backdrop service-registration-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(7,28,43,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <form className="glass-panel service-registration-form" onSubmit={handleCreateService} style={{ width: '100%', maxWidth: '640px', background: '#fff' }}>
            <div className="service-registration-header">
              <div>
                <p>PENERIMAAN UNIT</p>
                <h3>Daftarkan & tugaskan servis</h3>
                <span>Kolom bertanda * wajib diisi.</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setShowServiceRegistration(false)} aria-label="Tutup formulir"><X size={20} /></button>
            </div>
            <div className="service-registration-form-grid">
              <label className="label">Nama pelanggan *<input name="name" className="input-field" placeholder="Contoh: Budi Santoso" autoComplete="name" required /></label>
              <label className="label">Nomor WhatsApp *<input name="phone" type="tel" className="input-field" placeholder="081234567890" inputMode="tel" autoComplete="tel" required /></label>
              <label className="label">Perangkat *<input name="device" className="input-field" placeholder="Contoh: iPhone 13 / Laptop ASUS" required /></label>
              <label className="label">Kelengkapan unit *<input name="kelengkapan" className="input-field" placeholder="Contoh: Charger, tas / Tidak ada" required /></label>
              <label className="label service-registration-wide">Keluhan atau kerusakan *<textarea name="issue" className="input-field" placeholder="Jelaskan keluhan yang disampaikan pelanggan" rows="3" required /></label>
              <label className="label">Estimasi biaya <input name="estimasi_biaya" type="text" min="0" className="input-field" placeholder="Opsional, dalam Rupiah" inputMode="numeric"  onInput={handleMoneyInput} /></label>
              <label className="label">Estimasi selesai <input name="estimasi_waktu" className="input-field" placeholder="Opsional, misal: 3 hari" /></label>
              <label className="label service-registration-wide">Tugaskan kepada teknisi *
                <select name="technician_id" className="input-field" required defaultValue="">
                  <option value="" disabled>Pilih teknisi yang bertanggung jawab</option>
                  {users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-primary service-registration-submit"><Check size={18} /> Simpan Servis & Kirim Tugas</button>
          </form>
        </div>
      )}

      {/* BARCODE SCANNER MODAL */}
      {showScanner && (
        <BarcodeScanner 
          onScan={(text) => {
            setServiceSearchQuery(text);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* PRINT NOTA MODAL */}
      {showPrintModal && selectedService && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '350px', background: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Cetak {printType === 'pendaftaran' ? 'Nota Pendaftaran' : 'Nota Pengambilan'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Pilih jenis printer yang Anda gunakan:</p>
            {printType !== 'pendaftaran' && (
              <button className="btn" style={{ width: '100%', marginBottom: '10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }} onClick={() => setShowEditServiceNota(true)}>
                Edit Nota / Koreksi Harga
              </button>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doPrint('thermal')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> Thermal
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border-light)' }} onClick={() => doPrint('a4')}>
                <Printer size={16} style={{ display: 'inline', marginRight: '5px' }} /> A4 Biasa
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


      {showEditProductModal && editingProduct && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            const payload = { tenant_code: tenant.code, name: String(fd.get('name') || '').trim(), category: String(fd.get('category') || 'SPAREPART').toUpperCase(), price: normalizeMoneyInput(fd.get('price')), stock: String(fd.get('category') || '').toUpperCase() === 'JASA' ? 999 : (parseInt(String(fd.get('stock') || '0'), 10) || 0), imageUrl: editingProduct.imageUrl || editingProduct.image_url || '' };
            if (!payload.name) return alert('Nama barang wajib diisi.');
            try {
              setIsUpdatingProduct(true);
              const currentUser = localStorage.getItem('EMPLOYEE_NAME') || 'Kasir / Admin';
              const updated = await apiService.updateProduct(editingProduct.id, payload, editingProduct.stock, currentUser, 'Edit data barang dari Inventori');
              const nextProduct = { ...editingProduct, ...payload, ...updated, imageUrl: updated?.imageUrl || updated?.image_url || payload.imageUrl };
              setProducts(prev => prev.map(item => String(item.id) === String(editingProduct.id) ? nextProduct : item));
              setShowEditProductModal(false); setEditingProduct(null); alert('Barang berhasil diperbarui.');
            } catch (error) { alert('Gagal memperbarui barang: ' + (error.message || 'Periksa data lalu coba lagi.')); }
            finally { setIsUpdatingProduct(false); }
          }} className="glass-panel" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-light)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div><h3 style={{ margin: 0 }}>Edit Barang</h3><p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>Perbarui foto, kategori, harga, dan stok inventori.</p></div>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowEditProductModal(false); setEditingProduct(null); }}><X size={20}/></button>
            </div>
            <label className="label">Foto Barang</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {(editingProduct.imageUrl || editingProduct.image_url || editingProduct.image) ? (<img src={editingProduct.imageUrl || editingProduct.image_url || editingProduct.image} alt={editingProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<ImageIcon size={24} color="#94a3b8" />)}
              </div>
              <div style={{ flex: 1 }}>
                <input className="input-field" placeholder="URL gambar atau upload foto" value={editingProduct.imageUrl || editingProduct.image_url || ''} onChange={(e) => setEditingProduct(current => ({ ...current, imageUrl: e.target.value, image_url: e.target.value }))} />
                <label style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', border: '1px solid #bae6fd' }}><Camera size={15} /> Upload Foto Baru<input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressedBase64 = await compressImageFile(file, 800, 800, 0.7); setEditingProduct(current => ({ ...current, imageUrl: compressedBase64, image_url: compressedBase64 })); } catch (err) { alert('Gagal memproses gambar. Pastikan format gambar valid.'); } }} /></label>
              </div>
            </div>
            <label className="label">Nama Barang / Jasa</label><input name="name" className="input-field" defaultValue={editingProduct.name || ''} style={{ marginBottom: '10px' }} />
            <label className="label">Kategori</label><select name="category" className="input-field" defaultValue={editingProduct.category || 'SPAREPART'} style={{ marginBottom: '10px' }}><option value="SPAREPART">Sparepart</option><option value="AKSESORIS">Aksesoris</option><option value="JASA">Jasa</option></select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div><label className="label">Harga (Rp)</label><input name="price" type="text" inputMode="numeric" className="input-field" defaultValue={editingProduct.price || 0} onInput={handleMoneyInput} /></div><div><label className="label">Stok</label><input name="stock" type="number" min="0" className="input-field" defaultValue={editingProduct.stock || 0} /></div></div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}><button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowEditProductModal(false); setEditingProduct(null); }}>Batal</button><button type="submit" className="btn btn-primary" disabled={isUpdatingProduct} style={{ flex: 1 }}>{isUpdatingProduct ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div>
          </form>
        </div>
      )}

      {/* ONBOARDING WIZARD 5 MENIT */}
      {showOnboardingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 17, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '2.5rem 2rem',
            maxWidth: '540px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out'
          }}>
            {/* Header Badge */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{
                padding: '4px 14px', borderRadius: '100px', background: '#e0f2fe', color: '#0284c7',
                fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                ⚡ SETUP CEPAT 5 MENIT
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '10px 0 4px 0' }}>
                Selamat Datang di AISERVICE.ID 👋
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Lengkapi setup dasar agar toko Anda langsung siap bertransaksi.
              </p>
            </div>

            {/* Progress Bar Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
              {[1, 2, 3].map(step => (
                <div key={step} style={{
                  width: onboardingStep === step ? '32px' : '10px', height: '10px',
                  borderRadius: '100px', background: onboardingStep === step ? '#0284c7' : '#cbd5e1',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            {/* STEP 1: PROFIL TOKO */}
            {onboardingStep === 1 && (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' }}>
                  Langkah 1: Identitas & Bidang Usaha Toko
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Nama Toko / Usaha</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Misal: Budi Cell & Service" 
                      value={obStoreName}
                      onChange={(e) => setObStoreName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>No. WhatsApp Toko</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Misal: 081234567890" 
                      value={obStoreWa}
                      onChange={(e) => setObStoreWa(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Kategori Bidang Usaha</label>
                    <select 
                      className="input-field"
                      value={obTheme}
                      onChange={(e) => setObTheme(e.target.value)}
                    >
                      <option value="hp">📱 Servis Smartphone & Tablet (HP)</option>
                      <option value="laptop">💻 Servis Laptop & Komputer (PC)</option>
                      <option value="motor">🏍️ Bengkel Motor & Mobil</option>
                      <option value="electronics">🔌 Servis Elektronik & General Repair</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!obStoreName.trim()) return alert('Nama Toko wajib diisi!');
                    setOnboardingStep(2);
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px', marginTop: '1.5rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
                    border: 'none', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer'
                  }}
                >
                  Lanjut ke Langkah 2 →
                </button>
              </div>
            )}

            {/* STEP 2: KARYAWAN / TEKNISI PRIMER */}
            {onboardingStep === 2 && (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' }}>
                  Langkah 2: Tambah Karyawan / Teknisi Pertama
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                  Karyawan ini dapat login ke Portal Karyawan menggunakan PIN login.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Nama Karyawan (Misal: Rudi - Teknisi Utama)" 
                    value={obEmpName}
                    onChange={(e) => setObEmpName(e.target.value)}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="PIN Login (Angka)" 
                      value={obEmpPin}
                      onChange={(e) => setObEmpPin(e.target.value)}
                    />
                    <select 
                      className="input-field"
                      value={obEmpRole}
                      onChange={(e) => setObEmpRole(e.target.value)}
                    >
                      <option value="TEKNISI">Teknisi</option>
                      <option value="KASIR">Kasir</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                  <button 
                    onClick={() => setOnboardingStep(1)}
                    style={{ padding: '12px 18px', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ← Kembali
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        if (obEmpName && obEmpPin) {
                          await apiService.post('/users', { tenant_code: tenant.code, name: obEmpName, role: obEmpRole, pin: obEmpPin });
                          const uList = await apiService.getUsers(tenant.code);
                          setUsers(uList);
                        }
                        setOnboardingStep(3);
                      } catch(e) { setOnboardingStep(3); }
                    }}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
                      border: 'none', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer'
                    }}
                  >
                    Lanjut ke Langkah Akhir →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SIAP PAKAI! */}
            {onboardingStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.3rem', fontWeight: '900' }}>
                  Toko Anda Siap Digunakan!
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Selamat! Toko <strong>{obStoreName || tenant?.name}</strong> telah berhasil dikonfigurasi. Anda siap mencetak nota, mengelola servis, dan mencatat transaksi kasir POS dalam waktu kurang dari 5 menit.
                </p>
                <button 
                  onClick={async () => {
                    try {
                      const newSet = { ...tenant.settings, storeName: obStoreName, store_wa: obStoreWa, theme: obTheme };
                      await apiService.updateTenantSettings(tenant.code, newSet);
                      updateTenantSettings(newSet);
                    } catch(e) {}
                    setShowOnboardingModal(false);
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white',
                    border: 'none', fontWeight: '900', fontSize: '1.05rem', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
                  }}
                >
                  Mulai Bertransaksi Sekarang 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPGRADE PROMPT MODAL (FOR EXCEL EXPORT & PRO FEATURES) */}
      {showUpgradeModal && (
        <UpgradePrompt
          mode="modal"
          featureName="Export / Import Excel & Fitur Pro"
          featureDescription="Fitur Export/Import Excel, WhatsApp Gateway Notifikasi Otomatis, & Laporan Arus Kas Lengkap eksklusif untuk pengguna Paket Pro Titan."
          usageLabel="Fitur Eksklusif Paket Pro Titan"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Hidden iframe for printing nota */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Receipt Printer" />

    </div>
  );
}
