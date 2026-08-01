import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Store, LogIn, Search, Sparkles, CheckCircle, CreditCard, ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const location = useLocation();
  const initialTab = location.state?.tab || 'login'; // 'login' | 'register'
  const initialTier = location.state?.tier || 'free';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [tenantCode, setTenantCode] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedTier, setSelectedTier] = useState(initialTier);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const setTenant = useStore(state => state.setTenant);
  const navigate = useNavigate();

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = tenantCode.toUpperCase().trim();
    if (!code || !pin) {
      setError('Kode Toko dan PIN wajib diisi');
      setLoading(false);
      return;
    }
    
    try {
      const res = await apiService.loginTenant(code, '', pin);
      const data = res.tenant || res;
      setTenant(data.code, data.name, '', data.tier, res.token || `tenant_${data.code}`);
      if (data.settings) {
        useStore.getState().updateTenantSettings(typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings);
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Gagal masuk. Periksa Kode Toko atau PIN Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = tenantCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    const name = tenantName.trim();

    if (!code || !name || !pin) {
      setError('Nama Toko, Kode ID, dan PIN wajib diisi');
      setLoading(false);
      return;
    }

    try {
      const res = await apiService.loginTenant(code, name, pin);
      const data = res.tenant || res;

      if (selectedTier !== 'free') {
        setShowPaymentModal(true);
      } else {
        setSuccessMsg('Pendaftaran Toko Berhasil! Sedang mengalihkan ke Dashboard...');
        setTenant(data.code, data.name, '', 'free', res.token || `tenant_${data.code}`);
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Silakan gunakan Kode Toko lain.');
    } finally {
      setLoading(false);
    }
  };

  const getTierPriceText = () => {
    if (selectedTier === 'enterprise') return 'Rp 79.000';
    if (selectedTier === 'pro') return 'Rp 49.000';
    return 'Rp 0';
  };

  const getTierTitle = () => {
    if (selectedTier === 'enterprise') return 'Paket Enterprise Cabang (Promo Rp 79.000/bln)';
    if (selectedTier === 'pro') return 'Paket Pro Titan (Promo Rp 49.000/bln)';
    return 'Paket Starter (Gratis)';
  };

  const getWaUrl = () => {
    const amount = getTierPriceText();
    const text = `Halo Admin AISERVICE, saya ingin konfirmasi pembayaran aktivasi toko:%0A%0A🏪 *Nama Toko:* ${tenantName || tenantCode}%0A🔑 *Kode ID:* ${tenantCode.toUpperCase()}%0A📱 *No. WhatsApp:* ${phone}%0A📦 *Paket:* ${getTierTitle()}%0A💰 *Nominal Transfer:* ${amount}%0A%0ASaya telah melakukan transfer ke rekening BRI / DANA a/n Syaifudin. Mohon segera diaktifkan akun saya. Terima kasih!`;
    return `https://wa.me/6285382535050?text=${text}`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050811', padding: '2rem 1rem', color: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      
      {/* CARD CONTAINER */}
      <div style={{ 
        width: '100%', maxWidth: '480px', borderRadius: '24px', 
        background: 'rgba(11, 17, 32, 0.85)', border: '1px solid rgba(255, 255, 255, 0.08)', 
        padding: '2.5rem 2rem', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ 
            width: '46px', height: '46px', margin: '0 auto 12px auto',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', 
            borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)'
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '900', margin: 0, background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AISERVICE.ID
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Platform ERP Kasir & Manajemen Servis
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '4px', marginBottom: '1.8rem' }}>
          <button 
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'login' ? '#0ea5e9' : 'transparent', color: activeTab === 'login' ? 'white' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            Masuk Toko
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'register' ? '#0ea5e9' : 'transparent', color: activeTab === 'register' ? 'white' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            Daftar Toko Baru
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {successMsg}
          </div>
        )}

        {/* 1. FORM LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Kode ID Toko
              </label>
              <input 
                type="text" 
                placeholder="Contoh: TOKO-SERVIS" 
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                PIN Keamanan Toko
              </label>
              <input 
                type="password" 
                placeholder="Masukkan PIN Anda" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '1rem',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <LogIn size={18} /> {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        )}

        {/* 2. FORM REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Nama Bengkel / Toko
              </label>
              <input 
                type="text" 
                placeholder="Contoh: iPud Smartphone & Bengkel" 
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Kode ID Toko (Huruf & Angka)
              </label>
              <input 
                type="text" 
                placeholder="Contoh: IPUD-SERVICE" 
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                No. WhatsApp Aktif
              </label>
              <input 
                type="tel" 
                placeholder="Contoh: 081234567890" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Buat PIN Keamanan (4-6 Digit)
              </label>
              <input 
                type="password" 
                placeholder="PIN untuk login admin" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Tier Selector (Starter, Pro 49k, Enterprise 79k) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Pilihan Paket Berlangganan (Promo)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {/* Free */}
                <div 
                  onClick={() => setSelectedTier('free')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'free' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedTier === 'free' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'free' ? '#10b981' : 'white' }}>Starter</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Rp 0 (Gratis)</div>
                </div>

                {/* Pro 49k */}
                <div 
                  onClick={() => setSelectedTier('pro')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'pro' ? '2px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedTier === 'pro' ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'pro' ? '#38bdf8' : 'white' }}>Pro Titan ⭐</div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700' }}>Rp 49rb/bln</div>
                </div>

                {/* Enterprise 79k */}
                <div 
                  onClick={() => setSelectedTier('enterprise')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'enterprise' ? '2px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedTier === 'enterprise' ? 'rgba(192, 132, 252, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'enterprise' ? '#c084fc' : 'white' }}>Enterprise</div>
                  <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: '700' }}>Rp 79rb/bln</div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '0.95rem',
                background: selectedTier === 'free' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {selectedTier === 'free' ? 'Daftar & Mulai Gratis 🚀' : `Lanjut Pembayaran Promo (${getTierPriceText()}) →`}
            </button>
          </form>
        )}

        {/* FOOTER LINKS */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/tracking')} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} /> Cek Resi
          </button>
          <button onClick={() => navigate('/employee')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }}>
            Portal Karyawan →
          </button>
        </div>

      </div>

      {/* MODAL PEMBAYARAN REKENING PRIBADI */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            maxWidth: '500px', width: '100%', background: '#0b1120', borderRadius: '24px',
            border: '2px solid #0ea5e9', padding: '2.2rem', color: '#f8fafc', boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ background: 'rgba(14, 165, 233, 0.18)', color: '#38bdf8', padding: '4px 14px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: '800' }}>
                AKTIVASI {selectedTier === 'enterprise' ? 'PAKET ENTERPRISE' : 'PAKET PRO TITAN'}
              </span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginTop: '10px' }}>Instruksi Pembayaran Promo</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                Silakan transfer biaya promo sebesar <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>{getTierPriceText()}</strong> ke salah satu rekening resmi di bawah:
              </p>
            </div>

            {/* Detail Rekening Pribadi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
              {/* BRI */}
              <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Bank BRI</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', margin: '2px 0' }}>
                  2088-01007194505
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>

              {/* DANA */}
              <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>E-Wallet DANA</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#10b981', letterSpacing: '1px', margin: '2px 0' }}>
                  085382535050
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>
            </div>

            {/* Action Konfirmasi WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a 
                href={getWaUrl()}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', background: '#25D366', color: 'white',
                  fontWeight: '800', fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
                }}
              >
                Konfirmasi Otomatis via WhatsApp 💬
              </a>

              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  navigate('/admin');
                }}
                style={{
                  width: '100%', padding: '11px', borderRadius: '12px', background: 'transparent',
                  color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer', fontSize: '0.88rem'
                }}
              >
                Masuk ke Dashboard Dulu (Uji Coba)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
