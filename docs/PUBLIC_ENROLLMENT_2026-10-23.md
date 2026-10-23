# Public community enrollment and pre-arrival discovery — 23 October 2026 (IST)

## Delivered behavior

The owner's explicit request to let everyone join replaces the earlier pilot-only policy. The existing [web app](https://devcon-follow.vercel.app/) now uses `COMMUNITY_REGISTRATION_MODE=public`, with registration and community self-service enabled. Any genuine verified-email OIDC identity can enroll without a ticket or invitation. Revoked membership remains revoked. Authentication, blocks, private notes, mutual-message authorization, rate limits and location consent are preserved. No official ticket badge or event admission is granted.

Off-site Discover now loads `GET /v1/directory?scope=event` instead of stopping at the venue gate. A new **Include me in the event directory** preference explicitly opts a discoverable profile into viewing before/after arrival. The flag defaults false, including for existing profiles; turning discoverability off clears it server-side. Only eligible, unblocked, explicitly opted-in profiles appear. Private/legacy profiles remain absent. Profile reads and explicit follows use that same consent boundary; saved connections retain their existing off-site behavior. Nearby and the default venue directory still require real on-site check-in.

The web and native editor/directory implementations have parity in source. Off-site meetup/location actions are disabled with a clear explanation. Meeting acceptance never creates an exact-GPS grant. Public address directions are available through `GET /v1/event` even before a geofence is configured. [Organizer travel information](https://devcon.org/en/travel-guide/) establishes the venue address and 3–6 November dates; this endpoint does not invent hall boundaries, daily access hours, public meeting landmarks or a check-in grant.

Native candidate distribution is a separate permission from public web accounts. `ANDROID_PREVIEW_EMAILS` (fallback: retained pilot emails) still limits `/v1/releases/android*` while native security is unresolved. Public signup does not silently publish a security-blocked binary. The installer offers a web-app link and no longer incorrectly says that all community enrollment is invitation-only.

## Source and deployments

- Source: `d64037122be51337b2d96ef8cc18dd905a07c1f6`, pushed to `MKVEERENDRA/Devcon-follow:main`.
- Dedicated existing GCE API image: `devcon-follow:d640371`, SHA `6986b4430ab2fab1ee133732ff3bdb9daaadf3b6c72a58ddaf3f6cb406e1633b`.
- API: https://devcon-follow.35-206-98-214.sslip.io . Existing Atlas database, credentials, reserved IP, roles, Auth0 settings and Proof of Audits services unchanged.
- Vercel: existing project `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, org `team_zQh42eOLP91cK4hK4MHjyLaP`, scope `mkveerendras-projects`.
- Deployment `dpl_CYZ2MAmJ1y6gPBCZfGaGgeo3Du8V`, https://devcon-follow-e7omkdey1-mkveerendras-projects.vercel.app ; protected staged HTML/API checks passed before promotion to https://devcon-follow.vercel.app . Published main JS `main-ofUdNVPb.js` matches the local tested build.
- Android source prepared as 0.3.8/build 9. [EAS build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/325db82c-9c34-4edf-996c-7d59f362f35a) finished without buying an upgrade. The 0.3.8/build 9 artifact is now SDK-verified and available to the existing tester cohort; the real owner download passed. See [current delivery evidence](ANDROID_038_DELIVERY_2026-10-23.md).

The API restart briefly returned 502 during initialization. It recovered; public and loopback readiness both returned 200, container running, no OOM. This was not a zero-downtime deployment. Read-only inspection confirms enrollment is public. The existing real owner browser session opened the new live off-site Discover UI without another login. No real attendee profile visibility, location, meetups or messages were modified for testing. Screenshot: `artifacts/public-enrollment/live-prearrival.png`.

## Verification

| Check | Result |
| --- | --- |
| Full local backend suite | PASS — 107/107, zero failures/skips |
| Syntax / Vite production build / native TypeScript | PASS |
| API and web dependency audits | PASS — zero findings |
| New event-directory integration tests | PASS — any verified identity joins, no ticket/invite, explicit consent and hiding, block/revocation, no GPS/presence side effects, viewer/filter-bound cursor, private legacy profiles absent |
| New off-site browser journey | PASS — real sandbox PKCE, profile opt-in/revocation, search/profile/follow/retained connection, directions, no GPS, disabled off-site meetup action, axe and 200% reflow |
| Two-browser existing and public-community journeys | PASS — profiles, venue check-in, 30-minute sharing, recommendation filters, accepted/rescheduled meetup/calendar, QR-link explicit follows, private notes, mutual chat, Stop and saved connections |
| Browser parity and reliability | PASS — token-refresh draft preservation, photos/social links, role filters/pagination, keyboard, five-screen axe, narrow/large text, permission denial/offline Stop/recovery |
| Arrival / installer / private APK transport browser checks | PASS — directions without presence; manifest/failure/layout checks; interrupted byte-part recovery/checksum/tamper/session tests with synthetic bytes |
| Expo Doctor / Android+iOS Hermes exports | PASS — 20/20 diagnostics; both exports |
| Exported JavaScript advisory inventory | Neither braces nor node-forge implementation present in 1,089 Android / 1,088 iOS map sources; exported-JS scope only, not 0.3.8 signed APK or native-library proof |
| Live service | PASS — HTTPS/database readiness 200; new UI visibly opens; unauthenticated attendee routes remain 401 |
| Service release readiness | BLOCKED — 503, approvedVenue/approvedLandmark false; auth/access/admin true |
| Native security gate | FAIL — 15 high propagated findings from two upstream roots |
| Fresh CI | [Test/build run](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39846854670): test-build PASS, native-security FAIL. [Native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39846854577): Android and iOS simulator compilation both PASS |

Local raw logs and screenshots: `artifacts/public-enrollment/`; full unit/build logs remain outside Git. Tests use disposable MongoDB and independent sandbox identities/geometry, not Atlas attendee data. No new real multi-account/provider/hardware acceptance was performed.

## Exact incomplete items

1. Native 0.3.8 completion, SDK verification and tester delivery are DONE; physical phone installation/runtime acceptance remains unverified. Existing 0.3.7 is preserved only as rollback.
2. An actual reviewed discovery boundary/window and public meeting landmarks. Published address directions do not satisfy geofencing or indoor landmark configuration. Do not insert synthetic geometry just to make release health green.
3. Physical two-person GPS/BLE/QR/camera/push acceptance. The owner previously reported the consenting tester/venue unavailable. iPhone distribution additionally lacks Apple membership/signing.
4. Supported native dependency remediation. Fresh registry/advisory checks still show latest braces 3.0.3, node-forge 1.4.0 and Expo 58.0.17. Both [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) list no patched release. The high audit remains visible; no audit suppression, fake fixed version or invented risk acceptance was applied.
5. Final operator/privacy/support information and independent real new-account phone acceptance. Existing owner SSO is evidence for that identity only. Google Testing status alone does not prove basic OpenID/email/profile login is blocked; the earlier reviewed basic-scope exception remains documented in `deploy/auth0/review-2026-10-20.json`.

## Recovery

On the dedicated VM, `/etc/systemd/system/devcon-follow.service.pre-public-d640371` and `/etc/devcon-follow/app.env.pre-public-d640371` preserve the previous image and pilot policy. Restore both together, daemon-reload and restart if rollback is necessary. Existing 0.3.7 private APK pair is unchanged. Previous Vercel deployment remains available for rollback; do not change POA projects/domains. No secret belongs in rollback commands pasted into chat or Git.

[Subsequent continuous two-account verification, including retained chat after departure](END_TO_END_2026-10-23.md).
