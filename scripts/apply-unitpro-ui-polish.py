from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f'{label}: start marker not found')
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{label}: end marker not found')
    return text[:start_index] + replacement + text[end_index:]


# -----------------------------------------------------------------------------
# AdminDashboard.jsx
# -----------------------------------------------------------------------------
path = 'src/pages/AdminDashboard.jsx'
text = read(path)

text = replace_once(
    text,
    "import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';",
    "import { AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';",
    'AdminDashboard Recharts import',
)
text = replace_once(
    text,
    "import AndroidUpdateModal from '../components/AndroidUpdateModal';",
    "import AndroidUpdateModal from '../components/AndroidUpdateModal';\nimport IssueChips from '../components/IssueChips';",
    'AdminDashboard IssueChips import',
)
text = replace_once(
    text,
    'export default function AdminDashboard() {',
    """const formatRupiahAxis = (value = 0) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `Rp ${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.0', '')}jt`;
  }
  if (amount > 0) return `Rp ${Math.round(amount / 1000)}rb`;
  return 'Rp 0';
};

export default function AdminDashboard() {""",
    'AdminDashboard Rupiah formatter',
)

# KPI semantic colors: information = blue.
text = text.replace("borderLeft: '4px solid #7c3aed'", "borderLeft: '4px solid #3B82F6'", 1)
text = text.replace("color: '#7c3aed', margin: '4px 0'", "color: '#3B82F6', margin: '4px 0'", 1)
text = text.replace("color: '#6d28d9', fontWeight: '600'", "color: '#2563EB', fontWeight: '600'", 1)

chart_start = '              {/* Grafik Pemasukan */}'
chart_end = '              {/* 5 Servis Terbaru */}'
chart_replacement = """              {/* Grafik Tren Omzet */}
              {(() => {
                const chartData = Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dStr = d.toDateString();
                  const txs = transactions.filter((t) => new Date(t.created_at).toDateString() === dStr);
                  const revenue = txs
                    .filter((t) => {
                      const type = String(t.type || '');
                      return type === 'INCOME' || type.startsWith('INCOME_') || type === 'POS_SALES';
                    })
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  return {
                    name: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
                    Pendapatan: revenue,
                  };
                });
                const maxRevenue = Math.max(0, ...chartData.map((item) => item.Pendapatan));
                const hasRevenue = chartData.some((item) => item.Pendapatan > 0);

                return (
                  <div className="dashboard-insight-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h4 style={{ margin: '0 0 1.2rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                      Tren Omzet 7 Hari Terakhir
                    </h4>
                    {!hasRevenue ? (
                      <div className="chart-empty-state">
                        <div className="chart-empty-icon" aria-hidden="true">📊</div>
                        <strong>Belum ada transaksi</strong>
                        <span>Data akan muncul otomatis setelah transaksi pertama</span>
                        <button type="button" className="btn btn-primary" onClick={() => { setActiveTab('servis'); setShowServiceRegistration(true); }}>
                          <Plus size={16} /> Terima Servis
                        </button>
                      </div>
                    ) : (
                      <div className="dashboard-chart-area" style={{ height: '260px', minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.22)" />
                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                            <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={formatRupiahAxis} width={68} axisLine={false} tickLine={false} tickCount={5} />
                            <Tooltip
                              cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                              formatter={(value) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, 'Omzet']}
                              labelFormatter={(label) => `Omzet ${label}`}
                              contentStyle={{ background: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                            />
                            <Bar dataKey="Pendapatan" radius={[8, 8, 2, 2]} minPointSize={3}>
                              {chartData.map((entry, index) => (
                                <Cell key={`revenue-bar-${index}`} fill={entry.Pendapatan === maxRevenue && maxRevenue > 0 ? '#0F766E' : '#5EEAD4'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}

"""
text = replace_between(text, chart_start, chart_end, chart_replacement, 'AdminDashboard revenue chart')

recent_old = """                        <div key={s.resi} className="dashboard-service-row" style={{
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
                        </div>"""
recent_new = """                        <div key={s.resi} className="dashboard-service-row dashboard-service-row--detailed">
                          <div className="dashboard-service-main">
                            <div className="dashboard-service-customer">{s.customer_name}</div>
                            <a className="tracking-link-button tracking-link-button--compact" href={`${window.location.origin}/tracking?resi=${s.resi}`} target="_blank" rel="noreferrer" title="Cek status otomatis">
                              🔗 {s.resi}
                            </a>
                            <div className="dashboard-service-meta">
                              <span><strong>Biaya:</strong> Rp {(Number(s.part_fee || 0) + Number(s.jasa_fee || 0)).toLocaleString('id-ID')}</span>
                              <span><strong>Teknisi:</strong> {users.find((user) => String(user.id) === String(s.technician_id))?.name || 'Belum ditugaskan'}</span>
                              <span><strong>Tanggal:</strong> {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</span>
                            </div>
                          </div>
                          <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>"""
text = replace_once(text, recent_old, recent_new, 'AdminDashboard recent services details')

