import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle, Eye, EyeOff, KeyRound, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';

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

export default function SuperAdminAISettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('');
  const [config, setConfig] = useState({
    enabled: true,
    model: 'gemini-2.0-flash',
    has_api_key: false,
    masked_key: '',
    custom_instruction: '',
    source: 'none',
  });
  const [apiKey, setApiKey] = useState('');

  const getToken = () => localStorage.getItem(API_TOKEN_KEY) || '';

  const request = async (path, options = {}) => {
    const token = getToken();
    if (!token) throw new Error('Sesi Super Admin API tidak tersedia. Logout lalu login kembali.');
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

  const loadConfig = async () => {
    setLoading(true);
    setStatus('');
    try {
      const result = await request('/admin/ai-config');
      setConfig((current) => ({ ...current, ...result }));
    } catch (error) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setStatus('');
    try {
      const result = await request('/admin/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: config.enabled,
          model: config.model,
          custom_instruction: config.custom_instruction,
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        }),
      });
      setConfig((current) => ({ ...current, ...result }));
      setApiKey('');
      setStatus('✅ Konfigurasi Gemini tersimpan aman di server.');
    } catch (error) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setStatus('');
    try {
      const result = await request('/admin/ai-config/test', {
        method: 'POST',
        body: JSON.stringify({
          model: config.model,
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        }),
      });
      setStatus(result.success ? `✅ Gemini ${result.model} terhubung dan siap dipakai.` : '⚠️ Gemini merespons tetapi hasil tes tidak sesuai.');
    } catch (error) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Memuat konfigurasi AI...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, #111827 0%, #312e81 100%)', color: '#fff', boxShadow: '0 12px 30px rgba(49,46,129,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}><Bot size={24} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>AI & Automation</h2>
              <p style={{ margin: '5px 0 0', color: '#c7d2fe', fontSize: '0.86rem', lineHeight: 1.5 }}>Satu Gemini API Key global untuk AI Copywriter, AI Agent WhatsApp, CRM context, campaign barang/jasa, dan smart follow-up seluruh UnitPro.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig((current) => ({ ...current, enabled: !current.enabled }))}
            style={{ border: 'none', borderRadius: 999, padding: '8px 14px', cursor: 'pointer', fontWeight: '900', background: config.enabled ? '#22c55e' : '#475569', color: '#fff' }}
          >
            {config.enabled ? '🟢 Gemini Global ON' : '⚫ Gemini Global OFF'}
          </button>
        </div>
      </div>

      <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <KeyRound size={18} color="#7c3aed" />
          <strong>Gemini API</strong>
          {config.has_api_key && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '4px 9px', borderRadius: 999, fontWeight: 800 }}><CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />Key tersedia</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px,1fr) minmax(220px,.65fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.78rem', color: '#475569', marginBottom: 5 }}>API Key Gemini</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={config.has_api_key ? `Sudah tersimpan (${config.masked_key}). Isi hanya jika ingin mengganti.` : 'Tempel Gemini API Key...'}
                autoComplete="off"
                style={{ ...fieldStyle, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowKey((value) => !value)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <small style={{ color: '#64748b' }}>Key disimpan terenkripsi server-side dan tidak dikirim kembali ke tenant.</small>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.78rem', color: '#475569', marginBottom: 5 }}>Model</label>
            <select value={config.model} onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))} style={fieldStyle}>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash — rekomendasi</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
            <small style={{ color: '#64748b' }}>Model dapat diganti tanpa mengubah aplikasi tenant.</small>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.4rem', borderRadius: '18px', background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><ShieldCheck size={18} color="#0284c7" /><strong>System Prompt UnitPro</strong></div>
        <div style={{ padding: 12, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 10 }}>
          Prompt inti keamanan dikunci di backend: AI hanya memakai data UnitPro, tidak boleh mengarang harga/status/garansi, otomatis memakai variabel campaign, berbicara natural seperti CS toko, dan melakukan human handoff saat tidak yakin.
        </div>
        <label style={{ display: 'block', fontWeight: 800, fontSize: '0.78rem', color: '#475569', marginBottom: 5 }}>Instruksi tambahan Super Admin (opsional)</label>
        <textarea
          value={config.custom_instruction}
          onChange={(event) => setConfig((current) => ({ ...current, custom_instruction: event.target.value }))}
          rows={6}
          placeholder="Contoh: Gunakan sapaan Kak, hindari lebih dari 2 emoji, dan jangan menawarkan diskon kecuali ada di data toko."
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {status && <div style={{ padding: '11px 13px', borderRadius: 12, background: status.startsWith('✅') ? '#f0fdf4' : '#fff7ed', border: `1px solid ${status.startsWith('✅') ? '#86efac' : '#fed7aa'}`, fontSize: '0.84rem', fontWeight: 700 }}>{status}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={testConnection} disabled={testing} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 800, cursor: testing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={16} /> {testing ? 'Menguji Gemini...' : 'Tes Koneksi'}
        </button>
        <button type="button" onClick={saveConfig} disabled={saving} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', fontWeight: 900, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>

      <div style={{ padding: '1rem', borderRadius: 14, background: '#faf5ff', border: '1px solid #e9d5ff', color: '#6b21a8', fontSize: '0.82rem', lineHeight: 1.55 }}>
        <Sparkles size={15} style={{ display: 'inline', marginRight: 6 }} />
        Sumber key saat ini: <b>{config.source === 'super_admin' ? 'Super Admin' : config.source === 'environment' ? 'Environment server' : 'Belum ada'}</b>. Environment tetap menjadi fallback jika key Super Admin belum disimpan.
      </div>
    </div>
  );
}
