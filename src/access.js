import {createHash,createHmac, randomBytes} from 'node:crypto';

const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
export function createAccess({col,config}){
  // Opt-in rollout switch. Shipping source must never open registration by itself.
  const mode=config.COMMUNITY_REGISTRATION_MODE||'closed';
  const selfService=config.COMMUNITY_SELF_SERVICE_ENABLED==='true'&&['pilot','public'].includes(mode);
  const pilotEmails=new Set((config.COMMUNITY_PILOT_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean));
  const cohort=mode==='pilot'?createHash('sha256').update(JSON.stringify([...pilotEmails].sort())).digest('hex'):null;
  const canJoin=actor=>Boolean(actor.email)&&(mode==='public'||mode==='pilot'&&pilotEmails.has(actor.email));
  const memberFilter={status:'active',...(mode==='pilot'?{cohort}:{})};
  const enabled=config.COMMUNITY_ACCESS_ENABLED==='true' &&
    typeof config.COMMUNITY_INVITE_HMAC_KEY==='string' && config.COMMUNITY_INVITE_HMAC_KEY.length>=32;
  const digest=value=>createHmac('sha256',config.COMMUNITY_INVITE_HMAC_KEY).update(value).digest('hex');
  const grantQuery=()=>({status:'redeemed',accessExpiresAt:{$gt:new Date()}});
  async function community(userId){
    if(selfService&&await col('communityMembers').findOne({userId,...memberFilter}))return {userId,kind:'community'};
    return enabled?col('invitations').findOne({...grantQuery(),usedBy:userId}):null;
  }
  async function enroll(actor){
    if(!selfService||!canJoin(actor))return;
    // Only a verified server-side OIDC claim can create membership. Never reset
    // an existing revoked membership on login, token refresh or concurrent signup.
    try{await col('communityMembers').updateOne({userId:actor.userId},{$setOnInsert:{userId:actor.userId,status:'active',createdAt:new Date()},$set:{cohort}},{upsert:true})}
    catch(e){if(e.code!==11000)throw e}
  }
  async function eligibleIds(ids){
    if(!ids.length)return new Set();
    const [tickets,grants,members]=await Promise.all([
      col('tickets').find({userId:{$in:ids},status:'verified'}).toArray(),
      enabled?col('invitations').find({...grantQuery(),usedBy:{$in:ids}}).toArray():[],
      selfService?col('communityMembers').find({userId:{$in:ids},...memberFilter}).toArray():[]
    ]);
    return new Set([...tickets.map(t=>t.userId),...grants.map(g=>g.usedBy),...members.map(m=>m.userId)]);
  }
  function register(app,{authenticate,admins,audit,onRevoked}){
    const admin=async req=>{const actor=await authenticate(req);if(!admins.has(actor.userId))throw fail(403,'Administrator authorization required');return actor;};
    app.delete('/v1/admin/community/:userId',async req=>{
      const actor=await admin(req),userId=req.params.userId;
      if(typeof userId!=='string'||!userId||userId.length>512)throw fail(400,'Invalid member');
      const result=await col('communityMembers').updateOne({userId},{$set:{status:'revoked',revokedAt:new Date()}});
      if(!result.matchedCount)throw fail(404,'Member unavailable');
      await Promise.all(['presence','shares','locations','peerTokens'].map(name=>col(name).deleteMany({userId})));
      onRevoked?.(userId);await audit(actor.userId,'community_membership_revoked');
      return {revoked:true};
    });
    app.post('/v1/admin/invitations',{config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
      const actor=await admin(req);
      if(!enabled)throw fail(503,'Community access is disabled');
      const {email,expiresInHours=24,accessDays=7}=req.body||{};
      if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
        !Number.isInteger(expiresInHours)||expiresInHours<1||expiresInHours>168||
        !Number.isInteger(accessDays)||accessDays<1||accessDays>30)throw fail(400,'Valid email and bounded expiry required');
      const code=randomBytes(32).toString('base64url'),now=new Date();
      const record={digest:digest('code:'+code),emailDigest:digest('email:'+email.trim().toLowerCase()),status:'issued',
        expiresAt:new Date(+now+expiresInHours*3_600_000),accessExpiresAt:new Date(+now+accessDays*86_400_000),cleanupAt:new Date(+now+Math.max(expiresInHours*3_600_000,accessDays*86_400_000)+7*86_400_000),issuedBy:actor.userId,createdAt:now};
      await col('invitations').insertOne(record);
      await audit(actor.userId,'community_invitation_created');
      return reply.code(201).send({code,invitationId:record.digest,expiresAt:record.expiresAt,accessExpiresAt:record.accessExpiresAt,label:'Community access — not official Devcon ticket verification'});
    });
    app.post('/v1/access/redeem',{config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req)=>{
      const actor=await authenticate(req);
      if(!enabled)throw fail(503,'Community access is disabled');
      if(!actor.email)throw fail(403,'A verified email address is required');
      const code=req.body?.code;
      if(typeof code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(code))throw fail(400,'Invalid invitation');
      // Claim and membership are ONE atomic document update, including under concurrent redemption.
      const result=await col('invitations').findOneAndUpdate({digest:digest('code:'+code),emailDigest:digest('email:'+actor.email),
        status:'issued',expiresAt:{$gt:new Date()},accessExpiresAt:{$gt:new Date()}},
        {$set:{status:'redeemed',usedBy:actor.userId,redeemedAt:new Date()}},{returnDocument:'after'});
      if(!result)throw fail(409,'Invitation unavailable, expired, or issued to a different email');
      await audit(actor.userId,'community_invitation_redeemed');
      return {accessEligible:true,officiallyVerified:false,accessTier:'community',accessExpiresAt:result.accessExpiresAt};
    });
    app.delete('/v1/admin/invitations/:id',async req=>{
      const actor=await admin(req);
      if(!/^[a-f0-9]{64}$/.test(req.params.id))throw fail(400,'Invalid invitation');
      const grant=await col('invitations').findOne({digest:req.params.id});
      await col('invitations').updateOne({digest:req.params.id},{$set:{status:'revoked',revokedAt:new Date()}});
      if(grant?.usedBy)onRevoked?.(grant.usedBy);
      await audit(actor.userId,'community_invitation_revoked');
      return {revoked:true};
    });
  }
  return {enabled,selfService,canJoin,memberFilter,enroll,community,eligibleIds,register};
}
