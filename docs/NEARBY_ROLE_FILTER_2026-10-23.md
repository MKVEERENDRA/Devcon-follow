# Nearby attendee role filter — 23 October 2026 (IST)

**Subsequent delivery:** [Android 0.3.9 and live Nearby evidence](ANDROID_039_DELIVERY_2026-10-23.md) supersedes the source-only distribution/deployment/venue status below. The new signed candidate includes the filter and is verified through the live installer; the web filter is published. Native security and physical-device acceptance remain unresolved.

Source commit range: `8f8e141..8f38204` (plus the sign-out state cleanup in this change).

## What shipped

Attendees already opted into a 30-minute discovery session can now narrow the **Nearby** list by the
role they want to meet ("Who do you want to meet nearby?"), on web and native.

- Shared predicate `mobile/nearby-filter.js` (`matchesNearbyRole`) with `mobile/nearby-filter.d.ts`.
- Web: radio-chip group in a `fieldset`/`legend` on the Nearby panel (`web/src/App.jsx`).
- Native: accessible radio chips above the Nearby list (`mobile/App.tsx`), reset on sign-out.
- Container web build copies the shared module (`Dockerfile`), so the production image still builds.

## Privacy contract (unchanged, and enforced by the filter's placement)

The filter only narrows the **already consented, venue-scoped `/nearby` server result** in the client.
It is not a second query, cannot add anyone to Nearby, and never uses the event directory to fill
Nearby, infer a position, or revive an expired session. Role is self-declared profile data, so the
control states the role you want to meet — it never claims a person is nearby because of their role.
A profile without a role still appears under "All" and disappears under a specific role; nothing new
is revealed about anyone who has stopped sharing.

## Verification (Node 24.22.0, disposable MongoDB + sandbox OIDC issuer, real Chromium)

| Check | Result |
| --- | --- |
| `npm run check` | PASS |
| `npm test` (integration, real Mongo + OIDC sandbox) | PASS — 122/122, zero failures/skips (was 121; +1 new filter test) |
| `node --test test/nearby-filter.test.js` | PASS — selects only roles in the eligible result, no mutation |
| `npm run build:web` (production Vite build) | PASS — 46.79s |
| `npm --prefix mobile run typecheck` | PASS |
| `npm run test:browser` (invitation policy, 2 accounts) | PASS — includes "Nearby Founder role filter includes active founder; Investor filter excludes nonmatches" |
| `node scripts/browser-journey.mjs --community` (public signup, 2 accounts) | PASS — same filter assertion, plus pre-arrival → arrival → 30-minute opt-in and departure retention |
| `npm run test:browser:reliability` | PASS |
| `npm run test:browser:parity` | PASS — axe on Discover/Nearby/Meetups/Connections/Me: 0 violations; radio group reachable and operable with arrow keys; labels not clipped at 320/390/768 px at 200% text; no horizontal overflow |

Evidence written by the browser runs: `artifacts/browser*/` (screenshots), `artifacts/browser-parity/accessibility.json`.

## Still unverified / blocked (unchanged)

- Native Nearby filter is typechecked and bundled, but has no physical-device acceptance; the signed
  0.3.8 APK does not contain this change and the native security gate is still failing.
- No live deployment was performed for this change; the GCE API and Vercel site still run `d640371`.
- Real venue geometry/landmarks and organizer ticket verification remain owner/organizer inputs.
