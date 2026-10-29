import {env} from 'cloudflare:workers';
import {admin,database} from '../../../../lib/core';
import {credentialStore} from '../../../../lib/credential-store';
import {credentialHandlers} from '../../../../lib/credential-api';

const handlers=credentialHandlers({authorize:admin,vault:()=>credentialStore(database(),env as unknown as {COCO_VAULT_KEY?:string;DEEPSEEK_API_KEY?:string})});
export const GET=handlers.GET;
export const POST=handlers.POST;
