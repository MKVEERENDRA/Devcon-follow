> Public-user preparation: owner Google console showed Testing with incomplete Branding. Saved only the existing app homepage and branding domain; no credentials/scopes/audience publication changed. Public privacy page is still an engineering draft. Asked for public operator name and privacy/support contact; do not invent them or request another login. A further upload remained blocked by the Railway platform incident. Readiness 200; release 503 for missing admin/approved venue/landmark. See updated 0.3.4 report and public-only Auth0 review JSON.

> Latest deployment attempt: Railway rejected the isolated 0.3.4/5 upload with **Deploys have been paused temporarily**. Official platform incident https://status.railway.com/incident/QH8L8B3E confirms builds paused in all regions. No new deployment; staging remains `f65929a7` and readiness 200. Installer still serves 0.3.3/4. Resume the prepared targeted upload after recovery; no login/account reset is needed. See [candidate report](docs/ANDROID_034_CANDIDATE_2026-10-21.md).

> Latest signed candidate: **0.3.4/build 5**, source `e3d2b41`, EAS `d3c56bee-bbce-4f0e-9b55-36a4d322014d` FINISHED. SDK signature/package checks, same-build bundle correlation and actual-byte sandbox download PASS. Android/iOS compilation and full test/build CI PASS. Native audit remains FAIL. New APK is local only; live private installer still serves 0.3.3/4. No production rollout occurred. See [candidate report](docs/ANDROID_034_CANDIDATE_2026-10-21.md).

> Latest source: `8014714` fixes native foreground renewal losing sessions on transient outages. **89/89 tests**, two-account sandbox browser journey, native types and Android/iOS exports PASS. New CI/native compilation runs are pending; do not reuse an old compile result as this source’s result. Existing APK 0.3.3/4 does not contain the fix. See [core-flow verification](docs/CORE_FLOW_VERIFICATION_2026-10-21.md).

> 21 October: owner reports Google OAuth credentials configured in Auth0 and **Try Connection successful**. Do not request another provider/dashboard login or repeat client creation. This is an owner-reported provider test, not independent Android app login acceptance. Google project `devcon-follow-2026` exists; no billing authorized. Earlier account/profile-access notes below are historical. See `deploy/auth0/review-2026-10-20.json`. Production/public enrollment remains held for an exact candidate and release approval.

> Latest Auth0 access: the correct tenant is signed in in **Chrome** (browser 3), not the separate in-app browser. Use that existing authorized session; expired MCP authorization is not a reason to repeat dashboard login. Existing web/native settings were reviewed read-only; Google development keys still need owner credentials. The owner specified a different Google Cloud account; the earlier other-account 2SV block is superseded. The owner reported Google sign-in complete. Only the other Google account is visible in the connected Chrome profile; connect/share the already signed-in owner profile/tab, rather than requesting another login. See [live public configuration review](deploy/auth0/review-2026-10-20.json).

> Auth0 management diagnosis: global Codex MCP is already configured; the stored management access token expired 19 October and has no refresh token. Repeating dashboard login does not renew that MCP credential. The owner has objected to repeated login requests; do not ask the same generic dashboard-login question again. App SSO works independently. See the latest section of [0.3.3 delivery](docs/ANDROID_033_DELIVERY_2026-10-20.md).

> Latest continuation: read [Android 0.3.3 delivery](docs/ANDROID_033_DELIVERY_2026-10-20.md) first. The current execution brief authorizes existing staging source/APK delivery, superseding historical deployment freezes below. Production, public enrollment and broad APK distribution remain unapproved. Preserve exact pending network authorization and real-device limits; do not repeat completed builds.

> Current continuation (20 October): read [production delivery](docs/PRODUCTION_DELIVERY_2026-10-20.md) and [verified installer delivery](docs/INSTALLER_DELIVERY_2026-10-20.md) first. The owner authorized production preparation, source changes and local verification, with a consolidated approval required before public release. Historical blanket freezes below are dated history, not current authorization. No production rollout or public APK has been approved.

> Continue from code `891afe0`. Current source has 70 passing tests and Android/iOS compilation; native-security remains red. Live accounts, infrastructure, public registration, deployment and pilot execution remain prohibited. [Current flow report](docs/END_TO_END_PRODUCT_REPORT_2026-10-19.md) is authoritative over historical infrastructure instructions below.

