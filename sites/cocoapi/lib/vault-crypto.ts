const encoder = new TextEncoder();
const purpose = encoder.encode('cocoapi:upstream:deepseek:v1');

function decode64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
function encode64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value));
}
export function rootReady(root: unknown): root is string {
  if (typeof root !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(root)) return false;
  try { return decode64(root).byteLength === 32; } catch { return false; }
}
async function importRoot(root: string): Promise<CryptoKey> {
  if (!rootReady(root)) throw new Error('Credential vault unavailable');
  return crypto.subtle.importKey('raw', decode64(root), {name:'AES-GCM'}, false, ['encrypt','decrypt']);
}
export function validDeepSeekKey(value: unknown): value is string {
  return typeof value === 'string' && /^sk-[A-Za-z0-9_-]{20,200}$/.test(value);
}
export async function sealCredential(plaintext: string, root: string): Promise<string> {
  if (!validDeepSeekKey(plaintext)) throw new Error('Invalid credential format');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:purpose,tagLength:128}, await importRoot(root), encoder.encode(plaintext));
  return JSON.stringify({v:1,iv:encode64(iv),data:encode64(new Uint8Array(ciphertext))});
}
export async function openCredential(envelope: string, root: string): Promise<string> {
  try {
    if (envelope.length > 1024) throw new Error();
    const sealed = JSON.parse(envelope);
    if (sealed.v !== 1 || typeof sealed.iv !== 'string' || typeof sealed.data !== 'string') throw new Error();
    const iv = decode64(sealed.iv);
    if (iv.length !== 12) throw new Error();
    const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:purpose,tagLength:128}, await importRoot(root), decode64(sealed.data));
    const key = new TextDecoder().decode(clear);
    if (!validDeepSeekKey(key)) throw new Error();
    return key;
  } catch { throw new Error('Credential vault unavailable'); }
}
