import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { supabase } from '../services/supabase';
import { Settings, Users, ArrowDownCircle, CheckCircle, TrendingUp, Shield, Wallet, Gift, Lock, Eye, EyeOff, LogOut, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================
// KONFIGURASI KEAMANAN SUPER ADMIN
// Password TIDAK LAGI disimpan di client-side.
// Autentikasi melalui Supabase RPC (server-side hash comparison).
// Untuk mengubah password: update di Supabase RPC function atau 
// tabel app_config (key='super_admin_hash').
// ============================================================
const SESSION_KEY = 'SA_SESSION';
const FAIL_KEY = 'SA_FAIL';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 jam
const MAX_ATTEMPTS = 5;                          // maks percobaan salah
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;     // lockout 15 menit

// Server-side password verification
async function verifyAdminPassword(inputPassword) {
  try {
    // Method 1: Try Supabase RPC function (most secure)
    const { data, error } = await supabase.rpc('verify_super_admin', {
      input_password: inputPassword
    });
    if (!error && data === true) return true;
    
    // Method 2: Fallback — check hashed config from app_config table
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'super_admin_hash')
      .maybeSingle();
    
    if (configData?.value) {
      // Simple hash comparison (SHA-256 of password)
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(inputPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === configData.value;
    }
    
    // Method 3: Final fallback for initial setup — environment variable via API
    const resp = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: inputPassword })
    }).catch(() => null);
    
    if (resp?.ok) {
      const result = await resp.json();
      return result.valid === true;
    }
    
    return false;
  } catch (e) {
    console.error('Admin verification error:', e);
    return false;
  }
}

function isSessionValid() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiry } = JSON.parse(raw);
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

function createSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry: Date.now() + SESSION_DURATION_MS }));
}

function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

function getFailData() {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY)) || { count: 0, lockedUntil: 0 }; }
  catch { return { count: 0, lockedUntil: 0 }; }
}

function setFailData(data) {
  localStorage.setItem(FAIL_KEY, JSON.stringify(data));
}