> Current attendee-flow continuation: [`891afe0`](https://github.com/MKVEERENDRA/Devcon-follow/commit/891afe0), including [`e212605`](https://github.com/MKVEERENDRA/Devcon-follow/commit/e212605), adds durable meeting updates, conflict/retry protection and cancel/reproposal. [Five-section end-to-end report](docs/END_TO_END_PRODUCT_REPORT_2026-10-19.md): **70/70 local tests**, three sandbox browser journeys; real device/push acceptance and deployments remain blocked/frozen.

> Latest source continuation: [`791c906`](https://github.com/MKVEERENDRA/Devcon-follow/commit/791c906) and [`38eb754`](https://github.com/MKVEERENDRA/Devcon-follow/commit/38eb754) adds secure paginated discovery, refresh-safe private notes, native editing/QR parity and accessibility coverage. [Current evidence](docs/DIRECTORY_PARITY_EVIDENCE_2026-10-19.md) supersedes earlier counts: **67/67 local tests**, three sandbox browser journeys. Live testing and deployment remain prohibited.

> Latest continuation: source fixes `b48b3fd` and `c1f7d3e` are on main. [V1 reliability evidence](docs/V1_RELIABILITY_EVIDENCE_2026-10-19.md) supersedes older test counts and lists parity/security limits. The explicit freeze on live account/data access, infrastructure changes and deployment remains in force.

> Current status (19 October): staging database readiness recovered; one real pending Auth0 identity was validated before the owner stopped live testing. New product changes are local source, not a deployment. See [current build report](docs/PRODUCT_BUILD_2026-10-19.md) and [restricted networking](docs/RESTRICTED_NETWORKING.md). Older entries below are historical, not instructions to repeat completed setup.

# Devcon Follow — Work mode engineering handoff (2026-10-17)

## Mission
Build, test, and launch a real Devcon Mumbai 2026 attendee networking product, not a fake demo. The attached repository is the current source of truth. Inspect the actual files before changing anything. Do not throw away working code or regenerate the frontend from a generic template. Preserve MongoDB and Railway work already completed.

## Already provisioned in connected accounts
- MongoDB Atlas organization contains a dedicated project: `Devcon Follow`, project ID `6ad3a66940fbb40c43d65f78`.
- Atlas cluster: `DevconFollow` on AWS `AP_SOUTH_1` (Mumbai), free tier.
- Database `devcon_follow` has 12 empty collections, including profiles, tickets, presence, locations, shares, requests, follows, venues, blocks, reports, audit, peerTokens.
- MongoDB user `devcon_follow_api` has database-scoped `readWrite`; its secret is **already staged** as encrypted Railway variable `MONGODB_URI` and must never be pasted into chat, version control or client JavaScript.
- Railway project `Devcon Follow` ID `2bc6b37c-697d-4077-a23b-503ee588d595`, `production` env ID `0f293625-f62e-461d-a2e0-59b9e5124f26`.
- Railway service `devcon-follow-api` ID `a9000893-59e1-48d7-8c0e-bf0b9a1c6c88` **exists only as STAGED**, with environment variables and DB secret, but NO code source or running instance. Do not deploy it until a valid source and its required secrets are configured.
- Atlas IP allowlist currently empty. Configure secure Railway→Atlas access. Avoid unrestricted global IP access without explicit informed user approval.
- Original Atlas indexes were created through MCP without uniqueness or TTL options. The revised `src/indexes.js` safely repairs mismatched indexes only for empty collections. Run initial bootstrap against Atlas and verify **unique, TTL, geo** indexes. Do not silently mutate indexes on populated collections.

## Current source and tests
- Source: `web/` React Vite PWA, `src/` Fastify/Socket.IO/MongoDB API, `Dockerfile`, tests, docs, and `mobile/` specs.
- 23/23 dependency-free Node tests pass. JS syntax and JSX parse pass. React Vite production build was NOT run because registry.npmjs.org could not be resolved in chat container.
- No official ticket-verification API connected. Login provider not connected. No approved venue record configured. No real cross-platform native Bluetooth/Wi-Fi transport exists; backend ephemeral peer token protocol only.
- Never describe staging or source files as a live, production-ready system.

## Priority order — continue autonomously
1. Unpack the attached ZIP; inspect all files, tests and docs. Create a writable private GitHub repository under the user account using connected GitHub/browser Work tool, preserving full source tree. Commit source (exclude all `.env`, tokens, user data).
2. Run npm ci/install with available network, npm tests, full Vite production build, backend integration tests, then Docker build. Fix failures with minimal changes.
3. Configure OIDC sign-in using an actual trusted issuer (e.g. Auth0/Clerk) after obtaining required connection/approval. Enforce validated JWTs server-side and passkey/PKCE where applicable; never substitute a self-declared user ID.
4. Obtain **official organizer-authorized, READ-ONLY ticket ownership verification**, or keep sign-up blocked and explicitly label this blocker. An uploaded photo/QR must never become verified without authentic ownership verification; never redeem Pretix check-ins.
5. Configure verified venues and time windows; require GPS accuracy and fresh presence; test false GPS/spoof handling. No invented location data.
6. Integrate deployment source into the EXISTING staged Railway service. Ensure database auth, network access, migrations, health endpoints, HTTPS domain, rotation of secrets, logs, alerts, backup choices, rate limiting, CORS and CSP. Before activating live deployment, ensure external actions/approvals are allowed in Work.
7. Test all website flows using cloud browser/real API: mobile install, signup, ticket, profile, filtering, public QR generation, scan, following, requests, approval, timers, location revocation, blocking, account deletion. Do not claim full E2E until tested.
8. Build native Android/iPhone applications (React Native with dedicated native modules as needed) and test BLE/Wi-Fi via compatible Android/iPhone physical devices. Do not represent iPhone Safari PWA as capable of BLE discovery. Require ephemeral rotating tokens and consent. Check app distribution requirements and request developer account actions when unavoidable.
9. Produce a release report: code URL, tested web URL, API URL, evidence/logs, blocking dependencies, feature matrix, privacy/security notes, and real install instructions.

## Product constraints
Devcon Mumbai and permitted side events only; searchable verified profile can remain visible even with location OFF; location and navigation only for explicitly opted-in durations and scopes; recipient-specific exact coordinates only after approval; no movement history; no public ticket QR; no fake verification or live status; do not claim that radio RSSI is an exact distance. Retain connections after event, disable venue-based discovery outside events.

## Required behavior
Do the work in Work mode using cloud browser, computer and available connectors. Avoid additional planning-only responses. Ask the user only for necessary human approvals, billing, identities, missing organizer access or native signing requirements. Never paste account secrets in chat. Stay within documented API and terms. Do not deploy a misleading public demo with fake verified attendees.
