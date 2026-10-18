import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {theme} from './theme';
type Api=(path:string,method?:string,body?:unknown)=>Promise<any>;
export function NativeConnectionNote({api,userId}:{api:Api;userId:string}){
 const [note,setNote]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;setLoaded(false);setNote('');setStatus('');api('/connections/'+encodeURIComponent(userId)+'/note').then(r=>{if(active){setNote(r.note);setLoaded(true)}}).catch(e=>{if(active)setStatus(e.message)});return()=>{active=false}},[api,userId]);
 const save=async()=>{setBusy(true);setStatus('');try{await api('/connections/'+encodeURIComponent(userId)+'/note','PUT',{note});setStatus('Private note saved')}catch(e){setStatus(e instanceof Error?e.message:'Unable to save note')}finally{setBusy(false)}};
 return <View style={{gap:8,marginVertical:12}}><Text style={{color:theme.ink}}>Private connection note</Text><TextInput accessibilityLabel="Private connection note" multiline maxLength={1000} editable={loaded&&!busy} value={note} onChangeText={setNote} style={{borderWidth:1,borderColor:theme.line,color:theme.ink,borderRadius:8,padding:12}}/><Text style={{color:theme.muted}}>Only you can read this. Unfollowing deletes it.</Text><Pressable accessibilityRole="button" disabled={!loaded||busy} onPress={()=>void save()} style={{padding:12}}><Text style={{color:loaded&&!busy?theme.blue:theme.muted}}>Save private note</Text></Pressable><Text accessibilityLiveRegion="polite" style={{color:theme.muted}}>{status}</Text></View>;
}
