# Immediate deployment requirements

The GitHub source is published and Railway CLI is authenticated. No further
account-login flow is needed for the next step. Auth0 Free is now selected; see `AUTH_PROVIDER_DECISION.md`. An account
alone does not configure this application's OIDC clients. The older ZITADEL
request is superseded.

## Required from the operator now

1. In [Railway staging](https://railway.com/project/2bc6b37c-697d-4077-a23b-503ee588d595?environmentId=7377c9c3-4384-401d-bbb6-4fde0347fa73),
   manually apply the three pending settings for `devcon-follow-api`: Dockerfile
   `Dockerfile`, start `node src/server.js`, healthcheck `/health/live`. The apply
   connector rejected the operation twice, even after explicit user approval.
   It has not been bypassed through another tool. Production is still unchanged.
2. Auth0 account, public clients, API audience and verified-email Login Action
   are now configured. Public values are in `deploy/auth0/public-settings.json`.
   No further public client identifiers are needed from the operator. Production
   email delivery and owned Google connection credentials still need verification
   in Auth0, followed by two genuine test-account sign-ins. Never send secrets in
   chat or commit them.

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
- Resolve the remaining native security gate and sign/test real phones
  before claiming the Android/iOS release complete.

## Evidence available

Previous published baseline `a87b59a12a04451c1067c4c17799fc6c58d936fe`:
[CI run](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39128294639).
The `test-build` job passed, including API checks, full two-context browser journey,
native exports/autolinking, backend/web audits and Docker build. `native-security`
failed on 15 high inherited tooling findings. Local checks also pass: 52 API
tests, web production build, native TypeScript, Expo compatibility, both Hermes
exports, and 20/20 Expo Doctor checks. The scoped uuid update removed seven
moderate audit findings without disabling the security gate.

The Vercel URL remains a static frontend with registration disabled. It is not a
running authenticated API or proof of Atlas connectivity.

The Auth0 continuation has now passed 56 local API tests (including real signed
namespaced-token invitation checks), the existing two-context browser journey,
web production build and native typecheck. These tests still use isolated test
issuers, not a configured Auth0 tenant. Native compile-only CI is prepared for
Android and iOS simulator; it does not distribute APKs/IPAs or bypass security.


Latest remote results for `9727baa770ee294efe2ff7ebf7ac7104cc29ea98`:
[main CI](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626975)
`test-build` PASS, `native-security` FAIL;
[native compilation](https://github.com/MKVEERENDRA/Devcon-follow/actions/runs/39137626955)
Android and iOS simulator PASS. The 15 high findings remain in the current audit.
The existing Atlas cluster is running in Mumbai, but its access list is empty
and no Railway service instance exists. Database read/write/index readiness is
BLOCKED, not proven by successful disposable-database tests. Railway's trial does
not provide the Pro static-egress feature previously evaluated; a restricted
networking path must be established without assuming a paid upgrade.
