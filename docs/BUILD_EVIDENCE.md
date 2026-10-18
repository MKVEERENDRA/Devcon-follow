# Build and release evidence — 18 October 2026 (IST)

**Outcome: locally implemented and tested; production launch BLOCKED. No public deployment URL, APK or IPA exists.**

Source was recovered from `/home/vamshi/Downloads/devcon-follow-codex-ready-2026-10-18.zip` into the initially empty workspace. No replacement template or fake production attendees were created. Tests ran using the bundled **Node 24.19.0** runtime; the shell's original Node 20 was too old for the declared stack.

## Verification

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Backend, web, mobile `npm ci` | PASS | All three supplied lockfiles installed. Initial installs reported old-shell engine warnings; actual checks used Node 24. |
| `npm run check` | PASS | Syntax checks for every API JavaScript module |
| `npm test` | PASS | **52 tests, zero failures, zero skips**; includes real MongoDB + independently signed sandbox identities |
| `npm run build:web` | PASS | Vite production bundle, 1,691 transformed modules, `web/dist/` |
| `CHROME_PATH=/opt/google/chrome/chrome npm run test:browser` | PASS | Two isolated browser contexts use a real local authorization-code + PKCE exchange against the test issuer, then complete the community journey |
| `npm --prefix mobile run typecheck` | PASS | TypeScript, including native meetups and refresh/session changes |
| `cd mobile && npx expo install --check` | PASS | SDK-compatible top-level versions after upgrading React types and TypeScript |
| `cd mobile && npx expo export --platform android --platform ios --output-dir dist` | PASS | Hermes JS bundles for both platforms in `mobile/dist/`; **not signed/installable apps** |
| `cd mobile && npx expo-doctor` | PASS | **20/20 checks** after importing native helpers through Expo, removing direct core dependency and deduplicating native packages |
| Expo autolinking resolve, Apple + Android | PASS | Detects `DevconBleModule` on both platforms; iOS podspec was absent and is now included |
| Backend dependency audit | PASS | Zero reported vulnerabilities after updating `@fastify/static` to 10.1.6 |
| Web dependency audit | PASS | Zero reported vulnerabilities |
| Mobile dependency audit | FAIL | 22 findings: 15 high, 7 moderate, inherited through Expo build tooling. Nonbreaking `npm audit fix` did not resolve them. |
| Docker build | BLOCKED | Docker executable is unavailable on this machine; CI contains the build step but was not run remotely |
| Kotlin/Swift native compilation | BLOCKED | No Java/Android SDK/adb or Xcode compiler available here |
| Signed APK / iOS build | BLOCKED | No production API URL or configured EAS project/signing workflow; build-tool vulnerabilities also unresolved |
| Physical BLE matrix | UNVERIFIED | No Android–Android, Android–iPhone or iPhone–iPhone device tests performed |
| Production OIDC + two real people | BLOCKED | User confirmed no identity provider exists. Sandbox results do not prove real-provider/device operation. |
| Atlas connectivity/index bootstrap | BLOCKED | Live Atlas allowlist is empty. Only disposable MongoDB was used. |
| Railway deployment | BLOCKED | Existing service is still `staged-create`, with no source, domain or deployed instance |
| GitHub publication | BLOCKED | Connected App write returned 403 `Resource not accessible by integration`; local `Proofofaudit` has `push:false` on target repository |

Full command output is retained locally in `artifacts/logs/` (ignored by git). Browser screenshots are in `artifacts/browser/accepted-meetup.png` and `artifacts/browser/private-chat.png`. Older failed browser runs were retained separately in `artifacts/debug/`; the final browser journey passes.

## What the journey proves

- Two independent sandbox identities sign in, redeem matching verified-email community invitations and create profiles; official ticket status remains false.
- Invitation redemption is single-use under concurrent requests. Wrong email, expired codes and nonadministrator issuance are denied.
- Fresh, consented GPS discovery finds the other participant without returning coordinates. Concurrent discovery starts yield one successful session and one conflict, without extending expiry.
- Expired discovery becomes invisible before MongoDB TTL cleanup, without waiting 30 real minutes. A wall-clock 30-minute physical-device endurance run remains unverified.
- A recipient accepts a public-landmark meeting without granting GPS access. A third participant cannot accept someone else's invitation.
- QR/profile links view first; follows require an explicit action. Mutual followers exchange private messages; private notes stay with their owner.
- Stop removes radio token resolution and nearby visibility; leaving a venue retains connections and chat. Blocks cut off access, invitation revocation disables protected reads, and deletion removes profile/messages.
- The browser uses synthetic GPS, a synthetic venue and sandbox accounts. No claim of real conference attendance, organizer approval or physical Bluetooth proximity follows from these tests.

