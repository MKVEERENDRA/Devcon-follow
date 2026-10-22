import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {normalizeRole,publicProfile} from './domain.js';
import {matchingPreferences,matchDetails,matchingStages} from './matching.js';
const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const prefixFields=(query,prefix)=>Object.fromEntries(Object.entries(query).map(([key,value])=>['$or','$and'].includes(key)?[key,value.map(clause=>prefixFields(clause,prefix))]:[prefix+key,value]));
export function directoryParams(query={}){
 const allowed=new Set(['q','role','interest','openToMeet','limit','cursor','sort','scope']);
 if(Object.keys(query).some(k=>!allowed.has(k))||Object.values(query).some(v=>typeof v!=='string'))throw fail(400,'Invalid directory parameters');
 if(query.scope!==undefined&&!['venue','event'].includes(query.scope))throw fail(400,'Invalid directory scope');
 const q=(query.q||'').trim().replace(/\s+/g,' '),interest=(query.interest||'').trim(),role=query.role||'';
 const limit=query.limit===undefined?24:Number(query.limit);
 if(query.sort!==undefined&&!['recommended','directory'].includes(query.sort))throw fail(400,'Invalid directory order');
 if(q.length>80||interest.length>32||role&&!normalizeRole(role)||!Number.isInteger(limit)||limit<1||limit>50||query.openToMeet!==undefined&&!['true','false'].includes(query.openToMeet))throw fail(400,'Invalid directory filters or page size');
 return {q,interest,role,openToMeet:query.openToMeet??'',limit,sort:query.sort||'directory',scope:query.scope||'venue'};
}
export function directorySource(params){return params.scope==='event'||params.sort==='recommended'||params.q||params.role||params.interest||params.openToMeet?'profiles':'presence'}
export function directoryPipeline({actorId,venueId,params,last,communityEnabled,selfService=false,memberFilter={status:'active'},preferences={interests:[],wantedRoles:[]},now=new Date()}){
 const match={venueId,expiresAt:{$gt:now},revoked:{$ne:true},userId:{$ne:actorId,...(last&&params.sort!=='recommended'?{$gt:last}:{})}};
 const filters={discoverable:true,...(params.scope==='event'?{eventDirectory:true}:{})};
 if(params.role)filters.roles=params.role;
 if(params.interest)filters.interests={$regex:'^'+escapeRegex(params.interest)+'$',$options:'i'};
 if(params.openToMeet)filters.openToMeet=params.openToMeet==='true'?true:{$ne:true};
 if(params.q)filters.$and=params.q.split(' ').map(term=>({$or:['displayName','handle','bio','roles','interests','lookingFor'].map(k=>({[k]:{$regex:escapeRegex(term),$options:'i'}}))}));
 const source=directorySource(params);
 const venueCheck=params.scope==='event'?[]:[{$lookup:{from:'presence',localField:'userId',foreignField:'userId',pipeline:[{$match:{venueId,expiresAt:{$gt:now},revoked:{$ne:true}}},{$project:{_id:1}},{$limit:1}],as:'onSite'}},{$match:{'onSite.0':{$exists:true}}}];
 const prefix=source==='profiles'?[
  {$match:{...filters,userId:match.userId}},{$sort:{userId:1}},
  {$project:{_id:0,userId:1,profile:'$$ROOT'}},
  ...(params.sort==='recommended'?[]:venueCheck)
 ]:[{$match:match},{$sort:{userId:1}},{$lookup:{from:'profiles',localField:'userId',foreignField:'userId',as:'profile'}},{$unwind:'$profile'},{$match:prefixFields(filters,'profile.')}];
 return [
  ...prefix,
  // Rank lightweight fields, never avatars. Venue/access/block checks below
  // MUST precede the page limit: a high score never grants profile access.
  ...(params.sort==='recommended'?[{$project:{_id:0,userId:1,'profile.interests':1,'profile.roles':1,'profile.openToMeet':1}},...matchingStages(preferences,last),...venueCheck]:[]),
  {$lookup:{from:'tickets',localField:'userId',foreignField:'userId',pipeline:[{$match:{status:'verified'}},{$project:{_id:1}},{$limit:1}],as:'official'}},
  ...(communityEnabled?[{$lookup:{from:'invitations',localField:'userId',foreignField:'usedBy',pipeline:[{$match:{status:'redeemed',accessExpiresAt:{$gt:now}}},{$project:{_id:1}},{$limit:1}],as:'community'}}]:[]),
  ...(selfService?[{$lookup:{from:'communityMembers',localField:'userId',foreignField:'userId',pipeline:[{$match:memberFilter},{$project:{_id:1}},{$limit:1}],as:'member'}}]:[]),
  {$match:{$or:[{'official.0':{$exists:true}},...(communityEnabled?[{'community.0':{$exists:true}}]:[]),...(selfService?[{'member.0':{$exists:true}}]:[])]}},
  {$lookup:{from:'blocks',localField:'userId',foreignField:'blockedId',pipeline:[{$match:{blockerId:actorId}},{$project:{_id:1}},{$limit:1}],as:'blockedByMe'}},
  {$lookup:{from:'blocks',localField:'userId',foreignField:'blockerId',pipeline:[{$match:{blockedId:actorId}},{$project:{_id:1}},{$limit:1}],as:'blockedMe'}},
  {$match:{'blockedByMe.0':{$exists:false},'blockedMe.0':{$exists:false}}},
  {$limit:params.limit+1},
  ...(params.sort==='recommended'?[{$lookup:{from:'profiles',localField:'userId',foreignField:'userId',pipeline:[{$match:{discoverable:true}}],as:'profile'}},{$unwind:'$profile'}]:[]),
  {$project:{_id:0,profile:1,matchScore:1}}
 ];
}
export function registerDirectory(app,{col,requireUser,requireOnSite,communityEnabled,selfService=false,memberFilter={status:'active'}}){
 // Process-local key: restart invalidates cursors, never grants access. No new live secret required.
 const key=randomBytes(32);
 const seal=(last,scope)=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(scope));const encrypted=Buffer.concat([cipher.update(JSON.stringify({last,expires:Date.now()+15*60000})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url')};
 const open=(cursor,scope)=>{try{if(!/^[A-Za-z0-9_-]{40,2048}$/.test(cursor))throw Error();const b=Buffer.from(cursor,'base64url'),decipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));decipher.setAAD(Buffer.from(scope));const value=JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString());const position=value.last;const valid=typeof position==='string'?position.length>0&&position.length<=512:position&&typeof position.userId==='string'&&position.userId.length>0&&position.userId.length<=512&&Number.isInteger(position.score)&&position.score>=0&&position.score<=100; if(!valid||!Number.isFinite(value.expires)||value.expires<=Date.now())throw Error();return position}catch{throw fail(400,'Directory page expired or invalid; restart search')}};
 app.get('/v1/directory',{config:{rateLimit:{max:60,timeWindow:'1 minute'}}},async req=>{
  const params=directoryParams(req.query);
  const actor=await (params.scope==='event'?requireUser(req):requireOnSite(req));
  const preferences=params.sort==='recommended'?matchingPreferences(await col('profiles').findOne({userId:actor.userId},{projection:{_id:0,interests:1,lookingFor:1}})):null;
  const scope=JSON.stringify([actor.userId,actor.venue?.venueId||'event',params,preferences]);
  const last=req.query.cursor?open(req.query.cursor,scope):null;
  if(last&&(params.sort==='recommended'?typeof last!=='object':typeof last!=='string'))throw fail(400,'Invalid directory page');
  const source=directorySource(params);
  let results;try{results=await col(source).aggregate(directoryPipeline({actorId:actor.userId,venueId:actor.venue?.venueId||'event',params,last,communityEnabled,selfService,memberFilter,...(preferences?{preferences}:{})}),{hint:source==='profiles'?{discoverable:1,userId:1}:{venueId:1,userId:1,expiresAt:1},maxTimeMS:2000,allowDiskUse:false}).toArray()}catch(error){if(error.code===50)throw fail(503,'Directory search is busy. Narrow your filters or retry.');throw error}
  const more=results.length>params.limit,visible=results.slice(0,params.limit),tail=visible.at(-1);
  return {attendees:visible.map(r=>({...publicProfile(r.profile),...(preferences?{match:matchDetails(r.profile,preferences)}:{})})),nextCursor:more?seal(preferences?{userId:tail.profile.userId,score:tail.matchScore}:tail.profile.userId,scope):null,kind:params.scope==='event'?'event_directory':'same_venue_directory',note:params.scope==='event'?'Participants who explicitly enabled the event directory. No location or attendance claim.':'Approved, discoverable participants checked in at this venue; not a claim of GPS proximity'};
 });
}
