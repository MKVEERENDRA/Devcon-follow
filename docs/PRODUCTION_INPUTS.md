# Immediate deployment requirements

The GitHub source is published and Railway CLI is authenticated. No further
account-login flow is needed for the next step. Creating a ZITADEL cloud account
does not by itself configure this application's OIDC clients.

## Required from the operator now

1. In [Railway staging](https://railway.com/project/2bc6b37c-697d-4077-a23b-503ee588d595?environmentId=7377c9c3-4384-401d-bbb6-4fde0347fa73),
   manually apply the three pending settings for `devcon-follow-api`: Dockerfile
   `Dockerfile`, start `node src/server.js`, healthcheck `/health/live`. The apply
   connector rejected the operation twice, even after explicit user approval.
   It has not been bypassed through another tool. Production is still unchanged.
2. Provide the real ZITADEL **issuer URL**, **web public client ID**, **native
   public client ID**, and **API audience / project ID**. These are public
   application settings. Keep client secrets, passwords, access tokens and MongoDB
   credentials in the relevant secret manager, never chat or GitHub. An existing
   configured application may be used; no duplicate identity account is needed.

## Work remaining after those inputs

- Configure PKCE, callbacks, verified-email claims, audience/scopes and native
  refresh behavior against that actual provider, then test independent accounts.
- Configure the existing Atlas cluster and restricted Railway egress; prove
  connectivity and bootstrap/verify indexes. Existing credentials and data must
  be preserved. No `0.0.0.0/0` allowlist has been added.
- Upload local code to the existing service with the authorized Railway CLI,
  verify HTTPS health/release endpoints and run the real-provider staging journey.
- Configure the actual administrator identity and organizer-approved venue,
  event dates and public meeting landmark before attendee discovery is enabled.
- Keep official ticket verification disabled until an organizer-authorized
  read-only verifier exists. Community invitations remain a distinct access path.
- Resolve the remaining native security gate and compile/sign/test real phones
  before claiming the Android/iOS release complete.

## Evidence available

Source commit `a87b59a12a04451c1067c4c17799fc6c58d936fe`:
[CI run](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39128294639).
The `test-build` job passed, including API checks, full two-context browser journey,
native exports/autolinking, backend/web audits and Docker build. `native-security`
failed on 15 high inherited tooling findings. Local checks also pass: 52 API
tests, web production build, native TypeScript, Expo compatibility, both Hermes
exports, and 20/20 Expo Doctor checks. The scoped uuid update removed seven
moderate audit findings without disabling the security gate.

The Vercel URL remains a static frontend with registration disabled. It is not a
running authenticated API or proof of Atlas connectivity.
