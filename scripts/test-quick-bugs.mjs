import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { escapeHtml, safeImageUrl } from '../src/utils/safeHtml.js';
import { publicTenant } from '../src/utils/publicTenant.js';
import { getAttendanceSchedule } from '../src/utils/attendanceUtils.js';

const source = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
function storage() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }; }
function api({ fetchImpl, result = { data: null, error: { message: 'database failed' } } } = {}) {
  const localStorage = storage(); const calls = [];
  const query = { select() { return this; }, eq() { return this; }, single() { return Promise.resolve(result); }, maybeSingle() { return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }, update(value) { calls.push(['update', value]); return this; },
    insert(value) { calls.push(['insert', value]); return this; }, delete() { calls.push(['delete']); return this; } };
  const context = { URLSearchParams, publicTenant, supabase: { from(table) { calls.push(['from', table]); return query; } },
    localStorage, window: { location: { hostname: 'localhost' }, localStorage }, console: { log() {}, warn() {}, error() {} },
    setTimeout() {}, fetch: fetchImpl || (async () => ({ ok: false, json: async () => ({ error: 'PIN Salah' }) })) };
  const code = source('src/services/api.js').replace(/^import .*;\r?$/gm, '').replaceAll('import.meta.env.VITE_API_URL', "''").replace('export const apiService =', 'globalThis.apiService =');
  vm.runInNewContext(code, context); return { service: context.apiService, calls, localStorage };
}
test('wrong PIN, network errors and HTML login never fall back to direct database writes', async () => {
  for (const fetchImpl of [async () => ({ ok: false, json: async () => ({ error: 'PIN Salah' }) }), async () => { throw new Error('offline'); }, async () => ({ ok: true, json: async () => { throw new Error('HTML'); } })]) {
    const a = api({ fetchImpl }); await assert.rejects(a.service.loginTenant('QA', '', '9999'));
    assert.equal(a.calls.length, 0); assert.equal(a.localStorage.getItem('TENANT_TOKEN'), null);
  }
});
test('valid server login preserves server fields and does not write PIN or settings to Supabase', async () => {
  const a = api({ fetchImpl: async () => ({ ok: true, json: async () => ({ code: 'QA', name: 'Toko', token: 'signed-server-token', pin: 'secret', tier: 'pro' }) }) });
  a.localStorage.setItem('EMP_SESSION', '{}'); a.localStorage.setItem('EMPLOYEE_TOKEN', 'old');
  const result = await a.service.loginTenant('QA', '', '1234');
  assert.equal(result.tenant.pin, undefined); assert.equal(result.tenant.tier, 'pro'); assert.equal(a.calls.length, 0);
  assert.equal(a.localStorage.getItem('EMP_SESSION'), null); assert.equal(a.localStorage.getItem('TENANT_TOKEN'), 'signed-server-token');
});
test('API headers choose active employee session instead of stale owner token', () => {
  const a = api(); a.localStorage.setItem('TENANT_TOKEN', 'owner'); a.localStorage.setItem('EMPLOYEE_TOKEN', 'employee'); a.localStorage.setItem('EMP_SESSION', '{}');
  assert.equal(a.service.getHeaders().Authorization, 'Bearer employee');
});
test('failed stock writes reject and do not insert phantom stock movements', async () => {
  const a = api(); await assert.rejects(a.service.updateProduct(1, { stock: 9, tenant_code: 'QA' }, 10));
  assert.equal(a.calls.some(c => c[0] === 'insert'), false);
});
test('successful stock edit still returns the stored product', async () => {
  const a = api({ result: { data: { id: 1, stock: 9, tenant_code: 'QA' }, error: null } });
  const updated = await a.service.updateProduct(1, { stock: 9, tenant_code: 'QA' }, 9); assert.equal(updated.id, 1); assert.equal(updated.stock, 9);
});
test('negative, zero, NaN, fractional and unsafe withdrawals fail before database access', async () => {
  for (const amount of [-500, 0, 'NaN', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const a = api(); await assert.rejects(a.service.requestWithdraw({ tenant_code: 'QA', amount }), /positif/); assert.equal(a.calls.length, 0);
  }
});
test('failed reset stops and never claims success', async () => {
  const a = api(); await assert.rejects(a.service.resetTenantData('QA')); assert.equal(a.calls.filter(c => c[0] === 'delete').length, 1);
});
test('public settings allowlist excludes secrets and nested config even for JSON strings', () => {
  const settings = { storeName: 'QA', fonnte_token: 'PRIVATE', ai_key: 'PRIVATE', bank_details: 'PRIVATE', ads: [{ title: 'Promo', token: 'PRIVATE' }] };
  for (const value of [settings, JSON.stringify(settings)]) {
    const result = publicTenant({ code: 'QA', name: 'Toko', tier: 'pro', pin: 'PRIVATE', settings: value });
    assert.equal(result.settings.storeName, 'QA'); assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  }
});
test('HTML escaping and image URL guard prevent markup/attribute injection', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(safeImageUrl('javascript:alert(1)'), ''); assert.equal(safeImageUrl('data:image/svg+xml,<svg/>'), '');
  assert.ok(!safeImageUrl('https://example.test/" onerror="x').includes('"'));
});
test('both actual customer renderers escape hostile customer names including selected confirmation', () => {
  for (const file of ['src/services/adminCustomerLookupHotfix.js', 'src/services/customerDataEnhancer.js']) {
    const name = file.includes('Hotfix') ? 'renderPanel' : 'renderSuggestions';
    const text = source(file); const start = text.indexOf('const ' + name + ' ='); const end = text.indexOf('\n};', start) + 3;
    const handlers = [], buttons = []; const panel = { style: {}, innerHTML: '', querySelector: () => ({ appendChild: button => buttons.push(button) }) };
    const suggestions = () => [{ name: '<img src=x onerror=attack()>', phone: '<bad>', serviceCount: '<svg>' }];
    const context = { escapeHtml, findCustomerSuggestions: suggestions, mergedSuggestions: suggestions, localPhone: x => x,
      document: { createElement: () => ({ style: {}, addEventListener: (name, handler) => handlers.push(handler) }) }, applyCustomer() {}, applyCustomerToAdminForm() {} };
    vm.runInNewContext(text.slice(start, end) + '\nglobalThis.render = ' + name + ';', context);
    context.render({ querySelector: () => ({ value: 'QA' }) }, panel, [], ''); assert.equal(buttons.length, 1); assert.ok(!buttons[0].innerHTML.includes('<img')); assert.ok(buttons[0].innerHTML.includes('&lt;img'));
    handlers[0](); assert.ok(!panel.innerHTML.includes('<img'));
  }
});
test('logout and tenant switch clear in-memory cart, employee and stale credentials', () => {
  const localStorage = storage(); let state;
  const create = initializer => { state = initializer(update => { const next = typeof update === 'function' ? update(state) : update; Object.assign(state, next); }); return state; };
  const text = source('src/store/useStore.js'); const end = text.indexOf('// Keep Lifetime Free');
  vm.runInNewContext(text.slice(0, end).replace(/^import .*;\r?$/gm, '').replace('export const useStore =', 'globalThis.useStore ='), { create, localStorage, window: {} });
  state.cart = [{ id: 1 }]; state.employee = { id: 2 }; state.clearTenant(); assert.equal(state.cart.length, 0); assert.equal(state.employee, null);
  state.setTenant({ code: 'A', name: 'A', token: 'A-token', phone: '123' }); state.cart = [{ id: 1 }]; state.employee = { id: 2 };
  state.setTenant({ code: 'B', name: 'B' }); assert.equal(state.cart.length, 0); assert.equal(state.employee, null); assert.equal(state.tenant.token, null); assert.equal(state.tenant.phone, null);
});
test('zero attendance tolerance remains zero; missing tolerance defaults to ten', () => {
  assert.equal(getAttendanceSchedule({ attendance_late_tolerance: 0 }).toleranceMinutes, 0);
  assert.equal(getAttendanceSchedule({}).toleranceMinutes, 10);
  assert.equal(getAttendanceSchedule({ attendance_late_tolerance: -5 }).toleranceMinutes, 0);
});
test('GET tenant guard accepts valid tenant and rejects conflicting body tenant hints', () => {
  const text = source('server/index.cjs'); const start = text.indexOf('const enforceTenantAccess ='); const end = text.indexOf('\n};', start) + 3;
  const context = {}; vm.runInNewContext(text.slice(start, end) + '\nglobalThis.guard = enforceTenantAccess;', context);
  let passed = false, status = null; const res = { status(n) { status = n; return this; }, json() {} };
  context.guard({ user: { code: 'QA', role: 'tenant' }, params: { tenant: 'QA' } }, res, () => { passed = true; }); assert.equal(passed, true);
  passed = false; context.guard({ user: { code: 'QA' }, body: { tenant_code: 'QA', code: 'OTHER' } }, res, () => { passed = true; }); assert.equal(passed, false); assert.equal(status, 403);
});
test('numeric POS ids no longer use toLowerCase on a number', () => {
  const text = source('src/components/POSView.jsx'); assert.ok(!text.includes('p.id.toLowerCase()')); assert.ok(!text.includes('p.name.toLowerCase()'));
  assert.equal(String(1 ?? '').toLowerCase().includes('1'), true);
});
test('unsigned URL snapshots and requested pickup cannot override server truth', () => {
  assert.ok(!source('src/services/publicServiceLookupEnhancer.js').includes('decodePayload'));
  const text = source('src/pages/PublicPrintReceipt.jsx'); assert.ok(!text.includes('decodePayload')); assert.ok(text.includes("const isPaid = status === 'DIAMBIL'"));
});
test('owner guard rejects technician and cashier from settings/credentials/wallet operations', () => {
  const text = source('server/index.cjs'); const start = text.indexOf('const requireOwner ='); const end = text.indexOf('\n};', start) + 3;
  const context = {}; vm.runInNewContext(text.slice(start, end) + '\nglobalThis.guard = requireOwner;', context);
  for (const role of ['TEKNISI', 'KASIR']) {
    let passed = false, status; const res = { status(n) { status = n; return this; }, json() {} };
    context.guard({ user: { role } }, res, () => { passed = true; }); assert.equal(passed, false); assert.equal(status, 403);
  }
});
test('WhatsApp HTML 200 and missing status never report sent; confirmed gateway response succeeds', async () => {
  const text = source('src/services/notificationService.js'); const start = text.indexOf('const sendThroughBackendGateway ='); const end = text.indexOf('\n};', start) + 3;
  const context = { API_BASE_URL: '/api', getApiAuthToken: () => 'test-token' };
  vm.runInNewContext(text.slice(start, end) + '\nglobalThis.send = sendThroughBackendGateway;', context);
  for (const response of [{ ok: true, status: 200, json: async () => { throw new Error('HTML'); } }, { ok: true, status: 200, json: async () => ({}) }]) {
    context.fetch = async () => response; await assert.rejects(context.send({ tenant: { code: 'QA' }, target: '123', message: 'qa' }), /mengonfirmasi/);
  }
  context.fetch = async () => ({ ok: true, json: async () => ({ status: 'sent', provider: 'fonnte' }) });
  assert.equal((await context.send({ tenant: { code: 'QA' }, target: '123', message: 'qa' })).status, 'sent');
});
test('public receipt endpoint sanitizes settings and distinguishes database failure from not found', async () => {
  const { default: handler } = await import('../api/public-service.js'); const originalFetch = globalThis.fetch;
  function res() { return { statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(value) { this.body = value; return this; } }; }
  try {
    globalThis.fetch = async url => new Response(JSON.stringify(String(url).includes('/services') ? [{ resi: 'QA', tenant_code: 'QA' }] : [{ code: 'QA', settings: { storeName: 'QA', fonnte_token: 'PRIVATE' } }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    let result = res(); await handler({ method: 'GET', query: { resi: 'QA' } }, result); assert.equal(result.statusCode, 200); assert.ok(!JSON.stringify(result.body).includes('PRIVATE'));
    globalThis.fetch = async () => new Response(JSON.stringify({ code: '42P01', message: 'missing table' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    result = res(); await handler({ method: 'GET', query: { resi: 'QA' } }, result); assert.equal(result.statusCode, 503);
    globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    result = res(); await handler({ method: 'GET', query: { resi: 'QA' } }, result); assert.equal(result.statusCode, 404);
  } finally { globalThis.fetch = originalFetch; }
});

test('public metadata helper uses sanitized endpoint; internal metadata preserves commission settings', async () => {
  let requested;
  const a = api({ fetchImpl: async url => { requested = url; return { ok: true, json: async () => ({ code: 'QA', settings: { storeName: 'QA', fonnte_token: 'PRIVATE' } }) }; }, result: { data: { code: 'QA', settings: { commission: 25 } }, error: null } });
  const visible = await a.service.getTenantPublic('QA');
  assert.ok(requested.includes('/public-tenant?')); assert.ok(!JSON.stringify(visible).includes('PRIVATE')); assert.equal(a.calls.length, 0);
  assert.equal((await a.service.getTenantForSession('QA')).settings.commission, 25);
});
test('public tenant endpoint rejects invalid input, strips private fields and reports database outages', async () => {
  const { default: handler } = await import('../api/public-tenant.js'); const old = globalThis.fetch;
  const response = () => ({ statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
  try {
    let r = response(); await handler({ method: 'GET', query: { tenant_code: '<bad>' } }, r); assert.equal(r.statusCode, 400);
    globalThis.fetch = async () => new Response(JSON.stringify([{ code: 'QA', settings: { storeName: 'QA', fonnte_token: 'PRIVATE' } }]), { headers: { 'Content-Type': 'application/json' } });
    r = response(); await handler({ method: 'GET', query: { tenant_code: 'QA' } }, r); assert.equal(r.statusCode, 200); assert.ok(!JSON.stringify(r.body).includes('PRIVATE'));
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'db unavailable' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    r = response(); await handler({ method: 'GET', query: { tenant_code: 'QA' } }, r); assert.equal(r.statusCode, 503);
  } finally { globalThis.fetch = old; }
});

test('employee client fails closed without browser database queries or synthetic tokens', async () => {
  for (const fetchImpl of [async () => ({ok:false,json:async()=>({error:'PIN salah'})}), async()=>{throw new Error('offline');}, async()=>({ok:true,json:async()=>({user:{id:1,tenant_code:'QA',role:'TEKNISI'},token:'EMP_1_123'})}),async()=>({ok:true,json:async()=>{throw new Error('HTML');}})]) {
    const a=api({fetchImpl});await assert.rejects(a.service.loginEmployee('QA','1234'));assert.equal(a.calls.length,0);assert.equal(a.localStorage.getItem('EMPLOYEE_TOKEN'),null);
  }
  const a=api({fetchImpl:async()=>({ok:true,json:async()=>({user:{id:1,tenant_code:'QA',role:'TEKNISI',pin:'PRIVATE'},token:'header.payload.signature'})})});
  const result=await a.service.loginEmployee('QA','1234');assert.equal(result.user.pin,undefined);assert.equal(a.calls.length,0);assert.equal(a.localStorage.getItem('EMPLOYEE_TOKEN'),result.token);
});
test('employee login switches tenant before setting employee session', () => {
  const text=source('src/pages/EmployeePortal.jsx');const start=text.indexOf('const data = await apiService.loginEmployee');const end=text.indexOf('} catch',start);const code=text.slice(start,end);
  assert.ok(code.indexOf('setTenant(')<code.indexOf('setEmployee(empData)'));assert.ok(!code.includes("'free', data.token"));
});
