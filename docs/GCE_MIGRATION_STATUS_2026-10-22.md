> **Current, 23 October (IST):** [Android 0.3.7 and arrival/check-in delivery](ANDROID_037_DELIVERY_2026-10-23.md). Signed APK, exact photograph/bundle checks, 104 passing local tests and test/build CI. Older versions and pending build states below are historical; native security/public release remain blocked.

> Latest product source/API/website: [Android 0.3.6 candidate and comparison-driven improvements](ANDROID_036_CANDIDATE_2026-10-22.md). This file records the earlier 0.3.5 migration/delivery evidence.

# Devcon Follow delivery — 22 October 2026

The new API and database are healthy, and the existing public website now routes to
this API. Sign-in is enabled for the approved verified-email owner cohort. This
supersedes the earlier credential-blocked/502 migration notes. It is a restricted
community beta, not public production acceptance.

## Delivered

- API: https://devcon-follow.35-206-98-214.sslip.io . TLS verification and
  `/health/ready` pass (200); unauthenticated `/v1/me` and private APK routes return
  401. This provisional third-party DNS name is not an owned production hostname.
- Website/installer: https://devcon-follow.vercel.app/install.html . Existing
  project `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, team
  `team_zQh42eOLP91cK4hK4MHjyLaP`. Staged deployment
  `dpl_J73TdLiLFG9yMFLgDfxxE5piVR3h` passed API routing checks and was promoted.
  URL: https://devcon-follow-odkawfftp-mkveerendras-projects.vercel.app .
  Website source: `db408b13de32c14bde2501e7f302b5b3f51b2c45`.
- Standalone Android **0.3.5/build 6**, source
  `b669585647c05ae2619238aa77b33c0dc6f08356`, EAS build
  `96f487ef-3dd6-48a8-bfcf-b0e7ae2d972a` FINISHED. Its signed 99,364,984-byte APK
  was uploaded to the VM's private release directory, outside the public web root.
  The installer uses authenticated download, length/type checks and SHA-256 before
  saving. This replaces the old Railway-linked candidate, not the signing identity.
- APK SHA-256: `35b61e08a6d4df1dff2a9cb9361aaeaa636009263e85a3b3bb5078a207736dd9`.
  Signing certificate SHA-256:
  `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
  SDK verifier confirms package, version, non-debuggable, standalone bundle,
  expected new API address, no old Railway API base, and existing app-link signer.
- Installer now presents sign-in/download, removes the stale Railway link, gives
  iPhone users an actual web-app link, and handles connection retry. It retains
  accurate beta/security/device disclosures. No public APK URL or fake release
  metadata was published.

The first live binary request through the Vercel external rewrite timed out.
The subsequent fix uses the configured trusted HTTPS API origin directly for APK
bytes, retaining bearer-header authentication, CORS allowlisting, bounded size,
checksum verification and cancellation. A progress bar reports received bytes;
credentials never enter a download URL. Dedicated-origin synthetic transport and
actual-file localhost streaming both pass. After publication, the genuine existing owner SSO session successfully downloaded
0.3.5/6 directly through the canonical installer. Browser length/SHA-256 validation
passed, the verified blob save completed, and independent filesystem SHA-256
matched the SDK-verified APK exactly. This is genuine web sign-in and live download
evidence, not Android installation or a physical two-person test.

Administrator access is now bound to the single active server-verified subject in
the explicitly approved owner-email cohort. This used existing authenticated
membership evidence, not a self-declared profile email. No subject/token was
published. A restart confirms the administrator release check is now true.

## Restricted infrastructure

Owner authorized the separate Devcon VM inside `proof-of-audits-production`, with a
$5/month credit target. This is not an enforced spending cap or a zero-cost promise.
Existing Proof of Audits resources, IAM, domains and services were not modified.

VM `devcon-follow-api`, `us-central1-a`, `e2-micro`, Ubuntu 24.04, standard 30 GB disk;
reserved Standard-tier outbound IPv4 **35.206.98.214**; dedicated VPC/subnet. No VM
service account/API scopes. Secure boot enabled. Only 80/443 public; SSH limited to
the operator /32 and authenticated IAP range. The existing IAP API was already on;
no IAM grants were added. Caddy proxies loopback 8080, and root/installer URLs
redirect to the canonical Vercel site, preserving existing Auth0 callbacks.

Docker image `devcon-follow:b669585` runs as node through systemd with a read-only
filesystem, dropped capabilities, bounded CPU/memory/logs and a read-only private
APK mount. Service restart/readiness were verified. Credentials remain in a root
0600 VM file and protected local operator files, outside Git and frontend assets.

