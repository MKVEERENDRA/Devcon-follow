# Devcon Follow — current handoff, 23 October 2026 (IST)

## Read this state first

Latest delivery: [Android 0.3.9 + Nearby role filter](docs/ANDROID_039_DELIVERY_2026-10-23.md). Full suite **122/122**, TypeScript, both exports and both complete browser-policy journeys pass. The journey now includes individual GPS approval → walking route → Stop revocation. Web layout/keyboard/200% label checks pass. The earlier source-only filter record is superseded by this live delivery evidence.

Current API image/source stays `d64037122be51337b2d96ef8cc18dd905a07c1f6`; no API code change was needed. Current published frontend includes `8f38204`, Vercel `dpl_5WtMNYHZMu63ZiYP3AijqDwKqo61`.
Signed native source: `8f8e1417e2d3265e46f0a515fc61d0150bcd7df0`.
Android **0.3.9/build 10**, EAS `ec01d175-d038-4010-9ae6-01a04cd7e087`, FINISHED.
APK SHA-256: `2e26f79f8a0a5f32aefb9d5963049008035cf60c3866db3e1c42c78b66774704`, 98,844,520 bytes.
Actual live owner download and local saved-file integrity PASS: `/home/vamshi/Downloads/devcon-follow-0.3.9-10.apk`. No new login was requested. Existing installer cohort stays restricted; no public APK release/security waiver was made.
Community venue enabled with a researched approximate public-plaza anchor `9a2d033b-e9ba-407e-b488-cc0b1551458d`, Dhirubhai Ambani Square south edge, 19.0652007/72.8674885, 141 m from venue center. Agree the exact pedestrian meeting spot in chat and follow venue access rules. This is owner/community approval, not organizer endorsement. `/health/ready` and `/health/release` now 200; release endpoint scope is service-configuration only. Physical-device behavior and the independent native security gate remain unresolved.

Fresh exact-source Android/iOS compilation PASS. SDK minimum 24, target 36; physical installation still unverified.

Historical 0.3.7 delivery passed: automatic and explicit saves match the exact SDK-verified size/SHA-256. The single large-response transfer failed late; source `6d6ae7c` fixed delivery with authenticated 4 MiB parts, bounded retries, release-bound If-Match and full final checksum validation. A browser regression aborts the second part and verifies only that part is retried. No new owner login was required.

The existing five-section application is implemented and sandbox tested. Prior baseline: 107/107; latest suite: 122/122, no failures/skips. Arrival directions now work before check-in; disabled/expired venues cannot keep the account UI marked on-site. Previous recommendations, privacy, calendar, notes, QR, mutual chat, 30-minute Stop/expiry and admin place-closure regressions remain covered. Three licensed real photographs are in the signed APK and published web welcome.

The current 0.3.8 real owner download also PASSES: installer integrity message, saved file size/SHA independently checked, 24 successful 206 parts and 24 CORS preflights. Existing SSO restored without another credential entry. Local saved APK: `/home/vamshi/Downloads/devcon-follow-0.3.8-9.apk`. No physical phone test is implied.

## Launch copy and venue draft

The owner requested a launch post, user instructions and Devcon venue setup. [Current launch copy and user guide](docs/LAUNCH_COPY_AND_USER_GUIDE_2026-10-23.md) distinguishes public web early access from restricted native delivery. The official-location venue was initially saved disabled; the owner then explicitly confirmed the community-app configuration and it is now **enabled**: `73500a03-2e72-40e9-a573-5f27935357ed`, Jio World Centre, published Plus Code center, proposed 250 m radius, official event interval 3 November 09:30 IST–6 November 17:00 IST. This is owner approval for an independent community geofence, not organizer endorsement or a confirmed meeting point. Live release checks now pass approvedVenue but still fail approvedLandmark; do not claim full release readiness. No social post was sent.

## Infrastructure — use existing resources

