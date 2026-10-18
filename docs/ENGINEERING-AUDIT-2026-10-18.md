# Devcon Follow — implementation audit and targeted fixes

This is a **source-level engineering correction**, NOT a production deployment or physical-device acceptance test.

## Existing social functionality

- Web profile: display name, handle, role tags, bio, avatar, interests, socials, discoverability.
- Web / API: public profile social QR, on-site follow/unfollow, persistent connections off-site, basic Socket.IO follow and location-request notifications, block/report.
- New in this patch: native client now loads persistent connections, offers Follow actions beside BLE sightings/directory results, displays a Connections tab, and provides Unfollow. Editing a basic profile from the native app no longer accidentally clears interests, social links or avatar.
- NOT IMPLEMENTED: native direct messages, message inbox, public posts, feed, push notifications, mutual-match suggestions, fully offline device-to-device messaging. Do not present this as a full general social network.

## Distance and radios

- GPS position is sent only from an eligible verified consenting attendee, inside approved event geofences, on short-lived foreground freshness checks.
- Backend Haversine distance is returned as **coarse bands**, not exact coordinates or true physical separation. This patch adds both devices' reported GPS accuracy to the public band and refuses to claim very-close proximity when that accuracy is insufficient.
- Only explicit per-recipient approved location requests may reveal last known coordinates for navigation; every query rechecks expiry and same-venue presence.
- Foreground BLE Android/iOS native *source* advertises a service and exposes rotating short-lived anonymous tokens via GATT; the API validates matched eligible attendees. BLE RSSI is not used to claim metre-accurate distance. No actual Android/iPhone BLE interoperability test has passed.
- No Wi-Fi Direct/Aware peer discovery or offline networking exists. BLE requires an HTTPS API round trip to resolve anonymous tokens into social profiles.
- Browser PWA does not access BLE. Its nearby radar is GPS-based and requires foreground checks.

## Bugs fixed in this patch

1. HTTP `onRequest` hook used undeclared `req`, causing requests to fail. Corrected to use the declared Fastify request argument.
2. Native 'start for 30 minutes' previously obtained only an initial GPS fix, but API positions expire in 75 seconds and venue check-ins in 120 seconds. Added a foreground-only 45-second GPS+check-in heartbeat, stop on failure, and 30-minute local deadline.
3. Nearby GPS band classification now considers reported uncertainty and nearby API revalidates the peer's verified ticket before showing a profile.
4. Native social lists were read-only and saved connections unavailable. Added follow/unfollow and connections UI.
5. Native basic profile edits wiped web-saved links, interests and avatar. Now preserve existing fields.
6. Web profile initially marked follow successful optimistically even if the HTTP request failed. It now waits for success.
7. Added dependency-free guard tests for the request hook, foreground discovery heartbeat, and mobile profile preservation.

## Test evidence

- `npm run check`: pass (backend JS syntax).
- **33/33 dependency-free Node tests passed** (http.integration.test.js excluded due uninstalled/incomplete external dependencies).
- TypeScript parser: `src/app.js`, `mobile/App.tsx`, `mobile/radio.ts`, `web/src/App.jsx` parse cleanly.
- Full `npm test`: BLOCKED by missing node packages (`jose`).
- `npm run build:web`: BLOCKED (`vite` executable unavailable due incomplete dependency installation).
- Native EAS/Gradle/Xcode builds, devices, GPS/BLE crowd tests, real Atlas/database roundtrips, end-to-end login/tickets, Docker build: NOT VERIFIED.
- `npm ci` attempted but unable to complete in this execution environment.

## Production dependencies still unresolved

- GitHub integration write permission failed with HTTP 403 on create-file and blob attempts in the connected account in the preceding turn, so source wasn't pushed.
- Railway API service is staged only and does not have source or a running deployment.
- Identity provider (OIDC), event organizer read-only identity-bound ticket verification, accurate approved venue data/time windows, secure Railway to Atlas connection, proximity HMAC secret and live domain remain unconfigured or unverified.
- Device capabilities and privacy law/terms require real Android and iPhone testing; no signed APK/IPA available.

**Verdict: source has useful functionality and newly fixed bugs but is not a robust working end-to-end production product.**
