import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from 'react-oidc-context';
import App from './App.jsx';
import './styles.css';

async function boot(){
  let config=null;
  try{const response=await fetch('/client-config',{cache:'no-store'});if(response.ok)config=await response.json()}catch{}
  const container=document.getElementById('root');
  if(config?.authReady && config?.clientId && config?.issuer){
    createRoot(container).render(<AuthProvider authority={config.issuer} client_id={config.clientId} redirect_uri={window.location.origin+'/'} post_logout_redirect_uri={window.location.origin+'/'} scope="openid profile email" response_type="code" automaticSilentRenew={true} onSigninCallback={()=>window.history.replaceState({},document.title,window.location.pathname)} extraQueryParams={config.audience?{audience:config.audience}:{}}><App config={config}/></AuthProvider>);
  } else createRoot(container).render(<App config={config||{authReady:false,ticketReady:false}}/>);
}
boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
