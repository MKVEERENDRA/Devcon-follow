# Devcon Follow — current handoff, 23 October 2026 (IST)

## Read this state first

Current API/web source: `6d6ae7cfc63c0a7dcd1db400105659f88f0a5e8b`.
Signed native source: `3bd19225f24d275b80b32774104d2e0c5cedb154`.
Android 0.3.7/build 8: EAS `6acaaa7c-da0b-4d37-a3be-4b6c8ddcebc7`.
APK SHA-256: `3e39b62e5f190a34eb8d4ffd834bbec52f1dca178b60e92aaf8c6b1b81c92317`.
[Current delivery evidence](docs/ANDROID_037_DELIVERY_2026-10-23.md).

The real owner browser download of 0.3.7 now passes: automatic and explicit saves match the exact SDK-verified size/SHA-256. The single large-response transfer failed late; source `6d6ae7c` fixed delivery with authenticated 4 MiB parts, bounded retries, release-bound If-Match and full final checksum validation. A browser regression aborts the second part and verifies only that part is retried. No new owner login was required.

The existing five-section application is implemented and sandbox tested. Local suite: 104/104, no failures/skips. Arrival directions now work before check-in; disabled/expired venues cannot keep the account UI marked on-site. Previous recommendations, privacy, calendar, notes, QR, mutual chat, 30-minute Stop/expiry and admin place-closure regressions remain covered. Three licensed real photographs are in the signed APK and published web welcome.

## Infrastructure — use existing resources

- Website / private installer: https://devcon-follow.vercel.app/install.html . Existing Vercel project `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, scope `mkveerendras-projects`, org `team_zQh42eOLP91cK4hK4MHjyLaP`.
- API: https://devcon-follow.35-206-98-214.sslip.io . Dedicated GCE VM `devcon-follow-api`, `us-central1-a`, in owner-authorized project `proof-of-audits-production`. Only this dedicated Devcon VM was changed. Existing POA services/resources/IAM/domains stay untouched.
- Reserved outbound IPv4 `35.206.98.214/32` is already allowed in Atlas. Do not repeat changing-IP allowlist work or create another database/VM.
- API image `devcon-follow:6d6ae7c`, image ID `sha256:61f4bbbdefd41d3f7a71eb90c0cf33f5862c3e46c153629cb13144b7baac8c91`.
- Protected VM environment remains `/etc/devcon-follow/app.env`; never print it. Private APK pair at `/opt/devcon-follow/private-release`; prior 0.3.6 pair at `.036`, old service unit at `/etc/systemd/system/devcon-follow.service.pre037` for rollback. `/etc/systemd/system/devcon-follow.service.pre037parts` restores the prior a619b4a image with the same 0.3.7 APK pair.
- Atlas project `6ad3a66940fbb40c43d65f78`, cluster `DevconFollow`, database `devcon_follow_staging`. Owner accepted the extra `readAnyDatabase` role. Do not ask about or change that role again. Existing credentials are private files outside Git.
- Auth0 tenant `dev-xs1kh1yit6q5g3ph`, separate web/native public clients and real Google sign-in already configured. The existing owner browser SSO restored successfully; do not request repeated dashboard logins.
- Old Railway outage/login/redeploy instructions are superseded by GCE delivery. Do not touch Railway merely to recover old credentials.

## Access and remaining release work

The verified owner-email pilot is enabled for `veer@proofofaudits.com`. Broad public registration is not enabled. Official ticket verification remains disconnected. No real attendee or event location was invented. No approved venue/landmark exists yet; `/health/release` correctly fails those configuration checks. `/health/ready` tests database/service readiness, not complete release approval.

Native audit still fails on two upstream advisories (15 propagated high package findings), with no published patched braces/node-forge versions. Keep the audit gate visible. Exact signed bundle correlation shows neither implementation in its JavaScript inventory; this does not repair or certify build tooling/native libraries. Physical two-person GPS/BLE/QR/push acceptance remains unverified; the owner said the second tester and test venue were unavailable. No Apple Developer membership exists, so native iPhone distribution remains blocked. Do not invent approval or passing device tests.

The owner wants autonomous implementation and delivery, with minimal spend. Existing private-cohort website/API/APK delivery is authorized. Do not open public enrollment by treating a generic “continue” as an exact security-risk decision. Credits are shared with POA; the approximate $5/month credit target is not a hard billing cap. No paid upgrades or duplicate infrastructure were purchased.

## Working rules

Work in place; use AGENTS.md. Keep the five sections and privacy contracts. Use Node 24, lockfiles, disposable MongoDB and the independent sandbox OIDC issuer for tests. Do not fabricate real users, venue coordinates or organizer verification. Finish source, build and local verification before asking for irreducible human input.

Older status and instructions are preserved only as [historical snapshots](docs/history/HANDOFF_BEFORE_2026-10-23.md); they are not current execution instructions.
