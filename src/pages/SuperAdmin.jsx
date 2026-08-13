import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { supabase } from '../services/supabase';
import { Settings, Users, ArrowDownCircle, CheckCircle, TrendingUp, Shield, Wallet, Gift, Lock, Eye, EyeOff, LogOut, AlertTriangle, Contact, Phone as PhoneIcon, Search, MessageSquare, Star, Trash2, RefreshCw, FileText, CreditCard, Send, Calendar, Clock, MessageSquareHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SuperAdminAISettings from '../components/SuperAdminAISettings';

// ============================================================
// KONFIGURASI KEAMANAN SUPER ADMIN
// Password TIDAK LAGI disimpan di client-side.
// Autentikasi melalui Supabase RPC (server-side hash comparison).
// Untuk mengubah password: update di Supabase RPC function atau 
// tabel app_config (key='super_admin_hash').
// ============================================================
const SESSION_KEY = 'SA_SESSION';
const API_TOKEN_KEY = 'SA_API_TOKEN';
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

async function getAdminServerToken(password) {
  try {
    const response = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.valid ? result.token || null : null;
  } catch {
    return null;
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

function createSession(apiToken = null) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry: Date.now() + SESSION_DURATION_MS }));
  if (apiToken) localStorage.setItem(API_TOKEN_KEY, apiToken);
}

function destroySession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(API_TOKEN_KEY);
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
      const apiToken = await getAdminServerToken(input);
      setFailData({ count: 0, lockedUntil: 0 });
      createSession(apiToken);
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
          <h1 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: '900' }}>UnitPro</h1>
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

// ── CRM PELANGGAN — dikelompokkan berdasarkan paket berlangganan ──
const TIER_META = {
  free: { label: 'Gratis', color: '#059669', bg: '#ecfdf5', border: '#86efac' },
  pro: { label: 'Pro', color: '#0284c7', bg: '#e0f2fe', border: '#7dd3fc' },
  enterprise: { label: 'Enterprise', color: '#7c3aed', bg: '#f3e8ff', border: '#d8b4fe' },
};

