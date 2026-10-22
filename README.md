# Devcon Follow

A private conference networking app focused on five sections: **Discover, Nearby, Meetups, Connections and Me**. Find relevant people, explicitly opt into 30-minute discovery, arrange public-landmark meetings, scan profile QR codes and retain private connections afterward. No social feed, posts or likes.

Current delivery, 23 October 2026 (IST): [website and private Android installer](https://devcon-follow.vercel.app/install.html), signed Android **0.3.7/build 8**, healthy HTTPS GCE API and existing Atlas database. **104/104 local tests** pass. Native Android/iOS compilation passes for the signed source. Broad public registration, native security and physical-device acceptance remain blocked. [Exact artifacts, commits, CI and limitations](docs/ANDROID_037_DELIVERY_2026-10-23.md). [Current operator handoff](WORK_HANDOFF.md) supersedes historical Railway notes.

The Expo client includes foreground GPS and a native Android/iOS Bluetooth module. The React/Vite web app provides browser GPS fallback. Exact attendee location requires an explicit short-lived one-to-one approval; global discovery never returns raw attendee coordinates. Community membership is distinct from official ticket verification and event admission.

## Run and verify

Use Node 24 (Node 22.13+ also meets the native dependencies' requirements).

```sh
npm ci
npm --prefix web ci
npm --prefix mobile ci
npm run check
npm test
npm run build:web
npm --prefix mobile run typecheck
npx playwright install chromium
npm run test:browser
npm run test:browser:reliability
npm run test:browser:parity
cd mobile
npx expo install --check
npx expo-doctor
npx expo export --platform android --platform ios
```

`npm test` includes a disposable real MongoDB and a loopback sandbox OIDC issuer. The first run downloads a MongoDB binary. `test:browser` signs two independent browser contexts into that sandbox using authorization code + PKCE, then exercises community onboarding, profiles, discovery, landmark meetups, QR links, mutual follows, private chat, Stop, and retained connections. It never uses Atlas or creates production attendees. Set `CHROME_PATH` to use an existing Chromium/Chrome executable.

For the actual application, configure environment variables from `.env.example` through your secret manager, build the web client and run `npm start`. Node does not automatically load `.env`; for local development use `node --env-file=.env src/server.js`. Keep secrets out of source, commands pasted into chat, URLs and browser bundles.

## Access policies

- **Official:** only an organizer-authorized read-only verifier may grant official ticket status. Ticket images and self-entered numbers cannot establish ownership. No check-in redemption endpoint is used.
- **Basic community:** explicitly enable `COMMUNITY_SELF_SERVICE_ENABLED=true` and `COMMUNITY_REGISTRATION_MODE=pilot` with an approved server-only `COMMUNITY_PILOT_EMAILS` cohort. Validated, verified-email identities in that cohort can create a profile without tickets or invitations; revoked membership cannot be restored by signing in. Public mode requires separate release approval and defaults remain closed. Profile editing, connections and mutual chat can continue off-site; directory/Nearby discovery still require an approved venue and window.
- **Legacy invitation policy:** `COMMUNITY_ACCESS_ENABLED=true` and a separate random `COMMUNITY_INVITE_HMAC_KEY` of at least 32 characters preserve optional email-bound, single-use invitations from named OIDC administrators. This policy is not required for basic self-service membership. Neither community path grants event admission or an official ticket badge.
- **Pending:** sign-in and account deletion work; protected networking stays locked.

Configure separate web and native OIDC public clients. Use code + PKCE, verified email, an API audience, HTTPS issuer/JWKS, exact callback allowlists, and native refresh-token rotation with `offline_access`. Web callback: `https://YOUR_ORIGIN/`. Native callback: `devconfollow://callback`. Recovery and social identity choices belong to your real identity provider. Auth0 now has separate public web/native clients, an RS256 API audience and the deployed verified-email Login Action. Public settings are in `deploy/auth0/public-settings.json`. One genuine owner web sign-in, community membership and profile persistence have passed on staging. The owner web Google/email journey is configured; native/provider rotation and two-person phone acceptance remain unverified. Broad public enrollment remains disabled.

## Privacy and safety

Discovery is a server-enforced 30-minute opt-in with no renewal. Latest GPS only: 75-second freshness, two-minute venue presence, no movement trail. Nearby returns uncertainty-aware distance bands without attendee coordinates. Maps display your own position and administrator-approved public places. Landmark meetings do not grant GPS access. Optional exact-location requests remain a separate recipient-specific grant.

Stop revokes samples, shares, GPS grants and radio tokens. Connections persist after leaving. Private messaging requires mutual follows; private connection notes are visible only to their author. Blocking and account deletion are enforced server-side. Wi-Fi/mobile data provide backend synchronization; no Wi-Fi Direct claim is made. Native Bluetooth and signing still require physical-device verification.

## Existing deployment infrastructure

Preserve the existing Railway `Devcon Follow` project/service and Atlas `DevconFollow` cluster identified in `WORK_HANDOFF.md`. The owner-approved staging source `f267c5f` is deployed at `https://devcon-follow-api-staging.up.railway.app`. Liveness/readiness pass after the owner added the new observed outbound /32; unauthenticated `/v1/me` returns 401 JSON. Staging sign-in is enabled for the approved verified-email pilot cohort only. The release endpoint remains 503 because no administrator, approved venue or landmark is configured. Observed pod egress is not reserved; durable restricted networking is still unresolved. Do not use a blanket `0.0.0.0/0` allowlist. See `docs/COMMUNITY_RELEASE_CANDIDATE_2026-10-19.md` and `docs/RESTRICTED_NETWORKING.md` for the dated evidence and remaining blockers.

The root Dockerfile builds same-origin web + API. During database startup, only liveness returns 200; readiness, release and attendee routes return 503. Initialization errors are logged without driver messages or connection strings. The staging-only optional egress probe sends no credentials or attendee data.  `/health/live` checks process health; `/health/ready` checks database connectivity; `/health/release` returns 503 until authentication, an access policy, an administrator and an approved venue are configured. A healthy process alone is not release approval.

- [Build evidence and release blockers](docs/BUILD_EVIDENCE.md)
- [Operations and API permissions](docs/OPERATIONS.md)
- [Original master task](CODEX_MASTER_TASK.md)
- [Original infrastructure handoff](WORK_HANDOFF.md)

Older delivery documents describe historical source snapshots. The current evidence report takes precedence over their test counts and unverified deployment claims.
