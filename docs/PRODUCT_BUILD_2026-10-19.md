# Product build — 19 October 2026

This update builds the existing application. Live-app acceptance testing was
stopped at the owner's request. All verification for this product update uses
loopback services, a disposable MongoDB and sandbox identities. No real attendee,
venue, invitation, meetup, message or location was created by these checks.

## Product behavior

The five sections remain Discover, Nearby, Meetups, Connections and Me.

- Profiles now include **who you want to meet** (280 characters) and an explicit
  **open to meetup requests** preference, shared through the same authorized
  profile routes. This preference does not claim live availability, start Nearby,
  or grant any GPS access. Older profiles default to empty text and false.
- Web and native directory search match names, handles, roles, interests, bio and
  meeting goals within the already authorized directory. No new enumeration API
  was added. Web computes one filtered collection for count and cards.
- New profiles start with discoverability unchecked. Saving a visible profile is
  separate from starting the exactly 30-minute discovery session. Native users
  can now turn profile discoverability back on as well as hide it.
- A public-landmark meetup can carry an optional, trimmed **reason** of at most
  280 characters. Invalid types and oversized reasons return 400. Existing clients
  without this field remain compatible. Only participants can retrieve it through
  their existing meetup list; block and access checks remain in force. Notifications
  carry only the meeting ID, never the reason or an attendee coordinate.
- Native Meet / Arrange a meetup opens a landmark invitation. An optional GPS
  request is labeled separately. Accepting a meetup does not approve GPS sharing.
- Native saved connections now open an owner-only private-note editor, with a
  1,000-character limit, load/save status and disabled save until loading succeeds.
  Notes load only for the selected followed profile, avoiding a request for every
  connection card. Unfollowing deletes the note through the existing API.
- Web and native note editors disable saving until the existing note loads,
  preventing a failed load from overwriting a saved note with an empty value.
  Native logout also clears selected profiles and profile drafts.
- Unreachable native feed/post/comment state and requests were removed. No stored
  legacy content was deleted. Existing backend retention rules remain applicable.

Existing React, Expo, QR, OIDC, Socket.IO and Fastify components were reused; no
replacement application, copied attendee dataset or new runtime dependency was
introduced. See [reuse review](OPEN_SOURCE_REUSE.md) for actual libraries/licenses.

## Release configuration safeguards

`GET /client-config` distinguishes `authConfigured` and `registrationEnabled`
from `authReady`. Closed registration no longer looks like a missing provider.
`GET /health/release` is explicitly a **service-configuration** check. It now
requires a valid nonexpired approved venue and an enabled public landmark inside
one such venue, in addition to auth/access/admin configuration. A 200 is not a
claim that genuine two-person or phone acceptance passed.

The optional `npm run preview:staging` helper binds only to loopback. It is an
operator tool for an allowlisted localhost callback, does not enable registration
on the public service and is not running now. Its proxy tests use a local fake
upstream, not Railway. Do not start it for further live acceptance without new
owner direction.

## Verification

- PASS: 60/60 isolated API/domain/security tests, including real disposable Mongo,
  independently signed sandbox identities, profile intent round-trip, bounded
  meetup reasons, participant authorization and existing privacy negatives.
- PASS: API syntax check, Vite web production build, native TypeScript and
  Android/iOS Hermes exports (`mobile/dist/`). These are JavaScript bundles,
  not installable signed APK/IPA packages.
- PASS: two-context local browser journey including profile goals, explicit
  discoverability opt-in, meetup reason/acceptance, QR-link follow, mutual chat,
  Stop and retained connections. Mobile-width screenshots were visually inspected
  at `artifacts/browser/profile-intent.png` and `meetup-reason.png`.
- Browser notes were also saved through the UI and verified privately in local
  MongoDB, including the other participant’s inability to read them.
- No new physical-phone, Auth0 two-person or production acceptance is claimed.

## Infrastructure evidence recorded before live testing stopped

Existing staging URL: https://devcon-follow-api-staging.up.railway.app

Running deployment: `57e8baab-b82b-408a-81c2-f624d1cf1f1c`.
Deployed source: `8ac15146001306f95971684dda2c25defebebf80`.
These product changes have **not** been deployed there.

The current `152.55.180.192/32` Atlas allowlist restored database readiness.
Liveness and database readiness returned 200; unauthenticated `/v1/me` returned
401. Release configuration returned 503: access, administrator and approved venue
were missing. Public registration and community access remain disabled.

One genuine Auth0 authorization-code + PKCE sign-in was accepted by the staging
API, with verified canonical email and pending access. Directory, Nearby,
following and administrator reads each returned 403. That identity did not match
the intended administrator; no administrator grant was made. This is **one-account
pending-access evidence**, not a completed two-attendee community journey.

Two missing server HMAC keys were securely provisioned in staging with deployment
skipped. Values were generated in memory, not committed or printed. No registration
or community switch was enabled, no database recreated and no production changed.

## Release checklist

| Item | Status |
| --- | --- |
| Local source/build/API journey | PASS as recorded above; sandbox evidence only |
| Staging HTTPS and DB readiness | PASS in the last observed checks; not re-probed after stop request |
| Real Auth0 pending identity and unauthorized-access denial | PASS for one identity |
| Genuine two-person eligible journey | BLOCKED / incomplete; owner stopped live testing |
| Approved pilot admin subject, venue/window and landmark | BLOCKED; not invented or substituted |
| Restricted durable egress | BLOCKED; current /32 follows a dynamic pod IP |
| Native dependency security gate | FAIL: last audit had 15 high build-tool findings |
| Signed/installable release and three phone-pair BLE matrix | BLOCKED / unverified |
| Official ticket verification | DISABLED; organizer authorization absent |
| Public registration / production launch | CLOSED / not released |
