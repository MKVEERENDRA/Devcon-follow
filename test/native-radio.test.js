import test from 'node:test';
import assert from 'node:assert/strict';
import {openRadioSession} from '../mobile/radio-session.js';

function fixture(overrides = {}) {
  const callbacks = new Map(), removed = [], peers = [], states = [], calls = [];
  const native = {
    async start(token) { calls.push(['start', token]); },
    async rotateToken(token) { calls.push(['rotate', token]); },
    async stop() { calls.push(['stop']); },
    ...overrides,
  };
  const options = {native, events: {addListener(name, callback) {
    callbacks.set(name, callback);
    return {remove() { removed.push(name); }};
  }}, authorize: async () => {}, token: 'initial', onPeerToken: t => peers.push(t), onState: s => states.push(s)};
  return {options, callbacks, removed, peers, states, calls, emit: (name, event) => callbacks.get(name)?.(event)};
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('denied nearby-device permission never starts or subscribes to Bluetooth', async () => {
  const f = fixture();
  f.options.authorize = async () => { throw Error('Permission denied'); };
  await assert.rejects(openRadioSession(f.options), /Permission denied/);
  assert.equal(f.callbacks.size, 0); assert.deepEqual(f.calls, []);
});
test('successful radio rotates anonymous token; Stop is idempotent and ignores queued callbacks', async () => {
  const f = fixture(), radio = await openRadioSession(f.options);
  f.emit('onPeerToken', {token: 'peer'}); f.emit('onPeerToken', {token: 42});
  f.emit('onBluetoothState', {state: 'powered_on'});
  radio.rotate('next'); radio.stop(); radio.stop(); radio.rotate('late');
  f.emit('onPeerToken', {token: 'after-stop'}); f.emit('onBluetoothState', {state: 'scan_error'});
  assert.deepEqual(f.calls, [['start', 'initial'], ['rotate', 'next'], ['stop']]);
  assert.deepEqual(f.peers, ['peer']); assert.deepEqual(f.states, ['powered_on']);
  assert.equal(f.removed.length, 2);
});
for (const state of ['unavailable', 'scan_error', 'advertise_error', 'gatt_service_error', 'permission_denied']) {
  test(`fatal ${state} stops radio and rejects later peers while GPS can remain active`, async () => {
    const f = fixture(), radio = await openRadioSession(f.options);
    f.emit('onBluetoothState', {state});
    f.emit('onPeerToken', {token: 'late'}); radio.rotate('late'); radio.stop();
    assert.deepEqual(f.calls, [['start', 'initial'], ['stop']]);
    assert.deepEqual(f.states, [state]); assert.deepEqual(f.peers, []); assert.equal(f.removed.length, 2);
  });
}
test('partial startup rejection cleans native resources and listeners', async () => {
  let stopped = 0;
  const f = fixture({async start() { throw Error('Partial startup'); }, async stop() { stopped++; }});
  await assert.rejects(openRadioSession(f.options), /Partial startup/);
  f.emit('onPeerToken', {token: 'late'});
  assert.equal(stopped, 1); assert.equal(f.removed.length, 2); assert.deepEqual(f.peers, []);
});
for (const sync of [true, false]) {
  test(`${sync ? 'synchronous' : 'asynchronous'} rotation failure cleans radio`, async () => {
    let stopped = 0;
    const f = fixture({rotateToken() { if (sync) throw Error('Radio gone'); return Promise.reject(Error('Radio gone')); }, async stop() { stopped++; }});
    const radio = await openRadioSession(f.options);
    radio.rotate('next'); await flush();
    f.emit('onPeerToken', {token: 'late'}); radio.stop();
    assert.equal(stopped, 1); assert.deepEqual(f.states, ['unavailable']); assert.equal(f.removed.length, 2); assert.deepEqual(f.peers, []);
  });
}
test('fatal callback during pending start cannot revive a stopped radio', async () => {
  let finish;
  const f = fixture({start() { return new Promise(resolve => { finish = resolve; }); }});
  const pending = openRadioSession(f.options); await flush();
  f.emit('onBluetoothState', {state: 'scan_error'}); finish();
  const radio = await pending; radio.rotate('next');
  f.emit('onPeerToken', {token: 'late'});
  assert.deepEqual(f.peers, []); assert.deepEqual(f.calls, [['stop']]);
});
test('native stop throwing still removes listeners and prevents callbacks', async () => {
  const f = fixture({stop() { throw Error('Adapter disconnected'); }});
  const radio = await openRadioSession(f.options);
  assert.doesNotThrow(() => radio.stop()); f.emit('onPeerToken', {token: 'late'});
  assert.deepEqual(f.peers, []); assert.equal(f.removed.length, 2);
});
