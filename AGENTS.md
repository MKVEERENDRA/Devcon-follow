# Devcon Follow — Codex repository instructions

## Mission
Ship a real, robust, privacy-respecting conference attendee networking app based on this existing source tree. The product is NOT a social posting platform. Make the core attendee journey work end-to-end: install -> authenticate -> ticket/access status -> profile -> opt into a 30-minute discovery session -> find people -> arrange a meetup -> scan profile QR/follow/message -> keep connections after the conference.

## Read first
1. `README.md`
2. `WORK_HANDOFF.md` (older infrastructure facts may need live revalidation)
3. `docs/CORE_RELIABILITY_2026-10-18.md`
4. `docs/PRODUCT-SCOPE-AND-TICKET-VERIFICATION.md`
5. `docs/NATIVE_PROXIMITY.md`
6. `CODEX_MASTER_TASK.md`

## Non-negotiables
- Work in-place. Do NOT replace the project with a mock app, generic template, or a reimplementation unrelated to the existing code.
- Scope to Discover, Nearby, Meetups, Connections, Me. Posts, feeds, likes, reels, and other engagement features are OUT of scope. Remove dead links and unreachable legacy UI safely; review retention before deleting persisted data.
- Discovery is explicit opt-in, exactly 30 minutes, server-enforced, no automatic renewal. Foreground mobile operation only unless an explicitly documented, platform-compliant capability has been verified. Stop / expiry / logout / consent removal must revoke GPS sharing and all BLE tokens.
- Never claim Bluetooth provides exact metres or approximate map bearings. Handle GPS uncertainty. Show ONLY the user's own location and approved public venue/landmark positions unless another attendee explicitly consents to a short-lived one-to-one location request. Never expose raw attendee positions from global nearby search.
- Authentication must validate tokens against a real OIDC issuer and enforce subject identity server-side. Secrets never go into the git tree, URLs, logs, or browser bundle.
- A ticket number, screenshot, PDF, barcode/QR, wallet pass, NFT or email forwarding does not prove current valid Devcon ticket ownership alone. Do not redeem check-in QR codes. The current authorized ticket verification integration is absent; implement an organizer-approved verifier adapter and safe pending/review flow. Any alternate invitation-only community access must be explicitly identified as NOT official Devcon ticket verification, with separate authorization and badges. Do not falsify the verified flag.
- All attendee data is private by default. Protect against stalking, spam, enumeration, blocked user access, unauthorized admin routes, replay, and cross-account data leaks.
- Wi-Fi / mobile network is primarily for backend sync. Do not promise cross-platform Wi-Fi Direct discovery unless implemented and verified on real iOS and Android hardware. GPS fallback must work without BLE.
- Where a requirement needs missing credentials, organizer approval, app-store signing, or real phones, implement/configure/test everything possible, then record exact blocker and evidence. NEVER claim passing a build or real-device test that did not run.

## Stack & integration
- `web/`: React/Vite PWA; `src/`: Node 22+/Fastify/MongoDB/Socket.IO; `mobile/`: Expo/React Native with native Android Kotlin and iOS Swift BLE module; root Dockerfile deploys same-origin web+API to Railway.
- Preserve existing Atlas `Devcon Follow` project and the existing Railway `Devcon Follow` service; inspect current state before mutation and avoid duplicate projects/services.
- Prefer fixing current behavior to unnecessary new dependencies or frameworks. Use the lockfiles, `npm ci`, and current environment APIs. Run real integration tests with a disposable test database and independently signed-in users.
- Document every route/permission, build procedure, health check, runbook and recovery path. Add/repair automated CI and reproducible build steps.
- Use a nonproduction staging environment and test credentials for complete flows. Production stays fail-closed if privileged ticket verification or real authentication is missing.

## Definition of done
- Complete API and web builds, API integration tests, real 2-account journey and privacy negative tests, no known critical/high vulnerabilities.
- HTTPS app + API accessible, MongoDB read/write proven with proper indexes and restricted networking, production readiness endpoint passes.
- Installable Android preview APK and iOS TestFlight or device build; Bluetooth interactions tested and recorded on Android-Android, Android-iPhone, iPhone-iPhone phones, or explicitly reported as unverified/blocking.
- All critical flows documented with URLs, build IDs, deployment IDs, smoke-test evidence, and exact incomplete items. Distinguish beta/community launch from officially ticket-verified launch.

## Finish behavior
Codex should modify files and execute commands, not merely explain a plan. Keep commits small and clear; provide a final release checklist with PASS / FAIL / BLOCKED and links to actual artifacts. Ask a human only for irreducible credentials, organizer permission, store acceptance or physical-device sign-off.
