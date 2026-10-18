// Publishes only the built frontend. No secrets, API, identity issuer, or test data.
import {cp,mkdir,writeFile} from 'node:fs/promises';
const destination=new URL('../artifacts/vercel-preview/',import.meta.url);
await mkdir(destination,{recursive:true});
await cp(new URL('../web/dist/',import.meta.url),destination,{recursive:true});
await writeFile(new URL('client-config',destination),JSON.stringify({authReady:false,ticketReady:false,communityReady:false}));
await writeFile(new URL('vercel.json',destination),JSON.stringify({rewrites:[{source:'/((?!assets/|images/|icons/|client-config|privacy.html|sw.js|manifest.webmanifest).*)',destination:'/index.html'}]},null,2));
console.log('Frontend preview prepared in artifacts/vercel-preview. Registration disabled.');
