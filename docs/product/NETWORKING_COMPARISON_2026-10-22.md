# Conference networking comparison and implementation — 22 October 2026

Scope: strengthen Discover / Nearby / Meetups / Connections / Me in the existing
app. Comparison uses vendors' first-party documentation, not hands-on verification
or a claim to outperform every product. No copied vendor implementation or assets.

| Journey | Established products | Devcon Follow before this change | Implemented improvement |
| --- | --- | --- | --- |
| Find relevant people | [Brella](https://www.brella.io/event-matchmaking) describes intent/interests-based matchmaking; [Whova](https://whova.com/resources/how-to-guide/whova-app-faq/) documents recommended attendees | Secure paginated role/interest/goal search, with no personalized ordering | Suggested for you: server-ranked shared interests, roles mentioned in your meeting goal and openness to requests, with a visible reason. Standard directory remains available |
| Confirm and remember a meeting | [Swapcard](https://help-attendees.swapcard.com/en/articles/8185481-how-to-export-your-event-data-to-stay-organized) documents ICS schedule export and its lack of two-way sync | Landmark invitations, accept/decline, conflict protection, cancel/reproposal, durable in-app alerts and directions | Participant-authenticated ICS export on web and native; UTC times, stable UID, five-minute calendar alarm, clear snapshot notice |
| Meet nearby with consent | Vendor networking directories are not evidence of physical nearby detection | Exactly 30-minute explicit sessions, uncertainty-aware GPS bands, optional native BLE, separate short-lived recipient-approved exact navigation | Preserved. No fabricated radar bearings, automatic renewal or global attendee GPS pins |
| Keep relationships | [Whova](https://whova.com/pages/whova-overview/) describes notes and 1:1 messaging; Swapcard describes connected-contact exports | Persistent follows, private notes, mutual chat, QR profile preview, block/report/account deletion | Preserved; no contact scraping/export of the event directory |
| Complete event operations | Established platforms also cover organizers, registration, schedules and exhibitors | Focused attendee networking; genuine Auth0, private APK delivery, restricted Atlas, administrator binding; approved venue and physical-device acceptance still missing | These operational limits remain explicit. More UI features cannot substitute for approved places, security acceptance or real phones |

## Recommendation behavior

No paid model/API, behavioral surveillance, advertised placement or inferred
sensitive attributes. Ranking is deterministic: three points per shared normalized
interest, four if a declared role matches a role in the viewer's meeting goal, and
one for being open to meetup requests. Goal recognition is deliberately limited to
known role words and VC/venture-capital aliases; it is not semantic AI. Equal scores
use stable subject ordering. No match percentage or professional credential claim.

The server scores a lightweight candidate projection, checks current venue presence,
access and blocks before limiting the visible page, then fetches only that page's
public profiles. No fixed 100-profile candidate cap. Existing query deadlines,
page limits and scraping controls remain. Encrypted cursors bind actor, venue,
filters, sort and the viewer's current declared preferences. Profile edits require
restarting recommendations; every page rechecks visibility, blocks and membership.

## Calendar behavior and privacy

`GET /v1/meetups/:id/calendar` returns JSON `{filename, content, snapshot:true}`.
A genuine authenticated meeting participant with current access is required. The
meeting must still be accepted; blocks, target eligibility, visibility and approved
public place are checked again. Confirmed meetings can be exported without enabling
GPS or an active venue check-in. Arbitrary IDs and other participants' meetings fail.

Only meeting title, UTC time, duration and approved public landmark go into the file.
No reason, attendee GPS, notes, chat, emails, bearer token, ticket or account calendar
is exported/read. Native export uses the OS file share sheet; users choose the
receiving app. Receiving/sharing extensions are disabled. Temporary native cache is
cleared on session removal, next app startup and after 15 minutes while running.
User-imported copies remain under their own calendar's controls. Web URLs are local
blobs, revoked after download. No authenticated URL is placed in the calendar.

ICS serialization follows [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545): CRLF,
UTF-8-safe 75-octet folding, escaped text, stable UID and a five-minute display alarm.
This is a one-time export. Cancellation/rescheduling does not update an imported
calendar; both clients say so. Actual calendar-app import/share behavior still needs
phone acceptance; compilation does not prove that behavior.

## Product position

The intended strength is a short, understandable loop: find a relevant person who
has chosen to be available nearby, agree on a public meeting place, and retain a
private useful connection. This combination is a product direction, not a globally
unique invention or an unsupported superiority claim. Expanding into feeds,
gamification, lead resale or organizer ticketing would dilute that scope.

## Verification before candidate build

- Complete API/integration suite: **101 passed, zero failures/skips**. Test-file
  concurrency is explicitly two workers so multiple disposable Mongo instances
  do not compete with mobile bundling for the test machine. The eight parallel
  API-query load test and 2-second database query deadline are unchanged.
- Synthetic directory: 5,000 profiles, 1,000 authorized across 20 ordinary pages;
  personalized results include a strongest match beyond the previous 100 cap.
  Ranked cursor traversal, ties, blocks, cross-user/filter replay and changed
  preferences are covered. Strong-scoring hidden/off-venue/revoked/blocked records
  must still be excluded.
- Independent sandbox PKCE browser journey: recommendations/reasons, calendar file
  after acceptance, landmark meeting, explicit QR follow, mutual chat, private note,
  Stop and retained connection PASS. No real attendee/venue was invented.
- Browser parity/accessibility regression PASS: token refresh retains unsaved notes,
  photo/social edits, role filters, keyboard recovery and narrow/200% text layout.
- Native TypeScript, both platform Hermes exports and Expo Doctor **20/20** PASS.
- Signed candidate, exact-source Android/iOS compilation, updated deployment and
  physical calendar import are separate checks; these bullets do not claim them.
