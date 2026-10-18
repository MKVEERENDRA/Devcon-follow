import test from 'node:test';
import assert from 'node:assert/strict';
import {registerSocialRoutes,cleanContent,validPage} from '../src/social.js';

function matches(doc,query){
  return Object.entries(query||{}).every(([key,v])=>{
    if(key==='$or')return v.some(item=>matches(doc,item));
    if(key==='$and')return v.every(item=>matches(doc,item));
    const value=doc[key];
    if(v&&typeof v==='object'&&!(v instanceof Date)){
      if('$in' in v)return v.$in.includes(value);
      if('$exists' in v)return v.$exists?(value!==undefined):(value===undefined);
      if('$gt' in v)return value>v.$gt;
      if('$lt' in v)return value<v.$lt;
      return false;
    }
    return value===v;
  });
}
function fakeEnvironment(){
  const tables={tickets:[{userId:'alice',status:'verified'},{userId:'bob',status:'verified'},{userId:'eve',status:'verified'}],profiles:[{userId:'alice',displayName:'Alice',handle:'alice',roles:['Builder'],discoverable:true},{userId:'bob',displayName:'Bob',handle:'bobbb',roles:['Builder'],discoverable:true},{userId:'eve',displayName:'Eve',handle:'eveee',roles:['Student'],discoverable:true}],follows:[{followerId:'alice',followedId:'bob'},{followerId:'bob',followedId:'alice'}],posts:[],comments:[],postLikes:[],messages:[],blocks:[],reports:[]};
  const handlers={}; const notifications=[];
  const col=name=>({
    findOne:async q=>tables[name].find(d=>matches(d,q))||null,
    countDocuments:async q=>tables[name].filter(d=>matches(d,q)).length,
    find:q=>{let list=tables[name].filter(d=>matches(d,q));return {sort(k){let key=Object.keys(k)[0],dir=k[key];list.sort((a,b)=>dir*(a[key]>b[key]?1:a[key]<b[key]?-1:0));return this},limit(n){list=list.slice(0,n);return this},async toArray(){return [...list]}}},
    insertOne:async doc=>(tables[name].push({...doc}),{insertedId:doc.messageId||doc.postId}),
    updateOne:async(query,update,opts)=>{const d=tables[name].find(x=>matches(x,query));if(!d&&opts?.upsert){tables[name].push({...query,...update.$setOnInsert});return{upsertedCount:1}}if(d){Object.assign(d,update.$set);return{modifiedCount:1}}return{modifiedCount:0}},
    updateMany:async(query,update)=>{const found=tables[name].filter(d=>matches(d,query));found.forEach(d=>Object.assign(d,update.$set));return{modifiedCount:found.length}},
    deleteOne:async query=>{const i=tables[name].findIndex(d=>matches(d,query));if(i>=0)tables[name].splice(i,1);return{deletedCount:i>=0?1:0}},
    deleteMany:async query=>{const old=tables[name].length;tables[name]=tables[name].filter(d=>!matches(d,query));return{deletedCount:old-tables[name].length}}
  });
  const app={get:(path,fn)=>handlers[`GET ${path}`]=fn,post:(path,fn)=>handlers[`POST ${path}`]=fn,put:(path,fn)=>handlers[`PUT ${path}`]=fn,delete:(path,fn)=>handlers[`DELETE ${path}`]=fn};
  registerSocialRoutes(app,{col,eligibleIds:async ids=>new Set(tables.tickets.filter(t=>t.status==='verified'&&ids.includes(t.userId)).map(t=>t.userId)),requireUser:async(req)=>({userId:req.actor}),isBlocked:async(a,b)=>Boolean(tables.blocks.find(x=>(x.blockerId===a&&x.blockedId===b)||(x.blockerId===b&&x.blockedId===a))),notify:(id,type,d)=>notifications.push({id,type,d}),audit:async()=>{}});
  async function call(method,path,actor='alice',body,params={},query={}){
    const fn=handlers[`${method} ${path}`];assert.ok(fn,`Missing route ${method} ${path}`);
    const reply={code(n){this.status=n;return this},send(x){return x}};
    return fn({actor,body,params,query},reply);
  }
  return {tables,handlers,notifications,call};
}
test('social content rejects empty text, control characters, overlength and non-strings',()=>{
  for(const v of ['', '  ',null,3,'\u0000foo','z'.repeat(1201)])assert.equal(cleanContent(v),null);
  assert.equal(cleanContent('  Hi world  '),'Hi world');
  assert.equal(cleanContent('🙂'),'🙂');
});
test('pagination rejects operator injections and bad time strings',()=>{
  assert.throws(()=>validPage({$gt:'2026'}),/Invalid pagination/);
  assert.throws(()=>validPage('nonsense'),/Invalid pagination/);
  assert.equal(validPage(undefined),null);
  assert(validPage('2026-11-04T00:00:00.000Z') instanceof Date);
});
test('mutual follow required for messaging; no sender ID trusted from body',async()=>{
  const {call,tables,notifications}=fakeEnvironment();
  await assert.rejects(call('POST','/v1/messages/:userId','eve',{body:'Hi'},{userId:'bob'}),/mutual follows/);
  const r=await call('POST','/v1/messages/:userId','alice',{body:'Hey Bob!',senderId:'eve'},{userId:'bob'});
  assert(r.messageId);
  assert.equal(tables.messages[0].senderId,'alice');
  assert.deepEqual(notifications[0].id,'bob');
  assert.equal('body' in notifications[0].d,false);
  const inbox=await call('GET','/v1/messages/threads','bob');
  assert.equal(inbox.threads[0].unread,1);
  const convo=await call('GET','/v1/messages/:userId','bob',null,{userId:'alice'});
  assert.equal(convo.messages[0].body,'Hey Bob!');
  assert.equal(convo.messages[0].read,true);
  assert.equal(tables.messages[0].readAt instanceof Date,true);
});
test('blocking cuts off DMs and reports require actual recipient',async()=>{
  const {call,tables}=fakeEnvironment();
  const m=await call('POST','/v1/messages/:userId','alice',{body:'Hi!'},{userId:'bob'});
  await assert.rejects(call('POST','/v1/social/reports','eve',{type:'message',id:m.messageId,reason:'spam'}),/Message unavailable/);
  tables.blocks.push({blockerId:'bob',blockedId:'alice'});
  await assert.rejects(call('GET','/v1/messages/:userId','alice',null,{userId:'bob'}),/unavailable/);
  const threads=await call('GET','/v1/messages/threads','alice');
  assert.equal(threads.threads.length,0);
});
test('public posting routes are not registered',()=>{
 const {handlers}=fakeEnvironment();
 assert(!Object.keys(handlers).some(path=>path.includes('/posts')));
});
