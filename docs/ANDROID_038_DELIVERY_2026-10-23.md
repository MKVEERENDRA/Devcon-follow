# Android 0.3.8/build 9 — 23 October 2026 (IST)

**Signed candidate verified and activated for the existing tester cohort. Public web signup is open; public native release and physical-device acceptance remain separate.**

## Exact artifact

- [Finished EAS build](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/325db82c-9c34-4edf-996c-7d59f362f35a).
- Native/API/web source: `d64037122be51337b2d96ef8cc18dd905a07c1f6`.
- Package: `com.proofofaudits.devconfollow`, version `0.3.8`, Android build `9`.
- Size: `98,841,320` bytes.
- SHA-256: `b20f38740bd0da4e8e82ff1537b79eaa3afd633c081cb5c7d586dfa9aaef6e39`.
- Existing signing certificate: `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
- API: `https://devcon-follow.35-206-98-214.sslip.io`; old Railway origin absent from the embedded bundle.
- Minimum SDK `24` (Android 7.0); target SDK `36` (Android 16). These values describe the signed manifest, not proof of operation on every phone.
- [Installer](https://devcon-follow.vercel.app/install.html) visibly shows 0.3.8/build 9 to the authenticated approved tester. It does not use an abandoned Expo download URL.

## Fresh evidence

| Check | Result |
| --- | --- |
| EAS build | FINISHED, exact source above |
| Independent Android SDK verification | PASS — signature, existing signer/app-link association, package/version, non-debuggable, standalone embedded JavaScript and correct HTTPS origin |
| Same-build bundle/map correlation | PASS — byte-identical embedded bundle, 1,089 mapped JavaScript sources; neither known braces/node-forge implementation appears in this inventory |
| Licensed images inside signed APK | PASS — all three source JPEG hashes match |
| Static modern-Android packaging checks | PASS — SDK ZIP alignment and 42 arm64/x86_64 ELF LOAD segment checks at 16 KB; four packaged ABIs |
| Authenticated sandbox delivery of actual APK | PASS — real 98,841,320-byte APK streamed through the browser/API and exact full SHA-256 checked; no installation is claimed |
| Continuous two-account browser/API/database journey | PASS — see [end-to-end report](END_TO_END_2026-10-23.md), including off-site browsing, venue arrival, discovery, meetup/reschedule, QR follows, notes, chat, Stop and retained chat after departure |
| Exact-source Android and iOS compilation | PASS — [both CI jobs](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39846854577) |
| Native dependency security | FAIL — independent high audit remains red; matching JavaScript inventory is not a tooling/native-library fix or risk waiver |
| Real owner live download | PASS — genuine existing Auth0 SSO restored; live installer completed its integrity check; saved APK independently matches size/SHA-256; all 24 authenticated byte parts returned 206 |
| Physical Android installation / GPS / BLE / camera / push | UNVERIFIED |

Machine-readable records: [SDK](releases/android-038-sdk-verification.json), [same-build inventory](releases/android-038-bundle-inventory.json), [photographs](releases/android-038-photography.json), [static alignment](releases/android-038-native-alignment.json). The alignment diagnostic includes unrounded RELRO ends; a separate review of allocated writable sections on rounded RELRO pages found no overlap outside the protected range in the 42 inspected segments. This is a bounded static check, not a device-runtime certificate. [Android's testing guidance](https://developer.android.com/guide/practices/page-sizes) still recommends actual 16-KB environment testing.

## Activation and recovery

The SDK-verified pair was packaged outside Git and transferred to the existing dedicated VM. Remote size, SHA-256, version/build and source were independently checked before activation. The existing source image `devcon-follow:d640371` remains in use; no account, registration policy, Auth0, database, network, Vercel project, POA resource or paid plan was changed. A brief startup 503 recovered to database readiness 200 after the required metadata reload.

Current pair: `/opt/devcon-follow/private-release`. Prior 0.3.7 pair: `/opt/devcon-follow/private-release.037`. Roll back the pair atomically and restart the existing service if necessary; never mix old metadata/new bytes. The authenticated part protocol binds each request to the APK hash and fails on a changed release. Public static `native-release.json` remains without a public binary, and tester access is still checked independently from open web enrollment.

The initial local CLI transfer was unnecessarily restarted because quiet progress output was misinterpreted. The original partial artifact was then resumed with HTTP 206 and passed the complete independent signature/hash checks. An old IAP upload connection also did not survive a long pause; it was stopped and retried with batch mode/keepalives, then the remote pair was verified. These transport attempts are not passing phone tests. No new infrastructure or paid upgrade was purchased.

## Reproduce candidate verification

Use the official EAS build ID above to download the application plus `--all-artifacts`. With Android SDK `APKSIGNER`, `APKANALYZER` and Java configured, run `scripts/verify-android-apk.mjs` with the APK, build ID and explicit GCE `--api-origin`. Extract only `assets/react/release/index.android.bundle` and `sourcemaps/react/release/index.android.bundle.map` from that build's artifact archive, then run `scripts/verify-android-bundle-map.mjs` against those exact files and the SDK record. Run `scripts/verify-bundled-photos.mjs`; check `zipalign -c -P 16 4 APK` and the 64-bit libraries' LOAD alignment before any wider compatibility claim. Full maps and credentials stay outside Git.

## Completed live delivery

The live owner UI displayed “APK integrity checks passed” for version 0.3.8/build 9. The explicit verified-save download produced `/home/vamshi/Downloads/devcon-follow-0.3.8-9.apk`; independent disk hashing confirmed the full signed size/SHA above. Server logs show 24 successful 206 APK responses and 24 successful CORS preflights within the observed window. The same image remained running, OOM false and restart count zero. [Machine-readable evidence](releases/android-038-live-delivery.json). Screenshot: `artifacts/end-to-end-038/live-038-delivery.png`. This proves real authenticated distribution, not installation or GPS/Bluetooth operation on a phone.
