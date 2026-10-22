import {createHash} from 'node:crypto';
const text=value=>String(value||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const date=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function foldCalendarLine(line){
 const lines=[];let chunk='',size=0;
 for(const char of line){const bytes=Buffer.byteLength(char);if(size+bytes>75){lines.push(chunk);chunk=' ';size=1}chunk+=char;size+=bytes}
 lines.push(chunk);return lines.join('\r\n');
}
export function meetingCalendar(meeting,otherName,landmark,now=new Date()){
 const uid=createHash('sha256').update(meeting.meetupId).digest('hex');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Devcon Follow//Meetups//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${uid}@devcon-follow.vercel.app`,`DTSTAMP:${date(now)}`,`DTSTART:${date(meeting.startsAt)}`,`DTEND:${date(+new Date(meeting.startsAt)+1800000)}`,`SUMMARY:${text('Meet '+otherName)}`,`LOCATION:${text(landmark.name)}`,`GEO:${landmark.lat};${landmark.lon}`,'DESCRIPTION:Devcon Follow public landmark meetup. One-time export\\; changes and cancellations do not sync. Check the app before travelling.','STATUS:CONFIRMED','CLASS:PRIVATE','BEGIN:VALARM','TRIGGER:-PT5M','ACTION:DISPLAY','DESCRIPTION:Devcon Follow meetup in five minutes','END:VALARM','END:VEVENT','END:VCALENDAR'];
 return {filename:'devcon-meetup-'+uid.slice(0,16)+'.ics',content:lines.map(foldCalendarLine).join('\r\n')+'\r\n',snapshot:true};
}
