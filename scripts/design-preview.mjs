// Disposable local visual QA only. Never imported by the application runtime.
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime();
const point={lat:19.01,lon:72.85,accuracyMeters:10};
await app.request('admin','/v1/admin/venues','POST',{name:'SANDBOX event',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true});
for(const id of ['alice','bob']){
 const invite=await app.request('admin','/v1/admin/invitations','POST',{email:id+'@example.test'});
 const accepted=await app.request(id,'/v1/access/redeem','POST',{code:invite.body.code});
 console.log(id,accepted.status);
 await app.request(id,'/v1/profile','PUT',{displayName:'SANDBOX '+id,handle:id,bio:'Local visual QA participant. This profile never enters production.',roles:['Builder'],interests:['Ethereum','Security'],discoverable:true,socials:{}});
 await app.request(id,'/v1/presence/check-in','POST',point);
}
console.log(app.origin);
process.on('SIGINT',async()=>{await app.close().catch(()=>{});process.exit()});
