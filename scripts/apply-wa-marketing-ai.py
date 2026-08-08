from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Backend: central WhatsApp gateway proxy + Gemini copywriting endpoint.
# ---------------------------------------------------------------------------
path = 'server/index.cjs'
text = read(path)

text = replace_once(
    text,
    "const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';\n",
    "const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';\n"
    "const FONNTE_SYSTEM_TOKEN = process.env.FONNTE_TOKEN || '';\n"
    "const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';\n"
    "const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';\n",
    'server env constants',
)

anchor = "const secureRoute = [authenticateToken, enforceTenantAccess];\n\n"
insert = r"""const secureRoute = [authenticateToken, enforceTenantAccess];

const normalizeGatewayPhone = (value = '') => {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

const parseTenantSettings = (rawSettings) => {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'object') return rawSettings;
  try { return JSON.parse(rawSettings); } catch { return {}; }
};

const getTenantGatewayConfig = async (tenantCode) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('settings')
        .eq('code', tenantCode)
        .maybeSingle();
      const settings = parseTenantSettings(data?.settings);
      if (settings.wa_sender_mode || settings.fonnte_token) {
        return {
          mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
          token: settings.fonnte_token || '',
        };
      }
    } catch (error) {
      console.warn('Gateway settings Supabase lookup warning:', error.message);
    }
  }

  return new Promise((resolve) => {
    db.get('SELECT settings FROM tenants WHERE code = ?', [tenantCode], (err, row) => {
      if (err || !row) return resolve({ mode: 'SYSTEM', token: '' });
      const settings = parseTenantSettings(row.settings);
      resolve({
        mode: String(settings.wa_sender_mode || 'SYSTEM').toUpperCase(),
        token: settings.fonnte_token || '',
      });
    });
  });
};

app.post('/api/whatsapp/send', secureRoute, async (req, res) => {
  const tenantCode = String(req.body?.tenant_code || req.user?.tenant || req.user?.code || '').trim().toUpperCase();
  const target = normalizeGatewayPhone(req.body?.target);
  const message = String(req.body?.message || '').trim();
  if (!tenantCode) return res.status(400).json({ error: 'Kode toko wajib diisi.' });
  if (!/^[0-9]{9,15}$/.test(target)) return res.status(400).json({ error: 'Nomor WhatsApp tujuan tidak valid.' });
  if (!message || message.length > 5000) return res.status(400).json({ error: 'Pesan WhatsApp wajib diisi dan maksimal 5000 karakter.' });

  const savedConfig = await getTenantGatewayConfig(tenantCode);
  const requestedMode = String(req.body?.gateway_mode || savedConfig.mode || 'SYSTEM').toUpperCase();
  const customToken = String(req.body?.gateway_token || savedConfig.token || '').trim();
  const gatewayToken = requestedMode === 'CUSTOM' ? customToken : (FONNTE_SYSTEM_TOKEN || customToken);

  if (!gatewayToken) {
    return res.status(503).json({
      error: requestedMode === 'CUSTOM'
        ? 'Token WhatsApp Gateway belum diisi. Simpan token Fonnte di Pengaturan WhatsApp.'
        : 'Gateway sistem belum dikonfigurasi di server.',
      code: 'WA_GATEWAY_NOT_CONFIGURED',
    });
  }

  try {
    const providerResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: gatewayToken },
      body: new URLSearchParams({ target, message }),
    });
    const providerPayload = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok || providerPayload?.status === false) {
      const reason = providerPayload?.reason || providerPayload?.detail || providerPayload?.message || `HTTP ${providerResponse.status}`;
      return res.status(502).json({ error: `WhatsApp Gateway menolak pengiriman: ${reason}` });
    }
    return res.json({ status: 'sent', provider: 'fonnte', target });
  } catch (error) {
    console.error('WhatsApp gateway proxy error:', error.message);
    return res.status(502).json({ error: 'Tidak dapat terhubung ke WhatsApp Gateway.' });
  }
});

app.post('/api/ai/copywriting', secureRoute, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini belum dikonfigurasi. Tambahkan GEMINI_API_KEY di environment server.' });
  }

  const goal = String(req.body?.goal || '').trim().slice(0, 1200);
  const segmentLabel = String(req.body?.segment_label || 'Pelanggan').trim().slice(0, 100);
  const tone = String(req.body?.tone || 'Ramah, singkat, profesional').trim().slice(0, 120);
  const cta = String(req.body?.cta || '').trim().slice(0, 300);
  if (!goal) return res.status(400).json({ error: 'Tujuan campaign wajib diisi.' });

  const supportedVariables = [
    '{nama_pelanggan}', '{nama_toko}', '{resi}', '{perangkat}',
    '{biaya}', '{link_tracking}', '{hari_sejak_terakhir}', '{jumlah_transaksi}'
  ];
  const systemInstruction = [
    'Anda adalah copywriter WhatsApp untuk toko servis elektronik di Indonesia.',
    'Tulis SATU pesan WhatsApp siap pakai dalam Bahasa Indonesia.',
    'Jangan buat klaim harga, diskon, bonus, garansi, stok, atau tenggat yang tidak disebutkan pengguna.',
    'Gunakan placeholder dinamis persis seperti yang disediakan dan jangan menggantinya dengan nama contoh.',
    'Gunakan minimal {nama_pelanggan} dan {nama_toko}.',
    'Pesan harus mudah dibaca, tidak spammy, tidak manipulatif, dan memiliki CTA yang jelas.',
    'Jangan gunakan code fence, judul analisis, atau penjelasan di luar isi pesan.',
    'Idealnya 300-900 karakter kecuali tujuan membutuhkan lebih pendek.'
  ].join(' ');
  const input = [
    `Segment pelanggan: ${segmentLabel}.`,
    `Tujuan campaign: ${goal}`,
    `Gaya bahasa: ${tone}.`,
    cta ? `CTA yang diinginkan: ${cta}` : '',
    `Placeholder yang boleh digunakan: ${supportedVariables.join(', ')}.`
  ].filter(Boolean).join('\n');

  try {
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input,
        system_instruction: systemInstruction,
        store: false,
        generation_config: { thinking_level: 'low' },
      }),
    });
    const payload = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      const reason = payload?.error?.message || `HTTP ${geminiResponse.status}`;
      return res.status(502).json({ error: `Gemini gagal membuat copywriting: ${reason}` });
    }

    const stepText = (payload.steps || [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content || [])
      .filter((item) => item?.type === 'text' && item?.text)
      .map((item) => item.text)
      .join('\n')
      .trim();
    const legacyText = (payload.outputs || [])
      .filter((item) => item?.type === 'text' && item?.text)
      .map((item) => item.text)
      .join('\n')
      .trim();
    const generatedText = String(payload.output_text || stepText || legacyText || '').trim();
    if (!generatedText) return res.status(502).json({ error: 'Gemini tidak mengembalikan teks copywriting.' });
    return res.json({ text: generatedText, model: GEMINI_MODEL });
  } catch (error) {
    console.error('Gemini copywriting error:', error.message);
    return res.status(502).json({ error: 'Tidak dapat terhubung ke Gemini API.' });
  }
});

"""
text = replace_once(text, anchor, insert, 'backend gateway and gemini routes')
write(path, text)


