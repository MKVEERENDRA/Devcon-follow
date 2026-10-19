> Later meeting-coordination work is recorded in the [end-to-end product report](END_TO_END_PRODUCT_REPORT_2026-10-19.md), source `e212605`, 69 local tests. This report preserves earlier directory-specific measurements.

# Directory, draft reliability and client parity — 19 October 2026

Implementation: [`791c906`](https://github.com/MKVEERENDRA/Devcon-follow/commit/791c906), privacy/error and query-plan follow-up: [`38eb754`](https://github.com/MKVEERENDRA/Devcon-follow/commit/38eb754), continuing accepted baseline `7566918`. Native files are unchanged between these two revisions. Source changes only. No live endpoints, account configuration, attendee records, registration or deployments were changed or tested. No pilot was initiated.

## Product changes

The existing five-screen design and consent model remain. Both directory clients now request server search and explicit pagination instead of downloading a capped set and filtering locally. Native profile editing supports photos and GitHub, LinkedIn, X and website links, selectable roles, and a pasted profile-link alternative to camera scanning. Opening a QR/link displays a profile and requires a separate Follow action.

Native photos use the system image picker and Expo image manipulator: square editing, bounded decode, 180px JPEG and a 45,000-character data-URI ceiling. Cancelling retains the current draft; saving the profile is the explicit upload step. Camera permission remains enabled for QR scanning; microphone permission is disabled. Native picker, permission and camera interaction still require physical-device acceptance.

Browser and native private-note editors retain their in-memory draft when the API token changes. The enclosing browser profile no longer unmounts the note on renewal. Editors are keyed by owner and target; logout/account changes cannot reuse another owner's draft. Failed initial loads still disable saving and offer retry. This is not durable draft storage: navigating away or closing the app can discard an unsaved draft. No automatic save was introduced.

## Directory API and authorization

`GET /v1/directory` accepts only these string parameters:

| Parameter | Contract |
| --- | --- |
| `q` | Trimmed words, each a literal substring (AND across words, OR across fields), case insensitive, max 80 characters; name, handle, bio, roles, interests and meeting goals |
| `role` | One canonical role from the existing role vocabulary |
| `interest` | Exact interest, case insensitive, max 32 characters |
| `openToMeet` | `true` or `false`; false includes unset/false preferences |
| `limit` | Integer 1–50; default 24 |
| `cursor` | Opaque continuation from the preceding response |

Response: `{attendees, nextCursor, kind, note}`. No raw attendee coordinates, total count or unauthorized candidate IDs are returned. The directory is same-venue eligibility discovery, not a claim of exact GPS proximity. Existing venue checks use fresh GPS-based presence, not cryptographic proof of physical presence or protection against all GPS spoofing.

Every request revalidates the viewer's access and active approved venue. Candidate visibility, fresh same-venue presence, ticket/community eligibility and both block directions are enforced before pagination. Community grants are considered only when explicitly enabled and valid; they remain distinct from official ticket verification. Unknown, hidden and off-venue profiles return the same 404 payload. Existing block denials remain 403 without returning a profile. Direct profile and new-follow routes enforce the same venue audience rule so guessing IDs cannot bypass the directory. A viewer's existing saved connection remains available after leaving the venue, subject to the existing eligibility/block checks.

Pages use sorted `userId` keyset traversal. AES-256-GCM cursors are bound to viewer, venue, normalized filters and page size, expire after 15 minutes and reveal no last ID. The process-local encryption key intentionally invalidates cursors after restart or on a different replica; clients provide Restart search. Multi-replica rollout needs sticky routing or a securely provisioned shared cursor key before treating continuation as reliable across instances. Access is rechecked even with a valid cursor. Results can change as presence expires; this is not a database snapshot.

Filtered searches begin from discoverable profiles; unfiltered pages begin from venue presence. Compound indexes are hinted, aggregation execution is bounded to 2 seconds without disk spill, and timeout returns 503 with retry/narrow-filter guidance. Route limit is 60 requests/minute in addition to existing global limits. This mitigates bulk scraping; authorized attendees can still browse other authorized attendees, which is the intended directory behavior. Literal regex escaping prevents supplied regular-expression syntax/operators. Substring search can still scan indexed discoverable candidates; larger populations need measured capacity planning before adopting a specialized search index.

New index manifest entries: `profiles {discoverable:1,userId:1}`, `presence {venueId:1,userId:1,expiresAt:1}`, and reverse `blocks {blockedId:1,blockerId:1}`. Only disposable databases received these indexes here. An authorized rollout must reconcile the manifest, inspect execution plans and preserve populated indexes; no Atlas migration was performed.

## Local verification

All checks use Node 24, disposable MongoDB and an independent loopback OIDC issuer. No real attendees or live account tests.

| Check | Result / evidence |
| --- | --- |
| API/regression suite | **PASS 67/67**, zero skipped/failing; accepted regressions retained |
| Syntax / web production build / native TypeScript | **PASS** |
| Original two-browser journey | **PASS**, independent authorization-code + PKCE identities, access, discovery, meetup, QR-follow, mutual chat, Stop, retained connection |
| Reliability browser journey | **PASS**, retries, notes/isolation, QR, unfollow, return navigation, GPS denial, offline Stop/reconnect |
| New parity browser journey | **PASS**, real refresh-token grant with rotated access JWT preserves unsaved note and no GET reload; stored note changes only on explicit Save; synthetic photo/social round trip; pagination and roles |
| Directory synthetic load | **PASS**, 5,000 profiles, 1,000 authorized results across 20 pages of 50 without duplicates/truncation; per-page P95 **970ms**, eight concurrent queries **759ms** total wall time |
| Directory privacy negatives | **PASS**, other venues, hidden/expired/revoked access/presence, both block directions, cursor tamper/viewer/filter/venue changes, direct-ID profile/follow bypass |
| Query plans | **PASS**, compound-index scans and no collection scan on tested profile/presence paths; bounded latency assertions also pass |
| Android/iOS Hermes exports with source maps | **PASS**, 1,004 / 1,005 source entries; neither npm advisory implementation appears in these JavaScript source lists (not a general security clearance) |
| Expo version check / Doctor | **PASS**, compatible dependencies and **20/20** diagnostics |

Load timings include sandbox JWT generation, loopback requests and concurrent full-suite contention. They are a reproducible local sample, not an Atlas load test or production latency promise. Reproduce with `npm test`; metrics print in TAP diagnostics.

## Accessibility evidence and limits

The new browser script tests keyboard search and Enter activation of Clear filters, role pressed states, named controls, and current-page navigation. Axe scans Discover, Nearby, Meetups, Connections and Me with WCAG 2 A/AA and 2.1 AA tags: **zero automated violations** across these five sampled states; third-party map iframe contents are excluded. It also asserts actual computed text enlargement at 200%, no page horizontal overflow at widths 320/390/768, and saves screenshots. The 320px large-text screenshot was visually inspected; navigation wraps and all content remains scrollable. Role chips retain their horizontal scrolling container.

Native source/layout tests cover widths 320/390/1024 with font scales 1/1.3/2/3. Narrow/large-text layouts stack content, navigation wraps, text scaling remains enabled and controls have accessible roles/labels/states. These tests and compilation do not substitute for VoiceOver/TalkBack, switch control, physical screen-reader focus traversal, camera operation or real-device font-scaling acceptance. No WCAG certification or complete assistive-technology pass is claimed.

Browser evidence is uploaded by CI as `browser-evidence`, including parity screenshots and `accessibility.json`. Local generated artifacts remain ignored.

## Dependencies reused

SDK-compatible `expo-image-picker ~58.0.10` and `expo-image-manipulator ~58.0.14` (MIT) implement native photo handling using the [official picker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) and [manipulator](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/) APIs. `@axe-core/playwright ^4.14.0` (MPL-2.0) is a test-only dependency using the [official integration](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md). Locked versions and upstream license files are retained; no new framework or social feature was added.

## Release remains blocked

The [two native upstream advisories](NATIVE_SECURITY_2026-10-19.md) remain unresolved: 15 high dependency findings, no suppressed gate. Phone BLE/GPS/picker/QR and assistive-technology acceptance, installable signed builds/store requirements, and a separately authorized real community pilot with two consenting identities and an approved venue/landmarks are outstanding. Official ticket verification stays disabled without organizer authorization. Public registration and deployment remain frozen. Use the [pilot checklist](PILOT_ACCEPTANCE_CHECKLIST.md) only after separate authorization.

## GitHub verification

The [final source CI run](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39202939373) for `38eb754eec691f051c977bd4522a9e2db0be8fa3` has **test-build PASS** and **native-security FAIL**. Test-build includes all 67 tests, syntax, web production compilation, native TypeScript, Expo Doctor, three sandbox browser journeys, Android/iOS JavaScript exports, BLE autolinking, backend/web audit and Docker image build. The overall workflow correctly remains failing because of the unchanged native security gate.

[Browser screenshots and accessibility artifact](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39202939373/artifacts/12164423289) is attached to that run. The [initial implementation CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39202668606) independently passed test-build as well (backend/web audits reported zero findings).

[Native Android/iOS compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39202668603) runs against `791c9066eaf4f27e8bda2285c1ac4d898671d2c3`. Its mobile tree is byte-for-byte identical to `38eb754`: Git tree `1f1039584899a491c9f529b80147d19db7ab0753`. Both native jobs **PASS** at that revision; a JavaScript export is not native compilation or a signed distribution artifact.
