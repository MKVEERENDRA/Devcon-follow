// Publishes only the built frontend. No secrets, API, identity issuer, or test data.
import {cp,mkdir,writeFile,rm} from 'node:fs/promises';
import {vercelConfig} from './vercel-config.mjs';
const apiOrigin=process.argv.find(arg=>arg.startsWith('--api-origin='))?.slice('--api-origin='.length);
const routing=vercelConfig(apiOrigin);
const destination=new URL('../artifacts/vercel-preview/',import.meta.url);
await mkdir(destination,{recursive:true});
await cp(new URL('../web/dist/',import.meta.url),destination,{recursive:true});
if(apiOrigin)await rm(new URL('client-config',destination),{force:true});
else await writeFile(new URL('client-config',destination),JSON.stringify({authReady:false,ticketReady:false,communityReady:false}));
await writeFile(new URL('vercel.json',destination),JSON.stringify(routing,null,2));
console.log('Frontend prepared in artifacts/vercel-preview. '+(apiOrigin?'API routes use the explicit HTTPS origin; backend controls access.':'Registration disabled.'));
