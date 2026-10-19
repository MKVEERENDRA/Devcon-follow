export const TOKEN_KEY='devcon_follow_access_token';
export const SESSION_KEY='devcon_follow_session';
// Clear in-memory private state before waiting on the operating system keystore.
export async function clearStoredSession(store,clearState){
  clearState();
  await Promise.all([store.deleteItemAsync(TOKEN_KEY),store.deleteItemAsync(SESSION_KEY)]);
}
