import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { Store, LogIn, Search, CheckCircle, CreditCard, ShieldCheck, ArrowRight, Flame, UsersRound } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import UnitProLogo from '../components/UnitProLogo';

// ── VALIDASI FORMAT INPUT (sesuai jenis data masing-masing field) ──
// Kode Toko: huruf kapital, angka, strip (-), underscore (_) saja
const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
// Nama Toko: huruf, angka, spasi, dan tanda baca umum saja
const NAME_REGEX = /^[A-Za-z0-9À-ÿ .,'&()-]{2,80}$/;
// No. WhatsApp: angka saja, 9-15 digit
const PHONE_REGEX = /^[0-9]{9,15}$/;
// PIN: angka saja, 4-6 digit
const PIN_REGEX = /^[0-9]{4,6}$/;

export default function Login() {
  const isNativeApp = Capacitor.isNativePlatform();
  const location = useLocation();
  const initialTab = location.state?.tab || 'login'; // 'login' | 'register'
  const initialTier = location.state?.tier || 'pro'; // default Pro agar user selalu lihat payment
  const initialBilling = location.state?.billing || 'monthly'; // 'monthly' | 'yearly'
  const referralCode = new URLSearchParams(location.search).get('ref')?.trim().toUpperCase() || '';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [tenantCode, setTenantCode] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedTier, setSelectedTier] = useState(initialTier);
  const [billingCycle, setBillingCycle] = useState(initialBilling);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReg, setPendingReg] = useState(null); // simpan data sementara
  const [rememberStore, setRememberStore] = useState(true);
  const [recentStores, setRecentStores] = useState([]);

  const setTenant = useStore(state => state.setTenant);
  const navigate = useNavigate();

  // Load last logged-in store & recent stores list from localStorage
  useEffect(() => {
    try {
      const lastCode = localStorage.getItem('unitpro_last_tenant_code') || '';
      if (lastCode) {
        setTenantCode(lastCode);
      }
      const rawStores = localStorage.getItem('unitpro_recent_stores');
      if (rawStores) {
        setRecentStores(JSON.parse(rawStores));
      }
    } catch (e) {
      console.warn('Failed to load remembered stores', e);
    }
  }, []);

  const saveRememberedStore = (code, name) => {
    if (!rememberStore) return;
    try {
      localStorage.setItem('unitpro_last_tenant_code', code);
      const existing = localStorage.getItem('unitpro_recent_stores');
      let list = existing ? JSON.parse(existing) : [];
      list = list.filter((s) => s.code !== code);
      list.unshift({ code, name: name || code, time: Date.now() });
      if (list.length > 5) list = list.slice(0, 5);
      localStorage.setItem('unitpro_recent_stores', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save remembered store', e);
    }
  };

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
    if (!CODE_REGEX.test(code)) {
      setError('Format Kode Toko tidak valid (huruf, angka, - dan _ saja)');
      setLoading(false);
      return;
    }
    if (!PIN_REGEX.test(pin)) {
      setError('PIN harus berupa 4-6 digit angka');
      setLoading(false);
      return;
    }
    
    try {
      const res = await apiService.loginTenant(code, '', pin);
      const data = res.tenant || res;
      saveRememberedStore(data.code, data.name);
      setTenant(data.code, data.name, '', data.tier, res.token || `tenant_${data.code}`, data.phone, data.settings);
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

    const code = tenantCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    const name = tenantName.trim();
    const cleanPhone = phone.trim();

    if (!code || !name || !pin || !cleanPhone) {
      setError('Nama Toko, Kode ID, No. WhatsApp, dan PIN wajib diisi');
      return;
    }
    if (!NAME_REGEX.test(name)) {
      setError('Nama Toko tidak valid. Gunakan huruf, angka, dan spasi (2-80 karakter)');
      return;
    }
    if (!CODE_REGEX.test(code)) {
      setError('Kode ID Toko hanya boleh berisi huruf, angka, - dan _ (3-32 karakter)');
      return;
    }
    if (!PHONE_REGEX.test(cleanPhone)) {
      setError('No. WhatsApp hanya boleh berisi angka (9-15 digit), contoh: 081234567890');
      return;
    }
    if (!PIN_REGEX.test(pin)) {
      setError('PIN harus berupa 4-6 digit angka');
      return;
    }

    if (selectedTier === 'free') {
      // Paket gratis — langsung daftar dan masuk
      setLoading(true);
      try {
        const res = await apiService.loginTenant(code, name, pin, cleanPhone);
        const data = res.tenant || res;
        if (referralCode) {
          await apiService.attachAffiliateReferral(referralCode, data.code).catch((referralError) => {
            console.warn('Referral could not be attached:', referralError);
          });
        }
        setSuccessMsg('Akun Gratis berhasil dibuat! Mengalihkan ke Dashboard...');
        setTenant(data.code, data.name, '', 'free', res.token || `tenant_${data.code}`, cleanPhone, data.settings);
        setTimeout(() => { navigate('/admin'); }, 1500);
      } catch (err) {
        setError(err.message || 'Gagal mendaftar. Silakan gunakan Kode Toko lain.');
      } finally {
        setLoading(false);
      }
    } else {
      // Paket berbayar — tampilkan payment modal DULU, belum simpan ke DB
      // Simpan data form di pendingReg untuk diproses setelah konfirmasi
      setPendingReg({ code, name, pin, phone: cleanPhone, tier: selectedTier, billingCycle, referralCode });
      setShowPaymentModal(true);
    }
  };

  // Dipanggil setelah user klik tombol WA konfirmasi — baru simpan ke DB
  const handleConfirmPayment = async () => {
    if (!pendingReg) return;
    setLoading(true);
    try {
      const res = await apiService.loginTenant(pendingReg.code, pendingReg.name, pendingReg.pin, pendingReg.phone);
      const data = res.tenant || res;
      if (pendingReg.referralCode) {
        await apiService.attachAffiliateReferral(pendingReg.referralCode, data.code).catch((referralError) => {
          console.warn('Referral could not be attached:', referralError);
        });
      }
      setTenant(data.code, data.name, '', pendingReg.tier, res.token || `tenant_${data.code}`, pendingReg.phone, data.settings);
    } catch (err) {
      console.error('Register after payment confirm failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierPriceText = () => {
    const tier = pendingReg?.tier || selectedTier;
    const selectedBillingCycle = pendingReg?.billingCycle || billingCycle;
    const isYearly = selectedBillingCycle === 'yearly';
    if (tier === 'enterprise') return isYearly ? 'Rp 2.490.000' : 'Rp 249.000';
    if (tier === 'pro') return isYearly ? 'Rp 590.000 (Promo Tahun Pertama)' : 'Rp 99.000';
    return 'GRATIS';
  };

  const getTierTitle = () => {
    const tier = pendingReg?.tier || selectedTier;
    const selectedBillingCycle = pendingReg?.billingCycle || billingCycle;
    const isYearly = selectedBillingCycle === 'yearly';
    if (tier === 'enterprise') return isYearly ? 'Paket Multi Outlet Tahunan (Rp 2.490.000/tahun)' : 'Paket Multi Outlet (Rp 249.000/bln)';
    if (tier === 'pro') return isYearly ? 'UnitPro Pro Tahunan (Promo Rp 590.000 tahun pertama)' : 'UnitPro Pro (Rp 99.000/bln)';
    return 'Paket Gratis (Rp 0/selamanya)';
  };

  const getWaUrl = () => {
    const amount = getTierPriceText();
    const nama = pendingReg?.name || tenantName || tenantCode;
    const kode = pendingReg?.code || tenantCode.toUpperCase();
    const text = `Halo Admin UnitPro, saya ingin konfirmasi pembayaran aktivasi toko:%0A%0A%F0%9F%8F%AA *Nama Toko:* ${nama}%0A%F0%9F%94%91 *Kode ID:* ${kode}%0A%0A%F0%9F%93%B1 *No. WhatsApp:* ${phone}%0A%F0%9F%93%A6 *Paket:* ${getTierTitle()}%0A%F0%9F%92%B0 *Nominal Transfer:* ${amount}%0A%0ASaya telah melakukan transfer ke rekening BRI / DANA a%2Fn Syaifudin. Mohon segera diaktifkan akun saya. Terima kasih!`;
    return `https://wa.me/6285382535050?text=${text}`;
  };

  return (
    <div className="login-container native-login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9', padding: '2rem 1rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      
      {/* CARD CONTAINER */}
      <div className="native-login-card" style={{
        width: '100%', maxWidth: '480px', borderRadius: '24px', 
        background: '#ffffff', border: '1px solid #e2e8f0', 
        padding: '2.5rem 2rem', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)'
      }}>
        
        {/* Brand Header */}
        <div className="native-login-brand" style={{ textAlign: 'center', marginBottom: '1.8rem', cursor: 'pointer' }} onClick={() => navigate('/login')}>
          <div style={{ margin: '0 auto 8px auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <UnitProLogo variant="wordmark" size={56} height={56} width="auto" />
          </div>
          <p style={{ color: '#0284c7', fontSize: '0.88rem', fontWeight: '700', margin: '4px 0 0 0' }}>
            {isNativeApp ? 'Operasional Toko dalam Genggaman' : 'Sistem Operasional Toko Servis Modern'}
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

        {isNativeApp && (
          <button
            type="button"
            className="native-employee-entry"
            onClick={() => navigate('/employee')}
          >
            <span><UsersRound size={19} /></span>
            <div>
              <strong>Portal Karyawan</strong>
              <small>Masuk sebagai kasir atau teknisi dengan PIN</small>
            </div>
            <ArrowRight size={18} />
          </button>
        )}

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
                onChange={(e) => setTenantCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                maxLength={32}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
              {recentStores.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Toko Terakhir:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {recentStores.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setTenantCode(item.code)}
                        style={{
                          fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                          border: tenantCode === item.code ? '1px solid #0284c7' : '1px solid #e2e8f0',
                          background: tenantCode === item.code ? '#e0f2fe' : '#f1f5f9',
                          color: tenantCode === item.code ? '#0369a1' : '#475569', cursor: 'pointer'
                        }}
                      >
                        {item.name || item.code} ({item.code})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                PIN Keamanan Toko
              </label>
              <input 
                type="password" 
                placeholder="Masukkan PIN Anda" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required 
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <input
                type="checkbox"
                id="rememberStoreCheck"
                checked={rememberStore}
                onChange={(e) => setRememberStore(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="rememberStoreCheck" style={{ fontSize: '0.82rem', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>
                Ingat Kode Toko ini di perangkat ini
              </label>
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
                onChange={(e) => setTenantName(e.target.value.replace(/[^A-Za-z0-9À-ÿ .,'&()-]/g, ''))}
                maxLength={80}
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
                onChange={(e) => setTenantCode(e.target.value.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9_-]/g, ''))}
                maxLength={32}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                No. WhatsApp Aktif (Angka Saja)
              </label>
              <input 
                type="tel" 
                placeholder="Contoh: 081234567890" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
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
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required 
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Tier Selector — paket publik: Free, Pro, Enterprise. White Label lewat konsultasi partner. */}
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
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: selectedTier === 'free' ? '#059669' : '#0f172a' }}>Free</div>
                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>Rp 0</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>25 servis · 50 POS · 50 produk</div>
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
                  <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>
                    {billingCycle === 'yearly' ? 'Rp 590rb/thn' : 'Rp 99rb/bln'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>Unlimited · tim · WA/CRM</div>
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
                  <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700' }}>{billingCycle === 'yearly' ? 'Rp 2,49jt/thn' : 'Rp 249rb/bln'}</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px', lineHeight: 1.25 }}>Multi outlet · 5 cabang</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', padding: '12px', borderRadius: '12px', background: selectedTier === 'free' ? '#ecfdf5' : selectedTier === 'pro' ? '#eff6ff' : '#f5f3ff', border: selectedTier === 'free' ? '1px solid #a7f3d0' : selectedTier === 'pro' ? '1px solid #bfdbfe' : '1px solid #ddd6fe' }}>
                <div style={{ fontWeight: '900', fontSize: '0.82rem', color: '#0f172a', marginBottom: '6px' }}>
                  {selectedTier === 'free' ? 'Free cocok untuk coba dulu' : selectedTier === 'pro' ? 'Pro untuk toko servis aktif' : 'Enterprise untuk banyak outlet'}
                </div>
                <div style={{ color: '#475569', fontSize: '0.76rem', lineHeight: 1.55, fontWeight: '650' }}>
                  {selectedTier === 'free' && 'Batas 25 servis/bulan, 50 transaksi POS/bulan, 50 produk, tanpa akun karyawan/teknisi, tanpa WA Marketing, tanpa export Excel.'}
                  {selectedTier === 'pro' && 'Servis, POS, dan produk unlimited. Tim teknisi aktif, WhatsApp pelanggan/CRM, katalog, laporan owner, dan export Excel aktif.'}
                  {selectedTier === 'enterprise' && 'Untuk multi outlet: hingga 5 cabang, 50 karyawan, laporan cabang, dan prioritas setup.'}
                </div>
                <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.72rem', lineHeight: 1.45 }}>
                  White Label / aplikasi brand sendiri tidak tersedia di pendaftaran umum. Hubungi Partner UnitPro untuk konsultasi khusus.
                </div>
              </div>
            </div>

            {selectedTier !== 'free' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                  Periode Pembayaran
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#f8fafc' }}>
                  <button type="button" onClick={() => setBillingCycle('monthly')} style={{ padding: '9px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: billingCycle === 'monthly' ? '#0284c7' : 'transparent', color: billingCycle === 'monthly' ? 'white' : '#475569', fontWeight: '800', fontSize: '0.82rem' }}>Bulanan</button>
                  <button type="button" onClick={() => setBillingCycle('yearly')} style={{ padding: '9px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: billingCycle === 'yearly' ? '#0284c7' : 'transparent', color: billingCycle === 'yearly' ? 'white' : '#475569', fontWeight: '800', fontSize: '0.82rem' }}>Tahunan</button>
                </div>
              </div>
            )}

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
        <div className="native-login-footer" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/tracking')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <Search size={14} /> Cek Resi
          </button>
          <button onClick={() => navigate('/employee')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
            Portal Tim →
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
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#854d0e', fontWeight: '600', textAlign: 'center' }}>
                ⚠️ Transfer dulu, lalu klik tombol di bawah untuk kirim konfirmasi ke Admin. Akun akan diaktifkan dalam 1–5 menit.
              </div>
              <a 
                href={getWaUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={handleConfirmPayment}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', background: '#25D366', color: 'white',
                  fontWeight: '800', fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)', boxSizing: 'border-box'
                }}
              >
                💬 Konfirmasi Pembayaran via WhatsApp
              </a>
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                Setelah klik tombol di atas, Admin akan aktifkan akun Anda segera.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
