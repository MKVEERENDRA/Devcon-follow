import {setTimeout as delay} from 'node:timers/promises';
import {isIPv4} from 'node:net';
import {buildServer} from './app.js';
import {openDatabase} from './database.js';
import {startStartupHealth} from './startup-health.js';

const env=process.env;
if(env.NODE_ENV==='production' && (!env.OIDC_ISSUER?.startsWith('https://') || !env.OIDC_JWKS_URL?.startsWith('https://'))) {
  throw new Error('Production requires a trusted HTTPS OIDC issuer and JWKS URL');
}
const port=Number(env.PORT||8080);
const startup=await startStartupHealth({port});
let stopping=false,runtime,database;
const shutdown=async()=>{
  stopping=true;
  if(runtime){await runtime.server.close();runtime.io.close()}
  else await startup.close();
  if(database)await database.client.close();
  process.exit(0);
};
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

// Explicit staging-only, read-only probe. Never send credentials or attendee
// data. An observed address is not a reserved/stable egress guarantee.
if(env.RAILWAY_ENVIRONMENT_NAME==='staging'&&env.STAGING_EGRESS_DIAGNOSTIC==='true'){
  try{
    const response=await fetch('https://api.ipify.org?format=json',{signal:AbortSignal.timeout(5000)});
    const {ip}=await response.json();
    if(response.ok&&isIPv4(ip))console.info(JSON.stringify({event:'staging_egress_observed',ip,stable:false}));
  }catch{console.warn(JSON.stringify({event:'staging_egress_probe_unavailable'}))}
}
while(!stopping&&!database){
  try{database=await openDatabase(env.MONGODB_URI,env.MONGODB_DB||'devcon_follow',{expectedUser:env.REQUIRE_SCOPED_DATABASE_USER})}
  catch{
    // Driver errors can contain connection details. Never log raw URI/error.
    console.warn(JSON.stringify({event:'database_not_ready',retrySeconds:10}));
    await delay(10000);
  }
}
if(database&&!stopping){
  try{
    runtime=await buildServer({db:database.db,config:env});
    await startup.close();
    await runtime.server.listen({port,host:'0.0.0.0'});
  }catch{
    console.error(JSON.stringify({event:'application_initialization_failed'}));
    await database.client.close();
    process.exit(1);
  }
}
