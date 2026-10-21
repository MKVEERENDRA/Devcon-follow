# Core-flow verification — 21 October 2026

Source: `80147143204a84deea42adbe642497a598b146f7`.

## Implemented correction

Native foreground renewal used to erase the saved session on any provider
failure once the access token expired. Temporary network/provider errors now
retain the session and current drafts, show a recovery notice, and retry while
foregrounded. Explicit `invalid_grant` still clears the local session. A rotated
refresh credential is retained in memory before keystore writes, so a failed
write does not cause the next attempt to reuse a consumed credential. Results
arriving after effect cancellation are ignored before publication.

Three behavioral regressions exercise provider outage/retry, keystore failure
with rotated-token reuse prevention, and explicit revocation/cancellation.
These use synthetic transport credentials and do not contact Auth0.

## Verification

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` with Node 24 | PASS: 89/89, zero failures/skips | Real disposable MongoDB, loopback signed OIDC, privacy/ownership and lifecycle tests |
| Directory load/privacy test | PASS | 5,000 synthetic profiles; 1,000 authorized over 20 pages; page P95 1,391 ms; eight concurrent queries 760 ms; this is local sandbox performance |
| `npm run test:browser` with installed Chrome | PASS | Two independent sandbox PKCE accounts: profile, consented GPS discovery, landmark meetup/acceptance, explicit QR-link follow, mutual private chat, Stop and retained connection |
| `npm run check` | PASS | Backend/module syntax |
| `npm --prefix mobile run typecheck` | PASS | Native TypeScript |
| Expo export Android and iOS from `mobile/` | PASS | Both Hermes bundles generated; not installable or physical-device evidence |
| Full CI | IN PROGRESS at handoff | https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39567914672 |
| Android/iOS native compilation | IN PROGRESS at handoff | https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39567914659 |

The first export invocation ran from the repository root and failed because it
was not the Expo project. It was corrected to run from `mobile/`; both platforms
then exported successfully. No dependency graph or native platform source changed.

## Release distinction

The currently installed/distributed private 0.3.3/4 APK predates this correction.
This source needs the next versioned, signed build before claiming delivery to a
phone. No new APK or deployment was made for this source change. Staging recovery
and installer results remain recorded in ANDROID_033_DELIVERY_2026-10-20.md.

All five core sections have existing implementation and sandbox coverage; this
is not evidence that every hardware/provider interaction works in production.
Public release still requires the native advisory resolution or exact bounded
release-security decision, durable restricted networking, real administrator and
approved discovery venues/landmarks, and physical Android/login/two-person
acceptance. No fabricated identity, attendee location, venue approval or physical
result was created. Public registration and Proof of Audits are unchanged.
