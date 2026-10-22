# Attendee flow verification — 23 October 2026 (IST)

Source checked: `bfbbb1ac3be419b925dd8a63d89c52576b9c88bb`.
Requested flow: anyone joins without an invitation/ticket, creates a private-by-default profile, browses before arrival, opts into 30-minute on-site Nearby, arranges a public-landmark meeting, explicitly follows through QR, and retains connections/notes/mutual chat.

**The requested public flow is not fully working on the deployed service.** Passing sandbox tests below do not establish public availability or physical phone operation.

## Confirmed gaps

1. Live registration is still `COMMUNITY_REGISTRATION_MODE=pilot`, although `REGISTRATION_ENABLED=true` and self-service are true. Read-only inspection of only these three settings confirmed this. The owner's explicit request to allow everyone supersedes the earlier invitation-only product direction; it has not yet been implemented in the deployed policy. Venue configuration is not a prerequisite for account creation itself.
2. Discover requires `requireOnSite` in `src/directory.js`; candidates also require current same-venue presence. Web and native gate browsing on check-in. The requested pre-arrival directory needs an explicit event-directory audience and consent model, with matching web/native behavior, rather than simply exposing every stored profile or removing location privacy checks.
3. Live `/health/release` returns 503: auth/access/administrator true, approvedVenue/approvedLandmark false. Nearby/check-in and landmark meetings cannot complete against the real event configuration yet. No real venue or meeting point was invented.
4. Public `native-release.json` still has `android:null`, `androidStatus:restricted-testing`; the signed 0.3.7 APK remains authenticated/cohort-restricted. Existing verified private download evidence is separate from public distribution.
5. Native dependency audit remains red: 15 high propagated findings from the braces and node-forge advisories. No suppression or package change made during this check.
6. Phone installation, native login callback, physical GPS/BLE interoperability and real two-person use remain unverified. No new native compilation or signing was performed in this check. Existing exact-source compilation evidence remains in the delivery report.

## Fresh checks

- `npm test`: PASS, 104/104; zero failures/skips. Disposable MongoDB and independently signed sandbox identities; no Atlas attendee writes.
- `npm run check`, `npm run build:web`, `npm --prefix mobile run typecheck`: PASS.
- Directory load regression: 5,000 synthetic profiles, 1,000 authorized profiles across 20 pages, page P95 1,446 ms, eight concurrent searches 2,042 ms total, ranked first page 512 ms on this workstation. These are sandbox measurements, not a production capacity guarantee.
- Live HTTPS `/health/live` and `/health/ready`: 200. `/client-config`: authReady true. `/health/release`: 503 as above. No infrastructure configuration changed.
- Invitation-based two-browser journey: first run FAIL at the meeting-notification read-response timeout; one fresh rerun PASS through persisted notification acknowledgment, acceptance/rescheduling, calendar, explicit QR-link follows, isolated notes, mutual chat, Stop and saved connections. Preserve the first failure as an intermittent browser result; do not describe both runs as green or claim its cause established.
- Signed-out QR → sandbox PKCE → intended profile → explicit follow: PASS.
- Browser reliability: PASS for search recovery, note retry/isolation, unfollow, GPS denial, offline Stop/reconnect and navigation.
- Browser parity: PASS for real sandbox refresh preserving an unsaved note, explicit save, photo/social editing, role filters/pagination, keyboard use, axe checks across five sections, and narrow/200% text reflow.
- Public-community-mode two-browser journey: PASS without any invitations or ticket records, through signup/profile, on-site discovery, accepted/rescheduled landmark meetup, calendar, explicit QR follows, notes, mutual chat, Stop and retained connections. This proves the existing public mode works in the sandbox, not that the live service has been switched to it or that pre-arrival browsing exists.
- Installer browser checks: PASS for metadata/failure recovery and layout; private cross-origin byte-part recovery/checksum/session restoration/tamper rejection PASS with synthetic APK bytes. No new real APK download or phone installation claimed.
- Arrival browser: PASS for future approved public venue/directions before check-in, no GPS permission or presence creation, WCAG and 200% text. These public directions do not provide pre-arrival attendee browsing.

Raw local logs: `artifacts/flow-check/`. The signed APK/source/deployment identities and earlier verified real owner download are recorded in [the delivery evidence](ANDROID_037_DELIVERY_2026-10-23.md). Synthetic location and identity fixtures exist only in disposable tests.
