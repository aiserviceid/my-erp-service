import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { LogOut, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, DollarSign, X, Trash, Plus, Wallet, Building2, Check, ExternalLink, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import ForumCommunity from '../components/ForumCommunity';
import WalletDashboard from '../components/WalletDashboard';
import POSView from '../components/POSView';
import AffiliatePortal from '../components/AffiliatePortal';

export default function AdminDashboard() {
  const { tenant, setTenant, clearTenant, updateTenantSettings, cart, addToCart, removeFromCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Bulan Ini');
  
  const exportToExcel = (txs) => {
    const data = txs.map(t => {
      const typeStr = t.type === 'INCOME' ? 'Pendapatan Servis' : t.type === 'POS_SALES' ? 'Penjualan' : t.type === 'BON_KARYAWAN' ? 'Kasbon' : t.type === 'EXPENSE' ? 'Pengeluaran' : 'Lainnya';
      const amount = (t.type === 'INCOME' || t.type === 'POS_SALES' ? t.amount : -t.amount);
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
      apiService.getUsers(tenant.code).then(setUsers);
      apiService.get(`/transactions/${tenant.code}`).then(setTransactions).catch(() => {});
      
      // Auto-sync tier and settings from server
      apiService.getTenantPublic(tenant.code).then(data => {
        if (data) {
          if (data.tier && data.tier !== tenant.tier) {
            setTenant(tenant.code, data.name || tenant.name, '', data.tier, tenant.token);
          }
          if (data.settings && JSON.stringify(data.settings) !== JSON.stringify(tenant.settings)) {
            // Also sync settings if needed, but primarily tier is important
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

  const tabs = [
    { id: 'pos', name: 'Kasir (POS)', icon: ShoppingCart },
    { id: 'servis', name: 'Servis & WA', icon: Wrench },
    { id: 'master', name: 'Master Barang', icon: Package },
    { id: 'karyawan', name: 'Karyawan', icon: Users },
    { id: 'cabang', name: 'Multi-Cabang', icon: Building2, badge: isEnterprise ? '5 Max' : 'Enterprise' },
    { id: 'keuangan', name: 'Keuangan', icon: TrendingUp },
    { id: 'dompet', name: 'Dompet & Penarikan', icon: Wallet },
    { id: 'afiliasi', name: 'Afiliasi & Komisi 80%', icon: Gift, badge: '🔥' },
    { id: 'forum', name: 'Forum Teknisi', icon: MessageCircle },
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
              <h3 style={{ marginBottom: '1.5rem' }}>Otomatisasi WhatsApp & Kontak {isFree && <span className="badge badge-warning">Premium</span>}</h3>
              <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <h4>Otomatisasi WhatsApp (API Fonnte)</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Pilih metode pengiriman WA saat servis selesai. Jika memilih Otomatis, sistem membutuhkan Token API Fonnte.
              </p>
                <select 
                  className="input-field" 
                  id="waMethodInput" 
                  defaultValue={tenant?.settings?.wa_method || 'auto'} 
                  style={{ width: '100%', maxWidth: '400px', marginBottom: '10px' }}
                  disabled={isFree}
                >
                  <option value="auto">Otomatis (API Fonnte)</option>
                  <option value="manual">Manual (WhatsApp Web / Aplikasi)</option>
                </select>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Token API Fonnte (Abaikan jika Manual)..."
                  defaultValue={tenant?.settings?.fonnte_token || ''}
                  id="fonnteTokenInput"
                  style={{ width: '100%', maxWidth: '400px', marginBottom: '1rem' }}
                  disabled={isFree}
                />
                <button className="btn btn-primary" disabled={isFree} onClick={async () => {
                  const token = document.getElementById('fonnteTokenInput').value;
                  const method = document.getElementById('waMethodInput').value;
                  try {
                    const newSettings = { ...tenant?.settings, fonnte_token: token, wa_method: method };
                    await apiService.updateTenantSettings(tenant.code, newSettings);
                    updateTenantSettings(newSettings);
                    alert('Pengaturan WhatsApp berhasil disimpan!');
                  } catch(e) { alert('Gagal menyimpan pengaturan'); }
                }}>Simpan Pengaturan WA</button>
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
            
          </div>
        ) : activeTab === 'dompet' ? (
          <WalletDashboard />
        ) : activeTab === 'afiliasi' ? (
          <AffiliatePortal />
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
                  const issueText = `${fd.get('issue')} | Kelengkapan: ${kelengkapan}`;
                  const resiGenerated = 'TRX-' + Date.now();
                  const serviceData = {
                    tenant_code: tenant.code,
                    resi: resiGenerated,
                    customer_name: fd.get('name'),
                    customer_phone: fd.get('phone'),
                    device_name: fd.get('device'),
                    issue: issueText,
                    technician_id: fd.get('technician_id')
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
                    <input type="text" name="issue" className="input-field" placeholder="Keluhan / Kerusakan" required />
                  </div>
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
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Cari Resi atau Nama Pelanggan..." 
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
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
                        <td>{s.resi}</td>
                        <td>{s.customer_name} <br/><small style={{color: 'var(--text-muted)'}}>{s.customer_phone}</small></td>
                        <td>{s.device_name}</td>
                        <td style={{ whiteSpace: 'pre-wrap', maxWidth: '200px' }}>{cleanIssue}</td>
                        <td>{garansiStatus !== '-' ? <span className="badge badge-success" style={{background: '#dcfce7', color: '#16a34a'}}>s/d {garansiStatus}</span> : '-'}</td>
                        <td>{tech ? <span className="badge badge-warning">{tech.name}</span> : <span style={{ color: 'var(--text-muted)' }}>Belum Dipilih</span>}</td>
                        <td><span className={`badge ${s.status === 'SELESAI' || s.status === 'DI AMBIL' ? 'badge-success' : 'badge-warning'}`}>{s.status.replace('_', ' ')}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-primary" onClick={() => { setSelectedResi(s.resi); setShowBarcodeModal(true); }} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>Cetak Stiker</button>
                            <a href={`https://wa.me/${s.customer_phone.replace(/^0/, '62')}?text=Halo ${s.customer_name}, servis ${s.device_name} Anda (Resi: ${s.resi}) status: ${s.status.replace('_', ' ')}.`} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ fontSize: '0.8rem', padding: '5px 10px', textDecoration: 'none' }}>Kirim WA</a>
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
             
             <div style={{ background: '#e0f2fe', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
               <div>
                 <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#0369a1', fontWeight: 'bold' }}>Bagikan Tautan Katalog Digital ke Pelanggan:</p>
                 <a href={`${window.location.origin}/katalog/${tenant?.code}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>
                   {window.location.origin}/katalog/{tenant?.code}
                 </a>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1px solid #7dd3fc', color: '#0369a1', background: 'white' }} onClick={() => {
                   navigator.clipboard.writeText(`${window.location.origin}/katalog/${tenant?.code}`);
                   alert('Tautan Katalog berhasil disalin!');
                 }}>
                   📋 Salin Link
                 </button>
                 <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => window.open(`/katalog/${tenant?.code}`, '_blank')}>
                   <ExternalLink size={14} style={{ display: 'inline', marginRight: '5px' }}/> Buka
                 </button>
               </div>
             </div>
             
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
               <thead><tr><th>ID</th><th>Nama Barang</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
               <tbody>
                 {products.map(p => (
                   <tr key={p.id}>
                     <td>{p.id}</td>
                     <td>{p.name}</td>
                     <td>Rp {p.price.toLocaleString('id-ID')}</td>
                     <td>{p.stock}</td>
                     <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-warning" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                            const newName = prompt('Nama Barang:', p.name);
                            if (newName === null) return;
                            const newPrice = prompt('Harga (Rp):', p.price);
                            if (newPrice === null) return;
                            const newStock = prompt('Stok:', p.stock);
                            if (newStock === null) return;
                            try {
                              await apiService.updateProduct(p.id, { name: newName, price: parseInt(newPrice), stock: parseInt(newStock) });
                              setProducts(products.map(x => x.id === p.id ? { ...x, name: newName, price: parseInt(newPrice), stock: parseInt(newStock) } : x));
                            } catch(e) { alert('Gagal edit barang'); }
                          }}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
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
                 {products.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data barang.</td></tr>}
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

            const totalServis = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalPOS = filteredTransactions.filter(t => t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalExpense = filteredTransactions.filter(t => t.type === 'BON_KARYAWAN' || t.type === 'EXPENSE' || t.type === 'WITHDRAWAL').reduce((sum, t) => sum + (t.amount || 0), 0);
            const netProfit = totalServis + totalPOS - totalExpense;

            return (
              <div className="glass-panel" style={{ minHeight: '400px', animation: 'fadeIn 0.3s ease-in-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0 }}>Laporan Keuangan Toko ({tenant?.name})</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="btn btn-ghost" onClick={() => exportToExcel(filteredTransactions)} style={{ padding: '6px 12px', background: '#10b981', color: 'white' }}>
                      📥 Export Excel
                    </button>
                    <button className="btn btn-ghost" onClick={() => apiService.get(`/transactions/${tenant.code}`).then(setTransactions)} style={{ padding: '6px 12px' }}>
                      🔄 Segarkan
                    </button>
                    <select className="input-field" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ padding: '6px 12px', minWidth: '130px' }}>
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
                      <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Pemasukan Servis</p>
                      <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.5rem' }}>Rp {totalServis.toLocaleString('id-ID')}</h3>
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
                          const masuk = txs.filter(t => t.type === 'INCOME' || t.type === 'POS_SALES').reduce((sum, t) => sum + (t.amount||0), 0);
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
                    {filteredTransactions.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada transaksi pada periode ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          })()
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
                <input type="number" className="input-field" placeholder="% Komisi" id="newEmpComm" style={{ width: '100px' }} defaultValue="0" />
                <button className="btn btn-primary" onClick={async () => {
                  const name = document.getElementById('newEmpName').value;
                  const pin = document.getElementById('newEmpPin').value;
                  const role = document.getElementById('newEmpRole').value;
                  const comm = document.getElementById('newEmpComm').value || '0';
                  if (!name || !pin) return alert('Nama dan PIN wajib diisi');
                  try {
                    const newUser = await apiService.post('/users', { tenant_code: tenant.code, name, role, pin });
                    
                    const currentSettings = tenant.settings || {};
                    const employee_commissions = currentSettings.employee_commissions || {};
                    employee_commissions[newUser.id] = parseInt(comm);
                    const newSettings = { ...currentSettings, employee_commissions };
                    await apiService.updateTenantSettings(tenant.code, newSettings);
                    updateTenantSettings(newSettings);

                    setUsers([...users, newUser]);
                    document.getElementById('newEmpName').value = '';
                    document.getElementById('newEmpPin').value = '';
                    document.getElementById('newEmpComm').value = '0';
                    alert('Karyawan Berhasil Ditambah!');
                  } catch (e) { alert('Gagal'); }
                }}>
                  <Plus size={18} /> Tambah
                </button>
             </div>
             <p style={{ color: 'var(--text-muted)' }}>*Karyawan ini nantinya bisa login melalui Portal Karyawan menggunakan PIN.</p>
             <table className="table" style={{ marginTop: '1.5rem' }}>
               <thead><tr><th>Nama Karyawan</th><th>Peran (Role)</th><th>PIN Login</th><th>Komisi (%)</th><th>Aksi</th></tr></thead>
               <tbody>
                 {users.map(u => (
                   <tr key={u.id}>
                     <td>{u.name}</td>
                     <td><span className={`badge ${u.role === 'KASIR' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span></td>
                     <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.pin}</td>
                     <td>{tenant.settings?.employee_commissions?.[u.id] || 0}%</td>
                     <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-warning" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                            const newName = prompt('Nama Karyawan:', u.name);
                            if (newName === null) return;
                            const newPin = prompt('PIN Login:', u.pin);
                            if (newPin === null) return;
                            const newCommStr = prompt('Komisi (%):', tenant.settings?.employee_commissions?.[u.id] || 0);
                            if (newCommStr === null) return;

                            try {
                              await apiService.updateUser(u.id, { name: newName, pin: newPin });
                              
                              const currentSettings = tenant.settings || {};
                              const employee_commissions = currentSettings.employee_commissions || {};
                              employee_commissions[u.id] = parseInt(newCommStr);
                              const newSettings = { ...currentSettings, employee_commissions };
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
                 {users.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada karyawan terdaftar.</td></tr>}
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
    </div>
  );
}