## Repairs made

- Fixed the real Nearby failure: `Array.filter(freshLocation)` supplied the array index as the helper's optional clock argument. The explicit callback now passes only the location.
- Added a separately labeled community access policy with HMAC-only code/email storage, atomic redemption, expiry, revocation and administrator restrictions.
- Added public-landmark meetups, with recipient decisions, participant cancellation, event/time checks and directions that reveal no attendee position.
- Added private connection notes and an own-position/approved-landmark map selector.
- Made discovery start atomic under races, fixed fresh-database index bootstrap, removed duplicate bootstrap, and added indexes for new records.
- Disabled public post/feed/like/comment routes and removed reachable feed UI, retaining historical data for review.
- Added authenticated per-user rate limits for shared conference networks; bounded socket lifetime to JWT expiry and disconnected revoked/deleted community sessions.
- Added persistent Stop controls, native safety/account controls, separate native OIDC client support, refresh-token storage/rotation and authorization-code replay protection.
- Repaired Expo dependency packaging and duplicate native modules, and added the missing iOS module packaging and repaired Swift delegate ownership and GATT cleanup. Source/autolinking are checked; compilation and hardware remain unverified.
- Added reproducible browser/API tests, CI steps, administrator CLI and operations documentation.

## Exact external blockers

1. **Repository ownership:** grant write access to local GitHub account `Proofofaudit` on `MKVEERENDRA/Devcon-follow`, or sign Codex's Git CLI into an account with write access. The connected App additionally lacks contents-write permission. No duplicate repository was created.
2. **Real identity:** create/configure an OIDC provider; supply HTTPS issuer/JWKS, API audience, separate web/native public client IDs, callback allowlists, verified email and refresh policy. Choose the actual administrator subject after signing in. Secrets stay in the service secret manager.
3. **Access and venues:** authorize a community pilot explicitly in service configuration and issue invitations, or obtain the organizer's read-only ownership verifier. Supply approved venue/landmark coordinates and event windows. Official verification is unavailable and remains fail-closed.
4. **Network and deployment:** configure restricted Railway egress access in Atlas, reconcile the existing staged service, configure required secrets/source in staging, then test before production. No global Atlas allowlist was opened and no staged infrastructure was activated.
5. **Native release:** remediate high-severity build dependencies, configure EAS/signing and an actual API origin, compile and sign both apps, then test the full phone matrix and interruption/expiry behavior.
6. **Operational release:** finalize privacy/support/retention ownership, restore/backup evidence, monitoring/alerts and real-provider two-account acceptance.

The high-severity underlying mobile advisories are [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Registry checks returned latest versions 3.0.3 and 1.4.0 respectively, both within the reported vulnerable ranges at execution time. `npm audit fix --force` proposed downgrading Expo to 44.0.6; that breaking downgrade was not applied. UUID also has a moderate advisory. Full dependency chains are in the local audit JSON.

## Release matrix

| Component | Implemented | Tests | Deployed | Remaining |
| --- | --- | --- | --- | --- |
| API + database rules | Yes | PASS locally, real disposable MongoDB | No | Atlas networking, real OIDC, operator setup |
| Website | Yes | PASS production build + two-account sandbox browser journey | No | Writable GitHub and configured Railway staging |
| Community access | Yes, disabled by default | PASS replay/email/expiry/privacy checks | No | Administrator identity and explicit pilot configuration |
| Official ticket verification | Adapter only | Fail-closed tests PASS | No | Organizer authorization/provider |
| Android/iOS | Source + JS exports | Typecheck/export/autolink PASS | No | Dependency remediation, native compilation/signing, phones |

No production feature is marked PASS solely because a unit test or JavaScript bundle succeeded. Obtain the local source revision with `git rev-parse HEAD`; the final chat records that revision after committing this report.
