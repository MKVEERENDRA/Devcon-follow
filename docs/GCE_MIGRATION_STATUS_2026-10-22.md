# GCE migration progress — 22 October 2026

Owner approved a target of $5/month from the existing shared POA credits. This is
not an enforced spending cap. The owner explicitly authorized a separate Devcon
VM inside `proof-of-audits-production`; existing POA services were not modified.
The review-only status in the earlier shared-project report is superseded here.

## Created and verified

- `devcon-follow-api`, `us-central1-a`, `e2-micro`, Ubuntu 24.04, 30 GB **standard**
  persistent disk. No VM service account or API scopes. Shielded secure boot on.
- Dedicated `devcon-follow-network` and `devcon-follow-subnet` (`10.74.0.0/24`).
- Reserved Standard-tier public IP **35.206.98.214**. The VM's actual outbound
  address was independently observed to match it.
- SSH limited to the observed operator /32 and a dedicated local key; project SSH
  keys are blocked on this new instance. Only HTTP/HTTPS are public. Application
  port 8080 is to be published on loopback only. Direct operator SSH showed
  intermittent timeouts. Added `devcon-follow-iap-ssh`, scoped to this new VM tag
  and Google's authenticated IAP range only. The IAP API was already enabled;
  no project IAM permissions were changed. An actual IAP SSH session succeeded.
- Docker, Caddy, automatic security-update package, 2 GiB swap on the existing disk,
  and bounded journal configuration installed by `deploy/gce/bootstrap.sh`.
- Clean archive of source `77264e9` uploaded and Docker build completed, including
  the actual Vite build (1,702 modules). No environment secrets or APKs were placed
  in the build context. Docker build logs are private operator artifacts on the VM.
  Verified image ID:
  `sha256:e5c3961ec4d8a9ef33da908169e9f262b9cef6b43cd0a6871046cf14140aef77`.
- Temporary DNS hostname `devcon-follow.35-206-98-214.sslip.io` resolves to the VM;
  Caddy's configuration validates and a normal TLS-verified request reaches it.
  Current response is **502**, because the API has not started. This is NOT an app
  availability pass. This third-party DNS hostname is provisional, not a claimed
  owner-controlled production domain.
- Owner added exactly `35.206.98.214/32` to existing Atlas project
  `6ad3a66940fbb40c43d65f78`; independent readback confirms eight entries, preserving
  all seven existing entries. The connector's attempted mutation applied nothing.
- Full local `npm test`: **91 passed, zero failed/skipped**, including two new
  operator-configuration tests. Bash/JavaScript syntax and diff whitespace checks pass.

## Immediate blocker: database credential

Railway CLI refresh succeeded as `toantigravity@gmail.com`, but that identity lists
zero projects and cannot read the existing Devcon configuration. The independent
Railway connector also requires reauthentication. No variables were extracted.

Atlas confirms the existing users `devcon_follow_api` (database `devcon_follow`) and
`devcon_follow_staging_api` (database `devcon_follow_staging`). Their passwords cannot
be retrieved. They have NOT been reset. Attempts to create a separately scoped
`devcon_follow_gce_staging` through the connector repeatedly returned **User did not
confirm ... operation was not performed**. Do not claim that user exists or retry
the same rejected write without a changed approval/access condition.

The owner supplied a placeholder URI, not a password. The protected local file
`/home/vamshi/.local/share/devcon-follow-deploy/mongodb-uri` is still empty at this
check. Both inspected browser sessions are signed out of Atlas. A new scoped user
and its server-generated credential, or authorized access to the existing Railway
credential, are required. Browser credential entry/creation must be handed to the
owner under the computer-use confirmation policy. Do not request secrets in chat.

`scripts/prepare-gce-env.mjs` validates the dedicated username/cluster, rejects
placeholders, requires owner-only source permissions, writes a new 0600 configuration
without printing its contents, and refuses to overwrite an established file. It
sets database `devcon_follow_staging` and keeps enrollment/push closed. Its synthetic
tests prove private handling and fail-closed behavior without touching Atlas.

The systemd unit is prepared in `deploy/gce/devcon-follow.service`; installation
and `systemd-analyze verify` succeeded through the authenticated IAP session after
the direct SSH install attempt timed out. The application service is inactive.
It requires a nonempty `/etc/devcon-follow/app.env`, publishes only loopback, uses
the existing non-root Docker image, drops capabilities, limits resources/logs and
supports restart. No API service is running and no live database read/write has
been claimed. Never start it with the placeholder URI or expose a fabricated health
success while credentials are missing.

## Resume once the protected credential file is populated

1. Run `node scripts/prepare-gce-env.mjs PRIVATE_URI_FILE HTTPS_ORIGIN PRIVATE_ENV_FILE`.
   Keep the output outside the repository and transfer over the verified SSH
   connection. Install it root-owned 0600 at `/etc/devcon-follow/app.env`.
2. Verify the local image ID and systemd unit, then start the closed API. Check
   liveness, database readiness, unauthenticated 401s and expected closed client
   configuration. Release readiness is still expected to fail on admin/venue gates.
3. Verify HTTPS, trusted proxy behavior, memory pressure, graceful restart and cold
   startup. Do not automatically increase machine/disk size outside the credit target.
4. Prepare the exact Auth0 HTTPS-origin/callback changes and restricted pilot
   configuration before genuine sign-in. Preserve the existing native callback.
5. Rebuild/verify the APK against the accepted backend. Current 0.3.4/build 5 still
   targets Railway and cannot be advertised as a migrated build. The new server
   has no private APK packaged. Do not switch public website routing prematurely.

Native advisories, physical two-person acceptance, approved administrator/venue/
landmarks, final privacy notice and public-release approval remain incomplete.
This host migration alone does not make those gates pass. No POA domain, existing
service, IAM binding, secret, database or shared billing setting was changed.
