from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"anchor not found: {label}")
    return text.replace(old, new, 1)

# 1) Mount the dedicated AI Agent backend and remove the older copywriting-only endpoint.
server_path = ROOT / 'server/index.cjs'
server = server_path.read_text()
start = server.index("app.post('/api/ai/copywriting'")
end = server.index('// Middleware to enforce premium feature limits', start)
server = server[:start] + "const { registerAiAgentRoutes } = require('./ai-agent.cjs');\nregisterAiAgentRoutes(app, { db });\n\n" + server[end:]
server_path.write_text(server)

# 2) Super Admin: add AI & Automation menu and settings panel.
sa_path = ROOT / 'src/pages/SuperAdmin.jsx'
sa = sa_path.read_text()
sa = replace_once(
    sa,
    "import { useNavigate } from 'react-router-dom';\n",
    "import { useNavigate } from 'react-router-dom';\nimport SuperAdminAISettings from '../components/SuperAdminAISettings';\n",
    'SuperAdmin import',
)

wa_button_anchor = """          <button \n            onClick={() => setActiveTab('wagateway')}"""
ai_button = """          <button
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

""" + wa_button_anchor
sa = replace_once(sa, wa_button_anchor, ai_button, 'SuperAdmin AI sidebar')

reviews_anchor = """          {activeTab === 'reviews' && ("""
ai_panel = """          {activeTab === 'ai' && (
            <SuperAdminAISettings />
          )}

""" + reviews_anchor
sa = replace_once(sa, reviews_anchor, ai_panel, 'SuperAdmin AI panel')
sa_path.write_text(sa)

# 3) WhatsApp Marketing: conversational AI prompt + AI Agent toggle.
crm_path = ROOT / 'src/components/CustomerCRMInsights.jsx'
crm = crm_path.read_text()
crm = replace_once(crm, "import React, { useMemo, useRef, useState } from 'react';", "import React, { useEffect, useMemo, useRef, useState } from 'react';", 'CRM React imports')
crm = replace_once(
    crm,
    "  AlertCircle,\n  RefreshCw,\n} from 'lucide-react';",
    "  AlertCircle,\n  RefreshCw,\n  Bot,\n  Pause,\n  Sparkles,\n} from 'lucide-react';",
    'CRM icon imports',
)

state_anchor = """  const [gatewayTestStatus, setGatewayTestStatus] = useState('idle');
  const messageRef = useRef(null);
"""
state_block = """  const [gatewayTestStatus, setGatewayTestStatus] = useState('idle');
  const messageRef = useRef(null);
  const [agentEnabled, setAgentEnabled] = useState(Boolean(settings.ai_agent_enabled));
  const [agentPausedUntil, setAgentPausedUntil] = useState(Number(settings.ai_agent_paused_until || 0));
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentStatus, setAgentStatus] = useState('');

  useEffect(() => {
    setAgentEnabled(Boolean(settings.ai_agent_enabled));
    setAgentPausedUntil(Number(settings.ai_agent_paused_until || 0));
  }, [settings.ai_agent_enabled, settings.ai_agent_paused_until]);
"""
crm = replace_once(crm, state_anchor, state_block, 'CRM agent states')

