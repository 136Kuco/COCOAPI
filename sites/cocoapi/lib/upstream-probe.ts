import {boundedJSON} from './request-body.ts';

export const PROBE_MODEL = 'deepseek-flash';
export const PROBE_LIMIT = 3;
export const reservationSQL = `INSERT INTO connection_tests(id,day,at,status,category,latency,model)
 SELECT ?,?,?,0,'reserved',0,? WHERE
 (SELECT count(*) FROM connection_tests WHERE day=?) < 3`;

export function shanghaiDay(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0,10);
}

type ProbeResult = {
  status: number; category: string; upstreamStatus: number | null;
  inputTokens: number | null; outputTokens: number | null; reply: string | null;
};
const empty = {upstreamStatus:null, inputTokens:null, outputTokens:null, reply:null};

// This is an administrator-only diagnostic, not general gateway forwarding.
// Fixed destination/payload, no redirects, retries, client prompts or client keys.
export async function probeDeepSeek(key: string, fetcher: typeof fetch = fetch, timeoutMs = 15000): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher('https://api.deepseek.com/chat/completions', {
      method:'POST', redirect:'error', signal:controller.signal,
      headers:{'Authorization':`Bearer ${key}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:PROBE_MODEL, messages:[{role:'user',content:'Reply with exactly OK.'}], max_tokens:16, stream:false, thinking:{type:'disabled'}}),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return {...empty, status:502, upstreamStatus:response.status, category:'upstream_http_error'};
    }
    const data = await boundedJSON(response, 65536);
    const reply = data?.choices?.[0]?.message?.content;
    const input = data?.usage?.prompt_tokens;
    const output = data?.usage?.completion_tokens;
    if (typeof reply !== 'string' || !reply.trim() || data.model !== PROBE_MODEL || data?.choices?.[0]?.finish_reason !== 'stop') {
      return {...empty, status:502, upstreamStatus:response.status, category:'invalid_upstream_response'};
    }
    const usageKnown = Number.isSafeInteger(input) && input > 0 && Number.isSafeInteger(output) && output > 0;
    return {status:200, category:usageKnown?'model_response_verified':'model_response_usage_unknown', upstreamStatus:200,
      inputTokens:usageKnown?input:null, outputTokens:usageKnown?output:null,
      // Do not reflect arbitrary upstream text or error messages into the UI.
      reply:reply.trim() === 'OK' ? 'OK' : '[模型已返回文本，内容未保存]'};
  } catch {
    return {...empty, status:controller.signal.aborted?504:502, category:controller.signal.aborted?'upstream_timeout':'upstream_network_or_protocol_error'};
  } finally { clearTimeout(timer); }
}
