import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from 'react-oidc-context';
import App from './App.jsx';
import {NativeInstall} from './NativeInstall';
import './styles.css';

async function boot(){
  const install=['/install','/install/','/install.html'].includes(window.location.pathname);
  let config=null,connectionError=false;
  const container=document.getElementById('root');
  const root=createRoot(container);
  root.render(<main className="center-screen" role="status">Connecting securely…</main>);
  try{const response=await fetch('/client-config',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Client configuration unavailable');config=await response.json()}catch{connectionError=true}
  if(config?.authReady && config?.clientId && config?.issuer){
    root.render(<AuthProvider authority={config.issuer} client_id={config.clientId} redirect_uri={window.location.origin+'/'} post_logout_redirect_uri={window.location.origin+'/'} scope="openid profile email offline_access" response_type="code" automaticSilentRenew={true} revokeTokensOnSignout={true} onSigninCallback={user=>{window.history.replaceState({},document.title,window.location.pathname);if(user?.state?.returnTo==='/install.html')window.location.replace('/install.html')}} extraQueryParams={config.audience?{audience:config.audience}:{}}>{install?<NativeInstall config={config}/>:<App config={config}/>}</AuthProvider>);
  } else root.render(install?<NativeInstall/>:<App config={config||{authReady:false,ticketReady:false,connectionError}}/>);
}
boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