- Website / private installer: https://devcon-follow.vercel.app/install.html . Existing Vercel project `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, scope `mkveerendras-projects`, org `team_zQh42eOLP91cK4hK4MHjyLaP`.
- API: https://devcon-follow.35-206-98-214.sslip.io . Dedicated GCE VM `devcon-follow-api`, `us-central1-a`, in owner-authorized project `proof-of-audits-production`. Only this dedicated Devcon VM was changed. Existing POA services/resources/IAM/domains stay untouched.
- Reserved outbound IPv4 `35.206.98.214/32` is already allowed in Atlas. Do not repeat changing-IP allowlist work or create another database/VM.
- API image `devcon-follow:d640371`, image ID `sha256:6986b4430ab2fab1ee133732ff3bdb9daaadf3b6c72a58ddaf3f6cb406e1633b`. Previous image/unit and private env backup are `.pre-public-d640371`; restore the unit and matching env together if rolling back enrollment.
- Protected VM environment remains `/etc/devcon-follow/app.env`; never print it. Private 0.3.9 pair at `/opt/devcon-follow/private-release`; 0.3.8 rollback pair at `.038`; 0.3.7 pair at `.037`; prior 0.3.6 pair at `.036`, old service unit at `/etc/systemd/system/devcon-follow.service.pre037` for rollback. `/etc/systemd/system/devcon-follow.service.pre037parts` restores the prior a619b4a image with the same 0.3.7 APK pair.
- Atlas project `6ad3a66940fbb40c43d65f78`, cluster `DevconFollow`, database `devcon_follow_staging`. Owner accepted the extra `readAnyDatabase` role. Do not ask about or change that role again. Existing credentials are private files outside Git.
- Auth0 tenant `dev-xs1kh1yit6q5g3ph`, separate web/native public clients and real Google sign-in already configured. The existing owner browser SSO restored successfully; do not request repeated dashboard logins.
- Old Railway outage/login/redeploy instructions are superseded by GCE delivery. Do not touch Railway merely to recover old credentials.

## Access and remaining release work

The owner explicitly authorized anyone to join without an invitation/email cohort. This is now deployed as `COMMUNITY_REGISTRATION_MODE=public`; verified email is still required, revoked users stay revoked, and official ticket verification stays disconnected. Existing users are not automatically opted into pre-arrival profile discovery. Both `discoverable=true` and explicit new `eventDirectory=true` are required. The normal venue directory and all Nearby/GPS/BLE contracts remain venue-scoped.

The live public-account policy is separate from the signed security-blocked native candidate. `/v1/releases/android*` still checks its tester emails (explicit `ANDROID_PREVIEW_EMAILS` or the retained old `COMMUNITY_PILOT_EMAILS`), even when web enrollment is public. Do not broaden native distribution accidentally by treating enrollment as a security waiver. The owner session opened the real new pre-arrival web UI without another login; no real profile visibility was changed. No real venue, landmark, attendee or location was invented. `/v1/event` supplies organizer-published dates/address for directions, not a presence grant or geofence. `/health/release` now passes service configuration after the owner-approved venue and researched community public-area anchor; it remains independent of account creation, native audit and device acceptance.

Native audit still fails on two upstream advisories (15 propagated high package findings), with no published patched braces/node-forge versions. Keep the audit gate visible. Exact signed bundle correlation shows neither implementation in its JavaScript inventory; this does not repair or certify build tooling/native libraries. Physical two-person GPS/BLE/QR/push acceptance remains unverified; the owner said the second tester and test venue were unavailable. No Apple Developer membership exists, so native iPhone distribution remains blocked. Do not invent approval or passing device tests.

The owner wants autonomous implementation and delivery, with minimal spend. Existing private-cohort website/API/APK delivery is authorized. The explicit public-enrollment instruction has been applied. It is not a fabricated native security-risk waiver; keep the independent native gate visible. Credits are shared with POA; the approximate $5/month credit target is not a hard billing cap. No paid upgrades or duplicate infrastructure were purchased.

## Fresh continuous journey

[End-to-end verification](docs/END_TO_END_2026-10-23.md) passes public signup → pre-arrival directory → explicit check-in/Nearby → meetup/reschedule → QR follow → private notes/chat → Stop → departure → retained connection/chat, using two separate browser identities and disposable MongoDB. Fresh Android and iOS simulator CI compilation both PASS for `d640371`. Physical phones remain unverified.

## Working rules

Work in place; use AGENTS.md. Keep the five sections and privacy contracts. Use Node 24, lockfiles, disposable MongoDB and the independent sandbox OIDC issuer for tests. Do not fabricate real users, venue coordinates or organizer verification. Finish source, build and local verification before asking for irreducible human input.

Older status and instructions are preserved only as [historical snapshots](docs/history/HANDOFF_BEFORE_2026-10-23.md); they are not current execution instructions.

## Owner venue confirmation — 23 October 2026

Venue `73500a03-2e72-40e9-a573-5f27935357ed` enabled following explicit owner confirmation. Database records approval scope `independent-community-app-owner` and `organizerEndorsement=false`; audit action `venue_enabled_owner_approval`. Existing center/radius and event interval unchanged. No landmark invented; no attendee presence or location created. Exact-source native CI for `af542c5` completed successfully for Android and iOS simulator: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39955502608 . CI test-build passed; native-security remains failed.

Latest Android activation retained exact 0.3.8 rollback pair at `/opt/devcon-follow/private-release.038`. Only APK/metadata and community place configuration changed on the VM; no new image, DB credentials, Auth0 configuration, network policy, paid plan or POA resource change. Container COPY fix `6307665` passes CI test-build; native compile for signed source `8f8e141` passes Android/iOS. No public native release was inferred from urgency.
