export const MAX_LOCATION_AGE_MS = 75_000;
export const MAX_PRESENCE_AGE_MS = 120_000;
export const MAX_SHARE_MS = 30 * 60 * 1000;
export const DISCOVERY_MINUTES = 30;
export const DURATIONS_MINUTES = new Set([15,30,50,60,180,900,1440]);
const timestamp = x => x instanceof Date ? x.getTime() : Date.parse(x);

export function haversineMeters(a,b) {
  const R=6_371_000;
  const r=x=>x*Math.PI/180;
  const dLat=r(b.lat-a.lat), dLon=r(b.lon-a.lon);
  const x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
export function validLocation(v) {
  return !!v && Number.isFinite(v.lat) && Number.isFinite(v.lon) && Number.isFinite(v.accuracyMeters) &&
    v.lat>=-90 && v.lat<=90 && v.lon>=-180 && v.lon<=180 && v.accuracyMeters>=0 && v.accuracyMeters<=100;
}
export function insideVenue(v, venue, now=Date.now()) {
  if (!validLocation(v) || !venue || venue.enabled!==true) return false;
  const start=Date.parse(venue.startAt), end=Date.parse(venue.endAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||now<start||now>end) return false;
  if(!venue.center || !Number.isFinite(venue.center.lat) || !Number.isFinite(venue.center.lon))return false;
  return haversineMeters(v,venue.center)+v.accuracyMeters <= venue.radiusMeters;
}
export function activePresence(p, now=Date.now()) {
  return !!p && timestamp(p.expiresAt)>now && p.venueId && p.revoked!==true;
}
export function activeShare(share,now=Date.now()) {
  return !!share && share.enabled===true && timestamp(share.expiresAt)>now && share.revoked!==true;
}
export function freshLocation(loc, now=Date.now()) {
  return !!loc && timestamp(loc.observedAt)<=now && now-timestamp(loc.observedAt)<=MAX_LOCATION_AGE_MS && timestamp(loc.expiresAt)>now;
}
export function approvedGrant(grant, requesterId, targetId, now=Date.now()) {
  return !!grant && grant.requesterId===requesterId && grant.targetId===targetId && grant.status==='approved' && timestamp(grant.expiresAt)>now;
}
export function approxDistance(distance) {
  if(distance<30)return 'very close (approximate)';
  if(distance<100)return 'within ~100 m';
  if(distance<250)return 'within ~250 m';
  if(distance<500)return 'within ~500 m';
  return 'over ~500 m';
}
// Device-reported GPS accuracy must influence what we claim about proximity.
// In a crowded indoor venue, two nearly identical GPS readings do not mean
// people are standing next to one another.
export function conservativeDistanceBand(distance,accuracyA,accuracyB){
  if(!Number.isFinite(distance)||distance<0||![accuracyA,accuracyB].every(v=>Number.isFinite(v)&&v>=0))return 'same venue · GPS distance uncertain';
  const uncertainty=accuracyA+accuracyB;
  if(uncertainty>=60 && distance<=uncertainty*2)return 'same venue · GPS distance uncertain';
  return approxDistance(distance+uncertainty);
}
export function normalizeRole(role){return ['Founder','Builder','Security Researcher','Developer','Investor','Student','Recruiter','Other'].includes(role)?role:null;}
export function safeAvatar(value){
  if(value===null||value==='')return null;
  return typeof value==='string'&&value.length<=45000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:null;
}
export function safeHandle(input){return typeof input==='string' && /^[a-z0-9_]{3,30}$/.test(input)?input:null;}
export function safeText(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
export function validMinutes(input){return Number.isInteger(input)&&input>=1&&input<=1440;}
export function publicProfile(profile){
  if (!profile)return null;
  return {userId:profile.userId,handle:profile.handle,displayName:profile.displayName,roles:profile.roles,bio:profile.bio,interests:profile.interests,socials:profile.socials||{},avatar:safeAvatar(profile.avatar),discoverable:profile.discoverable===true};
}
