import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MessageSquare,
  Search,
  X,
  CreditCard,
  Building2,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { apiService } from '../services/api';
import { hasFeature } from '../config/tierLimits';
import UpgradePrompt from './UpgradePrompt';
import { normalizeWhatsAppNumber, findEmployeePhoneConflict } from '../utils/phoneUtils';


const formatRupiah = (value = 0) => Number(value || 0).toLocaleString('id-ID');

const formatRupiahAxis = (value = 0) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `Rp ${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.0', '')}jt`;
  }
  if (amount >= 1000) return `Rp ${Math.round(amount / 1000)}rb`;
  if (amount > 0) return `Rp ${Math.round(amount)}`;
  return 'Rp 0';
};

const formatDateID = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const getMonthStartString = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

const isIncome = (type = '', desc = '') => {
  const val = String(type || '').toUpperCase();
  const d = String(desc || '').toLowerCase();
  return val === 'POS_SALES' || val === 'INCOME' || val.startsWith('INCOME') || val.includes('SERVICE') || val.includes('SERVIS') || val.includes('PAYMENT') || d.includes('servis') || d.includes('resi') || d.includes('penjualan');
};

const isExpense = (type = '', desc = '') => {
  const val = String(type || '').toUpperCase();
  const d = String(desc || '').toLowerCase();
  return val === 'EXPENSE' || val === 'BON_KARYAWAN' || val === 'KASBON' || val === 'CASH_ADVANCE' || val.startsWith('OUT_') || val.includes('PENGELUARAN') || d.includes('beli') || d.includes('operasional');
};

const EXPENSE_CATEGORIES = [
  'Beli sparepart',
  'Gaji/kasbon',
  'Sewa toko',
  'Listrik/internet',
  'Transport',
  'Operasional',
  'Lain-lain'
];

