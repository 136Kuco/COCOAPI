import {openCredential,rootReady,sealCredential} from './vault-crypto.ts';

type RuntimeConfig = {COCO_VAULT_KEY?:string; DEEPSEEK_API_KEY?:string};
type CredentialRow = {envelope:string|null; revision:string; updated_at:string};
export class CredentialConflict extends Error {}
export const insertCredentialSQL = "INSERT INTO provider_secrets(provider,envelope,revision,updated_at) VALUES('deepseek',?,?,?) ON CONFLICT(provider) DO NOTHING";
export const updateCredentialSQL = "UPDATE provider_secrets SET envelope=?,revision=?,updated_at=? WHERE provider='deepseek' AND revision=?";

export function credentialStore(db:D1Database, config:RuntimeConfig) {
  async function status() {
    // No ciphertext, plaintext, prefix, suffix or hash leaves the server.
    const row = await db.prepare("SELECT envelope IS NOT NULL AS configured,revision,updated_at FROM provider_secrets WHERE provider='deepseek'")
      .first<{configured:number;revision:string;updated_at:string}>();
    return {provider:'deepseek',configured:row?!!row.configured:!!config.DEEPSEEK_API_KEY,
      source:row?(row.configured?'encrypted_database':'removed'):(config.DEEPSEEK_API_KEY?'runtime_secret':'none'),
      vaultReady:rootReady(config.COCO_VAULT_KEY),revision:row?.revision||'absent',updatedAt:row?.updated_at||null};
  }
  async function change(envelope:string|null, expected:string) {
    const revision=crypto.randomUUID(),at=new Date().toISOString();
    const statement=expected==='absent'?db.prepare(insertCredentialSQL).bind(envelope,revision,at):db.prepare(updateCredentialSQL).bind(envelope,revision,at,expected);
    const result=await statement.run();
    if(result.meta.changes!==1)throw new CredentialConflict('Credential changed. Refresh before saving.');
    return {ok:true,configured:envelope!==null,revision,updatedAt:at};
  }
  return {
    status,
    async save(key:string,revision:string) {
      // Never generate a replacement root here. A missing/wrong root fails closed.
      return change(await sealCredential(key,config.COCO_VAULT_KEY||''),revision);
    },
    async remove(revision:string) {
      // An explicit removal blocks legacy runtime fallback as well.
      return change(null,revision);
    },
    async read():Promise<string|null> {
      const row=await db.prepare("SELECT envelope,revision,updated_at FROM provider_secrets WHERE provider='deepseek'").first<CredentialRow>();
      if(row)return row.envelope===null?null:openCredential(row.envelope,config.COCO_VAULT_KEY||'');
      return config.DEEPSEEK_API_KEY||null;
    },
  };
}
