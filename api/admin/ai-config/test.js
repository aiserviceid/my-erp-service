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

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

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
    console.error('ai-config/test error:', err);
    return res.status(500).json({ error: 'Tes Gemini gagal: ' + err.message });
  }
}
