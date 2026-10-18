import {createRemoteJWKSet,jwtVerify} from 'jose';

export function createAuth(config){
  const {issuer,audience,jwksUrl,emailClaimNamespace}=config;
  let emailClaim='email',verifiedClaim='email_verified';
  if(emailClaimNamespace){
    const namespace=new URL(emailClaimNamespace);
    if(namespace.protocol!=='https:'||namespace.username||namespace.password||namespace.search||namespace.hash)throw new Error('Invalid OIDC email claim namespace');
    const prefix=emailClaimNamespace.replace(/\/$/,'');
    emailClaim=prefix+'/email';verifiedClaim=prefix+'/email_verified';
  }
  if(!issuer || !audience || !jwksUrl)return async function(){throw new Error('OIDC not configured')};
  const jwks=createRemoteJWKSet(new URL(jwksUrl));
  return async function authenticateToken(token){
    if(!token)throw new Error('Missing bearer token');
    const {payload}=await jwtVerify(token,jwks,{issuer,audience,algorithms:['RS256','PS256','ES256'],clockTolerance:10});
    if(!Number.isFinite(payload.exp))throw new Error('Token expiry required');
    if(typeof payload.sub!=='string'||!payload.sub)throw new Error('Missing subject');
    // Auth0 API tokens need namespaced email claims. Never mix an email from one
    // namespace with verification from another, or accept an ID token as an API token.
    const email=payload[emailClaim];
    return {expiresAt:payload.exp*1000,userId:payload.sub,email:typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&payload[verifiedClaim]===true?email.toLowerCase():null};
  };
}
export function tokenFromHeader(header){
  const m=typeof header==='string'?/^Bearer (\S+)$/i.exec(header):null;
  return m?.[1] || null;
}
