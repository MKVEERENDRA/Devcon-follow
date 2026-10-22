# Operations and permissions

## Current deployment and recovery

The 23 October owner-authorized deployment uses the existing GCE VM, reserved Atlas egress, Auth0 and Devcon Follow Vercel project. Community registration is now **public**, while native candidate delivery has a separate tester allowlist. Do not repeat old Railway provisioning, GitHub login or rotating-IP steps. See [current evidence](PUBLIC_ENROLLMENT_2026-10-23.md) and [handoff](../WORK_HANDOFF.md) for exact image, backups, source and limitations.

Configure actual venue geometry/windows and public meeting landmarks through the existing authenticated administrator workflow. Do not copy synthetic fixtures into Atlas. A public address/directions link does not enable presence or Nearby. Native signing/physical verification and the independent security gate remain distinct from healthy web accounts.

## Administrator CLI

`scripts/admin.mjs` accepts `DEVCON_API_URL` and a short-lived `DEVCON_ADMIN_TOKEN` from the environment. Read JSON from stdin; no credentials belong in command-line arguments or files committed to git.

- `node scripts/admin.mjs invite` with `{ "email": "participant@example.org", "expiresInHours": 24, "accessDays": 7 }` returns the code **once** and a nonsecret invitation ID. Deliver the code yourself using an authorized channel. The app does not send email automatically.
- `node scripts/admin.mjs revoke INVITATION_ID` immediately revokes that grant on protected API reads.
- `node scripts/admin.mjs venue` accepts name, lat, lon, radiusMeters (50–2500), startAt/endAt (ISO), enabled. Set enabled false until approval is recorded.
- `node scripts/admin.mjs landmark` accepts venueId, name, lat, lon. A landmark must be inside its approved venue.

Invitation code/email digests are keyed HMACs. Redemption and grant creation are the same atomic MongoDB update, preventing double redemption without a cross-document transaction. Codes expire in at most seven days; access lasts at most 30 days. TTL cleanup occurs seven days after final expiry; eligibility checks never rely on TTL deletion timing.

## API authorization catalogue

All `/v1/*` responses are private/no-store. All identities come from signature-, issuer-, audience- and expiry-validated OIDC access tokens. Anonymous routes: `/client-config`, `/health/live`, `/health/ready`, `/health/release`, and public static assets.

| Routes | Required permission |
| --- | --- |
| `GET /v1/me`, `POST /v1/tickets/verify`, `POST /v1/access/redeem`, `DELETE /v1/account` | Authenticated subject; redemption additionally requires verified email |
| `DELETE /v1/presence`, `DELETE /v1/location/share` | Authenticated subject, including after community access revocation |
| `PUT /v1/profile`, `GET /v1/profiles/:userId`, follow/unfollow/following | Official or active community access; target privacy/block rules |
| `GET/PUT /v1/connections/:targetId/note` | Approved participant with their own saved follow; owner-only note |
| `POST /v1/presence/check-in` | Approved participant and accurate GPS inside an active approved venue |
| `GET /v1/directory` (default `scope=venue`), `/v1/landmarks` | Eligible participant with fresh approved venue presence; same-venue discoverable target |
| `GET /v1/directory?scope=event` | Eligible participant; target explicitly opted into `eventDirectory` and `discoverable`, active access, neither direction blocked; no GPS needed or returned |
| `GET /v1/event`, `/v1/venue/map` | Eligible participant; organizer-published public event/address or enabled valid upcoming venue only; no attendance/presence grant |
| `GET /v1/releases/android`, `/v1/releases/android/apk` | Eligible participant plus separate native tester policy in public enrollment mode; private/no-store bytes and per-part revocation check |
| `POST /v1/location/share`, `/sample`, `GET /v1/nearby` | Fresh presence plus explicit discovery consent and valid samples as applicable |
| `POST /v1/proximity/token`, `/resolve` | Active consent, fresh presence, HMAC configuration; target access/block/privacy rechecked |
| `POST /v1/location/requests`, decision, `GET /v1/location/:targetId` | Same active venue; named recipient must approve exact access; every read rechecks grants/freshness |
| `GET /v1/location/requests`, `/outgoing` | Approved participant; only own incoming/outgoing requests |
| `POST /v1/meetups` | Same active venue, discoverable eligible target, approved public landmark, future time within next 24 hours/event |
| `GET /v1/meetups`, decision | Participant only; recipient accepts/declines; either cancels; acceptance rechecks venue/time/block |
| Messages, threads, message deletion/reports | Approved participant; sends/history require mutual follows; sender-only retraction; recipient-only abuse report |
| Blocks and attendee reports | Approved participant; reports currently require on-site presence |
| All `/v1/admin/*` routes | Exact authenticated subject in `ADMIN_SUBJECTS`; invite creation also requires community mode/key |

