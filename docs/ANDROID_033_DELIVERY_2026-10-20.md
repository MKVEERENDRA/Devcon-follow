# Android 0.3.3 / staging continuation — 20 October 2026

This report supersedes earlier candidate/version and deployment facts, not their
recorded acceptance limits. Public product release remains **BLOCKED**.

## Source and artifacts

- Current application/web source: `358e86752aa0e6f8cb32f92e83d6db31356a029c`.
- Android source: `17b96c79f15686db45d05ea92c0555e580bd7c04`.
- Candidate: **0.3.3 / versionCode 4**, `com.proofofaudits.devconfollow`.
- [EAS build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/a7593e0c-f322-4f05-81b2-44184f3b42e1):
  `a7593e0c-f322-4f05-81b2-44184f3b42e1`, **FINISHED**.
- Local APK: `artifacts/android-preview/devcon-follow-0.3.3-4.apk`;
  **99,361,048 bytes**. It is a standalone release APK, not Expo Go or an AAB.
- SHA-256: `c40414ea106c7c245a43d9d2c8f1230ad552f2a94da9c6bc2ecc797cad15deed`.
- Signing certificate SHA-256:
  `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
  Existing remote keystore and app-link certificate preserved.
- SDK `apksigner` and `apkanalyzer`: **PASS** signature, package, version,
  non-debuggable, standalone embedded bundle and expected **staging** API origin.
  Evidence: `artifacts/android-preview/apk-verification-0.3.3-4.json`.

The new APK includes native session restoration fixed in `b5ae69c`: expired
access tokens renew before account validation; rotated credentials are persisted;
transient provider/API failures preserve recoverable sessions. This is source
and sandbox evidence, not a genuine native Auth0 acceptance claim.

## Actual APK JavaScript inventory

EAS now captures the generated release bundle and composed source map from the
same build. The captured bundle is byte-identical to `assets/index.android.bundle`
inside this SDK-verified APK. **1,069 sources**, neither `braces` nor `node-forge`
implementation present in that map. Bundle SHA-256:
`889e4c013a67de434ca0cbee8f111b9f7eb371505d9dc825eca0abf9358b84a2`.
Map SHA-256: `8a1e27bf7be5f03efcb03832476a883062c186fecc9f72097e70e1b91a6b0d89`.
Evidence: `artifacts/android-preview/apk-bundle-exposure-0.3.3-4.json`.

This is **embedded JavaScript inventory only**. It does not audit native binaries,
repair vulnerable build/certificate tooling or approve distribution. The npm
native security gate still fails with 15 high findings under two advisory roots;
no override, invented patch, real residual-risk acceptance or public APK release
has been created. See [security packet](RELEASE_SECURITY_DECISION_2026-10-20.md).

`.easignore` now excludes local MCP/operator configuration, environment files,
private binaries and signing material. A clean source archive was inspected
before upload. Operator verification scripts added after the APK build do not
change its recorded source provenance.

## Web QR login repair

`358e867` fixes a reproduced bug: mounting the signed-out app consumed the
`?profile=` intent before the sign-in button could preserve it across OIDC.
The intent is now consumed only after authentication. New loopback browser
regression checks the actual authorization-code + PKCE redirect, intended
profile, no automatic follow, and explicit Follow persistence. It failed before
the fix and passes afterward. Existing venue/profile authorization is unchanged.

## Verification

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Current CI unit/integration baseline | PASS | 86 tests, zero failures/skips |
| Current CI browser journeys, types, exports, container | PASS | [test-build](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39409348721/job/118582982075) |
| Expo Doctor | PASS | 20/20 in same CI |
| Native compilation | PASS | [Android + iOS simulator](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39407914804); source `9c3c413`, native source unchanged in subsequent commits |
| Exact APK authenticated browser transport | PASS | Sandbox download of real 0.3.3 bytes, matching hash; axe and large text; not real-provider evidence |
| Native security gate | FAIL | [Unchanged gate](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39409348721/job/118582981987) |
| Android 14 emulator installation / launch command | PASS | Exact 0.3.3/4 installed with `adb install -r`; COLD launch Status ok, 3,094 ms |
| Emulator interactive / network acceptance | BLOCKED | System UI ANR overlay persists; app reports secure connection failure. No login performed |
| Real native Auth0 / camera / GPS / BLE | BLOCKED | No physical-device acceptance |
| Two-person physical pilot | BLOCKED | Consenting second tester and approved temporary venue/window unavailable; do not invent or repeatedly request them |

Emulator evidence is in `artifacts/android-preview/033-emulator/` (install and
launch text, logcat and screenshot). The same System UI issue was previously
observed on a clean AVD before app installation. The launch command succeeded,
but the visible system error was not dismissed or described as a passing UI
journey. The emulator was stopped after recording evidence.

### Functional acceptance by section

| Section | Sandbox/API/browser evidence | Genuine attendee/device acceptance |
| --- | --- | --- |
| Discover | PASS search/pagination/filters, venue and blocking rules, synthetic load regression | BLOCKED second tester/approved venue |
| Nearby | PASS server 30-minute expiry/revocation, consent/uncertainty, denial and offline Stop recovery | BLOCKED physical GPS/BLE |
| Meetups | PASS reason/landmark/time, accept/decline/cancel/re-propose, conflicts and persistent updates | BLOCKED two-person pilot |
| Connections | PASS QR link inspection/explicit follows, mutual chat, owner-only notes, saved off-site connections | BLOCKED physical camera and genuine two-account journey |
| Me | PASS profile/photo/social/roles, visibility, account/session regression tests | Prior one-owner web profile persistence PASS; new native-provider acceptance BLOCKED |

Real Auth0 history is unchanged: one genuine owner **web** sign-in, profile
persistence, session renewal and the earlier 0.3.2 private binary download passed.
Subsequently, after database recovery, the existing owner web account restored
through the real Auth0 SSO redirect. The saved profile remained present on Me,
with Nearby hidden and profile visibility hidden. No profile mutation or
location start was performed. All five sections loaded: off-site Discover showed
no profiles, Nearby sharing stayed disabled, Meetups completed loading with no
pending items, Connections showed no follows, and Me showed the saved profile.
These are current owner read/empty-state checks, not two-person functionality.
This is genuine one-owner web/session-persistence
evidence against the new staging deployment, not native or two-person acceptance.

No new Auth0 credentials were entered by the agent. The current admin tab is
still awaiting owner login; native Google/email/rotation/account-switch flows
have no new genuine-provider acceptance evidence. Official ticket verification
and optional zkEmail evidence remain unavailable, with no official badge issued.

## Existing staging delivery

Only the existing project `2bc6b37c-697d-4077-a23b-503ee588d595`, staging
`7377c9c3-4384-401d-bbb6-4fde0347fa73`, service
`a9000893-59e1-48d7-8c0e-bf0b9a1c6c88` was uploaded.
[Deployment](https://railway.com/project/2bc6b37c-697d-4077-a23b-503ee588d595/service/a9000893-59e1-48d7-8c0e-bf0b9a1c6c88?id=490faa38-809a-4f21-8da7-0b5cf8972168):
`490faa38-809a-4f21-8da7-0b5cf8972168`. Platform status is **SUCCESS** (this is not database readiness). Image digest:
`sha256:0a8e646301f3d1efe1808ec60d451a6dee6846de5731659137cf68b2c31ad942`.
CLI metadata identifies exact web/API
source `358e86752aa0e6f8cb32f92e83d6db31356a029c` and APK source `17b96c7`.
Tracked source was isolated with `git archive`; only verified binary/metadata
were added to `private-release/` outside the public root. No environment file,
operator configuration, source map or build-artifact URL was uploaded with it.

The runtime observed **152.55.182.15** as its outbound IP. Its initial absence
from Atlas blocked database readiness. The owner subsequently reported adding
only `152.55.182.15/32`; independent Atlas readback confirms six entries with all
five previous entries preserved. The same running service recovered automatically,
without a redeploy, database reset or credential change. The agent made no Atlas
mutation.

Post-recovery checks:

| Endpoint | Actual result |
| --- | --- |
| `/health/live` | PASS 200 |
| `/health/ready` | PASS 200; database ready, official ticket verifier absent |
| `/health/release` | BLOCKED 503; auth/access true, administrator/approved venue/landmark false |
| `/client-config` | PASS 200 JSON, no-store; authReady=true, communitySelfService=true, ticketReady=false |
| `/v1/me` without authentication | PASS 401 JSON, no-store/private |
| `/v1/releases/android` without authentication | PASS 401 JSON, no-store/private |
| `/v1/releases/android/apk` without authentication | PASS 401 JSON, no-store/private |

The existing genuine owner browser session successfully retrieved candidate
metadata and displayed **0.3.3/build 4** after pressing Retry. Clicking Download
entered “Downloading and checking APK…” and returned to the normal button without
an error. Source checks response MIME, exact size and SHA-256 before initiating
its blob-file save. This is live authenticated UI/client-integrity evidence;
no token or cookie was exported. The browser download-event capture timed out,
and no newly saved file was available in the host Downloads directory. Therefore
an **independent filesystem checksum of this live browser download remains
unverified**. Do not extend the separate exact local APK and sandbox-byte checks
into a claim that such a live file was independently recovered.
Screenshot: `artifacts/install/live-private-033-recovered.png`.

The public installer remains
https://devcon-follow.vercel.app/install.html and links to the existing private
https://devcon-follow-api-staging.up.railway.app/install.html . The private
installer now serves the 0.3.3 candidate to the existing approved owner session.
No new public website publication,
GitHub Release/tag, production API, public enrollment, Auth0 setting, venue,
attendee record, billing or Proof of Audits change is part of this continuation.

## Remaining release requirements

1. Staging connectivity is restored, but durable fixed egress remains
   unavailable within the current zero-cost setup. Do not
   open broad ranges. See [network runbook](RESTRICTED_NETWORKING.md).
2. Finish existing Auth0 administration review after owner login and provision
   owner-controlled Google credentials; preserve genuine owner web-login evidence.
3. Complete genuine Android login and the separately authorized consenting
   two-person/physical-device acceptance when inputs are available.
4. Resolve upstream vulnerabilities using supported versions, or obtain an
   explicit bounded security decision for an exact production candidate.
5. Obtain consolidated production/public-distribution approval before creating
   a public release, connecting the public site to an approved production API or
   enabling public enrollment. This staging APK cannot be relabeled production.

## Subsequent production preparation — source only

`ddb1d89` adds an explicit **Save verified APK** fallback after the private
response passes MIME, size and SHA-256 checks. It reuses the same checked blob
without another API request or credential in its URL, expires after two minutes,
and revokes it on replacement, account/authentication change or unmount. This
addresses browsers that do not complete an automatic asynchronous save; it does
not claim that requesting a save means the OS installed the app.

Local verification passed: web build, syntax, sandbox PKCE download, fallback
save with identical bytes/no extra API fetch, expiry and blob revocation, HTML
and tamper rejection, axe and large text. The same download/fallback test also
passed with the actual signed 0.3.3/build 4 binary. These remain sandbox transport
tests, not new genuine-provider/device acceptance. The production/source changes
have **not** been deployed; the running staging image/source remain recorded
above. No new APK is required for this web-only fix.

Auth0 management authorization was diagnosed without printing credentials:
Codex already has an enabled global Auth0 MCP entry, and the keychain domain
matches the existing Devcon tenant. Its saved management token expired at
2026-10-19T01:18:50.117Z and **no refresh token is present**. A dashboard sign-in
does not renew this separate MCP credential. No new admin token, permissions,
client or Google secret was created. Do not ask the owner to repeat dashboard
login as a presumed repair for this condition. App SSO and this management
authorization are separate; the genuine app SSO result above remains valid.

Fresh audit still reports 15 high/zero critical findings under the same two
upstream advisories, neither listing a patched version. The existing production
Railway environment was inspected read-only: the service remains staged-create,
with seven old pending changes and no running deployment. Those changes were
not applied blindly. Production-owned Google configuration, durable restricted
connectivity and physical acceptance remain unresolved. No paid upgrade or
public release/security waiver is implied by this preparation.

## Signed-in Chrome Auth0 review

The owner supplied a completed Auth0 dashboard. Browser inventory located the
correct **signed-in Chrome session** for the existing tenant. The separate
in-app browser was still on a login page; the expired MCP token does not prevent
using the authorized Chrome dashboard. Do not request another Auth0 login while
this Chrome session is usable.

Read-only live review confirms the existing native callback/logout scheme,
authorization-code and refresh grants, RS256/OIDC mode, refresh rotation with
24-hour idle/7-day maximum lifetime, and disabled implicit/password grants. Web
callback/logout/origin allowlists already include the public domain and staging,
with no wildcard; web refresh rotation is enabled. Google is already enabled for
both existing clients. **No setting or signing key was changed.** Public-only
configuration evidence: `deploy/auth0/review-2026-10-20.json`.

The Google connection still explicitly reports Auth0 development keys, with no
owner client ID configured. Auth0's official Google setup requires a Google
project, owned OAuth web client, the tenant's `/login/callback`, and testing of
the configured connection before production. The exact proposed origins,
redirect and minimal sign-in scopes are recorded in the review JSON, not applied.

Google Cloud initially used the wrong signed-in Google account and displayed a
two-step-verification requirement. The owner corrected the intended account;
**do not require 2SV changes to the other account**. The correct-owner Google
sign-in page was opened. Chrome then reported an extension popup blocking
automation. The owner was handed sign-in and popup completion. No Google project,
OAuth credential, billing trial, paid upgrade or account-security change was
created or accepted. Credentials and recovery codes must stay out of chat.

Installer fallback code `ddb1d89` now also has a passing full [test-build CI job](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39455001018/job/118739438997).
The independent [native security job](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39455001018/job/118739439179)
remains failing, unchanged. The source has not been deployed with this web-only
installer improvement; the existing staging service was not redeployed during
account inspection.
