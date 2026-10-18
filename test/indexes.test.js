import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureIndexes,INDEX_SPECS} from '../src/indexes.js';
function fakeDb({nonEmpty=false,seed=[]}={}){
 const store=new Map();const dropped=[];
 return {store,dropped,collection(name){
  if(!store.has(name))store.set(name,[{name:'_id_',key:{_id:1},unique:true},...seed.filter(x=>x.collection===name).map(x=>x.index)]);
  return {indexes:async()=>[...store.get(name)],countDocuments:async()=>nonEmpty?1:0,
   dropIndex:async(idxName)=>{dropped.push({name,idxName});store.set(name,store.get(name).filter(i=>i.name!==idxName));},
   createIndex:async(key,opts)=>{const idxName=Object.keys(key).join('_');store.get(name).push({name:idxName,key,...opts});return idxName;}}
 }};
}
test('bootstrap creates correct unique, TTL and geospatial indexes idempotently', async()=>{
 const db=fakeDb();await ensureIndexes(db);
 const count=[...db.store.values()].reduce((n,x)=>n+x.length,0);
 await ensureIndexes(db);
 assert.equal([...db.store.values()].reduce((n,x)=>n+x.length,0),count);
 assert.equal(db.store.get('tickets').find(x=>x.key.ticketDigest).unique,true);
 assert(db.store.get('locations').some(x=>x.key.geo==='2dsphere'));
 assert(db.store.get('shares').some(x=>x.key.expiresAt===1&&x.expireAfterSeconds===0));
 assert.equal(INDEX_SPECS.length,count-db.store.size);
});
test('bootstrap repairs wrongly nonunique Atlas index only when collection empty',async()=>{
 const db=fakeDb({seed:[{collection:'tickets',index:{name:'unique_ticket_digest',key:{ticketDigest:1}}}]});
 await ensureIndexes(db);
 assert.deepEqual(db.dropped,[{name:'tickets',idxName:'unique_ticket_digest'}]);
 assert.equal(db.store.get('tickets').find(i=>i.key.ticketDigest).unique,true);
});
test('bootstrap refuses incompatible index repair with live attendee records',async()=>{
 const db=fakeDb({nonEmpty:true,seed:[{collection:'tickets',index:{name:'old_index',key:{ticketDigest:1}}}]});
 await assert.rejects(()=>ensureIndexes(db),/incompatible uniqueness\/TTL/);
 assert.deepEqual(db.dropped,[]);
});
test('bootstrap refuses index repair when no safe introspection possible',async()=>{
 const db={collection(){return {indexes:async()=>[{name:'legacy',key:{digest:1}}]}}};
 await assert.rejects(()=>ensureIndexes(db),/incompatible uniqueness\/TTL/);
});
