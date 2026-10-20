# Public product delivery — 20 October 2026 (IST)

## Outcome

Production delivery is **BLOCKED**, not complete. The existing five-section
application is preserved. This continuation repairs native session restoration
and build/release safeguards, not public access or attendee records. No production deploy, public APK Release,
Auth0 setting, Atlas entry, staging redeploy, billing or Proof of Audits change
was made. The current source is on GitHub; the existing install handoff remains
https://devcon-follow.vercel.app/install.html .

## Why the public experience is closed

- The published Vercel installation build is
  `dpl_FKymmWXgjS7qnY5LdegqkayCDadC`, source `a9aa57d`. Its static
  `/client-config` deliberately returns `authReady=false`, `ticketReady=false`,
  `communityReady=false`. It has no production API rewrites.
- The only running Railway API is staging deployment
  `17d3cc6d-e062-4350-a11e-1c871331243c`, source `a9aa57d`, in environment
  `7377c9c3-4384-401d-bbb6-4fde0347fa73`.
- Read-only Railway inspection confirms production environment
  `0f293625-f62e-461d-a2e0-59b9e5124f26` has **no live service configuration**.
  The existing service is staged as newly created, with six pending variable
  names and no OIDC/client configuration. Those staged changes were not applied.
- Staging is a private, verified-email cohort, not public enrollment. It has
  no approved discovery venue/landmarks or configured administrator. Rewriting
  Vercel to staging or removing preview wording would not create production.
- Android 0.3.2/build 3 embeds the staging API origin. It is an actual signed
  standalone APK but cannot be relabeled as a production binary.
- The last Auth0 review found development Google keys. Current administration
  review is pending owner login; no owned Google credentials or new Google
  acceptance are claimed.

## Engineering changes

Initial build-wiring commit: `4b8072c5bfec335988419380365d1ab7554a8d7f`.
The following installer policy continuation is recorded in this file’s Git history.
[Build CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39373148086)
and [native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39373148056)
track this exact source.

- EAS production Android output is explicitly APK, with production EAS environment
  and no development client. Version increments are explicit in source rather
  than silently changing the local version during a remote build. Increment both
  app version and Android versionCode above 0.3.2/3 before the next signed release.
- Expo configuration rejects production builds with an empty API, non-HTTPS,
  credentials, path/query, loopback/IP/local address or a staging/preview/sandbox
  hostname. Preview and unsigned native compilation remain supported. This is a
  wiring check, not a security waiver or deployment approval.
- APK SDK verification accepts `--api-origin EXPECTED_HTTPS_ORIGIN` and rejects a
  candidate for another origin that still includes the staging endpoint. The
  existing default retains staging verification. Package/signature/version,
  non-debuggable mode and signer continuity checks remain enforced.
- CI actions are pinned to exact verified upstream v4 revisions; checkout tokens
  are not persisted. CI has finite timeouts and unchanged read-only permissions.
- New source-map inventory checks Android and iOS exported bundles for the two
  affected npm implementations, including indexed maps, and saves bundle/map
  hashes. Missing/invalid inventories fail. This does not override npm audit or
  assert that an export is identical to an APK.
- `deploy/devcon8-event-review.json` records official dates, venue identity and
  public address. It stays disabled, with no guessed coordinates, radius, daily
  discovery windows or landmarks. It is not an administrator API payload.

The installer additionally supports an **explicitly approved residual-risk record**
without changing `securityGatePassed=false`. The record must identify exactly
the two advisory IDs, source commit, APK hash, audit hash, approval time, expiry
(maximum 30 days), and a versioned decision file in this repository. Incorrect,
expired, future or mismatched records fail closed. The public metadata must also
identify a production HTTPS API origin, not staging. Public-release copy appears
only when complete release evidence passes; accepted risk is visibly disclosed
with its record link. Unit and browser checks use synthetic records only. **No
actual decision, public APK entry, approval or deployment was created.** Npm’s
CI gate remains red. Frontend record validation is not proof of human approval;
the operator must verify the actual decision and file before publication.