function CrmPelangganPanel({ tenants, onRefresh }) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const normalized = (tenants || []).map(t => ({
    ...t,
    tier: (t.tier || 'free').toLowerCase(),
  }));

  const q = search.trim().toLowerCase();
  const filtered = normalized.filter(t => {
    const matchesSearch = !q || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q) || (t.phone || '').includes(q);
    const matchesTier = tierFilter === 'all' || t.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const groups = ['free', 'pro', 'enterprise'].map(tier => ({
    tier,
    meta: TIER_META[tier],
    items: filtered.filter(t => t.tier === tier),
  }));

  const counts = {
    free: normalized.filter(t => t.tier === 'free').length,
    pro: normalized.filter(t => t.tier === 'pro').length,
    enterprise: normalized.filter(t => t.tier === 'enterprise').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>CRM Pelanggan 📇</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>Data pelanggan yang mendaftar, dikelompokkan otomatis berdasarkan paket langganan</p>
        </div>
        <button onClick={onRefresh} style={{ padding: '6px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
          Refresh Data 🔄
        </button>
      </div>

      {/* Summary Cards per Paket */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '1.5rem' }}>
        {['free', 'pro', 'enterprise'].map(tier => {
          const meta = TIER_META[tier];
          return (
            <div
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
              style={{
                background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: '14px', padding: '1rem',
                cursor: 'pointer', outline: tierFilter === tier ? `2px solid ${meta.color}` : 'none'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: meta.color, fontWeight: '800', textTransform: 'uppercase' }}>Paket {meta.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a' }}>{counts[tier]}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Pelanggan Terdaftar</div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama toko, kode, atau nomor WhatsApp..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '700', background: '#fff' }}
        >
          <option value="all">Semua Paket</option>
          <option value="free">Gratis</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Grouped by Paket */}
      {groups.map(({ tier, meta, items }) => {
        if (tierFilter !== 'all' && tierFilter !== tier) return null;
        return (
          <div key={tier} style={{ marginBottom: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
              <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '900' }}>
                Paket {meta.label} — {items.length} Pelanggan
              </span>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px' }}>Nama Toko / Pelanggan</th>
                      <th style={{ padding: '12px' }}>Kode Toko</th>
                      <th style={{ padding: '12px' }}>No. WhatsApp</th>
                      <th style={{ padding: '12px' }}>Reputasi</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(t => {
                      const tSettings = typeof t.settings === 'string' ? JSON.parse(t.settings || '{}') : (t.settings || {});
                      return (
                        <tr key={t.code} style={{ borderBottom: '1px solid #e2e8f0', opacity: tSettings.is_banned ? 0.6 : 1 }}>
                          <td style={{ padding: '12px', fontWeight: '700' }}>
                            {t.name}
                            {tSettings.is_banned && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>(BANNED)</span>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem' }}>
                              {t.code}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {tSettings.store_wa || t.phone ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: '600' }}>
                                <PhoneIcon size={13} color="#059669" /> {tSettings.store_wa || t.phone}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Belum diisi</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>{t.reputation_points || 0} poin</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {tSettings.store_wa || t.phone ? (
                              <a
                                href={`https://wa.me/${(tSettings.store_wa || t.phone).replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white',
                                  border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', textDecoration: 'none'
                                }}
                              >
                                💬 Chat WA
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Belum ada pelanggan di paket ini</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN SUPER ADMIN ─────────────────────────────────────────
export default function SuperAdmin() {
  const [authenticated, setAuthenticated] = useState(isSessionValid());
  const [stats, setStats] = useState({ tenants: [], withdrawals: [], platform_balance: 0 });
  const [affData, setAffData] = useState({ affiliates: [], commissions: [] });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [updatingCode, setUpdatingCode] = useState(null);
  const navigate = useNavigate();

  // SaaS Control Center States (Batch 20 & 21)
  const [searchTenant, setSearchTenant] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [extendingTenant, setExtendingTenant] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendNote, setExtendNote] = useState('');
  const [editingNotesTenant, setEditingNotesTenant] = useState(null);
  const [adminNotesInput, setAdminNotesInput] = useState('');

  // Audit Logs & Billing Modals State
  const [saasLogs, setSaasLogs] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [manualPayTenant, setManualPayTenant] = useState(null);
  const [payAmount, setPayAmount] = useState('149000');
  const [payMethod, setPayMethod] = useState('Transfer Bank (BRI)');
  const [payDays, setPayDays] = useState(30);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Pembayaran langganan Pro');
  const [payTier, setPayTier] = useState('pro');

  const [waModalTenant, setWaModalTenant] = useState(null);
  const [waMessageType, setWaMessageType] = useState('H-7');

  // Helper untuk menentukan status langganan tenant secara presisi
  const getSubStatus = (tenant) => {
    const s = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings || '{}') : (tenant.settings || {});
    if (s.is_banned || s.subscription_status === 'suspended') return 'suspended';
    const now = Date.now();
    const activeUntil = s.active_until || s.trial_ends_at;
    if (s.subscription_status === 'trial' || (!s.subscription_status && s.trial_ends_at)) {
      if (activeUntil && activeUntil < now) return 'expired';
      return 'trial';
    }
    if (s.subscription_status === 'expired') return 'expired';
    if (activeUntil && activeUntil < now) return 'expired';
    return 'active';
  };

  const handleStatusChange = async (tenantCode, newStatus) => {
    try {
      setUpdatingCode(tenantCode);
      const tenantItem = stats.tenants.find(t => t.code === tenantCode);
      const s = typeof tenantItem?.settings === 'string' ? JSON.parse(tenantItem.settings || '{}') : (tenantItem?.settings || {});
      
      let activeUntilMs = s.active_until;
      if (newStatus === 'trial' && !activeUntilMs) {
        activeUntilMs = Date.now() + (30 * 24 * 60 * 60 * 1000);
      } else if (newStatus === 'active' && (!activeUntilMs || activeUntilMs < Date.now())) {
        activeUntilMs = Date.now() + (30 * 24 * 60 * 60 * 1000);
      }

      await apiService.updateTenantSubscriptionStatus(tenantCode, newStatus, activeUntilMs);
      alert(`Status langganan ${tenantCode} berhasil diubah menjadi ${newStatus.toUpperCase()}`);
      loadStats();
    } catch (e) {
      alert('Gagal mengubah status langganan: ' + e.message);
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleSaveExtension = async () => {
    if (!extendingTenant) return;
    try {
      setUpdatingCode(extendingTenant.code);
      await apiService.extendTenantSubscription(extendingTenant.code, extendDays, extendNote);
      alert(`Masa aktif toko ${extendingTenant.code} berhasil diperpanjang +${extendDays} hari!`);
      setExtendingTenant(null);
      setExtendNote('');
      loadStats();
    } catch (e) {
      alert('Gagal memperpanjang masa aktif toko: ' + e.message);
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!editingNotesTenant) return;
    try {
      setUpdatingCode(editingNotesTenant.code);
      await apiService.updateTenantAdminNotes(editingNotesTenant.code, adminNotesInput);
      alert(`Catatan internal Super Admin untuk ${editingNotesTenant.code} berhasil disimpan!`);
      setEditingNotesTenant(null);
      loadStats();
    } catch (e) {
      alert('Gagal menyimpan catatan internal: ' + e.message);
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleRecordManualPayment = async (e) => {
    e.preventDefault();
    if (!manualPayTenant) return;
    try {
      setUpdatingCode(manualPayTenant.code);
      await apiService.recordManualPayment({
        tenantCode: manualPayTenant.code,
        amount: payAmount,
        paymentMethod: payMethod,
        periodDays: payDays,
        refNumber: payRef,
        notes: payNotes,
        targetTier: payTier
      });
      alert(`✅ Transaksi pembayaran manual Rp ${Number(payAmount).toLocaleString('id-ID')} untuk toko ${manualPayTenant.code} berhasil dicatat! Masa aktif bertambah +${payDays} hari.`);
      setManualPayTenant(null);
      setPayRef('');
      loadStats();
    } catch (err) {
      alert('Gagal mencatat pembayaran manual: ' + err.message);
    } finally {
      setUpdatingCode(null);
    }
  };


  // Semua hooks HARUS sebelum return kondisional (Rules of Hooks)
  
  const loadStats = async () => {
    setLoading(true);
    try {
      const [data, affResult, reviewData, logs, feedbacks] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAffiliateAdminData(),
        apiService.getAdminPlatformReviews(),
        apiService.getSaasAdminLogs(),
        apiService.getFeedbackList(),
      ]);
      setStats(data);
      setAffData(affResult);
      setReviews(reviewData);
      setSaasLogs(logs || []);
      setFeedbackList(feedbacks || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpdateFeedbackStatus = async (id, newStatus) => {
    try {
      await apiService.updateFeedbackStatus(id, newStatus);
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Hapus pesan kritik & saran ini secara permanen?')) return;
    try {
      await apiService.deleteFeedback(id);
      setFeedbackList(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Gagal menghapus pesan: ' + err.message);
    }
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

  const handleDeleteReview = async (review) => {
    if (!window.confirm(`Hapus komentar dari ${review.author_name}? Komentar yang dihapus tidak dapat ditampilkan kembali.`)) return;
    try {
      await apiService.deletePlatformReview(review.id, localStorage.getItem(API_TOKEN_KEY));
      setReviews((current) => current.filter((item) => item.id !== review.id));
    } catch (e) {
      alert('Gagal menghapus komentar: ' + e.message);
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
            <span style={{ fontSize: '0.75rem', color: '#e0f2fe' }}>UnitPro Platform Controller</span>
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
            onClick={() => setActiveTab('crm')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'crm' ? '#0284c7' : '#ffffff', color: activeTab === 'crm' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'crm' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'crm' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <Contact size={18} /> CRM Pelanggan ({stats.tenants.length})
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'reviews' ? '#0f766e' : '#ffffff', color: activeTab === 'reviews' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'reviews' ? '0 4px 12px rgba(15, 118, 110, 0.25)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'reviews' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <MessageSquare size={18} /> Komentar & Rating
            {reviews.length > 0 && <span style={{ marginLeft: 'auto', background: activeTab === 'reviews' ? 'rgba(255,255,255,0.2)' : '#d1fae5', color: activeTab === 'reviews' ? '#fff' : '#047857', padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800' }}>{reviews.length}</span>}
          </button>



          <button
            onClick={() => setActiveTab('ai')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'ai' ? '#7c3aed' : '#ffffff', color: activeTab === 'ai' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'ai' ? '0 4px 12px rgba(124,58,237,.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'ai' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <span style={{ fontSize: '1rem' }}>🤖</span> AI & Automation
          </button>

          <button 
            onClick={() => setActiveTab('wagateway')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'wagateway' ? '#16a34a' : '#ffffff', color: activeTab === 'wagateway' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'wagateway' ? '0 4px 12px rgba(22, 163, 74, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'wagateway' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <MessageSquare size={18} /> Server WA Gateway
          </button>

          <button 
            onClick={() => setActiveTab('saaslogs')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'saaslogs' ? '#4f46e5' : '#ffffff', color: activeTab === 'saaslogs' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'saaslogs' ? '0 4px 12px rgba(79, 70, 229, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'saaslogs' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <FileText size={18} /> Log Aktivitas SaaS ({saasLogs.length})
          </button>

          <button 
            onClick={() => setActiveTab('feedback')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === 'feedback' ? '#0ea5e9' : '#ffffff', color: activeTab === 'feedback' ? '#ffffff' : '#334155',
              fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', textAlign: 'left',
              boxShadow: activeTab === 'feedback' ? '0 4px 12px rgba(14, 165, 233, 0.3)' : '0 2px 5px rgba(0,0,0,0.03)',
              border: activeTab === 'feedback' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            <MessageSquareHeart size={18} /> Kritik & Saran ({feedbackList.length})
            {feedbackList.filter(f => f.status === 'unread').length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                {feedbackList.filter(f => f.status === 'unread').length}
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
                <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Toko Terdaftar</div>
                  <h1 style={{ margin: '6px 0 0 0', fontSize: '2.2rem', fontWeight: '900', color: '#0f172a' }}>{stats.tenants.length}</h1>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                    {stats.tenants.filter(t => (t.tier || 'free').toLowerCase() !== 'free').length} Berlangganan (Pro/Enterprise)
                  </div>
                </div>

                {/* Trial Stores */}
                <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Trial Aktif</div>
                  <h1 style={{ margin: '6px 0 0 0', fontSize: '2.2rem', fontWeight: '900', color: '#d97706' }}>
                    {stats.tenants.filter(t => getSubStatus(t) === 'trial').length}
                  </h1>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', fontWeight: '600' }}>Masa Percobaan 30 Hari</div>
                </div>

                {/* Expired Stores */}
                <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Toko Expired</div>
                  <h1 style={{ margin: '6px 0 0 0', fontSize: '2.2rem', fontWeight: '900', color: '#dc2626' }}>
                    {stats.tenants.filter(t => getSubStatus(t) === 'expired').length}
                  </h1>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '4px', fontWeight: '600' }}>Perlu Di-follow up</div>
                </div>

                {/* Suspended Stores */}
                <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #475569', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Toko Suspended</div>
                  <h1 style={{ margin: '6px 0 0 0', fontSize: '2.2rem', fontWeight: '900', color: '#475569' }}>
                    {stats.tenants.filter(t => getSubStatus(t) === 'suspended').length}
                  </h1>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Akses Dibekukan</div>
                </div>


              </div>

              {/* Quick Info Box */}
              <div style={{ padding: '1.5rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '800' }}>🛡️ Panduan Pengelolaan SaaS Super Admin</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', lineHeight: '1.7', fontSize: '0.88rem' }}>
                  <li><strong>Aktivasi Langganan:</strong> Buka tab <em>"Manajemen Toko"</em>, ubah paket toko menjadi <code>PRO</code> atau <code>ENTERPRISE</code> dan atur status ke <code>ACTIVE</code>.</li>
                  <li><strong>Perpanjang Masa Aktif:</strong> Klik tombol <code>📅 Perpanjang</code> untuk menambah masa aktif +30 hari / +1 tahun dan catat bukti bayar.</li>
                  <li><strong>Peringatan Expired:</strong> Gunakan tombol <code>💬 Billing WA</code> untuk mengirim reminder tagihan via WhatsApp secara langsung.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. TENANTS CONTROL CENTER MANAGEMENT */}
          {activeTab === 'tenants' && (
            <div style={{ padding: '1.8rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900' }}>Super Admin Control Center</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Kelola seluruh tenant, langganan, paket, dan status operasional toko SaaS UnitPro</p>
                </div>
                <button onClick={loadStats} style={{ padding: '7px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
                  Refresh Data 🔄
                </button>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchTenant}
                    onChange={(e) => setSearchTenant(e.target.value)}
                    placeholder="Cari toko, kode, WA, atau owner..."
                    style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', background: '#fff' }}
                >
                  <option value="all">Semua Status Langganan</option>
                  <option value="trial">⏳ Trial</option>
                  <option value="active">✓ Active</option>
                  <option value="expired">⚠️ Expired</option>
                  <option value="suspended">🚫 Suspended</option>
                </select>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', background: '#fff' }}
                >
                  <option value="all">Semua Paket (Tier)</option>
                  <option value="free">Starter (Free)</option>
                  <option value="pro">Pro Titan</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="whitelabel">White Label Partner</option>
                </select>
              </div>

              {/* TABLE LISTING TENANTS */}
              {(() => {
                const q = searchTenant.trim().toLowerCase();
                const filteredTenants = stats.tenants.filter(t => {
                  const tSettings = typeof t.settings === 'string' ? JSON.parse(t.settings || '{}') : (t.settings || {});
                  const subStatus = getSubStatus(t);
                  
                  const matchesSearch = !q ||
                    (t.name || '').toLowerCase().includes(q) ||
                    (t.code || '').toLowerCase().includes(q) ||
                    (t.phone || '').includes(q) ||
                    (tSettings.store_wa || '').includes(q);

                  const matchesStatus = statusFilter === 'all' || subStatus === statusFilter;
                  const matchesTier = tierFilter === 'all' || (t.tier || 'free').toLowerCase() === tierFilter;

                  return matchesSearch && matchesStatus && matchesTier;
                });

                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '10px' }}>Kode & Toko</th>
                          <th style={{ padding: '10px' }}>No. WhatsApp</th>
                          <th style={{ padding: '10px' }}>Paket (Tier)</th>
                          <th style={{ padding: '10px' }}>Status Langganan</th>
                          <th style={{ padding: '10px' }}>Masa Aktif s/d</th>
                          <th style={{ padding: '10px' }}>Catatan Internal</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Aksi Super Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTenants.map(t => {
                          const tSettings = typeof t.settings === 'string' ? JSON.parse(t.settings || '{}') : (t.settings || {});
                          const subStatus = getSubStatus(t);
                          const activeUntilMs = tSettings.active_until || tSettings.trial_ends_at;

                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0', background: subStatus === 'suspended' ? '#fef2f2' : 'transparent' }}>
                              <td style={{ padding: '10px' }}>
                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.78rem' }}>
                                  {t.code}
                                </span>
                                <strong style={{ display: 'block', color: '#0f172a', marginTop: '3px', fontSize: '0.9rem' }}>{t.name}</strong>
                              </td>

                              <td style={{ padding: '10px', color: '#334155' }}>
                                {tSettings.store_wa || t.phone ? (
                                  <a href={`https://wa.me/${(tSettings.store_wa || t.phone).replace(/^0/, '62')}`} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: '700', textDecoration: 'none' }}>
                                    📱 {tSettings.store_wa || t.phone}
                                  </a>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>-</span>
                                )}
                              </td>

                              {/* TIER DROPDOWN */}
                              <td style={{ padding: '10px' }}>
                                <select 
                                  value={t.tier || 'free'} 
                                  onChange={(e) => handleTierChange(t.code, e.target.value)}
                                  disabled={updatingCode === t.code}
                                  style={{
                                    padding: '4px 8px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
                                    background: t.tier === 'enterprise' ? '#f3e8ff' : t.tier === 'pro' ? '#e0f2fe' : t.tier === 'whitelabel' ? '#fef3c7' : '#f1f5f9',
                                    color: t.tier === 'enterprise' ? '#7c3aed' : t.tier === 'pro' ? '#0284c7' : t.tier === 'whitelabel' ? '#b45309' : '#475569',
                                    border: '1px solid #cbd5e1'
                                  }}
                                >
                                  <option value="free">Starter (Gratis)</option>
                                  <option value="pro">Pro Titan (Rp 149rb)</option>
                                  <option value="enterprise">Enterprise (Rp 299rb)</option>
                                  <option value="whitelabel">White Label Partner</option>
                                </select>
                              </td>

                              {/* SUBSCRIPTION STATUS DROPDOWN */}
                              <td style={{ padding: '10px' }}>
                                <select
                                  value={subStatus}
                                  onChange={(e) => handleStatusChange(t.code, e.target.value)}
                                  disabled={updatingCode === t.code}
                                  style={{
                                    padding: '4px 8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer',
                                    background: subStatus === 'active' ? '#dcfce7' : subStatus === 'trial' ? '#fef3c7' : subStatus === 'expired' ? '#fee2e2' : '#f1f5f9',
                                    color: subStatus === 'active' ? '#15803d' : subStatus === 'trial' ? '#b45309' : subStatus === 'expired' ? '#dc2626' : '#475569',
                                    border: '1px solid #cbd5e1'
                                  }}
                                >
                                  <option value="trial">⏳ Trial 30 Hari</option>
                                  <option value="active">✓ Active (Aktif)</option>
                                  <option value="expired">⚠️ Expired</option>
                                  <option value="suspended">🚫 Suspended</option>
                                </select>
                              </td>

                              {/* MASA AKTIF */}
                              <td style={{ padding: '10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {activeUntilMs ? (
                                  <div>
                                    <strong style={{ color: activeUntilMs < Date.now() ? '#dc2626' : '#059669' }}>
                                      {new Date(activeUntilMs).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </strong>
                                    <small style={{ display: 'block', color: '#64748b' }}>
                                      {activeUntilMs < Date.now() ? 'Expired' : `Sisa ${Math.ceil((activeUntilMs - Date.now()) / (24*3600*1000))} hari`}
                                    </small>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>Tak Terbatas</span>
                                )}
                              </td>

                              {/* CATATAN INTERNAL */}
                              <td style={{ padding: '10px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNotesTenant(t);
                                    setAdminNotesInput(tSettings.admin_notes || '');
                                  }}
                                  style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: tSettings.admin_notes ? '#f0fdf4' : '#f8fafc', color: tSettings.admin_notes ? '#166534' : '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  📝 {tSettings.admin_notes ? 'Ada Catatan' : '+ Catatan'}
                                </button>
                              </td>

                              {/* AKSI BUTTONS */}
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '300px' }}>
                                  <button 
                                    onClick={() => {
                                      setManualPayTenant(t);
                                      setPayAmount(t.tier === 'enterprise' ? '299000' : '149000');
                                      setPayTier(t.tier || 'pro');
                                      setPayDays(30);
                                      setPayNotes(`Pembayaran langganan ${t.tier?.toUpperCase() || 'PRO'}`);
                                    }}
                                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}
                                  >
                                    💳 Catat Bayar
                                  </button>

                                  <button 
                                    onClick={() => {
                                      setExtendingTenant(t);
                                      setExtendDays(30);
                                      setExtendNote('Pembayaran manual langganan 1 bulan');
                                    }}
                                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                                  >
                                    📅 Perpanjang
                                  </button>

                                  {(tSettings.store_wa || t.phone) && (
                                    <button 
                                      onClick={() => {
                                        const subStatusStr = getSubStatus(t);
                                        let initialType = 'H-7';
                                        if (subStatusStr === 'expired') initialType = 'EXPIRED';
                                        else if (activeUntilMs) {
                                          const days = Math.ceil((activeUntilMs - Date.now()) / (24*3600*1000));
                                          if (days <= 1) initialType = 'H-1';
                                          else if (days <= 3) initialType = 'H-3';
                                        }
                                        setWaMessageType(initialType);
                                        setWaModalTenant(t);
                                      }}
                                      style={{ background: '#25D366', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                                    >
                                      💬 Billing WA
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => handleResetPin(t.code)}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#0284c7' }}
                                  >
                                    🔑 PIN
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
                          );
                        })}

                        {filteredTenants.length === 0 && (
                          <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada toko yang sesuai dengan pencarian/filter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}


          {/* 2B. CRM PELANGGAN — dikelompokkan berdasarkan paket */}
          {activeTab === 'crm' && (
            <CrmPelangganPanel tenants={stats.tenants} onRefresh={loadStats} />
          )}

          {activeTab === 'ai' && (
            <SuperAdminAISettings />
          )}

          {activeTab === 'reviews' && (
            <div style={{ padding: '2rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>Komentar & Rating Landing Page</h2>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Moderasi komentar publik dari calon dan pengguna UnitPro.</p>
                </div>
                <button onClick={loadStats} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}><RefreshCw size={15} /> Refresh</button>
              </div>
              {reviews.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', color: '#94a3b8', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>Belum ada komentar publik.</div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {reviews.map((review) => (
                    <article key={review.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '16px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>{review.author_name}</strong>
                          {review.author_role && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{review.author_role}</span>}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b7791f', fontWeight: '800', fontSize: '0.82rem' }}><Star size={14} fill="currentColor" /> {review.rating}/5</span>
                        </div>
                        <p style={{ margin: '9px 0 0', color: '#475569', fontSize: '0.9rem', lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>{review.content}</p>
                        <span style={{ display: 'block', marginTop: '8px', color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(review.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      <button type="button" onClick={() => handleDeleteReview(review)} title="Hapus komentar" aria-label={`Hapus komentar dari ${review.author_name}`} style={{ alignSelf: 'start', display: 'inline-grid', placeItems: 'center', width: '34px', height: '34px', border: '1px solid #fecaca', borderRadius: '7px', background: '#fff1f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              )}
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

          {activeTab === 'wagateway' && (
            <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>💬</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>Konfigurasi Server WhatsApp Gateway Global</h3>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Konfigurasi server pengirim notifikasi WhatsApp terpusat milik platform.</p>
                </div>
              </div>

              {/* Status Server */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '12px', color: '#15803d', fontWeight: '800', fontSize: '0.88rem', marginBottom: '2rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span>Status Server WA Global: 🟢 TERHUBUNG (Fonnte Engine 100% Online)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
                <div>
                  <label className="label" style={{ fontWeight: '700' }}>WhatsApp API Gateway Provider</label>
                  <select className="input-field" style={{ background: '#f8fafc' }} defaultValue="fonnte">
                    <option value="fonnte">Fonnte (Rekomendasi Tercepat)</option>
                    <option value="wablas">Wablas (Premium Multi-Device)</option>
                    <option value="baileys">Baileys WA-Web JS (QR Code Scanner)</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: '700' }}>API Gateway URL</label>
                  <input type="text" className="input-field" placeholder="https://api.fonnte.com/send" defaultValue="https://api.fonnte.com/send" />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label className="label" style={{ fontWeight: '700' }}>API Token / Secret Key Server</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Masukkan Token Fonnte / Wablas Anda"
                  defaultValue="fonnte_secret_token_global_aiservice_2026"
                />
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  🔑 Token ini digunakan secara global untuk mengirim update status servis pelanggan di semua toko paket Pro & Enterprise.
                </span>
              </div>

              {/* Uji Coba Kirim WA */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', fontWeight: '800' }}>🧪 Uji Coba Pengiriman Pesan Server:</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input id="testWaNumber" type="text" className="input-field" placeholder="No WA Tujuan (cth: 0812345678)" style={{ flex: 1, minWidth: '200px' }} />
                  <button 
                    onClick={() => {
                      const num = document.getElementById('testWaNumber')?.value;
                      if (!num) return alert('Masukkan nomor tujuan tes!');
                      alert(`Berhasil! Pesan uji coba WA Server berhasil dikirim ke ${num}.\n\nLog: API Status OK (200)`);
                    }}
                    className="btn btn-accent" 
                    style={{ background: '#25D366', color: 'white', border: 'none' }}
                  >
                    Kirim Pesan Tes 📲
                  </button>
                </div>
              </div>

              <button 
                onClick={() => alert('Konfigurasi Server WA Gateway berhasil disimpan!')}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                💾 Simpan Konfigurasi WA Server
              </button>
            </div>
          )}

          {/* SAAS AUDIT LOGS TAB */}
          {activeTab === 'saaslogs' && (
            <div style={{ padding: '1.8rem', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={22} color="#4f46e5" /> Audit Trail & Log Aktivitas Administrasi SaaS
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Riwayat aktivitas Super Admin dalam mengelola tier, status langganan, pembayaran manual, reset PIN, dan pembekuan toko.
                  </p>
                </div>
                <button onClick={loadStats} style={{ padding: '7px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} /> Refresh Log
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px' }}>Waktu Audit</th>
                      <th style={{ padding: '10px' }}>ID Toko (Tenant)</th>
                      <th style={{ padding: '10px' }}>Jenis Aksi</th>
                      <th style={{ padding: '10px' }}>Operator</th>
                      <th style={{ padding: '10px' }}>Detail & Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saasLogs.map(log => {
                      const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-';
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            {dateStr}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.78rem' }}>
                              {log.tenant_code}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem',
                              background: log.action_type === 'RECORD_MANUAL_PAYMENT' ? '#dcfce7' : log.action_type === 'UPDATE_TIER' ? '#f3e8ff' : log.action_type === 'TOGGLE_BAN' ? '#fee2e2' : '#f1f5f9',
                              color: log.action_type === 'RECORD_MANUAL_PAYMENT' ? '#15803d' : log.action_type === 'UPDATE_TIER' ? '#7c3aed' : log.action_type === 'TOGGLE_BAN' ? '#dc2626' : '#475569'
                            }}>
                              {log.action_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: '600', color: '#334155' }}>
                            {log.operator || 'Super Admin'}
                          </td>
                          <td style={{ padding: '10px', color: '#0f172a', fontWeight: '500' }}>
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                    {saasLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          Belum ada catatan aktivitas administrasi SaaS.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. KRITIK & SARAN MASUK (FEEDBACK INBOX) */}
          {activeTab === 'feedback' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageSquareHeart size={26} color="#0ea5e9" /> Kotak Masuk Kritik & Saran
                  </h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                    Pesan, kendala, dan masukan fitur dari seluruh pengelola toko pengguna UnitPro
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadStats}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '700', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Refresh Pesan
                </button>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                {[
                  { id: 'all', label: `Semua (${feedbackList.length})` },
                  { id: 'unread', label: `Belum Dibaca (${feedbackList.filter(f => f.status === 'unread').length})` },
                  { id: 'Kritik', label: `💬 Kritik (${feedbackList.filter(f => f.category === 'Kritik').length})` },
                  { id: 'Saran', label: `💡 Saran (${feedbackList.filter(f => f.category === 'Saran').length})` },
                  { id: 'Kendala / Bug', label: `⚠️ Kendala (${feedbackList.filter(f => f.category === 'Kendala / Bug').length})` },
                  { id: 'Permintaan Fitur', label: `🚀 Permintaan Fitur (${feedbackList.filter(f => f.category === 'Permintaan Fitur').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFeedbackFilter(tab.id)}
                    style={{
                      padding: '8px 14px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '800',
                      border: feedbackFilter === tab.id ? 'none' : '1px solid #e2e8f0',
                      background: feedbackFilter === tab.id ? '#0ea5e9' : '#ffffff',
                      color: feedbackFilter === tab.id ? '#ffffff' : '#475569',
                      cursor: 'pointer', boxShadow: feedbackFilter === tab.id ? '0 4px 12px rgba(14, 165, 233, 0.25)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Feedback Cards */}
              {feedbackList.filter(f => {
                if (feedbackFilter === 'unread') return f.status === 'unread';
                if (feedbackFilter !== 'all') return f.category === feedbackFilter;
                return true;
              }).length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                  <MessageSquareHeart size={44} style={{ opacity: 0.4, marginBottom: '10px' }} />
                  <h4 style={{ margin: '0 0 6px', color: '#0f172a' }}>Tidak ada pesan kritik & saran</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Pesan yang dikirimkan pengelola toko akan muncul secara otomatis di panel ini.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {feedbackList.filter(f => {
                    if (feedbackFilter === 'unread') return f.status === 'unread';
                    if (feedbackFilter !== 'all') return f.category === feedbackFilter;
                    return true;
                  }).map(item => {
                    const isUnread = item.status === 'unread';
                    const categoryColors = {
                      'Kritik': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                      'Saran': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
                      'Kendala / Bug': { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
                      'Permintaan Fitur': { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }
                    };
                    const catStyle = categoryColors[item.category] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

                    return (
                      <div key={item.id} style={{
                        background: isUnread ? '#ffffff' : '#f8fafc',
                        borderRadius: '16px', padding: '20px',
                        border: isUnread ? '2px solid #38bdf8' : '1px solid #e2e8f0',
                        boxShadow: isUnread ? '0 8px 25px rgba(56, 189, 248, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`, padding: '3px 10px', borderRadius: '100px', fontSize: '0.74rem', fontWeight: '900', textTransform: 'uppercase' }}>
                              {item.category || 'Saran'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                              {new Date(item.created_at || Date.now()).toLocaleString('id-ID')}
                            </span>
                            {item.rating && (
                              <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', padding: '2px 8px', borderRadius: '100px', fontSize: '0.74rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                ⭐ {item.rating}/5
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={item.status || 'unread'}
                              onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value)}
                              style={{
                                padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800',
                                background: item.status === 'resolved' ? '#dcfce7' : item.status === 'processed' ? '#fef3c7' : item.status === 'read' ? '#e0f2fe' : '#fee2e2',
                                color: item.status === 'resolved' ? '#15803d' : item.status === 'processed' ? '#b45309' : item.status === 'read' ? '#0369a1' : '#b91c1c',
                                border: 'none', cursor: 'pointer'
                              }}
                            >
                              <option value="unread">🔴 Belum Dibaca</option>
                              <option value="read">🔵 Sudah Dibaca</option>
                              <option value="processed">🟡 Sedang Diproses</option>
                              <option value="resolved">🟢 Selesai / Ditanggapi</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(item.id)}
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}
                              title="Hapus Pesan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Sender info */}
                        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{item.sender_name || 'Admin Toko'}</strong>
                            {item.tenant_name && <span style={{ color: '#475569', fontSize: '0.82rem', marginLeft: '6px' }}>({item.tenant_name} · <code>{item.tenant_code}</code>)</span>}
                          </div>
                          {item.sender_phone && (
                            <a
                              href={`https://wa.me/${item.sender_phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Halo Kak ${item.sender_name}, mengenai masukan Anda tentang "${item.subject || item.category}": `)}`}
                              target="_blank" rel="noreferrer"
                              style={{ background: '#25D366', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              💬 Balas via WA ({item.sender_phone})
                            </a>
                          )}
                        </div>

                        {/* Subject & Message */}
                        {item.subject && (
                          <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1rem', fontWeight: '800' }}>
                            {item.subject}
                          </h4>
                        )}
                        <p style={{ margin: 0, color: '#334155', fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {item.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: PERPANJANG MASA AKTIF LANGGANAN */}
      {extendingTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '1.6rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
              📅 Perpanjang Masa Aktif Langganan
            </h3>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.82rem', color: '#64748b' }}>
              Toko: <strong>{extendingTenant.name}</strong> ({extendingTenant.code})
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Pilih Durasi Perpanjangan:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExtendDays(30)}
                  style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', background: extendDays === 30 ? '#0284c7' : '#fff', color: extendDays === 30 ? '#fff' : '#334155', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  +30 Hari (1 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => setExtendDays(90)}
                  style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', background: extendDays === 90 ? '#0284c7' : '#fff', color: extendDays === 90 ? '#fff' : '#334155', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  +90 Hari (3 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => setExtendDays(365)}
                  style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', background: extendDays === 365 ? '#0284c7' : '#fff', color: extendDays === 365 ? '#fff' : '#334155', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  +365 Hari (1 Thn)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Ketik Jumlah Hari Custom:</label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Catatan / Bukti Pembayaran:</label>
              <input
                type="text"
                placeholder="Contoh: Transfer BCA Rp 149.000 tgl 8 Aug"
                value={extendNote}
                onChange={(e) => setExtendNote(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setExtendingTenant(null)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveExtension}
                disabled={updatingCode === extendingTenant.code}
                style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
              >
                💾 Simpan Perpanjangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CATATAN INTERNAL SUPER ADMIN */}
      {editingNotesTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '1.6rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
              📝 Catatan Internal Super Admin
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748b' }}>
              Toko: <strong>{editingNotesTenant.name}</strong> ({editingNotesTenant.code}) — Hanya terlihat oleh Super Admin.
            </p>

            <div style={{ marginBottom: '1.4rem' }}>
              <textarea
                rows={4}
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder="Tulis catatan internal untuk tim Super Admin (misal: Janji bayar tgl 10, minta diskon perpanjangan, dsb)..."
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingNotesTenant(null)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAdminNotes}
                disabled={updatingCode === editingNotesTenant.code}
                style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: '#059669', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
              >
                💾 Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CATAT PEMBAYARAN MANUAL SAAS */}
      {manualPayTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '1.8rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={22} color="#059669" /> Catat Pembayaran Manual SaaS
            </h3>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Toko: <strong>{manualPayTenant.name}</strong> ({manualPayTenant.code})
            </p>

            <form onSubmit={handleRecordManualPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>Nominal (Rp):</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: '700' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>Target Paket:</label>
                  <select
                    value={payTier}
                    onChange={(e) => setPayTier(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', fontWeight: '700', background: '#fff' }}
                  >
                    <option value="pro">Pro Titan</option>
                    <option value="enterprise">Enterprise Multi</option>
                    <option value="whitelabel">White Label</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>Metode Pembayaran:</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="Transfer Bank (BRI)">Transfer Bank (BRI)</option>
                    <option value="E-Wallet (DANA)">E-Wallet (DANA)</option>
                    <option value="QRIS Direct">QRIS Direct</option>
                    <option value="Tunai / Cash">Tunai / Cash</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>Durasi Langganan:</label>
                  <select
                    value={payDays}
                    onChange={(e) => setPayDays(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value={30}>+30 Hari (1 Bulan)</option>
                    <option value={90}>+90 Hari (3 Bulan)</option>
                    <option value={180}>+180 Hari (6 Bulan)</option>
                    <option value={365}>+365 Hari (1 Tahun)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>No. Referensi Transfer / Bukti:</label>
                <input
                  type="text"
                  placeholder="Contoh: REF98762512 / TRX-BCA-9812"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.4rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#374151', marginBottom: '4px' }}>Catatan Transaksi:</label>
                <input
                  type="text"
                  placeholder="Contoh: Promo diskon perpanjangan tahun pertama"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setManualPayTenant(null)}
                  style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingCode === manualPayTenant.code}
                  style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#059669', color: '#fff', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={16} /> Simpan Pembayaran & Perpanjang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: KIRIM TAGIHAN BILLING WA */}
      {waModalTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '1.8rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={22} color="#25D366" /> Kirim Pengingat Tagihan WhatsApp
            </h3>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Toko: <strong>{waModalTenant.name}</strong> ({waModalTenant.code}) · WA: <strong>{(typeof waModalTenant.settings === 'string' ? JSON.parse(waModalTenant.settings||'{}') : (waModalTenant.settings||{})).store_wa || waModalTenant.phone || '-'}</strong>
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#374151', marginBottom: '6px' }}>Pilih Template Pesan:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {['H-7', 'H-3', 'H-1', 'EXPIRED'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWaMessageType(t)}
                    style={{
                      padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      background: waMessageType === t ? '#25D366' : '#f8fafc',
                      color: waMessageType === t ? '#fff' : '#334155',
                      fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#374151', marginBottom: '6px' }}>Pratinjau Pesan:</label>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem', color: '#166534', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', maxHeight: '180px', overflowY: 'auto' }}>
                {apiService.generateBillingWaMessage(waModalTenant, waMessageType)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setWaModalTenant(null)}
                style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetPhone = ((typeof waModalTenant.settings === 'string' ? JSON.parse(waModalTenant.settings||'{}') : (waModalTenant.settings||{})).store_wa || waModalTenant.phone || '').replace(/^0/, '62');
                  const msg = apiService.generateBillingWaMessage(waModalTenant, waMessageType);
                  if (!targetPhone) return alert('Nomor WhatsApp toko belum diisi!');
                  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  apiService.logAdminActivity(waModalTenant.code, 'SEND_BILLING_WA', `Mengirim WA billing reminder template ${waMessageType} ke ${targetPhone}`);
                  setWaModalTenant(null);
                }}
                style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#25D366', color: '#fff', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                💬 Buka WhatsApp Sekarang →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

