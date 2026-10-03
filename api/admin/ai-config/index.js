import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jgnyjgzwzksvheqhysye.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q9maq-FDzXKyyEl27EQXUw_SbuEagqv';

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
}

function normalizeModel(model) {
  const m = String(model || '').trim();
  if (!m || m === 'gemini-2.0-flash') return 'gemini-2.5-flash';
  return m;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle GET
  if (req.method === 'GET') {
    try {
      const client = getClient();
      const { data, error } = await client.from('app_config').select('value').eq('key', 'unitpro_ai_config').maybeSingle();
      if (error) throw error;

      let config = {};
      if (data?.value) {
        try { config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value; } catch {}
      }

      const apiKey = config.api_key || process.env.GEMINI_API_KEY || '';
      return res.status(200).json({
        enabled: config.enabled !== false,
        model: normalizeModel(config.model),
        has_api_key: Boolean(apiKey),
        masked_key: apiKey ? `••••••••${apiKey.slice(-4)}` : '',
        custom_instruction: config.custom_instruction || '',
        source: config.api_key ? 'super_admin' : (process.env.GEMINI_API_KEY ? 'environment' : 'none'),
      });
    } catch (err) {
      console.error('ai-config GET error:', err);
      return res.status(500).json({ error: 'Gagal memuat konfigurasi: ' + err.message });
    }
  }

  // Handle PUT (Save config)
  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const client = getClient();

      const { data: currentData } = await client.from('app_config').select('value').eq('key', 'unitpro_ai_config').maybeSingle();
      let current = {};
      if (currentData?.value) {
        try { current = typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value; } catch {}
      }

      const model = normalizeModel(body.model || current.model);
      const apiKey = String(body.api_key || '').trim() || current.api_key || '';

      const newConfig = {
        enabled: body.enabled !== false,
        model,
        api_key: apiKey,
        custom_instruction: String(body.custom_instruction ?? current.custom_instruction ?? '').slice(0, 8000),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await client.from('app_config').upsert({
        key: 'unitpro_ai_config',
        value: JSON.stringify(newConfig)
      });
      if (upsertErr) throw upsertErr;

      return res.status(200).json({
        success: true,
        enabled: newConfig.enabled,
        model: newConfig.model,
        has_api_key: Boolean(newConfig.api_key),
        masked_key: newConfig.api_key ? `••••••••${newConfig.api_key.slice(-4)}` : '',
        custom_instruction: newConfig.custom_instruction,
      });
    } catch (err) {
      console.error('ai-config PUT error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan konfigurasi: ' + err.message });
    }
  }

  // Handle POST (Test fallback if called directly)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const client = getClient();
      let apiKey = String(body.api_key || '').trim();
      let model = normalizeModel(body.model);

      if (!apiKey) {
        const { data: currentData } = await client.from('app_config').select('value').eq('key', 'unitpro_ai_config').maybeSingle();
        if (currentData?.value) {
          try {
            const current = typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value;
            apiKey = current.api_key || '';
            if (!body.model) model = normalizeModel(current.model);
          } catch {}
        }
        if (!apiKey) apiKey = process.env.GEMINI_API_KEY || '';
      }

      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API Key belum diisi atau disimpan.' });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Tes koneksi UnitPro. Balas: UNITPRO_OK' }] }],
          generationConfig: { maxOutputTokens: 32 },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = payload?.error?.message || `HTTP ${response.status}`;
        return res.status(response.status || 502).json({ error: `Tes Gemini gagal: ${msg}` });
      }

      const text = (payload?.candidates || [])
        .flatMap((c) => c?.content?.parts || [])
        .map((p) => p?.text || '')
        .join(' ')
        .trim();

      return res.status(200).json({ success: true, model, response: text || 'OK' });
    } catch (err) {
      console.error('ai-config POST error:', err);
      return res.status(500).json({ error: 'Tes Gemini gagal: ' + err.message });
    }
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  return res.status(405).json({ error: 'Method tidak diizinkan.' });
}
