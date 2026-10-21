# Android 0.3.4/build 5 — 21 October 2026

## Delivered candidate

The owner requested applying the native session fix to the delivered product.
Source `e3d2b41860127bd5f3b402773bd5cda6182b7dab` versions the tested fix
`80147143204a84deea42adbe642497a598b146f7` as 0.3.4/build 5. Existing package,
EAS project and signing key are preserved. EAS build **FINISHED**:
https://expo.dev/accounts/veerendravamshis-team/projects/veer/builds/d3c56bee-bbce-4f0e-9b55-36a4d322014d .
That account page is provenance, not an anonymous APK installation URL.

Local signed APK: `artifacts/android-preview/devcon-follow-0.3.4-5.apk`.

- Size: 99,363,024 bytes.
- SHA-256: `4146db3b59996bc7ee1f5dd932b0561d6245c8c1957a5a632705a6c35a951481`.
- Signing certificate SHA-256: `c62bcd71781c56566f5b4b748765bc27f6b08e3677e9c7adcd52fa8430c042c9`.
- Package: `com.proofofaudits.devconfollow`; SDK signature and certificate continuity PASS.
- Standalone embedded bundle and non-debuggable manifest: PASS.
- API remains `https://devcon-follow-api-staging.up.railway.app`.
- Actual binary authenticated sandbox installer transport, automatic and explicit
  save with matching bytes, expiry, axe and font scaling: PASS.

Direct artifact links initially returned HTTP 403. The existing authorized EAS
CLI successfully downloaded the APK and additional artifacts using
`eas build:download --build-id … --all-artifacts --non-interactive --json`.
No new login, credentials, project or paid upgrade was needed. Signed artifact
URLs remain local and are excluded from source.

## Matching bundle and source map

Same-build capture is byte-identical to the APK embedded bundle, with
1069 mapped sources. Neither known npm advisory implementation is
present in that embedded JavaScript inventory. The session source in the map
contains `renewActiveSession`.

- Embedded HBC SHA-256: `15798b7baecd255c36de9fc83f64ddc6ba4fcc0bf05efe36e09f054faa6ec193`.
- Source-map SHA-256: `a4e18cd593415cdf5d625644d4ee49a1f5f40bef8d1ca01d3a68cb9ff4cbabb3`.

This scope excludes native libraries and build/certificate tooling. It does not
change or waive the failing native dependency audit.

## CI and release status

- Full test/build CI: PASS for this candidate source; native-security: FAIL.
  https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39568513647
- Android and iOS native compilation: PASS (both jobs completed successfully).
  https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39568513589
- Version/build guard and session regression checks: 7/7 PASS following the
  version-only increment. Earlier full functional verification: 89/89 PASS and
  two-account sandbox browser journey PASS; see CORE_FLOW_VERIFICATION_2026-10-21.md.
- Physical installation/native-provider/two-person acceptance: UNVERIFIED.
- Production deployment/public APK distribution: BLOCKED.

The existing live staging installer still distributes 0.3.3/4. This candidate
has been prepared locally at `/tmp/devcon034-private-release`; it has not been
uploaded to Railway or published as a GitHub Release. No production rollout,
Atlas/network change, public enrollment or Proof of Audits change occurred.

Production requires an exact release-security decision or supported fixes for
the two upstream advisories, reliable restricted connectivity, approved
administrator/venue/landmark configuration and genuine acceptance. The owner’s
₹0 budget remains in effect. Railway's current static outbound IP feature is
Pro-only: https://docs.railway.com/networking/static-outbound-ips . A billing or
network-isolation change requires an explicit decision; no purchase or broader
Atlas allowlist was made. The older staging APK is not a production artifact.
