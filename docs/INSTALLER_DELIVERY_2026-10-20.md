# Android installation repair — 20 October 2026 (IST)

The old public installer linked to an Expo account build-details page for Android
0.3.0/build 1 (`989288ba`). The owner reported “No internal distribution build
exists at this URL.” The signed-in Expo dashboard still lists that build as
Succeeded with an APK. Thus the report does not establish a missing binary;
the installation handoff is unsuitable for anonymous visitors. Existing project
unauthenticated build-page access is disabled; it was not loosened to fix delivery.

## Implemented delivery

The public manifest no longer promotes an Expo dashboard URL as a binary download.
Public Android metadata requires an actual asset URL in this repository's GitHub
Releases, anonymous binary verification evidence, source/checksum/certificate and
a passing release-security gate. There is currently no approved public release.
The installer points approved testers to the existing staging installer instead.
No public GitHub Release or duplicate storage service was created.

Staging can package a verified APK outside `web/dist` under `private-release/`.
`GET /v1/releases/android` and `GET /v1/releases/android/apk` require the existing
verified-email community cohort and recheck revocation on every request. Missing,
corrupt or inconsistent packages fail closed. Production environments cannot
activate this transport. Responses are private/no-store, with no external CDN
redirect, bearer in a URL, or public static binary. Downloads have a separate
three-per-minute limit. The browser checks content type, byte count and SHA-256
before saving the APK; HTML, incomplete and corrupt responses produce errors.

Reproduce packaging after SDK verification (all paths outside version control):

```sh
node scripts/verify-android-apk.mjs --apk APK --build-id BUILD_ID --output SDK_EVIDENCE_JSON
node scripts/prepare-private-android.mjs APK SDK_EVIDENCE_JSON APK_SOURCE_COMMIT STAGING_ARCHIVE/private-release
```

Use the existing Dockerfile with a tracked-source staging archive, adding only the
matching APK and generated metadata. Railway CLI needs `--no-gitignore` on that
isolated archive because private artifacts are deliberately ignored by Git.
Do not run that flag over the developer checkout or include local environment
files. No Auth0, Atlas or cohort configuration change is required for delivery.

## Existing candidate independently reverified

Android 0.3.1/build 2, EAS `6583ca87-7174-4907-8c8b-df10c38ceee9`:
99,356,328 bytes; package `com.proofofaudits.devconfollow`; SHA-256
`8c5b0a1d52a4745de93a72198a681f2046ff16cb6fb9fbc8f54cb026ab821c99`.
Release certificate SHA-256:
`c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
Android SDK verification again confirmed signature, non-debuggable manifest,
standalone JS and the intended staging endpoint. This recheck does not replace
its earlier installation evidence or establish physical-device acceptance.

## Supported SDK updates and remaining security gate

`expo install --check` now expects Expo 58.0.16, camera 58.0.11, font 58.0.9,
image-manipulator 58.0.15 and location 58.0.18. Applied through the official
`expo install --fix` command with consistent lockfiles. The next candidate is
0.3.2/build 3 so its provenance cannot be confused with the existing 0.3.1 APK.

Fresh audit still reports **15 high, zero critical/moderate** findings rooted in
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and
[node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
Both primary advisories list no patched version; registry latest remains braces
3.0.3 and node-forge 1.4.0. No forced downgrade, unreviewed patch, suppression or
waiver was applied. Broad public distribution remains blocked. See the
[exposure analysis](NATIVE_SECURITY_2026-10-19.md).

## Verification so far

- PASS: 80/80 API/domain integration and regression tests, zero skipped.
- PASS: isolated private binary transport, cohort/verified-email/revocation checks,
  corrupt-package and production-environment rejection.
- PASS: sandbox browser PKCE return to installer, exact binary download/checksum,
  HTML/tamper rejection, session restoration, axe and enlarged text.
- PASS: public installer regression, unavailable states, metadata gating and layouts.
- BLOCKED: public distribution security gate and release authorization.
- BLOCKED: second consenting identity and approved venue/window/landmark for genuine
  two-person acceptance; no fake identities or GPS samples were provisioned.
- UNVERIFIED: physical phone installation, native login, GPS, BLE and camera.
- iOS distribution is excluded from this execution at the owner's request; preserve
  its code and compilation, with no membership purchase or signing attempt.

## Emulator diagnosis

A newly created isolated Android 15 AVD (1536 MiB RAM, 720×1280 software graphics,
no saved snapshot) reproduced the System UI ANR on the launcher **before this app
was installed**. The pre-install screenshot and `dumpsys window` both show
`Application Not Responding: com.android.systemui`; Devcon Follow was absent.
Disabling the modem simulator and Wi-Fi packet streamer did not resolve it.
This establishes reproduction independent of the application, not the precise
system cause. The earlier Bluetooth-service crash is not sufficient to prove
that it causes this ANR.

Installing the actual 0.3.1 APK then returned Success; its activity cold start
returned Status ok / LaunchState COLD in 2.293 seconds and its process remained
running. Visual acceptance still fails because of the system dialog. No dialog
was dismissed, app failure hidden or physical-device result substituted.
The isolated emulator was stopped afterward. Local evidence:
`artifacts/android-preview/clean-20261020/` (pre-install screenshot/window dump,
installation, cold start and post-launch screenshot).

## Current source / CI

- `4a7876f`: supported native SDK patch alignment, Android 0.3.2/build 3.
- `92f7037`: restricted authenticated APK transport and repaired installer source.
- `24933f4`: correct config/manifest caching and API routing; allow only the
  configured Railway HTTPS/WSS socket origin, including polling fallback.
- [CI test-build PASS at 92f7037](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39305015460), with native-security intentionally FAIL.
- [Native Android and unsigned iOS simulator compile PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39305015383), source `92f7037`.

## Verified 0.3.2 candidate and deployment

[EAS Android build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/9c6760dd-fef6-4cb0-8ab1-5f43aae8906c)
**FINISHED**, version 0.3.2/build 3, source
`92f7037a015e09abf631113fa9904f491448fc93`.
Downloaded binary: 99,356,328 bytes; SHA-256
`c0f2ad88b875bacf46c619fef45933a613263245d57e220e378b2a96be3918ed`.
Signing certificate remains
`c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
SDK verification passes signature, signer continuity/app-link fingerprint,
package, non-debuggable release mode, version, standalone JS and staging endpoint.
The verifier does not certify dependency security; its earlier hardcoded audit
count was removed in favor of an explicit separate current audit result.

