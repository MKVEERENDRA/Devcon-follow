# Native Bluetooth and Wi-Fi Integration Contract

## Implementation status
**SOURCE IMPLEMENTED; NATIVE COMPILE PASS; PHYSICAL INTEROPERABILITY UNVERIFIED.**
The existing Expo app includes the local Android Kotlin and iOS Swift BLE module,
foreground discovery lifecycle, anonymous token rotation and GPS fallback. Both
Android Debug and unsigned iOS simulator compilation passed for source revision
`9727baa770ee294efe2ff7ebf7ac7104cc29ea98`, including the BLE module:
[Native compile run](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626955).
These results do not establish radio interoperability, an installable distribution,
App Store approval or device reliability. The separate native-security gate still
fails on 15 high tooling findings. No APK/IPA release or physical-phone test is claimed.

Backend `/v1/proximity/token` and `/v1/proximity/resolve` remain gated by authenticated
identity, an eligible official or separately labeled community access policy,
on-site presence, active discovery consent, matching venue, discoverability and
blocks. Community access never proves official ticket ownership.

## Implemented transport contract
The development-build-capable React Native app uses the local Kotlin (Android) and Swift (iOS) BLE/GATT module. Cross-platform radio interoperability requires the physical tests below; source or compilation alone is not evidence of interoperability. Never allow Expo Go's capabilities to stand in for signed native builds. Inbound messages must not contain a persistent account identifier, username, wallet address, MAC, email, or ticket code.

Each opted-in app authenticates with OIDC, obtains a 24-byte random peer token from `/v1/proximity/token` (up to three minutes), advertises the token through an SDK-compatible radio mechanism, and rotates it before expiration. The scanner locally collects tokens and asks `/v1/proximity/resolve` using an authenticated request. The backend returns permitted public profiles and labels them `compatible_radio_sighting`, never an exact distance measurement. Receiver-side hardware signals cannot establish accurate metre-level distance in crowded conference rooms. Do not use RSSI-derived "10 metres away" claims.

## Required physical tests

- Android↔Android, iOS↔iOS, and Android↔iOS with actual devices on current supported OS versions.
- Fresh install, permissions denied, Bluetooth disabled, Wi-Fi disabled, both enabled, Wi-Fi-only network conditions, metered network, offline conditions.
- Backgrounded apps, locked phones, system battery-saving settings, inactive/uninstalled clients, permission revocation.
- Device found, account opted out, expiry, blocked target, stale venue check-in, replayed BLE peer tokens.
- Congested wireless rooms with dozens of phones; measure detection success and battery usage.
- A fallback to the online directory and QR-follow flow on every unsupported device.

This contract and server routes are not a substitute for native SDK code and signed release testing.
