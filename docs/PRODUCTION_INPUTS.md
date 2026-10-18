> Current status (19 October): staging database readiness recovered; one real pending Auth0 identity was validated before the owner stopped live testing. New product changes are local source, not a deployment. See [current build report](PRODUCT_BUILD_2026-10-19.md) and [restricted networking](RESTRICTED_NETWORKING.md). Older entries below are historical, not instructions to repeat completed setup.

# Immediate deployment requirements

The GitHub source is published and Railway CLI is authenticated. No further
account-login flow is needed for the next step. Auth0 Free is now selected; see `AUTH_PROVIDER_DECISION.md`. An account
alone does not configure this application's OIDC clients. The older ZITADEL
request is superseded.

## Current staging deployment

The operator applied the three Railway settings. That step is complete and must
not be requested again. The authorized CLI uploaded source `8ac1514` to the existing
service in staging. Deployment `b9c3a460-f5fc-41ff-b3e7-be1899d58891` reports SUCCESS,
with zero pending staging changes.

Staging HTTPS: https://devcon-follow-api-staging.up.railway.app

Public Auth0 variables, server port/origin, database name `devcon_follow_staging`
and explicit `REGISTRATION_ENABLED=false` / `COMMUNITY_ACCESS_ENABLED=false` are
configured. The exact staging callback/logout/origin was added to the existing
Auth0 web client. No production deployment or variable change was made.

## Current networking blocker

The owner completed the scoped database user and saved `MONGODB_URI` securely.
Read-back confirms the staging username/host/database structure without printing
credentials. Atlas permits only the initial deployment IP `34.186.54.95/32`.

Reloading the existing image to pick up the secret created deployment
`57e8baab-b82b-408a-81c2-f624d1cf1f1c`. Its observed egress changed to
`152.55.180.192`. Add only `152.55.180.192/32` in Atlas, preferably temporarily;
the running process retries database startup without another deployment. Do not
broaden the range. The original allowlist entry does not cover the current pod.
Remove/revalidate old deployment entries after confirming they are no longer used.

The scoped Atlas user is `devcon_follow_staging_api`, with `readWrite` only on
`devcon_follow_staging`, restricted to `DevconFollow`. The original production
user/database were preserved. Do not recreate or request the DB secret again.

Both Atlas mutations originally returned an approval rejection, so the agent did
not bypass them through another tool. The owner completed them externally. The
current-IP follow-up remains the exact owner action requested, not another
Railway settings-apply request. Dynamic egress is a staging-only limitation;
a stable restricted production network path remains required.

Auth0 identifiers are already configured; none need to be supplied again.
Production email delivery and owned Google connection credentials still need
verification in Auth0, followed by two genuine attendee/test-account sign-ins.

## Work remaining after those inputs

- Configure PKCE, callbacks, verified-email claims, audience/scopes and native
  refresh behavior against that actual provider, then test independent accounts.
- Configure the existing Atlas cluster and restricted Railway egress; prove
  connectivity and bootstrap/verify indexes. Existing credentials and data must
  be preserved. No `0.0.0.0/0` allowlist has been added.
- After the current-IP network action, verify database connectivity and
  indexes, then run the real-provider staging journey against the uploaded code.
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
The existing Atlas cluster is running in Mumbai, but its access list now contains the previous staging IP only. Database read/write/index readiness is
BLOCKED, not proven by successful disposable-database tests. Railway's trial does
not provide the Pro static-egress feature previously evaluated; a restricted
networking path must be established without assuming a paid upgrade.


Live HTTPS checks after the staging upload: `/health/live` 200 with
`phase=initializing`; `/health/ready`, `/health/release`, `/client-config` and
`/v1/me` 503. The startup gate makes process health observable but does not serve
attendee routes until database connection/index initialization succeeds. A Railway
SUCCESS deployment is not an application-readiness or release PASS.