old_generate_start = crm.index('  const handleGenerateCopy = async () => {')
old_generate_end = crm.index('\n\n  const copySegmentPhones', old_generate_start)
new_generate = """  const handleGenerateCopy = async (instruction = '') => {
    if (!campaignGoal.trim()) return alert('Tulis permintaan untuk AI terlebih dahulu.');
    setIsGeneratingCopy(true);
    try {
      const result = await apiService.post('/ai/copywriting', {
        tenant_code: tenant?.code,
        prompt: campaignGoal.trim(),
        segment_key: selectedSegment,
        segment_label: activeSegment.label,
        current_message: campaignMessage,
        instruction,
      });
      if (result?.error) throw new Error(result.error);
      const text = String(result?.text || '').trim();
      if (!text) throw new Error('Gemini tidak mengembalikan teks.');
      setCampaignMessage(text);
    } catch (error) {
      alert(`Gagal membuat pesan: ${error?.message || 'layanan Gemini belum siap'}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const saveAgentSettings = async (patch) => {
    const nextSettings = { ...settings, ai_agent_enabled: agentEnabled, ai_agent_paused_until: agentPausedUntil, ...patch };
    await apiService.updateTenantSettings(tenant.code, nextSettings);
    return nextSettings;
  };

  const handleToggleAgent = async () => {
    if (!tenant?.code) return;
    const nextEnabled = !agentEnabled;
    if (nextEnabled && !(senderConfig.mode === 'CUSTOM' && senderConfig.token)) {
      return alert('AI Agent otomatis membutuhkan mode CUSTOM + Token Fonnte. Isi di Pengaturan → WhatsApp Gateway terlebih dahulu.');
    }
    setAgentBusy(true);
    setAgentStatus('');
    try {
      if (nextEnabled) {
        await saveAgentSettings({ ai_agent_enabled: true, ai_agent_paused_until: 0 });
        const setup = await apiService.post('/whatsapp/setup-agent', { tenant_code: tenant.code });
        if (setup?.error) throw new Error(setup.error);
        setAgentEnabled(true);
        setAgentPausedUntil(0);
        setAgentStatus(`✅ AI Agent aktif. Webhook Fonnte dipasang otomatis${setup?.device ? ` pada ${setup.device}` : ''}.`);
      } else {
        await saveAgentSettings({ ai_agent_enabled: false });
        setAgentEnabled(false);
        setAgentStatus('AI Agent OFF — chat pelanggan tidak dibalas otomatis.');
      }
    } catch (error) {
      if (nextEnabled) {
        try { await saveAgentSettings({ ai_agent_enabled: false }); } catch { /* best effort rollback */ }
        setAgentEnabled(false);
      }
      setAgentStatus(`❌ ${error?.message || 'Gagal mengatur AI Agent.'}`);
    } finally {
      setAgentBusy(false);
    }
  };

  const handlePauseAgent = async () => {
    const pausedUntil = Date.now() + (60 * 60 * 1000);
    setAgentBusy(true);
    try {
      await saveAgentSettings({ ai_agent_paused_until: pausedUntil });
      setAgentPausedUntil(pausedUntil);
      setAgentStatus('⏸️ AI Agent dipause 1 jam.');
    } catch (error) {
      setAgentStatus(`❌ ${error.message}`);
    } finally {
      setAgentBusy(false);
    }
  };

  const handleResumeAgent = async () => {
    setAgentBusy(true);
    try {
      await saveAgentSettings({ ai_agent_paused_until: 0 });
      setAgentPausedUntil(0);
      setAgentStatus('✅ AI Agent aktif kembali.');
    } catch (error) {
      setAgentStatus(`❌ ${error.message}`);
    } finally {
      setAgentBusy(false);
    }
  };"""
crm = crm[:old_generate_start] + new_generate + crm[old_generate_end:]

crm = replace_once(
    crm,
    "          <h3>Follow-up pelanggan tanpa template kaku</h3>\n          <span>Pilih target, tulis sendiri atau buat copywriting dengan Gemini, lalu variabel pelanggan terisi otomatis saat pesan dikirim.</span>",
    "          <h3>AI Agent + Campaign yang memahami data toko</h3>\n          <span>Balas WhatsApp otomatis, buat promo barang/jasa, follow-up CRM, dan personalisasi pesan cukup dengan bahasa sehari-hari.</span>",
    'CRM hero',
)

old_tutorial = """          <strong style={{ display: 'block', marginBottom: '8px' }}>Cara pakai paling ringkas</strong>
          <div style={{ display: 'grid', gap: '6px', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <span><b>1.</b> Pengaturan → WhatsApp Gateway → pilih CUSTOM → isi token Fonnte → Simpan.</span>
            <span><b>2.</b> Klik <b>Tes Gateway</b>. Jika sukses, pilih segment pelanggan di bawah.</span>
            <span><b>3.</b> Isi tujuan campaign → <b>Buat dengan Gemini</b>, atau tulis pesan sendiri. Semua teks tetap bisa diedit.</span>
            <span><b>4.</b> Sisipkan variabel seperti <code>{'{nama_pelanggan}'}</code> dan <code>{'{resi}'}</code>. UnitPro mengisinya berbeda untuk tiap pelanggan saat kirim.</span>
            <span><b>5.</b> Kirim dulu ke 1 pelanggan untuk cek hasil, lalu jalankan broadcast bertahap dan pantau log.</span>
          </div>"""
