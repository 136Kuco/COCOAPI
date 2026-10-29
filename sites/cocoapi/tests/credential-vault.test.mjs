import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {credentialStore} from '../lib/credential-store.ts';
import {credentialHandlers} from '../lib/credential-api.ts';
import {adminAllowed} from '../lib/access-control.ts';
import {openCredential,sealCredential} from '../lib/vault-crypto.ts';

const randomRoot=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
const disposableKey=()=>`sk-${crypto.randomUUID().replaceAll('-','')}`;
function adapter(sqlite){
 return {prepare(sql){return {bind(...args){return {
  async first(){return sqlite.prepare(sql).get(...args)||null},
  async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}},
 }},async first(){return sqlite.prepare(sql).get()||null}}}};
}
function setup(config={COCO_VAULT_KEY:randomRoot()}){
 const db=new DatabaseSync(':memory:');
 for(const path of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+path,import.meta.url),'utf8'));
 const vault=credentialStore(adapter(db),config);
 const api=credentialHandlers({authorize:async r=>adminAllowed(r,r.headers.get('x-test-user'),'owner-fixture'),vault:()=>vault});
 return {db,vault,api,config};
}
function request(body,{user='owner-fixture',origin='https://console.test',contentType='application/json',...options}={}){
 return new Request('https://console.test/api/admin/credentials',{method:'POST',headers:{'x-test-user':user,'Origin':origin,'Content-Type':contentType},body:typeof body==='string'?body:JSON.stringify(body),...options});
}
const save=(api,key,revision='absent')=>api.POST(request({action:'save',key,revision}));

test('AES-GCM randomized envelopes authenticate tampering and reject wrong roots',async()=>{
 const key=disposableKey(),root=randomRoot();
 const a=await sealCredential(key,root),b=await sealCredential(key,root);
 assert.notEqual(a,b);assert.ok(!a.includes(key));assert.equal(await openCredential(a,root),key);
 await assert.rejects(()=>openCredential(a,randomRoot()),/vault unavailable/);
 const tampered=JSON.parse(a);tampered.data='A'+tampered.data.slice(1);
 // Change an authenticated byte deterministically.
 const raw=Buffer.from(tampered.data,'base64');raw[0]^=1;tampered.data=raw.toString('base64');
 await assert.rejects(()=>openCredential(JSON.stringify(tampered),root),/vault unavailable/);
});
test('save and replacement persist ciphertext only; status/API never reveal secret',async()=>{
 const {db,vault,api}=setup(),key=disposableKey();
 const response=await save(api,key);assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.ok(!JSON.stringify(result).includes(key));
 const row=db.prepare('SELECT * FROM provider_secrets').get();assert.ok(!JSON.stringify(row).includes(key));
 assert.equal(await vault.read(),key);
 const status=await vault.status();assert.equal(status.configured,true);assert.ok(!JSON.stringify(status).includes(row.envelope));
 const replacement=disposableKey();assert.equal((await save(api,replacement,result.revision)).status,200);
 assert.equal(await vault.read(),replacement);
 assert.equal((await save(api,key,result.revision)).status,409);assert.equal(await vault.read(),replacement);
 db.close();
});
test('stale first-save revision cannot overwrite a concurrent save',async()=>{
 const {db,api,vault}=setup(),a=disposableKey(),b=disposableKey();
 const results=await Promise.all([save(api,a),save(api,b)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.ok([a,b].includes(await vault.read()));db.close();
});
test('removal clears ciphertext and disables legacy environment fallback',async()=>{
 const key=disposableKey(),{db,vault,api}=setup({COCO_VAULT_KEY:randomRoot(),DEEPSEEK_API_KEY:key});
 assert.equal(await vault.read(),key);
 const response=await api.POST(request({action:'remove',revision:'absent'}));assert.equal(response.status,200);
 assert.equal(await vault.read(),null);assert.equal((await vault.status()).configured,false);
 assert.equal(db.prepare('SELECT envelope FROM provider_secrets').get().envelope,null);db.close();
});
test('missing/wrong encryption configuration fails closed without saving plaintext',async()=>{
 const {db,api}=setup({});const key=disposableKey();
 const response=await save(api,key);assert.equal(response.status,503);assert.ok(!(await response.text()).includes(key));
 assert.equal(db.prepare('SELECT count(*) AS n FROM provider_secrets').get().n,0);db.close();
});
test('unauthorized, cross-origin and cross-site requests never read/write the vault',async()=>{
 let calls=0;
 const api=credentialHandlers({authorize:async r=>adminAllowed(r,r.headers.get('x-test-user'),'owner-fixture'),vault:()=>{calls++;throw Error('must not be reached')}});
 for(const options of [{user:''},{user:'other'},{origin:'https://attacker.test'}, {headers:{'x-test-user':'owner-fixture','Origin':'https://console.test','Sec-Fetch-Site':'cross-site','Content-Type':'application/json'}}]){
  assert.equal((await api.POST(request({action:'save',key:disposableKey(),revision:'absent'},options))).status,403);
 }
 assert.equal((await api.GET(new Request('https://console.test/api/admin/credentials'))).status,403);
 assert.equal(calls,0);
});
test('reject masked keys, IDs, malformed data, wrong content types and oversized bodies',async()=>{
 const {db,api}=setup();
 for(const key of ['tracking-id','sk-123***456','sk-short',disposableKey()+'\n'])assert.equal((await save(api,key)).status,400);
 assert.equal((await api.POST(request('{}',{contentType:'text/plain'}))).status,415);
 assert.equal((await api.POST(request('x'.repeat(2048)))).status,413);
 assert.equal((await api.POST(request('{broken-json'))).status,400);
 assert.equal((await api.POST(request({action:'save',key:disposableKey(),revision:'absent',url:'https://other.test'}))).status,400);
 assert.equal(db.prepare('SELECT count(*) AS n FROM provider_secrets').get().n,0);db.close();
});
test('encrypted credentials survive database reconnect without exposing their contents',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'coco-vault-test-')),path=join(dir,'db.sqlite'),root=randomRoot(),key=disposableKey();
 try {
  let db=new DatabaseSync(path);
  db.exec(readFileSync(new URL('../drizzle/0002_misty_wonder_man.sql',import.meta.url),'utf8'));
  await credentialStore(adapter(db),{COCO_VAULT_KEY:root}).save(key,'absent');db.close();
  db=new DatabaseSync(path);assert.equal(await credentialStore(adapter(db),{COCO_VAULT_KEY:root}).read(),key);
  await assert.rejects(()=>credentialStore(adapter(db),{COCO_VAULT_KEY:randomRoot()}).read(),/vault unavailable/);
  db.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
