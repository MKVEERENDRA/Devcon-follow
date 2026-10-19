> Final code `891afe0`: [test-build PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39204943552/job/117905623554), [Android/iOS compile PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39204243844), [native-security FAIL](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39204943552/job/117905623683). Overall release remains BLOCKED; see the current five-section report.

> Current attendee-flow continuation: [`891afe0`](https://github.com/MKVEERENDRA/Devcon-follow/commit/891afe0), including [`e212605`](https://github.com/MKVEERENDRA/Devcon-follow/commit/e212605), adds durable meeting updates, conflict/retry protection and cancel/reproposal. [Five-section end-to-end report](END_TO_END_PRODUCT_REPORT_2026-10-19.md): **70/70 local tests**, three sandbox browser journeys; real device/push acceptance and deployments remain blocked/frozen.

> Latest source continuation: [`791c906`](https://github.com/MKVEERENDRA/Devcon-follow/commit/791c906) and [`38eb754`](https://github.com/MKVEERENDRA/Devcon-follow/commit/38eb754) adds secure paginated discovery, refresh-safe private notes, native editing/QR parity and accessibility coverage. [Current evidence](DIRECTORY_PARITY_EVIDENCE_2026-10-19.md) supersedes earlier counts: **67/67 local tests**, three sandbox browser journeys. Live testing and deployment remain prohibited.

> Latest reliability verification: 63/63 local tests and both sandbox browser journeys pass. See [v1 reliability evidence](V1_RELIABILITY_EVIDENCE_2026-10-19.md) for exact source revisions and current CI results; no live acceptance or deployment was performed.

> Current status (19 October): staging database readiness recovered; one real pending Auth0 identity was validated before the owner stopped live testing. New product changes are local source, not a deployment. See [current build report](PRODUCT_BUILD_2026-10-19.md) and [restricted networking](RESTRICTED_NETWORKING.md). Older entries below are historical, not instructions to repeat completed setup.

## Verification — 19 October product build

60/60 local tests pass (zero failures/skips), along with API syntax, web build,
native TypeScript, Android/iOS Hermes exports and the extended two-context local
browser journey. The browser journey also covers profile goals, explicit profile
visibility, meetup reasons and owner-only notes. This used disposable MongoDB and
loopback sandbox authentication, never the live API. See the current build report
linked above for the release checklist and unchanged external blockers.

# Build and release evidence — 18 October 2026 (IST)

**Updated outcome: redesigned frontend hosted at https://devcon-follow.vercel.app with registration disabled. Complete application launch remains BLOCKED; no signed APK or IPA exists.**

The later design pass recovered all nine original ChatGPT images, updated web/native presentation, and deployed only static frontend files through the connected Vercel account. Backend tests remain 52/52 passing; web build, native TypeScript, Android/iOS Hermes exports and Expo dependency checks pass. Source is now published to `MKVEERENDRA/Devcon-follow` on `main` via the existing SSH key, which authenticates as `MKVEERENDRA`. The connected App still returns 403, but that no longer blocks publishing. Real OIDC and backend deployment remain required. Native rendered QA is pending; see `design-qa.md` and `docs/design/README.md`. The verification table below also includes earlier acceptance evidence; the earlier local two-context browser journey predates the redesign; the new remote CI run has now also passed the full journey after redesign.

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
| Docker build | PASS REMOTE CI | GitHub Actions test-build job built the Docker deployment container successfully after the full two-account journey, native exports, autolinking and backend/web audit. |
| Kotlin/Swift native compilation | BLOCKED | No Java/Android SDK/adb or Xcode compiler available here |
| Signed APK / iOS build | BLOCKED | No production API URL or configured EAS project/signing workflow; build-tool vulnerabilities also unresolved |
| Physical BLE matrix | UNVERIFIED | No Android–Android, Android–iPhone or iPhone–iPhone device tests performed |
| Production OIDC + two real people | BLOCKED | User confirmed no identity provider exists. Sandbox results do not prove real-provider/device operation. |
| Atlas connectivity/index bootstrap | BLOCKED | Live Atlas allowlist is empty. Only disposable MongoDB was used. |
| Railway deployment | BLOCKED | Existing service is still `staged-create`, with no source, domain or deployed instance |
| GitHub publication | PASS | Existing SSH key authenticates as `MKVEERENDRA`; pushed `3681040` to `main` and fetched it back. Connector writes still return 403; the local `gh` identity is read-only. |

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

1. **Repository publication — resolved:** the existing `~/.ssh/id_ed25519` authenticates as `MKVEERENDRA`. Source was pushed without force to the previously empty repository. `origin` now uses SSH and tracks `origin/main`. No new credentials or repository were created.
2. **Real identity:** create/configure an OIDC provider; supply HTTPS issuer/JWKS, API audience, separate web/native public client IDs, callback allowlists, verified email and refresh policy. Choose the actual administrator subject after signing in. Secrets stay in the service secret manager.
3. **Access and venues:** authorize a community pilot explicitly in service configuration and issue invitations, or obtain the organizer's read-only ownership verifier. Supply approved venue/landmark coordinates and event windows. Official verification is unavailable and remains fail-closed.
4. **Network and deployment:** configure restricted Railway egress access in Atlas, reconcile the existing staged service, configure required secrets/source in staging, then test before production. Attempting to stage the now-published GitHub source returned `No GitHub account linked`; Railway needs its own GitHub connection. The saved Vercel CLI identity (`founder-5419`) cannot access the connector's `mkveerendras-projects` scope; no auth provider was provisioned into a different account. No global Atlas allowlist was opened and no staged infrastructure was activated.
5. **Native release:** remediate high-severity build dependencies, configure EAS/signing and an actual API origin, compile and sign both apps, then test the full phone matrix and interruption/expiry behavior.
6. **Operational release:** finalize privacy/support/retention ownership, restore/backup evidence, monitoring/alerts and real-provider two-account acceptance.

The high-severity underlying mobile advisories are [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Registry checks returned latest versions 3.0.3 and 1.4.0 respectively, both within the reported vulnerable ranges at execution time. `npm audit fix --force` proposed downgrading Expo to 44.0.6; that breaking downgrade was not applied. UUID also has a moderate advisory. Full dependency chains are in the local audit JSON.

## Release matrix

| Component | Implemented | Tests | Deployed | Remaining |
| --- | --- | --- | --- | --- |
| API + database rules | Yes | PASS locally, real disposable MongoDB | No | Atlas networking, real OIDC, operator setup |
| Website | Yes | PASS production build; latest remote two-account browser journey PASS | Static frontend only at devcon-follow.vercel.app | Configured Railway staging and real OIDC |
| Community access | Yes, disabled by default | PASS replay/email/expiry/privacy checks | No | Administrator identity and explicit pilot configuration |
| Official ticket verification | Adapter only | Fail-closed tests PASS | No | Organizer authorization/provider |
| Android/iOS | Source + JS exports | Typecheck/export/autolink PASS | No | Dependency remediation, native compilation/signing, phones |

No production feature is marked PASS solely because a unit test or JavaScript bundle succeeded. Obtain the local source revision with `git rev-parse HEAD`; the final chat records that revision after committing this report.

## Access recheck and source publication

The existing SSH credential was overlooked in the earlier access assessment. The user was correct that a working owner credential existed locally. GitHub publication is no longer blocked. Initial published revision: `36810402e61f43e54d25e97ad6acc52765a240db`. Remote workflow: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39116335304. Its native vulnerability gate fails on the previously documented dependency advisories; this gate has not been disabled. The test-build job completed successfully, including the full browser journey, Android/iOS exports, both autolinking checks, backend/web dependency audits and Docker image build. Overall CI remains failed because native-security correctly rejects the unresolved mobile dependency advisories.

## Latest continuation — reuse, CLI access and security

- Railway CLI authentication completed through the user's existing account; no
  GitHub linkage is required for future local source uploads.
- Created only the `staging` environment (`7377c9c3-4384-401d-bbb6-4fde0347fa73`)
  inside the existing project. The existing API service has three staged settings:
  Dockerfile, `node src/server.js`, `/health/live`. Two connector apply attempts
  returned "Cancelled — the user did not approve this action", including after
  the user explicitly approved staging changes. They were not applied by a
  different route. Production's seven original staged changes remain untouched.
- ZITADEL cloud signup was completed by the user. This proves account access,
  not the web/native application client configuration or a passing real-provider
  journey. At the user's later request, no further login/account setup is attempted.
- Scoped `xcode`'s uuid dependency to 11.1.1; its UUID generation smoke check
  passes. Mobile audit is now 15 high, zero moderate, zero critical. The remaining
  high findings still prevent native security acceptance.
- Latest local API suite: 52/52 PASS. Syntax checks, production web build, mobile
  TypeScript, Expo version compatibility and both native Hermes exports PASS.
- See `docs/OPEN_SOURCE_REUSE.md` for versions, licenses, reuse decisions and
  authoritative upstream sources. Native builds and phone tests remain unverified.

Production prerequisites still missing from the deployed service: configured
HTTPS OIDC issuer/JWKS, API audience and separate web/native client IDs; an actual
administrator subject; enabled community invitation policy/secrets; an approved
venue/landmark and event window; restricted Atlas egress connectivity with verified
indexes. Existing database credentials must stay in Railway, not chat or git.
No production API URL or signed native artifact exists.

## Auth0 continuation

Auth0 Free selected after checking official pricing/documentation for Auth0,
Clerk and WorkOS. See `docs/AUTH_PROVIDER_DECISION.md`; no paid plan was enabled.
Added the Auth0 Post Login Action and strict namespaced verified-email handling
for API access tokens. Web requests rotating-refresh capability and revokes on
signout; native requires a separate client ID and clears local credentials before
bounded network cleanup and provider OIDC logout. No Auth0 tenant credentials
or real-provider acceptance result has been invented.

Latest local API suite: **56/56 PASS**. The full two-context PKCE/community/
meetup/QR/follow/chat/Stop journey also passes after these changes. Syntax checks,
web production build and mobile TypeScript pass. Native compile-only CI now
requests Android Debug and unsigned iOS simulator builds on supported hosted
runners. These are build evidence only; no signed release or hardware result is
claimed. Existing native-security remains unchanged and failing on the 15 high
upstream tooling findings. Railway's same three prepared staging settings remain
pending manual apply; production is still unchanged.

## Auth0 tenant and native compiler evidence — 18 October 2026

Source tested remotely: `9727baa770ee294efe2ff7ebf7ac7104cc29ea98` (confirmed as
GitHub main before these evidence updates). Existing source was preserved.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Main `test-build` job | PASS | [CI run 39137626975](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626975); API/browser/web/native-export/Docker checks |
| Android native compilation | PASS | [Native run 39137626955](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626955); `:app:assembleDebug`, including Kotlin BLE module |
| iOS simulator compilation | PASS | Same run; CocoaPods + `xcodebuild`, Swift BLE module, signing disabled |
| Android compiler reports | PASS | [Artifact 12140207837](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626955/artifacts/12140207837), 40,915 bytes; reports only, no APK distribution |
| Native dependency audit | FAIL | Current `npm --prefix mobile audit --json`: 15 high, 0 moderate, 0 critical; offered Expo 44 downgrade rejected as incompatible |
| Real Auth0 public clients | CONFIGURED | Separate web/native IDs and policy read-back in `AUTH_PROVIDER_DECISION.md` |
| Auth0 API / verified-email Action | CONFIGURED | RS256 API, offline access, 600-second token expiry; Action built/deployed and post-login binding read back |
| Auth0 public discovery + signing keys | PASS | Expected HTTPS issuer, JWKS URI, RSA signing key, S256, logout and revocation endpoints |
| Focused provider regressions | PASS | `node --test test/auth-provider.test.js`: 4 passed, 0 failed/skipped, disposable MongoDB + independent test issuer |
| Live static preview guard | PASS | `https://devcon-follow.vercel.app/client-config`: authReady/ticketReady/communityReady all false |
| Railway staging | BLOCKED | Authenticated CLI; no service instance; same three pending settings preserved after rejected approval, awaiting manual apply |
| Atlas readiness | BLOCKED | Existing Mumbai FREE cluster IDLE/running; access list empty; no app DB read/write/index proof |
| Real-provider two-attendee journey | BLOCKED | No running staging API/Atlas path; provider setup and synthetic-token tests are not genuine attendee acceptance |
| Native signing and phone radio tests | UNVERIFIED | No signed release, APK/IPA distribution or Android↔Android/Android↔iOS/iOS↔iOS physical evidence |

No new project/service/cluster, paid plan, blanket database access rule, fake
attendee or official verification flag was created. Auth0 client secrets remain
redacted and are not required by these public clients. Provider email delivery
and owned production Google credentials still need verification; the app remains
closed until the real backend and release checks pass.


## Actual Railway staging source upload

Source revision: `8ac1514` (startup readiness and explicit registration guard).
The operator's settings application was independently confirmed: service live,
Dockerfile/start/healthcheck correct, zero pending changes. The existing project,
service and staging environment were explicitly selected for every mutation.

- Authorized CLI upload: `railway up --project 2bc6b37c-697d-4077-a23b-503ee588d595
  --service a9000893-59e1-48d7-8c0e-bf0b9a1c6c88
  --environment 7377c9c3-4384-401d-bbb6-4fde0347fa73 --detach`.
- [Deployment b9c3a460-f5fc-41ff-b3e7-be1899d58891](https://railway.com/project/2bc6b37c-697d-4077-a23b-503ee588d595/service/a9000893-59e1-48d7-8c0e-bf0b9a1c6c88?id=b9c3a460-f5fc-41ff-b3e7-be1899d58891): SUCCESS. Remote Docker/Vite build and liveness check passed.
- Container image digest:
  `sha256:be5c1c23b8943e91739eb56927403ff6b610059ed605152fbb5f803eef415747`.
- HTTPS: https://devcon-follow-api-staging.up.railway.app
- Public OIDC settings, exact staging web callback/origin/logout, app origin,
  production runtime mode and isolated staging database name configured.
  Registration and community access explicitly false.
- Local syntax and **58/58 API tests PASS**, zero failures/skips, including startup
  readiness/attendee-route fail-closed and registration-off regression tests.
- Existing local two-browser-context PKCE/community/discovery/meetup/QR/chat/Stop
  regression PASS after the change. Disposable MongoDB and sandbox issuer only.
- Live `/health/live`: **200** `{ok:true,phase:"initializing"}`.
- Live `/health/ready`, `/health/release`, `/client-config`, `/v1/me`: **503**;
  no attendee/auth app routes available while database startup is incomplete.
- Container egress observed `34.186.54.95`; not reserved/static. Atlas user creation
  and narrow /32 allowlist attempts were rejected for lack of confirmation.
  No DB user or network access entry was created. Owner actions requested through
  secure service settings; no production secret reset/copy was attempted.
- Atlas access list remains empty; `MONGODB_URI` absent in staging at this check.
  Real Atlas read/write/index readiness and real-provider two-account acceptance
  remain **BLOCKED**. No success was inferred from the deployment's SUCCESS state.
- Production independently inspected: original seven pending changes, no live
  service/deployment. No production deployment or configuration mutation occurred.

Next acceptance gates after DB/network setup: actual administrator subject,
approved venue/landmark/window, separately authorized community pilot policy,
real verified-email sign-ins for two accounts, and the full privacy journey.
Official ticket verification remains disabled. Native security/signing/phone gates
remain unchanged from the previous evidence.


### Staging secret reload and changed egress

The owner subsequently created the scoped staging DB user, saved `MONGODB_URI`
in Railway and permitted only `34.186.54.95/32` in Atlas. These were verified
through account inventories; no secret was printed or written into the repo.
A structure check confirms expected Atlas host, staging username, password
presence, `MONGODB_DB=devcon_follow_staging` and registration disabled.

Reloading the existing image created deployment
`57e8baab-b82b-408a-81c2-f624d1cf1f1c`. The current container reported egress
`152.55.180.192`, outside the earlier /32 entry. Readiness/release remain 503.
The exact new /32 owner action was requested; the process can retry without
another deployment after it is applied. This observed IP change is direct
evidence that the trial network path is not stable production networking.

A direct read/write/index probe over SSH did not execute: the host key was not
already trusted. No host-key validation bypass was used. A temporary diagnostic
SSH key was registered, then removed successfully; all local copies were deleted.
No probe data or passing DB/index result is claimed. The deployment's SUCCESS
status and process liveness still do not establish application readiness.

Remote CI for source `8ac15146001306f95971684dda2c25defebebf80`:
[run 39154232935](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39154232935).
`test-build` PASS; `native-security` FAIL (unchanged 15 high tooling findings).
