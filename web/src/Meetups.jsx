import {MeetingAlerts} from './MeetingAlerts';
import {CalendarDays,MapPin,Users} from 'lucide-react';
import React,{useCallback,useEffect,useRef,useState} from 'react';

const statusLabel={pending:'Awaiting response',accepted:'Confirmed',declined:'Declined',cancelled:'Cancelled',expired:'Invitation expired',elapsed:'Time passed'};
export function MeetupComposer({api,targetId,onSent}){
  const [landmarks,setLandmarks]=useState([]),[landmarkId,setLandmark]=useState(''),[startsAt,setTime]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const submission=useRef(null);
  useEffect(()=>{let live=true;api('/landmarks').then(r=>{if(live)setLandmarks(r.landmarks)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[api]);
  return <form className="panel profile-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const body={targetId,landmarkId,reason,startsAt:new Date(startsAt).toISOString()};const fingerprint=JSON.stringify(body);if(submission.current?.fingerprint!==fingerprint)submission.current={fingerprint,requestId:crypto.randomUUID()};await api('/meetups','POST',{...body,requestId:submission.current.requestId});onSent()}catch(e){setError(e.message)}finally{setBusy(false)}}}>
    <h3>Meet at a public landmark</h3><p className="small dim">This invitation shares a public meeting place. Your GPS location stays private.</p>
    <label>Why would you like to meet?<textarea maxLength={280} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="I’m building a security tool. Would love to compare notes over coffee."/></label>
    <label>Meeting place<select required value={landmarkId} onChange={e=>setLandmark(e.target.value)}><option value="">Choose a landmark</option>{landmarks.map(l=><option key={l.landmarkId} value={l.landmarkId}>{l.name}</option>)}</select></label>
    <label>Time ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input required type="datetime-local" value={startsAt} onChange={e=>setTime(e.target.value)}/></label>
    {!landmarks.length&&<p>No approved landmarks available. Venue administrators must configure them first.</p>}{error&&<p role="alert">{error}</p>}
    <button className="button primary" disabled={busy||!landmarks.length}>Send meeting invitation</button>
  </form>;
}
export function MeetupsPanel({api,onPropose,onSite}){
  const [tab,setTab]=useState('pending');
  const [meetups,setMeetups]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{try{const r=await api('/meetups');setMeetups(r.meetups);setError('')}catch(e){setMeetups([]);setError(e.message)}finally{setLoading(false)}},[api]);
  useEffect(()=>{load();const timer=setInterval(load,15000);const reload=()=>void load();window.addEventListener('online',reload);window.addEventListener('devcon-meeting-update',reload);return()=>{clearInterval(timer);window.removeEventListener('online',reload);window.removeEventListener('devcon-meeting-update',reload)}},[load]);
  const decide=async(id,decision)=>{setBusy(true);try{await api('/meetups/'+encodeURIComponent(id)+'/decision','POST',{decision});if(decision==='accepted')setTab('accepted');await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <section><div className="page-hero"><h1>Meetups</h1><p>Make time for a good conversation.</p></div><MeetingAlerts api={api} onSelect={setTab}/><p className="small dim">Upcoming invitations first; history keeps the 50 most recent meetings for up to 30 days.</p><div className="segmented">{[['pending','Pending'],['accepted','Confirmed'],['past','History']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}</div>{error&&<p role="alert">{error} <button className="text-button" onClick={load}>Retry meetups</button></p>}{loading&&<p role="status">Loading meetups…</p>}{!loading&&!error&&!meetups.some(m=>tab==='past'?!['pending','accepted'].includes(m.status)||Date.parse(m.startsAt)<Date.now():m.status===tab&&Date.parse(m.startsAt)>=Date.now())&&<div className="empty"><Users/><h3>No {tab==='accepted'?'confirmed':tab==='past'?'past':'pending'} meetups</h3><p>Open an attendee profile to invite them to a public landmark.</p></div>}
    {meetups.filter(m=>tab==='past'?!['pending','accepted'].includes(m.status)||Date.parse(m.startsAt)<Date.now():m.status===tab&&Date.parse(m.startsAt)>=Date.now()).map(m=><div className="panel meetup-card" key={m.meetupId}><div className="meeting-heading"><h3>{m.otherName}</h3><span className="status-pill muted">{statusLabel[m.status]||m.status}</span></div><p className="meta"><CalendarDays/>{new Date(m.startsAt).toLocaleString()}</p><p className="meta"><MapPin/>{m.landmark.name}</p>{m.reason&&<p className="meeting-reason">{m.reason}</p>}{m.status==='accepted'&&Date.parse(m.startsAt)>Date.now()&&Date.parse(m.startsAt)-Date.now()<=300000&&<p role="status">Your meeting starts within five minutes.</p>}<div className="cta-row">
      {m.incoming&&m.status==='pending'&&Date.parse(m.startsAt)>Date.now()&&<><button className="button primary" disabled={busy} onClick={()=>decide(m.meetupId,'accepted')}>Accept meeting</button><button className="button secondary" disabled={busy} onClick={()=>decide(m.meetupId,'declined')}>Decline meeting</button></>}
      {['pending','accepted'].includes(m.status)&&Date.parse(m.startsAt)>Date.now()&&<button className="button secondary" disabled={busy} onClick={()=>decide(m.meetupId,'cancelled')}>Cancel meeting</button>}
      {onPropose&&onSite&&['pending','accepted'].includes(m.status)&&Date.parse(m.startsAt)>Date.now()&&<button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/meetups/'+encodeURIComponent(m.meetupId)+'/decision','POST',{decision:'cancelled'});onPropose(m.incoming?m.requesterId:m.targetId)}catch(e){setError(e.message)}finally{setBusy(false)}}}>Cancel and propose another time</button>}
      {m.status==='accepted'&&<a className="button secondary" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(m.landmark.lat+','+m.landmark.lon)+'&travelmode=walking'}>Directions to public landmark</a>}
    </div></div>)}
  </section>;
}