text = replace_once(
    text,
    "                            <td style={{ whiteSpace: 'pre-wrap', maxWidth: '200px' }}>{cleanIssue}</td>",
    "                            <td style={{ maxWidth: '260px' }}><IssueChips issue={cleanIssue} /></td>",
    'AdminDashboard structured issue display',
)

tracking_old = """                              <a 
                                href={`${window.location.origin}/tracking?resi=${s.resi}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: '#0284c7', fontWeight: '800', textDecoration: 'underline' }}
                                title="Klik untuk membuka link tracking otomatis"
                              >
                                {s.resi} 🔗
                              </a>"""
tracking_new = """                              <a
                                className="tracking-link-button"
                                href={`${window.location.origin}/tracking?resi=${s.resi}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Cek status otomatis"
                              >
                                🔗 {s.resi}
                              </a>"""
text = replace_once(text, tracking_old, tracking_new, 'AdminDashboard tracking button')

actions_old = """                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
                              </div>"""
actions_new = """                              <details className="service-actions-menu">
                                <summary aria-label={`Buka menu aksi ${s.resi}`} title="Aksi">⋮</summary>
                                <div className="service-actions-dropdown">
                                  <button className="btn btn-ghost" onClick={() => { setSelectedResi(s.resi); setShowBarcodeModal(true); }}>Cetak Stiker</button>
                                  <button className="btn btn-ghost" onClick={() => { setSelectedService(s); setPrintType(s.status === 'SELESAI' || s.status === 'DI AMBIL' ? 'pengambilan' : 'pendaftaran'); setShowPrintModal(true); }}>Cetak Nota</button>
                                  <button className="btn btn-ghost" onClick={() => { setSelectedService(s); setShowEditServiceNota(true); }}>✏️ Edit Nota</button>
                                  {s.customer_phone && (
                                    <a href={`https://wa.me/${s.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Kak ${s.customer_name}, ini link untuk cek status servis ${s.device_name} Anda (Resi: ${s.resi}) dari *${tenant?.settings?.storeName || tenant?.name || 'Toko Servis'}*:\n${window.location.origin}/tracking?resi=${s.resi}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                                      Kirim WA 📲
                                    </a>
                                  )}
                                </div>
                              </details>"""
text = replace_once(text, actions_old, actions_new, 'AdminDashboard action dropdown')
write(path, text)


# -----------------------------------------------------------------------------
# EmployeePortal.jsx
# -----------------------------------------------------------------------------
path = 'src/pages/EmployeePortal.jsx'
text = read(path)
text = replace_once(
    text,
    "import MobileTabBar from '../components/MobileTabBar';",
    "import MobileTabBar from '../components/MobileTabBar';\nimport UnitProLogo from '../components/UnitProLogo';\nimport IssueChips from '../components/IssueChips';\nimport EmployeeFinanceInsights from '../components/EmployeeFinanceInsights';",
    'EmployeePortal imports',
)
text = replace_once(
    text,
    """          <h2>Area Tim</h2>
          <p>{tenant?.name || 'Masuk ke Area Tim'}</p>""",
    """          <UnitProLogo variant="logo" height={46} style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.35rem' }}>Portal Tim</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Masuk dengan PIN yang diberikan admin</p>
          {tenant?.name && <small style={{ display: 'block', marginTop: '6px', color: '#94a3b8', fontWeight: '700' }}>{tenant.name}</small>}""",
    'EmployeePortal login branding',
)
text = replace_once(
    text,
    "                      <div key={s.resi} className=\"technician-task-card\" style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>",
    "                      <div key={s.resi} className=\"technician-task-card\" style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>",
    'EmployeePortal task card',
)
text = replace_once(
    text,
    "                          <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>Keluhan: {s.issue}</div>",
    "                          <IssueChips issue={s.issue} />",
    'EmployeePortal issue chips',
)
text = replace_once(
    text,
    "                  <h2 style={{ margin: 0, color: 'var(--accent)' }}>Rp {totalKomisi.toLocaleString('id-ID')}</h2>",
    "                  <h2 style={{ margin: 0, color: totalKomisi === 0 ? '#6B7280' : '#10B981' }}>Rp {totalKomisi.toLocaleString('id-ID')}</h2>",
    'EmployeePortal neutral zero commission',
)
finance_tail = """                </div>
              </div>
            </div>
          )}
        </>
      )}"""
finance_tail_new = """                </div>
              </div>
              <EmployeeFinanceInsights
                services={services}
                employee={employee}
                salary={mySalary}
                commissionRate={myCommissionRate}
              />
            </div>
          )}
        </>
      )}"""
text = replace_once(text, finance_tail, finance_tail_new, 'EmployeePortal finance insights')
write(path, text)


