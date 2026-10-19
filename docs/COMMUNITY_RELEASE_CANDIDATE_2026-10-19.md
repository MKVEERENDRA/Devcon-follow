# Community release candidate — 19 October 2026

This source changes community eligibility; it does not authorize a live rollout.
Proof of Audits is out of scope. Existing public installer/source release remains
`7bffdc1`. The owner later approved the staging-only source upload and private
verified-email cohort described below; no production release was authorized.

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

78 API/regression tests pass, including immediate native session-state cleanup,
the new no-ticket two-account MongoDB
journey, cohort denial, unverified-email denial, atomic enrollment, revocation,
optional-proof fail-closed behavior, canonical QR parsing and throttling recovery.
Browser coverage includes legacy invitation and new no-ticket PKCE journeys,
meetup reproposal, mutual chat, private notes, Stop and retained connections.
These are independently signed sandbox identities, not real Auth0/Google users.

The published 0.3.0/build 1 APK is genuine and has earlier emulator installation
evidence. 0.3.1/build 2 is the new candidate; a build is not accepted until its
actual APK download, signer, checksum and cold launch are checked separately.
No signed iPhone distribution or physical BLE/GPS/push interoperability is claimed.

The supported Expo 58.0.15 patch fixes the CI SDK packaging mismatch. Local types,
SDK dependency compatibility and Expo Doctor (20/20) pass; the security gate is
still failing and has not been suppressed. Owner access to the original Auth0
tenant `dev-xs1kh1yit6q5g3ph` is now confirmed. Both existing clients and their
staging/native callbacks and refresh rotation were inspected without changing
settings. Google is enabled for both clients but uses Auth0 development keys;
production-owned Google credentials remain required.

## Authorized staging upload and actual release status

Source `f267c5ffb64cdac3db5247065204c3f9fa0050d8` was uploaded from a tracked Git
archive to the existing Railway staging service, with explicit owner approval.
Deployment: `aadb28ce-11df-4e75-845b-d1e833a97f51`; URL:
https://devcon-follow-api-staging.up.railway.app/ . Only the approved registration
switch, self-service switch, private pilot mode/cohort and direct Socket.IO origin
were set. The single approved verified identity is server-only; no administrator
or venue was invented. Auth0 settings were left unchanged. The owner separately
approved and added the exact new staging outbound /32 to the existing Atlas list.

After the owner added the /32, independent inspection confirmed it and the
running service recovered without another deployment. At 2026-10-19T16:32:50Z,
root, `/health/live`, `/health/ready` and `/client-config` returned 200;
unauthenticated `/v1/me` returned 401 JSON with private/no-store cache controls.
Client config has authReady and communitySelfService true, Google connection null
and ticketReady false. `/health/release` correctly remains 503: auth/access are
configured, but administrator, approved venue and approved landmark are absent.
Health evidence is local/ignored at
`artifacts/staging/f267c5f-health-after-atlas.json`. The owner subsequently
completed genuine Auth0 web sign-in. The API granted approved-cohort community
access without a ticket or invitation; the owner-authorized profile was saved
through the existing UI and survived a full browser reload. Status-only browser
evidence confirms `/v1/me`, `/v1/following` and incoming/outgoing location-request
lists returned 200. No bearer tokens, response bodies or raw subject identifiers
were recorded. Profile discovery stays hidden and Nearby was never started.
While the existing session stayed open, status-only capture observed an automatic
Auth0 `/oauth/token` exchange returning 200, followed by authenticated `/v1/me`
returning 200. The saved profile and hidden defaults remained intact. This is
successful web renewal evidence; refresh-token reuse rejection and native renewal
remain unverified. Evidence: local/ignored `artifacts/staging/owner-session-renewal.json`.
The persisted profile screenshot and scoped results are local/ignored under
`artifacts/staging/owner-profile-persisted.png`, `owner-authenticated-api-status.json`
and `owner-acceptance.json`. This proves one-account web acceptance, not the
required two-person/native journey. See
[restricted networking](RESTRICTED_NETWORKING.md) for the continuing egress limit.

