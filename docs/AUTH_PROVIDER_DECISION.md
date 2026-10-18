# Authentication provider decision — 18 October 2026

**Selected: Auth0 Free, using the existing OIDC architecture.** No ZITADEL
requirement remains. Existing provider accounts are not deleted or changed.

## Current free offers and fit

| Provider | Official offer checked today | Decision |
| --- | --- | --- |
| [Auth0 Free](https://auth0.com/pricing) | 25,000 monthly active users; signup does not require a credit card. Custom-domain verification requires a card. Social connections included subject to platform limits. | Best fit: keep react-oidc-context, Expo AuthSession PKCE and jose JWT validation. Use the tenant's standard HTTPS domain; no paid custom domain needed. |
| [Clerk Hobby](https://clerk.com/pricing) | 50,000 monthly **retained** users per app; no credit card required; fixed seven-day sessions on Hobby. MRU differs from MAU. | Good alternative, but replacing existing web/native session integrations adds work and risk without a needed capacity benefit for a thousands-attendee pilot. |
| [WorkOS AuthKit](https://workos.com/pricing) | First one million monthly active users free. Its [production-environment documentation](https://workos.com/docs/authkit/environments) requires billing information/payment setup for production. | Larger allowance is unnecessary here; billing and integration changes conflict with the requested priorities. |

Pricing and limits can change; this is a dated evaluation, not a service guarantee
or permission to incur charges. No paid plan or billing commitment was created.
Auth0 free support/rate limits are not an enterprise SLA. If the tenant exceeds
its free capacity, reassess before enabling paid usage.

## Implemented code

- Preserve Authorization Code + PKCE on both clients. API access tokens still
  require a valid asymmetric signature, exact issuer, API audience and expiry.
  A web/native ID token is rejected as an API token because its audience differs.
- Add `OIDC_EMAIL_CLAIM_NAMESPACE` to accept Auth0's signed namespaced email and
  verification claims. A mismatched namespace, string `"true"`, unverified email
  or invalid email never satisfies community invitation ownership.
- `deploy/auth0/verified-email.cjs` is the tenant Post Login Action. It copies
  canonical Auth0 user fields, never `user_metadata`, to the custom API token.
  Both clients require this deployed Action, including refresh exchanges.
- Web requests `offline_access` and revokes tokens on signout using the existing
  OIDC library. Tenant-side rotating, expiring refresh tokens must be enabled;
  requesting the scope alone does not configure that policy.
- Native requires its separate public client ID. It no longer falls back to a
  browser client. Refresh tokens and the logout ID-token hint remain in SecureStore.
  Logout stops radio/local discovery, clears local credentials before network
  cleanup, revokes the refresh token when reachable, deletes server presence and
  opens the discovered OIDC logout endpoint. Network cleanup cannot stall local
  logout indefinitely.

References: [PKCE flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce),
[Expo protected-API guide](https://auth0.com/docs/quickstart/native/react-native-expo),
[custom claims](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims),
[Post Login trigger](https://auth0.com/docs/customize/actions/explore-triggers/post-login),
[refresh rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation),
[OIDC logout](https://auth0.com/docs/authenticate/login/logout/log-users-out-of-auth0).

## Actual tenant setup required

Account signup/terms/email verification is the account owner's action. After
that, configure an API and two public applications in the same tenant:

1. API **Devcon Follow API**, identifier `https://devcon-follow.vercel.app/api`,
   RS256 access tokens, short expiry (for example ten minutes), offline access on.
2. **Devcon Follow Web**, Single Page Application, token endpoint authentication
   `none`, authorization-code + rotating refresh grants. Allow only the actual
   staging web root as callback/logout URL and its exact origin for web origins.
   Add the public production root only after release validation.
3. **Devcon Follow Native**, Native application, public token client (`none`),
   PKCE authorization-code + rotating refresh grants. Callback/logout URI:
   `devconfollow://callback`. Configure refresh expiry/reuse detection for both
   clients. Do not embed a client secret in either client.
4. Deploy the checked-in Action and add it to the Login flow. Namespace:
   `https://devcon-follow.vercel.app/claims`.
5. Enable email/password with verification. Configure a production email sender;
   Auth0's built-in mail provider is test-only and limited to ten emails/minute,
   with excess messages discarded. Its free MAU allowance does not promise free
   production SMTP delivery. See the [official email-provider guidance](https://support.auth0.com/center/s/article/Emails-to-Gmail-from-Auth0-never-arrive). Enable Google only with an authorized
   production Google connection and its credentials held by Auth0. Provider test
   keys do not certify production social login. No mail or verification status is
   fabricated by this app.

Railway settings (public identifiers, not secrets): `OIDC_ISSUER` with trailing
slash; `OIDC_JWKS_URL` from discovery; the API identifier as `OIDC_AUDIENCE`;
`WEB_OIDC_CLIENT_ID`; `NATIVE_OIDC_CLIENT_ID`; and the namespace above as
`OIDC_EMAIL_CLAIM_NAMESPACE`. Keep MongoDB and invitation keys in Railway's secret
store. Account passwords, management API tokens and provider secrets are never
requested in chat or stored in git.

## Acceptance status

Code-level provider tests exercise independently signed JWTs and the real Action
function: canonical verification, wrong audience, wrong issuer, expiry, mixed
claims and malformed namespace. These are isolated integration tests, not real
Auth0 tenant acceptance. Real-provider signup/verification, rotation/reuse,
provider logout and the two-attendee HTTPS journey remain required after tenant
configuration and Atlas connectivity. Native physical behavior remains unverified.

## Infrastructure boundary

Railway CLI is authenticated and linked to the existing project/staging
environment. The three prepared settings still require a manual apply because
the connector twice rejected applying them. No CLI upload is used to indirectly
commit that rejected pending patch. Once the operator applies it, local uploads
can target this exact service and environment without a GitHub source link.
Production remains unchanged until release checks pass.


## Tenant configuration completed — 18 October 2026

The owner authorized Auth0 management access. The existing tenant is
`dev-xs1kh1yit6q5g3ph.us.auth0.com`. Public deployment settings are tracked in
`deploy/auth0/public-settings.json`; they contain no tokens or client secrets.

- Web client `gwz7Y3PO4y7NdV15ATLynGy2LHzXwbv9`, type SPA.
- Native client `rpuStYOg5xnK645nPJvn7R8JUYtkBljZ`, type Native.
- Both public clients: authorization-code/refresh grants only, token endpoint
  authentication `none`, RS256 ID tokens with 600-second expiry. Read-back confirms
  rotating refresh tokens, seven-day absolute and one-day idle expiry, no infinite
  lifetime and zero reuse leeway. The API uses a 600-second RS256 access token.
- API ID `6ad4e39d0cbf88ba0828d734`, identifier
  `https://devcon-follow.vercel.app/api`, offline access enabled. Explicit consent
  remains required. API identifiers are audiences, not deployed API URLs.
- Verified-email Action `c1fd0877-b5c6-4d12-913b-381db683d743`, version
  `a9e17ef6-6a10-443f-b62b-20eb20340cc5`, built/deployed and bound to `post-login`.
  Binding was read back through the authenticated Management SDK; the initially
  empty flow was preserved and the Action appended.
- Web callbacks/logout allow only `https://devcon-follow.vercel.app/` and
  `http://localhost:4173/`. Native allows only `devconfollow://callback`.
  Add the actual Railway staging origin after it exists, then retest. These
  callback entries do not enable registration on the static preview.
- The MCP package automatically set
  `skip_non_verifiable_callback_uri_confirmation_prompt=true` at creation.
  Both clients were explicitly restored to `false` and read back. No callback
  confirmation protection remains disabled by this setup.
- Client secrets were redacted by MCP and are not required by either public
  client. They were not saved into app configuration. Settings can be reviewed in
  [web client](https://manage.auth0.com/dashboard/us/dev-xs1kh1yit6q5g3ph/applications/gwz7Y3PO4y7NdV15ATLynGy2LHzXwbv9/settings)
  and [native client](https://manage.auth0.com/dashboard/us/dev-xs1kh1yit6q5g3ph/applications/rpuStYOg5xnK645nPJvn7R8JUYtkBljZ/settings).

HTTPS discovery successfully advertises the expected issuer/JWKS, authorization,
token, revocation and OIDC logout endpoints, and S256 support. This establishes
provider configuration/reachability, not a successful attendee sign-in. No real
provider account exchange, email delivery, Google production connection, refresh
reuse test or two-attendee staging journey has passed yet.
