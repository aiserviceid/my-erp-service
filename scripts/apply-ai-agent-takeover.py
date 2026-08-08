from pathlib import Path

path = Path('src/components/CustomerCRMInsights.jsx')
text = path.read_text()

def repl(old, new, label):
    global text
    if old not in text:
        raise RuntimeError(f'anchor missing: {label}')
    text = text.replace(old, new, 1)

state_anchor = """  const [agentStatus, setAgentStatus] = useState('');

  useEffect(() => {"""
state_new = """  const [agentStatus, setAgentStatus] = useState('');
  const [showAgentChats, setShowAgentChats] = useState(false);
  const [agentConversations, setAgentConversations] = useState([]);
  const [loadingAgentChats, setLoadingAgentChats] = useState(false);

  useEffect(() => {"""
repl(state_anchor, state_new, 'agent chat states')

handler_anchor = """  const copySegmentPhones = async () => {"""
handlers = """  const loadAgentConversations = async () => {
    if (!tenant?.code) return;
    setLoadingAgentChats(true);
    try {
      const result = await apiService.get(`/ai-agent/conversations/${tenant.code}`);
      setAgentConversations(Array.isArray(result) ? result : (result?.conversations || []));
    } catch (error) {
      setAgentStatus(`❌ Gagal memuat percakapan: ${error?.message || 'unknown error'}`);
    } finally {
      setLoadingAgentChats(false);
    }
  };

  const handleToggleAgentChats = async () => {
    const next = !showAgentChats;
    setShowAgentChats(next);
    if (next) await loadAgentConversations();
  };

  const handleConversationTakeover = async (conversation, takeover) => {
    try {
      const result = await apiService.post('/ai-agent/conversations/takeover', {
        tenant_code: tenant.code,
        phone: conversation.phone,
        takeover,
      });
      if (result?.error) throw new Error(result.error);
      setAgentStatus(takeover
        ? `👤 Chat ${conversation.name || conversation.phone} sekarang ditangani manusia.`
        : `🤖 Chat ${conversation.name || conversation.phone} dikembalikan ke AI Agent.`);
      await loadAgentConversations();
    } catch (error) {
      setAgentStatus(`❌ Gagal mengubah kontrol chat: ${error?.message || 'unknown error'}`);
    }
  };

""" + handler_anchor
repl(handler_anchor, handlers, 'takeover handlers')

button_anchor = """          {agentPausedUntil > Date.now()
            ? <button type=\"button\" className=\"btn btn-ghost\" onClick={handleResumeAgent}><Play size={14} /> Aktifkan Sekarang</button>
            : <button type=\"button\" className=\"btn btn-ghost\" onClick={handlePauseAgent}><Pause size={14} /> Pause 1 Jam</button>}
        </div>}"""
button_new = """          {agentPausedUntil > Date.now()
            ? <button type=\"button\" className=\"btn btn-ghost\" onClick={handleResumeAgent}><Play size={14} /> Aktifkan Sekarang</button>
            : <button type=\"button\" className=\"btn btn-ghost\" onClick={handlePauseAgent}><Pause size={14} /> Pause 1 Jam</button>}
          <button type=\"button\" className=\"btn btn-ghost\" onClick={handleToggleAgentChats}>👤 {showAgentChats ? 'Tutup Percakapan' : 'Ambil Alih Chat'}</button>
        </div>}"""
repl(button_anchor, button_new, 'takeover button')

segment_anchor = """      <div className=\"customer-segment-grid\" style={{ marginTop: '1rem' }}>"""
chat_panel = """      {showAgentChats && (
        <div style={{ marginTop: '10px', padding: '12px', borderRadius: '14px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a' }}>Percakapan AI Agent</strong>
              <small style={{ color: '#64748b' }}>Ambil alih chat kapan saja. AI berhenti membalas chat yang berstatus ditangani manusia.</small>
            </div>
            <button type=\"button\" className=\"btn btn-ghost\" onClick={loadAgentConversations} disabled={loadingAgentChats}><RefreshCw size={13} /> Refresh</button>
          </div>
          {loadingAgentChats ? <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Memuat percakapan...</div> : (
            <div style={{ display: 'grid', gap: '7px' }}>
              {agentConversations.slice(0, 15).map((conversation) => (
                <div key={conversation.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '11px', background: conversation.human_takeover ? '#fff7ed' : '#f8fafc', border: `1px solid ${conversation.human_takeover ? '#fed7aa' : '#e2e8f0'}` }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.83rem', color: '#0f172a' }}>{conversation.name || conversation.phone}</strong>
                    <small style={{ color: '#64748b', display: 'block', maxWidth: '520px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.last_message || 'Belum ada preview pesan'}</small>
                    <small style={{ color: conversation.human_takeover ? '#c2410c' : '#16a34a', fontWeight: 800 }}>{conversation.human_takeover ? '👤 Butuh/Admin Handling' : '🤖 AI Handling'}</small>
                  </div>
                  <button type=\"button\" className=\"btn btn-ghost\" onClick={() => handleConversationTakeover(conversation, !conversation.human_takeover)} style={{ whiteSpace: 'nowrap', fontSize: '0.74rem' }}>
                    {conversation.human_takeover ? '🤖 Kembalikan ke AI' : '👤 Ambil Alih'}
                  </button>
                </div>
              ))}
              {agentConversations.length === 0 && <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '8px' }}>Belum ada percakapan AI Agent yang tersimpan.</div>}
            </div>
          )}
        </div>
      )}

""" + segment_anchor
repl(segment_anchor, chat_panel, 'conversation panel')

path.write_text(text)
print('human takeover UI patch applied')