Existing Atlas project `6ad3a66940fbb40c43d65f78`, cluster `DevconFollow`, database
`devcon_follow_staging` are preserved. Owner added only `35.206.98.214/32` while
preserving existing entries. Reserved egress removes the repeated ephemeral IP
allowlist issue; it does not prevent every possible provider/database outage.

The dedicated user `devcon_follow_gce_staging` is restricted to `DevconFollow` with
`readWrite` on this database plus `readAnyDatabase` on admin. The owner explicitly
accepted that extra read role and declined further cleanup. Startup permits that
specific exception via `ALLOW_DATABASE_READ_ANY=true`, while still rejecting
administrator/cross-database write roles. Do not repeat the role-cleanup question.
A previously exposed credential was replaced in the protected URI file; it is not
used in Git, logs or this document. Existing users were not reset.

## Verification

| Check | Result |
| --- | --- |
| Local complete API/integration tests | PASS: 96/96, zero failures/skips |
| Syntax and Vite production build | PASS |
| SDK 58 dependency check / Expo Doctor | PASS: 20/20 |
| Android/iOS Hermes export and native TypeScript | PASS |
| Exact APK source Android + iOS compilation | PASS: [native CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39767961293) |
| Exact APK source full CI | test-build PASS; native-security FAIL: [CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39767961316) |
| Two independent sandbox PKCE identities, profiles, GPS opt-in, meetup, explicit QR follow, mutual chat, stop and persisted connection | PASS; synthetic/disposable environment only |
| Actual signed 0.3.5 APK bytes via authenticated sandbox installer, checksum/save fallback, accessibility/large text | PASS; not genuine-provider or physical-phone acceptance |
| Installer connection failures, retry, release metadata gating, 320/390/1280 widths, 200% text, axe | PASS |
| Same-EAS-build bundle/source-map correlation | PASS: 1,068 sources; neither known affected npm implementation in embedded JS |
| New HTTPS API and canonical site database readiness | PASS: 200 |
| Genuine existing-owner SSO, live private metadata and direct APK download through canonical installer | PASS; 99,364,984 bytes and exact SHA-256 independently matched |
| Public release endpoint | BLOCKED: 503; missing approved venue and landmark; administrator passes |

Package and inventory records are in `docs/releases/android-035-*.json`. Source-map
absence is not proof that tooling/native code is safe and does not override audit.
Installer UI CI at `547fc62`: test-build PASS / native-security FAIL: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39770075701 . Direct-download source `db408b1` also has test-build PASS / native-security FAIL: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39771485594 .

## Remaining release work

1. Native audit remains failing: 15 high findings, zero critical, rooted in
   [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and
   [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Both authoritative
   advisories still list no patched version at this check. Braces is a nested
   pattern stack-exhaustion path in build tooling; forge is malformed RSA signature
   verification in certificate tooling. Build inputs remain trusted and dev-server
   exposure is not enabled. The SDK signature check uses Android's verifier.
   Consult the existing security review for exploit-path limits. No force-fix,
   invented patch, suppressed gate or unapproved risk exception was applied.
2. Configure an approved venue boundary, event window and public meeting landmarks. No owner-approved
   physical test venue or second consenting account is available. Do not invent
   these, copy an arbitrary map point, or falsify `/health/release`.
3. Native new-APK login/installation, two-person GPS and Android/iPhone BLE remain
   unverified. Apple Developer membership/signing is unavailable. All five feature
   flows have local/sandbox evidence, not a claim of physical-device acceptance.
4. Public privacy/operator information and owned API domain need final review.
   Startup-credit identity verification is an owner-only task; shared free quotas
   and residual charges remain account-wide.

Official ticket verification stays disabled. Pilot membership is clearly separate
from Devcon admission. Nearby exposes role/profile and uncertainty-aware distance
bands for consenting eligible participants in the same venue, not global GPS pins.
Exact recipient-specific sharing/directions require approval and expire; BLE does
not provide exact metres or map bearings. Stop/logout/expiry revoke discovery.

## Recovery

Use the dedicated IAP tunnel and VM key; never grant project-wide IAM as a shortcut.
Inspect `systemctl status devcon-follow`, Docker health and Caddy configuration.
Keep the protected env file out of logs. Restart via `systemctl restart
 devcon-follow` after configuration/artifact changes; check readiness and 401
negative checks. Do not rebuild or recreate Atlas to recover an API process.
The container image is pinned in `deploy/gce/devcon-follow.service`; record the
exact source/image before any future upgrade. APK byte changes require a matching
SDK verification record and metadata, not a renamed Expo link.
