import {MongoClient} from 'mongodb';
import {ensureIndexes} from './indexes.js';
import {assertScopedDatabaseIdentity} from './database-permissions.js';

export async function openDatabase(uri,dbName,{expectedUser,allowReadAnyDatabase=false}={}){
  if(!uri||!dbName)throw new Error('MONGODB_URI and MONGODB_DB required');
  const client=new MongoClient(uri,{maxPoolSize:20,serverSelectionTimeoutMS:8000});
  try{
    await client.connect();
    if(expectedUser){
      const status=await client.db('admin').command({connectionStatus:1});
      assertScopedDatabaseIdentity(status,expectedUser,dbName,{allowReadAnyDatabase});
    }
    const db=client.db(dbName);
    await ensureIndexes(db);
    return {client,db};
  }catch(error){await client.close();throw error}
}
