# Android 0.3.7 and arrival fixes — 23 October 2026 (IST)

**Private Android delivery and tested source; broad public release is not approved or ready.**

## Exact releases

- Native source: `3bd19225f24d275b80b32774104d2e0c5cedb154`.
- API/web source: `6d6ae7cfc63c0a7dcd1db400105659f88f0a5e8b` (includes the arrival fixes from `a619b4a`).
- Signed Android **0.3.7 / build 8**, package `com.proofofaudits.devconfollow`.
- [Finished EAS build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/6acaaa7c-da0b-4d37-a3be-4b6c8ddcebc7).
- APK: **98,840,104 bytes**, SHA-256 `3e39b62e5f190a34eb8d4ffd834bbec52f1dca178b60e92aaf8c6b1b81c92317`.
- Existing signer SHA-256: `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
- API: https://devcon-follow.35-206-98-214.sslip.io . No obsolete Railway origin in the embedded bundle.
- [Private installation page](https://devcon-follow.vercel.app/install.html). Signed bytes are served by the authenticated API, not an abandoned Expo artifact URL.

## Product fixes

The native and web welcome screens include three real licensed event photographs. All three exact photograph hashes were found inside the signed APK; credits and illustrative-use labels are included. Existing attendee profiles are not replaced with stock people.

An eligible participant can now obtain directions to an enabled, valid upcoming public venue before arriving. Previously the map endpoint required on-site check-in, which prevented using it to get to the venue. The web Discover screen now shows an arrival card with the approved venue, India time and destination-only directions. Existing native 0.3.7 map actions benefit from the compatible API fix without a rebuild. No viewer GPS is inserted into the directions link, no check-in is granted by opening it, and directory/Nearby still require a real valid on-site check-in. Disabled, invalid and expired venue records are excluded.

The account endpoint also rechecks the venue before reporting `onSite=true`; an unexpired presence record no longer keeps a disabled/ended venue marked active in the UI. Disabling a venue does not grant any new access. No real venue, landmark, attendee, email or location was invented.

Existing recommendations, paginated filters, privacy negatives, 30-minute sessions, BLE token revocation, public-landmark meetups, calendar exports, QR explicit follow, private notes, mutual chat and retained connections remain covered by regression tests.

## Verification

| Check | Actual result |
| --- | --- |
| Full local suite after final changes | PASS: 104 tests, zero failures/skips |
| Arrival API privacy/access regression | PASS: no authentication 401, unapproved account 403, no approved venue 404; future public venue available without GPS; no attendee location or operator fields; directory/Nearby still 403; disabled venue rejected |
| Arrival browser journey | PASS: independent sandbox PKCE login, profile, upcoming venue/directions, no presence/share creation, axe WCAG and 200% text |
| Full test/build CI | PASS: [test-build job](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39840312782/job/120039285763); the overall workflow remains red for native-security |
| Exact native-source Android/iOS compilation | PASS: [native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39796553971) |
| APK SDK inspection | PASS: signature, expected existing signer/app-link association, package/version, non-debuggable, embedded standalone bundle and correct HTTPS origin |
| Same-build source-map correlation | PASS: embedded bundle exactly equals captured EAS build bundle; 1,089 source entries; neither known npm advisory implementation appears in this JavaScript inventory |
| Licensed photography inside APK | PASS: all three exact JPEGs present |
| Actual APK through sandbox installer | PASS: complete signed bytes streamed after sandbox PKCE; size and SHA-256 verified; this is not genuine provider or phone acceptance |
| Genuine owner login restoration | PASS: existing Auth0 SSO restored without another password/dashboard login |
| Genuine owner live APK download | PASS: repaired live installer restored the existing owner SSO, saved the signed APK automatically and through the explicit fallback; both local saved files independently match size and SHA-256 |
| Physical phone installation/GPS/BLE/QR/push | BLOCKED / unverified; no consenting second tester or approved test venue supplied |
| Native release vulnerability gate | FAIL: two upstream roots, 15 propagated high package findings; not suppressed |

[Fresh native audit summary](releases/android-037-audit-summary.json). SDK, exact bundle and photography evidence: [SDK](releases/android-037-sdk-verification.json), [bundle](releases/android-037-bundle-inventory.json), [photos](releases/android-037-photography.json). An absent npm implementation in a JavaScript map does not certify native libraries or repair build tooling.

## Initial deployment and rollback

Only the existing Devcon VM was updated. Image `devcon-follow:a619b4a`, ID `sha256:58f78dea3c729fe4c2c9a3a6669fc0ed81cc984f522a34b2eee09a069a913349`. VM-side APK SHA-256 matched before replacing the private pair. The old pair remains `/opt/devcon-follow/private-release.036`; old unit `/etc/systemd/system/devcon-follow.service.pre037` and old image `devcon-follow:f228592` remain available for coordinated rollback. Stop the container, switch the complete APK/metadata directory and unit together, then restart and check readiness; never mix different APK bytes and metadata.

The restart caused a brief 502/initializing period. Subsequent public and VM-local `/health/live` and `/health/ready` passed HTTP 200. Docker reported running, no OOM and zero restarts. No credentials, roles, network entries or database were changed. Existing Proof of Audits services/resources/IAM/domains remain untouched. No new VM, paid upgrade or duplicate infrastructure was created.

The Vercel candidate passed API/database readiness and exact bundle hash comparison before promotion. Existing Devcon project only: deployment `dpl_Cjvftwkoc8kpKN61UcEYmbJsvQum`, https://devcon-follow-q9ldaddvx-mkveerendras-projects.vercel.app . The canonical website now serves the exact verified frontend bundle. API and database health through the canonical frontend proxy pass. Unauthenticated release requests return 401.

## Interrupted-download repair

The first real owner transfer failed with a browser network error late in the transfer. The API logged `stream closed prematurely`; Docker remained running, with no OOM or restart. That failed attempt is not reported as a successful download. The original single-response transport was therefore replaced in source `6d6ae7cfc63c0a7dcd1db400105659f88f0a5e8b`.

The installer requests bounded 4 MiB parts using `Range` and an exact release `If-Match` SHA-256. Completed parts stay in memory; only an interrupted part is retried, with finite retries/timeouts. Each part revalidates identity/cohort/revocation; expired tokens can be renewed through the existing OIDC session. Changed releases, invalid ranges, unauthorized/revoked identities and wrong content types fail closed. Responses stay private/no-store; no bearer token or temporary download secret is placed in a URL. Complete size and SHA-256 checks still precede saving. Account changes/logout abort the transfer. The API retains the bounded legacy full response for existing clients.

The full local suite passes **104/104**, with an additional final helper check. Both synthetic cross-origin and actual 0.3.7 byte browser installer journeys pass. [Exact-source test/build CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39840312782) passes its test-build job; its independent native-security job remains FAIL. The repair is deployed in image `devcon-follow:6d6ae7c`, ID `sha256:61f4bbbdefd41d3f7a71eb90c0cf33f5862c3e46c153629cb13144b7baac8c91`. Existing private APK bytes and all account/database/network settings are unchanged. The previous unit is `/etc/systemd/system/devcon-follow.service.pre037parts` (image `devcon-follow:a619b4a`); it uses the same 0.3.7 private pair. HTTPS/database readiness passed after the repair restart.

The repaired frontend passed protected-preview readiness and an exact bundle hash check before promotion to the existing domain. Deployment: `dpl_HWzqh1Yug8EQAmcDG17fQtmCd3BF`, https://devcon-follow-fa2yxkbbk-mkveerendras-projects.vercel.app . The fresh signed-in live transfer completed and the installer displayed “APK integrity checks passed.” Automatic and explicit fallback saves both produced **98,840,104-byte** files with SHA-256 `3e39b62e5f190a34eb8d4ffd834bbec52f1dca178b60e92aaf8c6b1b81c92317`. Both were independently hashed from disk after the real browser download. Server logs recorded **24 successful 206 byte-part responses** (plus their CORS preflights), and Docker remained running with zero restarts/OOM. This closes the live delivery failure for this candidate; it does not claim phone installation, hardware acceptance or public enrollment.

[Machine-readable live delivery evidence](releases/android-037-live-delivery.json). Screenshot: `artifacts/install/live-037-delivery.png`. A further sandbox browser regression deliberately aborts the second cross-origin part, confirms only that part is retried, and completes the full checksum/save without refetching the first part. HTML/tamper rejection, account/session restoration, axe and large-text assertions still pass.

## Remaining release requirements

`/health/release` returns **503**: auth/access/administrator checks pass; approved venue and landmark checks remain false. This endpoint reports service configuration, not physical-device or security certification. The verified owner-email cohort remains unchanged; public registration is not enabled. Official ticket verification remains disconnected.

Official Devcon information confirms [3–6 November 2026 at Jio World Centre, Mumbai](https://devcon.org/en/tickets/store/). This establishes event identity/dates, not an approved app geofence, actual public meeting point or operating hours. Those real configuration values still need confirmation. Do not create a guessed landmark to turn a check green.

Fresh primary registry checks on 23 October (IST) still return braces 3.0.3 and node-forge 1.4.0 as latest; installed Expo 58.0.17 is latest. Both [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) advisories list no patched version. The observable affected paths are Metro/build pattern parsing and Expo CLI/certificate tooling. Locked trusted source, isolated CI, no public Metro and independent Android SDK verification are limited mitigations, not a fixed vulnerability or a release waiver. The original [security decision packet](RELEASE_SECURITY_DECISION_2026-10-20.md) remains unapproved; do not invent accepted risk.

Physical two-person acceptance, public operator/privacy notice/support details, final Auth0/Google public-audience review and owner-controlled API hostname remain release preparation items. Native iPhone distribution additionally needs Apple membership/signing, which the owner does not have. Browser fallback is available; no TestFlight build is claimed.
