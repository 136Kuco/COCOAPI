import {env} from 'cloudflare:workers';
import {credentialStore} from '../../../lib/credential-store';
import {database,json} from '../../../lib/core';
export async function GET(){
  const config=env as unknown as Record<string,string>;
  try {
    // Both statements must prepare successfully; this checks the deployed schema.
    await database().batch([
      database().prepare('SELECT id FROM api_keys LIMIT 0'),
      database().prepare('SELECT id FROM request_logs LIMIT 0'),
      database().prepare('SELECT id FROM connection_tests LIMIT 0'),
      database().prepare('SELECT provider FROM provider_secrets LIMIT 0'),
    ]);
    const credentials=await credentialStore(database(),config).status();
    return json({databaseReady:true,adminConfigured:!!config.ADMIN_USER_ID,deepseekConfigured:credentials.configured,vaultReady:credentials.vaultReady,gatewayReady:false,release:'P0.2-secure-entry'});
  } catch { return json({databaseReady:false,gatewayReady:false,error:'Database migration or binding unavailable'},503); }
}
