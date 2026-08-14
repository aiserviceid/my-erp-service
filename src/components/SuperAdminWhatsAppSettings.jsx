import React, { useEffect, useState } from 'react';
import { CheckCircle, Eye, EyeOff, RefreshCw, Save, Send, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3001/api');
const API_TOKEN_KEY = 'SA_API_TOKEN';

const fieldStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '0.88rem',
  background: '#fff',
  color: '#0f172a',
};

const formatCheckedAt = (value) => value
  ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Belum diperiksa';

export default function SuperAdminWhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Tes koneksi WhatsApp Gateway UnitPro dari Super Admin.');
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState({
    provider: 'fonnte',
    enabled: true,
    configured: false,
    status: 'unknown',
    source: 'none',
    masked_token: '',
    device: '',
    device_status: '',
    checked_at: null,
  });

  const request = async (path, options = {}) => {
    const token = localStorage.getItem(API_TOKEN_KEY) || '';
    if (!token) throw new Error('Sesi API Super Admin tidak tersedia. Logout lalu login kembali.');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request gagal (${response.status}).`);
    return payload;
  };

  const loadConfig = async (clearNotice = true) => {
    setLoading(true);
    if (clearNotice) setNotice('');
    try {
      const result = await request('/admin/whatsapp/config');
      setConfig((current) => ({ ...current, ...result }));
    } catch (error) {
      setConfig((current) => ({ ...current, status: 'error', error: error.message }));
      setNotice(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setNotice('');
    try {
      await request('/admin/whatsapp/config', {
        method: 'PUT',
        body: JSON.stringify({ enabled: config.enabled, ...(tokenInput.trim() ? { token: tokenInput.trim() } : {}) }),
      });
      setTokenInput('');
      setNotice('✅ Konfigurasi tersimpan aman di server. Status gateway sedang diverifikasi.');
      await loadConfig(false);
    } catch (error) {
      setNotice(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testGateway = async () => {
    if (!testNumber.trim()) return setNotice('⚠️ Masukkan nomor WhatsApp tujuan tes.');
    if (!testMessage.trim()) return setNotice('⚠️ Pesan tes tidak boleh kosong.');
    setTesting(true);
    setNotice('');
    try {
      const result = await request('/admin/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ target: testNumber, message: testMessage }),
      });
      setNotice(`✅ Pesan nyata dikirim melalui ${result.provider} ke ${result.target}.`);
      await loadConfig(false);
    } catch (error) {
      setNotice(`❌ ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const statusMeta = config.status === 'connected'
    ? { label: 'Terhubung dan terverifikasi', color: '#166534', background: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={20} /> }
    : config.status === 'disabled'
      ? { label: 'Dinonaktifkan Super Admin', color: '#475569', background: '#f8fafc', border: '#cbd5e1', icon: <WifiOff size={20} /> }
      : config.status === 'not_configured'
        ? { label: 'Token sistem belum dikonfigurasi', color: '#92400e', background: '#fffbeb', border: '#fde68a', icon: <WifiOff size={20} /> }
        : { label: 'Gateway belum terhubung', color: '#b91c1c', background: '#fef2f2', border: '#fecaca', icon: <WifiOff size={20} /> };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Memeriksa WhatsApp Gateway...</div>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', color: '#fff', boxShadow: '0 12px 30px rgba(4,120,87,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center' }}><Smartphone size={24} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>WhatsApp Gateway Platform</h2>
              <p style={{ margin: '5px 0 0', color: '#d1fae5', fontSize: '0.86rem', lineHeight: 1.5 }}>Gateway sistem yang dipakai notifikasi servis dan WhatsApp Marketing seluruh tenant mode SYSTEM.</p>
            </div>
          </div>
          <button type="button" onClick={() => setConfig((current) => ({ ...current, enabled: !current.enabled }))} style={{ border: 'none', borderRadius: 999, padding: '8px 14px', cursor: 'pointer', fontWeight: '900', background: config.enabled ? '#22c55e' : '#475569', color: '#fff' }}>
            {config.enabled ? '🟢 Gateway ON' : '⚫ Gateway OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: 14, color: statusMeta.color, background: statusMeta.background, border: `1px solid ${statusMeta.border}` }}>
        {statusMeta.icon}
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block' }}>{statusMeta.label}</strong>
          <small style={{ display: 'block', marginTop: 4, lineHeight: 1.45 }}>
            Provider: Fonnte · Sumber token: {config.source === 'super_admin' ? 'tersimpan terenkripsi' : config.source === 'environment' ? 'environment server' : 'belum ada'}
            {config.device ? ` · Device: ${config.device}` : ''}
          </small>
          {config.error && <small style={{ display: 'block', marginTop: 4 }}>{config.error}</small>}
          <small style={{ display: 'block', marginTop: 4 }}>Terakhir diperiksa: {formatCheckedAt(config.checked_at)}</small>
        </div>
        <button type="button" onClick={() => loadConfig()} title="Periksa ulang" style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 3 }}><RefreshCw size={18} /></button>
      </div>

      <div style={{ padding: '1.4rem', borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><ShieldCheck size={18} color="#047857" /><strong>Konfigurasi Server</strong></div>
        <label style={{ display: 'block', fontWeight: 800, fontSize: '.78rem', color: '#475569', marginBottom: 5 }}>Token Fonnte Sistem</label>
        <div style={{ position: 'relative' }}>
          <input type={showToken ? 'text' : 'password'} value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder={config.configured ? `Sudah tersimpan (${config.masked_token || 'token tersedia'}). Isi hanya untuk mengganti.` : 'Masukkan token Fonnte sistem...'} autoComplete="off" style={{ ...fieldStyle, paddingRight: 44 }} />
          <button type="button" onClick={() => setShowToken((value) => !value)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>{showToken ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <small style={{ color: '#64748b', display: 'block', marginTop: 6 }}>Token dienkripsi di server dan tidak pernah dikirim kembali ke browser atau tenant.</small>
        <button type="button" onClick={saveConfig} disabled={saving} className="btn btn-primary" style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan & Verifikasi'}</button>
      </div>

      <div style={{ padding: '1.4rem', borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Send size={18} color="#25D366" /><strong>Tes Pengiriman Nyata</strong></div>
        <div className="super-admin-wa-test-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(210px,.6fr) minmax(260px,1.4fr)', gap: 10 }}>
          <input type="tel" inputMode="numeric" value={testNumber} onChange={(event) => setTestNumber(event.target.value)} placeholder="Nomor tujuan, contoh 081234567890" style={fieldStyle} />
          <input type="text" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Pesan tes" maxLength={5000} style={fieldStyle} />
        </div>
        <button type="button" onClick={testGateway} disabled={testing || !config.enabled} style={{ marginTop: 12, border: 'none', borderRadius: 10, padding: '10px 16px', cursor: testing || !config.enabled ? 'not-allowed' : 'pointer', fontWeight: 900, color: '#fff', background: testing || !config.enabled ? '#94a3b8' : '#25D366', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Send size={16} /> {testing ? 'Mengirim...' : 'Kirim Pesan Tes'}</button>
      </div>

      {notice && <div style={{ padding: '12px 14px', borderRadius: 12, background: notice.startsWith('✅') ? '#f0fdf4' : notice.startsWith('⚠️') ? '#fffbeb' : '#fef2f2', color: notice.startsWith('✅') ? '#166534' : notice.startsWith('⚠️') ? '#92400e' : '#b91c1c', fontWeight: 700, fontSize: '.84rem' }}>{notice}</div>}
    </div>
  );
}
