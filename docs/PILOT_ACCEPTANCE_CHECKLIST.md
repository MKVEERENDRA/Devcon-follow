# Real-world pilot acceptance — preparation only

No step below has been newly authorized or executed by this document. Live
attendee data, account provisioning, invitations/venues, deployment, registration
and Atlas network changes remain frozen until explicit owner authorization.
Sandbox test success and `/health/release` success are separate from this checklist.

Record owner approval, operator, time in IST, exact Git SHA, immutable deployment
ID, app URL, Auth0 public issuer/client IDs, build IDs and both device/OS versions.
Never record passwords, bearer/refresh tokens, invitation codes, DB URIs, ticket
credentials or raw attendee coordinates in the release report.

## 1. Approve scope and establish rollback

- Select the source revision after test-build, Android compile and iOS simulator
  compile pass. Resolve the native high-severity security gate before distribution.
- Owner explicitly authorizes deploying **staging only**, two named consenting
  testers, a private community pilot, approved venue/window/landmarks and network
  work. This approval does not authorize production or public registration.
- Record the existing deployment and encrypted variable backup/recovery method.
  Keep public registration disabled and the approved staging cohort bounded;
  staging sign-in may be enabled for that cohort only. Preserve Atlas.
  Rollback restores the known
  image/config; it does not recreate or delete the database.

## 2. Real Auth0 identities

- Owner signs into two distinct accounts themselves. Verify two different validated
  `sub` values, verified canonical emails from the bound Action and the intended
  API audience. Do not use one account in two tabs as two-person acceptance.
- Confirm web and native public-client PKCE, exact HTTPS/native callbacks, rotating
  refresh tokens, expiry, provider logout and locally cleared sessions. Reject
  wrong issuer/audience, unverified email and expired tokens. Never place a client
  secret in the PWA or Expo bundle.
- Confirm production-owned Google OAuth credentials and reliable email delivery
  before relying on those login methods beyond development. Provider consent and
  credentials remain owner actions.

## 3. Community access and venue approval

- Bind administrator access only to the approved, genuinely validated identity's
  subject. Verify a non-admin gets 403. An email label alone is not an admin grant.
- Use the separately approved self-service private pilot policy:
  `COMMUNITY_SELF_SERVICE_ENABLED=true`, `COMMUNITY_REGISTRATION_MODE=pilot` and
  a server-only approved verified-email cohort. Basic membership requires no
  ticket or invitation. Unverified, out-of-cohort and revoked users must fail
  protected reads/writes. Public mode needs separate release approval.
  Leave the legacy invitation policy disabled unless separately selected; its
  replay and wrong-email protections remain covered by regression tests.
- Badge participants as community approved; `officiallyVerified` remains false.
  Leave official ticket verification disabled without an authorized organizer
  adapter. Never redeem event check-in QR codes or treat a screenshot as ownership.
- Create only the approved public venue, radius, event window and landmarks inside
  its geofence. Capture approval provenance and a non-sensitive venue ID. Deny
  outside/inaccurate GPS and inactive venue times. Test geography is not event data.

## 4. Persistent restricted network and staged deployment

- Select and authorize the budget/operational option in RESTRICTED_NETWORKING.md.
  A changing pod address is not durable connectivity. No broad CIDR or 0.0.0.0/0.
- After authorization, reserve verified outbound addresses, allowlist individual
  /32s, retain TLS and the existing database/cluster-scoped account. Verify actual
  egress after restart and replacement, DB read/write, unique/TTL/geo indexes and
  recovery from DB unavailability. Do not rely on a single ping as write proof.
- Reconcile the directory compound indexes from `src/indexes.js` without dropping
  populated indexes. Review pending-invitation duplicates before adding the unique
  partial constraint; inspect bookings and the new 30-day meeting retention.
  Confirm replica cursor strategy and notification-worker recovery. Inspect filtered and unfiltered execution plans on staging
  synthetic data; verify revoked/off-venue/blocked attendees are absent on every
  page and direct profile requests. Choose sticky routing or a securely shared
  cursor key before running multiple replicas; never expose a key in the client.
