# Devcon Follow

Private conference networking: **Discover / Nearby / Meetups / Connections / Me**. This is an existing application restored from the supplied project ZIP, with working local integration and browser journeys. **It is not deployed or approved for production.**

The web and API run from one origin. The Expo client contains foreground GPS and native Bluetooth source. No public posts, feeds or likes are exposed. Community invitations never claim official Devcon ticket ownership or event admission.

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
cd mobile
npx expo install --check
npx expo-doctor
npx expo export --platform android --platform ios
```

`npm test` includes a disposable real MongoDB and a loopback sandbox OIDC issuer. The first run downloads a MongoDB binary. `test:browser` signs two independent browser contexts into that sandbox using authorization code + PKCE, then exercises community onboarding, profiles, discovery, landmark meetups, QR links, mutual follows, private chat, Stop, and retained connections. It never uses Atlas or creates production attendees. Set `CHROME_PATH` to use an existing Chromium/Chrome executable.

For the actual application, configure environment variables from `.env.example` through your secret manager, build the web client and run `npm start`. Node does not automatically load `.env`; for local development use `node --env-file=.env src/server.js`. Keep secrets out of source, commands pasted into chat, URLs and browser bundles.

## Access policies

- **Official:** only an organizer-authorized read-only verifier may grant official ticket status. Ticket images and self-entered numbers cannot establish ownership. No check-in redemption endpoint is used.
- **Community:** explicitly enable `COMMUNITY_ACCESS_ENABLED=true` with a separate random `COMMUNITY_INVITE_HMAC_KEY` of at least 32 characters. Named OIDC administrators may issue email-bound, single-use, expiring invitations. Redemption requires the matching verified email. Approval permits profiles, discovery at approved venues, meetups, connections and chat; it never grants admission or an official ticket badge. Revocation is checked on protected API reads.
- **Pending:** sign-in and account deletion work; protected networking stays locked.

Configure separate web and native OIDC public clients. Use code + PKCE, verified email, an API audience, HTTPS issuer/JWKS, exact callback allowlists, and native refresh-token rotation with `offline_access`. Web callback: `https://YOUR_ORIGIN/`. Native callback: `devconfollow://callback`. Recovery and social identity choices belong to your real identity provider. No provider has been configured yet.

## Privacy and safety

Discovery is a server-enforced 30-minute opt-in with no renewal. Latest GPS only: 75-second freshness, two-minute venue presence, no movement trail. Nearby returns uncertainty-aware distance bands without attendee coordinates. Maps display your own position and administrator-approved public places. Landmark meetings do not grant GPS access. Optional exact-location requests remain a separate recipient-specific grant.

Stop revokes samples, shares, GPS grants and radio tokens. Connections persist after leaving. Private messaging requires mutual follows; private connection notes are visible only to their author. Blocking and account deletion are enforced server-side. Wi-Fi/mobile data provide backend synchronization; no Wi-Fi Direct claim is made. Native Bluetooth and signing still require physical-device verification.

## Existing deployment infrastructure

Preserve the existing Railway `Devcon Follow` project/service and Atlas `DevconFollow` cluster identified in `WORK_HANDOFF.md`. Railway was inspected and remains **staged-create**, with no source or deployment. Atlas has no access-list entries. Configure restricted egress access; do not use a blanket `0.0.0.0/0` allowlist. No infrastructure settings were changed during this work.

The root Dockerfile builds same-origin web + API. `/health/live` checks process health; `/health/ready` checks database connectivity; `/health/release` returns 503 until authentication, an access policy, an administrator and an approved venue are configured. A healthy process alone is not release approval.

- [Build evidence and release blockers](docs/BUILD_EVIDENCE.md)
- [Operations and API permissions](docs/OPERATIONS.md)
- [Original master task](CODEX_MASTER_TASK.md)
- [Original infrastructure handoff](WORK_HANDOFF.md)

Older delivery documents describe historical source snapshots. The current evidence report takes precedence over their test counts and unverified deployment claims.
