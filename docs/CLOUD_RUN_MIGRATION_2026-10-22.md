# Cloud Run migration preparation — 22 October 2026

Owner requested idle shutdown and authorized migration preparation. Nothing has
been deployed to Google Cloud. Existing Railway, Atlas and Vercel remain unchanged.

Read-only CLI checks using `founderproof@gmail.com` returned:

- Project `devcon-follow-2026`: `billingEnabled: false`, no billing account linked.
- An open billing account is visible to the owner. It has NOT been linked; this
  would start enabling chargeable usage and needs the owner's billing selection.

## Prepared configuration

`deploy/cloud-run/service.template.json` preserves the existing Docker application.
It selects request-based CPU, minimum zero, revision maximum one, 512 MiB and one
CPU, with a 60-minute request timeout for reconnecting Socket.IO clients. Revision
limits are not a hard currency budget or a guarantee of exactly one instance
during rollout. This is a review template, not a runnable deployment: replace the
image digest, dedicated runtime service account and VPC/subnet placeholders only
after provisioning and verification. No secrets are present. Enrollment and push
are closed by default; official ticket verification remains absent.

Use only explicit `--project=devcon-follow-2026` and
`--account=founderproof@gmail.com` arguments. The CLI default project belongs to
Proof of Audits and MUST NOT be used or changed.

## Required cutover order

1. Owner links billing to Devcon Follow. No free trial is needed. Review current
   Mumbai-region costs, budget controls and any enforcement scope before purchase.
2. Build the existing Dockerfile from a clean reviewed revision; pin its digest.
   Include the verified private APK only in the isolated delivery build context.
3. Provision dedicated runtime identity with only the required Secret Manager
   secret-version access. Transfer database credentials through protected files
   or secret APIs, never command arguments, logs or source.
4. Set up Direct VPC egress and Cloud NAT with a reserved address. Verify actual
   egress, then add only its /32 to the existing Atlas project. Keep old connectivity
   during validation; do not recreate the database or allow all IP addresses.
5. Deploy the candidate closed to enrollment. Add the exact HTTPS origin to app
   and Auth0 configuration; review proxy trust, CSP/CORS and abuse rate limiting.
   Test health, database persistence, private installer and sandbox flow behavior.
6. Address lifecycle compatibility before cutover: the browser currently retains
   an authenticated socket while hidden; open sockets keep compute billable.
   Background notification timers cannot be relied upon while CPU is throttled or
   instances are asleep. Test durable recovery after idle/restart, socket reconnect
   after timeout, and cold-start retries without losing drafts or privacy consent.
7. Rebuild and verify the APK against the accepted HTTPS API, then update the
   installer. Existing 0.3.4/build 5 still points to Railway staging. Do not relabel
   it as a Google-backed production app.
8. Retain Railway as rollback until acceptance. Public enrollment and release
   remain separate from migration: security findings, approved admin/venue and
   physical two-person acceptance have not become passing through a host change.

## Idle cost limitations

Min zero permits scale-to-zero; it does not immediately kill active requests.
Open WebSockets count as active. NAT, reserved IP, builds, image/secret storage,
network transfer and above-quota compute can still cost money. Do not promise ₹0.
No billing, APIs, paid resources, secrets, Auth0 settings or attendee data were
modified in this preparation.

References: [request-based billing](https://docs.cloud.google.com/run/docs/configuring/billing-settings),
[WebSockets](https://docs.cloud.google.com/run/docs/triggering/websockets),
[restricted static egress](https://docs.cloud.google.com/run/docs/configuring/static-outbound-ip),
[billing prerequisites](https://docs.cloud.google.com/free/docs/free-cloud-features).
