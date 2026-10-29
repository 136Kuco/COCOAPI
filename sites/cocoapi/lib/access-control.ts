export function adminAllowed(request:Request,userId:string|null,ownerId:string|undefined):boolean {
  if(!ownerId||!userId||userId!==ownerId)return false;
  if(request.headers.get('sec-fetch-site')==='cross-site')return false;
  return request.method==='GET'||request.headers.get('origin')===new URL(request.url).origin;
}
