import {createRemoteJWKSet,jwtVerify} from 'jose';

export function createAuth(config){
  const {issuer,audience,jwksUrl}=config;
  if(!issuer || !audience || !jwksUrl)return async function(){throw new Error('OIDC not configured')};
  const jwks=createRemoteJWKSet(new URL(jwksUrl));
  return async function authenticateToken(token){
    if(!token)throw new Error('Missing bearer token');
    const {payload}=await jwtVerify(token,jwks,{issuer,audience,algorithms:['RS256','PS256','ES256'],clockTolerance:10});
    if(!Number.isFinite(payload.exp))throw new Error('Token expiry required');
    if(typeof payload.sub!=='string'||!payload.sub)throw new Error('Missing subject');
    return {expiresAt:payload.exp*1000,userId:payload.sub,email:typeof payload.email==='string' && payload.email_verified===true ? payload.email.toLowerCase():null};
  };
}
export function tokenFromHeader(header){
  const m=typeof header==='string'?/^Bearer (\S+)$/i.exec(header):null;
  return m?.[1] || null;
}
