import {createServer} from 'node:http';

// Only liveness is healthy during database bootstrap. No app/auth/data routes
// are available until the real Fastify server has initialized its indexes.
export async function startStartupHealth({port,host='0.0.0.0'}){
  const server=createServer((req,res)=>{
    const live=req.url==='/health/live';
    res.writeHead(live?200:503,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'5'});
    res.end(JSON.stringify(live?{ok:true,phase:'initializing'}:{ok:false,phase:'initializing',authReady:false,error:'Service initializing; database readiness has not passed'}));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)});
  return {server,close:()=>new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeIdleConnections()})};
}
