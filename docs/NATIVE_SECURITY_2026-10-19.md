> Current continuation: [release-security decision packet](RELEASE_SECURITY_DECISION_2026-10-20.md) and [production delivery](PRODUCTION_DELIVERY_2026-10-20.md). The high gate remains red. A bounded owner decision can now be represented honestly by the installer; no real decision or public release has been created. Fresh exported-bundle inventories do not certify the different embedded APK bundle.

> Rechecked 20 October 2026 (IST): supported SDK compatibility updates now resolve
> Expo 58.0.16 and Expo CLI 58.1.13; Metro config remains 58.0.15. Expo Doctor
> passes 20/20 and `expo install --check` passes. Fresh audit still reports 15 high,
> zero moderate/critical findings. Primary advisories still list no patched braces
> or node-forge version. The gate remains failing. See
> [installer delivery evidence](INSTALLER_DELIVERY_2026-10-20.md).

# Native dependency investigation — 19 October 2026

Applied the supported Expo 58.0.15 patch for the 0.3.1 community candidate after
CI diagnosed an SDK packaging mismatch (expected ~58.0.15, installed 58.0.14).
The lockfile now resolves @expo/cli 58.1.12 and @expo/metro-config 58.0.15.
TypeScript, `expo install --check` and Expo Doctor (20/20) pass after the update.
Fresh audit still reports 15 high findings, zero moderate and zero critical.
The CLI still uses node-forge 1.4.0 and @expo/code-signing-certificates 0.0.7;
Metro still resolves braces 3.0.3. This compatibility patch does not resolve the
two advisory roots. The earlier "latest matches installed" observation below is
historical, not current.
No unsupported override, ineffective security certification or gate suppression
was applied. Trusted locked builds and isolated tooling remain limited mitigations.

Rechecked after adding SDK-compatible photo, notification and crypto modules through source `e212605`; the two advisory roots and 15-package count are unchanged. The release gate has not been suppressed.

Release security remains **FAIL**. Fresh `npm --prefix mobile audit --json`
reports 15 high, zero moderate and zero critical package findings. These are
15 affected packages in the dependency graph, rooted in two distinct advisories;
they are not 15 independent vulnerabilities. No warning was suppressed and no
lockfile or package version was falsified.

## Exact installed paths and exposure

| Root | Installed dependency path | Finding / affected operation |
| --- | --- | --- |
| braces 3.0.3 | expo 58.0.15 → @expo/metro-config 58.0.15 → @expo/metro 58.0.0 → metro-file-map 0.87.1 → micromatch 4.0.8 → braces 3.0.3 | Recursive pattern parsing/compilation can exhaust the Node stack. Build/dev file matching is the observed consumer. |
| braces 3.0.3 | react-native 0.88.0 → @react-native/community-cli-plugin 0.88.0 → metro 0.87.1 → metro-file-map 0.87.1 → micromatch 4.0.8 → braces 3.0.3 | Same advisory propagated through React Native's tooling graph. |
| node-forge 1.4.0 | expo 58.0.15 → @expo/cli 58.1.12 → node-forge; and @expo/cli 58.1.12 → @expo/code-signing-certificates 0.0.7 → node-forge 1.4.0 | RSA PKCS#1 v1.5 signature verification can accept malformed ASN.1 structure. Expo CLI/certificate tooling is the observed consumer. |

The complete set reported high is: `@expo/cli`,
`@expo/code-signing-certificates`, `@expo/metro`, `@expo/metro-config`,
`@react-native/community-cli-plugin`, `@react-native/virtualized-lists`, `braces`,
`expo`, `metro`, `metro-config`, `metro-file-map`, `metro-transform-worker`,
`micromatch`, `node-forge` and `react-native`. Wrapper entries inherit their
finding through the listed dependency chains.

The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) covers
versions through 3.0.3; the [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
covers versions through 1.4.0. Both primary advisory pages list **no patched
version** at this investigation. Registry lookups independently returned braces
3.0.3 and node-forge 1.4.0 as latest. Recheck before releasing; this is dated
evidence, not a permanent statement about upstream support.

## Build versus app runtime

Fresh Android/iOS Hermes exports with source maps completed locally in
`mobile/artifacts/coordination-export/` for source `e212605`. Android contains 1,066 source entries; iOS contains
1,065. Neither source list contains `node_modules/braces/` or
`node_modules/node-forge/`. This supports the narrower observation that those npm
implementations were not included in these two app JavaScript bundles.

It does **not** prove that build inputs, CLI certificates, all platform binaries,
or future builds are safe. Audit classifies much of this graph as production
because Expo brings its tooling through ordinary dependencies; `--omit=dev`
would not be a valid resolution. The server's JWT validation uses `jose`, not
node-forge. The native release gate remains unchanged and failing.

Build only trusted locked source in isolated CI; do not expose the Metro/dev
server to untrusted networks or process untrusted signing/certificate material
with the affected tooling. These are limited precautions, not a vulnerability
waiver or release approval.

## Supported fixes investigated

At the earlier investigation, registry `expo` latest was 58.0.14. The supported
58.0.15 patch has now been applied as recorded above. The
[Expo SDK matrix](https://docs.expo.dev/versions/v58.0.0/) pairs SDK 58 with React
Native 0.88 and React 19.3.0. `npm outdated` proposes React 19.3.1 and TypeScript
7.0.2 as latest; neither resolves these two roots, and moving outside the SDK
pairing without purpose would add compatibility risk.

Npm's suggested Expo 44.0.6 / React Native 0.72.17 downgrade is not a safe fix
for this SDK 58 native app. The suggestion avoids portions of the graph instead
of providing patched versions of the affected implementations. No forced
`npm audit fix --force`, incompatible override, suppression, or unreviewed fork
was applied. Follow the [official upgrade procedure](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
when a supported patched SDK/toolchain becomes available, then repeat types,
exports, audit, Android/iOS compilation and phone acceptance.

Reproduce with Node 24: `npm ci --prefix mobile`,
`npm --prefix mobile audit --json`, `npm --prefix mobile explain braces node-forge`,
`npm view expo dist-tags --json`, `npm view braces version`, and
`npm view node-forge version`. The CI security job deliberately remains red.
