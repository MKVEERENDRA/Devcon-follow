// Uses an administrator's short-lived access token from the environment; never prints it.
const base=process.env.DEVCON_API_URL,token=process.env.DEVCON_ADMIN_TOKEN;
if(!base?.startsWith('https://')&&!base?.startsWith('http://127.0.0.1:'))throw Error('Set DEVCON_API_URL to an HTTPS API origin');
if(!token)throw Error('Set DEVCON_ADMIN_TOKEN through your local secret manager');
const [action,arg]=process.argv.slice(2);
const routes={invite:['POST','/v1/admin/invitations'],revoke:['DELETE','/v1/admin/invitations/'+encodeURIComponent(arg||'')],landmark:['POST','/v1/admin/landmarks'],venue:['POST','/v1/admin/venues']};
if(!routes[action])throw Error('Usage: node scripts/admin.mjs invite|landmark|venue < JSON, or revoke INVITATION_ID');
let body;
if(action!=='revoke'){let raw='';for await(const chunk of process.stdin)raw+=chunk;body=JSON.parse(raw)}
const [method,path]=routes[action];
const response=await fetch(new URL(path,base),{method,headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const result=await response.json();
if(!response.ok)throw Error(result.error||'Request failed');
console.log(JSON.stringify(result,null,2));
