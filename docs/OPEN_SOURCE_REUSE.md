> 19 October update: the existing staging service is running with database readiness recovered. The staged-settings approval described below is historical and complete. Current product work reuses existing components without adding dependencies; see [current build report](PRODUCT_BUILD_2026-10-19.md).

# Open-source reuse review — 18 October 2026

This application already composes established libraries. No event-management
backend was copied or substituted. Versions below are the installed lockfile
versions inspected for this review, not claims that a dependency is vulnerability
free. API, dependency audits, native compatibility checks and device tests remain
separate gates.

## Components already used

| Component | Installed version | License | Actual use |
| --- | --- | --- | --- |
| React | web 19.3.1; native 19.3.0 | MIT | Existing UI component/runtime layer |
| Expo | 58.0.14 | MIT | Existing mobile toolchain and native integrations |
| Expo Camera | 58.0.10 | MIT | Native social-profile QR scanner; scanning opens a profile before any follow |
| react-native-qrcode-svg | 6.3.26 | MIT | Existing native profile QR generation |
| react-native-svg | 15.16.0 | MIT | QR renderer dependency |
| qrcode | 1.5.4 | MIT | Existing web profile QR generation |
| react-oidc-context | 3.3.1 | MIT | Web Authorization Code + PKCE flow; requires real provider configuration |
| Socket.IO client | 4.8.4 | MIT | Existing authenticated notifications/chat transport |
| Lucide React | 0.468.0 | ISC | Web navigation and action icons |
| Inter / Fontsource | 5.3.0 package | OFL-1.1 font | Bundled web font |
| uuid, under xcode only | 11.1.1 | MIT | Updated from vulnerable 7.0.3; scoped override preserves CommonJS `v4()` used by xcode |

Fastify, the official MongoDB driver and jose also remain the existing server
foundation. Their lockfiles retain the installed versions and licenses. Preserve
upstream copyright/license files and include applicable third-party notices in
distributed builds. The generated welcome artwork is decorative, not a roster
of real attendees.

## Requested candidates investigated

Repository metadata was checked through GitHub on this date. All eight listed
repositories were unarchived. Recent pushes are maintenance signals, not proof
that their issues, dependencies or platform integrations are resolved.

| Project / primary source | Maintenance observed | License | Decision and compatibility |
| --- | --- | --- | --- |
| [Eventyay](https://github.com/fossasia/eventyay) | pushed Oct 18, 2026 | Apache-2.0 | Reference only for event/admin workflows. Its Python/event-management stack would replace working Fastify/MongoDB code and does not supply our private 30-minute proximity workflow. No source copied. |
| [Eventyay Check-in](https://github.com/fossasia/eventyay-checkin) | pushed Oct 6, 2026 | Apache-2.0 | Reference only. Admission check-in/redeeming is a different operation from proving present ticket ownership; existing Expo scanner already covers profile QR UX. No source copied. |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | pushed Oct 18, 2026 | BSD-3-Clause terms in LICENSE.txt; review accompanying notices when adopting | Suitable web map renderer, not a map-data service. Not added yet: no licensed production style/tile provider is configured. Existing attributed OpenStreetMap venue embed remains; it exposes public landmarks or the consenting user's own point, not global attendee positions. |
| [MapLibre React Native](https://github.com/maplibre/maplibre-react-native) | pushed Oct 15, 2026 | MIT | Candidate for native venue maps after production tile provisioning and native builds. Official docs require native rebuilds; demo tiles are development-only. Adding another uncompiled native integration now would not verify the feature. |
| [react-native-qrcode-svg](https://github.com/Expensify/react-native-qrcode-svg) | pushed Sep 22, 2026 | MIT | Already reused. Keep the installed compatible renderer rather than implementing QR encoding. |
| [Expo / Expo Camera](https://github.com/expo/expo) | pushed Oct 18, 2026 | MIT | Already reused at SDK-compatible versions. TypeScript, Expo compatibility and JS export checks pass; toolchain security and native/device checks remain separate. |
| [ZITADEL](https://github.com/zitadel/zitadel) | pushed Oct 16, 2026 | AGPL-3.0 | Previously evaluated, with the user's cloud account created. Auth0 Free is now selected; see AUTH_PROVIDER_DECISION.md. No server source copied or AGPL code linked into this app. Instance/application settings and actual login still require verification. Hosted-service terms apply separately. |
| [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) | pushed Mar 9, 2026 | Apache-2.0 | Not added. Scanning/central support does not replace phone peripheral advertising. Preserve the existing Kotlin/Swift module and rotating-token protocol; all phone-pair combinations remain unverified. |

Licenses reviewed: upstream repository license metadata and MapLibre's
[LICENSE.txt](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).
No restrictive-license implementation has been copied.

## Ticket verification

The [official pretix REST API](https://docs.pretix.eu/dev/api/) is a candidate
for an organizer-authorized read-only adapter. Its existence does not grant access
to Devcon orders or prove that a person presenting a QR currently owns a ticket.
Do not call check-in, redeem or transfer operations for this purpose. The current
adapter stays disabled without an authorized endpoint, authenticated attestation
and identity binding. Email-bound single-use community invitations remain a
separate explicitly labeled access policy.

## Deployment reuse

[Railway local uploads](https://docs.railway.com/cli/up) can deploy the existing
Dockerfile with `railway up` without a GitHub source connection. CLI authentication
now works. A staging environment was created in the existing project; its three
service configuration changes remain staged because the connector rejected both
apply attempts. Production's pre-existing staged secret configuration is intact.
No public backend or Atlas network path has been falsely reported as working.

## Security remediation

The scoped xcode override fixes uuid to 11.1.1. The installed xcode consumer uses
CommonJS `uuid.v4()`; a project-ID generation smoke check passed, as did TypeScript,
Expo compatibility and both Hermes exports. Audit now reports zero moderate
findings and 15 high findings, down from 7 moderate and 15 high.

Remaining paths: Expo CLI → node-forge 1.4.0, and Expo Metro → micromatch → braces
3.0.3. These are build/development-tool dependencies, not the API's jose token
verification implementation. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
and [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
have no published patched versions at this review. This observation is not a
reachability waiver: untrusted development patterns and cryptographic inputs
remain risks. Native release security stays failing. No audit suppression,
package renaming, fake patched version or forced Expo downgrade was applied.


## Native runtime reachability evidence

Android and iOS Hermes exports with source maps were generated locally after the
UUID fix. Their maps contain 991 and 992 source entries respectively. Neither map
contains a source from the audited npm packages `node_modules/braces/`,
`node_modules/node-forge/` or `node_modules/uuid/`. Expo's separate
`expo-modules-core/build/uuid/` implementation is present and is not the vulnerable
xcode dependency. This narrows the observed exposure to the build/development
chain; it does not prove build-tool inputs safe or waive the failing security gate.
The source maps remain local under ignored `mobile/artifacts/security-export/`.

Remote CI for `a87b59a` completed: `test-build` PASS, `native-security` FAIL.