The public Vercel client config still has authReady/ticketReady/communityReady
false; public `/v1/me` routing has not been rolled out. No Vercel production or
Proof of Audits change was made. Real Auth0 two-person acceptance, approved
venue/window/landmark, owned Google OAuth credentials, Apple signing and physical
phones remain external dependencies. Expo API connectivity later recovered and
the new Android candidate was accepted as build
`6583ca87-7174-4907-8c8b-df10c38ceee9`, source
`b96ab82229cea6ec37d4a0ab165f0f7927bfdcc4` (only documentation differs from the
deployed application source). The [EAS build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/6583ca87-7174-4907-8c8b-df10c38ceee9)
finished. The actual Android 0.3.1/version-code 2 APK was downloaded through the
authenticated EAS CLI, verified with Android SDK tools, and installed successfully
in an isolated Android 15 emulator. Package: `com.proofofaudits.devconfollow`;
size: 99,356,328 bytes; SHA-256:
`8c5b0a1d52a4745de93a72198a681f2046ff16cb6fb9fbc8f54cb026ab821c99`.
The release certificate matches the previous APK and prepared app-link association;
the package is not debuggable and embeds the staging endpoint and standalone JS.

Three activity cold starts reported `Status ok` and `LaunchState COLD`, but visual
acceptance is **BLOCKED**: the emulator overlays “System UI isn't responding” on
the rendered welcome screen. Rebooting and disabling Bluetooth did not clear the
dialog. A crash buffer also records the emulator Bluetooth service aborting; this
does not establish the cause of the System UI failure. The app process remains
running. No clean visual launch, native login, physical-phone or BLE acceptance
is claimed. Evidence and actual APK are local/ignored under
`artifacts/android-preview/`, including `apk-verification-0.3.1-2.json` and
`emulator-bt-off-0.3.1-2.png`. The earlier 0.3.1 build is superseded.

Expo's existing unauthenticated internal-build-page access switch was confirmed
OFF without changing it. However, an anonymous range GET to the artifact CDN
returned 206 with APK ZIP bytes: possession of that raw URL permits download.
The raw URL is withheld from source and public manifests; this is an unlisted
artifact, not proof of authenticated CDN storage. No new public distribution or
installer update was performed. The published installer still references 0.3.0;
it must not be represented as delivering these fixes.

The fresh iOS internal-distribution attempt reached EAS credential setup but
failed because no suitable distribution credentials exist. No signed build ID
was produced. EAS also requires an owner-reviewed encryption compliance setting
before App Store Connect testing; no legal declaration was invented to bypass it.
The owner confirmed they have no Apple Developer membership. EAS ad hoc and
TestFlight distribution remain blocked on owner enrollment and signing setup;
no membership purchase, enrollment or Apple terms acceptance is authorized.
[Apple permits limited personal-device testing through Xcode's free Personal Team](https://developer.apple.com/help/account/basics/about-your-developer-account),
with seven-day provisioning and device/app limits. That alternative needs an
owner-controlled Mac, Xcode, personal Apple Account and iPhone; it has not been
configured here. The passing unsigned simulator compilation remains compile
evidence only.

| Section | Genuine staging observation | Remaining acceptance |
| --- | --- | --- |
| Discover | PASS: off-site guard, role/interest controls and zero visible profiles | Approved venue/window plus second consenting identity |
| Nearby | PASS: hidden, Enable sharing disabled while off-site, no GPS requested | Real phone permissions, 30-minute GPS/BLE operation and Stop |
| Meetups | PASS: real API finished loading, no pending meetings or invented updates | Two-person request/accept/reproposal/conflict journey |
| Connections | PASS: empty follows/inbox, mutual-follow messaging guidance | Cross-client QR, explicit follows, private notes and chat with two real users |
| Me | PASS: real community membership, profile write/read and reload persistence; hidden defaults | Native parity on installed release and remaining account lifecycle checks |

- [CI test-build PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39267564374/job/118111024584): API tests, web build, sandbox browser journeys, native exports, BLE autolinking and deployment container.
- [Android and iOS simulator compilation PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39267564521): compile evidence, not signed iPhone distribution or physical radio acceptance.
- [Native security FAIL](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39267564374/job/118111024836): 15 high findings rooted in the two documented upstream advisories; no gate suppression.
