# Devcon Follow — social networking implementation, 18 October 2026

## Shipping source now contains

- Social feed: verified, discoverable attendees publish 1–1200-character text posts, browse reverse-chronological posts with pagination, like/unlike, comment (max 500 characters), delete their own content, and report abusive posts/comments. React web UI and Expo mobile client provide posting and reactions; both support viewing comments, and web supports replying, native supports replying too.
- Messaging: verified users can exchange 1–2000-character direct messages **only when both follow each other**. API provides inbox with unread counts, conversation history, read receipts, sender retraction and content reporting. React web and Expo mobile UIs send/view messages. Web uses current Socket.IO notification infrastructure plus polling; native polls only while active. **There is no offline or end-to-end-encrypted messaging.**
- Moderation: limited admin OIDC subjects may list reports, dismiss them, or remove reported posts/messages. A general account/attendee report requires manual review and cannot be auto-removed.
- Permission logic: never trust the sender/author ID from request body; derive from verified OIDC JWT. All content is access-gated by an organizer-bound verified ticket. A blocked pair cannot chat or view each other's posts. Hidden profiles are excluded from new feed results. Message payloads are never included in Socket.IO notification broadcasts.
- Throttling: per-user post, comment and message sliding-window limits, plus Fastify rate limiting. Admin review logs avoid message text and precise coordinates.
- Deletion: remove authored posts, comments, likes and messages during account erasure; moderation/audit artifacts remain under a separately approved retention policy.
- Production Mongo indexes for the additional collections: posts, postLikes, comments, messages, reports. At startup, index schema validation refuses unsafe modifications of nonempty indexed collections.

## How proximity really works

- GPS: opt-in, venue-approved, foreground updates. Two live accurate samples are compared via Haversine distance; the bands take BOTH device-reported accuracies into account. There is no exact public distance in metres, and indoor GPS is unreliable.
- Radio: custom native Android Kotlin/iOS Swift BLE modules transmit rotating opaque tokens via GATT, not user IDs, email, entry QR, or raw GPS. Server resolves tokens only when both consenting accounts remain verified and checked in. Requires 2+ real phones to validate; cannot be confirmed by unit tests or source inspection.
- Wi-Fi: online API/Socket.IO traffic works over whichever internet link (Wi-Fi or cellular) the phone uses. **Direct local Wi-Fi peer discovery / Wi-Fi Direct / Wi-Fi Aware / LAN multicast has NOT been implemented.** Apple's Multipeer Connectivity and Android Nearby Connections do not automatically interoperate cross-platform. Do not relabel online HTTPS traffic as local Wi-Fi discovery.
- PWA install: is online social networking with coarse foreground GPS. Native BLE requires signed Android/iOS binaries. Installing a PWA does not add native BLE capabilities.

## Deployment dependencies — not implemented because outside the source / privileges

1. GitHub user repository write permission: the connected GitHub integration returns HTTP 403 for content writes AND Git blob writes, despite reporting `push:true` in repository metadata. Source changes live ONLY in the downloadable ZIP until push permission is repaired; do not deploy an empty repo.
2. OIDC provider settings `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `WEB_OIDC_CLIENT_ID` with PKCE callback and native registered redirect URI. No fake sign-in fallback.
3. Official organizer-authorized *read-only*, identity-bound ticket verification service and secret: `TICKET_VERIFY_URL`, `TICKET_VERIFY_TOKEN`, `TICKET_BINDING_HMAC_KEY`. The API intentionally rejects image/QR-only verification and does not redeem actual tickets.
4. `PROXIMITY_TOKEN_HMAC_KEY` must be generated and stored securely, not embedded in clients or committed.
5. Approved Devcon/side-event venue coordinates, geofence sizes, dates, organizer rights, and an authorized admin subject before on-site discovery can begin.
6. Configure secure Atlas networking from running Railway service (Atlas access list is currently empty), then deploy application source to the already-staged Railway API, add a service domain and probe HTTPS health/ready, auth and ticket flows.
7. Build/install actual signed Expo development clients; test Android ↔ Android, iOS ↔ iOS, Android ↔ iOS, location accuracy, check-in expiry, stale tokens and instant stop/revocation; production store distribution requires operator signing/access.
8. Complete integration and browser tests after `npm ci` successfully installs dependencies. This runtime cannot reach npm registry; container's offline package cache lacks required packages. Thus there is no verified production bundle or live E2E result.
9. Privacy owner must publish retention periods and moderation policy for posts, DMs, audit records, incident response and data exports; complete consent and support contact.

## Reproducing checked tests

```bash
npm ci --no-audit --no-fund
npm ci --prefix web --no-audit --no-fund
npm test
npm run check
npm run build:web
npm ci --prefix mobile --no-audit --no-fund
npm --prefix mobile run typecheck
```

The dependency-free subset can be run here without package installation:

```bash
node --test test/domain.test.js test/indexes.test.js test/mobile-heartbeat.test.js test/peer.test.js test/pwa-cache.test.js test/request-hook.test.js test/social.test.js test/tickets.test.js test/tickets.ownership.test.js
```

`test/http.integration.test.js` requires Fastify, jose, and other dependency packages. Be honest about CI status until npm installation, EAS builds and physical-device tests pass.
