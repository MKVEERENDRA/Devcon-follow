# Android 0.3.6 / product improvements — 22 October 2026

Native source: `18f5c332004b3dcdf3316f9b4f8e31b85a518d00`.
API/web with completed operator flow: `f22859206e40bac55a7716ee7b7c4652a4635870`.
[Competitive review and implementation](product/NETWORKING_COMPARISON_2026-10-22.md).

## Delivered source and website

- Explainable, paginated attendee recommendations on web/native. Shared interests,
  declared role words in the viewer's meeting goal and openness to requests provide
  transparent reasons. No AI bill or behavioral tracking. Standard search/filters
  remain. Strong-scoring unauthorized/off-venue/blocked profiles stay excluded.
- Confirmed-meeting calendar exports on web/native through authenticated API.
  Public landmark, title and UTC time only; no attendee GPS, private notes, chat,
  reason, email or tokens. One-time snapshot with a five-minute calendar alarm;
  changes/cancellations do not sync. Native uses the user's chosen share target,
  not calendar-reading permissions. Phone calendar import remains unverified.
- Web administrators can now prepare disabled venues/meeting landmarks, review and
  explicitly enable them, and safely cancel affected meetings when disabling places.
  No real venue was invented or enabled.
- Existing five sections, 30-minute consent/Stop, QR explicit follow and mutual
  chat remain. No feeds, organizer ticketing or fake attendees added.

## Verification

| Check | Result |
| --- | --- |
| Complete local test suite | PASS: 102, zero failures/skips |
| Strong-match privacy/cursor tests | PASS: 5,000 synthetic profiles; ranked first page 248 ms in a dedicated local run |
| Full ordinary directory traversal/load | PASS: 1,000 authorized profiles, 20 pages; local P95 690 ms; eight parallel filtered queries 506 ms wall time |
| Both invited and self-service community sandbox browser journeys | PASS: independent PKCE identities, recommendations/reasons, accepted meetup calendar download, QR follow, notes, mutual chat, Stop and retained connections |
| Browser parity/accessibility | PASS: refresh-safe unsaved notes, photo/social edits, role filters, keyboard recovery and narrow/large-text layouts |
| TypeScript, syntax and Vite build | PASS |
| Expo Doctor and both-platform Hermes export | PASS: 20/20; exported JS inventory shows neither known affected npm implementation |
| Exact-source Android / iOS compilation | PASS: [native CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39788183763) |
| Exact-source complete test/build CI | PASS: test-build; native-security remains FAIL: [CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39788183799) |

These timings are synthetic local measurements, not a production capacity claim.
Test-file concurrency is limited to two workers; the query timeout and eight-request
load test remain enforced. No test was skipped and the native audit was not hidden.

## Deployment

The existing GCE VM now runs image `devcon-follow:f228592`, ID
`sha256:bf3439d7cc47409c92685caf848906a90273bfc6eb0907c106e98f75e88f9efb`.
Environment, dedicated Atlas user, reserved IP and accepted role exception remain
unchanged. HTTPS/readiness pass; unauthenticated calendar requests return 401.
The administrator release check passes; approved venue and landmark checks remain
false. Existing Proof of Audits services/resources were not modified.

The existing Vercel project was updated from the built frontend, verified against
this API and promoted to https://devcon-follow.vercel.app . Deployment:
`dpl_FtTTX4eGkfzYTbS9RvfqN31RaDDQ`:
https://devcon-follow-ib61kc8zd-mkveerendras-projects.vercel.app .
Registration policy remains the existing verified owner-email cohort; official
Devcon ticket verification and public APK distribution remain disabled.

## Signed Android candidate — verified and delivered privately

EAS Android build: `6221df14-1d0a-46b6-a468-bc1165650e5c`, version **0.3.6/build 7**,
profile `gce-preview`, new GCE HTTPS API. Existing signing key reused. Build page:
https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/6221df14-1d0a-46b6-a468-bc1165650e5c .

The build FINISHED. Android SDK signature/package checks pass: standalone,
non-debuggable, **0.3.6/build 7**, matching existing signer and app-link fingerprint,
expected GCE HTTPS API and no old Railway API base in the embedded bundle.

APK: **99,420,896 bytes**, SHA-256
`31cd6fef0724a2a000dec86eeedf067ab39ace7874b288bf3ed0be36149220a3`.
Signer SHA-256:
`c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.

The APK's actual embedded bundle matches its same-build EAS source map, with
1,089 sources and neither of the two known affected npm implementations present.
This does not assess native/tooling vulnerabilities or override the audit gate.
Actual signed bytes pass authenticated sandbox download and integrity verification.

The verified pair replaced the private release directory while the old container
kept its original mount until restart. The 0.3.5 pair and previous image remain for
rollback. Credentials and registration policy were preserved. No public GitHub
Release or anonymous Expo artifact URL was created. SDK/bundle verification JSON
records are in `docs/releases/android-036-*.json`.

## Public release remains held

The native audit still reports the two known upstream high advisories. No patched
version or risk waiver was invented. An approved venue/landmark and consenting
second tester are still unavailable; no physical two-person GPS/BLE or new-phone
calendar import is claimed. There is no Apple Developer membership/signed iOS build.
The provisional API hostname and operator/privacy notice also need final review.
A new feature or successful compilation does not bypass these release checks.
