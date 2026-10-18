import React,{useState} from 'react';
export function CommunityAccess({api,onAccepted}){
  const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <form className="panel profile-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/access/redeem','POST',{code:code.trim()});setCode('');await onAccepted()}catch(e){setError(e.message)}finally{setBusy(false)}}}><h3>Community invitation</h3><p>This grants community participation only. It does not verify a Devcon ticket or grant conference admission. Use the verified email address the invitation was issued to.</p><label>Invitation code<input required type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy||!code.trim()}>Accept community invitation</button></form>;
}
