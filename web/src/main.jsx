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
  if(window.location.pathname==='/install'||window.location.pathname==='/install/'||window.location.pathname==='/install.html'){createRoot(document.getElementById('root')).render(<NativeInstall/>);return;}
  let config=null,connectionError=false;
  const container=document.getElementById('root');
  const root=createRoot(container);
  root.render(<main className="center-screen" role="status">Connecting securely…</main>);
  try{const response=await fetch('/client-config',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Client configuration unavailable');config=await response.json()}catch{connectionError=true}
  if(config?.authReady && config?.clientId && config?.issuer){
    root.render(<AuthProvider authority={config.issuer} client_id={config.clientId} redirect_uri={window.location.origin+'/'} post_logout_redirect_uri={window.location.origin+'/'} scope="openid profile email offline_access" response_type="code" automaticSilentRenew={true} revokeTokensOnSignout={true} onSigninCallback={()=>window.history.replaceState({},document.title,window.location.pathname)} extraQueryParams={config.audience?{audience:config.audience}:{}}><App config={config}/></AuthProvider>);
  } else root.render(<App config={config||{authReady:false,ticketReady:false,connectionError}}/>);
}
boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
