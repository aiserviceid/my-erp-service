import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createEmployeeLoginHandler } from '../server/employee-login-handler.mjs';
const secret = 'local-test-only-secret-not-for-production';
const hash = await bcrypt.hash('1234', 4);
const user = { id: 1, name: 'QA', role: 'TEKNISI', tenant_code: 'QA', pin: hash, phone: '0800' };
function client(rows = [user], { dbError = false, migrationError = false, conflict = false } = {}) {
  const writes = [];
  return { writes, from(table) {
    assert.equal(table, 'users');
    const filters = []; let update;
    return { select() { return this; }, eq(k,v) { filters.push([k,v]); return this; },
      limit() { return Promise.resolve({ data: rows, error: dbError ? { message: 'PRIVATE DATABASE ERROR' } : null }); },
      update(v) { update = v; return this; }, maybeSingle() { writes.push({ update, filters }); return Promise.resolve({ data: conflict ? null : { id: 1 }, error: migrationError ? {} : null }); } };
  } };
}
function response() { return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.statusCode=n; return this; }, json(body) { this.body=body; return this; } }; }
const request = (pin = '1234') => ({ method: 'POST', body: { tenant_code: 'qa', pin }, socket: { remoteAddress: 'test-local' } });
async function run(store, req = request(), options = {}) { const handler = createEmployeeLoginHandler({ clientFactory: () => store, secret: () => secret, ...options }); const res = response(); await handler(req,res); return res; }
test('hashed PIN authenticates employee with signed tenant-scoped JWT and no PIN disclosure', async () => {
  const store = client(); const res = await run(store); assert.equal(res.statusCode, 200);
  const token = jwt.verify(res.body.token, secret, { algorithms: ['HS256'] });
  assert.equal(token.tenant, 'QA'); assert.equal(token.id, 1); assert.equal(token.role, 'TEKNISI'); assert.equal(token.exp-token.iat, 8*3600);
  assert.equal(res.body.user.pin, undefined); assert.equal(store.writes.length, 0); assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('legacy PIN migrates with compare-and-swap before token is issued', async () => {
  const store = client([{ ...user, pin: '1234' }]); const res=await run(store); assert.equal(res.statusCode,200);
  assert.equal(store.writes.length,1); assert.equal(await bcrypt.compare('1234',store.writes[0].update.pin),true);
  assert.ok(store.writes[0].filters.some(([k,v])=>k==='pin'&&v==='1234')); assert.equal(res.body.user.pin,undefined);
});
test('PIN migration failure or concurrent modification fails closed', async () => {
  for(const options of [{migrationError:true},{conflict:true}]) { const res=await run(client([{...user,pin:'1234'}],options)); assert.equal(res.statusCode,503); assert.equal(res.body.token,undefined); }
});
test('wrong PIN, disallowed role, cross-tenant user and duplicate PIN never issue a token', async () => {
  for(const rows of [[user], [{...user,role:'super_admin'}], [{...user,tenant_code:'OTHER'}], [user,{...user,id:2}]]) {
    const res=await run(client(rows), request(rows.length===1&&rows[0]===user?'9999':'1234')); assert.equal(res.statusCode,401); assert.equal(res.body.token,undefined);
  }
});
test('invalid input and unsupported method never access database', async () => {
  const handler=createEmployeeLoginHandler({clientFactory:()=>{throw new Error('Must not access');}, secret:()=>secret});
  for(const req of [{method:'GET'}, {...request(),body:'bad'}, {...request(),body:{tenant_code:'QA',pin:{bad:true}}}, {...request(),body:{tenant_code:'DEMO-STORE',pin:'1234'}}]) { const res=response(); await handler(req,res); assert.ok([400,405].includes(res.statusCode)); }
});
test('missing signing secret and database errors return controlled 503 without internal error', async () => {
  for(const res of [await run(client(),request(),{secret:()=>''}),await run(client([],{dbError:true}))]) { assert.equal(res.statusCode,503); assert.equal(res.body.token,undefined); assert.ok(!JSON.stringify(res.body).includes('PRIVATE')); }
});
test('worker rate limiter stops repeated PIN guesses and permits retry after timeout', async () => {
  let stamp=100;const handler=createEmployeeLoginHandler({clientFactory:()=>client(),secret:()=>secret,now:()=>stamp,maxAttempts:2,windowMs:1000});
  for(let i=0;i<2;i++){const res=response();await handler(request('9999'),res);assert.equal(res.statusCode,401);}
  let res=response();await handler(request(),res);assert.equal(res.statusCode,429); assert.equal(res.headers['Retry-After'],'1');
  stamp=1101;res=response();await handler(request(),res);assert.equal(res.statusCode,200);
});

test('commission dates follow exact receipt payment evidence, not intake or another tenant', async () => {
  const { commissionPaidAt } = await import('../src/utils/commissionDate.js');
  const service={resi:'QA-1',tenant_code:'QA',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'};
  const rows=[{tenant_code:'QA',type:'INCOME_JASA',description:'Jasa Servis Resi QA-1',created_at:'2026-10-03T01:00:00Z'},{tenant_code:'OTHER',type:'INCOME',description:'Resi QA-1',created_at:'2026-10-04T00:00:00Z'}, {tenant_code:'QA',type:'INCOME',description:'Resi QA-10',created_at:'2026-10-05T00:00:00Z'}];
  assert.equal(commissionPaidAt(service,rows),'2026-10-03T01:00:00.000Z');assert.equal(commissionPaidAt(service,[]),null);assert.equal(commissionPaidAt({...service,paid_at:'2026-10-02T00:00:00Z'},[]),'2026-10-02T00:00:00.000Z');
});
