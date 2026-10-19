import React,{useCallback,useEffect,useState} from 'react';
import {AppState,Platform,Pressable,Text,View} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {theme} from './theme';
type Api=(path:string,method?:string,body?:unknown)=>Promise<any>;
const labels:Record<string,string>={pending:'New meeting invitation',accepted:'Meeting confirmed',declined:'Meeting declined',cancelled:'Meeting cancelled',expired:'Invitation expired',elapsed:'Meeting time has passed',reminder:'Meeting starts within five minutes'};
export function NativeMeetingAlerts({api,onSelect}:{api:Api;onSelect:(tab:'pending'|'accepted'|'past')=>void}){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const r=await api('/meeting-notifications');setItems(r.notifications);setError('')}catch(e){setItems([]);setError(e instanceof Error?e.message:'Updates unavailable')}},[api]);
 useEffect(()=>{void load();const timer=setInterval(()=>{if(AppState.currentState==='active')void load()},30000);const foreground=AppState.addEventListener('change',s=>{if(s==='active')void load()});const response=Notifications.addNotificationResponseReceivedListener(()=>{void load()});return()=>{clearInterval(timer);foreground.remove();response.remove()}},[load]);
 const enable=async()=>{setBusy(true);setStatus('');try{
   const projectId=Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId;if(!projectId)throw Error('Device push requires an authorized EAS project and signed app. Meeting updates still work here.');
   if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('meetups',{name:'Meeting updates',importance:Notifications.AndroidImportance.DEFAULT});
   let permission=await Notifications.getPermissionsAsync();if(!permission.granted)permission=await Notifications.requestPermissionsAsync();if(!permission.granted)throw Error('Notifications are off. Saved updates remain available in Meetups.');
   const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;await api('/push-devices','POST',{token});setStatus('Device notifications enabled. Delivery depends on your phone and network.');
 }catch(e){setStatus(e instanceof Error?e.message:'Unable to enable push')}finally{setBusy(false)}};
 const action=(title:string,run:()=>void)=><Pressable accessibilityRole="button" accessibilityState={{disabled:busy}} disabled={busy} onPress={run} style={{minHeight:48,padding:12}}><Text style={{color:theme.blue}}>{title}</Text></Pressable>;
 return <View style={{gap:8}}><Text accessibilityRole="header" style={{fontSize:20,color:theme.ink}}>Meeting updates</Text><Text>Missed live alerts remain here. Confirmed meetings reserve 30 minutes.</Text>{error?<>{<Text accessibilityRole="alert">{error}</Text>}{action('Retry meeting updates',()=>void load())}</>:!items.some(n=>!n.readAt)?<Text>No unread meeting updates.</Text>:items.filter(n=>!n.readAt).map(n=><View key={n.notificationId}>{action(labels[n.type]||'Meeting updated',()=>{void api('/meeting-notifications/'+encodeURIComponent(n.notificationId)+'/read','POST').then(()=>{onSelect(n.type==='accepted'||n.type==='reminder'?'accepted':n.type==='pending'?'pending':'past');return load()}).catch(e=>setError(e.message))})}</View>)}{action('Enable device notifications',()=>void enable())}{action('Disable notifications on all my devices',()=>{setBusy(true);void api('/push-devices','DELETE').then(()=>setStatus('Device notifications disabled.')).catch(e=>setStatus(e.message)).finally(()=>setBusy(false))})}{!!status&&<Text accessibilityLiveRegion="polite">{status}</Text>}</View>;
}
