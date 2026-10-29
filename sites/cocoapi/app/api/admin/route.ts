import {env} from 'cloudflare:workers';
import {admin,database,digest,json} from '../../../lib/core';
import {BodyError,boundedJSON} from '../../../lib/request-body';
import {credentialStore} from '../../../lib/credential-store';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function GET(request:Request){
 if(!await admin(request)){
  const user=await getChatGPTUser();const configured=!!(env as unknown as Record<string,string>).ADMIN_USER_ID;
  return json({error:configured?'Administrator access denied':'Administrator binding required',setupRequired:!configured,setupUserId:!configured?user?.userId||null:null},403);
 }
 try{
  const db=database();
  const [keys,logs,tests,credentials]=await Promise.all([
   db.prepare('SELECT id,name,prefix,enabled,created FROM api_keys ORDER BY created DESC LIMIT 100').all(),
   db.prepare('SELECT * FROM request_logs ORDER BY at DESC LIMIT 200').all(),
   db.prepare('SELECT * FROM connection_tests ORDER BY at DESC LIMIT 30').all(),
   credentialStore(db,env as unknown as {COCO_VAULT_KEY?:string;DEEPSEEK_API_KEY?:string}).status(),
  ]);
  return json({keys:keys.results,logs:logs.results,tests:tests.results,adminConfigured:true,databaseReady:true,deepseekConfigured:credentials.configured,vaultReady:credentials.vaultReady,gatewayReady:false});
 }catch{return json({error:'Database migration or binding is unavailable',setupRequired:false},503);}
}
export async function POST(request:Request){
 if(!await admin(request))return json({error:'Forbidden'},403);
 let body:any;
 try{body=await boundedJSON(request,2048);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Object required'},400);}
 catch(e){return json({error:e instanceof BodyError?e.message:'Invalid request'},e instanceof BodyError?e.status:400);}
 try{
  const db=database();
  if(body.action==='create'){
   const name=typeof body.name==='string'?body.name.trim():'';
   if(!name||name.length>80)return json({error:'Name must be 1–80 characters'},400);
   const secret='coco_'+Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const id=crypto.randomUUID();
   const result=await db.prepare('INSERT INTO api_keys(id,name,hash,prefix,enabled,created) SELECT ?,?,?,?,1,? WHERE (SELECT count(*) FROM api_keys)<100')
    .bind(id,name,await digest(secret),secret.slice(0,13),new Date().toISOString()).run();
   if(result.meta.changes!==1)return json({error:'Key capacity reached'},409);
   return json({id,secret},201);
  }
  if(typeof body.id!=='string'||body.id.length>50||!body.id)return json({error:'Invalid key id'},400);
  let result;
  if(body.action==='delete')result=await db.prepare('DELETE FROM api_keys WHERE id=?').bind(body.id).run();
  else if(body.action==='set_enabled'&&typeof body.enabled==='boolean')result=await db.prepare('UPDATE api_keys SET enabled=? WHERE id=?').bind(body.enabled?1:0,body.id).run();
  else return json({error:'Unknown action'},400);
  if(result.meta.changes!==1)return json({error:'Key not found'},404);
  return json({ok:true});
 }catch{return json({error:'Database unavailable'},503);}
}
