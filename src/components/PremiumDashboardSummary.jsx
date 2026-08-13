import { AlertTriangle, BarChart3, CheckCircle2, Clock, MessageCircle, PackageSearch, Plus, ShoppingCart, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const money = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const isToday = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
};

const getDayLabel = (date) => date.toLocaleDateString('id-ID', { weekday: 'short' }).replace('.', '');
const serviceIsOpen = (status = '') => !['SELESAI', 'DIAMBIL', 'DI AMBIL', 'DIBATALKAN'].includes(String(status).toUpperCase());
const serviceIsReady = (status = '') => String(status).toUpperCase() === 'SELESAI';
const isPhysicalProduct = (product) => String(product?.category || '').toUpperCase() !== 'JASA';
const isRevenueTransaction = (trx) => {
  const type = String(trx?.type || '').toUpperCase();
  return type === 'INCOME' || type.startsWith('INCOME_') || type === 'POS_SALES';
};

export default function PremiumDashboardSummary({
  services = [],
  transactions = [],
  products = [],
  customers = [],
  onCreateService,
  onOpenCashier,
  onOpenTracking,
  onOpenReports,
}) {
  const todayServices = services.filter((service) => isToday(service.created_at));
  const unfinishedServices = services.filter((service) => serviceIsOpen(service.status));
  const readyServices = services.filter((service) => serviceIsReady(service.status));
  const lowStockProducts = products.filter((product) => isPhysicalProduct(product) && Number(product.stock || 0) <= 3);
  const revenueToday = transactions
    .filter((trx) => isToday(trx.created_at))
    .filter(isRevenueTransaction)
    .reduce((sum, trx) => sum + Number(trx.amount || 0), 0);

  const revenueTrend = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayKey = date.toDateString();
    const revenue = transactions
      .filter((trx) => new Date(trx.created_at).toDateString() === dayKey)
      .filter(isRevenueTransaction)
      .reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
    return { label: getDayLabel(date), revenue, isToday: index === 6 };
  });

  const weeklyTotal = revenueTrend.reduce((sum, item) => sum + item.revenue, 0);
  const weeklyAverage = Math.round(weeklyTotal / 7);
  const topRevenueDay = revenueTrend.reduce((top, item) => (item.revenue > top.revenue ? item : top), revenueTrend[0] || { label: '-', revenue: 0 });
  const maxRevenue = Math.max(...revenueTrend.map((item) => item.revenue), 1);
  const customerCount = customers.length || new Set(services.map((service) => service.customer_phone).filter(Boolean)).size;
  const trendInsight = revenueToday >= weeklyAverage && revenueToday > 0
    ? 'Omzet hari ini lebih baik dari rata-rata 7 hari.'
    : weeklyTotal > 0
      ? 'Omzet masih bisa dikejar, follow-up pelanggan lama lewat WA.'
      : 'Belum ada omzet minggu ini, mulai dari servis pertama atau transaksi kasir.';

  const cards = [
    { label: 'Omzet Hari Ini', value: money(revenueToday), hint: 'POS + servis', icon: BarChart3, tone: '#0f766e' },
    { label: 'Servis Masuk', value: todayServices.length, hint: 'Unit hari ini', icon: Plus, tone: '#2563eb' },
    { label: 'Belum Selesai', value: unfinishedServices.length, hint: 'Perlu dipantau', icon: Clock, tone: '#d97706' },
    { label: 'Siap Diambil', value: readyServices.length, hint: 'Siap ditagih/WA', icon: CheckCircle2, tone: '#16a34a' },
    { label: 'Stok Tipis', value: lowStockProducts.length, hint: 'Perlu restock', icon: AlertTriangle, tone: '#dc2626' },
  ];

  const actions = [
    { label: 'Terima Servis', icon: Plus, onClick: onCreateService, primary: true },
    { label: 'Buka Kasir', icon: ShoppingCart, onClick: onOpenCashier },
    { label: 'Laporan', icon: BarChart3, onClick: onOpenReports },
    { label: 'Tracking', icon: PackageSearch, onClick: onOpenTracking },
  ];

  return (
    <section className="unitpro-premium-summary" style={{ display: 'grid', gap: '.9rem' }}>
      <style>{`
        .dashboard-overview > .dashboard-store-hero,
        .dashboard-overview > .dashboard-section-heading,
        .dashboard-overview > .dashboard-metric-grid,
        .dashboard-overview > .dashboard-insights-grid > .dashboard-insight-card:first-child {
          display: none !important;
        }
        .dashboard-overview > .dashboard-insights-grid {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: .9rem !important;
        }
        @media (max-width: 720px) {
          .unitpro-premium-hero { padding: 1rem !important; border-radius: 18px !important; }
          .unitpro-premium-hero h2 { font-size: 1.2rem !important; }
          .unitpro-premium-actions { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
          .unitpro-premium-actions button { width: 100%; justify-content: center; padding: .7rem .55rem !important; font-size: .82rem !important; }
          .unitpro-premium-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .unitpro-premium-card { min-height: 104px !important; padding: .85rem !important; }
          .unitpro-premium-card strong { font-size: 1.05rem !important; }
          .unitpro-dashboard-lower { grid-template-columns: 1fr !important; }
          .unitpro-trend-bars { height: 112px !important; }
        }
      `}</style>

      <div className="unitpro-premium-hero" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '1.05rem 1.15rem',
        borderRadius: 22,
        background: 'linear-gradient(135deg, #071c2b 0%, #0d2f42 58%, #0f766e 100%)',
        color: 'white',
        boxShadow: '0 18px 42px rgba(15, 23, 42, .16)',
      }}>
        <div style={{ minWidth: 260 }}>
          <p style={{ margin: 0, color: '#7dd3fc', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: '.7rem' }}>Ringkasan Owner</p>
          <h2 style={{ margin: '.18rem 0 0', color: '#ffffff', fontSize: 'clamp(1.25rem, 2.2vw, 1.72rem)', lineHeight: 1.15, fontWeight: 950 }}>
            Kondisi toko hari ini
          </h2>
          <p style={{ margin: '.35rem 0 0', color: 'rgba(255,255,255,.82)', maxWidth: 560, fontSize: '.9rem' }}>
            Omzet, servis, stok, pelanggan, dan aksi cepat dalam satu layar.
          </p>
        </div>
        <div className="unitpro-premium-actions" style={{ display: 'flex', gap: '.55rem', flexWrap: 'wrap' }}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                style={{
                  border: action.primary ? '0' : '1px solid rgba(255,255,255,.24)',
                  background: action.primary ? '#11c8b3' : 'rgba(255,255,255,.1)',
                  color: 'white',
                  borderRadius: 13,
                  padding: '.68rem .82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.42rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: action.primary ? '0 10px 22px rgba(17,200,179,.24)' : 'none',
                }}
              >
                <Icon size={16} /> {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="unitpro-premium-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '.75rem' }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="unitpro-premium-card" style={{
              background: 'rgba(255,255,255,.97)',
              border: '1px solid rgba(15,23,42,.08)',
              borderRadius: 18,
              padding: '.9rem',
              boxShadow: '0 12px 26px rgba(15,23,42,.07)',
              minHeight: 108,
              display: 'grid',
              gap: '.38rem',
            }}>
              <span style={{ width: 34, height: 34, borderRadius: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${card.tone}14`, color: card.tone }}>
                <Icon size={18} />
              </span>
              <strong style={{ color: '#0f172a', fontSize: '1.25rem', lineHeight: 1.1 }}>{card.value}</strong>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '.84rem' }}>{card.label}</p>
                <p style={{ margin: '.1rem 0 0', color: '#64748b', fontSize: '.74rem', fontWeight: 700 }}>{card.hint}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="unitpro-dashboard-lower" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, .8fr)', gap: '.85rem' }}>
        <article style={{
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,.08)',
          borderRadius: 20,
          padding: '1rem',
          boxShadow: '0 12px 28px rgba(15,23,42,.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.8rem', marginBottom: '.65rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, color: '#0f766e', fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: '.68rem' }}>Tren Omzet</p>
              <h3 style={{ margin: '.15rem 0 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 950 }}>7 hari terakhir</h3>
            </div>
            <div style={{ display: 'flex', gap: '.55rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0', padding: '.38rem .55rem', borderRadius: 12, fontWeight: 900, fontSize: '.75rem' }}>
                Total {money(weeklyTotal)}
              </span>
              <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '.38rem .55rem', borderRadius: 12, fontWeight: 800, fontSize: '.75rem' }}>
                Rata-rata {money(weeklyAverage)}
              </span>
            </div>
          </div>

          <div style={{ height: 160, width: '100%', padding: '.2rem 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="summaryRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                <YAxis
                  tickFormatter={(val) => {
                    const amount = Number(val || 0);
                    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0','')}jt`;
                    if (amount >= 1000) return `${Math.round(amount / 1000)}rb`;
                    return `${amount}`;
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  fontSize={10}
                  stroke="#94a3b8"
                  tickCount={4}
                />
                <Tooltip
                  formatter={(val) => [`Rp ${Number(val || 0).toLocaleString('id-ID')}`, 'Omzet Toko']}
                  labelFormatter={(lbl) => `Hari: ${lbl}`}
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', color: '#fff', border: '1px solid #1e293b', fontSize: '0.82rem', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', padding: '8px 12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#summaryRevenueGrad)"
                  dot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.65rem', flexWrap: 'wrap', marginTop: '.55rem', paddingTop: '.7rem', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, color: '#334155', fontSize: '.82rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
              <TrendingUp size={15} color="#0f766e" /> {trendInsight}
            </p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '.78rem', fontWeight: 700 }}>Tertinggi: {topRevenueDay.label} • {money(topRevenueDay.revenue)}</p>
          </div>
        </article>

        <article style={{ padding: '1rem', borderRadius: 20, background: '#ecfdf5', border: '1px solid #bbf7d0', boxShadow: '0 12px 28px rgba(15,23,42,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.55rem' }}>
            <span style={{ width: 36, height: 36, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#047857', background: '#d1fae5' }}>
              <MessageCircle size={18} />
            </span>
            <div>
              <strong style={{ color: '#065f46' }}>Fokus Hari Ini</strong>
              <p style={{ margin: '.05rem 0 0', color: '#047857', fontSize: '.76rem', fontWeight: 800 }}>{customerCount} pelanggan terdata</p>
            </div>
          </div>
          <p style={{ margin: 0, color: '#047857', fontWeight: 800, fontSize: '.86rem', lineHeight: 1.45 }}>{unfinishedServices.length > 0 ? 'Selesaikan servis berjalan dan follow-up pelanggan siap ambil.' : 'Operasional aman, manfaatkan WA untuk follow-up pelanggan lama.'}</p>
        </article>
      </div>
    </section>
  );
}
