# Design QA — 18 October 2026

**Findings**

- [P1, unresolved verification] Native visual acceptance needs an installed build
  on real Android and iOS devices. TypeScript and Hermes exports pass, but no
  device screenshot exists. Native visual fidelity and Bluetooth behavior cannot
  be signed off from a JavaScript export.
- Web comparisons have no remaining P0/P1/P2 implementation finding within the
  supported product scope. This is an adaptation of the reference into the real
  app, not a claim of exact pixel reproduction of every generated screen.

**Evidence and normalization**

- Source truth: `docs/design/references/screen-01.png` through `screen-09.png`,
  each 941×1672, including drawn phone hardware. Screens 01, 03 and 09 were
  compared directly with browser-rendered welcome, discovery and Me states.
- Captures: `artifacts/design/welcome-live.png`, `discover-web.png`, `me-web.png`,
  `meetups-web.png`, and `nearby-web.png`. Authenticated screens use explicitly
  labeled disposable sandbox identities; the deployed welcome has sign-in off.
- CSS viewport: 390×844, browser DPR 1.2. The in-app browser capture has an
  additional empty canvas border: 390×844 or 378×818 image files contain the
  rendered page in the upper-left 325×703 or 315×682 region. Comparison images
  remove this empty canvas, normalize content width to 390px and preserve aspect
  ratio. Source phone/status chrome is cropped at (100,145)–(841,1540).
- Full comparisons: `artifacts/design/welcome-comparison.png`,
  `discover-comparison.png`, `me-comparison.png`. Source and implementation are
  in the same image. Focused readable typography/asset/card comparisons:
  `welcome-detail.png` and `discover-detail.png` in the same directory.
- Desktop deployed layout was also opened; content remains centered with a
  constrained width rather than stretching the mobile design across the screen.

**Comparison history**

1. Initial comparison identified [P2] attendee cards missing the reference's
   interest chips and direct Meet action. Added both, with separate semantic
   buttons inside an article. Captured `discover-web.png` again and compared the
   full and focused revised images. Meet opens the real landmark composer.
2. Initial Me implementation had the old centered profile/QR layout [P2]. Replaced
   it with a horizontal summary, grouped discovery/privacy rows and proximity
   explanation. Moved the social QR into a disclosure. Final `me-comparison.png`
   shows the revised layout. Unsupported location-map toggles were not added.
3. Corrected browser evidence normalization after discovering the in-app browser
   DPR/canvas discrepancy. Earlier unnormalized montages were not used to assert
   pixel fidelity. A rebuild also required restarting the local static test server
   because its startup asset list retained deleted hashed filenames; final sign-in
   and screen captures use a fresh server after the final build.

**Five fidelity surfaces**

- Typography: bundled Inter 400–700 on web, navy compact headings, subordinate
  grey text. Similarity is inferred visually; the source does not identify a font.
  Native currently uses platform text rendering and still needs device review.
- Spacing/layout: slim header, restrained radii, white cards on warm paper,
  horizontal filters and persistent five-tab navigation. Data-driven card counts
  differ from the three fictional examples. Real venue eligibility adds a status
  row absent in the mock. Me exposes existing controls through meaningful actions.
- Colors: warm #fcfbf8, navy #101d35, blue #194b78, grey secondary text and pale
  green status. No dark/mint presentation or large gradients remain in the app UI.
- Images: all nine original references retained. Onboarding uses a separate
  generated raster illustration derived from screen 01, preserving the visual
  direction without embedding a whole phone screenshot as UI. Actual attendees
  use their uploaded photo or initials, never fictional portrait substitutions.
- Copy/content: unavailable Google sign-in omitted; community access never claims
  ticket ownership; registration-disabled notice is visible publicly. No exact
  attendee map pins or unsupported automatic location/discovery claims were added.

**Interactions and checks**

- Browser: real authorization-code + PKCE against loopback-only test issuer;
  discovery, profile, direct Meet composer, Me, Nearby and Meetups navigation;
  pending/confirmed/history controls; disabled composer when no approved landmark;
  deployed welcome with disabled sign-in. No console errors reported in inspected
  browser sessions. Fresh foreground GPS remains opt-in; no browser permission was
  granted just to manufacture a nearby attendee screenshot.
- Backend: 52 tests, zero failures; syntax checks pass. Earlier two-context full
  browser acceptance evidence predates this design pass and was not rerun here.
- Web production build passes. Mobile TypeScript passes, Android/iOS Hermes exports
  pass, Expo dependency compatibility check passes. Exports are not signed apps.

**Implementation checklist**

- [x] Recover original images and implement their direction in the existing app.
- [x] Compare browser renders with sources and repair card/Me layout findings.
- [x] Verify public frontend separately from authenticated sandbox flows.
- [ ] Capture and compare installed native builds on both real platforms.
- [ ] Re-run complete two-attendee HTTPS staging acceptance after real OIDC/backend
  provisioning; this is release acceptance beyond the visual work.

**Follow-up polish**

P3: refine the illustration's internal white margins and native font matching
after device screenshots are available. Generated source images contain no font
specification or reusable original illustration layer.

final result: blocked

Blocker: native rendered evidence and real-device review are unavailable. The web
frontend is deployed and reviewed; this report does not certify a complete launch.