# ---------------------------------------------------------------------------
# Admin UI: all legacy marketing send buttons use notificationService gateway.
# ---------------------------------------------------------------------------
path = 'src/pages/AdminDashboard.jsx'
text = read(path)
text = replace_once(
    text,
    "window.open(buildManualWhatsAppUrl(cleanPhone, personalizedMsg), '_blank');",
    "sendWhatsAppNotification({ tenant, target: cleanPhone, message: personalizedMsg, openManual: true });",
    'legacy campaign gateway send',
)
text = replace_once(
    text,
    "window.open(buildManualWhatsAppUrl(cleanPhone, msgText), '_blank');",
    "sendWhatsAppNotification({ tenant, target: cleanPhone, message: msgText, openManual: true });",
    'single customer gateway send',
)
text = replace_once(
    text,
    "<label className=\"label\">Token API Fonnte / Wablas Toko Anda:</label>",
    "<label className=\"label\">Token WhatsApp Gateway (Fonnte):</label>",
    'gateway token label',
)
text = replace_once(
    text,
    "🔑 Pesan notifikasi akan dikirimkan langsung menggunakan nomor server WhatsApp Anda sendiri.",
    "🔑 Token ini dipakai untuk notifikasi servis, pesan teknisi, kirim satu pelanggan, dan broadcast WhatsApp Marketing.",
    'gateway token explanation',
)
write(path, text)

print('WA Marketing AI/Gateway patches applied successfully.')
