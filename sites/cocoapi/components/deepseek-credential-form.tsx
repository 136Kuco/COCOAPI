'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

type State = {configured:boolean;vaultReady:boolean;source:string;revision:string;updatedAt:string|null};
export function DeepSeekCredentialForm({onSaved}:{onSaved:()=>Promise<void>}) {
  const [state,setState]=useState<State|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const active=useRef(true);
  const requestBusy=useRef(false);
  const load=useCallback(async()=>{
    const r=await fetch('/api/admin/credentials',{cache:'no-store',credentials:'same-origin'});
    const data=await r.json() as State&{error?:string};
    if(!r.ok)throw new Error(data.error||'无法读取配置状态。');
    if(active.current)setState(data);
  },[]);
  useEffect(()=>{
    active.current=true;
    const clear=()=>{if(input.current)input.current.value='';};
    const hide=()=>{if(document.visibilityState==='hidden')clear();};
    load().catch(()=>{if(active.current)setMessage('无法读取配置状态，请确认管理员权限后刷新。');});
    window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',hide);
    return ()=>{active.current=false;clear();window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',hide);};
  },[load]);
  async function submit(action:'save'|'remove') {
    if(!state||requestBusy.current)return;
    const key=input.current?.value||'';
    if(input.current)input.current.value='';
    if(action==='save'&&!/^sk-[A-Za-z0-9_-]{20,200}$/.test(key)){
      setMessage('请输入完整的 DeepSeek API Key。密钥不能包含星号、空格或换行。');return;
    }
    // Plaintext stays only in the input/request memory, never React state or browser storage.
    const payload=JSON.stringify(action==='save'?{action,key,revision:state.revision}:{action,revision:state.revision});
    requestBusy.current=true;setBusy(true);setMessage('');
    try {
      const r=await fetch('/api/admin/credentials',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:payload});
      const result=await r.json() as {error?:string};
      if(!r.ok){await load();throw new Error(result.error||'配置未保存。');}
      if(active.current)setMessage(action==='save'?'已加密保存。输入框已清空，可单独运行下方连接测试。':'已移除本站保存的密钥。此操作不等于在 DeepSeek 撤销密钥。');
      await load();await onSaved();
    } catch(e){if(active.current)setMessage(e instanceof Error?e.message:'结果暂无法确认，请刷新配置状态。');}
    finally {requestBusy.current=false;if(active.current)setBusy(false);}
  }
  return <div className="credential-panel" aria-labelledby="credential-heading">
    <div className="sectiontitle"><h3 id="credential-heading">DeepSeek · 安全配置密钥</h3><span className="tag">仅管理员</span></div>
    <p>填写在 DeepSeek 官方创建的新密钥。请先在官方后台撤销此前发到聊天中的旧密钥。</p>
    <dl className="credential-status"><div><dt>保存状态</dt><dd>{state?(state.configured?'已配置 · 尚待连接测试':'未配置'):'读取中…'}</dd></div><div><dt>安全存储</dt><dd>{state?(state.vaultReady?'服务端加密已就绪':'加密配置未就绪'):'检查中…'}</dd></div>{state?.updatedAt&&<div><dt>最近更新</dt><dd>{new Date(state.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</dd></div>}</dl>
    <form autoComplete="off" onSubmit={e=>{e.preventDefault();void submit('save');}}>
      <label htmlFor="deepseek-upstream-key">DeepSeek API Key</label>
      <input ref={input} id="deepseek-upstream-key" name="deepseek-upstream-key" type="password" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} data-lpignore="true" data-1p-ignore="true" placeholder="在此粘贴完整的新密钥（sk-…）" maxLength={203} disabled={busy||!state?.vaultReady} required aria-describedby="credential-note" />
      <p id="credential-note">通过 HTTPS 提交至本站后端，加密后保存；不会回显完整密钥，不写入浏览器存储。保存不会自动发送模型请求。</p>
      <div className="credential-actions"><button className="primary" type="submit" disabled={busy||!state?.vaultReady}>{busy?'处理中…':state?.configured?'替换并加密保存':'加密保存'}</button><button type="button" disabled={busy||!state} onClick={()=>{if(input.current)input.current.value='';setMessage('');void load().catch(()=>setMessage('状态刷新失败，请稍后重试。'));}}>清空输入并刷新</button>{state?.configured&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm('移除本站保存的 DeepSeek 密钥？此操作不撤销供应商官方密钥，后续测试将无法使用本站已存密钥。'))void submit('remove');}}>移除本站密钥</button>}</div>
    </form>
    <p role="status" aria-live="polite" className="credential-feedback">{message}</p>
  </div>;
}
