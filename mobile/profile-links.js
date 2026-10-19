// Shared by the web and native clients: API and preview hosts never become QR origins.
export const PROFILE_ORIGIN='https://devcon-follow.vercel.app';
export function profileUrl(userId){
  if(typeof userId!=='string'||!userId||userId.length>512||/[\u0000-\u001f\u007f]/.test(userId))throw new Error('Invalid profile identity');
  return PROFILE_ORIGIN+'/?profile='+encodeURIComponent(userId);
}
export function profileId(value){
  try{
    if(typeof value!=='string'||value.length>2200)return null;
    const url=new URL(value),keys=[...url.searchParams.keys()],id=url.searchParams.get('profile');
    if(url.origin!==PROFILE_ORIGIN||url.pathname!=='/'||url.username||url.password||url.hash||keys.length!==1||keys[0]!=='profile')return null;
    profileUrl(id);return id;
  }catch{return null}
}
