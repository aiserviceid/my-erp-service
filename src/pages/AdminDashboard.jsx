import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { LogOut, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, DollarSign, X, Trash, Plus, Wallet, GitBranch, Building2, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { apiService } from '../services/api';
import ForumCommunity from '../components/ForumCommunity';
import WalletDashboard from '../components/WalletDashboard';
import POSView from '../components/POSView';

export default function AdminDashboard() {
  const { tenant, setTenant, clearTenant, updateTenantSettings, cart, addToCart, removeFromCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi Branch States
  const [branches, setBranches] = useState([]);
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');

  const settings = tenant?.settings || {};
  const isFree = tenant?.tier === 'free';
  const isEnterprise = tenant?.tier === 'enterprise';

  useEffect(() => {
    if (tenant?.code) {
      apiService.getProducts(tenant.code).then(setProducts);
      apiService.getServices(tenant.code).then(setServices);
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

  const tabs = [
    { id: 'pos', name: 'Kasir (POS)', icon: ShoppingCart },
    { id: 'servis', name: 'Servis & WA', icon: Wrench },
    { id: 'master', name: 'Master Barang', icon: Package },
    { id: 'karyawan', name: 'Karyawan', icon: Users },
    { id: 'cabang', name: 'Multi-Cabang', icon: Building2, badge: isEnterprise ? '5 Max' : 'Enterprise' },
    { id: 'keuangan', name: 'Keuangan', icon: TrendingUp },
    { id: 'dompet', name: 'Dompet & Penarikan', icon: Wallet },
    { id: 'forum', name: 'Forum Teknisi', icon: MessageCircle },
    { id: 'harga', name: 'Pasar Harga', icon: DollarSign },
    { id: 'pengaturan', name: 'Pengaturan Toko', icon: Settings },
  ];

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
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
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Tier: <strong style={{ color: isEnterprise ? '#7c3aed' : isFree ? '#64748b' : '#0284c7', textTransform: 'uppercase' }}>{tenant?.tier || 'free'}</strong>
          </div>
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
        
        {/* 1. POS */}
        {activeTab === 'pos' ? (
          <POSView products={products} />
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
            
          </div>
        ) : activeTab === 'dompet' ? (
          <WalletDashboard />
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
              <h3 style={{ marginBottom: '1.5rem' }}>Daftar Servis Aktif ({tenant?.name})</h3>
              <table className="table">
               <thead><tr><th>Resi</th><th>Pelanggan</th><th>Perangkat</th><th>Kerusakan</th><th>Status</th><th>Aksi</th></tr></thead>
               <tbody>
                 {services.length > 0 ? services.map(s => (
                   <tr key={s.resi}>
                      <td>{s.resi}</td>
                      <td>{s.customer_name} ({s.customer_phone})</td>
                      <td>{s.device_name}</td>
                      <td>{s.issue}</td>
                      <td><span className={`badge ${s.status === 'SELESAI' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-primary" onClick={() => { setSelectedResi(s.resi); setShowBarcodeModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>Cetak Stiker</button>
                          <a href={`https://wa.me/${s.customer_phone.replace(/^0/, '62')}?text=Halo ${s.customer_name}, servis ${s.device_name} Anda (Resi: ${s.resi}) status: ${s.status}.`} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ fontSize: '0.8rem', padding: '5px 10px', textDecoration: 'none' }}>Kirim WA</a>
                        </div>
                      </td>
                   </tr>
                 )) : (
                   <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data servis. Tambahkan dari Aplikasi Teknisi.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        ) : activeTab === 'master' ? (
          <div className="glass-panel" style={{ minHeight: '400px' }}>
             <h3 style={{ marginBottom: '1.5rem' }}>Master Barang & Sparepart ({tenant?.name})</h3>
             
             <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <input type="text" className="input-field" placeholder="Nama Barang..." id="newProductName" style={{ flex: 1 }} />
                <input type="number" className="input-field" placeholder="Harga (Rp)" id="newProductPrice" style={{ width: '150px' }} />
                <input type="number" className="input-field" placeholder="Stok" id="newProductStock" style={{ width: '100px' }} />
                <button className="btn btn-primary" onClick={async () => {
                  const name = document.getElementById('newProductName').value;
                  const price = parseInt(document.getElementById('newProductPrice').value);
                  const stock = parseInt(document.getElementById('newProductStock').value);
                  if (!name || !price) return alert('Nama dan Harga wajib diisi');
                  
                  try {
                    const newProd = await apiService.addProduct({ tenant_code: tenant.code, name, price, stock: stock || 0 });
                    setProducts([...products, newProd]);
                    document.getElementById('newProductName').value = '';
                    document.getElementById('newProductPrice').value = '';
                    document.getElementById('newProductStock').value = '';
                  } catch (e) {
                    alert('Gagal menambah barang');
                  }
                }}>
                  <Plus size={18} /> Tambah
                </button>
             </div>

             <table className="table">
               <thead><tr><th>ID</th><th>Nama Barang</th><th>Harga</th><th>Stok</th></tr></thead>
               <tbody>
                 {products.map(p => (
                   <tr key={p.id}>
                     <td>{p.id}</td>
                     <td>{p.name}</td>
                     <td>Rp {p.price.toLocaleString('id-ID')}</td>
                     <td>{p.stock}</td>
                   </tr>
                 ))}
                 {products.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data barang.</td></tr>}
               </tbody>
             </table>
          </div>
        ) : activeTab === 'karyawan' ? (
          <div className="glass-panel" style={{ minHeight: '400px' }}>
             <h3 style={{ marginBottom: '1.5rem' }}>Manajemen Karyawan ({tenant?.name})</h3>
             <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <input type="text" className="input-field" placeholder="Nama Karyawan..." id="newEmpName" style={{ flex: 1 }} />
                <input type="text" className="input-field" placeholder="PIN (Angka)" id="newEmpPin" style={{ width: '150px' }} />
                <select className="input-field" id="newEmpRole" style={{ width: '150px' }}>
                  <option value="TEKNISI">Teknisi</option>
                  <option value="KASIR">Kasir</option>
                </select>
                <button className="btn btn-primary" onClick={async () => {
                  const name = document.getElementById('newEmpName').value;
                  const pin = document.getElementById('newEmpPin').value;
                  const role = document.getElementById('newEmpRole').value;
                  if (!name || !pin) return alert('Nama dan PIN wajib diisi');
                  try {
                    await apiService.post('/users', { tenant_code: tenant.code, name, role, pin });
                    alert('Karyawan Berhasil Ditambah!');
                  } catch (e) { alert('Gagal'); }
                }}>
                  <Plus size={18} /> Tambah
                </button>
             </div>
             <p style={{ color: 'var(--text-muted)' }}>*Karyawan ini nantinya bisa login melalui halaman khusus menggunakan PIN.</p>
          </div>
        ) : activeTab === 'keuangan' ? (
          <div className="glass-panel" style={{ minHeight: '400px' }}>
              <p>Laporan Keuangan & Arus Kas Real-Time untuk cabang {tenant?.name}.</p>
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
    </div>
  );
}
