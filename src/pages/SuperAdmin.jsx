import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Settings, Users, ArrowDownCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
  const [stats, setStats] = useState({ tenants: [], withdrawals: [], platform_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (e) {
      console.error(e);
      alert('Gagal memuat data admin');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Basic auth check for admin could go here.
    // For now, we assume if they hit /super-admin, they have access.
    loadStats();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Yakin ingin menyetujui penarikan ini?')) return;
    try {
      await apiService.approveWithdrawal(id);
      alert('Penarikan disetujui');
      loadStats();
    } catch (e) {
      alert('Gagal menyetujui');
    }
  };

  const handlePlatformWithdraw = () => {
    if (stats.platform_balance === 0) return alert('Saldo komisi kosong.');
    if (!window.confirm(`Tarik seluruh saldo komisi sebesar Rp ${stats.platform_balance.toLocaleString('id-ID')} ke Rekening Utama?`)) return;
    
    // Simulate platform withdraw for now
    alert('Penarikan berhasil diajukan ke Bank Pusat. Saldo akan di-reset (simulasi).');
    setStats({ ...stats, platform_balance: 0 });
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <header style={{ background: 'var(--primary)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Super Admin ERP SaaS</h2>
        <button className="btn btn-ghost" style={{ color: 'white' }} onClick={() => navigate('/')}>Ke Halaman Utama</button>
      </header>

      <div style={{ display: 'flex', maxWidth: '1200px', margin: '2rem auto', gap: '20px', padding: '0 1rem' }}>
        
        {/* Sidebar */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('dashboard')}>
            <TrendingUp size={18} /> Dashboard
          </button>
          <button className={`btn ${activeTab === 'tenants' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('tenants')}>
            <Users size={18} /> Daftar Toko (Tenants)
          </button>
          <button className={`btn ${activeTab === 'withdrawals' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('withdrawals')}>
            <ArrowDownCircle size={18} /> Penarikan Saldo
            {stats.withdrawals.filter(w => w.status === 'PENDING').length > 0 && (
              <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                {stats.withdrawals.filter(w => w.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }} className="animate-fade-in">
          
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                  <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Saldo Platform (Komisi)</h3>
                  <h1 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem' }}>Rp {stats.platform_balance.toLocaleString('id-ID')}</h1>
                  <button className="btn btn-ghost" style={{ color: 'white', border: '1px solid white', width: '100%' }} onClick={handlePlatformWithdraw}>
                    Tarik ke Rekening Pusat
                  </button>
                </div>
                
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Toko Terdaftar</h3>
                  <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--primary)' }}>{stats.tenants.length}</h1>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Permintaan Penarikan</h3>
                  <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#f59e0b' }}>
                    {stats.withdrawals.filter(w => w.status === 'PENDING').length}
                  </h1>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="glass-panel">
              <h2 style={{ marginBottom: '1.5rem' }}>Daftar Toko / Cabang</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Toko</th>
                    <th>Email / Kontak</th>
                    <th>Tier</th>
                    <th>Reputasi</th>
                    <th>Saldo Dompet</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tenants.map(t => (
                    <tr key={t.id}>
                      <td><span className="badge">{t.code}</span></td>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.email}</td>
                      <td>
                        <span className={`badge ${t.tier === 'premium' ? 'badge-warning' : ''}`}>
                          {t.tier.toUpperCase()}
                        </span>
                      </td>
                      <td>{t.reputation_points}</td>
                      <td>Rp {(t.wallet_balance || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {stats.tenants.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>Belum ada tenant</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="glass-panel">
              <h2 style={{ marginBottom: '1.5rem' }}>Permintaan Penarikan Dana</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Toko / Teknisi</th>
                    <th>Nominal</th>
                    <th>Rekening Tujuan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{new Date(w.created_at).toLocaleDateString('id-ID')}</td>
                      <td><strong>{w.tenant_name}</strong><br/><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.tenant_code}</span></td>
                      <td style={{ fontWeight: 'bold' }}>Rp {w.amount.toLocaleString('id-ID')}</td>
                      <td>
                        {w.bank_name} - {w.account_number}<br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>a.n {w.account_name}</span>
                      </td>
                      <td>
                        <span className={`badge ${w.status === 'PENDING' ? 'badge-warning' : w.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td>
                        {w.status === 'PENDING' && (
                          <button className="btn btn-accent" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleApprove(w.id)}>
                            <CheckCircle size={14}/> Setujui Transfer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.withdrawals.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>Belum ada riwayat penarikan</td></tr>}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