Posting/likes/comments endpoints are not registered. Historical stored content is preserved for a separately reviewed retention migration. Account deletion still removes associated legacy content.

## Health, recovery and privacy

- Monitor HTTPS health, release gates, error/429 rates, database connectivity and resource use. Configure actual alert destinations before launch; none were provisioned here.
- Per-user rate limits prevent conference Wi-Fi users sharing one IP from exhausting one another's authenticated quota; unauthenticated requests remain IP-limited. Verify proxy trust against Railway's real forwarding topology before enabling it.
- MongoDB TTL does not authorize reads. Unique invitation, ticket, profile, connection and token indexes prevent duplicate bindings. Fresh databases are supported; nonempty incompatible indexes fail closed.
- Keep backups and verify restore behavior in a separate database. Roll back to a known image/source revision, then smoke test authenticated privacy boundaries before reopening registration. Restore testing and live monitoring remain unverified.
- GPS can be spoofed; geofences do not prove ticket ownership or exact indoor distance. Radio sightings are neither distance measurements nor proof of physical co-location. Do not enable background discovery promises.
- Meeting reminders appear in the foreground meeting list within five minutes of an accepted meeting. Invitation/decision events also notify signed-in web clients; background push notifications and delivery guarantees are not implemented.
- Internet loss can prevent immediate delivery of Stop/logout. Local radio stops; server-side freshness/expiry still bounds visibility. Verify this on actual devices and document it to operators.
- Publish a finalized privacy/support/retention policy before public registration. The included privacy summary remains a draft. Audit and abuse-report retention still require an owner-approved policy.


## Staging initialization and recovery

`REGISTRATION_ENABLED=false` keeps the hosted login UI disabled even with public
OIDC settings present. Keep it false until real authentication and access-policy
acceptance pass; it does not replace API JWT/access authorization.

At process start, a minimal HTTP listener serves `/health/live` 200 with
`phase=initializing`. All other paths return 503/no-store. Database initialization
retries every ten seconds; raw MongoDB exceptions/URIs are never logged. Once
connection and index initialization succeed, the real Fastify server takes over
and exposes its database-backed readiness/release checks. An initialization-only
response is not evidence that the attendee application is ready.

For Railway staging only, `STAGING_EGRESS_DIAGNOSTIC=true` makes one HTTPS request
to `https://api.ipify.org?format=json` and logs only a validated observed IPv4 address.
No secrets, locations or attendee data are sent. Disable the diagnostic after
networking validation. The address may change and is not a static IP guarantee.
An Atlas /32 entry for that observed address is a provisional staging path only;
remove/revalidate stale entries after redeploy and never broaden to all Internet
addresses as a fallback. Durable production networking remains a separate gate.

The existing staging service/domain is used; production is untouched. When saving
`MONGODB_URI`, use Railway's secret input (or CLI `variable set MONGODB_URI --stdin`)
without echoing the value. No URI belongs in source, shell history, screenshots,
logs or chat. Staging uses `devcon_follow_staging`, not the production database.

## October 22 product additions

