import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer as createHttpServer} from 'node:http';
import {generateKeyPair, exportJWK, SignJWT} from 'jose';
import {buildServer} from '../src/app.js';
import {newPeerToken, tokenDigest} from '../src/peer.js';

async function setup({records = {}, extraConfig = {}} = {}) {
  const {publicKey, privateKey} = await generateKeyPair('RS256');
  const jwk = {...await exportJWK(publicKey), kid: 'devcon-follow-test', alg: 'RS256', use: 'sig'};
  const identityServer = createHttpServer((req, res) => {
    if (req.url !== '/jwks') { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'});
    res.end(JSON.stringify({keys: [jwk]}));
  });
  await new Promise(resolve => identityServer.listen(0, '127.0.0.1', resolve));
  const issuer = `http://127.0.0.1:${identityServer.address().port}/`;
  const collections = new Map();
  const matches = (doc, query = {}) => {
    if (!doc) return false;
    if (query.$or && !query.$or.some(clause => matches(doc, clause))) return false;
    return Object.entries(query).every(([key, expected]) => {
      if (key === '$or') return true;
      const actual = doc[key];
      if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
        if (expected.$in && !expected.$in.includes(actual)) return false;
        if (expected.$gt && !(new Date(actual) > expected.$gt)) return false;
        return true;
      }
      return actual === expected;
    });
  };
  const db = {
    command: async () => ({ok: 1}),
    collection(name) {
      if (!collections.has(name)) collections.set(name, {
        documents: records[name] || [],
        findOne: async query => collections.get(name).documents.find(doc => matches(doc, query)) || null,
        insertOne: async doc => { collections.get(name).documents.push(doc); return {insertedId: 'test'}; },
        find: query => ({toArray: async () => collections.get(name).documents.filter(doc => matches(doc, query))}),
      });
      return collections.get(name);
    },
  };
  const {server, io} = await buildServer({db, config: {
    LOG_LEVEL: 'silent',
    OIDC_ISSUER: issuer,
    OIDC_AUDIENCE: 'devcon-follow-api-test',
    OIDC_JWKS_URL: `${issuer}jwks`,
    WEB_OIDC_CLIENT_ID: 'devcon-follow-web-test',
    ...extraConfig,
  }});

  async function token({subject = 'user-123', audience = 'devcon-follow-api-test', tokenIssuer = issuer} = {}) {
    return new SignJWT({email: 'attendee@example.test', email_verified: true})
      .setProtectedHeader({alg: 'RS256', kid: jwk.kid})
      .setIssuer(tokenIssuer)
      .setAudience(audience)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }
  return {
    server,
    io,
    identityServer,
    token,
    close: async () => {
      await server.close();
      io.close();
      await new Promise(resolve => identityServer.close(resolve));
    },
  };
}

