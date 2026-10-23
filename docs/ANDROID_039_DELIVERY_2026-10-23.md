# Android 0.3.9 and core Nearby delivery — 23 October 2026 (IST)

## Completed source and verification

- Native build source: `8f8e1417e2d3265e46f0a515fc61d0150bcd7df0`.
- Version 0.3.9/build 10 includes `af542c5` radio lifecycle fixes and the new web/native Nearby role filter. The filter narrows only already consented, same-venue server results; it cannot import event-directory profiles into Nearby or grant location access.
- Local full suite: **122/122**, no failures/skips. Node syntax, native TypeScript and both Hermes exports PASS. Accessibility checks cover five screens, arrow-key radio selection, 200% text at 320/390/768 px, label clipping and horizontal overflow.
- Both public-community and invitation-policy sandbox browser journeys PASS. Extended journey executes Founder/Investor filtering, individual GPS request, explicit 15-minute recipient approval, walking-route URL creation, Stop revoking that grant, public-landmark meetup/reschedule, QR explicit follow, private notes, mutual chat and retention after departure. Synthetic GPS readings are injected by Playwright in a foreground browser; route URLs are captured locally and no test coordinates are sent to Google Maps. Initial approval tests timed out until a fresh simulated sensor reading was supplied; this was test-fixture recovery, not physical GPS acceptance.
- Container build initially failed because the new shared filter was absent from the Docker context. `6307665` adds the explicit COPY. Its CI test-build passes: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39962893713 . Independent native-security remains failed.
- Exact-source Android and iOS simulator compilation PASS: https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39962039307 .

## Signed artifact

EAS build **FINISHED**: https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/ec01d175-d038-4010-9ae6-01a04cd7e087

| Property | Verified value |
| --- | --- |
| Package | `com.proofofaudits.devconfollow` |
| Version / Android code | `0.3.9` / `10` |
| Size | 98,844,520 bytes |
| APK SHA-256 | `2e26f79f8a0a5f32aefb9d5963049008035cf60c3866db3e1c42c78b66774704` |
| Signer SHA-256 | `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9` |
| API | `https://devcon-follow.35-206-98-214.sslip.io` |
| SDK minimum / target | 24 / 36 |
| Release packaging | Standalone embedded bundle, non-debuggable, signature and existing app-link signer PASS |
| Modern ABI packaging | ZIP 16 KB alignment PASS; 42 arm64/x86_64 ELF libraries have compatible LOAD alignment. Static checks only. |

Matching EAS-generated bundle/map is byte-correlated with the signed APK. The 1,091 mapped JavaScript sources contain neither known npm advisory implementation. The actual App.tsx, radio-session.js and nearby-filter.js source-map contents match the committed build source. This does not repair or certify build tooling/native dependencies.

Machine-readable evidence: `docs/releases/android-039-sdk-verification.json`, `android-039-bundle-inventory.json`, `android-039-alignment.json`.

The actual signed bytes pass authenticated sandbox browser download and complete SHA verification (`artifacts/android-039/private-transport.log`). Package download to GCE was independently hashed before activation. A slow IAP SCP transfer was stopped; fetching EAS's build artifact directly into the VM with an EAS user agent succeeded and matched the independently verified local SHA. No artifact URL/token was printed or committed.

## Published web

Canonical https://devcon-follow.vercel.app/ now serves Nearby role selection, including Founder, Investor, Developer and other declared roles. Existing app accounts are not opted into presence or location automatically. Live owner session verification selected Founder without enabling location or changing the profile. Proof: `artifacts/android-039/live-nearby.png`.

Final Vercel deployment `dpl_5WtMNYHZMu63ZiYP3AijqDwKqo61`, URL https://devcon-follow-iqrw24ahh-mkveerendras-projects.vercel.app . Only existing Devcon project `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO` was targeted. POA remains untouched. Live JS/CSS hashes match tested local output:

- `main-C_0YsdiB.js`: `39053d0e6385c57d3d5be4a9450c4acf37d03d83da3d24cb8567c7f3c6d3e17d`
- `main-Bf2T1ozz.css`: `e33fddbd7ffabb159bcaa172c5fafefc97a92d7f13a2e789c74f12fd4f2a0c35`

## Community venue and public-area meeting anchor

The previously owner-approved Devcon venue remains `73500a03-2e72-40e9-a573-5f27935357ed`, center 19.0639375/72.8674375, 250 m radius, 3 November 09:30 IST–6 November 17:00 IST. Event access rules still apply; the app does not issue admission or official ticket verification.

A researched community landmark is enabled: **Dhirubhai Ambani Square · south edge (agree spot in chat)**, ID `9a2d033b-e9ba-407e-b488-cc0b1551458d`, map anchor 19.0652007/72.8674885 (141 m from venue center).

Sources:
- Venue owner's description of the public square: https://www.reliancefoundation.org/media/media-release/smt-nita-ambani-dedicates-dhirubhai-ambani-square
- OpenStreetMap contributors' named square and southern boundary node: https://www.openstreetmap.org/way/1159113174 (coordinates read from its public OSM API geometry).

This is an **approximate public-area anchor**, not a claimed entrance, exact standing position, confirmed Devcon gathering, organizer endorsement or unrestricted access promise. The visible name asks attendees to agree the precise spot in chat. Follow signs, staff instructions and local access rules; do not stand in a vehicle route or fountain area. Approval provenance, sources and `organizerEndorsement=false` are retained in the database/audit. No real attendees, presence or GPS readings were invented. Service-configuration health passed after adding this valid landmark.

## Restricted installer activation and rollback

The matching APK/metadata pair was installed at `/opt/devcon-follow/private-release` and the existing service restarted to reload the bind mount. The previous 0.3.8 pair is `/opt/devcon-follow/private-release.038`. API image, Auth0 clients, MongoDB credentials/network policy and public web registration were not changed. Restore the matching old directory pair and restart the same service to roll back. Never mix APK and metadata versions.

Installer URL: https://devcon-follow.vercel.app/install.html . This candidate remains restricted to the existing approved account cohort. No public APK/GitHub Release was created, and no named security risk acceptance was inferred from the owner's urgency.

## Live delivery verification

After the service restart, database readiness recovered and `/health/ready` and `/health/release` returned 200. The latter explicitly reports `scope=service-configuration`; it does not certify security or hardware. Anonymous APK requests return 401.

The genuine existing owner session opened the updated installer without a new login, downloaded all verified bytes and displayed “APK integrity checks passed.” The explicitly saved file `/home/vamshi/Downloads/devcon-follow-0.3.9-10.apk` independently hashes to the recorded SHA-256 and is exactly 98,844,520 bytes. Screenshot: `artifacts/android-039/live-installer.png`. No phone installation or radio interaction is implied.

## Remaining limits

The independent native audit still has 15 high propagated findings from braces GHSA-vfj7-8cjw-p6xm and node-forge GHSA-86w9-cpqp-85rv. Registry/advisories were rechecked today; latest braces 3.0.3, node-forge 1.4.0 and supported Expo 58.0.17 provide no listed patch for these findings. `npm audit fix --force` proposes an incompatible Expo downgrade; it was not applied. Gate remains visible and failing.

Physical phone installation, sensor accuracy, Android/Android and Android/iPhone radio interoperability are unverified. There is no Apple Developer membership/TestFlight release. Service-configuration health and software journey PASS are not a full public native-release certification.
