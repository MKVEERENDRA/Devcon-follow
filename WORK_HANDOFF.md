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