- Deploy the selected existing Docker image to staging. Confirm liveness,
  readiness, configuration gates, unauthenticated 401 and restricted origins.
  Keep public registration off. Restrict staging sign-in through the approved
  verified-email cohort; do not select public membership mode for the two testers.

## 5. Signed installation and phone matrix

Use the existing `mobile/eas.json` preview APK profile or a reviewed equivalent
native signing process. Set `EXPO_PUBLIC_API_BASE_URL` to the approved staging
HTTPS origin at build time. Owner supplies EAS/Apple/Android account consent,
signing credentials and provisioning. Inspect packages for accidental credentials.
Install the actual signed artifact on phones, not Expo Go or a simulator-only app.
See [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).

| Pair | Required evidence |
| --- | --- |
| Android ↔ Android | Device models, OS, app build, both directions advertise/scan, result |
| Android ↔ iPhone | Same, including platform permission differences and both directions |
| iPhone ↔ iPhone | Same, with foreground operation and Bluetooth lifecycle evidence |

For each pair: grant/deny Bluetooth, switch it off/on, lock/background/foreground
and test GPS-only fallback. Verify only rotating opaque tokens are exposed; no
exact Bluetooth metres/bearings, stable identity broadcast or Wi-Fi Direct claim.
Stop/expiry/logout/hide/revoke must cease local advertising/scanning and deny token
resolution. Foreground return must not automatically create another 30 minutes.

## 6. Two-person journey and privacy negatives

1. Both sign in with verified identities in the approved cohort and create
   profiles, without mandatory tickets or invitations. A hidden profile stays
   absent. Search by roles/interests/goals; show honest availability and GPS uncertainty.
2. Explicitly start Nearby for exactly 30 minutes. Simultaneous starts create one
   session. Nobody appears from a fabricated position. Global results/map do not
   include attendee coordinates.
3. Test permission denial, poor GPS, network loss and reconnect. Press Stop while
   offline: device collection must stop immediately, server confirmation remains
   pending, and the prior sample may survive until its bounded expiry. Retry when
   connected. A pending Stop must not become an automatic renewal.
4. Request a meetup with a reason, public landmark and time; recipient accepts or
   declines. Test cancellation and stale-time actions. Meetup approval never grants GPS.
5. Miss a socket update and recover the persisted meeting alert; acknowledge it
   explicitly. Test duplicate submit/lost response, overlapping acceptances,
   cancellation/reproposal, expiry and reminder suppression. Device push requires
   separate authorization, EAS project/APNs/FCM credentials and enhanced Expo push
   security with a server-only token. Keep it off otherwise. Test denial, invalid
   token retirement, retry/receipts, logout/offline deregistration limitations and
   notification taps on a cold signed app. Generic pushes reveal no names/locations.
6. Scan a profile QR, inspect the profile and explicitly follow/save. Scanning
   alone must not follow. One-way follow cannot chat; mutual follow can.
7. Save private notes, reconnect/restart, leave the event and confirm retained
   connections/chat. Renew an access token while a note contains an unsaved draft;
   it must remain unchanged without a server write until Save. Exercise native
   photo selection/cancellation/removal, social edits, role filters and pasted
   profile links with camera permission denied. The other tester must never see the note. Unfollow deletes it.
8. Test block, membership revocation, logout and account deletion; verify negative
   reads/writes, expired GPS/BLE and actual removal in the authorized staging scope.
   Record no raw personal payloads in evidence. Stop and delete remain usable after
   access revocation.
9. Screen-reader/large-text and keyboard checks: names, focus order, disabled/selected
   states, errors/retry, tab navigation, camera permission and understandable timers.

## 7. Decision

Report every step PASS / FAIL / BLOCKED with evidence. A failure keeps the pilot
closed; missing phones/signing/approval is BLOCKED, not PASS. Production needs a
separate owner decision after these checks, security resolution, operational
monitoring, recovery and load evaluation for a busy conference. Do not claim
production readiness from local fixtures or configuration endpoints.
