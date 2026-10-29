import test from 'node:test';
import assert from 'node:assert/strict';
import {probeDeepSeek,shanghaiDay,PROBE_MODEL} from '../lib/upstream-probe.ts';
import {boundedJSON} from '../lib/request-body.ts';
const good = () => ({model:PROBE_MODEL,choices:[{finish_reason:'stop',message:{content:'OK'}}],usage:{prompt_tokens:9,completion_tokens:1}});

test('probe uses fixed destination and bounded non-streaming request', async()=>{
 const result=await probeDeepSeek('test-only-secret',async(url,options)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  assert.equal(options.redirect,'error');
  const body=JSON.parse(options.body);
  assert.equal(body.max_tokens,16); assert.equal(body.stream,false);
  assert.equal(body.thinking.type,'disabled');
  return Response.json(good());
 });
 assert.equal(result.category,'model_response_verified');
 assert.equal(result.inputTokens,9);
});
test('missing usage is unknown, never verified zero',async()=>{
 const body=good();delete body.usage;
 const result=await probeDeepSeek('test-only-secret',async()=>Response.json(body));
 assert.equal(result.category,'model_response_usage_unknown');
 assert.equal(result.inputTokens,null);assert.equal(result.outputTokens,null);
});
test('upstream errors never reflect secrets, prompts or raw errors',async()=>{
 const result=await probeDeepSeek('test-only-secret',async()=>new Response('test-only-secret',{status:401}));
 assert.equal(result.upstreamStatus,401);
 assert.equal(result.reply,null); assert.ok(!JSON.stringify(result).includes('test-only-secret'));
});
test('timeouts are cancelled and reported as ambiguous failures',async()=>{
 const result=await probeDeepSeek('test-only-secret',async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout')))),5);
 assert.equal(result.status,504);assert.equal(result.inputTokens,null);
});
test('redirect failures do not become successful tests',async()=>{
 const result=await probeDeepSeek('test-only-secret',async()=>{throw TypeError('redirect blocked')});
 assert.equal(result.status,502);assert.equal(result.reply,null);
});
test('overlarge upstream body is bounded even without content length',async()=>{
 const result=await probeDeepSeek('test-only-secret',async()=>new Response(' '.repeat(70000)));
 assert.equal(result.status,502);
});
test('truncated completion is not a verified model response',async()=>{
 const body=good();body.choices[0].finish_reason='length';
 assert.equal((await probeDeepSeek('test-only-secret',async()=>Response.json(body))).status,502);
});
test('byte limit counts multibyte UTF8 and cancels oversized streams',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('你'.repeat(100)));},cancel(){cancelled=true;}});
 await assert.rejects(()=>boundedJSON(new Response(stream),256),e=>e.status===413);
 assert.equal(cancelled,true);
});
test('daily cap resets at Shanghai midnight',()=>{
 assert.equal(shanghaiDay(new Date('2026-10-29T15:59:59Z')),'2026-10-29');
 assert.equal(shanghaiDay(new Date('2026-10-29T16:00:00Z')),'2026-10-30');
});
