export class BodyError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// Count streamed bytes; Content-Length is neither mandatory nor trustworthy.
export async function boundedJSON(source: Request | Response, maxBytes: number): Promise<any> {
  if (Number(source.headers.get('content-length')) > maxBytes) throw new BodyError('Body too large', 413);
  if (!source.body) throw new BodyError('JSON body required', 400);
  const reader = source.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new BodyError('Body too large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new BodyError('Invalid JSON', 400); }
}
