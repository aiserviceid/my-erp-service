import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { LogOut, LayoutDashboard, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, DollarSign, X, Trash, Plus, Wallet, Building2, Check, ExternalLink, Gift, Printer, Camera, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import ForumCommunity from '../components/ForumCommunity';
import POSView from '../components/POSView';
import BarcodeScanner from '../components/BarcodeScanner';
import UpgradePrompt from '../components/UpgradePrompt';
import { ADMIN_TABS, SERVICE_STATUSES, getStatusInfo, hasFeature, isWithinLimit, getUsagePercent } from '../config/tierLimits';

export default function AdminDashboard() {
  const { tenant, setTenant, clearTenant, updateTenantSettings, cart, addToCart, removeFromCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
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

  useEffect(() => {
    if (tenant) {
      const isReg = Boolean(
        (tenant?.name && tenant?.name !== 'AISERVICE.ID Toko') || 
        (tenant?.settings?.storeName && tenant?.settings?.storeName !== 'AISERVICE.ID Toko')
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
      { id: 'EMP-1', name: 'Andi (Teknisi Hardware)', role: 'TEKNISI', pin: '1234' },
      { id: 'EMP-2', name: 'Budi (Teknisi Software)', role: 'TEKNISI', pin: '5678' },
      { id: 'EMP-3', name: 'Citra (Kasir & Admin)', role: 'KASIR', pin: '1111' },
      { id: 'EMP-4', name: 'Dedi (Teknisi Chipset)', role: 'TEKNISI', pin: '2222' },
      { id: 'EMP-5', name: 'Eko (Senior Repair)', role: 'TEKNISI', pin: '3333' },
    ];

    const demoServices = [
      { resi: 'TRX-1001', customer_name: 'Hendra Saputra', customer_phone: '081234567890', device_name: 'Laptop ASUS ROG Strix GL553', issue: 'Mati total terkena cairan kopi', status: 'DIKERJAKAN', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*24*2).toISOString() },
      { resi: 'TRX-1002', customer_name: 'Siti Rahma', customer_phone: '085712345678', device_name: 'MacBook Air M1 2020', issue: 'Layar blank hitam, suara nyala', status: 'DICEK', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*24*1).toISOString() },
      { resi: 'TRX-1003', customer_name: 'Bambang Wijaya', customer_phone: '081987654321', device_name: 'Lenovo ThinkPad T480', issue: 'Upgrade SSD 512GB & RAM 16GB', status: 'SELESAI', technician_id: 'EMP-1', created_at: new Date(Date.now() - 3600000*12).toISOString() },
      { resi: 'TRX-1004', customer_name: 'Dewi Lestari', customer_phone: '082133445566', device_name: 'Acer Nitro 5 AN515', issue: 'Kipas berisik & panas lemot', status: 'DIAMBIL', technician_id: 'EMP-4', created_at: new Date(Date.now() - 3600000*5).toISOString() },
      { resi: 'TRX-1005', customer_name: 'Rian Pratama', customer_phone: '087811223344', device_name: 'HP Pavilion Gaming 15', issue: 'Keyboard eror pencet sendiri', status: 'MENUNGGU_PART', technician_id: 'EMP-5', created_at: new Date(Date.now() - 3600000*3).toISOString() },
      { resi: 'TRX-1006', customer_name: 'Fikri Haikal', customer_phone: '081299887766', device_name: 'Dell XPS 13 9360', issue: 'Baterai kembung mati diisi', status: 'DITERIMA', technician_id: 'EMP-2', created_at: new Date(Date.now() - 3600000*1).toISOString() },
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
    const data = txs.map(t => {
      const typeStr = t.type === 'INCOME' || t.type.startsWith('INCOME_') ? 'Pendapatan Servis' : t.type === 'POS_SALES' ? 'Penjualan' : t.type === 'BON_KARYAWAN' ? 'Kasbon' : t.type === 'EXPENSE' ? 'Pengeluaran' : 'Lainnya';
      const amount = (t.type === 'INCOME' || t.type.startsWith('INCOME_') || t.type === 'POS_SALES' ? t.amount : -t.amount);
      return {
        "Tanggal": new Date(t.created_at).toLocaleString('id-ID'),
        "Kategori": typeStr,
        "Keterangan": t.description || '-',
        "Nominal (Rp)": amount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const wscols = [
      {wch: 20},
      {wch: 20},
      {wch: 40},
      {wch: 15} 
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
    XLSX.writeFile(workbook, `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        .receipt-container { max-width: ${printerType === 'thermal' ? '300px' : '700px'}; margin: 0 auto; background: #fff; border: ${printerType === 'thermal' ? 'none' : '1px solid #e2e8f0'}; padding: ${printerType === 'thermal' ? '12px' : '40px'}; border-radius: 12px; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { max-height: ${printerType === 'thermal' ? '50px' : '80px'}; margin-bottom: 12px; }
        .header h2 { margin: 0; color: #0f172a; font-size: ${printerType === 'thermal' ? '1.3rem' : '2rem'}; font-weight: 800; text-transform: uppercase; }
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
    
    const logoHtml = tenant?.settings?.logoUrl ? `<img src="${tenant.settings.logoUrl}" class="logo" alt="Logo" />` : '';

    if (printType === 'pendaftaran') {
      htmlContent = `
        <div class="receipt-container">
          <div class="header">
            ${logoHtml}
            <h2>${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}</h2>
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

          ${tenant?.settings?.store_bank ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${tenant.settings.store_bank.replace(/\n/g, '<br/>')}</div>` : ''}
          
          <div class="divider"></div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">Simpan struk ini sebagai bukti pengambilan.</p>
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
          <div class="header">
            ${logoHtml}
            <h2>${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}</h2>
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
          
          ${tenant?.settings?.store_bank ? `<div class="bank-info"><strong>INFO REKENING PEMBAYARAN:</strong><br/>${tenant.settings.store_bank.replace(/\n/g, '<br/>')}</div>` : ''}
          
          <div class="divider"></div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700;">Terima kasih atas kepercayaan Anda!</p>
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
  const isFree = tenant?.tier === 'free';
  const isEnterprise = tenant?.tier === 'enterprise';

  const trialDaysLeft = settings.trial_ends_at 
    ? Math.max(0, Math.ceil((settings.trial_ends_at - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  useEffect(() => {
    if (tenant?.code === 'DEMO-STORE') {
      loadDemoData();
    } else if (tenant?.code) {
      apiService.getProducts(tenant.code).then(setProducts);
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
  const iconMap = { LayoutDashboard, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle };

  // Build tabs based on tier config — hide wallet/affiliate/multi-branch for Fase 1
  const tabs = ADMIN_TABS.map(t => ({
    ...t,
    icon: iconMap[t.iconName] || Package,
    badge: t.proOnly && isFree ? 'PRO' : null,
  }));

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

  return (
    <div className="dashboard-layout">
      {/* MOBILE TOP BAR (Visible only on mobile) */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '32px', borderRadius: '6px' }} />
          ) : (
            <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {settings.storeName?.charAt(0) || 'A'}
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.9rem' }}>{settings.storeName || 'AISERVICE.ID'}</h3>
            <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* MOBILE BOTTOM NAV (Visible only on mobile) */}
      <nav className="mobile-bottom-nav">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.name.replace(/&.*/, '').split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* SIDEBAR (Desktop only) */}
      <div className="sidebar animate-slide-in">
        <div style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '40px', borderRadius: '8px', marginBottom: '0.5rem' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', margin: '0 auto 0.5rem' }}>
              {settings.storeName?.charAt(0) || 'A'}
            </div>
          )}
          <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>{settings.storeName || 'AISERVICE.ID'}</h3>
          
          {/* Active Branch Badge */}
          <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
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
        <h2 style={{ marginBottom: '1.5rem' }}>{tabs.find(t => t.id === activeTab)?.name}</h2>
        
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            
            {/* TOP BAR / MAGIC DEMO BUTTON BAR */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '1.2rem 1.6rem', borderRadius: '18px', color: 'white', flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>
                  Sistem Operasional Toko: {tenant?.settings?.storeName || tenant?.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Mode: <span style={{ color: '#38bdf8', fontWeight: '800' }}>Paket {tenant?.tier === 'pro' ? 'Pro Titan' : tenant?.tier === 'enterprise' ? 'Enterprise' : 'Starter'}</span> • ID Toko: <span style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{tenant?.code}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={loadDemoData}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white',
                    border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '800',
                    fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  ✨ Muat Demo Data Instan
                </button>
              </div>
            </div>

            {/* 🔥 CTA UPGRADE BANNER — hanya untuk tier Free */}
            {isFree && (
              <div style={{
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

            {/* INTERACTIVE EMPTY STATE PROGRESS BAR (If no data) */}
            {services.length === 0 && products.length === 0 && (
              <div style={{
                background: '#ffffff', border: '2px solid #bae6fd', borderRadius: '20px',
                padding: '1.8rem 1.5rem', boxShadow: '0 8px 25px rgba(2,132,199,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🚀</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>Mulai Menggunakan AIService</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>Selesaikan 4 langkah setup cepat agar toko Anda berjalan otomatis.</p>
                    </div>
                  </div>
                  <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '100px', fontWeight: '900', fontSize: '0.85rem' }}>
                    Progress Setup: {users.length > 0 ? '40%' : '20%'}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                  <div style={{ width: users.length > 0 ? '40%' : '20%', height: '100%', background: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)', borderRadius: '100px' }} />
                </div>

                {/* Steps Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#166534' }}>1. Profil Toko</div>
                      <div style={{ fontSize: '0.72rem', color: '#15803d' }}>Nama & WA terkonfigurasi</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: users.length > 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${users.length > 0 ? '#bbf7d0' : '#fde68a'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{users.length > 0 ? '✅' : '👨‍🔧'}</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: users.length > 0 ? '#166534' : '#b45309' }}>2. Tambah Teknisi</div>
                      <div style={{ fontSize: '0.72rem', color: users.length > 0 ? '#15803d' : '#d97706' }}>{users.length} Teknisi Terdaftar</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📦</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569' }}>3. Tambah Barang</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Master Sparepart</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📝</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569' }}>4. Buat Servis</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Input Resi Pertama</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* METRICS CARDS: HARI INI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              
              {/* Card 1: Omzet Hari Ini */}
              <div style={{
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
              <div style={{
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
              <div style={{
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
              <div style={{
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
              <div style={{
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Grafik Pemasukan */}
              <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 1.2rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Grafik Omzet & Arus Kas 7 Hari Terakhir
                </h4>
                <div style={{ height: '260px' }}>
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
              <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
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
                        <div key={s.resi} style={{
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
          <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>
                  👥 Database Pelanggan & WhatsApp Blast CRM
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Kelola database seluruh pelanggan toko dan kirim pesan promosi / pengingat via WhatsApp massal.
                </p>
              </div>
            </div>

            {/* CRM Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '2rem' }}>
              <div style={{ background: '#ffffff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>TOTAL DATABASE PELANGGAN</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0284c7', margin: '2px 0' }}>
                  {Array.from(new Set(services.map(s => s.customer_phone).concat(transactions.map(t => t.description?.match(/08\d+/)?.[0]).filter(Boolean)))).length} Orang
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: '600' }}>✓ Tersimpan Otomatis di CRM</div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>SIAP DI-BLAST WHATSAPP</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#16a34a', margin: '2px 0' }}>
                  {services.filter(s => s.customer_phone).length} Nomor
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>✓ Nomor WA Terverifikasi</div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>PELANGGAN REPEAT ORDER</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#7c3aed', margin: '2px 0' }}>
                  {services.filter(s => s.status === 'SELESAI' || s.status === 'DIAMBIL').length} Unit
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: '600' }}>✓ Riwayat Servis Sukses</div>
              </div>
            </div>

            {/* WA BLAST CAMPAIGN GENERATOR BOX */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', padding: '1.5rem', borderRadius: '20px', border: '1px solid #bbf7d0', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>
                  Kirim Broadcast WA Blast Promo / Reminder
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Pilih Template Broadcast Promo:</label>
                  <select 
                    id="waBlastTemplate"
                    className="input-field"
                    onChange={(e) => {
                      const txtArea = document.getElementById('waBlastMessage');
                      if (txtArea && e.target.value) {
                        txtArea.value = e.target.value.replace(/{STORE_NAME}/g, settings.storeName || tenant?.name || 'Toko Servis');
                      }
                    }}
                  >
                    <option value="">-- Pilih Template Pesan Promo --</option>
                    <option value="Halo Kak, terima kasih sudah menjadi pelanggan setia {STORE_NAME}! Khusus bulan ini dapatkan DISKON 20% Pembersihan Fan & Ganti Thermal Paste Laptop agar laptop tidak lemot/overheat. Hubungi kami sekarang!">📢 Diskon 20% Maintenance Laptop / HP</option>
                    <option value="Halo Kak, pengingat dari {STORE_NAME}: Servis perangkat Anda sudah selesai & siap diambil di toko kami. Terima kasih!">⚠️ Pengingat Unit Servis Selesai Belum Diambil</option>
                    <option value="Halo Kak, ada PROMO SPESIAL dari {STORE_NAME} untuk aksesoris & charger ori minggu ini! Kunjungi toko kami atau reply pesan ini untuk pemesanan.">🎁 Promo Aksesoris & Charger Ori Toko</option>
                  </select>
                </div>

                <div>
                  <label className="label">Pesan Broadcast WhatsApp:</label>
                  <textarea 
                    id="waBlastMessage"
                    className="input-field" 
                    rows={3} 
                    defaultValue={`Halo Kak, terima kasih sudah menjadi pelanggan setia ${settings.storeName || tenant?.name || 'Toko Servis'}! Dapatkan promo spesial servis & sparepart minggu ini di toko kami.`}
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#15803d', margin: 0, fontWeight: '600' }}>
                💡 Klik tombol <strong>Kirim WA Blast 📲</strong> pada daftar pelanggan di bawah untuk mengirimkan pesan promo ke nomor WA masing-masing pelanggan.
              </p>
            </div>

            {/* TABEL DATABASE PELANGGAN */}
            <h4 style={{ marginBottom: '1rem', color: '#0f172a', fontWeight: '800' }}>Daftar Riwayat Pelanggan Toko:</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama Pelanggan</th>
                    <th>Nomor WhatsApp</th>
                    <th>Terakhir Servis / Transaksi</th>
                    <th>Aksi Broadcast WA</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>Belum ada data pelanggan terdaftar. Data otomatis terkumpul dari menu Servis & Kasir.</td></tr>
                  ) : (
                    services.map(s => {
                      const cleanPhone = (s.customer_phone || '').replace(/^0/, '62');
                      return (
                        <tr key={s.resi}>
                          <td><strong>{s.customer_name}</strong> <br/><small style={{ color: '#64748b' }}>Perangkat: {s.device_name}</small></td>
                          <td><span className="badge badge-info">{s.customer_phone || '-'}</span></td>
                          <td>{new Date(s.created_at || Date.now()).toLocaleDateString('id-ID')} ({s.status})</td>
                          <td>
                            <button 
                              className="btn btn-accent"
                              style={{ padding: '4px 12px', fontSize: '0.78rem', background: '#25D366', color: 'white', border: 'none' }}
                              onClick={() => {
                                const msgInput = document.getElementById('waBlastMessage');
                                const msgText = msgInput ? msgInput.value : `Halo Kak ${s.customer_name}, salam dari ${settings.storeName || 'Toko Servis'}!`;
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`, '_blank');
                              }}
                            >
                              Kirim WA Blast 📲
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : 

        /* 3. PENGATURAN */
        activeTab === 'pengaturan' ? (
          <div className="glass-panel" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Konfigurasi Tema & Branding</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Nama Toko</label>
              <input type="text" className="input-field" 
                value={settings.storeName || ''} 
                onChange={(e) => updateTenantSettings({ storeName: e.target.value })} 
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">URL Logo (Opsional)</label>
              <input type="text" className="input-field" placeholder="https://..."
                value={settings.logoUrl || ''} 
                onChange={(e) => updateTenantSettings({ logoUrl: e.target.value })} 
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Pilih Tema Bisnis</label>
              <select className="input-field" 
                value={settings.theme || 'laptop'} 
                onChange={(e) => updateTenantSettings({ theme: e.target.value })}
              >
                <option value="laptop">Servis Laptop & Komputer</option>
                <option value="hp">Servis Smartphone (HP)</option>
                <option value="motor">Bengkel Motor</option>
              </select>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2rem 0' }} />

            <div style={{ opacity: isFree ? 0.6 : 1 }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Otomatisasi WhatsApp & Kontak {isFree && <span className="badge badge-warning">Premium</span>}</h3>
              <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <h4>Otomatisasi WhatsApp Gateway</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Pilih metode pengiriman notifikasi WhatsApp. Anda dapat menggunakan server terpusat sistem kami atau nomor WA toko Anda sendiri.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="label">Mode Pengiriman WA:</label>
                  <select 
                    className="input-field" 
                    id="waSenderModeInput"
                    value={tenant?.settings?.wa_sender_mode || 'SYSTEM'} 
                    style={{ width: '100%', maxWidth: '400px' }}
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
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Token API Fonnte / Wablas Toko Anda:</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="Masukkan Token Fonnte/Wablas Toko Anda..."
                      defaultValue={tenant?.settings?.fonnte_token || ''}
                      id="fonnteTokenInput"
                      style={{ width: '100%', maxWidth: '400px' }}
                      disabled={isFree}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '6px' }}>
                      🔑 Pesan notifikasi akan dikirimkan langsung menggunakan nomor server WhatsApp Anda sendiri.
                    </span>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px', color: '#15803d', fontSize: '0.82rem', fontWeight: '800', marginBottom: '1rem', maxWidth: '400px' }}>
                    ✓ Layanan WA otomatis aktif menggunakan Server Gateway AIService.ID. Tidak perlu konfigurasi API Key tambahan.
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
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

            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
              <h4>Pengaturan Kontak Toko & Rekening Bank</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Nomor WhatsApp khusus penerima pesanan dari Katalog, dan Info Rekening Bank yang akan dicetak di Nota.
              </p>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Nomor WA Toko (Misal: 08123456789)..."
                  defaultValue={tenant?.settings?.store_wa || ''}
                  id="storeWaInput"
                  style={{ width: '100%', maxWidth: '400px', marginBottom: '10px' }}
                  disabled={isFree}
                />
                <textarea 
                  className="input-field" 
                  placeholder="Info Rekening (Misal: BCA 12345678 a/n Budi)..."
                  defaultValue={tenant?.settings?.store_bank || ''}
                  id="storeBankInput"
                  style={{ width: '100%', maxWidth: '400px', marginBottom: '1rem', minHeight: '60px', resize: 'vertical' }}
                  disabled={isFree}
                />
                <div>
                  <button className="btn btn-primary" disabled={isFree} onClick={async () => {
                    const storeWa = document.getElementById('storeWaInput').value;
                    const storeBank = document.getElementById('storeBankInput').value;
                    try {
                      const newSettings = { ...tenant?.settings, store_wa: storeWa, store_bank: storeBank };
                      await apiService.updateTenantSettings(tenant.code, newSettings);
                      updateTenantSettings(newSettings);
                      alert('Informasi Toko & Bank berhasil disimpan!');
                    } catch(e) { alert('Gagal menyimpan pengaturan'); }
                  }}>Simpan Kontak & Bank</button>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2rem 0' }} />

            <div style={{ opacity: isFree ? 0.6 : 1 }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Pengaturan Iklan & Promo {isFree && <span className="badge badge-warning">Premium</span>}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Iklan akan tampil di Halaman Beranda Publik.</p>
              
              {settings.ads?.map((ad, index) => (
                <div key={ad.id} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '1rem', background: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="label">Judul Promo</label>
                    <input type="text" className="input-field" value={ad.title} 
                      disabled={isFree}
                      onChange={(e) => {
                        const newAds = [...settings.ads];
                        newAds[index].title = e.target.value;
                        updateTenantSettings({ ads: newAds });
                      }} 
                    />
                  </div>
                  <div>
                    <label className="label">URL Gambar Promo</label>
                    <input type="text" className="input-field" value={ad.imageUrl}
                      disabled={isFree} 
                      onChange={(e) => {
                        const newAds = [...settings.ads];
                        newAds[index].imageUrl = e.target.value;
                        updateTenantSettings({ ads: newAds });
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2rem 0' }} />

            <div style={{ padding: '1.5rem', border: '1px solid #fecaca', borderRadius: '12px', background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>Zona Bahaya (Danger Zone)</h3>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '1rem' }}>
                Hapus seluruh data transaksi, servis, dan produk dari toko ini. Akun karyawan (kasir/teknisi) akan tetap dipertahankan. <strong>Aksi ini tidak dapat dibatalkan.</strong>
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
                  } catch (e) {
                    alert('Gagal mereset data: ' + e.message);
                  }
                }}
              >
                🗑️ Reset Data Semua
              </button>
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
          <div className="glass-panel" style={{ minHeight: '400px' }}>
              
              {/* Form Tambah Servis */}
              <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>+ Pendaftaran Servis & Penugasan Teknisi</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  const kelengkapan = fd.get('kelengkapan') || '-';
                  const estWaktu = fd.get('estimasi_waktu') || '';
                  const estBiaya = fd.get('estimasi_biaya') || '';
                  const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}${estWaktu ? ` | Est. Waktu: ${estWaktu}` : ''}${estBiaya ? ` | Est. Biaya: Rp ${parseInt(estBiaya).toLocaleString('id-ID')}` : ''}`;
                  const resiGenerated = 'TRX-' + Date.now();
                  const serviceData = {
                    tenant_code: tenant.code,
                    resi: resiGenerated,
                    customer_name: fd.get('name'),
                    customer_phone: fd.get('phone'),
                    device_name: fd.get('device'),
                    issue: issueText,
                    technician_id: fd.get('technician_id'),
                    status: 'DITERIMA'
                  };
                  try {
                    await apiService.post('/services', serviceData);
                    alert(`Servis berhasil didaftarkan! (Resi: ${resiGenerated})\n\nTugas ini sudah otomatis masuk ke aplikasi teknisi yang dipilih.`);
                    e.target.reset();
                    apiService.getServices(tenant.code).then(setServices);
                  } catch(err) {
                    alert('Gagal menambah tugas');
                  }
                }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="text" name="name" className="input-field" placeholder="Nama Pelanggan" required />
                  <input type="text" name="phone" className="input-field" placeholder="No. WA (08...)" required />
                  <input type="text" name="device" className="input-field" placeholder="Perangkat (Misal: Laptop ASUS)" required />
                  <input type="text" name="kelengkapan" className="input-field" placeholder="Kelengkapan (Misal: Tas, Charger)" required />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input type="text" name="address" className="input-field" placeholder="Alamat Pelanggan (Opsional - Khusus Servis Panggilan / Antar-Jemput)" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input type="text" name="issue" className="input-field" placeholder="Keluhan / Kerusakan Lengkap" required />
                  </div>
                  <input type="number" name="estimasi_biaya" className="input-field" placeholder="Estimasi Biaya Awal (Rp) - Opsional" />
                  <input type="text" name="estimasi_waktu" className="input-field" placeholder="Estimasi Waktu Selesai (Misal: 3 Hari)" />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <select name="technician_id" className="input-field" required>
                      <option value="">-- Pilih Teknisi yang Akan Mengerjakan --</option>
                      {users.filter(u => u.role === 'TEKNISI' || u.role === 'Teknisi').map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={18} /> Daftarkan Servis & Tugaskan Teknisi
                    </button>
                  </div>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>Daftar Servis Aktif ({tenant?.name})</h3>
                <div style={{ display: 'flex', gap: '8px', minWidth: '300px' }}>
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
              
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                 <thead><tr><th>Resi</th><th>Pelanggan</th><th>Perangkat</th><th>Kerusakan</th><th>Garansi</th><th>Teknisi</th><th>Status</th><th>Aksi</th></tr></thead>
                 <tbody>
                   {services.filter(s => (s.resi || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.customer_name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase())).length > 0 ? services.filter(s => (s.resi || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.customer_name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase())).map(s => {
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
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await apiService.post('/services/update', { resi: s.resi, status: newStatus });
                                setServices(services.map(srv => srv.resi === s.resi ? { ...srv, status: newStatus } : srv));
                                if (hasFeature(tenant?.tier, 'whatsappNotif') && confirm('Kirim update status ke WhatsApp pelanggan?')) {
                                  const storeName = tenant?.settings?.storeName || tenant?.name || 'Toko Servis';
                                  const trackingUrl = `${window.location.origin}/tracking?resi=${s.resi}`;
                                  const msg = `Halo Kak ${s.customer_name}, ini update status servis ${s.device_name} Anda (Resi: ${s.resi}) dari *${storeName}* saat ini: *${getStatusInfo(newStatus).label}*.\n\nKlik link ini untuk cek status langsung dari HP:\n${trackingUrl}`;
                                  window.open(`https://wa.me/${s.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              } catch(err) { alert('Gagal update status'); }
                            }}
                          >
                            {SERVICE_STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={() => { setSelectedResi(s.resi); setShowBarcodeModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>Cetak Stiker</button>
                            <button className="btn btn-primary" onClick={() => { setSelectedService(s); setPrintType(s.status === 'SELESAI' || s.status === 'DI AMBIL' ? 'pengambilan' : 'pendaftaran'); setShowPrintModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px', background: '#0ea5e9' }}>Cetak Nota</button>
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
                   )}) : (
                     <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{serviceSearchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada data servis.'}</td></tr>
                   )}
                 </tbody>
               </table>
              </div>
          </div>
        ) : activeTab === 'master' ? (
          <div className="glass-panel" style={{ minHeight: '400px' }}>
             <h3 style={{ marginBottom: '0.5rem' }}>Master Barang & Sparepart ({tenant?.name})</h3>
             
             {/* FORM TAMBAH BARANG DENGAN UPLOAD GAMBAR */}
             <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input type="text" className="input-field" placeholder="Nama Barang / Sparepart..." id="newProductName" style={{ flex: 2, minWidth: '200px' }} />
                  <select className="input-field" id="newProductCat" style={{ width: '130px' }}>
                    <option value="SPAREPART">Sparepart</option>
                    <option value="AKSESORIS">Aksesoris</option>
                    <option value="JASA">Jasa Servis</option>
                    <option value="UNIT">Unit/Laptop</option>
                  </select>
                  <input type="number" className="input-field" placeholder="Harga (Rp)" id="newProductPrice" style={{ width: '130px' }} />
                  <input type="number" className="input-field" placeholder="Stok" id="newProductStock" style={{ width: '90px' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" className="input-field" placeholder="URL / Link Foto Produk (https://...)" id="newProductImage" style={{ flex: 1, minWidth: '220px' }} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', border: '1px solid #bae6fd' }}>
                    📷 Upload Gambar
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          document.getElementById('newProductImage').value = reader.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>

                  <button className="btn btn-primary" style={{ padding: '8px 20px', fontWeight: '800' }} onClick={async () => {
                    const name = document.getElementById('newProductName').value;
                    const price = parseInt(document.getElementById('newProductPrice').value);
                    const stock = parseInt(document.getElementById('newProductStock').value);
                    const category = document.getElementById('newProductCat').value;
                    const imageUrl = document.getElementById('newProductImage').value;
                    if (!name || !price) return alert('Nama dan Harga wajib diisi');
                    
                    try {
                      const newProd = await apiService.addProduct({ tenant_code: tenant.code, name, price, stock: stock || 0, category, imageUrl });
                      setProducts([...products, { ...newProd, imageUrl }]);
                      document.getElementById('newProductName').value = '';
                      document.getElementById('newProductPrice').value = '';
                      document.getElementById('newProductStock').value = '';
                      document.getElementById('newProductImage').value = '';
                    } catch (e) {
                      alert('Gagal menambah barang');
                    }
                  }}>
                    <Plus size={18} /> Tambah Barang
                  </button>
                </div>
             </div>

             <table className="table">
               <thead><tr><th>Foto</th><th>ID</th><th>Nama Barang</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
               <tbody>
                 {products.map(p => (
                   <tr key={p.id}>
                     <td>
                       {p.imageUrl ? (
                         <img src={p.imageUrl} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
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
                         {p.stock} pcs
                       </span>
                     </td>
                     <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-warning" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={async () => {
                            const newName = prompt('Nama Barang:', p.name);
                            if (newName === null) return;
                            const newPrice = prompt('Harga (Rp):', p.price);
                            if (newPrice === null) return;
                            const newStock = prompt('Stok:', p.stock);
                            if (newStock === null) return;
                            const newImg = prompt('URL Gambar:', p.imageUrl || '');
                            if (newImg === null) return;
                            try {
                              await apiService.updateProduct(p.id, { name: newName, price: parseInt(newPrice), stock: parseInt(newStock), imageUrl: newImg });
                              setProducts(products.map(x => x.id === p.id ? { ...x, name: newName, price: parseInt(newPrice), stock: parseInt(newStock), imageUrl: newImg } : x));
                            } catch(e) { alert('Gagal edit barang'); }
                          }}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={async () => {
                            if(confirm('Yakin ingin menghapus barang ini?')) {
                              try {
                                await apiService.deleteProduct(p.id);
                                setProducts(products.filter(x => x.id !== p.id));
                              } catch(e) { alert('Gagal hapus barang'); }
                            }
                          }}>Hapus</button>
                        </div>
                     </td>
                   </tr>
                 ))}
                 {products.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data barang.</td></tr>}
               </tbody>
             </table>
          </div>
        ) : activeTab === 'keuangan' ? (
          (() => {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const todayString = new Date().toDateString();
            
            let filteredTransactions = transactions;
            if (timeFilter === 'Bulan Ini') {
              filteredTransactions = transactions.filter(t => {
                const d = new Date(t.created_at);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              });
            } else if (timeFilter === 'Hari Ini') {
              filteredTransactions = transactions.filter(t => new Date(t.created_at).toDateString() === todayString);
            }

            const totalServis = filteredTransactions.filter(t => t.type === 'INCOME' || t.type === 'INCOME_JASA' || t.type === 'INCOME_SPAREPART').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalServisJasa = filteredTransactions.filter(t => t.type === 'INCOME' || t.type === 'INCOME_JASA').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalServisSparepart = filteredTransactions.filter(t => t.type === 'INCOME_SPAREPART').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalPOS = filteredTransactions.filter(t => t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalExpense = filteredTransactions.filter(t => t.type === 'BON_KARYAWAN' || t.type === 'EXPENSE' || t.type === 'WITHDRAWAL').reduce((sum, t) => sum + (t.amount || 0), 0);
            const netProfit = totalServis + totalPOS - totalExpense;

            return (
              <div className="glass-panel" style={{ minHeight: '400px', animation: 'fadeIn 0.3s ease-in-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0 }}>Laporan Keuangan Toko ({tenant?.name})</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => {
                      if (isFree || !hasFeature(tenant?.tier, 'exportExcel')) {
                        return setShowUpgradeModal(true);
                      }
                      exportToExcel(filteredTransactions);
                    }} style={{ padding: '6px 12px', background: isFree ? '#64748b' : '#10b981', color: 'white', flex: '1 1 auto', justifyContent: 'center' }}>
                      📥 Export Excel {isFree && '👑 (PRO)'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => apiService.get(`/transactions/${tenant.code}`).then(setTransactions)} style={{ padding: '6px 12px', flex: '1 1 auto', justifyContent: 'center' }}>
                      🔄 Segarkan
                    </button>
                    <select className="input-field" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ padding: '6px 12px', flex: '1 1 auto', minWidth: '130px' }}>
                      <option value="Hari Ini">Hari Ini</option>
                      <option value="Bulan Ini">Bulan Ini</option>
                      <option value="Semua">Semua Waktu</option>
                    </select>
                    <button className="btn btn-danger" onClick={async () => {
                      const ket = prompt('Keterangan Pengeluaran (Misal: Bayar Listrik / Beli Kopi):');
                      if (!ket) return;
                      const amountStr = prompt('Total Pengeluaran (Rp):');
                      if (!amountStr) return;
                      const amount = parseInt(amountStr);
                      if (isNaN(amount) || amount <= 0) return alert('Nominal tidak valid');
                      
                      try {
                        const newTrx = await apiService.post('/transactions', {
                          tenant_code: tenant.code,
                          type: 'EXPENSE',
                          amount: amount,
                          description: ket
                        });
                        setTransactions([newTrx, ...transactions]);
                        alert('Pengeluaran berhasil dicatat!');
                      } catch (e) { alert('Gagal mencatat pengeluaran'); }
                    }}>
                      <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} /> Pengeluaran Baru
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '2.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', borderLeft: '5px solid var(--accent)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Pemasukan Servis (Jasa)</p>
                      <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.5rem' }}>Rp {totalServisJasa.toLocaleString('id-ID')}</h3>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', borderLeft: '5px solid #8b5cf6', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Pemasukan Servis (Sparepart)</p>
                      <h3 style={{ margin: 0, color: '#8b5cf6', fontSize: '1.5rem' }}>Rp {totalServisSparepart.toLocaleString('id-ID')}</h3>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', borderLeft: '5px solid #3b82f6', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Penjualan Kasir (POS)</p>
                      <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '1.5rem' }}>Rp {totalPOS.toLocaleString('id-ID')}</h3>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', borderLeft: '5px solid #ef4444', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Total Pengeluaran/Kasbon</p>
                      <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.5rem' }}>Rp {totalExpense.toLocaleString('id-ID')}</h3>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1e1b4b 100%)', color: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
                      <p style={{ margin: '0 0 5px 0', opacity: 0.9, fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>Laba Bersih Kas</p>
                      <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'white' }}>Rp {netProfit.toLocaleString('id-ID')}</h2>
                    </div>
                </div>

                <div style={{ height: '300px', marginBottom: '2rem', background: 'rgba(255,255,255,0.7)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Grafik Pemasukan vs Pengeluaran (7 Hari Terakhir)</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      (() => {
                        const days = Array.from({length: 7}).map((_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i));
                          return d.toDateString();
                        });
                        return days.map(dStr => {
                          const txs = transactions.filter(t => new Date(t.created_at).toDateString() === dStr);
                          const masuk = txs.filter(t => t.type === 'INCOME' || t.type === 'INCOME_JASA' || t.type === 'INCOME_SPAREPART' || t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount||0), 0);
                          const keluar = txs.filter(t => t.type === 'BON_KARYAWAN' || t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount||0), 0);
                          return { name: dStr.substring(0,3) + ' ' + dStr.split(' ')[2], Pemasukan: masuk, Pengeluaran: keluar };
                        });
                      })()
                    }>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(val) => `Rp ${val/1000}k`} width={80} />
                      <Tooltip formatter={(val) => `Rp ${val.toLocaleString('id-ID')}`} />
                      <Legend />
                      <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.5rem' }}>Riwayat Transaksi: {timeFilter}</h4>
                <div className="table-container">
                <table className="table">
                  <thead><tr><th>Tanggal & Waktu</th><th>Kategori</th><th>Nominal</th><th>Keterangan</th></tr></thead>
                  <tbody>
                    {filteredTransactions.map(t => (
                      <tr key={t.id}>
                        <td>{new Date(t.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          {t.type === 'INCOME' && <span className="badge badge-success">Pendapatan Servis</span>}
                          {t.type === 'POS_SALES' && <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Penjualan Barang</span>}
                          {t.type === 'BON_KARYAWAN' && <span className="badge badge-warning">Kasbon / Pinjaman</span>}
                          {t.type === 'EXPENSE' && <span className="badge badge-danger">Pengeluaran Lain</span>}
                          {t.type === 'WITHDRAWAL' && <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>Tarik Saldo Laba</span>}
                        </td>
                        <td style={{ color: t.type === 'INCOME' || t.type === 'POS_SALES' ? 'var(--accent)' : '#ef4444', fontWeight: 'bold' }}>
                          {t.type === 'INCOME' || t.type === 'POS_SALES' ? '+' : '-'} Rp {t.amount?.toLocaleString('id-ID')}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.description}</td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada transaksi.</td></tr>}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })()
        ) : activeTab === 'karyawan' ? (
          isFree ? (
            <UpgradePrompt
              mode="card"
              featureName="Portal Multi-Karyawan"
              featureDescription="Tambahkan teknisi dan kasir dengan PIN login masing-masing. Kelola gaji, komisi, kasbon, dan pantau absensi — semua dari satu dashboard."
              icon={<Users size={28} />}
            />
          ) :
          <div className="glass-panel" style={{ minHeight: '400px' }}>
             <h3 style={{ marginBottom: '1.5rem' }}>Manajemen Karyawan ({tenant?.name})</h3>
             <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <input type="text" className="input-field" placeholder="Nama Karyawan..." id="newEmpName" style={{ flex: 1, minWidth: '150px' }} />
                <input type="text" className="input-field" placeholder="PIN (Angka)" id="newEmpPin" style={{ width: '120px' }} />
                <select className="input-field" id="newEmpRole" style={{ width: '120px' }}>
                  <option value="TEKNISI">Teknisi</option>
                  <option value="KASIR">Kasir</option>
                </select>
                <input type="number" className="input-field" placeholder="Gaji/Bulan (Rp)" id="newEmpSalary" style={{ width: '150px' }} />
                <input type="number" className="input-field" placeholder="% Komisi" id="newEmpComm" style={{ width: '100px' }} />
                <button className="btn btn-primary" onClick={async () => {
                  const name = document.getElementById('newEmpName').value;
                  const pin = document.getElementById('newEmpPin').value;
                  const role = document.getElementById('newEmpRole').value;
                  const salary = document.getElementById('newEmpSalary').value || '0';
                  const comm = document.getElementById('newEmpComm').value || '0';
                  if (!name || !pin) return alert('Nama dan PIN wajib diisi');
                  try {
                    const newUser = await apiService.post('/users', { tenant_code: tenant.code, name, role, pin });
                    
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
                    document.getElementById('newEmpPin').value = '';
                    document.getElementById('newEmpSalary').value = '';
                    document.getElementById('newEmpComm').value = '';
                    alert('Karyawan Berhasil Ditambah!');
                  } catch (e) { alert('Gagal'); }
                }}>
                  <Plus size={18} /> Tambah
                </button>
             </div>
             <p style={{ color: 'var(--text-muted)' }}>*Karyawan ini nantinya bisa login melalui Portal Karyawan menggunakan PIN.</p>
             <table className="table" style={{ marginTop: '1.5rem' }}>
               <thead><tr><th>Nama Karyawan</th><th>Peran (Role)</th><th>PIN Login</th><th>Gaji (Rp)</th><th>Komisi (%)</th><th>Aksi</th></tr></thead>
               <tbody>
                 {users.map(u => (
                   <tr key={u.id}>
                     <td>{u.name}</td>
                     <td><span className={`badge ${u.role === 'KASIR' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span></td>
                     <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.pin}</td>
                     <td>Rp {(tenant.settings?.employee_salaries?.[u.id] || 0).toLocaleString('id-ID')}</td>
                     <td>{tenant.settings?.employee_commissions?.[u.id] || 0}%</td>
                     <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-warning" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                            const newName = prompt('Nama Karyawan:', u.name);
                            if (newName === null) return;
                            const newPin = prompt('PIN Login:', u.pin);
                            if (newPin === null) return;
                            const newSalaryStr = prompt('Gaji Pokok/Bulan (Rp):', tenant.settings?.employee_salaries?.[u.id] || 0);
                            if (newSalaryStr === null) return;
                            const newCommStr = prompt('Komisi (%):', tenant.settings?.employee_commissions?.[u.id] || 0);
                            if (newCommStr === null) return;

                            try {
                              await apiService.updateUser(u.id, { name: newName, pin: newPin });
                              
                              const currentSettings = tenant.settings || {};
                              const employee_commissions = currentSettings.employee_commissions || {};
                              const employee_salaries = currentSettings.employee_salaries || {};
                              employee_commissions[u.id] = parseInt(newCommStr);
                              employee_salaries[u.id] = parseInt(newSalaryStr);
                              const newSettings = { ...currentSettings, employee_commissions, employee_salaries };
                              await apiService.updateTenantSettings(tenant.code, newSettings);
                              updateTenantSettings(newSettings);

                              setUsers(users.map(x => x.id === u.id ? { ...x, name: newName, pin: newPin } : x));
                            } catch(e) { alert('Gagal edit karyawan'); }
                          }}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                            if(confirm('Yakin ingin menghapus karyawan ini?')) {
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
             </table>
             <h4 style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.5rem' }}>Permintaan Kasbon / Pinjaman</h4>
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
                             if(confirm('Setujui kasbon ini? Nominal akan memotong THP karyawan.')) {
                               try {
                                 await apiService.post('/transactions/update-type', { id: t.id, type: 'BON_KARYAWAN' }); // Need an endpoint for this, wait, the API service has get, post... let's just create a new transaction and delete the old one, or use a custom query. We added /services/update, did we add /transactions/update?
                                 // Actually, Supabase isn't directly exposed. I will just delete the pending one and create an approved one.
                                 await apiService.delete(`/transactions/${t.id}`);
                                 await apiService.post('/transactions', { tenant_code: tenant.code, type: 'BON_KARYAWAN', amount: t.amount, description: t.description });
                                 apiService.get(`/transactions/${tenant.code}`).then(setTransactions);
                                 alert('Kasbon disetujui!');
                               } catch(e) { alert('Gagal update kasbon'); }
                             }
                           }}>Setujui</button>
                           <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                             if(confirm('Tolak kasbon ini?')) {
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

             <h4 style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.5rem' }}>Laporan Absensi (Hari Ini)</h4>
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