new_tutorial = """          <strong style={{ display: 'block', marginBottom: '8px' }}>Tutorial UnitPro AI + WhatsApp</strong>
          <div style={{ display: 'grid', gap: '6px', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <span><b>1.</b> Pengaturan → WhatsApp Gateway → CUSTOM → isi Token Fonnte → Simpan → Tes Gateway.</span>
            <span><b>2.</b> Aktifkan <b>AI Agent</b>. UnitPro otomatis memasang webhook Fonnte dan auto-read chat personal.</span>
            <span><b>3.</b> AI menjawab status servis, tracking, informasi toko, serta barang/jasa dari data UnitPro. Jika tidak yakin atau ada komplain serius, AI melakukan human handoff.</span>
            <span><b>4.</b> Untuk campaign, pilih target lalu ketik seperti chat: <i>“Buat promo cleaning laptop untuk pelanggan lama.”</i></span>
            <span><b>5.</b> Gemini otomatis menulis copywriting dan memilih variabel personalisasi. Cek preview, edit bila perlu, kirim 1 tes, lalu broadcast.</span>
            <span><b>6.</b> Owner dapat mematikan atau pause AI Agent kapan saja.</span>
          </div>"""
crm = replace_once(crm, old_tutorial, new_tutorial, 'CRM tutorial')

segment_anchor = """      <div className=\"customer-segment-grid\" style={{ marginTop: '1rem' }}>"""
agent_card = """      <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '18px', background: agentEnabled ? 'linear-gradient(135deg,#ecfdf5,#eff6ff)' : '#f8fafc', border: `1px solid ${agentEnabled ? '#86efac' : '#cbd5e1'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: agentEnabled ? '#16a34a' : '#64748b', color: '#fff' }}><Bot size={22} /></div>
            <div>
              <strong style={{ display: 'block', color: '#0f172a' }}>UnitPro AI Agent</strong>
              <small style={{ color: '#64748b' }}>{agentEnabled ? (agentPausedUntil > Date.now() ? 'Dipause sementara' : 'Membalas WhatsApp otomatis dengan konteks servis & CRM') : 'OFF — pelanggan ditangani manual'}</small>
            </div>
          </div>
          <button type=\"button\" disabled={agentBusy} onClick={handleToggleAgent} style={{ minWidth: 115, border: 'none', borderRadius: 999, padding: '9px 14px', cursor: agentBusy ? 'wait' : 'pointer', background: agentEnabled ? '#16a34a' : '#334155', color: '#fff', fontWeight: 900 }}>
            {agentBusy ? 'Memproses...' : agentEnabled ? '🟢 AI ON' : '⚫ AI OFF'}
          </button>
        </div>
        {agentEnabled && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
          {agentPausedUntil > Date.now()
            ? <button type=\"button\" className=\"btn btn-ghost\" onClick={handleResumeAgent}><Play size={14} /> Aktifkan Sekarang</button>
            : <button type=\"button\" className=\"btn btn-ghost\" onClick={handlePauseAgent}><Pause size={14} /> Pause 1 Jam</button>}
        </div>}
        {agentStatus && <div style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 700, color: agentStatus.startsWith('❌') ? '#b91c1c' : '#166534' }}>{agentStatus}</div>}
      </div>

""" + segment_anchor
crm = replace_once(crm, segment_anchor, agent_card, 'CRM AI Agent card')

crm = replace_once(
    crm,
    "              <div style={{ color: '#166534', fontWeight: '900', fontSize: '1rem' }}>✍️ Editor Pesan + Gemini Copywriting</div>\n              <small style={{ color: '#64748b' }}>Tidak ada template tetap. Pesan sepenuhnya milik toko dan selalu bisa diedit.</small>",
    "              <div style={{ color: '#5b21b6', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={17} /> AI WhatsApp Copywriter</div>\n              <small style={{ color: '#64748b' }}>Ketik seperti ngobrol dengan AI. Gemini mengurus gaya, CTA, dan variabel UnitPro.</small>",
    'CRM composer title',
)

