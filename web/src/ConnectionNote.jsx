import React,{useEffect,useState} from 'react';
export function ConnectionNote({api,userId}){
  const [note,setNote]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  useEffect(()=>{let active=true;setLoaded(false);setNote('');setStatus('');api('/connections/'+encodeURIComponent(userId)+'/note').then(r=>{if(active){setNote(r.note);setLoaded(true)}}).catch(e=>{if(active)setStatus(e.message)});return()=>{active=false}},[api,userId]);
  return <form className="panel profile-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/connections/'+encodeURIComponent(userId)+'/note','PUT',{note});setStatus('Private note saved')}catch(e){setStatus(e.message)}finally{setBusy(false)}}}><label>Private connection note<textarea maxLength={1000} disabled={!loaded||busy} value={note} onChange={e=>setNote(e.target.value)} rows={3}/></label><p className="small dim">Only you can read this note. Unfollowing deletes it.</p><button className="button secondary" disabled={!loaded||busy}>Save private note</button><p role="status">{status}</p></form>;
}
