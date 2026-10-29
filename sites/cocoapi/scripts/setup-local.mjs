import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) throw new Error('Node.js >=22.13 required');
if (!existsSync('node_modules/wrangler/bin/wrangler.js')) throw new Error('Install dependencies first: npx pnpm@11.25.0 install --frozen-lockfile');
mkdirSync('.sites-runtime', { recursive: true });
writeFileSync('.sites-runtime/execution-profile.json', JSON.stringify({executionProfile:'portable'}));
if (!existsSync('.dev.vars')) {
  writeFileSync('.dev.vars', 'ADMIN_USER_ID="local_seedy"\nCOCO_VAULT_KEY="'+randomBytes(32).toString('base64')+'"\n', {flag:'wx',mode:0o600});
}
writeFileSync('.sites-runtime/wrangler.local.json', JSON.stringify({
  name:'cocoapi-local', compatibility_date:'2026-05-15',
  d1_databases:[{binding:'DB',database_name:'cocoapi-local',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'../drizzle'}]
}, null, 2));
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','.sites-runtime/wrangler.local.json','--persist-to','.wrangler/state'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
if(result.error) throw result.error;
if(result.status!==0) process.exit(result.status??1);
console.log('Local setup ready. Run: npx pnpm@11.25.0 dev --host 127.0.0.1');
