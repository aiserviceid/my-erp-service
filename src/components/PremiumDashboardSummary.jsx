import { AlertTriangle, BarChart3, CheckCircle2, Clock, PackageSearch, Plus, ShoppingCart, UsersRound } from 'lucide-react';

const money = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const isToday = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
};

const serviceIsOpen = (status = '') => !['SELESAI', 'DIAMBIL', 'DI AMBIL', 'DIBATALKAN'].includes(String(status).toUpperCase());
const serviceIsReady = (status = '') => String(status).toUpperCase() === 'SELESAI';
const isPhysicalProduct = (product) => String(product?.category || '').toUpperCase() !== 'JASA';

export default function PremiumDashboardSummary({
  services = [],
  transactions = [],
  products = [],
  customers = [],
  onCreateService,
  onOpenCashier,
  onOpenTracking,
  onOpenCustomers,
}) {
  const todayServices = services.filter((service) => isToday(service.created_at));
  const unfinishedServices = services.filter((service) => serviceIsOpen(service.status));
  const readyServices = services.filter((service) => serviceIsReady(service.status));
  const lowStockProducts = products.filter((product) => isPhysicalProduct(product) && Number(product.stock || 0) <= 3);
  const revenueToday = transactions
    .filter((trx) => isToday(trx.created_at))
    .filter((trx) => !String(trx.type || '').toUpperCase().includes('EXPENSE'))
    .reduce((sum, trx) => sum + Number(trx.amount || 0), 0);

  const customerCount = customers.length || new Set(services.map((service) => service.customer_phone).filter(Boolean)).size;

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
    { label: 'Pelanggan & WA', icon: UsersRound, onClick: onOpenCustomers },
    { label: 'Tracking', icon: PackageSearch, onClick: onOpenTracking },
  ];

  return (
    <section className="unitpro-premium-summary" style={{ display: 'grid', gap: '.9rem' }}>
      <style>{`
        .dashboard-overview > .dashboard-store-hero,
        .dashboard-overview > .dashboard-section-heading,
        .dashboard-overview > .dashboard-metric-grid {
          display: none !important;
        }
        @media (max-width: 720px) {
          .unitpro-premium-hero { padding: 1rem !important; border-radius: 18px !important; }
          .unitpro-premium-hero h2 { font-size: 1.2rem !important; }
          .unitpro-premium-actions { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
          .unitpro-premium-actions button { width: 100%; justify-content: center; padding: .7rem .55rem !important; font-size: .82rem !important; }
          .unitpro-premium-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .unitpro-premium-card { min-height: 104px !important; padding: .85rem !important; }
          .unitpro-premium-card strong { font-size: 1.05rem !important; }
          .unitpro-premium-extra { grid-template-columns: 1fr !important; }
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

      <div className="unitpro-premium-extra" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '.75rem' }}>
        <div style={{ padding: '.9rem 1rem', borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <strong style={{ color: '#0f172a' }}>Pelanggan Terdata</strong>
          <p style={{ margin: '.18rem 0 0', color: '#64748b', fontWeight: 700, fontSize: '.86rem' }}>{customerCount} pelanggan dari servis/riwayat toko.</p>
        </div>
        <div style={{ padding: '.9rem 1rem', borderRadius: 18, background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
          <strong style={{ color: '#065f46' }}>Fokus Hari Ini</strong>
          <p style={{ margin: '.18rem 0 0', color: '#047857', fontWeight: 700, fontSize: '.86rem' }}>{unfinishedServices.length > 0 ? 'Selesaikan servis berjalan dan follow-up pelanggan siap ambil.' : 'Operasional aman, manfaatkan WA untuk follow-up pelanggan lama.'}</p>
        </div>
      </div>
    </section>
  );
}
