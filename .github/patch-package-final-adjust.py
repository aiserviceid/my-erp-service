from pathlib import Path

# 1) Update tier config limits and white label public pricing language
p = Path('src/config/tierLimits.js')
s = p.read_text()
s = s.replace('maxServicesPerMonth: 50,', 'maxServicesPerMonth: 25,', 1)
s = s.replace('maxTransactionsPerMonth: 100,', 'maxTransactionsPerMonth: 50,', 1)
s = s.replace('maxProducts: 100,', 'maxProducts: 50,', 1)
s = s.replace("'50 servis per bulan'", "'25 servis per bulan'")
s = s.replace("'100 transaksi kasir per bulan'", "'50 transaksi kasir per bulan'")
s = s.replace("'100 produk/sparepart'", "'50 produk/sparepart'")
s = s.replace("price: 'Mulai Rp2,5 juta',\n          period: 'setup',\n          monthly: 'Maintenance mulai Rp299.000/bulan',", "price: 'Hubungi Partner',\n          period: '',\n          monthly: 'Konsultasi khusus white label',")
p.write_text(s)

# 2) Update landing page free and white label copy
p = Path('src/pages/LandingPage.jsx')
s = p.read_text()
s = s.replace('<li><Check size={16} /> 50 servis/bulan</li>', '<li><Check size={16} /> 25 servis/bulan</li>')
s = s.replace('<li><Check size={16} /> 100 transaksi kasir/bulan</li>', '<li><Check size={16} /> 50 transaksi kasir/bulan</li>')
s = s.replace('<li><Check size={16} /> 100 produk/sparepart</li>', '<li><Check size={16} /> 50 produk/sparepart</li>')
s = s.replace('<p className="simple-price">Rp2,5jt<span>+ setup</span></p>\n            <small>Aplikasi dengan brand sendiri</small>', '<p className="simple-price contact">Hubungi Partner</p>\n            <small>Paket khusus aplikasi dengan brand sendiri</small>')
s = s.replace('>Konsultasi White Label</a>', '>Hubungi Partner</a>')
p.write_text(s)

# 3) Update register package selector in Login.jsx
p = Path('src/pages/Login.jsx')
s = p.read_text()
s = s.replace('/* Tier Selector — 3 paket: Free, Pro, Enterprise */', '/* Tier Selector — paket publik: Free, Pro, Enterprise. White Label lewat konsultasi partner. */')
s = s.replace("<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'free' ? '#059669' : '#0f172a' }}>Gratis</div>\n                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>Rp 0</div>", "<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'free' ? '#059669' : '#0f172a' }}>Free</div>\n                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>Rp 0</div>\n                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>25 servis · 50 POS · 50 produk</div>")
s = s.replace("<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'pro' ? '#0284c7' : '#0f172a' }}>Pro ⭐</div>\n                  <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>\n                    {billingCycle === 'yearly' ? 'Rp 590rb/thn' : 'Rp 99rb/bln'}\n                  </div>", "<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'pro' ? '#0284c7' : '#0f172a' }}>Pro ⭐</div>\n                  <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>\n                    {billingCycle === 'yearly' ? 'Rp 590rb/thn' : 'Rp 99rb/bln'}\n                  </div>\n                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>Unlimited · tim · WA/CRM</div>")
s = s.replace("<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'enterprise' ? '#7c3aed' : '#0f172a' }}>Multi Outlet</div>\n                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700' }}>{billingCycle === 'yearly' ? 'Rp 2,49jt/thn' : 'Rp 249rb/bln'}</div>", "<div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'enterprise' ? '#7c3aed' : '#0f172a' }}>Enterprise</div>\n                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700' }}>{billingCycle === 'yearly' ? 'Rp 2,49jt/thn' : 'Rp 249rb/bln'}</div>\n                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>Multi outlet · 5 cabang</div>")
marker = """              </div>\n            </div>\n\n            {selectedTier !== 'free' && ("""
insert = """              </div>\n              <div style={{ marginTop: '10px', padding: '12px', borderRadius: '12px', background: selectedTier === 'free' ? '#ecfdf5' : selectedTier === 'pro' ? '#eff6ff' : '#f5f3ff', border: selectedTier === 'free' ? '1px solid #a7f3d0' : selectedTier === 'pro' ? '1px solid #bfdbfe' : '1px solid #ddd6fe' }}>\n                <div style={{ fontWeight: '900', fontSize: '0.82rem', color: '#0f172a', marginBottom: '6px' }}>\n                  {selectedTier === 'free' ? 'Free cocok untuk coba dulu' : selectedTier === 'pro' ? 'Pro untuk toko servis aktif' : 'Enterprise untuk banyak outlet'}\n                </div>\n                <div style={{ color: '#475569', fontSize: '0.76rem', lineHeight: 1.55, fontWeight: '650' }}>\n                  {selectedTier === 'free' && 'Batas 25 servis/bulan, 50 transaksi POS/bulan, 50 produk, tanpa akun karyawan/teknisi, tanpa WA Marketing, tanpa export Excel.'}\n                  {selectedTier === 'pro' && 'Servis, POS, dan produk unlimited. Tim teknisi aktif, WhatsApp pelanggan/CRM, katalog, laporan owner, dan export Excel aktif.'}\n                  {selectedTier === 'enterprise' && 'Untuk multi outlet: hingga 5 cabang, 50 karyawan, laporan cabang, dan prioritas setup.'}\n                </div>\n                <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.72rem', lineHeight: 1.45 }}>\n                  White Label / aplikasi brand sendiri tidak tersedia di pendaftaran umum. Hubungi Partner UnitPro untuk konsultasi khusus.\n                </div>\n              </div>\n            </div>\n\n            {selectedTier !== 'free' && ("""
if marker in s and 'Free cocok untuk coba dulu' not in s:
    s = s.replace(marker, insert)
else:
    raise SystemExit('Login package selector marker not found or already patched')
p.write_text(s)