export default function PremiumFinanceReport({
  transactions = [],
  services = [],
  products = [],
  users = [],
  tenant,
  settings,
  onRefreshData
}) {
  const [period, setPeriod] = useState('hari_ini'); // 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'tahun_ini' | 'custom'
  const [customStart, setCustomStart] = useState(getMonthStartString());
  const [customEnd, setCustomEnd] = useState(getTodayString());
  const [activeSubTab, setActiveSubTab] = useState('ringkasan'); // 'ringkasan' | 'arus_kas' | 'pengeluaran' | 'laba_rugi' | 'sumber_omzet' | 'piutang' | 'export'
  const [searchTx, setSearchTx] = useState('');
  const [chartType, setChartType] = useState('AREA'); // 'AREA' | 'BAR'
  
  // Modal Pengeluaran Baru
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Operasional');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('Tunai');
  const [expenseDate, setExpenseDate] = useState(getTodayString());
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);

  // Perhitungan Range Tanggal Aktif
  const periodBounds = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'hari_ini') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'minggu_ini') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day; // Senin sebagai awal minggu
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'bulan_ini') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'tahun_ini') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'custom') {
      start = customStart ? new Date(customStart + 'T00:00:00') : new Date(0);
      end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
    }

    return { start, end };
  }, [period, customStart, customEnd]);

  // Transaksi Terfilter sesuai Periode Aktif
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx || tx.type === 'BON_PENDING' || tx.type === 'BON_REJECTED') return false;
      const txTime = new Date(tx.created_at || Date.now()).getTime();
      return txTime >= periodBounds.start.getTime() && txTime <= periodBounds.end.getTime();
    });
  }, [transactions, periodBounds]);

  // Servis Terfilter sesuai Periode Aktif
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (!s) return false;
      const sTime = new Date(s.created_at || Date.now()).getTime();
      return sTime >= periodBounds.start.getTime() && sTime <= periodBounds.end.getTime();
    });
  }, [services, periodBounds]);

  // Ringkasan Angka Keuangan Periode Terpilih
  const summaryMetrics = useMemo(() => {
    const incomeTxs = filteredTxs.filter((tx) => isIncome(tx.type));
    const expenseTxs = filteredTxs.filter((tx) => isExpense(tx.type));

    const totalIncome = incomeTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalExpense = expenseTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const netProfit = totalIncome - totalExpense;

    const posIncome = incomeTxs
      .filter((tx) => String(tx.type || '').toUpperCase() === 'POS_SALES')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const serviceIncome = incomeTxs
      .filter((tx) => {
        const type = String(tx.type || '').toUpperCase();
        const desc = String(tx.description || '').toLowerCase();
        return type.startsWith('INCOME') || desc.includes('servis') || desc.includes('resi');
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const otherIncome = Math.max(0, totalIncome - (posIncome + serviceIncome));

    // Data Servis Belum Lunas / Piutang
    const unpaidServices = services.filter((s) => {
      const status = String(s.status || '').toUpperCase();
      const isFinished = status === 'SELESAI';
      const isNotPickedUp = status !== 'DIAMBIL' && status !== 'DI_AMBIL' && status !== 'DIBATALKAN';
      return isFinished || isNotPickedUp;
    });

    const unpaidTotal = unpaidServices.reduce((sum, s) => {
      const est = Number(s.estimasi_biaya || 0);
      const part = Number(s.part_fee || 0);
      const jasa = Number(s.jasa_fee || 0);
      const disc = Number(s.diskon || 0);
      const total = part + jasa > 0 ? (part + jasa - disc) : est;
      return sum + Math.max(0, total);
    }, 0);

    const marginPercent = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      posIncome,
      serviceIncome,
      otherIncome,
      totalTxCount: filteredTxs.length,
      unpaidCount: unpaidServices.length,
      unpaidTotal,
      unpaidServices,
      marginPercent
    };
  }, [filteredTxs, services]);

  // Daily / Hourly / Period Trend Data for Professional Chart
  const chartTrendData = useMemo(() => {
    const { start, end } = periodBounds;
    const result = [];

    if (period === 'hari_ini') {
      // Breakdown 12 slot (setiap 2 jam) mencakup penuh 24 jam hari ini (00:00 s/d 24:00)
      const slots = [
        { label: '02:00', startH: 0, endH: 2 },
        { label: '04:00', startH: 2, endH: 4 },
        { label: '06:00', startH: 4, endH: 6 },
        { label: '08:00', startH: 6, endH: 8 },
        { label: '10:00', startH: 8, endH: 10 },
        { label: '12:00', startH: 10, endH: 12 },
        { label: '14:00', startH: 12, endH: 14 },
        { label: '16:00', startH: 14, endH: 16 },
        { label: '18:00', startH: 16, endH: 18 },
        { label: '20:00', startH: 18, endH: 20 },
        { label: '22:00', startH: 20, endH: 22 },
        { label: '24:00', startH: 22, endH: 24 },
      ];

      slots.forEach((slot) => {
        const hourTxs = filteredTxs.filter((tx) => {
          const d = new Date(tx.created_at || Date.now());
          const hr = d.getHours();
          return hr >= slot.startH && hr < slot.endH;
        });
        const masuk = hourTxs.filter((tx) => isIncome(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const keluar = hourTxs.filter((tx) => isExpense(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        result.push({
          name: slot.label,
          Pemasukan: masuk,
          Pengeluaran: keluar,
          Laba: masuk - keluar
        });
      });

      // Safety check: jamin total pemasukan & pengeluaran grafik 100% sama dengan angka di summary card
      const totalChartMasuk = result.reduce((sum, r) => sum + r.Pemasukan, 0);
      const totalFilteredMasuk = filteredTxs.filter((tx) => isIncome(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      if (totalChartMasuk < totalFilteredMasuk && totalFilteredMasuk > 0) {
        // Jika ada transaksi hari ini yang waktu jamnya belum ter-plot (misal format ISO UTC), plot ke slot jam terdekat/aktual
        filteredTxs.forEach((tx) => {
          const inc = isIncome(tx.type, tx.description) ? Number(tx.amount || 0) : 0;
          if (inc <= 0) return;
          const d = new Date(tx.created_at || Date.now());
          let hr = d.getHours();
          if (isNaN(hr)) hr = 12;
          const slotIndex = Math.min(11, Math.max(0, Math.floor(hr / 2)));
          if (result[slotIndex] && result[slotIndex].Pemasukan === 0) {
            result[slotIndex].Pemasukan += inc;
            result[slotIndex].Laba += inc;
          }
        });
      }

      return result;
    }

    if (period === 'tahun_ini') {
      // Breakdown 12 bulan (Jan - Des)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      months.forEach((mName, mIdx) => {
        const monthTxs = transactions.filter((tx) => {
          const d = new Date(tx.created_at || Date.now());
          return d.getFullYear() === start.getFullYear() && d.getMonth() === mIdx;
        });
        const masuk = monthTxs.filter((tx) => isIncome(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const keluar = monthTxs.filter((tx) => isExpense(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        result.push({
          name: mName,
          Pemasukan: masuk,
          Pengeluaran: keluar,
          Laba: masuk - keluar
        });
      });
      return result;
    }

    // Default per hari (Minggu ini / Bulan ini / Custom)
    const curr = new Date(start);
    let maxLoop = 31;
    while (curr.getTime() <= end.getTime() && maxLoop > 0) {
      const dStr = curr.toDateString();
      const label = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      const dayTxs = filteredTxs.filter((tx) => new Date(tx.created_at || Date.now()).toDateString() === dStr);
      const masuk = dayTxs.filter((tx) => isIncome(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const keluar = dayTxs.filter((tx) => isExpense(tx.type, tx.description)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      result.push({
        name: label,
        Pemasukan: masuk,
        Pengeluaran: keluar,
        Laba: masuk - keluar
      });

      curr.setDate(curr.getDate() + 1);
      maxLoop--;
    }
    return result;
  }, [filteredTxs, transactions, period, periodBounds]);

  const monthlyRevenueSourceData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthTransactions = transactions.filter((tx) => {
        const txDate = new Date(tx.created_at || Date.now());
        return txDate.getFullYear() === monthDate.getFullYear() && txDate.getMonth() === monthDate.getMonth();
      });
      const incomeTransactions = monthTransactions.filter((tx) => isIncome(tx.type, tx.description));
      const pos = incomeTransactions.filter((tx) => String(tx.type || '').toUpperCase() === 'POS_SALES').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const service = incomeTransactions.filter((tx) => {
        const type = String(tx.type || '').toUpperCase();
        const desc = String(tx.description || '').toLowerCase();
        return type.startsWith('INCOME') || desc.includes('servis') || desc.includes('resi');
      }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const total = incomeTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return {
        name: monthDate.toLocaleDateString('id-ID', { month: 'short' }),
        Servis: service,
        POS: pos,
        Lainnya: Math.max(0, total - service - pos),
      };
    });
  }, [transactions]);

  // Arus Kas Combined Timeline (Sorted newest first)

  const cashFlowTimeline = useMemo(() => {
    let runningBalance = 0;
    const sorted = [...filteredTxs].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    const withBalance = sorted.map((tx) => {
      const inc = isIncome(tx.type) ? Number(tx.amount || 0) : 0;
      const exp = isExpense(tx.type) ? Number(tx.amount || 0) : 0;
      runningBalance += inc - exp;
      return {
        ...tx,
        incomeAmount: inc,
        expenseAmount: exp,
        runningBalance
      };
    });

    const result = withBalance.reverse(); // Terbaru di atas

    if (!searchTx.trim()) return result;
    const q = searchTx.toLowerCase();
    return result.filter(
      (item) =>
        (item.description || '').toLowerCase().includes(q) ||
        (item.payment_method || '').toLowerCase().includes(q) ||
        (item.type || '').toLowerCase().includes(q)
    );
  }, [filteredTxs, searchTx]);

  // Daftar Pengeluaran Murni
  const expenseList = useMemo(() => {
    return filteredTxs
      .filter((tx) => isExpense(tx.type))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [filteredTxs]);

  // Handle Tambah Pengeluaran Baru
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      alert('Masukkan nominal pengeluaran yang valid.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const descFormatted = `[${expenseCategory}] ${expenseNote || 'Pengeluaran toko'}`;
      await apiService.createTransaction({
        tenant_code: tenant?.code || 'DEMO-STORE',
        type: 'EXPENSE',
        amount: Number(expenseAmount),
        description: descFormatted,
        payment_method: expensePaymentMethod,
        created_at: new Date(expenseDate + 'T12:00:00').toISOString()
      });

      alert('Pengeluaran berhasil dicatat!');
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseNote('');

      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to create expense:', err);
      alert('Gagal menyimpan pengeluaran. Periksa koneksi Anda.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Export Excel Functionality
  const canExportExcel = hasFeature(tenant?.tier, 'exportExcel') || String(tenant?.tier || '').toLowerCase() !== 'free';

  const handleExportExcel = () => {
    if (!canExportExcel) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan & Laba Rugi
      const ringkasanData = [
        ['LAPORAN KEUANGAN & LABA RUGI TOKO'],
        ['Toko:', tenant?.settings?.storeName || tenant?.name || 'UnitPro Toko'],
        ['Periode:', `${periodBounds.start.toLocaleDateString('id-ID')} s/d ${periodBounds.end.toLocaleDateString('id-ID')}`],
        [''],
        ['METRIK', 'NOMINAL (IDR)'],
        ['Total Pemasukan', summaryMetrics.totalIncome],
        ['  - Pemasukan Kasir (POS)', summaryMetrics.posIncome],
        ['  - Pemasukan Servis', summaryMetrics.serviceIncome],
        ['  - Pemasukan Lainnya', summaryMetrics.otherIncome],
        ['Total Pengeluaran', summaryMetrics.totalExpense],
        ['Laba Bersih', summaryMetrics.netProfit],
        ['Margin Laba Bersih (%)', `${summaryMetrics.marginPercent}%`],
        ['Potensi Piutang Servis', summaryMetrics.unpaidTotal]
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(ringkasanData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan & Laba Rugi');

      // Sheet 2: Arus Kas
      const arusKasData = [
        ['Tanggal', 'Jenis Transaksi', 'Keterangan', 'Metode', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)'],
        ...cashFlowTimeline.map((item) => [
          formatDateID(item.created_at),
          isIncome(item.type) ? 'PEMASUKAN' : 'PENGELUARAN',
          item.description || '-',
          item.payment_method || 'Tunai',
          item.incomeAmount,
          item.expenseAmount,
          item.runningBalance
        ])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(arusKasData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Arus Kas');

      // Sheet 3: Pengeluaran
      const pengeluaranData = [
        ['Tanggal', 'Keterangan / Kategori', 'Metode Pembayaran', 'Nominal (Rp)'],
        ...expenseList.map((item) => [
          formatDateID(item.created_at),
          item.description || '-',
          item.payment_method || 'Tunai',
          Number(item.amount || 0)
        ])
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(pengeluaranData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Pengeluaran');

      // Download File
      const filename = `Laporan_Keuangan_${tenant?.code || 'Toko'}_${getTodayString()}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('Gagal mengekspor laporan Excel.');
    }
  };

  return (
    <section className="premium-finance-container" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* 1. TOP HEADER & PERIODE FILTER BAR */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📊 Pusat Laporan Keuangan
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#ffffff' }}>
              Laporan Keuangan & Arus Kas Toko
            </h2>
          </div>

          {/* PERIOD FILTER SELECTOR BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.08)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <button
              type="button"
              className={`btn ${period === 'hari_ini' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('hari_ini')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '10px', background: period === 'hari_ini' ? '#0ea5e9' : 'transparent', color: period === 'hari_ini' ? '#fff' : '#cbd5e1', border: 'none' }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className={`btn ${period === 'minggu_ini' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('minggu_ini')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '10px', background: period === 'minggu_ini' ? '#0ea5e9' : 'transparent', color: period === 'minggu_ini' ? '#fff' : '#cbd5e1', border: 'none' }}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              className={`btn ${period === 'bulan_ini' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('bulan_ini')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '10px', background: period === 'bulan_ini' ? '#0ea5e9' : 'transparent', color: period === 'bulan_ini' ? '#fff' : '#cbd5e1', border: 'none' }}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              className={`btn ${period === 'tahun_ini' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('tahun_ini')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '10px', background: period === 'tahun_ini' ? '#0ea5e9' : 'transparent', color: period === 'tahun_ini' ? '#fff' : '#cbd5e1', border: 'none' }}
            >
              Tahun Ini
            </button>
            <button
              type="button"
              className={`btn ${period === 'custom' ? 'btn-primary' : ''}`}
              onClick={() => setPeriod('custom')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '10px', background: period === 'custom' ? '#0ea5e9' : 'transparent', color: period === 'custom' ? '#fff' : '#cbd5e1', border: 'none' }}
            >
              Custom 📅
            </button>
          </div>
        </div>

        {/* CUSTOM DATE RANGE PICKER */}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem', background: 'rgba(255, 255, 255, 0.06)', padding: '10px 14px', borderRadius: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>Pilih Rentang:</span>
            <input
              type="date"
              className="input-field"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            />
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>s/d</span>
            <input
              type="date"
              className="input-field"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            />
          </div>
        )}
      </div>

      {/* 2. REPORT SUB-TABS NAVIGATION */}
      <div
        className="report-subtabs-nav"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('ringkasan')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'ringkasan' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'ringkasan' ? '#ffffff' : '#475569'
          }}
        >
          📊 Ringkasan
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('arus_kas')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'arus_kas' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'arus_kas' ? '#ffffff' : '#475569'
          }}
        >
          🔄 Arus Kas
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pengeluaran')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'pengeluaran' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'pengeluaran' ? '#ffffff' : '#475569'
          }}
        >
          💸 Pengeluaran ({expenseList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('laba_rugi')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'laba_rugi' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'laba_rugi' ? '#ffffff' : '#475569'
          }}
        >
          📈 Laba Rugi
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sumber_omzet')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'sumber_omzet' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'sumber_omzet' ? '#ffffff' : '#475569'
          }}
        >
          🍕 Sumber Omzet
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('piutang')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'piutang' ? '#0f172a' : '#f1f5f9',
            color: activeSubTab === 'piutang' ? '#ffffff' : '#475569'
          }}
        >
          ⏳ Piutang ({summaryMetrics.unpaidCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('export')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeSubTab === 'export' ? '#0ea5e9' : '#e0f2fe',
            color: activeSubTab === 'export' ? '#ffffff' : '#0369a1'
          }}
        >
          📥 Export Excel
        </button>
      </div>

      {/* 3. SUB-TAB CONTENT DISPLAY */}
      
      {/* TAB 1: RINGKASAN */}
      {activeSubTab === 'ringkasan' && (
        <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '1.25rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: '4px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: '6px' }}>
                <TrendingUp size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total Pemasukan</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>Rp {formatRupiah(summaryMetrics.totalIncome)}</div>
              <small style={{ color: '#64748b', fontWeight: '600' }}>Kasir + Servis + Income lain</small>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: '4px solid #dc2626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '6px' }}>
                <TrendingDown size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total Pengeluaran</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>Rp {formatRupiah(summaryMetrics.totalExpense)}</div>
              <small style={{ color: '#64748b', fontWeight: '600' }}>Operasional + Sparepart + Kasbon</small>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: `4px solid ${summaryMetrics.netProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: summaryMetrics.netProfit >= 0 ? '#10b981' : '#ef4444', marginBottom: '6px' }}>
                <Wallet size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Laba Bersih</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: summaryMetrics.netProfit >= 0 ? '#166534' : '#991b1b' }}>Rp {formatRupiah(summaryMetrics.netProfit)}</div>
              <small style={{ color: summaryMetrics.netProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: '700' }}>
                {summaryMetrics.netProfit >= 0 ? `✓ Laba POSITIF (${summaryMetrics.marginPercent}%)` : '⚠️ Pengeluaran Melebihi Omzet'}
              </small>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', marginBottom: '6px' }}>
                <ReceiptText size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Omzet Servis</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>Rp {formatRupiah(summaryMetrics.serviceIncome)}</div>
              <small style={{ color: '#64748b', fontWeight: '600' }}>Pembayaran jasa & sparepart servis</small>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed', marginBottom: '6px' }}>
                <DollarSign size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Omzet POS / Kasir</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>Rp {formatRupiah(summaryMetrics.posIncome)}</div>
              <small style={{ color: '#64748b', fontWeight: '600' }}>Penjualan barang langsung kasir</small>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '6px' }}>
                <Clock size={18} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Servis Belum Lunas</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>Rp {formatRupiah(summaryMetrics.unpaidTotal)}</div>
              <small style={{ color: '#d97706', fontWeight: '700' }}>{summaryMetrics.unpaidCount} unit servis dalam antrean</small>
            </div>
          </div>

          {/* PROFESSIONAL RECHARTS TREN CHART CARD */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', marginTop: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  📈 Grafik Tren Pemasukan vs Pengeluaran Periode Ini
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Perbandingan pemasukan (omzet) dan pengeluaran harian
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* CHART TYPE TOGGLE */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <button
                    type="button"
                    onClick={() => setChartType('AREA')}
                    style={{
                      border: 'none',
                      background: chartType === 'AREA' ? '#ffffff' : 'transparent',
                      color: chartType === 'AREA' ? '#2563eb' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: chartType === 'AREA' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    📈 Area Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('BAR')}
                    style={{
                      border: 'none',
                      background: chartType === 'BAR' ? '#ffffff' : 'transparent',
                      color: chartType === 'BAR' ? '#2563eb' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: chartType === 'BAR' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    📊 Bar Chart
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', fontWeight: '700' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Pemasukan
                  </span>
                  {chartTrendData.some((item) => Number(item.Pengeluaran || 0) > 0) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Pengeluaran
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ height: '280px', width: '100%' }}>
              {!chartTrendData.some((item) => Number(item.Pemasukan || 0) > 0 || Number(item.Pengeluaran || 0) > 0) ? (
                <div className="chart-empty-state">
                  <div className="chart-empty-icon" aria-hidden="true">📈</div>
                  <strong>Belum ada transaksi</strong>
                  <span>Data akan muncul otomatis setelah transaksi pertama</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'AREA' ? (
                    <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="finMasukGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="finKeluarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <YAxis
                        fontSize={11}
                        stroke="#94a3b8"
                        tickFormatter={formatRupiahAxis}
                        width={65}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) => [`Rp ${formatRupiah(val)}`, name]}
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '0.82rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                      />
                      <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#finMasukGrad)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                      <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#finKeluarGrad)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <YAxis
                        fontSize={11}
                        stroke="#94a3b8"
                        tickFormatter={formatRupiahAxis}
                        width={65}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) => [`Rp ${formatRupiah(val)}`, name]}
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '0.82rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                      />
                      <Bar dataKey="Pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="finance-source-monthly-card">
            <div>
              <h4>Sumber Omzet 6 Bulan Terakhir</h4>
              <p>Perbandingan kontribusi servis, POS, dan pemasukan lainnya.</p>
            </div>
            {monthlyRevenueSourceData.some((row) => Number(row.Servis || 0) > 0 || Number(row.POS || 0) > 0 || Number(row.Lainnya || 0) > 0) ? (
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueSourceData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                    <YAxis tickFormatter={formatRupiahAxis} axisLine={false} tickLine={false} width={68} fontSize={11} tickCount={5} />
                    <Tooltip formatter={(value, name) => [`Rp ${formatRupiah(value)}`, name]} />
                    <Legend />
                    <Bar dataKey="Servis" fill="#0EA5E9" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="POS" fill="#3B82F6" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Lainnya" fill="#10B981" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty-state chart-empty-state--small">
                <div className="chart-empty-icon" aria-hidden="true">📊</div>
                <strong>Belum ada transaksi</strong>
                <span>Data bulanan akan muncul otomatis setelah transaksi pertama</span>
              </div>
            )}
          </div>

          {/* TECHNICIAN PERFORMANCE & COMMISSION LEADERBOARD */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', marginTop: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  👨‍🔧 Kinerja & Omzet Jasa Teknisi Periode Ini
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Total unit servis diselesaikan & kontribusi omzet per teknisi
                </p>
              </div>
              <span style={{ fontSize: '0.78rem', background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontWeight: '800', border: '1px solid #bbf7d0' }}>
                {filteredServices.length} Total Servis
              </span>
            </div>

            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {(() => {
                const map = new Map();
                filteredServices.forEach((s) => {
                  const tech = s.technician_name || s.assigned_to || s.technician || 'Belum Ditentukan';
                  if (!map.has(tech)) map.set(tech, { name: tech, count: 0, revenue: 0 });
                  const item = map.get(tech);
                  item.count += 1;
                  item.revenue += Number(s.jasa_fee || s.total_fee || s.price || 0);
                });
                const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
                return list.slice(0, 6).map((tech, idx) => (
                  <div key={tech.name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>#{idx + 1} Teknisi</div>
                      <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.88rem' }}>{tech.name}</strong>
                      <small style={{ color: '#0284c7', fontWeight: '800' }}>{tech.count} Unit Servis</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: '900', color: '#16a34a' }}>Rp {formatRupiah(tech.revenue)}</div>
                      <small style={{ fontSize: '0.7rem', color: '#64748b' }}>Omzet Jasa</small>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: ARUS KAS */}
      {activeSubTab === 'arus_kas' && (
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                🔄 Buku Arus Kas (Cash Flow Timeline)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Timeline pemasukan dan pengeluaran secara berurutan pada periode terpilih.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  className="input-field"
                  value={searchTx}
                  onChange={(e) => setSearchTx(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.82rem', width: '200px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '650px' }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan / Transaksi</th>
                  <th>Metode</th>
                  <th style={{ textAlign: 'right' }}>Masuk (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Keluar (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowTimeline.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDateID(item.created_at)}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{item.description || 'Transaksi'}</strong>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>ID: {item.id}</span>
                    </td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>
                        {item.payment_method || 'Tunai'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: item.incomeAmount > 0 ? '#059669' : '#cbd5e1' }}>
                      {item.incomeAmount > 0 ? `+ Rp ${formatRupiah(item.incomeAmount)}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: item.expenseAmount > 0 ? '#dc2626' : '#cbd5e1' }}>
                      {item.expenseAmount > 0 ? `- Rp ${formatRupiah(item.expenseAmount)}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: item.runningBalance >= 0 ? '#0284c7' : '#ef4444' }}>
                      Rp {formatRupiah(item.runningBalance)}
                    </td>
                  </tr>
                ))}
                {cashFlowTimeline.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      Belum ada data transaksi pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENGELUARAN */}
      {activeSubTab === 'pengeluaran' && (
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                💸 Catatan Pengeluaran Toko
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Total Pengeluaran Periode Ini: <strong style={{ color: '#dc2626' }}>Rp {formatRupiah(summaryMetrics.totalExpense)}</strong>
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowExpenseModal(true)}
              style={{ fontWeight: '800', padding: '10px 18px' }}
            >
              <Plus size={16} /> + Tambah Pengeluaran
            </button>
          </div>

          {/* Expense Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan / Kategori</th>
                  <th>Metode Pembayaran</th>
                  <th style={{ textAlign: 'right' }}>Nominal (Rp)</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {expenseList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDateID(item.created_at)}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{item.description || 'Pengeluaran'}</strong>
                    </td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>
                        {item.payment_method || 'Tunai'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: '#dc2626' }}>
                      - Rp {formatRupiah(item.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}
                        onClick={async () => {
                          if (confirm('Hapus pencatatan pengeluaran ini?')) {
                            try {
                              await apiService.deleteTransaction(item.id);
                              if (onRefreshData) onRefreshData();
                            } catch (e) {
                              alert('Gagal menghapus pengeluaran.');
                            }
                          }
                        }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {expenseList.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      Belum ada data pengeluaran dicatat pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LABA RUGI */}
      {activeSubTab === 'laba_rugi' && (
        <div style={{ animation: 'fadeIn 0.2s ease-in-out', maxWidth: '750px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                LAPORAN LABA RUGI PEMILIK TOKO
              </span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>
                Laporan Untung / Rugi Periode Terpilih
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                <span style={{ color: '#475569' }}>(+) Pemasukan Servis & Jasa:</span>
                <strong style={{ color: '#059669' }}>Rp {formatRupiah(summaryMetrics.serviceIncome)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                <span style={{ color: '#475569' }}>(+) Pemasukan Penjualan Kasir (POS):</span>
                <strong style={{ color: '#059669' }}>Rp {formatRupiah(summaryMetrics.posIncome)}</strong>
              </div>

              {summaryMetrics.otherIncome > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <span style={{ color: '#475569' }}>(+) Pemasukan Lain-lain:</span>
                  <strong style={{ color: '#059669' }}>Rp {formatRupiah(summaryMetrics.otherIncome)}</strong>
                </div>
              )}

              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800' }}>
                <span style={{ color: '#0f172a' }}>TOTAL PEMASUKAN:</span>
                <span style={{ color: '#059669' }}>Rp {formatRupiah(summaryMetrics.totalIncome)}</span>
              </div>

              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                <span style={{ color: '#dc2626' }}>(-) Total Pengeluaran Toko:</span>
                <strong style={{ color: '#dc2626' }}>- Rp {formatRupiah(summaryMetrics.totalExpense)}</strong>
              </div>

              <div style={{ height: '2px', background: '#0f172a', margin: '8px 0' }} />

              <div
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '14px',
                  background: summaryMetrics.netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${summaryMetrics.netProfit >= 0 ? '#bbf7d0' : '#fca5a5'}`
                }}
              >
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: summaryMetrics.netProfit >= 0 ? '#166534' : '#991b1b' }}>
                    LABA BERSIH (NET PROFIT):
                  </span>
                  <small style={{ display: 'block', color: summaryMetrics.netProfit >= 0 ? '#15803d' : '#b91c1c', fontSize: '0.78rem' }}>
                    Margin Laba: {summaryMetrics.marginPercent}%
                  </small>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: summaryMetrics.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                  Rp {formatRupiah(summaryMetrics.netProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUMBER OMZET */}
      {activeSubTab === 'sumber_omzet' && (
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            🍕 Breakdown Sumber Omzet & Pendapatan
          </h3>

          {(() => {
            const sourceData = [
              { name: 'Servis', value: summaryMetrics.serviceIncome, color: '#0EA5E9' },
              { name: 'POS', value: summaryMetrics.posIncome, color: '#3B82F6' },
              { name: 'Lainnya', value: summaryMetrics.otherIncome, color: '#10B981' },
            ];
            const total = Number(summaryMetrics.totalIncome || 0);

            if (total <= 0) {
              return (
                <div className="chart-empty-state">
                  <div className="chart-empty-icon" aria-hidden="true">🍩</div>
                  <strong>Belum ada transaksi</strong>
                  <span>Breakdown omzet akan muncul otomatis setelah transaksi pertama</span>
                </div>
              );
            }

            return (
              <div className="revenue-source-layout">
                <div className="revenue-source-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={68} outerRadius={98} paddingAngle={3}>
                        {sourceData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`Rp ${formatRupiah(value)}`, name]} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="revenue-source-center">
                    <span>Total Omzet</span>
                    <strong>Rp {formatRupiah(total)}</strong>
                  </div>
                </div>

                <div className="revenue-source-table-wrap">
                  <table className="table revenue-source-table">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th style={{ textAlign: 'right' }}>Nominal</th>
                        <th style={{ textAlign: 'right' }}>Persentase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map((entry) => {
                        const percent = total > 0 ? Math.round((Number(entry.value || 0) / total) * 100) : 0;
                        return (
                          <tr key={entry.name}>
                            <td>
                              <div className="revenue-category-cell">
                                <span className="revenue-category-dot" style={{ background: entry.color }} />
                                <strong>{entry.name}</strong>
                              </div>
                              <div className="revenue-progress"><span style={{ width: `${percent}%`, background: entry.color }} /></div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800' }}>Rp {formatRupiah(entry.value)}</td>
                            <td style={{ textAlign: 'right', color: '#64748b', fontWeight: '800' }}>{percent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: PIUTANG / BELUM LUNAS */}
      {activeSubTab === 'piutang' && (
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                ⏳ Daftar Piutang & Servis Belum Lunas
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Total Tagihan Belum Terbayar: <strong style={{ color: '#d97706' }}>Rp {formatRupiah(summaryMetrics.unpaidTotal)}</strong> ({summaryMetrics.unpaidCount} unit)
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '650px' }}>
              <thead>
                <tr>
                  <th>Resi</th>
                  <th>Pelanggan</th>
                  <th>Perangkat</th>
                  <th>Status Servis</th>
                  <th style={{ textAlign: 'right' }}>Tagihan / Estimasi</th>
                  <th style={{ textAlign: 'center' }}>Aksi Tagihan</th>
                </tr>
              </thead>
              <tbody>
                {summaryMetrics.unpaidServices.map((s) => {
                  const est = Number(s.estimasi_biaya || 0);
                  const part = Number(s.part_fee || 0);
                  const jasa = Number(s.jasa_fee || 0);
                  const disc = Number(s.diskon || 0);
                  const billTotal = part + jasa > 0 ? (part + jasa - disc) : est;
                  const phoneConflict = findEmployeePhoneConflict(s.customer_phone, users);

                  return (
                    <tr key={s.resi}>
                      <td>
                        <span className="badge" style={{ fontWeight: '800' }}>{s.resi}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{s.customer_name}</strong>
                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>
                        {phoneConflict && (
                          <small style={{ display: 'block', marginTop: '4px', color: '#dc2626', fontWeight: '800' }}>
                            ⚠ Sama dengan WA karyawan: {phoneConflict.name}
                          </small>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#334155' }}>
                        {s.device_name}
                      </td>
                      <td>
                        <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', background: s.status === 'SELESAI' ? '#dcfce7' : '#fef3c7', color: s.status === 'SELESAI' ? '#15803d' : '#b45309' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '900', color: '#0f172a' }}>
                        Rp {formatRupiah(billTotal)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {s.customer_phone ? (
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#25D366', color: '#fff', fontWeight: '700' }}
                              onClick={() => {
                                if (phoneConflict) {
                                  alert('Nomor WA pelanggan ini sama dengan nomor karyawan. Perbaiki nomor pelanggan dulu agar tagihan tidak salah alamat.');
                                  return;
                                }
                                const cleanPhone = normalizeWhatsAppNumber(s.customer_phone);
                                const msg = `Halo Kak ${s.customer_name}, unit ${s.device_name} di ${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'} (Resi: ${s.resi}) berstatus ${s.status}. Total tagihan: Rp ${formatRupiah(billTotal)}. Terima kasih!`;
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                            >
                              📲 Kirim WA Tagihan
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No. WA Kosong</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {summaryMetrics.unpaidServices.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      Semua servis lunas atau belum ada tagihan aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: EXPORT EXCEL */}
      {activeSubTab === 'export' && (
        <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {!canExportExcel ? (
            <UpgradePrompt
              mode="card"
              featureName="Export Laporan Excel (.xlsx)"
              featureDescription="Unduh seluruh ringkasan keuangan, arus kas, rincian pengeluaran, dan tagihan piutang toko Anda ke dalam format Excel (.xlsx) rapi."
              icon={<FileSpreadsheet size={28} />}
            />
          ) : (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '650px', margin: '0 auto', borderRadius: '20px' }}>
              <FileSpreadsheet size={48} color="#0ea5e9" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>
                Download Laporan Excel (.xlsx)
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Laporan akan diekspor sesuai rentang periode terpilih: <br />
                <strong style={{ color: '#0ea5e9' }}>
                  {periodBounds.start.toLocaleDateString('id-ID')} s/d {periodBounds.end.toLocaleDateString('id-ID')}
                </strong>
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportExcel}
                style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: '800' }}
              >
                <Download size={18} /> Download Laporan Excel Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL FORM TAMBAH PENGELUARAN */}
      {showExpenseModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="modal-content" style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '1.6rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                + Catat Pengeluaran Toko
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  className="input-field"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Kategori Pengeluaran</label>
                <select
                  className="input-field"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Nominal (Rp)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Contoh: 150000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Catatan / Keterangan</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Beli kertas struk & konsumsi toko"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Metode Pembayaran</label>
                <select
                  className="input-field"
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value)}
                >
                  <option value="Tunai">💵 Tunai / Kas Toko</option>
                  <option value="Transfer">🏦 Transfer Bank</option>
                  <option value="QRIS">📱 QRIS</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowExpenseModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingExpense}
                  style={{ fontWeight: '800' }}
                >
                  {isSubmittingExpense ? 'Simpan...' : '💾 Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
