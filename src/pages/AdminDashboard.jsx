import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { LogOut, ShoppingCart, Wrench, Package, Users, TrendingUp, Settings, MessageCircle, DollarSign, X, Trash, Plus, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { apiService } from '../services/api';
import ForumCommunity from '../components/ForumCommunity';
import WalletDashboard from '../components/WalletDashboard';
import POSView from '../components/POSView';

export default function AdminDashboard() {
  const { tenant, clearTenant, updateTenantSettings, cart, addToCart, removeFromCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const settings = tenant?.settings || {};
  const isFree = tenant?.tier === 'free';

  useEffect(() => {
    if (tenant.code) {
      apiService.getProducts(tenant.code).then(setProducts);
      apiService.getServices(tenant.code).then(setServices);
    }
  }, [tenant.code]);

  const handleLogout = () => {
    clearTenant();
    navigate('/');
  };

  const handleCheckout = async () => {
    // Moved to POSView
  };

  const tabs = [
    { id: 'pos', name: 'Kasir (POS)', icon: ShoppingCart },
    { id: 'servis', name: 'Servis & WA', icon: Wrench },
    { id: 'master', name: 'Master Barang', icon: Package },
    { id: 'karyawan', name: 'Karyawan', icon: Users },
    { id: 'keuangan', name: 'Keuangan', icon: TrendingUp },
    { id: 'dompet', name: 'Dompet & Penarikan', icon: Wallet },
    { id: 'forum', name: 'Forum Teknisi', icon: MessageCircle },
    { id: 'harga', name: 'Pasar Harga', icon: DollarSign },
    { id: 'pengaturan', name: 'Pengaturan Toko', icon: Settings },
  ];

  return (
    <div className="dashboard-layout">
      <div className="sidebar animate-slide-in">
        <div style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '40px', borderRadius: '8px', marginBottom: '0.5rem' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', margin: '0 auto 0.5rem' }}>
              {settings.storeName?.charAt(0)}
            </div>
          )}
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>{settings.storeName}</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Cabang: {tenant.name}</p>
        </div>

        <div style={{ flex: 1 }}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} /> {tab.name}
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%' }}>
          <LogOut size={18} /> Keluar
        </button>
      </div>

      <div className="main-content animate-fade-in">
        <h2 style={{ marginBottom: '1.5rem' }}>{tabs.find(t => t.id === activeTab)?.name}</h2>
        
        {activeTab === 'pos' ? (
          <POSView products={products} />
        ) : activeTab === 'pengaturan' ? (
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
              <h3 style={{ marginBottom: '1.5rem' }}>Daftar Servis Aktif</h3>
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
             <h3 style={{ marginBottom: '1.5rem' }}>Master Barang & Sparepart</h3>
             
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
             <h3 style={{ marginBottom: '1.5rem' }}>Manajemen Karyawan (Teknisi)</h3>
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
              <p>Konten untuk {activeTab} akan dimigrasikan ke sini...</p>
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
