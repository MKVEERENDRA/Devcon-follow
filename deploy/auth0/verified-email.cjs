// Deploy as an Auth0 Post Login Action and attach it to the Login flow.
// This namespace identifies claims; it is not a network endpoint.
const namespace='https://devcon-follow.vercel.app/claims';
exports.onExecutePostLogin=async(event,api)=>{
  const email=event.user?.email;
  if(typeof email!=='string'||email.length>254)return;
  api.accessToken.setCustomClaim(namespace+'/email',email);
  api.accessToken.setCustomClaim(namespace+'/email_verified',event.user.email_verified===true);
};
