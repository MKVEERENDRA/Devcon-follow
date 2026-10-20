# Release-security decision packet — pending owner review

**Decision: BLOCKED / NOT APPROVED.** This document records residual risk; it is
not an exception, a green audit, a request to release the current staging APK,
or authorization to expose public registration.

## Findings and observed paths

Fresh locked mobile audit: **15 high package findings, 0 critical/moderate**.
These propagate from two advisory roots; wrapper package counts are not separate
exploits. Primary advisories and npm latest were rechecked on 20 October 2026:

| Root | Reachable operation and possible effect | Current supported patch |
| --- | --- | --- |
| [braces 3.0.3](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Metro/micromatch build/dev matching of malicious nested brace patterns can exhaust the Node stack and stop a build/dev process. Repository/configuration/dependency inputs are the relevant boundary. | None listed; registry latest 3.0.3 |
| [node-forge 1.4.0](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo CLI/code-signing certificate tooling uses affected RSA PKCS#1 v1.5 verification. Malformed ASN.1/signatures under the advisory's key/verification conditions can be accepted; certificate/build trust could be compromised if attacker-controlled material reaches that path. | None listed; registry latest 1.4.0 |

Expo 58.0.16 / CLI 58.1.13 / Metro config 58.0.15 are the currently supported
installed versions. No incompatible downgrade, vendored patch, `--omit=dev`
argument or audit suppression is proposed.

## Runtime evidence and its limits

New Android/iOS source-map inventories (1,069 / 1,068 entries) contain neither
`node_modules/braces/` nor `node_modules/node-forge/`. The report includes export
bundle and map SHA-256 values, not full maps or credentials. This is **exported
JavaScript evidence only**; it does not establish absence in all platform
binaries, a future export, or the signed APK. The embedded signed APK bundle SHA-256 is
`2d5353c3c8f3f3a83caa8d8ff30322fc86460ae791eaf0798f6115b03189cc24`;
the new Android export is
`4690b3f587ca93cdb318a58fe0dce228061035a987f42611db2484355993270e`.
They differ, so these source maps cannot certify the APK inventory. Capture the
matching generated bundle/map in the next approved EAS build (Expo supports
[`buildArtifactPaths`](https://docs.expo.dev/eas/json/#buildartifactpaths)); do
not substitute a separately exported map. APK/export correlation is explicitly
unverified. Existing APK signature checking uses independent Android SDK tools;
API JWT validation uses `jose`, not node-forge. There is no configured OTA update
signing deployment in the current app configuration. These narrower observations
must not be represented as proof of zero installed-app security risk.

## Applied compensating controls

- Locked dependency installs; trusted reviewed release source. CI has no attendee
  records, Auth0 secrets or production deployment credentials.
- Exact upstream action revisions, read-only token permissions, checkout token
  persistence disabled, finite job timeouts.
- Source maps checked per export, with both platforms required. Npm's independent
  high-vulnerability job remains red; a clean inventory cannot bypass it.
- Release builds do not require exposing Metro to the public internet. Do not
  import untrusted certificates, signing keys or build patterns into affected
  CLI tooling. Current APK signature identity is independently rechecked.
- Public APK distribution remains withheld; current staging transport requires
  verified cohort identity, checks membership/revocation, serves private/no-store
  bytes and verifies size/SHA-256 in the browser.

These reduce exposure; they do not repair the vulnerable implementations. A
malicious build input or certificate can still affect the relevant toolchain.

## Conditions for a defensible decision

Before requesting the consolidated public release approval, attach the exact
production source and new APK hash, current audit, both bundle inventories and
APK correlation analysis, owner-controlled production Google setup, rollback
record and genuine acceptance results (or clearly unresolved physical blockers).
The owner must explicitly accept the two named residual build/certificate risks
for that exact release, with scope and expiry; a generic “continue” is not a
security decision. Keep the scan red even if a bounded owner decision is given.
A decision on these tooling risks does not authorize invented venue boundaries,
a skipped consenting tester, broad Atlas networking or production access changes.

If an upstream patch becomes available, use the supported Expo toolchain update
and rerun audit, exports, types, native compilation and device acceptance. This
packet must be refreshed for a changed dependency graph or candidate.

## Prepared installer representation

Source supports an operator-published `releaseSecurityDecision` only when
`securityGatePassed=false`. Required fields: `status=accepted-residual-risk`,
`auditStatus=fail`, exact `sourceCommit`, `apkSha256`, `auditSha256`, the two named
`advisories`, `approvedAt`, `expiresAt` (at most 30 days later), and `recordUrl`
under `https://github.com/MKVEERENDRA/Devcon-follow/blob/COMMIT/docs/releases/NAME.md`.
The installer visibly states that the audit is failing and links the record.
It rejects expired/future or hash-mismatched decisions. This metadata check
cannot itself authenticate a human approval: the release operator must verify
the real recorded owner decision before publishing. Expiry hides the installer
link on a fresh validation; it cannot recall already downloaded files or revoke
a public GitHub asset. Operational withdrawal requires a separately authorized
release action. No real record or manifest entry has been created here.

Audited dependency snapshot SHA-256:
`83750c480f63b7b23ab54c1fd0f2b4f053abface9b6698e9337d158836485f82`.
Local read-only evidence: `artifacts/install/native-audit-20261020.json`.

## Subsequent exact APK correlation

Android 0.3.3/build 4 now has matching same-build EAS bundle/source-map evidence.
The bundle is byte-identical to the SDK-verified signed APK, with 1,069 mapped
sources and neither known npm advisory implementation present. Exact hashes,
source and scope are in [0.3.3 delivery](ANDROID_033_DELIVERY_2026-10-20.md).
This closes the earlier export/APK correlation gap for **this candidate only**.
It does not audit native libraries or repair the affected build/certificate
toolchain; the independent native-security gate remains failing. No actual
release-security decision or public distribution approval has been recorded.
