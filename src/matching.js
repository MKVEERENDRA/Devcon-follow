const roles=['Founder','Builder','Security Researcher','Developer','Investor','Student','Recruiter','Other'];
const normalized=value=>String(value||'').trim().toLowerCase();
export function matchingPreferences(profile){
 const goal=normalized(profile?.lookingFor);
 return {interests:[...new Set((profile?.interests||[]).map(normalized).filter(Boolean))].slice(0,12),wantedRoles:roles.filter(role=>{const words=role==='Investor'?['investor','vc','venture capital']:[role.toLowerCase()];return words.some(word=>new RegExp('\\b'+word+'s?\\b').test(goal))&&!words.some(word=>new RegExp('\\b(?:not|no|avoid|except|excluding|without)\\b[^,;.!\\n]{0,60}\\b'+word+'s?\\b').test(goal))})};
}
export function matchDetails(profile,preferences){
 const seen=new Set(),sharedInterests=[];
 for(const interest of profile.interests||[]){const key=normalized(interest);if(preferences.interests.includes(key)&&!seen.has(key)){seen.add(key);sharedInterests.push(interest)}}
 const matchingRoles=(profile.roles||[]).filter(r=>preferences.wantedRoles.includes(r));
 return {sharedInterests,matchingRoles,openToMeet:profile.openToMeet===true};
}
export function matchingStages(preferences,last){
 return [
  {$set:{matchScore:{$add:[{$multiply:[3,{$size:{$setIntersection:[{$map:{input:{$ifNull:['$profile.interests',[]]},as:'interest',in:{$toLower:{$trim:{input:'$$interest'}}}}},{$literal:preferences.interests}]}}]},{$cond:[{$gt:[{$size:{$setIntersection:[{$ifNull:['$profile.roles',[]]},{$literal:preferences.wantedRoles}]}},0]},4,0]},{$cond:[{$eq:['$profile.openToMeet',true]},1,0]}]}}},
  ...(last?[{$match:{$or:[{matchScore:{$lt:last.score}},{matchScore:last.score,userId:{$gt:last.userId}}]}}]:[]),
  {$sort:{matchScore:-1,userId:1}}
 ];
}
