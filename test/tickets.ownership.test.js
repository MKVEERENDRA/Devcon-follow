import test from 'node:test';
import assert from 'node:assert/strict';
import {createTicketVerifier} from '../src/tickets.js';

const setup = () => createTicketVerifier({
  url:'https://organizer.example.test/attest',
  token:'server-side-secret',
  hmacKey:'32-plus-bytes-of-server-private-key-material',
});
const realFetch = globalThis.fetch;

test('organizer verifier never treats a QR code alone as verified ownership', async t => {
  const calls=[];
  globalThis.fetch=async (url, options)=>{
    calls.push({url, options});
    return new Response(JSON.stringify({eligible:true,identityBound:false,ticketId:'ticket-A',identitySubject:'person-A'}),{status:200});
  };
  t.after(()=>{globalThis.fetch=realFetch});
  await assert.rejects(setup().verify({ticketSecret:'untrusted-qr-value',subject:'person-A',email:'a@example.com'}),/ownership could not be verified/i);
  assert.equal(calls[0].url,'https://organizer.example.test/attest');
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.redirect,'error');
});

test('organizer verifier rejects identity-bound tickets for another subject', async t => {
  globalThis.fetch=async()=>new Response(JSON.stringify({eligible:true,identityBound:true,ticketId:'ticket-A',identitySubject:'person-B'}),{status:200});
  t.after(()=>{globalThis.fetch=realFetch});
  await assert.rejects(setup().verify({ticketSecret:'untrusted-qr-value',subject:'person-A',email:null}),/ownership could not be verified/i);
});

test('organizer verifier stores only HMAC digest after successful identity proof', async t => {
  globalThis.fetch=async()=>new Response(JSON.stringify({eligible:true,identityBound:true,ticketId:'ticket-A',identitySubject:'person-A'}),{status:200});
  t.after(()=>{globalThis.fetch=realFetch});
  const verified=await setup().verify({ticketSecret:'ticket-secret-must-not-be-stored',subject:'person-A',email:'a@example.com'});
  assert.equal(verified.status,'verified');
  assert.equal(verified.userId,'person-A');
  assert.match(verified.ticketDigest,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(verified).includes('ticket-A'),false);
  assert.equal(JSON.stringify(verified).includes('ticket-secret-must-not-be-stored'),false);
});

test('organizer provider outage cannot verify an attendee', async t => {
  globalThis.fetch=async()=>new Response('',{status:503});
  t.after(()=>{globalThis.fetch=realFetch});
  await assert.rejects(setup().verify({ticketSecret:'untrusted-qr-value',subject:'person-A',email:null}),/unavailable or declined/i);
});
