import {env} from 'cloudflare:workers';
import {credentialStore} from '../../../../lib/credential-store';
import {admin,database,json} from '../../../../lib/core';
import {BodyError,boundedJSON} from '../../../../lib/request-body';
import {PROBE_MODEL,probeDeepSeek,reservationSQL,shanghaiDay} from '../../../../lib/upstream-probe';

export async function POST(request:Request){
  if(!await admin(request))return json({error:'Forbidden'},403);
  try {
    const body=await boundedJSON(request,256);
    if(!body || body.action!=='test_deepseek' || Object.keys(body).length!==1)return json({error:'Invalid test request'},400);
  } catch(e){ return json({error:e instanceof BodyError?e.message:'Invalid request'},e instanceof BodyError?e.status:400); }
  let key:string|null;
  try {key=await credentialStore(database(),env as unknown as {COCO_VAULT_KEY?:string;DEEPSEEK_API_KEY?:string}).read();}
  catch {return json({error:'密钥解密或存储不可用，未发送上游请求。'},503);}
  if(!key)return json({error:'请先在渠道管理中安全保存 DeepSeek 密钥。'},503);
  const id=crypto.randomUUID(),at=new Date(),started=Date.now(),day=shanghaiDay(at);
  let db;
  try {
    db=database();
    // SQLite executes the INSERT/SELECT atomically: parallel callers cannot
    // exceed 3 reservations/day. Ambiguous failures consume a slot too.
    const reserved=await db.prepare(reservationSQL).bind(id,day,at.toISOString(),PROBE_MODEL,day).run();
    if(reserved.meta.changes!==1)return json({error:'Daily diagnostic limit reached (3/day, Asia/Shanghai). No upstream request sent.'},429);
  } catch {return json({error:'Test reservation unavailable. No upstream request sent.'},503);}
  const result=await probeDeepSeek(key);
  try {
    await db.prepare('UPDATE connection_tests SET status=?,category=?,latency=?,upstream_status=?,input_tokens=?,output_tokens=? WHERE id=?')
      .bind(result.status,result.category,Date.now()-started,result.upstreamStatus,result.inputTokens,result.outputTokens,id).run();
  } catch { return json({id,error:'Test may have reached upstream, but result storage failed. Do not assume zero cost.',gatewayReady:false},503); }
  return json({id,...result,model:PROBE_MODEL,supplierCost:null,costStatus:'unknown',gatewayReady:false},result.status);
}
