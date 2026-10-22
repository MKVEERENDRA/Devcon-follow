import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
const cachedFile=()=>new File(Paths.cache,'devcon-follow-meeting.ics');
let cleanup:ReturnType<typeof setTimeout>|undefined;
export function clearCalendarExport(){if(cleanup)clearTimeout(cleanup);cleanup=undefined;try{const file=cachedFile();if(file.exists)file.delete()}catch{/* Cache cleanup must not prevent logout. */}}
export async function shareMeetingCalendar(data:{filename:string;content:string}){
 if(!/^devcon-meetup-[a-f0-9]{16}\.ics$/.test(data.filename)||typeof data.content!=='string'||data.content.length>20000)throw Error('Invalid calendar export');
 if(!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable on this device. Use the website calendar export.');
 clearCalendarExport();const file=cachedFile();file.create({overwrite:true});file.write(data.content);
 cleanup=setTimeout(clearCalendarExport,15*60*1000);
 await Sharing.shareAsync(file.uri,{mimeType:'text/calendar',UTI:'public.calendar-event',dialogTitle:'Save confirmed meetup to your calendar'});
}
