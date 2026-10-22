// Optional migration guard: refuse a broadly privileged credential before index
// initialization or application routes can access the database.
export function assertScopedDatabaseIdentity(status,username,database){
  const info=status?.authInfo;
  const users=info?.authenticatedUsers||[],roles=info?.authenticatedUserRoles||[];
  if(users.length!==1||users[0].user!==username||roles.length!==1||
    roles[0].role!=='readWrite'||roles[0].db!==database){
    throw new Error('Dedicated database identity must have only readWrite on its configured database');
  }
}
