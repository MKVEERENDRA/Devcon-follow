// Cache the install shell only; authenticated endpoints and location data are NEVER cached.
const NAME='devcon-follow-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(NAME).then(c=>c.addAll(['/','/manifest.webmanifest','/icons/icon.svg'])));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/v1/')||url.pathname.startsWith('/health/')||url.pathname.includes('config'))return;
  // Never place OAuth callback URLs (?code=...&state=...) or user-specific navigation into Cache Storage.
  if(url.search || event.request.headers?.get?.('authorization'))return;
  const isStaticPage=url.pathname==='/' || url.pathname==='/privacy.html';
  const isStaticAsset=url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname==='/manifest.webmanifest';
  if(!isStaticPage && !isStaticAsset)return;
  if(!['document','style','script','image','manifest'].includes(event.request.destination))return;
  event.respondWith(fetch(event.request).then(resp=>{if(resp.ok){const copy=resp.clone();caches.open(NAME).then(c=>c.put(event.request,copy))}return resp}).catch(()=>caches.match(event.request)));
});
