import test from 'node:test';
import assert from 'node:assert/strict';
import {createTicketVerifier} from '../src/tickets.js';
test('organizer adapter fails closed when there is no authorized provider',async()=>{
  const v=createTicketVerifier({url:'',token:'',hmacKey:''});
  assert.equal(v.configured,false);
  await assert.rejects(()=>v.verify({ticketSecret:'some-ticket',subject:'alice'}),{statusCode:503});
});
test('organizer adapter refuses HTTP URL even when other settings exist',async()=>{
  const v=createTicketVerifier({url:'http://localhost',token:'abc',hmacKey:'a'.repeat(32)});
  await assert.rejects(()=>v.verify({ticketSecret:'some-ticket',subject:'alice'}),/HTTPS/);
});
