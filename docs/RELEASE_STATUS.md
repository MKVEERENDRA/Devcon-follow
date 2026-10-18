# Devcon Follow — Release Status

Date: 2026-10-17

| Area | State | Evidence / blocker |
|---|---|---|
| Atlas project | CREATED | Separate "Devcon Follow" project, AWS Mumbai free cluster |
| Atlas DB | CREATED | `devcon_follow`, 12 collections |
| MongoDB unique/search/geo indexes | CREATED | 15 Atlas classic/geospatial indexes created without uniqueness/TTL options; revised bootstrap repairs safely on EMPTY collections |
| DB user | CREATED | Scoped `readWrite` on app database; credential staged as secret in Railway |
| Atlas network | NOT CONFIGURED | Zero public IP allowlist entries, needs securely configured Railway egress |
| Railway project | CREATED | Dedicated "Devcon Follow" project |
| Railway API service | STAGED | `devcon-follow-api`, staged configuration and MongoDB secret; NO source attached or running deployment |
| API source | WRITTEN | Fastify, MongoDB, OIDC, ticket adapter, profiles, QR follows, radar, meetings, admin, peer tokens |
| PWA source | WRITTEN | React/Vite, install manifest/icons, user flows; production build NOT executed due npm registry inaccessible |
| Frontend syntax parse | PASSED | Both JSX entry files parse cleanly using TypeScript TSX parser |
| Unit tests | PASSED | 23 dependency-free Node tests; NOT a full API integration test |
| User identity | BLOCKED | No configured OIDC issuer/client |
| Ticket verification | BLOCKED | No organizer-authorized ticket ownership verification integration |
| Approved venues | BLOCKED | No verified venue data, access or organizers' approval inserted |
| BLE/Wi-Fi radio | NOT IMPLEMENTED | Peer-token protocol exists; native SDK and real-device validation missing |
| Public URL | NOT DEPLOYED | GitHub connection exposed no writable repository and no suitable source upload target |

Do not mark the application production-ready until OIDC, official ticket verification, networking permissions, frontend build, security checks, and native interoperability pass.

## Additional current checks
- On 2026-10-17, 23/23 local Node unit tests passed and JS syntax checks passed. Vite build cannot run until npm dependencies can be fetched.
- `tickets`, `profiles`, `locations`, `shares`, `follows`, `blocks` and `peerTokens` were verified empty through Atlas.
- Atlas IP allowlist has 0 entries; Railway cannot directly access the Atlas cluster until network access is configured.
- Work mode handoff instructions in `WORK_HANDOFF.md`.

## Revalidation on 2026-10-18 (source ZIP review)
- `npm run check` passed for all backend JavaScript modules.
- `npm test`: 23 dependency-free tests pass; HTTP integration test cannot load the `jose` package because the package install did not complete. It must **not** be counted as passed.
- Attempted `npm ci` for backend and web; package installation unsuccessful in this environment, so a production Vite build and Docker image were not verified.
- GitHub `MKVEERENDRA/Devcon-follow`: repository is public and empty. Although repository metadata reports `push=true`, a real `create_file` attempt returned HTTP 403 `Resource not accessible by integration`; no source was pushed. Grant the installed GitHub app **Contents: read and write** on this repository.
- Railway service `devcon-follow-api`: existing production service remains **staged-create**, without a running deployment. Existing encrypted `MONGODB_URI` remains untouched.
- Official ticket verification, OIDC, venue authorization, controlled MongoDB network access, BLE real-device tests, and public launch remain blocked. Do not remove those gates for a demo.
- Changed packaging/CI Docker installs to `npm ci` for lockfile-reproducible builds.

## Engineering fixes — 2026-10-18

See `docs/DELIVERY-2026-10-18.md`. Profile photo editing was repaired; saved connections now load off-site; location and radio tokens are revoked together; index bootstrap is enforced; sensitive cache behavior and OAuth callback caching are guarded; JWT and report checks were hardened. 29 dependency-free tests pass, JavaScript syntax checks and JSX/TSX parsing pass. Deployment, bundle builds, HTTP tests and hardware tests remain unverified and blocked for the reasons documented above.
