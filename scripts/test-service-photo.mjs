import puppeteer from 'puppeteer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const photoFixture=join(tmpdir(),'unitpro-test-photo.png');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4175'],{cwd:root,stdio:'ignore'});
let browser; const users=[],services=[], errors=[];
const store={code:'QA-LOCAL',name:'Toko QA',tier:'free',settings:{storeName:'Toko QA'}};
try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4175')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || undefined,args:process.env.UNITPRO_CHROMIUM_ARGS ? JSON.parse(readFileSync(process.env.UNITPRO_CHROMIUM_ARGS)).filter(a=>a!=='--single-process') : ['--no-sandbox','--disable-setuid-sandbox'],headless:true});
 const page=await browser.newPage();page.setDefaultTimeout(6000); await page.setViewport({width:390,height:844});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{console.log('DIALOG',d.message());await d.accept();});
 await page.evaluateOnNewDocument(()=>{localStorage.setItem('TENANT_CODE','QA-LOCAL');localStorage.setItem('TENANT_NAME','Toko QA');localStorage.setItem('TENANT_TIER','free');localStorage.setItem('TENANT_TOKEN','qa');});
 await page.setRequestInterception(true);
 page.on('request',async req=>{
  if(req.url().startsWith('http://127.0.0.1:4175')||req.url().startsWith('data:'))return req.continue();
  if(req.url().includes('/rest/v1/')){
   const table=new URL(req.url()).pathname.split('/').pop();let data=[];const method=req.method();
   if(table==='tenants')data=store;
   if(table==='users'){
    if(method==='POST'){const body=JSON.parse(req.postData());users.push({...body,id:1});data=users.at(-1);}else data=users;
   }
   if(table==='services'){
    if(method==='POST'){const body=JSON.parse(req.postData());services.push({...body,created_at:new Date().toISOString()});data=services.at(-1);}else data=services;
   }
   return req.respond({status:200,headers:{'Access-Control-Expose-Headers':'Content-Range','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,HEAD,OPTIONS','Access-Control-Allow-Origin':'*','Content-Type':'application/json','Content-Range':`0-${Math.max(0,users.length-1)}/${users.length}`},body:method==='HEAD'?'':JSON.stringify(data)});
  }
  return req.abort();
 });
 await page.goto('http://127.0.0.1:4175/admin');await page.waitForSelector('.nav-item');
 async function clickText(text){await page.evaluate(text=>{const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().replace(/^\d+\s*/, '')===text);if(!el)throw new Error('Missing button '+text);el.click();},text);}
 await clickText('Tim');await page.waitForSelector('#newEmpName');
 await page.$eval('.employee-action-disclosure',e=>e.open=true);
 await page.type('#newEmpName','Teknisi QA');await page.type('#newEmpPin','4321');await page.click('.employee-add-form button');
 await page.waitForFunction(()=>document.querySelector('.employee-add-form button').disabled);
 await page.waitForFunction(()=>document.querySelector('.employee-table').textContent.includes('Teknisi QA'));
 assert.equal(users.length,1);
 // Verify API also blocks a second member even when bypassing the disabled UI.
 const message=await page.evaluate(async()=>{const {apiService}=await import('/src/services/api.js');try{await apiService.post('/users',{tenant_code:'QA-LOCAL',name:'Second',role:'TEKNISI',pin:'1234'});return 'allowed';}catch(e){return e.message;}});
 assert.match(message,/maksimal 1/);assert.equal(users.length,1);
 for(const button of await page.$$('[aria-live="polite"] button'))await button.click();
 await clickText('Servis');await page.waitForFunction(()=>document.body.textContent.includes('Daftarkan'));
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Daftarkan')).click());
 await page.waitForSelector('.service-registration-form');
 assert.equal(await page.$eval('input[capture]',e=>e.getAttribute('capture')),'environment');
 async function fill(name){for(const [field,value] of Object.entries({name,phone:'081234567890',device:name+' Samsung Note 10',kelengkapan:'Unit',issue:'Layar'})){await page.type(`.service-registration-form [name="${field}"]`,value);}await page.select('[name="technician_id"]','1');}
 await fill('Tanpa Foto');await page.click('.service-registration-submit');await page.waitForFunction(()=>!document.querySelector('.service-registration-form'));assert.equal(services.length,1);assert.ok(!services[0].photo_url);
 for(const button of await page.$$('[aria-live="polite"] button'))await button.click();
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Daftarkan')).click());await page.waitForSelector('.service-registration-form');await fill('Dengan Foto');
 const fixture=await page.evaluate(()=>{let c=document.createElement('canvas');c.width=2200;c.height=1800;let x=c.getContext('2d');x.fillStyle='#336699';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1];});writeFileSync(photoFixture,Buffer.from(fixture,'base64'));
 await (await page.$('input[aria-label="Pilih foto kondisi unit"]')).uploadFile(photoFixture);
 await page.waitForSelector('img[alt="Pratinjau foto kondisi unit"]');
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent==='Hapus foto').click());assert.equal(await page.$('img[alt="Pratinjau foto kondisi unit"]'),null);
 await (await page.$('input[capture]')).uploadFile(photoFixture);await page.waitForSelector('img[alt="Pratinjau foto kondisi unit"]');
 await page.click('.service-add-unit');
 await page.evaluate(()=>{const card=document.querySelector('.unitpro-admin-extra-unit');for(const [field,value] of Object.entries({device:'Laptop kedua',kelengkapan:'Unit',issue:'Keyboard',technician_id:'1'})){const el=card.querySelector(`[data-unit-field="${field}"]`);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}});
 await page.click('.service-registration-submit');await page.waitForFunction(()=>!document.querySelector('.service-registration-form'));assert.equal(services.length,3);assert.ok(!services[2].photo_url);assert.match(services[1].photo_url,/^data:image\/(webp|jpeg);base64,/);assert.ok(services[1].photo_url.length<700000);
 await page.waitForSelector('.nav-item');await clickText('Servis');await page.waitForSelector('details img[alt="Kondisi unit saat diterima"]');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:['Free first member allowed','Second member blocked in UI and API','Optional service without photo','Camera capture attribute','Gallery compression, preview, removal','Photo persisted and displayed', 'Multi-unit intake keeps photo on first unit'],photoBytes:services[1].photo_url.length,pageErrors:errors},null,2));
}finally{await browser?.close();server.kill();}
