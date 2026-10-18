// Production index manifest. Startup reconciles mismatches only on empty collections.
// Never drop/rebuild an index on a collection containing attendee data.
export const INDEX_SPECS = [
  ['invitations',{digest:1},{unique:true}],
  ['invitations',{cleanupAt:1},{expireAfterSeconds:0}],
  ['invitations',{usedBy:1,status:1,accessExpiresAt:1},{}],
  ['landmarks',{landmarkId:1},{unique:true}],
  ['landmarks',{venueId:1,enabled:1},{}],
  ['meetups',{meetupId:1},{unique:true}],
  ['meetups',{requesterId:1,startsAt:1},{}],
  ['meetups',{targetId:1,startsAt:1},{}],
  ['meetups',{expiresAt:1},{expireAfterSeconds:0}],
  ['tickets',{ticketDigest:1},{unique:true}],
  ['tickets',{userId:1},{unique:true}],
  ['profiles',{userId:1},{unique:true}],
  ['profiles',{handle:1},{unique:true}],
  ['profiles',{discoverable:1,roles:1},{}],
  ['presence',{userId:1},{unique:true}],
  ['presence',{expiresAt:1},{expireAfterSeconds:0}],
  ['locations',{userId:1},{unique:true}],
  ['locations',{expiresAt:1},{expireAfterSeconds:0}],
  ['locations',{geo:'2dsphere'},{}],
  ['shares',{userId:1},{unique:true}],
  ['shares',{expiresAt:1},{expireAfterSeconds:0}],
  ['notes',{ownerId:1,targetId:1},{unique:true}],
  ['follows',{followerId:1,followedId:1},{unique:true}],
  ['blocks',{blockerId:1,blockedId:1},{unique:true}],
  ['requests',{requesterId:1,targetId:1,status:1},{}],
  ['requests',{expiresAt:1},{expireAfterSeconds:0}],
  ['venues',{enabled:1,startAt:1,endAt:1},{}],
  ['reports',{createdAt:1},{}],
  ['reports',{reportId:1},{unique:true}],
  ['reports',{status:1,createdAt:-1},{}],
  ['audit',{createdAt:1},{}],
  ['peerTokens',{digest:1},{unique:true}],
  ['peerTokens',{cleanupAt:1},{expireAfterSeconds:0}],
  ['posts',{postId:1},{unique:true}],
  ['posts',{createdAt:-1},{}],
  ['posts',{authorId:1,createdAt:-1},{}],
  ['postLikes',{postId:1,userId:1},{unique:true}],
  ['comments',{commentId:1},{unique:true}],
  ['comments',{postId:1,createdAt:1},{}],
  ['comments',{authorId:1,createdAt:-1},{}],
  ['messages',{messageId:1},{unique:true}],
  ['messages',{senderId:1,recipientId:1,createdAt:-1},{}],
  ['messages',{recipientId:1,readAt:1},{}]

];
function sameKey(a,b){return JSON.stringify(Object.entries(a))===JSON.stringify(Object.entries(b))}
function sameOptions(old,options){return Boolean(old.unique)===Boolean(options.unique) &&
  (old.expireAfterSeconds??null)===(options.expireAfterSeconds??null)}

export async function ensureIndexes(db){
  const names=[...new Set(INDEX_SPECS.map(x=>x[0]))];
  const existing=new Map();
  for(const name of names){
    try{existing.set(name,await db.collection(name).indexes());}
    catch(error){if(error.code!==26)throw error;existing.set(name,[]);}
  }
  for(const [name,key,options] of INDEX_SPECS){
    const collection=db.collection(name);
    const list=existing.get(name);
    const old=list.find(i=>sameKey(i.key,key));
    if(old && sameOptions(old,options))continue;
    if(old){
      // Existing named indexes created by earlier schema/bootstrap often lack unique/TTL constraints.
      // Repair them *only* if collection is empty. Never risk dropping live uniqueness constraints.
      if(typeof collection.countDocuments!=='function' || typeof collection.dropIndex!=='function'||
         await collection.countDocuments({}, {limit:1})!==0 || !old.name){
        throw new Error(`Existing ${name} index has incompatible uniqueness/TTL settings: ${JSON.stringify(key)}`);
      }
      await collection.dropIndex(old.name);
      existing.set(name,list.filter(i=>i!==old));
    }
    const idxName=await collection.createIndex(key,options);
    existing.get(name).push({name:idxName,key,...options});
  }
}
