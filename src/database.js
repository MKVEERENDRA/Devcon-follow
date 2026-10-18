import {MongoClient} from 'mongodb';
import {ensureIndexes} from './indexes.js';

export async function openDatabase(uri,dbName){
  if(!uri||!dbName)throw new Error('MONGODB_URI and MONGODB_DB required');
  const client=new MongoClient(uri,{maxPoolSize:20,serverSelectionTimeoutMS:8000});
  try{
    await client.connect();
    const db=client.db(dbName);
    await ensureIndexes(db);
    return {client,db};
  }catch(error){await client.close();throw error}
}