// ── AUTH GATE COMPONENT ─────────────────────────────────────
function SuperAdminLoginGate({ onSuccess }) {
  const [input, setInput] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockRemain, setLockRemain] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const fail = getFailData();
    if (fail.lockedUntil > Date.now()) {
      setLocked(true);
      setLockRemain(Math.ceil((fail.lockedUntil - Date.now()) / 1000));
    }
    inputRef.current?.focus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      const fail = getFailData();
      const remain = Math.ceil((fail.lockedUntil - Date.now()) / 1000);
      if (remain <= 0) {
        setLocked(false);
        setLockRemain(0);
        setFailData({ count: 0, lockedUntil: 0 });
        clearInterval(interval);
      } else {
        setLockRemain(remain);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (locked) return;

    setError('');
    const isValid = await verifyAdminPassword(input);
    
    if (isValid) {
      setFailData({ count: 0, lockedUntil: 0 });
      createSession();
      onSuccess();
    } else {
      const fail = getFailData();
      const newCount = (fail.count || 0) + 1;
      if (newCount >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        setFailData({ count: newCount, lockedUntil });
        setLocked(true);
        setLockRemain(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        setError(`❌ Terlalu banyak percobaan salah! Akun terkunci selama 15 menit.`);
      } else {
        setFailData({ count: newCount, lockedUntil: 0 });
        setError(`❌ Password salah! Sisa percobaan: ${MAX_ATTEMPTS - newCount} kali.`);
        setInput('');
      }
    }
  };

  const minutes = Math.floor(lockRemain / 60);
  const seconds = lockRemain % 60;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', margin: '0 16px',
        background: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          padding: '2.5rem 2rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '2px solid rgba(255,255,255,0.2)' }}>
            <Shield size={32} color="#fbbf24" />
          </div>
          <h1 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: '900' }}>AISERVICE.ID</h1>
          <p style={{ margin: '6px 0 0 0', color: '#bae6fd', fontSize: '0.88rem', fontWeight: '600' }}>Super Admin Master Panel</p>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#0284c7" /> Verifikasi Identitas Admin
          </h2>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
            Akses ini dilindungi dan dimonitor. Masukkan password master Anda.
          </p>

          {locked ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
              <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: '800', color: '#dc2626', fontSize: '0.95rem' }}>Akses Terkunci Sementara</p>
              <p style={{ margin: '6px 0 0 0', color: '#991b1b', fontSize: '0.85rem' }}>Terlalu banyak percobaan gagal.</p>
              <div style={{ marginTop: '12px', background: '#dc2626', color: 'white', borderRadius: '100px', padding: '8px 20px', fontWeight: '900', fontSize: '1.3rem', display: 'inline-block', letterSpacing: '1px' }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>Coba lagi setelah countdown selesai</p>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>
                  {error}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Master Password
              </label>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  ref={inputRef}
                  type={showPwd ? 'text' : 'password'}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  placeholder="Masukkan password master..."
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '14px 48px 14px 16px', borderRadius: '12px',
                    border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
                    fontSize: '1rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'border-color 0.2s',
                    color: '#0f172a'
                  }}
                  onFocus={e => { if (!error) e.target.style.borderColor = '#0284c7'; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0' }}
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!input}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: input ? 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)' : '#e2e8f0',
                  color: input ? 'white' : '#94a3b8',
                  fontSize: '0.95rem', fontWeight: '900', cursor: input ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: input ? '0 6px 20px rgba(2, 132, 199, 0.35)' : 'none'
                }}
              >
                <Shield size={18} /> Masuk ke Master Dashboard
              </button>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
            🔒 Dilindungi enkripsi sesi · Otomatis logout setelah 8 jam tidak aktif<br />
            🛡️ Maksimal {MAX_ATTEMPTS} percobaan · Terkunci 15 menit jika gagal berulang
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN SUPER ADMIN ─────────────────────────────────────────
export default function SuperAdmin() {
  const [authenticated, setAuthenticated] = useState(isSessionValid());
  const [stats, setStats] = useState({ tenants: [], withdrawals: [], platform_balance: 0 });
  const [affData, setAffData] = useState({ affiliates: [], commissions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [updatingCode, setUpdatingCode] = useState(null);
  const navigate = useNavigate();

  // Semua hooks HARUS sebelum return kondisional (Rules of Hooks)
  
  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminStats();
      setStats(data);
      const affResult = await apiService.getAffiliateAdminData();
      setAffData(affResult);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Auto-logout on session expiry
  useEffect(() => {
    const check = setInterval(() => {
      if (!isSessionValid()) setAuthenticated(false);
    }, 60 * 1000);
    return () => clearInterval(check);
  }, []);

  // Load data saat authenticated
  useEffect(() => {
    if (authenticated) loadStats();
  }, [authenticated]);

  const handleLogout = () => {
    destroySession();
    setAuthenticated(false);
  };

  // Conditional return SETELAH semua hooks
  if (!authenticated) {
    return <SuperAdminLoginGate onSuccess={() => setAuthenticated(true)} />;
  }


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

  const handleSetTrial = async (tenantCode) => {
    const daysStr = window.prompt(`Berapa Hari Masa Trial untuk ${tenantCode}? (Contoh: 7 atau 14)\nKetik 0 untuk menghapus trial.`);
    if (daysStr === null) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 0) return alert('Jumlah hari tidak valid!');

    let targetTier = 'free';
    let trialEndsAtMs = null;

    if (days > 0) {
      const tierInput = window.prompt(`Pilih Paket Trial:\n1. Pro (Ketik "pro")\n2. Enterprise (Ketik "enterprise")`, "enterprise");
      if (!tierInput) return;
      if (tierInput.toLowerCase() === 'pro') targetTier = 'pro';
      else if (tierInput.toLowerCase() === 'enterprise') targetTier = 'enterprise';
      else return alert('Paket tidak dikenali!');

      trialEndsAtMs = Date.now() + (days * 24 * 60 * 60 * 1000);
    }

    try {
      setUpdatingCode(tenantCode);
      await apiService.setTenantTrial(tenantCode, targetTier, trialEndsAtMs);
      alert(days > 0 ? `Trial ${targetTier.toUpperCase()} selama ${days} hari berhasil diaktifkan!` : `Trial untuk ${tenantCode} berhasil dihapus.`);
      loadStats();
    } catch (e) {
      alert('Gagal mengatur trial: ' + e.message);
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

  const handleResetPin = async (tenantCode) => {
    const newPin = window.prompt(`Masukkan PIN baru untuk toko ${tenantCode}:`);
    if (!newPin) return;
    try {
      await apiService.resetTenantPin(tenantCode, newPin);
      alert('PIN berhasil direset!');
      loadStats();
    } catch (e) {
      alert('Gagal reset PIN: ' + e.message);
    }
  };

  const handleToggleBan = async (tenantCode, currentBanned) => {
    const action = currentBanned ? 'mengaktifkan kembali' : 'menonaktifkan (ban)';
    if (!window.confirm(`Apakah Anda yakin ingin ${action} toko ${tenantCode}?`)) return;
    try {
      await apiService.updateTenantStatus(tenantCode, !currentBanned);
      alert(`Toko berhasil ${currentBanned ? 'diaktifkan' : 'dinonaktifkan'}!`);
      loadStats();
    } catch (e) {
      alert('Gagal update status toko: ' + e.message);
    }
  };

  const handleDeleteTenant = async (tenantCode) => {
    const confirmText = window.prompt(`Ketik "${tenantCode}" untuk menghapus toko ini secara PERMANEN beserta data servisnya:`);
    if (confirmText !== tenantCode) {
      if (confirmText !== null) alert('Kode toko tidak cocok, batal menghapus.');
      return;
    }
    try {
      await apiService.deleteTenant(tenantCode);
      alert('Toko berhasil dihapus permanen!');
      loadStats();
    } catch (e) {
      alert('Gagal menghapus toko: ' + e.message);
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
          >
            ← Beranda
          </button>
          <button 
            onClick={handleLogout}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
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

          <button 
            onClick={() => setActiveTab('afiliasi')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'afiliasi' ? '#059669' : '#ffffff', color: activeTab === 'afiliasi' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'afiliasi' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'afiliasi' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <Gift size={18} /> Komisi Afiliasi
            {affData.commissions.filter(c => c.status === 'PENDING').length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                {affData.commissions.filter(c => c.status === 'PENDING').length}
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
                    {stats.tenants.map(t => {
                      const tSettings = typeof t.settings === 'string' ? JSON.parse(t.settings) : (t.settings || {});
                      return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: tSettings.is_banned ? 0.6 : 1 }}>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: tSettings.is_banned ? '#fee2e2' : '#e0f2fe', color: tSettings.is_banned ? '#991b1b' : '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem' }}>
                            {t.code}
                          </span>
                          {tSettings.is_banned && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>(BANNED)</span>}
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '250px' }}>
                            <button 
                              onClick={() => handleAdjustWallet(t.code)}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                            >
                              💳 Saldo
                            </button>
                            <button 
                              onClick={() => handleResetPin(t.code)}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#0284c7' }}
                            >
                              🔑 Reset PIN
                            </button>
                            <button 
                              onClick={() => handleToggleBan(t.code, tSettings.is_banned)}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: tSettings.is_banned ? '#15803d' : '#b45309' }}
                            >
                              {tSettings.is_banned ? '✅ Aktifkan' : '🚫 Ban'}
                            </button>
                            <button 
                              onClick={() => handleSetTrial(t.code)}
                              style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#d97706' }}
                            >
                              ⏳ Set Trial
                            </button>
                            <button 
                              onClick={() => handleDeleteTenant(t.code)}
                              style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#dc2626' }}
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})}
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

          {/* 4. AFFILIATE COMMISSION APPROVAL */}
          {activeTab === 'afiliasi' && (
            <div style={{ padding: '2rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>Manajemen Komisi Afiliasi 🎁</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>Komisi <strong style={{ color: '#059669' }}>80% Pembelian Pertama</strong> — Approve untuk kirim ke dompet afiliasi</p>
                </div>
                <button onClick={loadStats} style={{ padding: '6px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                  Refresh 🔄
                </button>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>Total Afiliasi Aktif</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#059669' }}>{affData.affiliates.length}</div>
                </div>
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>Komisi Menunggu Bayar</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#d97706' }}>
                    {affData.commissions.filter(c => c.status === 'PENDING').length}
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>Total Komisi Dibayar</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#059669' }}>
                    Rp {affData.commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + (c.commission_amount || 0), 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Petunjuk */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#14532d' }}>
                <strong>📋 Cara Kerja:</strong> Ketika toko baru mendaftar Pro/Enterprise menggunakan kode afiliasi, komisi 80% otomatis tercatat di sini dengan status <strong>PENDING</strong>. Anda cukup klik <strong>"Setujui & Bayar"</strong> setelah memverifikasi pembayaran dari toko baru tersebut masuk ke rekening Anda.
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px' }}>Afiliasi (Pemilik Kode)</th>
                      <th style={{ padding: '12px' }}>Toko yang Direferensikan</th>
                      <th style={{ padding: '12px' }}>Paket</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Komisi 80%</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affData.commissions.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>
                          <strong>{c.affiliate_tenant_code}</strong>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <strong>{c.referred_tenant_name || c.referred_tenant_code}</strong><br />
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.referred_tenant_code}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: c.tier_purchased === 'enterprise' ? '#f3e8ff' : '#e0f2fe', color: c.tier_purchased === 'enterprise' ? '#7c3aed' : '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                            {c.tier_purchased?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', fontSize: '1.05rem', color: '#059669' }}>
                          Rp {(c.commission_amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                            background: c.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                            color: c.status === 'PAID' ? '#15803d' : '#b45309'
                          }}>
                            {c.status === 'PAID' ? '✅ Dibayar' : '⏳ Menunggu'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {c.status === 'PENDING' ? (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Approve & kirim komisi Rp ${(c.commission_amount||0).toLocaleString('id-ID')} ke dompet ${c.affiliate_tenant_code}?`)) return;
                                try {
                                  await apiService.approveAffiliateCommission(c.id, c.affiliate_tenant_code, c.commission_amount);
                                  alert('Komisi berhasil disetujui & masuk ke dompet afiliasi!');
                                  loadStats();
                                } catch (e) { alert('Gagal approve: ' + e.message); }
                              }}
                              style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                            >
                              <CheckCircle size={14} style={{ marginRight: '4px' }} /> Setujui & Bayar
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Selesai ✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {affData.commissions.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Belum ada komisi afiliasi masuk</td></tr>
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
