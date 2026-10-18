# Restricted Railway → Atlas networking

Current restricted staging connectivity uses `152.55.180.192/32`. It recovered
readiness without a database reset. This address is observed pod egress, not a
reserved address. A previous deployment used `34.186.54.95/32`; do not assume it
is still needed or delete it without checking other consumers.

## Durable option for the existing services

[Railway static outbound IPs](https://docs.railway.com/networking/static-outbound-ips)
are available on Pro. The [plan documentation](https://docs.railway.com/pricing/plans)
listed Pro at $20/month including $20 usage when investigated on 19 October 2026.
The current trial cannot reserve these IPs. No paid upgrade was purchased.

After billing authorization, enable static outbound IPs for this service in the
existing project/environment. Record every assigned IP, add each to Atlas as an
individual /32, then perform a controlled staging redeploy. Verify actual egress
and database read/write/index readiness before removing old entries unused by
other workloads. Reserve all assigned addresses needed by the selected topology;
do not assume one pod address covers future replicas or regions.

Keep TLS, the existing cluster restriction and the staging user's readWrite scope
limited to `devcon_follow_staging`. Never open `0.0.0.0/0` or a broad provider range
to make deployment pass. Store connection credentials only in encrypted server
configuration. Retain the previous deployment and allowlist until recovery is
proven; roll back the application if needed without recreating Atlas.

## Alternatives and limits

Atlas Free does not support private endpoints or VPC peering; see the
[Free limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
and [private endpoint requirements](https://www.mongodb.com/docs/atlas/security-private-endpoint/).
A private-network design requires appropriate paid Atlas/network infrastructure,
not merely toggling a Railway variable. It is not provisioned here.

An owner-controlled fixed-egress NAT/tunnel could be another design, but no such
host or verified authenticated route is currently available. It is not a promised
free solution. Temporary Atlas entries can expire within seven days according to
the [IP access-list documentation](https://www.mongodb.com/docs/atlas/security/ip-access-list/);
expiry must be tracked operationally. IP discovery after every failure remains a
staging workaround, not durable production networking.

Further live probes/redeploys are paused by the owner's latest instruction to
focus on building. This document records the investigation, not an implemented
static-egress solution.

## Budget-conscious alternative (design only, not provisioned)

An owner-operated fixed-IP VM can run the **same existing Docker image** instead
of adding a second NAT/proxy layer to Railway. As a concrete price reference,
[AWS Lightsail bundles](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html)
listed the 1 GB Linux public-IPv4 bundle at $7/month on 19 October 2026. This is a
pilot sizing candidate, not a tested capacity promise. Region, transfer overage,
backups, taxes and operator time affect actual cost; avoid assuming promotional
credits. A smaller $5 bundle exists, but memory headroom is unverified for this app.

Attach a reserved IPv4 to the instance and prove it is the actual outbound source
before Atlas allowlisting. Lightsail documents
[static IPv4 networking](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-networking.html).
Allowlist only that verified /32. Use a domain with TLS termination, expose HTTPS
only (and tightly restricted operator SSH), run the existing app as its non-root
container user, store secrets in protected server configuration and keep MongoDB
hosted in the existing Atlas cluster. Build the image in CI rather than on a tiny
VM. Pin the deployed digest and define patching, backups, restart and rollback.

This trades managed Railway operations for VM maintenance and a single-host
failure risk. It also changes hosting, HTTPS origins and Auth0 callback settings;
all need explicit owner approval and a staged cutover. It has **not** been tested,
purchased or selected. Pro static egress remains the least disruptive option for
retaining Railway. A free, durable restricted route on the present trial has not
been established; repeatedly adding arbitrary pod IPs is not the recommended plan.
