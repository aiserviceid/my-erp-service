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
    { label: 'Omzet Hari Ini', value: money(revenueToday), hint: 'POS + pembayaran servis', icon: BarChart3, tone: '#0f766e' },
    { label: 'Servis Masuk', value: todayServices.length, hint: 'Unit diterima hari ini', icon: Plus, tone: '#2563eb' },
    { label: 'Belum Selesai', value: unfinishedServices.length, hint: 'Perlu dipantau owner', icon: Clock, tone: '#d97706' },
    { label: 'Siap Diambil', value: readyServices.length, hint: 'Bisa ditagih/WA pelanggan', icon: CheckCircle2, tone: '#16a34a' },
    { label: 'Stok Tipis', value: lowStockProducts.length, hint: 'Perlu restock', icon: AlertTriangle, tone: '#dc2626' },
  ];

  const actions = [
    { label: 'Terima Servis', icon: Plus, onClick: onCreateService, primary: true },
    { label: 'Buka Kasir', icon: ShoppingCart, onClick: onOpenCashier },
    { label: 'Pelanggan & WA', icon: UsersRound, onClick: onOpenCustomers },
    { label: 'Cek Tracking', icon: PackageSearch, onClick: onOpenTracking },
  ];

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '1.25rem',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #071c2b 0%, #0f2f44 55%, #0f766e 100%)',
        color: 'white',
        boxShadow: '0 22px 55px rgba(15, 23, 42, .18)',
      }}>
        <div>
          <p style={{ margin: 0, opacity: .78, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: '.72rem' }}>Ringkasan Owner</p>
          <h2 style={{ margin: '.25rem 0 0', fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.15 }}>Kondisi toko hari ini dalam satu layar</h2>
          <p style={{ margin: '.45rem 0 0', opacity: .82, maxWidth: 620 }}>Pantau omzet, servis, stok, pelanggan, dan aksi cepat tanpa membuka banyak menu.</p>
        </div>
        <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                style={{
                  border: action.primary ? '0' : '1px solid rgba(255,255,255,.25)',
                  background: action.primary ? '#11c8b3' : 'rgba(255,255,255,.1)',
                  color: 'white',
                  borderRadius: 14,
                  padding: '.72rem .9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.45rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: action.primary ? '0 10px 22px rgba(17,200,179,.25)' : 'none',
                }}
              >
                <Icon size={17} /> {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.85rem' }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} style={{
              background: 'rgba(255,255,255,.96)',
              border: '1px solid rgba(15,23,42,.08)',
              borderRadius: 20,
              padding: '1rem',
              boxShadow: '0 14px 32px rgba(15,23,42,.08)',
              minHeight: 118,
              display: 'grid',
              gap: '.45rem',
            }}>
              <span style={{ width: 38, height: 38, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${card.tone}14`, color: card.tone }}>
                <Icon size={20} />
              </span>
              <strong style={{ color: '#0f172a', fontSize: '1.35rem', lineHeight: 1.1 }}>{card.value}</strong>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '.88rem' }}>{card.label}</p>
                <p style={{ margin: '.15rem 0 0', color: '#64748b', fontSize: '.78rem', fontWeight: 700 }}>{card.hint}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.85rem' }}>
        <div style={{ padding: '1rem', borderRadius: 20, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <strong style={{ color: '#0f172a' }}>Pelanggan Terdata</strong>
          <p style={{ margin: '.25rem 0 0', color: '#64748b', fontWeight: 700 }}>{customerCount} pelanggan dari servis/riwayat toko.</p>
        </div>
        <div style={{ padding: '1rem', borderRadius: 20, background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
          <strong style={{ color: '#065f46' }}>Fokus Hari Ini</strong>
          <p style={{ margin: '.25rem 0 0', color: '#047857', fontWeight: 700 }}>{unfinishedServices.length > 0 ? 'Selesaikan servis berjalan dan follow-up pelanggan siap ambil.' : 'Operasional aman, manfaatkan WA untuk follow-up pelanggan lama.'}</p>
        </div>
      </div>
    </section>
  );
}
