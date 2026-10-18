# Mobile and deployment contract

## Native app status

`mobile/` contains an Expo Android/iOS client for OIDC authorization-code + PKCE login, encrypted local access-token storage, ticket-verification gating, profiles, social QR display/scan, approved-venue check-in, timed consented location sharing, and a foreground BLE token transport. This is source code; it is not a signed/distributable build. Provider configuration, deployed API, official ticket verification, and Android/iOS device acceptance tests remain required.

## BLE token transport

The Kotlin/Swift module advertises one fixed BLE GATT service UUID. A readable characteristic returns the phone's current random 32-character peer token. The same foreground app scans for that service, reads peer tokens, and submits them to the API. Tokens are renewed every two minutes and expire server-side within three minutes. The backend resolves only peers whose ticket eligibility, active approved-venue presence, and location-sharing consent pass. The app-level GATT payload contains only the rotating token, not account IDs, ticket QR values, or coordinates. Bluetooth also uses operating-system radio identifiers; their linkability varies by OS and requires device testing. RSSI must not be represented as exact distance. Stop sharing stops BLE and revokes the temporary location share.

The PWA has no BLE radio transport. Native discovery is foreground-only, expires silent sightings after 30 seconds, and still needs physical-device testing. Expo Go does not contain the custom native module; use an Android/iOS development build. Validate Android ↔ Android, iPhone ↔ iPhone, Android ↔ iPhone, repeated token rotation, permission denial, Bluetooth-off behavior, crowded-venue behavior, and immediate stop/revocation before advertising proximity discovery.

## Deploy configuration

- Website/PWA: Vercel, HTTPS.
- API: single always-on HTTPS/WSS container on Railway/Fly.io or equivalent. A load-balanced fleet requires a shared Socket.IO adapter and distributed request quotas.
- Database: MongoDB Atlas with private credentials and IP policies.
- Auth: managed OIDC and verified emails; JWT signed by trusted provider.
- External Devcon verifier: HTTPS read-only, subject-bound; the adapter refuses to verify until this is supplied.
- Observability: health checks, audit logs without sensitive position, error alerts, secret rotation.

## Public launch gate

Do not advertise as live, fully verified, or safe for public location sharing until permitted ticket verification, venue proof, frontend/native installation, actual iOS/Android compatibility, abuse review, authorization bypass tests, HTTPS deployment, privacy/retention policies, and incident response are verified. Never publish fake verified attendees.