- `GET /v1/directory?sort=recommended`: existing eligible on-site audience only.
  Ranking reasons are shared interests, role words in the viewer's own goal and
  declared openness to meetings. `sort=directory` preserves ordinary traversal.
  Filters, page-size bounds, query timeout and encrypted actor/venue/preference-bound
  cursors remain enforced. No attendee coordinates, hidden profiles or scores leak.
- `GET /v1/meetups/:id/calendar`: current eligible participant, accepted meeting,
  no blocks, current target access/visibility and enabled public meeting place.
  Returns a one-time ICS snapshot in JSON, never a bearer URL. No private notes,
  chat, reason, attendee GPS or email fields. Account calendar access is not used.
- Administrator-only `GET /v1/admin/landmarks?venueId=...` includes disabled public
  places for preparation. Attendees cannot use this route. The existing creation
  endpoint accepts an explicit `enabled:false`; coordinates must be inside the
  venue. `PATCH /v1/admin/landmarks/:id` accepts an `enabled` boolean.
- Me → Venue admin exposes this approval flow without needing separate credentials.
  Disabling a venue/place cancels pending/accepted meetings, marks durable
  notifications, and releases booking slots in bounded batches. Historical meeting
  data remains; disabled places are not purged. Calendar copies cannot be revoked
  or auto-updated. The operator must review coordinates and permission; no live
  venue is auto-created by deployment or tests.

Synthetic end-to-end operator verification: `node scripts/browser-admin-places.mjs`.
Use only its disposable database/test issuer. Never run it against real attendees.

### Interrupted private Android downloads

The installer uses up to 4 MiB authenticated parts advertised by `/v1/releases/android` as `rangeChunkBytes`. Each `GET /v1/releases/android/apk` part includes a single bounded `Range: bytes=START-END` and `If-Match: "SHA256"`. The API rechecks verified cohort/revocation and returns 206 with exact `Content-Range`, private/no-store and an ETag bound to the release bytes. Separate per-identity limits allow 60 part requests/minute while legacy full requests remain limited to three/minute. No credential is included in a URL. CORS exposes range/ETag headers only to existing allowed origins.

The client retains completed parts in memory during the attempt, retries only a failed part (bounded retries and 90-second part timeouts), renews an expired token through the existing OIDC session when possible, and checks full size/SHA-256 before saving. Cancel/logout/account change aborts; this does not persist a resumable file across page reloads. A changed release returns 412: refresh metadata and restart rather than combining builds. Malformed/oversized ranges return 416. Never bypass 401/403 or checksum errors. The total attempt is bounded to 20 minutes. A two-minute in-memory verified-save link is a local fallback, not a new network download or public release URL.

Regression: `node scripts/browser-private-install.mjs` now aborts a cross-origin second part and verifies the first part is not fetched again. Use `--release-directory=PRIVATE_DIRECTORY` for exact SDK-verified APK byte transport in a disposable sandbox. Genuine owner delivery for 0.3.7 is recorded separately in `docs/releases/android-037-live-delivery.json`; it does not establish phone installation or two-person BLE/GPS acceptance.

## Pre-arrival profile directory

`GET /v1/directory` accepts `scope=venue|event`, `sort=directory|recommended`, bounded literal `q`, `role`, `interest`, `openToMeet=true|false`, `limit=1..50` and encrypted `cursor`. Default scope preserves the original same-venue contract for older clients. Cursors expire after 15 minutes and bind the viewer, scope, filters and ranking preferences; tampering/scope/filter/viewer changes return 400. Every page rechecks eligibility, consent and blocks before its page limit. Queries retain a 2-second Mongo time limit and 60 requests/minute per authenticated identity. The event directory returns no coordinates, presence status, email, total account count or location grants.

`PUT /v1/profile` accepts boolean `eventDirectory`; it is true only with `discoverable=true`. Missing/false values leave pre-arrival visibility off. Existing discoverable profiles are not migrated to broader visibility. New web/native controls explain that this shares a profile with signed-in participants before/after arrival, without starting Nearby. Removing event-directory consent hides the person from new browsing; it does not silently delete previously saved connections. Hiding the profile itself still invokes existing GPS/BLE revocation behavior.
