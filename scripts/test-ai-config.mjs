import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import ai from '../server/ai-config.cjs';
import { createAiConfigHandler } from '../server/ai-config-handler.mjs';

const originalEnv = { ...process.env };
process.env.JWT_SECRET = 'unitpro-local-test-secret-not-a-production-key';
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_MODEL;
after(() => { for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]; Object.assign(process.env, originalEnv); });
function database(value, error = null) {
  const state = { value, error, writes: [] };
  const query = {
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: state.value == null ? null : { value: state.value }, error: state.error }; },
    async upsert(row, options) { state.writes.push({ row, options }); if (!state.error) state.value = row.value; return { error: state.error }; },
  };
  return { state, from(table) { assert.equal(table, 'app_config'); return query; } };
}
const goodReply = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'private thought' }, { text: 'UNITPRO_GEMINI_OK' }] } }] }) });
function response() {
  return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
}
const token = role => jwt.sign({ role }, process.env.JWT_SECRET, { expiresIn: '5m' });
async function request(handler, method, body, authorization = `Bearer ${token('super_admin')}`) {
  const res = response(); await handler({ method, body, headers: { authorization } }, res); return res;
}
test('retired/default model migration and current options', () => {
  for (const old of ['', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001', 'models/gemini-2.0-flash-lite']) assert.equal(ai.normalizeModel(old), ai.DEFAULT_MODEL);
  assert.equal(ai.normalizeModel('gemini-3.5-flash-lite'), 'gemini-3.5-flash-lite');
  assert.throws(() => ai.normalizeModel('../secrets'), /tidak valid/);
  assert.ok(ai.MODEL_OPTIONS.every(m => !/^gemini-(1\.5|2\.0)/.test(m.id)));
});
test('save/read key encrypted, public result never exposes key, blank preserves key', async () => {
  const db = database(); const secret = 'unit-test-gemini-key-xyz123';
  const saved = await ai.saveConfig({ enabled: true, api_key: secret, model: 'gemini-2.0-flash', custom_instruction: 'Sapa Kak' }, db);
  const stored = JSON.parse(db.state.value);
  assert.match(stored.api_key_enc, /^enc:v1:/); assert.ok(!db.state.value.includes(secret)); assert.ok(!('api_key' in stored));
  assert.equal(saved.apiKey, secret); assert.equal(saved.model, ai.DEFAULT_MODEL);
  const publicResult = ai.publicConfig(saved); assert.equal(publicResult.has_api_key, true); assert.ok(!JSON.stringify(publicResult).includes(secret));
  const updated = await ai.saveConfig({ model: 'gemini-3.5-flash-lite', api_key: '' }, db);
  assert.equal(updated.apiKey, secret); assert.equal(updated.customInstruction, 'Sapa Kak'); assert.equal(updated.enabled, true);
  assert.equal((await ai.readConfig(db)).apiKey, secret);
});
test('plaintext legacy data migrates on save and encrypted key works for testing', async () => {
  const db = database(JSON.stringify({ api_key: 'legacy-test-key', enabled: false, model: 'gemini-2.0-flash' }));
  assert.equal((await ai.readConfig(db)).apiKey, 'legacy-test-key');
  await ai.saveConfig({ custom_instruction: 'baru' }, db);
  assert.ok(!db.state.value.includes('legacy-test-key')); assert.match(JSON.parse(db.state.value).api_key_enc, /^enc:/);
  let sent;
  const result = await ai.testConfig({}, db, async (url, options) => { sent = { url, options }; return goodReply(); });
  assert.equal(sent.options.headers['x-goog-api-key'], 'legacy-test-key'); assert.equal(result.success, true);
  const body = JSON.parse(sent.options.body); assert.ok(!('store' in body)); assert.ok(!sent.url.includes('legacy-test-key'));
});
test('clear key keeps environment fallback and never persists environment secrets', async () => {
  process.env.GEMINI_API_KEY = 'environment-test-key';
  const db = database(JSON.stringify({ api_key: 'old-test-key', enabled: true }));
  const cleared = await ai.saveConfig({ clear_api_key: true }, db);
  assert.equal(cleared.source, 'environment'); assert.equal(cleared.apiKey, 'environment-test-key');
  assert.ok(!db.state.value.includes('environment-test-key')); assert.ok(!db.state.value.includes('old-test-key'));
  delete process.env.GEMINI_API_KEY;
});
test('database read failures cannot overwrite a key; missing table/permissions are actionable', async () => {
  for (const [code, expected] of [['42501', 'CONFIG_ACCESS_DENIED'], ['42P01', 'CONFIG_TABLE_MISSING'], ['PGRST205', 'CONFIG_TABLE_MISSING']]) {
    const db = database('do-not-overwrite', { code, message: 'private details' });
    await assert.rejects(ai.saveConfig({ api_key: 'new-test-key' }, db), e => e.code === expected && e.status === 503 && !e.message.includes('private details'));
    assert.equal(db.state.writes.length, 0);
  }
  const corrupted = database('not JSON');
  await assert.rejects(ai.saveConfig({}, corrupted), e => e.code === 'CONFIG_INVALID'); assert.equal(corrupted.state.writes.length, 0);
});
test('invalid types and malformed models are rejected before persistence', async () => {
  for (const body of [[], null, { enabled: 'false' }, { clear_api_key: 'true' }, { api_key: {} }, { custom_instruction: {} }, { model: '../bad' }]) {
    const db = database(); await assert.rejects(ai.saveConfig(body, db), e => e.status === 400); assert.equal(db.state.writes.length, 0);
  }
});
test('Gemini unavailable/invalid key/quota/network/empty responses are not false successes', async () => {
  const db = database(JSON.stringify({ api_key: 'test-key' }));
  for (const status of [404, 403, 429, 500]) await assert.rejects(ai.testConfig({}, db, async () => ({ ok: false, status, json: async () => ({ error: { message: 'test-key private upstream details' } }) })), e => e.code === `GEMINI_HTTP_${status}` && !e.message.includes('test-key'));
  await assert.rejects(ai.testConfig({}, db, async () => { throw new Error('test-key'); }), e => e.code === 'GEMINI_NETWORK_ERROR');
  await assert.rejects(ai.testConfig({}, db, async () => ({ ok: true, json: async () => ({ candidates: [] }) })), e => e.code === 'GEMINI_EMPTY_RESPONSE');
  const mismatch = await ai.testConfig({}, db, async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'different' }] } }] }) }));
  assert.equal(mismatch.success, false); assert.equal(mismatch.response, 'Respons tes tidak sesuai.');
});
test('Vercel GET/PUT/POST/test enforce real JWT and super_admin role', async () => {
  const db = database(); const handler = createAiConfigHandler({ clientFactory: () => db, test: (body, client) => ai.testConfig(body, client, goodReply) });
  for (const method of ['GET', 'PUT', 'POST']) {
    assert.equal((await request(handler, method, {}, '')).statusCode, 401);
    assert.equal((await request(handler, method, {}, `Bearer ${token('tenant')}`)).statusCode, 403);
    assert.equal((await request(handler, method, {}, 'Bearer forged')).statusCode, 401);
  }
  assert.equal(db.state.writes.length, 0);
  const saved = await request(handler, 'PUT', { api_key: 'route-test-key', enabled: true }); assert.equal(saved.statusCode, 200); assert.equal(saved.body.success, true);
  const loaded = await request(handler, 'GET'); assert.equal(loaded.body.has_api_key, true); assert.equal(loaded.headers['Cache-Control'], 'no-store, max-age=0');
  assert.ok(!JSON.stringify(loaded.body).includes('route-test-key'));
  assert.equal((await request(handler, 'POST', {})).body.success, true);
  assert.equal((await request(handler, 'PUT', '{')).statusCode, 400);
  const testHandler = createAiConfigHandler({ testOnly: true, clientFactory: () => db, test: (body, client) => ai.testConfig(body, client, goodReply) });
  assert.equal((await request(testHandler, 'GET')).statusCode, 405); assert.equal((await request(testHandler, 'POST', {})).body.success, true);
});
test('anon key alone cannot be used as the server database client', () => {
  const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(() => ai.getAdminClient(), e => e.status === 503 && e.code === 'SERVER_CONFIG_MISSING');
  if (saved !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
});
test('Express routes share the same persistence/test logic', async () => {
  const { default: express } = await import('express');
  const { default: agent } = await import('../server/ai-agent.cjs');
  const db = database(); const app = express(); app.use(express.json());
  const original = { readConfig: ai.readConfig, saveConfig: ai.saveConfig, testConfig: ai.testConfig };
  ai.readConfig = () => original.readConfig(db);
  ai.saveConfig = body => original.saveConfig(body, db);
  ai.testConfig = body => original.testConfig(body, db, goodReply);
  agent.registerAiAgentRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/admin/ai-config`;
    assert.equal((await fetch(url)).status, 401);
    const headers = { Authorization: `Bearer ${token('super_admin')}`, 'Content-Type': 'application/json' };
    const saved = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ api_key: 'express-test-key', enabled: true }) });
    assert.equal(saved.status, 200); assert.equal((await saved.json()).success, true);
    assert.equal((await (await fetch(url, { headers })).json()).has_api_key, true);
    assert.equal((await (await fetch(url + '/test', { method: 'POST', headers, body: '{}' })).json()).success, true);
    assert.ok(!db.state.value.includes('express-test-key'));
  } finally { Object.assign(ai, original); await new Promise(resolve => server.close(resolve)); }
});
