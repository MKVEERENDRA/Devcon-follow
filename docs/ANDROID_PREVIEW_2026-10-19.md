# Signed Android private preview — 19 October 2026

[Private APK download (Expo account required)](https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/989288ba-28cf-442f-b83a-aee2a96fab91).
Unauthenticated internal-build access is disabled. This is not a production release.

| Evidence | Result |
| --- | --- |
| EAS build | `989288ba-28cf-442f-b83a-aee2a96fab91`, FINISHED |
| APK source | `c6fad25dcf00b85ee411df05a05992c44f468f19` |
| Package / version | `com.proofofaudits.devconfollow`, `0.3.0` / Android build `1` |
| Downloaded file | `artifacts/android-preview/devcon-follow-0.3.0-1.apk`, 99,280,968 bytes |
| Android SDK verification | apksigner PASS; non-debug signing certificate; apkanalyzer confirms package/version and debuggable=false |
| Standalone bundle | `assets/index.android.bundle` present; staging HTTPS API URL embedded; no Expo Go or Metro used |
| Emulator installation | PASS: `adb install` returned Success on isolated Android 15 x86_64 emulator |
| Cold launch | PASS: MainActivity Status ok, COLD; React Native welcome screen rendered |
| API connectivity from emulator | Not accepted: initial connection failed through emulator NAT64; host HTTPS client-config returned 200 |
| Installation page | Local production build + browser checks PASS, including actual build link, unavailable/fetch-retry states, 320–1280px widths, 200% text and axe |
| Native compilation | [Android and iOS simulator CI PASS](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39221570080) |
| Source CI | [test-build PASS; native-security FAIL](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39221569949) |
| Native security | 15 inherited high findings; gate remains failing; private-preview disclosure present |
| iPhone installation | BLOCKED: no signed device/TestFlight artifact |
| Physical-phone acceptance | UNVERIFIED: BLE, GPS, push, camera and phone interoperability |

APK SHA-256:
`5a892187fa27c8ab4b3c2f9082da6488c58119391a4e39247bed5c03a2f4df91`

Signing certificate SHA-256:
`c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`

The install page is prepared at `/install.html`; its verified release descriptor
points to the authenticated EAS build page, never a secret-bearing artifact URL.
Website publication still requires the scoped approval in the execution brief.
No Railway/Atlas/Auth0 configuration, public registration or attendee data was changed.

Read-only staging checks: live/ready 200; release 503 with access, administrator
and approvedVenue gates false. Client config authReady/ticketReady/communityReady
remain false. The five sections retain the accepted sandbox baseline; no live
two-attendee journey was initiated or claimed. Database readiness is not evidence
of a new attendee write test. Official ticket verification stays disabled.

Local APK verification and emulator screenshots are under the ignored
`artifacts/android-preview/` directory. Install screenshots are under
`artifacts/install/`. Native source is unchanged by the subsequent web release
descriptor commit, so these artifacts remain tied to the exact source above.
