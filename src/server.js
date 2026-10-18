import {buildServer} from './app.js';
import {openDatabase} from './database.js';

const env=process.env;
if(env.NODE_ENV==='production' && (!env.OIDC_ISSUER?.startsWith('https://') || !env.OIDC_JWKS_URL?.startsWith('https://'))) {
  throw new Error('Production requires a trusted HTTPS OIDC issuer and JWKS URL');
}
const {client,db}=await openDatabase(env.MONGODB_URI,env.MONGODB_DB||'devcon_follow');
const {server,io}=await buildServer({db,config:env});
const port=Number(env.PORT||8080);
const shutdown=async()=>{await server.close();io.close();await client.close();process.exit(0)};
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
await server.listen({port,host:'0.0.0.0'});
