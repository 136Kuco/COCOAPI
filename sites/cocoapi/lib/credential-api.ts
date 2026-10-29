import {BodyError,boundedJSON} from './request-body.ts';
import {CredentialConflict,credentialStore} from './credential-store.ts';
import {validDeepSeekKey} from './vault-crypto.ts';

type Dependencies = {
  authorize:(request:Request)=>Promise<boolean>;
  vault:()=>ReturnType<typeof credentialStore>;
};
function response(value:unknown,status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
export function credentialHandlers(deps:Dependencies) {
  return {
    async GET(request:Request) {
      if(!await deps.authorize(request))return response({error:'仅管理员可查看密钥配置状态。'},403);
      try{return response(await deps.vault().status());}
      catch{return response({error:'密钥存储暂不可用，请稍后重试。'},503);}
    },
    async POST(request:Request) {
      // Authorization precedes body parsing and store access.
      if(!await deps.authorize(request))return response({error:'仅管理员可修改密钥。请重新登录。'},403);
      if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return response({error:'需要 JSON 请求。'},415);
      let body;
      try {
        body=await boundedJSON(request,1024);
        if(!body||Array.isArray(body)||typeof body!=='object')return response({error:'请求格式错误。'},400);
        if(typeof body.revision!=='string'||!(/^(absent|[a-f0-9-]{36})$/).test(body.revision))return response({error:'请刷新配置状态后重试。'},400);
        const fields=Object.keys(body).sort().join(',');
        if(body.action==='save'){
          if(fields!=='action,key,revision'||!validDeepSeekKey(body.key))return response({error:'请填写完整的 DeepSeek API Key，不能使用星号遮罩、Tracking ID 或带空格的内容。'},400);
        }else if(body.action!=='remove'||fields!=='action,revision')return response({error:'不支持的配置操作。'},400);
      } catch(e){return response({error:e instanceof BodyError?(e.status===413?'提交内容过大。':'请求格式错误。'):'请求格式错误。'},e instanceof BodyError?e.status:400);}
      try {
        const vault=deps.vault();
        return response(body.action==='save'?await vault.save(body.key,body.revision):await vault.remove(body.revision));
      } catch(e){
        if(e instanceof CredentialConflict)return response({error:'配置已在另一页面变更。本次未保存，请刷新后重试。'},409);
        return response({error:'密钥保存未完成。请检查服务端加密配置与数据库状态。'},503);
      }
    },
  };
}