composer_anchor = "              <div style={{ color: '#5b21b6', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={17} /> AI WhatsApp Copywriter</div>"
pos = crm.index(composer_anchor)
form_start = crm.index("          <div style={{ marginTop: '12px', padding: '12px', background: '#fff', border: '1px solid #dbeafe', borderRadius: '14px' }}>", pos)
form_end_marker = "\n\n          <div style={{ marginTop: '12px' }}>"
form_end = crm.index(form_end_marker, form_start)
chat_form = """          <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: '#faf5ff', borderBottom: '1px solid #ede9fe', fontSize: '0.8rem', color: '#5b21b6', lineHeight: 1.45 }}>
              <b>🤖 UnitPro AI:</b> Ceritakan apa yang ingin disampaikan. Saya akan membuat pesan WhatsApp dan memilih personalisasi yang tepat otomatis.
            </div>
            <div style={{ padding: '10px' }}>
              <textarea className=\"input-field\" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} rows={4} placeholder=\"Contoh: Buat promo SSD 512GB untuk pelanggan laptop, ramah dan singkat...\" style={{ resize: 'vertical', lineHeight: 1.45 }} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
                <button type=\"button\" className=\"btn btn-ghost\" onClick={() => setCampaignGoal('Buat campaign promo barang yang stoknya tersedia dan relevan untuk target ini. Gunakan harga dan stok dari data UnitPro, jangan mengarang diskon.')} style={{ fontSize: '0.72rem' }}>📦 Promo Barang</button>
                <button type=\"button\" className=\"btn btn-ghost\" onClick={() => setCampaignGoal('Buat campaign jasa servis atau maintenance yang paling relevan untuk target ini berdasarkan data UnitPro.')} style={{ fontSize: '0.72rem' }}>🛠️ Promo Jasa</button>
                <button type=\"button\" className=\"btn btn-ghost\" onClick={() => setCampaignGoal(DEFAULT_GOALS.ready)} style={{ fontSize: '0.72rem' }}>✅ Servis Selesai</button>
                <button type=\"button\" className=\"btn btn-ghost\" onClick={() => setCampaignGoal(DEFAULT_GOALS.dormant)} style={{ fontSize: '0.72rem' }}>💤 Pelanggan Lama</button>
              </div>
              <button type=\"button\" className=\"btn\" onClick={() => handleGenerateCopy('')} disabled={isGeneratingCopy} style={{ marginTop: '9px', width: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff', fontWeight: '900' }}>
                <Sparkles size={16} /> {isGeneratingCopy ? 'AI sedang menulis...' : 'Buat Pesan ✨'}
              </button>
            </div>
          </div>"""
crm = crm[:form_start] + chat_form + crm[form_end:]

textarea_anchor = """            <textarea ref={messageRef} className=\"input-field\" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={9} placeholder={'Contoh: Halo Kak {nama_pelanggan}, ...'} style={{ resize: 'vertical', lineHeight: 1.5, background: '#fff' }} />"""
textarea_new = textarea_anchor + """
            {campaignMessage && <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
              <button type=\"button\" className=\"btn btn-ghost\" onClick={() => handleGenerateCopy('Buat lebih singkat dan langsung ke inti')} disabled={isGeneratingCopy}>Lebih Singkat</button>
              <button type=\"button\" className=\"btn btn-ghost\" onClick={() => handleGenerateCopy('Buat lebih ramah dan natural seperti CS toko Indonesia')} disabled={isGeneratingCopy}>Lebih Ramah</button>
              <button type=\"button\" className=\"btn btn-ghost\" onClick={() => handleGenerateCopy('Perbaiki copywriting tanpa mengubah fakta atau mengarang klaim baru')} disabled={isGeneratingCopy}>Perbaiki dengan AI</button>
            </div>}
            <small style={{ display: 'block', marginTop: '7px', color: '#64748b' }}>Variabel di bawah hanya untuk edit manual lanjutan. Gemini sudah memilih variabel otomatis.</small>"""
crm = replace_once(crm, textarea_anchor, textarea_new, 'CRM editable output')

crm_path.write_text(crm)

# 4) Secure app_config schema for encrypted global AI config + short conversation memory.
schema_path = ROOT / 'server/supabase_schema.sql'
schema = schema_path.read_text()
if 'CREATE TABLE IF NOT EXISTS app_config' not in schema:
    schema += """

-- 12. Private application config (server/service-role only)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_config FROM anon, authenticated;
"""
schema_path.write_text(schema)

print('AI Agent integration patch applied')
