# Devcon Follow v1 reliability evidence — 19 October 2026

Status: **local reliability improvements verified; live pilot and production remain
closed**. No live accounts, invitations, venues, attendee data, Atlas network
changes or Railway/Vercel deployments were performed in this work. GitHub source
publication and CI were explicitly authorized.

## Source changes

- `b48b3fd4adc18de1f1ad893a8644251cc9fca6fc`: recovery/navigation/accessibility fixes,
  native meetup categories and expired-action filtering, local Stop pause and
  sandbox regression coverage.
- `c1f7d3eef5584fd53b22d49d54ad0fd944dc6cca`: pending Stop persistence across reloads
  and browser tabs, plus a reload regression assertion.

Both are pushed to `MKVEERENDRA/Devcon-follow` main. The mobile subtree is identical
at these revisions: Git tree `82ed19329b3f8509712f7de2fba270eef0963208`.
No native source changed in the web-only follow-up.

## Local results

| Check | Actual result |
| --- | --- |
| Node syntax | PASS |
| Unit/integration/security tests | PASS: 63/63, zero failures/skips; disposable real Mongo and signed sandbox identities |
| Vite production build | PASS |
| Existing two-context browser journey | PASS: PKCE, community access, profile/goals, discovery, reason/landmark meetup, explicit QR-link follow, note privacy, mutual chat, Stop and retained connections |
| New browser reliability journey | PASS: no-results recovery, profile lookup without implicit follow, note-load error/retry, disabled-save safety, unfollow/note deletion, Back to Connections, GPS denial, failed Stop, reload, full heartbeat interval with no GPS writes, reconnect/server revocation |
| Socket reconnect | PASS: each connection authenticates; invalid JWT reconnect rejected |
| Native TypeScript | PASS |
| Android/iOS Hermes exports with source maps | PASS; JavaScript bundles, not installable apps |
| Native audit | FAIL: 15 high package findings from two upstream advisories |

Expiry coverage changes the persisted test consent to its expiry boundary while
keeping the records present; this proves rejection does not depend on eventual
Mongo TTL cleanup. It is not a claim that two physical phones were operated for
30 minutes. GPS denial, network failure and time advancement are browser-test
conditions on loopback services. A standalone Stop cannot revoke an already sent
server sample while disconnected; the UI now states that limit explicitly.

## CI evidence

[Baseline CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39158122245)
and [baseline native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39158122251)
were independently read back for `f5a4b24`: test-build PASS, native-security FAIL,
Android compilation PASS and iOS simulator compilation PASS.

[Core-fix CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39163352007)
for `b48b3fd`: test-build PASS (including browser reliability and Docker build),
native-security FAIL. The workflow as a whole is therefore FAIL, not green.

[Final-source CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39163736105)
for `c1f7d3e`: test-build PASS, including both browser journeys, native exports,
backend/web audits and Docker build; native-security FAIL. Overall workflow FAIL.
The browser evidence artifact is [12149947154](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39163736105/artifacts/12149947154).

[Native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39163351991)
for `b48b3fd`, covering the identical mobile subtree in `c1f7d3e`: **PASS**.
Both Android application/local BLE compilation and iOS simulator/local BLE
compilation completed successfully. Android compile reports artifact:
[12150076705](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39163351991/artifacts/12150076705). Simulator compilation is not iPhone installation,
signing, Bluetooth interoperability or permission/lifecycle acceptance.

## Audit, parity, security and owner handoff

- [Five-screen audit and screenshots](FIVE_SCREEN_AUDIT_2026-10-19.md): numbered
  flow, repaired issues, selected contrast measurements, implementation parity
  and explicit unverified native/UI/accessibility limits.
- [Native security investigation](NATIVE_SECURITY_2026-10-19.md): precise dependency
  paths, all 15 affected package names, two advisories, current registry/support
  checks and narrower bundle exposure evidence. Release gate remains failing.
- [Owner acceptance checklist](PILOT_ACCEPTANCE_CHECKLIST.md): real Auth0 accounts,
  separately approved community pilot, admin identity, venue/time/landmarks,
  persistent restricted connectivity, signed installations, all three phone-pair
  combinations, privacy negatives and rollback. Instructions only, not executed.
- [Restricted networking](RESTRICTED_NETWORKING.md): Railway Pro static egress and
  a budget-conscious fixed-IP VM alternative using the same Docker image, with
  costs, limits and operator responsibilities. Neither was newly provisioned.

Before live acceptance the owner must explicitly lift the freeze for the chosen
staging revision/scope, approve two genuine consenting identities and the pilot
administrator/venue/window/landmarks, choose/fund a durable network route, complete
provider/signing account requirements, provide physical phones and resolve the
native security release gate. No registration or production approval is implied.
