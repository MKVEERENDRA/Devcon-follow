import {randomUUID} from 'node:crypto';
import {publicProfile} from './domain.js';

const error=(code,message)=>Object.assign(new Error(message),{statusCode:code});
export function cleanContent(value,max=1200){
  if(typeof value!=='string')return null;
  const v=value.normalize('NFC').trim();
  if(!v || v.length>max || /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/.test(v))return null;
  return v;
}
export function validPage(value){
  if(value==null||value==='')return null;
  if(typeof value!=='string'||!/\d{4}-\d{2}-\d{2}T/.test(value))throw error(400,'Invalid pagination cursor');
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw error(400,'Invalid pagination cursor');
  return date;
}
const safeId=id=>typeof id==='string' && /^[a-z0-9-]{12,64}$/i.test(id);

/** Server-side social network. All subjects come from validated OIDC tokens; public posts contain no GPS. */
export function registerSocialRoutes(app,{col,requireUser,isBlocked,notify,audit,eligibleIds}){
  async function eligible(id){
    const [ticket,profile]=await Promise.all([
      eligibleIds([id]).then(ids=>ids.has(id)),
      col('profiles').findOne({userId:id,discoverable:true})
    ]);
    return ticket&&profile?profile:null;
  }
  async function mutual(actor,targetId){
    if(typeof targetId!=='string'||targetId===actor.userId||targetId.length>180)throw error(400,'Invalid attendee');
    if(await isBlocked(actor.userId,targetId))throw error(403,'Attendee unavailable');
    const profile=await eligible(targetId);
    if(!profile)throw error(404,'Attendee not available');
    const [a,b]=await Promise.all([
      col('follows').findOne({followerId:actor.userId,followedId:targetId}),
      col('follows').findOne({followerId:targetId,followedId:actor.userId})
    ]);
    if(!a||!b)throw error(403,'Messaging requires mutual follows');
    return profile;
  }
  app.get('/v1/messages/threads',async(req)=>{
    const actor=await requireUser(req);
    const recent=await col('messages').find({$or:[{senderId:actor.userId},{recipientId:actor.userId}]}).sort({createdAt:-1}).limit(200).toArray();
    const result=[],seen=new Set();
    for(const m of recent){const id=m.senderId===actor.userId?m.recipientId:m.senderId;
      if(seen.has(id)||await isBlocked(actor.userId,id))continue;seen.add(id);
      const p=await eligible(id);if(!p)continue;
      result.push({profile:publicProfile(p),lastMessage:{body:m.body,createdAt:m.createdAt,own:m.senderId===actor.userId},unread:await col('messages').countDocuments({senderId:id,recipientId:actor.userId,readAt:{$exists:false}})});
      if(result.length>=40)break;
    }
    return {threads:result};
  });
  app.get('/v1/messages/:userId',async(req)=>{
    const actor=await requireUser(req),id=req.params.userId;
    await mutual(actor,id);
    const before=validPage(req.query?.before);
    const filter={$or:[{senderId:actor.userId,recipientId:id},{senderId:id,recipientId:actor.userId}],...(before?{createdAt:{$lt:before}}:{})};
    const entries=await col('messages').find(filter).sort({createdAt:-1,_id:-1}).limit(50).toArray();
    // Seen receipts only for messages actually returned to recipient.
    const unread=entries.filter(m=>m.recipientId===actor.userId&&!m.readAt).map(m=>m.messageId);
    if(unread.length)await col('messages').updateMany({messageId:{$in:unread},recipientId:actor.userId},{$set:{readAt:new Date()}});
    return {messages:entries.reverse().map(m=>({messageId:m.messageId,body:m.body,createdAt:m.createdAt,own:m.senderId===actor.userId,read:!!m.readAt||unread.includes(m.messageId)})),nextCursor:entries.length===50?new Date(entries[0].createdAt).toISOString():null};
  });
  app.post('/v1/messages/:userId',async(req,reply)=>{
    const actor=await requireUser(req),id=req.params.userId,body=cleanContent(req.body?.body,2000);
    if(!body)throw error(400,'Message must contain 1–2000 characters');
    await mutual(actor,id);
    if(await col('messages').countDocuments({senderId:actor.userId,createdAt:{$gt:new Date(Date.now()-60_000)}})>=20)throw error(429,'Message rate limit reached');
    const m={messageId:randomUUID(),senderId:actor.userId,recipientId:id,body,createdAt:new Date()};
    await col('messages').insertOne(m);
    notify(id,'message:received',{fromUserId:actor.userId}); // no message body in broadcast
    return reply.code(201).send({messageId:m.messageId,createdAt:m.createdAt});
  });
  app.delete('/v1/messages/:userId/:messageId',async(req)=>{
    const actor=await requireUser(req),{messageId,userId}=req.params;
    // Sender can retract own message; recipient cannot erase someone else's messages.
    const r=await col('messages').deleteOne({messageId,senderId:actor.userId,recipientId:userId});
    return {deleted:Boolean(r.deletedCount)};
  });
  app.post('/v1/social/reports',async(req,reply)=>{
    const actor=await requireUser(req),{type,id,reason}=req.body||{};
    if(type!=='message'||!safeId(id)||!['spam','harassment','impersonation','other'].includes(reason))throw error(400,'Invalid content report');
    const item=await col(type==='post'?'posts':'messages').findOne({[type==='post'?'postId':'messageId']:id});
    if(!item)throw error(404,'Content unavailable');
    const targetId=type==='post'?item.authorId:item.senderId;
    if(targetId===actor.userId)throw error(400,'Cannot report your own content');
    if(type==='message'&&item.recipientId!==actor.userId)throw error(403,'Message unavailable');
    if(await col('reports').countDocuments({fromId:actor.userId,createdAt:{$gt:new Date(Date.now()-86400000)}})>=5)throw error(429,'Report limit reached');
    await col('reports').insertOne({reportId:randomUUID(),fromId:actor.userId,targetId,contentType:type,contentId:id,reason,createdAt:new Date(),status:'open'});
    await audit(actor.userId,'social_content_reported',{type,contentId:id});
    return reply.code(201).send({received:true});
  });
}