Native restoration also fixes a concrete cold-start race: a saved expired access
token previously received 401 and cleared a usable refresh credential while
foreground renewal could be starting. Restoration now completes refresh and
server validation before exposing the session to React. Rotated credentials are
persisted before the account read; transient provider/API failures preserve them
and expose Retry connection. Invalid grants or a renewed token refused with 401
clear the local session. Foreground renewal stores the rotated refresh credential
before the access token. Synthetic transport tests cover expiry, unexpected 401,
revocation, provider outage, API 503 and keystore failure. Actual native-provider
acceptance remains blocked. **The existing 0.3.2 APK does not contain this new
source fix; it needs the next explicitly versioned build.**

## Local verification

| Check | Status | Evidence |
| --- | --- | --- |
| Full regression/integration suite | PASS | 85 tests, zero failures/skips; disposable MongoDB and sandbox OIDC |
| Node syntax, web build, native TypeScript | PASS | ``/tmp/devcon-public-final-web.log` and native TypeScript command output` |
| Android + iOS Hermes export with source maps | PASS | `mobile/artifacts/production-security/`; `/tmp/devcon-native-restore-export.log` |
| Expo preview configuration | PASS | Existing version/build/project preserved |
| Production pointed at staging | PASS | Actual `expo config` command refuses it before build |
| Bundle exposure inventory | PASS | Android 1,069 / iOS 1,068 source entries; neither npm implementation found |
| Existing APK SDK verification | PASS | Signature/hash/package/version/standalone/staging URL reverified |
| Backend and web dependency audits | PASS | Fresh audits: zero vulnerabilities each |
| Current native dependency release gate | FAIL | 15 high affected packages, two advisory roots; no suppression |
| Android/iOS native compile at 4b8072c | PASS | Both native/BLE jobs passed; later session source needs a new compile run |
| Public website/API rollout and anonymous production APK | BLOCKED | Consolidated release approval and concrete production configuration not yet complete |
| Genuine native/provider and two-person device acceptance | BLOCKED | Existing owner web acceptance is not Android acceptance; tester/venue unavailable |

Read-only current health inspection: public client config remains closed; staging
liveness/readiness are 200, release is 503 with administrator, approvedVenue and
approvedLandmark false. No network or access setting was changed.

Current export evidence is `artifacts/install/native-bundle-exposure-20261020.json`.
Local APK evidence is `artifacts/android-preview/production-review-032.json`.
The unchanged APK's SHA-256 is
`c0f2ad88b875bacf46c619fef45933a613263245d57e220e378b2a96be3918ed`;
its signing certificate SHA-256 is
`c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
See [prior genuine live delivery](INSTALLER_DELIVERY_2026-10-20.md), including the
actual browser-saved APK. This continuation does not replace physical acceptance
with an additional emulator claim.

## Concrete remaining release work

Owner Auth0 login is the current account-access handoff. Inspect the existing
Google connection, web/native grants, rotation and exact allowed callbacks; use
owner-managed Google OAuth credentials, then verify genuine Google and password
login. Do not ask for passwords or secrets in chat.

After that, the consolidated approval must name the source/APK hashes, residual
security decision, existing Railway production service/database, HTTPS API origin,
restricted database route, reviewed administrator and venue configuration, public
community registration, exact Vercel project rewrites, and the GitHub release
asset/tag. Do not copy staging user records. Basic community accounts need no
Devcon ticket and receive no official ticket badge.

A ₹0 durable restricted Railway egress route remains unestablished. Existing pod
/32 connectivity is temporary; no broad allowlist or paid upgrade is authorized.
The second consenting tester and physical venue are explicitly unavailable. Do
not repeat requests for them or fabricate a successful pilot. Official ticket
verification stays disabled without organizer authorization.

## Rollback preparation

Preserve the current staged/production split and owner records. The existing
Vercel installer deployment above is the website rollback target. Record the
production API deployment ID, image digest, approved variables and prior target
before the separately approved rollout. Revert code or promote that known
website deployment without recreating the database; never roll back user data
by copying staging records. No production rollback is claimed tested when no
production deployment exists.

The security decision is [prepared separately](RELEASE_SECURITY_DECISION_2026-10-20.md).
