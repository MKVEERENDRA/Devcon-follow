# Native dependency investigation — 19 October 2026

Release security remains **FAIL**. Fresh `npm --prefix mobile audit --json`
reports 15 high, zero moderate and zero critical package findings. These are
15 affected packages in the dependency graph, rooted in two distinct advisories;
they are not 15 independent vulnerabilities. No warning was suppressed and no
lockfile or package version was falsified.

## Exact installed paths and exposure

| Root | Installed dependency path | Finding / affected operation |
| --- | --- | --- |
| braces 3.0.3 | expo 58.0.14 → @expo/metro-config 58.0.14 → @expo/metro 58.0.0 → metro-file-map 0.87.1 → micromatch 4.0.8 → braces 3.0.3 | Recursive pattern parsing/compilation can exhaust the Node stack. Build/dev file matching is the observed consumer. |
| braces 3.0.3 | react-native 0.88.0 → @react-native/community-cli-plugin 0.88.0 → metro 0.87.1 → metro-file-map 0.87.1 → micromatch 4.0.8 → braces 3.0.3 | Same advisory propagated through React Native's tooling graph. |
| node-forge 1.4.0 | expo 58.0.14 → @expo/cli 58.1.11 → node-forge; and @expo/cli 58.1.11 → @expo/code-signing-certificates 0.0.7 → node-forge 1.4.0 | RSA PKCS#1 v1.5 signature verification can accept malformed ASN.1 structure. Expo CLI/certificate tooling is the observed consumer. |

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
`mobile/artifacts/v1-security/`. Android contains 992 source entries; iOS contains
993. Neither source list contains `node_modules/braces/` or
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

Registry `expo` latest is 58.0.14, matching the installed SDK. The
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
