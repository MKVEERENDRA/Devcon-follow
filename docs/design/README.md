# Devcon Follow visual reference

The nine original ChatGPT-generated screens were retrieved from the user's
“Production setup request” conversation on 18 October 2026. They are saved in
`references/screen-01.png` through `screen-09.png` in gallery order.

The implemented direction uses warm white surfaces, navy text, restrained blue
actions, Inter on web, compact attendee cards, and five primary navigation tabs.
The welcome illustration was generated from screen 01 as a separate decorative
asset. Fictional portraits in that illustration are never directory attendees.

Intentional product differences: no Google button without a configured provider;
community approval is distinct from official ticket ownership; no public attendee
GPS pins; Bluetooth support is described accurately by platform. Filters and
profile fields use existing API capabilities. Test participants stay in disposable
loopback-only MongoDB, never Atlas or the public frontend.

## Hosted frontend

https://devcon-follow.vercel.app is a frontend-only release with registration
disabled. Vercel project: `prj_eOSHP6OdmTSBzqAyAyHv10QA0mEO`, account: mkveerendra.
Vercel assigned the first deployment to its production target automatically;
that platform label does not mean the complete application has launched.

Reproduce the static payload with Node 24:

```sh
npm run build:web
node scripts/prepare-vercel-preview.mjs
```

Deploy only `artifacts/vercel-preview/` for this limited preview. Do not upload
environment files, the local test issuer, or fixtures. The Fastify backend still
requires real OIDC, configured infrastructure and HTTPS acceptance checks before
an operational community pilot.

See the root `design-qa.md` for screenshots, checks, and remaining native QA.
