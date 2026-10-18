import {randomBytes,createHmac} from 'node:crypto';
const TOKEN_REGEX=/^[A-Za-z0-9_-]{32}$/;
export const PROXIMITY_LIFETIME_MS=3*60_000;
export function newPeerToken(){return randomBytes(24).toString('base64url')}
export function validPeerToken(token){return typeof token==='string'&&TOKEN_REGEX.test(token)}
export function tokenDigest(token,key){if(!key||key.length<32)throw new Error('Proximity key not configured safely');if(!validPeerToken(token))throw new Error('Invalid proximity token');return createHmac('sha256',key).update(token).digest('hex')}
