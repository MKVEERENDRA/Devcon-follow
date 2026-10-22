import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingPreferences,matchDetails} from '../src/matching.js';
import {meetingCalendar} from '../src/meeting-calendar.js';
test('recommendation explanations use only declared interests and meeting goals',()=>{
 const preferences=matchingPreferences({lookingFor:'Founders and VCs working with security researchers',interests:[' Ethereum ','ethereum','ZK']});
 assert.deepEqual(preferences,{interests:['ethereum','zk'],wantedRoles:['Founder','Security Researcher','Investor']});
 assert.deepEqual(matchDetails({interests:['Ethereum','ethereum','Privacy'],roles:['Investor'],openToMeet:true},preferences),{sharedInterests:['Ethereum'],matchingRoles:['Investor'],openToMeet:true});
 assert.deepEqual(matchingPreferences(null),{interests:[],wantedRoles:[]});
});
test('recommendations do not treat common role exclusions as positive goals',()=>{assert.deepEqual(matchingPreferences({lookingFor:'Founders, not investors or VCs'}).wantedRoles,['Founder']);assert.deepEqual(matchingPreferences({lookingFor:'another conversation'}).wantedRoles,[])});
test('calendar uses UTC, stable UID, UTF-8 line folding and escapes property injection',()=>{
 const meeting={meetupId:'synthetic-calendar-only',startsAt:'2026-11-03T10:00:00+05:30',reason:'DO NOT EXPORT PRIVATE REASON'},place={name:'Coffee, room; 1\nBEGIN:VEVENT',lat:19.01,lon:72.85};
 const result=meetingCalendar(meeting,'Attendee '+('🙂'.repeat(60)),place,new Date('2026-10-22T00:00:00Z'));
 assert.match(result.content,/DTSTART:20261103T043000Z\r\nDTEND:20261103T050000Z/);
 assert.match(result.content,/LOCATION:Coffee\\, room\\; 1\\nBEGIN:VEVENT/);
 assert.equal(result.content.match(/^BEGIN:VEVENT$/gm)?.length,1);assert(!result.content.includes(meeting.reason));
 assert(!/ATTENDEE|mailto:|Authorization|TOKEN/.test(result.content));
 for(const line of result.content.split('\r\n'))assert(Buffer.byteLength(line)<=75);
 assert(!/(?<!\r)\n/.test(result.content),'all physical lines use CRLF');
 assert.equal(result.filename,meetingCalendar(meeting,'changed',place).filename,'re-export keeps stable calendar identity');
 assert.match(result.content,/CLASS:PRIVATE/);assert.match(result.content,/TRIGGER:-PT5M/);
});