# -----------------------------------------------------------------------------
# PremiumFinanceReport.jsx
# -----------------------------------------------------------------------------
path = 'src/components/PremiumFinanceReport.jsx'
text = read(path)
text = replace_once(
    text,
    """  CartesianGrid,
  Legend
} from 'recharts';""",
    """  CartesianGrid,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';""",
    'PremiumFinanceReport pie imports',
)
text = replace_once(
    text,
    "const formatRupiah = (value = 0) => Number(value || 0).toLocaleString('id-ID');",
    """const formatRupiah = (value = 0) => Number(value || 0).toLocaleString('id-ID');

const formatRupiahAxis = (value = 0) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `Rp ${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.0', '')}jt`;
  }
  if (amount > 0) return `Rp ${Math.round(amount / 1000)}rb`;
  return 'Rp 0';
};""",
    'PremiumFinanceReport Rupiah formatter',
)
trend_anchor = """  }, [filteredTxs, transactions, period, periodBounds]);

  // Arus Kas Combined Timeline (Sorted newest first)"""
trend_insert = """  }, [filteredTxs, transactions, period, periodBounds]);

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

  // Arus Kas Combined Timeline (Sorted newest first)"""
text = replace_once(text, trend_anchor, trend_insert, 'PremiumFinanceReport monthly source data')

legend_old = """                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Pengeluaran
                </span>"""
legend_new = """                {chartTrendData.some((item) => Number(item.Pengeluaran || 0) > 0) ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Pengeluaran
                  </span>
                ) : (
                  <span style={{ color: '#6B7280', fontWeight: '700' }}>Tidak ada pengeluaran</span>
                )}"""
text = replace_once(text, legend_old, legend_new, 'PremiumFinanceReport legend')

old_formatter = "tickFormatter={(v) => `Rp ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}"
text = replace_once(text, old_formatter, 'tickFormatter={formatRupiahAxis}', 'PremiumFinanceReport axis formatter')

chart_open = """            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">"""
chart_open_new = """            <div style={{ height: '280px', width: '100%' }}>
              {!chartTrendData.some((item) => Number(item.Pemasukan || 0) > 0 || Number(item.Pengeluaran || 0) > 0) ? (
                <div className="chart-empty-state">
                  <div className="chart-empty-icon" aria-hidden="true">📈</div>
                  <strong>Belum ada transaksi</strong>
                  <span>Data akan muncul otomatis setelah transaksi pertama</span>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">"""
text = replace_once(text, chart_open, chart_open_new, 'PremiumFinanceReport empty chart open')
chart_close = """                  <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#finKeluarGrad)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>"""
chart_close_new = """                  <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#finKeluarGrad)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>"""
text = replace_once(text, chart_close, chart_close_new, 'PremiumFinanceReport empty chart close')

ringkasan_tail = """          </div>
        </div>
      )}


      {/* TAB 2: ARUS KAS */}"""
ringkasan_tail_new = """          </div>

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
        </div>
      )}


      {/* TAB 2: ARUS KAS */}"""
text = replace_once(text, ringkasan_tail, ringkasan_tail_new, 'PremiumFinanceReport monthly chart insertion')

source_start = '      {/* TAB 5: SUMBER OMZET */}'
source_end = '      {/* TAB 6: PIUTANG / BELUM LUNAS */}'
source_new = """      {/* TAB 5: SUMBER OMZET */}
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

"""
text = replace_between(text, source_start, source_end, source_new, 'PremiumFinanceReport source omzet')
write(path, text)


# -----------------------------------------------------------------------------
# Global stylesheet import and status palette
# -----------------------------------------------------------------------------
path = 'src/main.jsx'
text = read(path)
text = replace_once(text, "import './index.css'", "import './index.css'\nimport './unitpro-ui-polish.css'", 'main CSS import')
write(path, text)

path = 'src/config/tierLimits.js'
text = read(path)
status_changes = [
    ("{ id: 'DICEK',          label: 'Sedang Dicek',    color: '#0284c7', bg: '#e0f2fe'", "{ id: 'DICEK',          label: 'Sedang Dicek',    color: '#3B82F6', bg: '#DBEAFE'"),
    ("{ id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#d97706', bg: '#fef3c7'", "{ id: 'DIKERJAKAN',     label: 'Sedang Dikerjakan', color: '#F59E0B', bg: '#FEF3C7'"),
    ("{ id: 'MENUNGGU_PART',  label: 'Menunggu Part',   color: '#9333ea', bg: '#f3e8ff'", "{ id: 'MENUNGGU_PART',  label: 'Menunggu Part',   color: '#F59E0B', bg: '#FEF3C7'"),
    ("{ id: 'SELESAI',        label: 'Selesai',         color: '#16a34a', bg: '#dcfce7'", "{ id: 'SELESAI',        label: 'Selesai',         color: '#10B981', bg: '#D1FAE5'"),
    ("{ id: 'DIAMBIL',        label: 'Sudah Diambil',   color: '#059669', bg: '#d1fae5'", "{ id: 'DIAMBIL',        label: 'Sudah Diambil',   color: '#10B981', bg: '#D1FAE5'"),
    ("{ id: 'DIBATALKAN',     label: 'Dibatalkan',      color: '#dc2626', bg: '#fee2e2'", "{ id: 'DIBATALKAN',     label: 'Dibatalkan',      color: '#EF4444', bg: '#FEE2E2'"),
]
for old, new in status_changes:
    if old not in text:
        raise RuntimeError(f'tierLimits color anchor missing: {old}')
    text = text.replace(old, new, 1)
write(path, text)

print('UnitPro UI polish applied successfully.')
