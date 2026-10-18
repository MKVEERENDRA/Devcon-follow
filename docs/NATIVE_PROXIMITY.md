# Native Bluetooth and Wi-Fi Integration Contract

## Implementation status
**NOT IMPLEMENTED/NOT TESTED.** The backend already has secure, short-lived anonymous `/v1/proximity/token` and `/v1/proximity/resolve` routes, gated by valid verified ticket, on-site presence, active location opt-in, matching venue, discoverability and blocks. No hardware discovery integration has been claimed.

## Device integration plan
Use a development-build-capable React Native app with Kotlin (Android) and Swift (iOS) native modules. Evaluate Google Nearby Connections or compatible BLE/GATT/Wi-Fi Direct SDKs for actual iOS-to-Android interoperability; a package listing alone is not evidence of interoperability. Never allow Expo Go's capabilities to stand in for signed native builds. Inbound messages must not contain a persistent account identifier, username, wallet address, MAC, email, or ticket code.

Each opted-in app authenticates with OIDC, obtains a 24-byte random peer token from `/v1/proximity/token` (up to three minutes), advertises the token through an SDK-compatible radio mechanism, and rotates it before expiration. The scanner locally collects tokens and asks `/v1/proximity/resolve` using an authenticated request. The backend returns permitted public profiles and labels them `compatible_radio_sighting`, never an exact distance measurement. Receiver-side hardware signals cannot establish accurate metre-level distance in crowded conference rooms. Do not use RSSI-derived "10 metres away" claims.

## Required physical tests

- Android↔Android, iOS↔iOS, and Android↔iOS with actual devices on current supported OS versions.
- Fresh install, permissions denied, Bluetooth disabled, Wi-Fi disabled, both enabled, Wi-Fi-only network conditions, metered network, offline conditions.
- Backgrounded apps, locked phones, system battery-saving settings, inactive/uninstalled clients, permission revocation.
- Device found, account opted out, expiry, blocked target, stale venue check-in, replayed BLE peer tokens.
- Congested wireless rooms with dozens of phones; measure detection success and battery usage.
- A fallback to the online directory and QR-follow flow on every unsupported device.

This contract and server routes are not a substitute for native SDK code and signed release testing.
