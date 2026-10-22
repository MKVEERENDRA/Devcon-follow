// Optional migration guard: refuse a broadly privileged credential before index
// initialization or application routes can access the database.
export function assertScopedDatabaseIdentity(status,username,database,{allowReadAnyDatabase=false}={}){
  const info=status?.authInfo;
  const users=info?.authenticatedUsers||[],roles=info?.authenticatedUserRoles||[];
  const scoped=roles.filter(r=>r.role==='readWrite'&&r.db===database);
  const extra=roles.filter(r=>!(r.role==='readWrite'&&r.db===database));
  const acceptedExtra=allowReadAnyDatabase&&extra.length===1&&extra[0].role==='readAnyDatabase'&&extra[0].db==='admin';
  if(users.length!==1||users[0].user!==username||scoped.length!==1||(extra.length&&!acceptedExtra)){
    throw new Error('Dedicated database identity must have only readWrite on its configured database');
  }
}
