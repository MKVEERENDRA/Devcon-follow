export const TOKEN_KEY='devcon_follow_access_token';
export const SESSION_KEY='devcon_follow_session';
// Clear in-memory private state before waiting on the operating system keystore.
export async function clearStoredSession(store,clearState){
  clearState();
  await Promise.all([store.deleteItemAsync(TOKEN_KEY),store.deleteItemAsync(SESSION_KEY)]);
}

// A temporary provider outage is not revocation, even after access expiry.
// Retain the rotated refresh credential in memory before keystore I/O so a
// failed write never makes the next attempt reuse a consumed credential.
export async function renewActiveSession({session,refresh,onRotated,persist,clear,isActive=()=>true,now=Date.now}){
  let result;
  try{result=await refresh(session.refreshToken)}
  catch(error){
    if(error?.code==='invalid_grant'){
      if(isActive())await clear();
      return null;
    }
    throw error;
  }
  if(!isActive())return null;
  if(typeof result.accessToken!=='string'||!result.accessToken)throw Error('The sign-in provider did not return an access token');
  const next={refreshToken:result.refreshToken||session.refreshToken,idToken:result.idToken||session.idToken,expiresAt:now()+(result.expiresIn||300)*1000};
  onRotated(next);
  await persist(result.accessToken,next);
  return isActive()?{token:result.accessToken,session:next}:null;
}

// Restore before publishing a token to React: the foreground renewal effect
// must not race a cold-start 401 and delete a freshly rotated credential.
export async function restoreStoredSession({token,session,refresh,loadAccount,persist,clear,now=Date.now}){
  let currentToken=typeof token==='string'?token:null;
  let currentSession={refreshToken:typeof session?.refreshToken==='string'?session.refreshToken:null,idToken:typeof session?.idToken==='string'?session.idToken:null,expiresAt:Number.isFinite(session?.expiresAt)?session.expiresAt:0};
  let renewed=false;
  async function renew(){
    if(!currentSession.refreshToken)return false;
    let result;
    try{result=await refresh(currentSession.refreshToken)}
    catch(error){if(error?.code==='invalid_grant')return false;throw error}
    if(typeof result.accessToken!=='string'||!result.accessToken)throw Error('The sign-in provider did not return an access token');
    currentToken=result.accessToken;
    currentSession={refreshToken:result.refreshToken||currentSession.refreshToken,idToken:result.idToken||currentSession.idToken,expiresAt:now()+(result.expiresIn||300)*1000};
    // Persist the rotated refresh credential before attempting another API read.
    // A transient API failure must not cause reuse of a consumed credential.
    await persist(currentToken,currentSession);renewed=true;return true;
  }
  if(!currentToken||currentSession.refreshToken&&now()>=currentSession.expiresAt-60000){
    if(!await renew()){await clear();return null}
  }
  let response=await loadAccount(currentToken);
  if(response.status===401&&!renewed&&currentSession.refreshToken){
    if(!await renew()){await clear();return null}
    response=await loadAccount(currentToken);
  }
  if(response.status===401){await clear();return null}
  if(!response.ok)throw Error('Could not restore saved sign-in: '+response.status);
  return {token:currentToken,session:currentSession,account:await response.json()};
}
