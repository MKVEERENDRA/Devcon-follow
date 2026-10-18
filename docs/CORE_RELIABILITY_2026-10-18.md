# Devcon Follow — Core Reliability Update

Date: 2026-10-18
Source: `devcon-follow-focused` (working copy of the latest source uploaded to this conversation)

## Product scope
Devcon Follow helps a verified event attendee find other attendees, opt into a 30-minute discovery session, understand approximate proximity, ask to meet, scan a profile QR, and keep the connection afterward. Main navigation: Discover, Nearby, Meetups, Connections, Me. No social-feed navigation, posts or likes in the main app experience. Old social-post routes remain in source for compatibility, but are not part of the product roadmap.

## Changes implemented in this update

1. **Native start discovery:** check in at an approved venue using a fresh GPS sample before starting the session. Before this change, native app only sent `/location/share`, which fails when the prior venue presence expired.
2. **GPS reliability:** use native foreground GPS discovery even if native Bluetooth scanning/advertising is unavailable. Mark Bluetooth as unavailable without pretending it found a device. Add 15-second GPS nearby refresh and combined display of GPS and radio sightings, without double-counting users.
3. **Session lifetime:** server still enforces exactly 30 minutes and disallows silent extension. Native app now stops the local session and attempts server revocation at expiry, while backend makes expired tokens and location shares invalid even if cleanup is delayed.
4. **Venue accuracy:** consolidate PWA foreground check-in and location-refresh calls into one in-flight heartbeat using one GPS reading. Refresh on return to visible tab. Continue to fail closed on stale samples and failed check-ins.
5. **Privacy-safe maps:** new `/v1/venue/map` provides only the public approved event venue coordinates. Web Nearby screen embeds an OpenStreetMap map of that venue. GPS coordinates for attendee pins remain absent; exact directions use individual consent only.
6. **Meetup requests:** enforce same approved venue on request and approval. Approving exact-location sharing captures a fresh GPS sample and grants only the named requester access. Both native and web show sent invitation statuses. Declined requests remain visible briefly for feedback instead of disappearing instantly.
7. **QR consent:** native scan now opens the attendee profile and offers Follow/Meet explicitly; scanning alone no longer follows someone.
8. **Native profile browsing:** inspect role, interests, bio and links, follow, request meet, or open permitted navigation. Bottom navigation focused on core tasks; chat and social QR remain reachable from Connections and Me.
9. **Backend throughput:** directory, GPS nearby and BLE token resolution now batch verification, sharing consent, venue presence and block lookups instead of issuing an N+1 burst per candidate.
10. **Ticket record correctness:** when an authorized organizer attestation confirms a previously pending ticket, verification now sets the status on the existing record rather than silently ignoring it. Same ticket cannot be bound to two accounts because the digest has a unique index. Ticket verification remains disabled without an organizer-approved source.
11. **Saved login recovery:** invalid restored native access token is cleared on 401 rather than leaving the UI in a broken pseudo-login state. Web OIDC attempts automatic token renewal if the configured provider supports it.

## Test evidence

- `npm run check`: **PASS** for backend JavaScript syntax.
- TypeScript compiler parser on `mobile/App.tsx`, `web/src/App.jsx`, `web/src/main.jsx`: **PASS** (no syntax diagnostics). This is not a typecheck or a production bundle.
- `node --test $(find test -maxdepth 1 -name '*.test.js' ! -name 'http.integration.test.js' | sort)`: **51 passing dependency-free tests**. Includes static regression assertions and pure-domain behavioral tests; does not exercise Fastify/MongoDB over HTTP.
- `npm test`: **BLOCKED**, because `jose` and other npm packages could not be installed. The HTTP integration test fails to load `jose` (`ERR_MODULE_NOT_FOUND`), not because an HTTP assertion failed.
- `npm ci --offline`: **FAILED** with `ENOTCACHED` for `xmlhttprequest-ssl` tarball. The full Vite build and Expo typecheck/native build cannot be completed in this container.

## Real production blockers

- Trusted OIDC issuer, web/native client configuration and refresh-token behavior must be configured against the actual provider and tested with separate real accounts.
- Organizer-authorized read-only ticket ownership confirmation is not available. **Do not accept screenshots or self-declared ticket identifiers as verification.** Ticket-gated features remain locked until this exists.
- Event venue coordinates and time windows require approval; untrusted venue IDs and locations must not be invented.
- Secure Railway-to-MongoDB Atlas connectivity and database index bootstrap need live verification. Railway service remains staged, with no deployed code.
- GitHub App rejected write attempts with HTTP 403 in this conversation; source was not pushed.
- Android ↔ Android, Android ↔ iPhone and iPhone ↔ iPhone BLE scanning/advertising must be tested on actual compatible phones. Foreground GPS fallback is implemented but also requires live end-to-end testing.
- Signed Android/iOS build, actual app installation, mobile background state, network interruptions, link handling, 30-minute expiration, and complete live two-account meetup/QR/messaging scenarios are **not yet verified**.

## Acceptance checklist before marking production-ready

- [ ] Two genuine, independently signed-in accounts complete ticket verification under the official authorized system.
- [ ] Both check in at an approved venue without false location claims.
- [ ] Start exactly 30 minutes; check GPS only, GPS+BLE, and BLE unavailable conditions; app foreground and interrupted network.
- [ ] Nearby listing excludes blocked/unverified/inactive/unconsenting accounts, and never leaks raw coordinates.
- [ ] Meet request, approve/decline, requester-only map route and revocation/expiry verified with two devices.
- [ ] QR only views profile until explicit Follow action; connections persist off-site.
- [ ] Production builds, API integration tests, database migrations/indexes, and app permissions pass.
- [ ] Signed Android/iOS builds and real device interoperability checks pass.
- [ ] Public HTTPS API and app URLs respond and pass browser-device journey tests.

**Status: Source-level core improvements and local tests passed. NOT a verified end-to-end production deployment.**
