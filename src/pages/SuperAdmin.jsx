import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Settings, Users, ArrowDownCircle, CheckCircle, TrendingUp, Sparkles, Shield, Wallet, ArrowUpRight, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
  const [stats, setStats] = useState({ tenants: [], withdrawals: [], platform_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [updatingCode, setUpdatingCode] = useState(null);
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
    loadStats();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Pastikan Anda sudah mentransfer dana ke rekening teknisi. Lanjutkan tandai sebagai SUKSES?')) return;
    try {
      await apiService.approveWithdrawal(id);
      alert('Penarikan dana berhasil disetujui & ditandai sukses!');
      loadStats();
    } catch (e) {
      alert('Gagal menyetujui penarikan');
    }
  };

  const handleTierChange = async (tenantCode, newTier) => {
    try {
      setUpdatingCode(tenantCode);
      await apiService.updateTenantTier(tenantCode, newTier);
      alert(`Paket toko ${tenantCode} berhasil diubah ke ${newTier.toUpperCase()}`);
      loadStats();
    } catch (e) {
      alert('Gagal mengubah tier toko');
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleAdjustWallet = async (tenantCode) => {
    const amountStr = window.prompt(`Masukkan jumlah penyesuaian saldo dompet untuk toko ${tenantCode} (contoh: 50000 atau -20000):`);
    if (!amountStr) return;
    const delta = parseInt(amountStr, 10);
    if (isNaN(delta)) return alert('Nominal harus angka!');

    try {
      await apiService.adjustTenantWallet(tenantCode, delta);
      alert('Saldo dompet berhasil diperbarui!');
      loadStats();
    } catch (e) {
      alert('Gagal memperbarui saldo');
    }
  };

  const handlePlatformWithdraw = () => {
    if (stats.platform_balance === 0) return alert('Saldo komisi kosong.');
    if (!window.confirm(`Tarik seluruh saldo komisi platform sebesar Rp ${stats.platform_balance.toLocaleString('id-ID')} ke Rekening Pribadi Anda?`)) return;
    
    alert('Penarikan saldo komisi platform berhasil dicatat!');
    setStats({ ...stats, platform_balance: 0 });
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat Data Super Admin...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <header style={{ 
        background: 'linear-gradient(90deg, #1e3a8a 0%, #0284c7 100%)', 
        color: 'white', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 15px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={26} color="#fbbf24" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: 'white' }}>Super Admin Master</h2>
            <span style={{ fontSize: '0.75rem', color: '#e0f2fe' }}>AISERVICE.ID Platform Controller</span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
        >
          Ke Halaman Utama →
        </button>
      </header>

      {/* CONTAINER */}
      <div style={{ display: 'flex', maxWidth: '1280px', margin: '2rem auto', gap: '24px', padding: '0 1.5rem' }}>
        
        {/* SIDEBAR NAVIGATION */}
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'dashboard' ? '#0284c7' : '#ffffff', color: activeTab === 'dashboard' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'dashboard' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'dashboard' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <TrendingUp size={18} /> Dashboard Platform
          </button>

          <button 
            onClick={() => setActiveTab('tenants')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'tenants' ? '#0284c7' : '#ffffff', color: activeTab === 'tenants' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'tenants' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'tenants' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <Users size={18} /> Manajemen Toko ({stats.tenants.length})
          </button>

          <button 
            onClick={() => setActiveTab('withdrawals')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'withdrawals' ? '#0284c7' : '#ffffff', color: activeTab === 'withdrawals' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'withdrawals' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'withdrawals' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <ArrowDownCircle size={18} /> Penarikan Saldo
            {stats.withdrawals.filter(w => w.status === 'PENDING').length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                {stats.withdrawals.filter(w => w.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1 }}>
          
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
                {/* Platform Wallet */}
                <div style={{ padding: '1.8rem', borderRadius: '20px', background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)', color: 'white', boxShadow: '0 8px 25px rgba(2, 132, 199, 0.25)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#bae6fd', fontWeight: '700', textTransform: 'uppercase' }}>Saldo Komisi Platform (1%)</div>
                  <h1 style={{ margin: '8px 0 1.2rem 0', fontSize: '2.4rem', fontWeight: '900' }}>Rp {stats.platform_balance.toLocaleString('id-ID')}</h1>
                  <button 
                    onClick={handlePlatformWithdraw}
                    style={{ background: 'white', color: '#0369a1', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', width: '100%' }}
                  >
                    Tarik ke Rekening Utama →
                  </button>
                </div>
                
                {/* Total Stores */}
                <div style={{ padding: '1.8rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Toko Terdaftar</div>
                  <h1 style={{ margin: '8px 0 0 0', fontSize: '2.6rem', fontWeight: '900', color: '#0f172a' }}>{stats.tenants.length}</h1>
                  <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '6px', fontWeight: '600' }}>
                    {stats.tenants.filter(t => t.tier === 'pro' || t.tier === 'enterprise').length} Toko Berlangganan Pro/Enterprise
                  </div>
                </div>

                {/* Pending Withdrawals */}
                <div style={{ padding: '1.8rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Permintaan Withdraw Pending</div>
                  <h1 style={{ margin: '8px 0 0 0', fontSize: '2.6rem', fontWeight: '900', color: '#d97706' }}>
                    {stats.withdrawals.filter(w => w.status === 'PENDING').length}
                  </h1>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Menunggu approval admin</div>
                </div>
              </div>

              {/* Quick Info Box */}
              <div style={{ padding: '1.8rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: '800' }}>Petunjuk Operasional Super Admin</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', lineHeight: '1.8', fontSize: '0.92rem' }}>
                  <li><strong>Aktivasi Toko Pro / Enterprise:</strong> Buka tab <em>"Manajemen Toko"</em>, ubah pilihan paket toko yang baru saja transfer pembayaran menjadi <code>PRO</code> atau <code>ENTERPRISE</code>.</li>
                  <li><strong>Persetujuan Penarikan Teknisi (Withdraw):</strong> Buka tab <em>"Penarikan Saldo"</em>, cek nomor rekening tujuan teknisi, transfer dananya, lalu klik <strong>"Setujui Transfer"</strong>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. TENANTS MANAGEMENT */}
          {activeTab === 'tenants' && (
            <div style={{ padding: '2rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>Daftar Toko & Aktivasi Langganan</h2>
                <button onClick={loadStats} style={{ padding: '6px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                  Refresh Data 🔄
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px' }}>Kode Toko</th>
                      <th style={{ padding: '12px' }}>Nama Toko</th>
                      <th style={{ padding: '12px' }}>Paket (Tier)</th>
                      <th style={{ padding: '12px' }}>Reputasi</th>
                      <th style={{ padding: '12px' }}>Saldo Dompet</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Aksi / Upgrade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tenants.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem' }}>
                            {t.code}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{t.name}</td>
                        <td style={{ padding: '12px' }}>
                          <select 
                            value={t.tier || 'free'} 
                            onChange={(e) => handleTierChange(t.code, e.target.value)}
                            disabled={updatingCode === t.code}
                            style={{
                              padding: '5px 8px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                              background: t.tier === 'enterprise' ? '#f3e8ff' : t.tier === 'pro' ? '#e0f2fe' : '#f1f5f9',
                              color: t.tier === 'enterprise' ? '#7c3aed' : t.tier === 'pro' ? '#0284c7' : '#475569',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            <option value="free">Starter (Gratis)</option>
                            <option value="pro">Pro Titan (Rp 49rb)</option>
                            <option value="enterprise">Enterprise (Rp 79rb)</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px' }}>⭐ {t.reputation_points || 0}</td>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>
                          Rp {(t.wallet_balance || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleAdjustWallet(t.code)}
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Ubah Saldo 💳
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stats.tenants.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Belum ada toko yang mendaftar</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. WITHDRAWALS MANAGEMENT */}
          {activeTab === 'withdrawals' && (
            <div style={{ padding: '2rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', fontWeight: '900' }}>Permintaan Penarikan Dana Teknisi</h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px' }}>Tanggal</th>
                      <th style={{ padding: '12px' }}>Toko / Teknisi</th>
                      <th style={{ padding: '12px' }}>Nominal</th>
                      <th style={{ padding: '12px' }}>Rekening / E-Wallet Tujuan</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.withdrawals.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', color: '#64748b' }}>{new Date(w.created_at).toLocaleDateString('id-ID')}</td>
                        <td style={{ padding: '12px' }}>
                          <strong>{w.tenant_name || w.tenant_code}</strong><br/>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{w.tenant_code}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '900', color: '#0284c7' }}>
                          Rp {w.amount.toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <strong style={{ color: '#0f172a' }}>{w.bank_name} - {w.account_number}</strong><br/>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>a/n {w.account_name}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                            background: w.status === 'SUCCESS' ? '#dcfce7' : w.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                            color: w.status === 'SUCCESS' ? '#15803d' : w.status === 'PENDING' ? '#b45309' : '#b91c1c'
                          }}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {w.status === 'PENDING' ? (
                            <button 
                              onClick={() => handleApprove(w.id)}
                              style={{
                                background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px',
                                fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <CheckCircle size={14} /> Setujui Transfer
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Selesai ✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {stats.withdrawals.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Belum ada pengajuan penarikan</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
