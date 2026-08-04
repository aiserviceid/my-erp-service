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

      if (selectedTier === 'free') {
        // Paket gratis — langsung masuk, tidak perlu bayar
        setSuccessMsg('Akun Gratis berhasil dibuat! Mengalihkan ke Dashboard...');
        setTenant(data.code, data.name, '', 'free', res.token || `tenant_${data.code}`);
        setTimeout(() => { navigate('/admin'); }, 1500);
      } else {
        // Paket berbayar (Pro / Enterprise) — wajib tampil modal pembayaran dulu
        setShowPaymentModal(true);
        setTenant(data.code, data.name, '', selectedTier, res.token || `tenant_${data.code}`);
      }
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Silakan gunakan Kode Toko lain.');
    } finally {
      setLoading(false);
    }
  };

  const getTierPriceText = () => {
    if (selectedTier === 'enterprise') return 'Rp 299.000';
    if (selectedTier === 'pro') return 'Rp 149.000';
    return 'GRATIS';
  };

  const getTierTitle = () => {
    if (selectedTier === 'enterprise') return 'Paket Enterprise (Rp 299.000/bln)';
    if (selectedTier === 'pro') return 'Paket Pro (Rp 149.000/bln)';
    return 'Paket Gratis (Rp 0/selamanya)';
  };

  const getWaUrl = () => {
    const amount = getTierPriceText();
    const text = `Halo Admin AISERVICE, saya ingin konfirmasi pembayaran aktivasi toko:%0A%0A🏪 *Nama Toko:* ${tenantName || tenantCode}%0A🔑 *Kode ID:* ${tenantCode.toUpperCase()}%0A📱 *No. WhatsApp:* ${phone}%0A📦 *Paket:* ${getTierTitle()}%0A💰 *Nominal Transfer:* ${amount}%0A%0ASaya telah melakukan transfer ke rekening BRI / DANA a/n Syaifudin. Mohon segera diaktifkan akun saya. Terima kasih!`;
    return `https://wa.me/6285382535050?text=${text}`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9', padding: '2rem 1rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      
      {/* CARD CONTAINER */}
      <div style={{ 
        width: '100%', maxWidth: '480px', borderRadius: '24px', 
        background: '#ffffff', border: '1px solid #e2e8f0', 
        padding: '2.5rem 2rem', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ 
            width: '46px', height: '46px', margin: '0 auto 12px auto',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', 
            borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(2, 132, 199, 0.3)'
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>
            AISERVICE.ID
          </h2>
          <p style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: '700', margin: '4px 0 0 0' }}>
            Sistem Operasional Toko Servis Modern
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '1.8rem', border: '1px solid #e2e8f0' }}>
          <button 
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'login' ? '#0284c7' : 'transparent', color: activeTab === 'login' ? 'white' : '#64748b',
              transition: 'all 0.2s', boxShadow: activeTab === 'login' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
            }}
          >
            Masuk Toko
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'register' ? '#0284c7' : 'transparent', color: activeTab === 'register' ? 'white' : '#64748b',
              transition: 'all 0.2s', boxShadow: activeTab === 'register' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
            }}
          >
            Daftar Toko Baru
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            {successMsg}
          </div>
        )}

        {/* 1. FORM LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Kode ID Toko
              </label>
              <input 
                type="text" 
                placeholder="Contoh: TOKO-SERVIS" 
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                PIN Keamanan Toko
              </label>
              <input 
                type="password" 
                placeholder="Masukkan PIN Anda" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '1rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '1rem'
              }}
            >
              <LogIn size={18} /> {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>

            {/* QUICK DEMO LOGIN BUTTON */}
            <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px' }}>
                Ingin langsung mencoba tanpa membuat akun baru?
              </div>
              <button
                type="button"
                onClick={() => {
                  setTenant('DEMO-STORE', 'Toko Servis Laptop & PC (Demo)', '', 'pro', 'token_demo_123');
                  useStore.getState().updateTenantSettings({
                    storeName: 'Toko Servis Laptop & PC (Demo)',
                    store_wa: '081234567890',
                    theme: 'laptop'
                  });
                  navigate('/admin');
                }}
                style={{
                  width: '100%', padding: '11px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  color: '#15803d', border: '1px solid #86efac', fontWeight: '800',
                  fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
                }}
              >
                ✨ Coba Akun Demo Instan (1-Klik) 🚀
              </button>
            </div>
          </form>
        )}

        {/* 2. FORM REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Nama Bengkel / Toko
              </label>
              <input 
                type="text" 
                placeholder="Contoh: iPud Smartphone & Bengkel" 
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Kode ID Toko (Huruf & Angka)
              </label>
              <input 
                type="text" 
                placeholder="Contoh: IPUD-SERVICE" 
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                No. WhatsApp Aktif
              </label>
              <input 
                type="tel" 
                placeholder="Contoh: 081234567890" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Buat PIN Keamanan (4-6 Digit)
              </label>
              <input 
                type="password" 
                placeholder="PIN untuk login admin" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Tier Selector — 3 paket: Free, Pro, Enterprise */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                Pilihan Paket Berlangganan
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {/* Free */}
                <div 
                  onClick={() => setSelectedTier('free')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'free' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: selectedTier === 'free' ? '#ecfdf5' : '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'free' ? '#059669' : '#0f172a' }}>Gratis</div>
                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>Rp 0</div>
                </div>

                {/* Pro 149k */}
                <div 
                  onClick={() => setSelectedTier('pro')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'pro' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: selectedTier === 'pro' ? '#e0f2fe' : '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'pro' ? '#0284c7' : '#0f172a' }}>Pro ⭐</div>
                  <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>Rp 149rb/bln</div>
                </div>

                {/* Enterprise 299k */}
                <div 
                  onClick={() => setSelectedTier('enterprise')}
                  style={{
                    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: selectedTier === 'enterprise' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: selectedTier === 'enterprise' ? '#f3e8ff' : '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'enterprise' ? '#7c3aed' : '#0f172a' }}>Enterprise</div>
                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700' }}>Rp 299rb/bln</div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '0.95rem',
                background: selectedTier === 'free'
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {loading ? 'Memproses...' : selectedTier === 'free' ? 'Daftar Gratis Sekarang →' : `Lanjut Bayar & Aktifkan (${getTierPriceText()}) 🚀`}
            </button>
          </form>
        )}

        {/* FOOTER LINKS */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/tracking')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <Search size={14} /> Cek Resi
          </button>
          <button onClick={() => navigate('/employee')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
            Portal Karyawan →
          </button>
        </div>

      </div>

      {/* MODAL PEMBAYARAN REKENING PRIBADI */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            maxWidth: '500px', width: '100%', background: '#ffffff', borderRadius: '24px',
            border: '1px solid #e2e8f0', padding: '2.2rem', color: '#0f172a', boxShadow: '0 25px 60px rgba(0,0,0,0.18)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 14px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: '800' }}>
                AKTIVASI {selectedTier === 'enterprise' ? 'PAKET ENTERPRISE' : 'PAKET PRO TITAN'}
              </span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginTop: '10px', color: '#0f172a' }}>Instruksi Pembayaran Promo</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                Silakan transfer biaya promo sebesar <strong style={{ color: '#0284c7', fontSize: '1.1rem' }}>{getTierPriceText()}</strong> ke salah satu rekening resmi di bawah:
              </p>
            </div>

            {/* Detail Rekening Pribadi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
              {/* BRI */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Bank BRI</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0284c7', letterSpacing: '1px', margin: '2px 0' }}>
                  2088-01007194505
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
              </div>

              {/* DANA */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>E-Wallet DANA</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#059669', letterSpacing: '1px', margin: '2px 0' }}>
                  085382535050
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>Atas Nama: <strong>SYAIFUDIN</strong></div>
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
                  justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
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
                  color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600'
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
