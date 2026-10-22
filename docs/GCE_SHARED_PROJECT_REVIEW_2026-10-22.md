# Shared-project hosting review — 22 October 2026

The owner now explicitly authorizes investigating a new isolated Devcon instance
inside `proof-of-audits-production`, using a small amount of that account's credits.
This supersedes the blanket prohibition on adding Devcon resources to that project;
it does not authorize changing any existing Proof of Audits deployment, IAM policy,
domain, secret, database, budget, default network or instance. The cash limit is ₹0.

Read-only checks confirmed billing is enabled. The billing account differs from
the currently linked Devcon project account. Its Credits console shows an available
Google for Startups Start grant; the trial grant is expired. Exact private financial
evidence is retained only in ignored local artifacts. The console describes the
grant scope as certain usage, not an unconditional zero-cash guarantee. It also
shows mandatory owner identity verification due 11 November 2026; no identity
documents were submitted by the agent.

The POA production project currently lists no Compute Engine instances, disks or
reserved addresses. The other two linked projects return Compute API disabled;
the agent did not enable those APIs. This inventory does not prove historical
billing-month usage or an unused account-wide free allowance.

`deploy/gce/devcon-instance-plan.json` records the concrete minimal VM candidate.
It is NOT provisioned. It uses one eligible US e2-micro, 30 GB standard disk, a
dedicated VPC and reserved IPv4, and excludes NAT/load-balancer/database extras.
US-to-Mumbai Atlas latency and the small VM's memory/CPU capacity need validation.
Public IPv4 alone is approximately $3.65/month before tax at $0.005/hour; excess
transfer, compute/disk quota consumption, storage or other usage can add cost.
Free allowances are shared per billing account, not multiplied per project.

No hard spending cap or guaranteed credit-only payment mechanism has been
established. A budget alert cannot be represented as a hard stop. Do not disable
billing for the shared POA project as a Devcon cost-control measure: that could
stop POA itself. Resource labels help attribution but do not isolate billing.

Before resource creation, settle the bounded credit allocation and whether the
owner accepts residual cash/tax exposure. The user's authorization to use credits
must not silently become permission to charge their card after shared credits
expire or are consumed by POA. No new Google cloud resources were created here.

References: [free-tier scope](https://docs.cloud.google.com/free/docs/free-cloud-features),
[network pricing](https://cloud.google.com/vpc/network-pricing),
[startup credit scope](https://cloud.google.com/startup/faq).
