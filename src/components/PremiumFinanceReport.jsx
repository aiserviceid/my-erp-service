import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ReceiptText, AlertTriangle, CheckCircle2 } from 'lucide-react';

const money = (value = 0) => Number(value || 0).toLocaleString('id-ID');
const dayMs = 24 * 60 * 60 * 1000;

const isSameDay = (dateA, dateB) => new Date(dateA || Date.now()).toDateString() === new Date(dateB || Date.now()).toDateString();
const isIncome = (type = '') => {
  const value = String(type || '').toUpperCase();
  return value === 'POS_SALES' || value === 'INCOME' || value.startsWith('INCOME_') || value.includes('SERVICE_PAYMENT');
};
const isExpense = (type = '') => {
  const value = String(type || '').toUpperCase();
  return value === 'EXPENSE' || value === 'BON_KARYAWAN' || value === 'KASBON' || value === 'CASH_ADVANCE' || value.startsWith('OUT_');
};
const isServiceIncome = (tx = {}) => {
  const type = String(tx.type || '').toUpperCase();
  const desc = String(tx.description || '').toLowerCase();
  return type.startsWith('INCOME') || desc.includes('servis') || desc.includes('resi');
};

export default function PremiumFinanceReport({ transactions = [], services = [], products = [], tenant }) {
  const data = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const txs = transactions.filter((tx) => tx && tx.type !== 'BON_PENDING' && tx.type !== 'BON_REJECTED');
    const incomeTxs = txs.filter((tx) => isIncome(tx.type));
    const expenseTxs = txs.filter((tx) => isExpense(tx.type));
    const incomeToday = incomeTxs.filter((tx) => isSameDay(tx.created_at, today)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const expenseToday = expenseTxs.filter((tx) => isSameDay(tx.created_at, today)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const incomeMonth = incomeTxs.filter((tx) => { const d = new Date(tx.created_at || now); return d.getMonth() === month && d.getFullYear() === year; }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const expenseMonth = expenseTxs.filter((tx) => { const d = new Date(tx.created_at || now); return d.getMonth() === month && d.getFullYear() === year; }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const posIncome = incomeTxs.filter((tx) => String(tx.type || '').toUpperCase() === 'POS_SALES').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const serviceIncome = incomeTxs.filter(isServiceIncome).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const sevenDays = Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(now - (6 - index) * dayMs);
      const income = incomeTxs.filter((tx) => isSameDay(tx.created_at, d)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const expense = expenseTxs.filter((tx) => isSameDay(tx.created_at, d)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return { label: d.toLocaleDateString('id-ID', { weekday: 'short' }), income, expense, net: income - expense };
    });
    const bestDay = sevenDays.reduce((best, item) => item.income > best.income ? item : best, sevenDays[0] || { income: 0, label: '-' });
    const maxBar = Math.max(...sevenDays.map((item) => Math.max(item.income, item.expense, 1)));
    const activeServices = services.filter((service) => !['DIAMBIL', 'DI_AMBIL', 'DIBATALKAN'].includes(String(service.status || '').toUpperCase())).length;
    const readyServices = services.filter((service) => String(service.status || '').toUpperCase() === 'SELESAI').length;
    const lowStock = products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 3 && String(product.category || '').toUpperCase() !== 'JASA').length;
    return { incomeToday, expenseToday, incomeMonth, expenseMonth, netToday: incomeToday - expenseToday, netMonth: incomeMonth - expenseMonth, posIncome, serviceIncome, sevenDays, bestDay, maxBar, activeServices, readyServices, lowStock };
  }, [transactions, services, products]);

  const health = data.netMonth >= 0 ? 'Sehat' : 'Perlu dicek';
  const insight = data.incomeMonth === 0
    ? 'Belum ada pemasukan bulan ini. Mulai dari transaksi kasir atau pelunasan servis.'
    : data.netMonth >= 0
      ? `Bulan ini toko masih positif. Hari terbaik 7 hari terakhir: ${data.bestDay?.label || '-'} dengan omzet Rp ${money(data.bestDay?.income || 0)}.`
      : 'Pengeluaran bulan ini lebih besar dari pemasukan. Cek kasbon, biaya operasional, dan transaksi servis.';

  return (
    <section className="premium-finance-report" style={{ marginBottom: '1.25rem' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #075985 55%, #0f766e 100%)', color: '#fff', borderRadius: 22, padding: '1.35rem', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)' }}>
        <div>
          <p style={{ margin: '0 0 6px', color: '#99f6e4', fontSize: '.75rem', letterSpacing: '.08em', fontWeight: 900 }}>LAPORAN OWNER</p>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.45rem', fontWeight: 900 }}>Keuangan toko dalam satu layar</h3>
          <span style={{ display: 'block', marginTop: 7, color: 'rgba(255,255,255,.82)', fontSize: '.9rem' }}>{insight}</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 16, padding: '12px 16px', minWidth: 170 }}>
          <small style={{ display: 'block', color: '#bfdbfe', fontWeight: 800 }}>Net Profit Bulan Ini</small>
          <strong style={{ display: 'block', marginTop: 4, color: '#fff', fontSize: '1.35rem' }}>Rp {money(data.netMonth)}</strong>
          <small style={{ color: data.netMonth >= 0 ? '#bbf7d0' : '#fecaca', fontWeight: 800 }}>{health}</small>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginTop: 14 }}>
        <Metric title="Omzet Hari Ini" value={`Rp ${money(data.incomeToday)}`} note="Kasir + servis" icon={<TrendingUp size={18} />} color="#059669" />
        <Metric title="Pengeluaran Hari Ini" value={`Rp ${money(data.expenseToday)}`} note="Expense + kasbon" icon={<TrendingDown size={18} />} color="#dc2626" />
        <Metric title="Omzet Bulan Ini" value={`Rp ${money(data.incomeMonth)}`} note="Total pemasukan" icon={<ReceiptText size={18} />} color="#0284c7" />
        <Metric title="Servis Aktif" value={`${data.activeServices} Unit`} note={`${data.readyServices} siap diambil`} icon={<Wallet size={18} />} color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(260px, .9fr)', gap: 14, marginTop: 14 }} className="premium-finance-grid">
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong style={{ color: '#0f172a' }}>Tren 7 Hari</strong>
            <small style={{ color: '#64748b' }}>Masuk vs keluar</small>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.sevenDays.length}, 1fr)`, gap: 8, alignItems: 'end', minHeight: 130 }}>
            {data.sevenDays.map((day) => (
              <div key={day.label} style={{ display: 'grid', gap: 5, alignItems: 'end' }}>
                <div title={`Masuk Rp ${money(day.income)} / Keluar Rp ${money(day.expense)}`} style={{ height: 100, display: 'flex', alignItems: 'end', gap: 3, justifyContent: 'center' }}>
                  <span style={{ width: 10, borderRadius: 99, background: '#0ea5e9', height: `${Math.max(5, (day.income / data.maxBar) * 100)}%` }} />
                  <span style={{ width: 10, borderRadius: 99, background: '#f87171', height: `${Math.max(5, (day.expense / data.maxBar) * 100)}%` }} />
                </div>
                <small style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{day.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 18, padding: '1rem' }}>
          <strong style={{ display: 'block', color: '#0f172a', marginBottom: 10 }}>Ringkasan Sumber Uang</strong>
          <Breakdown label="Penjualan POS" value={data.posIncome} total={Math.max(data.incomeMonth, 1)} />
          <Breakdown label="Jasa / Servis" value={data.serviceIncome} total={Math.max(data.incomeMonth, 1)} />
          <Breakdown label="Pengeluaran" value={data.expenseMonth} total={Math.max(data.incomeMonth + data.expenseMonth, 1)} danger />
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: data.lowStock > 0 ? '#fffbeb' : '#f0fdf4', color: data.lowStock > 0 ? '#92400e' : '#166534', fontSize: '.84rem', lineHeight: 1.5 }}>
            {data.lowStock > 0 ? <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
            {data.lowStock > 0 ? `${data.lowStock} barang stok menipis. Perlu reorder agar servis tidak tertunda.` : 'Stok kritis aman untuk saat ini.'}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ title, value, note, icon, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color, marginBottom: 6 }}>{icon}<span style={{ fontSize: '.72rem', fontWeight: 900, color: '#64748b' }}>{title}</span></div>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.15rem' }}>{value}</strong>
      <small style={{ color: '#64748b', fontWeight: 700 }}>{note}</small>
    </div>
  );
}

function Breakdown({ label, value, total, danger = false }) {
  const percent = Math.min(100, Math.round((Number(value || 0) / Math.max(Number(total || 1), 1)) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: '#475569', marginBottom: 5 }}><span>{label}</span><strong>Rp {money(value)}</strong></div>
      <div style={{ height: 8, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}><div style={{ width: `${percent}%`, height: '100%', background: danger ? '#f87171' : '#0ea5e9' }} /></div>
    </div>
  );
}
