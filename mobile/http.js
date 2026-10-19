export async function fetchWithTimeout(url,options={},timeoutMs=15000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  catch(error){if(controller.signal.aborted)throw new Error('Connection timed out. Check your network and try again.');throw new Error('Could not connect securely. Check your network and try again.')}
  finally{clearTimeout(timer)}
}
