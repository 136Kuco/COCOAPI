import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {adminAllowed} from './access-control';
export function database(){if(!env.DB)throw new Error('Database binding unavailable');return env.DB;}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function admin(request:Request){
 const user=await getChatGPTUser(); const owner=(env as unknown as Record<string,string>).ADMIN_USER_ID;
 return adminAllowed(request,user?.userId||null,owner);
}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function authenticate(request:Request){const auth=request.headers.get('authorization')||'';if(!/^Bearer coco_[a-f0-9]{64}$/.test(auth))return null;return database().prepare('SELECT id,name FROM api_keys WHERE hash=? AND enabled=1').bind(await digest(auth.slice(7))).first<{id:string,name:string}>();}
export async function gateway(request:Request){
 try {const key=await authenticate(request);if(!key)return json({error:{type:'authentication_error',message:'Invalid or revoked API key'}},401);
 const at=Date.now();
 await database().prepare('INSERT INTO request_logs(id,key_id,at,status,category,latency) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),key.id,new Date().toISOString(),503,'gateway_not_validated',Date.now()-at).run();
 return json({error:{type:'gateway_not_validated',message:'P0 gate closed: upstream credentials, atomic budget enforcement and external client access have not passed acceptance. No upstream request was made.'}},503);
 }catch{return json({error:{type:'service_unavailable',message:'Gateway storage unavailable'}},503);}
}
