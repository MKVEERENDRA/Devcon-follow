# Community release candidate — 19 October 2026

This source changes community eligibility; it does not authorize a live rollout.
Proof of Audits is out of scope. Existing public installer/source release remains
`7bffdc1`; backend configuration and real attendee records were not changed here.

## Implemented policy and recovery

- `COMMUNITY_SELF_SERVICE_ENABLED=true` plus `COMMUNITY_REGISTRATION_MODE=public`
  permits a validated, verified-email identity to create a basic community profile
  without tickets or invitations. Public mode requires separate release approval.
- An approved private staging rollout uses mode `pilot` and server-only
  `COMMUNITY_PILOT_EMAILS`. No ticket/invitation code is needed. Changing that
  cohort invalidates previous cohort visibility until an eligible member signs
  in again. Defaults stay closed. `REGISTRATION_ENABLED=false` keeps login UI closed.
- `communityMembers.userId` is unique. Enrollment cannot reset revoked status.
  Profile editing, connections and mutual chat work off-site; discovery still
  requires an active approved venue/window and opt-in GPS for Nearby.
- `DELETE /v1/admin/community/:userId` requires an existing administrator subject.
  It revokes membership, deletes location/presence/BLE state and disconnects sockets.
  Account deletion also removes membership. No administrator is self-appointed.
- Web/native generate and parse `https://devcon-follow.vercel.app/?profile=...`.
  Foreign origins, admission links, duplicate parameters, credentials and fragments
  are rejected. A QR opens an authorized profile; following remains explicit.
- Android app-link association is prepared using the existing release certificate.
  It is not publicly deployed or physically verified. iOS universal linking still
  needs the real Apple team/signing setup. The custom Auth0 callback scheme remains.
- Google selection has separate PKCE/state on native; web uses Universal Login's
  configured connection. It is shown only when `OIDC_GOOGLE_CONNECTION` is set.
  Real provider configuration/credentials and two-user acceptance remain blocked.
- Native initial/API requests time out with safe errors and retry. Web initial
  configuration has loading/error/retry states. Revoked access stops local discovery.
- Authenticated reads and writes have separate 240/min and 60/min budgets;
  anonymous traffic remains 100/min and route-specific abuse limits still apply.
  Throttling correctly returns 429 with Retry-After, rather than 500.

## Prepared web/API integration

After building web, run:

```
node scripts/prepare-vercel-preview.mjs --api-origin=https://devcon-follow-api-staging.up.railway.app
```

The explicit HTTPS origin rewrites `/v1/*`, `/client-config` and `/health/*` before
the SPA fallback and disables shared API caching. No live configuration was changed.
Without that argument the existing closed static preview remains the default.
Set `SOCKET_PUBLIC_ORIGIN` to the approved staging HTTPS origin and allow only the
approved website/preview origins in backend CORS. Socket.IO connects directly to
Railway; it does not depend on Vercel hosting a WebSocket server.

## Optional ticket email proof: BLOCKED, not required for access

`GET /v1/verification/ticket-email` requires community access and explains the
missing reviewed blueprint. POST fails 503, even for a client-asserted verification.
Neither route stores raw email, creates claims nor grants an official badge.
Web/native expose this honest optional status without gating onboarding.

The [ZK Email SDK](https://docs.zk.email/zk-email-sdk/setup) verifies proofs against
a particular blueprint. SDK 2.0.11 was inspected; no generic SDK call proves the
required Devcon sender, event, recipient binding and per-ticket semantics.
No reviewed Devcon blueprint or genuine signed per-ticket schema was supplied or
identified. A whole order identifier cannot substitute for a ticket position.
Real DKIM proof, replay/nullifier and atomic per-ticket claim acceptance are
**BLOCKED**, not passing tests. No unreviewed SDK graph was added to production.

## Verification and outstanding acceptance

77 API/regression tests pass, including the new no-ticket two-account MongoDB
journey, cohort denial, unverified-email denial, atomic enrollment, revocation,
optional-proof fail-closed behavior, canonical QR parsing and throttling recovery.
Browser coverage includes legacy invitation and new no-ticket PKCE journeys,
meetup reproposal, mutual chat, private notes, Stop and retained connections.
These are independently signed sandbox identities, not real Auth0/Google users.

The published 0.3.0/build 1 APK is genuine and has earlier emulator installation
evidence. 0.3.1/build 2 is the new candidate; a build is not accepted until its
actual APK download, signer, checksum and cold launch are checked separately.
No signed iPhone distribution or physical BLE/GPS/push interoperability is claimed.

Read-only live checks: Railway live/ready 200; release 503; authReady/ticketReady/
communityReady false. Public `/v1/me` still returns HTML until an approved proxy
rollout. Native audit remains FAIL (15 high). Real Auth0 dashboard session, Google
OAuth credentials, private staging authorization, a second consenting identity,
approved venue/window/landmark, Apple signing and real phones remain external
acceptance dependencies. Do not promote this candidate as production-ready.
