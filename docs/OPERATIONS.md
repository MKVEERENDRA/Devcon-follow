# Operations and permissions

## Provisioning order

1. Restore writable access to `MKVEERENDRA/Devcon-follow`. Current local account `Proofofaudit` has pull-only access; the connected GitHub App returned 403 for a contents write. Push the reviewed local source after repository authorization is repaired.
2. Configure a trusted OIDC provider with separate public SPA/native clients, API audience, verified email and exact redirects. Store issuer/JWKS/audience/public client IDs in Railway; put only actual administrator subjects in `ADMIN_SUBJECTS`. Do not use ID tokens as API access tokens.
3. Choose official organizer verification or explicitly labeled community invitations. Generate independent random HMAC keys in your secret manager. Enable neither with placeholder secrets.
4. Establish restricted Railway-to-Atlas networking, then verify application user permissions and index bootstrap in staging. Index option repairs refuse populated collections. Back up and review populated index changes separately.
5. Add organizer-approved venue coordinates/windows and public landmarks. Do not copy synthetic test geometry into production. Disable a venue immediately to stop on-site access. Event times are ISO instants; web admin datetime inputs use the operator's device timezone, so verify Mumbai IST explicitly.
6. Reconcile existing Railway staged changes, attach the authorized source, deploy staging, configure HTTPS and callbacks, and run the real-provider two-account journey. Do not promote with missing release gates or dependency vulnerabilities.
7. Build signed native previews after configuring EAS project ownership and signing. `mobile/eas.json` requests an Android APK. iOS needs Apple-authorized signing/distribution and macOS/Xcode/EAS compilation. JavaScript exports are not installable APK/IPA files.

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
| `GET /v1/directory`, `/v1/venue/map`, `/v1/landmarks` | Approved participant with fresh venue presence |
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
