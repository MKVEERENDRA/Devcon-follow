// Takes a URI from an operator-protected local file. Never prints its contents.
// Enrollment deliberately stays closed for migration validation.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
const [uriFile,origin,output]=process.argv.slice(2);
if(!uriFile||!origin||!output)throw Error('Usage: node scripts/prepare-gce-env.mjs PRIVATE_URI_FILE HTTPS_ORIGIN PRIVATE_OUTPUT_FILE');
const url=new URL(origin);
if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password)throw Error('Bare HTTPS origin required');
const meta=await stat(uriFile);
if(meta.mode&0o077)throw Error('Credential file must be accessible only to its owner');
const uri=(await readFile(uriFile,'utf8')).trim();
if(!uri.startsWith('mongodb+srv://')||/[\r\n]/.test(uri))throw Error('A single Atlas SRV URI is required in the private file');
let databaseUrl;
try{databaseUrl=new URL(uri)}catch{throw Error('Invalid database URI in private file')}
if(databaseUrl.hostname!=='devconfollow.0esz7ob.mongodb.net'||databaseUrl.username!=='devcon_follow_gce_staging'||
  !databaseUrl.password||/[<>]/.test(decodeURIComponent(databaseUrl.password))||
  (databaseUrl.pathname!=='/'&&databaseUrl.pathname!==''&&databaseUrl.pathname!=='/devcon_follow_staging')){
  throw Error('Expected the dedicated GCE staging user and existing Devcon Atlas cluster; placeholders are not credentials');
}
const publicSettings=JSON.parse(await readFile(new URL('../deploy/auth0/public-settings.json',import.meta.url),'utf8'));
const config={...publicSettings,NODE_ENV:'production',PORT:'8080',MONGODB_URI:uri,MONGODB_DB:'devcon_follow_staging',
  WEB_ORIGINS:origin+',https://devcon-follow.vercel.app',SOCKET_PUBLIC_ORIGIN:origin,APP_PUBLIC_URL:origin,
  TRUST_PROXY:'true',REGISTRATION_ENABLED:'false',COMMUNITY_ACCESS_ENABLED:'false',COMMUNITY_SELF_SERVICE_ENABLED:'false',
  COMMUNITY_REGISTRATION_MODE:'closed',PUSH_ENABLED:'false',OIDC_GOOGLE_CONNECTION:'google-oauth2',
  PROXIMITY_TOKEN_HMAC_KEY:randomBytes(32).toString('hex')};
// Never silently replace established radio credentials on a subsequent run.
await writeFile(resolve(output),Object.entries(config).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Created owner-only container configuration; registration remains closed.');
