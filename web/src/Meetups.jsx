import React,{useCallback,useEffect,useState} from 'react';

export function MeetupComposer({api,targetId,onSent}){
  const [landmarks,setLandmarks]=useState([]),[landmarkId,setLandmark]=useState(''),[startsAt,setTime]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;api('/landmarks').then(r=>{if(live)setLandmarks(r.landmarks)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[api]);
  return <form className="panel profile-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/meetups','POST',{targetId,landmarkId,startsAt:new Date(startsAt).toISOString()});onSent()}catch(e){setError(e.message)}finally{setBusy(false)}}}>
    <h3>Meet at a public landmark</h3><p className="small dim">This invitation shares a public meeting place. Your GPS location stays private.</p>
    <label>Meeting place<select required value={landmarkId} onChange={e=>setLandmark(e.target.value)}><option value="">Choose a landmark</option>{landmarks.map(l=><option key={l.landmarkId} value={l.landmarkId}>{l.name}</option>)}</select></label>
    <label>Time ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input required type="datetime-local" value={startsAt} onChange={e=>setTime(e.target.value)}/></label>
    {!landmarks.length&&<p>No approved landmarks available. Venue administrators must configure them first.</p>}{error&&<p role="alert">{error}</p>}
    <button className="button primary" disabled={busy||!landmarks.length}>Send meeting invitation</button>
  </form>;
}
export function MeetupsPanel({api}){
  const [meetups,setMeetups]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{const r=await api('/meetups');setMeetups(r.meetups);setError('')}catch(e){setMeetups([]);setError(e.message)}},[api]);
  useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer)},[load]);
  const decide=async(id,decision)=>{setBusy(true);try{await api('/meetups/'+encodeURIComponent(id)+'/decision','POST',{decision});await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <section><h2>Landmark meetups</h2><p>Agree on a public place and time without sharing your live location.</p>{error&&<p role="alert">{error}</p>}{!meetups.length&&<p>No meeting invitations yet. Open an attendee profile to invite them.</p>}
    {meetups.map(m=><div className="panel" key={m.meetupId}><h3>{m.otherName} · {m.landmark.name}</h3><p>{new Date(m.startsAt).toLocaleString()} · {m.status}</p>{m.status==='accepted'&&Date.parse(m.startsAt)>Date.now()&&Date.parse(m.startsAt)-Date.now()<=300000&&<p role="status">Your meeting starts within five minutes.</p>}<div className="cta-row">
      {m.incoming&&m.status==='pending'&&<><button className="button primary" disabled={busy} onClick={()=>decide(m.meetupId,'accepted')}>Accept meeting</button><button className="button secondary" disabled={busy} onClick={()=>decide(m.meetupId,'declined')}>Decline meeting</button></>}
      {['pending','accepted'].includes(m.status)&&<button className="button secondary" disabled={busy} onClick={()=>decide(m.meetupId,'cancelled')}>Cancel meeting</button>}
      {m.status==='accepted'&&<a className="button secondary" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(m.landmark.lat+','+m.landmark.lon)+'&travelmode=walking'}>Directions to public landmark</a>}
    </div></div>)}
  </section>;
}
