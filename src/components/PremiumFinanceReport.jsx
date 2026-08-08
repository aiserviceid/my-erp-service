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
  Legend
} from 'recharts';
import { apiService } from '../services/api';
import { hasFeature } from '../config/tierLimits';
import UpgradePrompt from './UpgradePrompt';


const formatRupiah = (value = 0) => Number(value || 0).toLocaleString('id-ID');

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

const isIncome = (type = '') => {
  const val = String(type || '').toUpperCase();
  return val === 'POS_SALES' || val === 'INCOME' || val.startsWith('INCOME_') || val.includes('SERVICE_PAYMENT');
};

const isExpense = (type = '') => {
  const val = String(type || '').toUpperCase();
  return val === 'EXPENSE' || val === 'BON_KARYAWAN' || val === 'KASBON' || val === 'CASH_ADVANCE' || val.startsWith('OUT_');
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
  tenant,
  settings,
  onRefreshData
}) {
  const [period, setPeriod] = useState('hari_ini'); // 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'tahun_ini' | 'custom'
  const [customStart, setCustomStart] = useState(getMonthStartString());
  const [customEnd, setCustomEnd] = useState(getTodayString());
  const [activeSubTab, setActiveSubTab] = useState('ringkasan'); // 'ringkasan' | 'arus_kas' | 'pengeluaran' | 'laba_rugi' | 'sumber_omzet' | 'piutang' | 'export'
  const [searchTx, setSearchTx] = useState('');
  
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
      // Breakdown per 2 jam (08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00)
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      hours.forEach((h) => {
        const hourLabel = `${String(h).padStart(2, '0')}:00`;
        const hourTxs = filteredTxs.filter((tx) => {
          const d = new Date(tx.created_at || Date.now());
          return d.getHours() >= h - 2 && d.getHours() < h;
        });
        const masuk = hourTxs.filter((tx) => isIncome(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const keluar = hourTxs.filter((tx) => isExpense(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        result.push({
          name: hourLabel,
          Pemasukan: masuk,
          Pengeluaran: keluar,
          Laba: masuk - keluar
        });
      });
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
        const masuk = monthTxs.filter((tx) => isIncome(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const keluar = monthTxs.filter((tx) => isExpense(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
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
      const masuk = dayTxs.filter((tx) => isIncome(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const keluar = dayTxs.filter((tx) => isExpense(tx.type)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', fontWeight: '700' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Pemasukan
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Pengeluaran
                </span>
              </div>
            </div>

            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
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
                    tickFormatter={(v) => `Rp ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
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
              </ResponsiveContainer>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Servis & Perbaikan</span>
              <h4 style={{ margin: '6px 0 10px 0', fontSize: '1.3rem', color: '#0284c7' }}>Rp {formatRupiah(summaryMetrics.serviceIncome)}</h4>
              <div style={{ height: '8px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.serviceIncome / summaryMetrics.totalIncome) * 100) : 0}%`,
                    height: '100%',
                    background: '#0284c7'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                {summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.serviceIncome / summaryMetrics.totalIncome) * 100) : 0}% dari total omzet
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Penjualan Kasir (POS)</span>
              <h4 style={{ margin: '6px 0 10px 0', fontSize: '1.3rem', color: '#7c3aed' }}>Rp {formatRupiah(summaryMetrics.posIncome)}</h4>
              <div style={{ height: '8px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.posIncome / summaryMetrics.totalIncome) * 100) : 0}%`,
                    height: '100%',
                    background: '#7c3aed'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                {summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.posIncome / summaryMetrics.totalIncome) * 100) : 0}% dari total omzet
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Pemasukan Lainnya</span>
              <h4 style={{ margin: '6px 0 10px 0', fontSize: '1.3rem', color: '#059669' }}>Rp {formatRupiah(summaryMetrics.otherIncome)}</h4>
              <div style={{ height: '8px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.otherIncome / summaryMetrics.totalIncome) * 100) : 0}%`,
                    height: '100%',
                    background: '#059669'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                {summaryMetrics.totalIncome > 0 ? Math.round((summaryMetrics.otherIncome / summaryMetrics.totalIncome) * 100) : 0}% dari total omzet
              </span>
            </div>
          </div>
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

                  return (
                    <tr key={s.resi}>
                      <td>
                        <span className="badge" style={{ fontWeight: '800' }}>{s.resi}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{s.customer_name}</strong>
                        <small style={{ color: '#64748b' }}>{s.customer_phone || 'Tanpa No. WA'}</small>
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
                                const cleanPhone = s.customer_phone.replace(/^0/, '62');
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