The actual APK installed on an isolated Android 14 AVD and cold-started in 5.750
seconds. System UI ANR still overlays the rendered welcome screen. This emulator
also has no active default network and cannot resolve the staging hostname;
restoring Wi-Fi defaults and explicit DNS did not establish connectivity.
The manifest includes INTERNET/ACCESS_NETWORK_STATE. No native provider login or
clean visual acceptance is claimed, and the emulator was stopped afterward.
Evidence: local `artifacts/android-preview/android34-20261020/` and
`apk-verification-0.3.2-3.json`.

The private browser transport additionally downloaded the **actual signed APK**
through the real local API with sandbox OIDC authentication and verified its exact
bytes/checksum before saving. This is stronger than a synthetic small-file test,
but remains distinct from genuine-provider/live acceptance. Reproduce with
`node scripts/browser-private-install.mjs --release-directory=PREPARED_RELEASE_DIRECTORY`.
Default CI still uses clearly synthetic transport fixtures and privacy negatives.

[CI test-build PASS at 24933f4](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39305979825/job/118243053154)
includes the 80-test baseline, browser journeys and Docker build.
[Native security FAIL](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39305979825/job/118243053567)
is preserved with 15 high findings.

The existing Railway staging service received source `a9aa57d` plus the verified
0.3.2 APK via a tracked-source-only archive with the separate private artifact.
Deployment: `17d3cc6d-e062-4350-a11e-1c871331243c`.
The observed new egress `152.55.181.17` initially blocked database readiness.
The owner added the separately approved `152.55.181.17/32`; independent Atlas
inspection confirms it alongside the four existing entries. Liveness and
readiness now return 200 without another deployment or database reset.
The owner approved adding only `152.55.181.17/32` and publishing the installer
repair after restricted download verification. The connector's separate execution
confirmation did not complete, so it applied nothing. The owner completed the
entry directly. No broad allowlist or extra SSH access was created.

The [integrated Vercel preview](https://devcon-follow-iwk5ttsyx-mkveerendras-projects.vercel.app)
returned real `/client-config` JSON and anonymous `/v1/me` 401 JSON before the
staging redeployment; this is routing evidence, not Auth0 login from that preview.
Its exact preview callback is not added to Auth0. The
[approved installer-only preview](https://devcon-follow-hm5psxzs2-mkveerendras-projects.vercel.app/install.html)
keeps public registration disabled and replaces the broken Expo handoff with the
restricted staging installer. Production-domain publishing was conditional on successful restricted live
download verification; that condition subsequently passed as recorded below.
No public GitHub Release, public APK asset, production backend, Auth0 credential,
public enrollment or Proof of Audits change was made.

The owner explicitly confirmed the second tester and test venue are unavailable.
These and physical two-person GPS/BLE acceptance remain BLOCKED; independent
implementation and verification continued without invented real attendees or GPS.

## Genuine authenticated live APK delivery

The existing owner Auth0 session completed the installer authorization-code
return without entering credentials through the agent. The staging installer
loaded version 0.3.2/build 3 and its authenticated download saved
`~/Downloads/devcon-follow-0.3.2-3.apk` (99,356,328 bytes). An independent SHA-256
check of the browser-saved file matched
`c0f2ad88b875bacf46c619fef45933a613263245d57e220e378b2a96be3918ed`.
This proves genuine one-account restricted live binary delivery, not native
provider login or physical two-person acceptance. Browser download-event
observation timed out; the completed file and installer state were checked
directly instead. No bearer credentials were inspected or exported.

Current staging checks: liveness 200, readiness 200, release 503; anonymous
`/v1/me`, `/v1/releases/android` and `/v1/releases/android/apk` all return 401 JSON.
The release gate stays closed. Local evidence is in
`artifacts/staging/a9aa57d-delivery-health.json` and
`artifacts/install/live-private-download-20261020.png`.

## Approved website publication — PASS

After genuine restricted live APK delivery passed, the exact installer-only
output was staged as production deployment
`dpl_FKymmWXgjS7qnY5LdegqkayCDadC` in existing Devcon Follow project
`prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, scope `mkveerendras-projects`.
Staged URL: https://devcon-follow-84ay7xkrn-mkveerendras-projects.vercel.app .
The staged installer, JSON manifest and closed client configuration each passed
200/content checks before promotion of this same production build.

Published: https://devcon-follow.vercel.app/install.html . Anonymous checks confirm
200 installer HTML, 200 JSON `/native-release.json` with no public binary and the
correct restricted installer link, and 200 JSON `/client-config` with
`authReady=false`. Browser inspection confirms the active “Open private Android
testing” link. This publishes the approved installation handoff, not a public
APK, public registration, production backend or production-ready release.
Proof of Audits was untouched. Screenshot and machine-readable checks are in
`artifacts/install/published-installer-20261020.png` and
`artifacts/install/public-delivery-20261020.json`.
