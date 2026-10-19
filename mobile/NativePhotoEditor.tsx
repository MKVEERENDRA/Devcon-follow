import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,Text,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
import {theme} from './theme';
export function NativePhotoEditor({value,onChange}:{value:string|null;onChange:(value:string|null)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const choose=async()=>{setBusy(true);setError('');try{
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8,exif:false});if(result.canceled||!mounted.current)return;
  const source=ImageManipulator.manipulate(result.assets[0].uri,{maxWidth:1024,maxHeight:1024});
  try{const original=await source.renderAsync();try{const size=Math.min(original.width,original.height);const edit=ImageManipulator.manipulate(original).crop({originX:Math.floor((original.width-size)/2),originY:Math.floor((original.height-size)/2),width:size,height:size}).resize({width:180,height:180});try{const image=await edit.renderAsync();try{for(const compress of [.78,.6,.4,.25]){const saved=await image.saveAsync({format:SaveFormat.JPEG,compress,base64:true});const encoded='data:image/jpeg;base64,'+saved.base64;if(saved.base64&&encoded.length<=45000){if(mounted.current)onChange(encoded);return}}throw Error('Choose a smaller photo; the compressed photo exceeds the safe limit.')}finally{image.release()}}finally{edit.release()}}finally{original.release()}}finally{source.release()}
 }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Photo unavailable. You can keep your current photo or try again.')}finally{if(mounted.current)setBusy(false)}};
 return <View style={{gap:8}}>{value&&<Image source={{uri:value}} accessibilityLabel="Your profile photo preview" style={{width:90,height:90,borderRadius:45}}/>}<Pressable accessibilityRole="button" accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>void choose()} style={{padding:12,minHeight:48}}><Text style={{color:theme.blue}}>{busy?'Preparing photo…':'Choose or edit photo'}</Text></Pressable>{value&&<Pressable accessibilityRole="button" accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>onChange(null)} style={{padding:12,minHeight:48}}><Text style={{color:theme.red}}>Remove photo</Text></Pressable>}{!!error&&<Text accessibilityRole="alert">{error}</Text>}<Text style={{color:theme.muted}}>Your photo stays in this draft until you save your profile. Cancelling keeps the existing photo.</Text></View>;
}