test('HTTP integration: health, OIDC validation, and ticket gate fail closed', async t => {
  const app = await setup();
  t.after(app.close);

  const live = await app.server.inject({method: 'GET', url: '/health/live'});
  assert.equal(live.statusCode, 200);
  assert.equal(live.json().ok, true);
  assert.equal(live.headers['x-content-type-options'], 'nosniff');
  assert.equal(live.headers['x-frame-options'], 'DENY');
  assert.equal(live.headers['referrer-policy'], 'no-referrer');
  assert.match(live.headers['content-security-policy'], /default-src 'self'/);
  assert.match(live.headers['permissions-policy'], /geolocation=\(self\)/);

  const config = await app.server.inject({method: 'GET', url: '/client-config'});
  assert.equal(config.statusCode, 200);
  assert.equal(config.json().authReady, true);
  assert.equal(config.json().ticketReady, false);

  const unauthenticated = await app.server.inject({method: 'GET', url: '/v1/me'});
  assert.equal(unauthenticated.statusCode, 401);

  const wrongAudience = await app.token({audience: 'some-other-api'});
  const rejectedToken = await app.server.inject({
    method: 'GET', url: '/v1/me', headers: {authorization: `Bearer ${wrongAudience}`},
  });
  assert.equal(rejectedToken.statusCode, 401);

  const bearer = await app.token();
  const me = await app.server.inject({
    method: 'GET', url: '/v1/me', headers: {authorization: `Bearer ${bearer}`},
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().userId, 'user-123');
  assert.equal(me.json().ticketVerified, false);

  const profile = await app.server.inject({
    method: 'PUT', url: '/v1/profile', headers: {authorization: `Bearer ${bearer}`},
    payload: {handle: 'real_user', displayName: 'Real User', roles: [], discoverable: true},
  });
  assert.equal(profile.statusCode, 403);
  assert.match(profile.json().error, /ticket verification required/i);
});


test('HTTP integration: foreground BLE tokens resolve only eligible same-venue attendees', async t => {
  const key = 'test-proximity-hmac-key-which-is-at-least-32-bytes';
  const venueId = 'devcon-mumbai-main';
  const expiresAt = new Date(Date.now() + 90_000);
  const shareExpiry = new Date(Date.now() + 30 * 60_000);
  const now = new Date();
  const own = 'user-123';
  const peer = 'user-456';
  const unverified = 'user-789';
  const blocked = 'user-987';
  const peerToken = newPeerToken();
  const unverifiedToken = newPeerToken();
  const blockedToken = newPeerToken();
  const records = {
    tickets: [{userId: own, status: 'verified'}, {userId: peer, status: 'verified'}, {userId: blocked, status: 'verified'}],
    presence: [unverified, blocked, own, peer].map(userId => ({userId, venueId, expiresAt, revoked: false})),
    venues: [{venueId, enabled: true, startAt: new Date(now.getTime() - 60_000), endAt: new Date(now.getTime() + 3_600_000)}],
    shares: [unverified, blocked, own, peer].map(userId => ({userId, enabled: true, expiresAt: shareExpiry})),
    profiles: [
      {userId: own, handle: 'owner', displayName: 'Owner', roles: ['Builder'], discoverable: true},
      {userId: peer, handle: 'nearby', displayName: 'Nearby Builder', roles: ['Developer'], discoverable: true},
      {userId: unverified, handle: 'unverified', displayName: 'Unverified', roles: ['Student'], discoverable: true},
      {userId: blocked, handle: 'blocked', displayName: 'Blocked', roles: ['Developer'], discoverable: true},
    ],
    blocks: [{blockerId: own, blockedId: blocked}],
    peerTokens: [
      {digest: tokenDigest(peerToken, key), userId: peer, venueId, expiresAt},
      {digest: tokenDigest(unverifiedToken, key), userId: unverified, venueId, expiresAt},
      {digest: tokenDigest(blockedToken, key), userId: blocked, venueId, expiresAt},
    ],
  };
  const app = await setup({records, extraConfig: {PROXIMITY_TOKEN_HMAC_KEY: key}});
  t.after(app.close);
  const bearer = await app.token();
  const headers = {authorization: `Bearer ${bearer}`};

  const issued = await app.server.inject({method: 'POST', url: '/v1/proximity/token', headers, payload: {}});
  assert.equal(issued.statusCode, 200);
  assert.match(issued.json().token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(issued.json().kind, 'ephemeral_peer_token');

  const resolved = await app.server.inject({
    method: 'POST', url: '/v1/proximity/resolve', headers,
    payload: {tokens: [peerToken, unverifiedToken, blockedToken, issued.json().token]},
  });
  assert.equal(resolved.statusCode, 200);
  assert.deepEqual(resolved.json().attendees.map(item => item.profile.userId), [peer]);
  assert.equal(resolved.json().attendees[0].distanceMeters, null);
  assert.equal(JSON.stringify(resolved.json()).includes('coordinates'), false);
});
