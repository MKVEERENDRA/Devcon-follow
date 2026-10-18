# Devcon Follow — focused networking product (October 18, 2026)

**Purpose:** Find a relevant attendee, discover opted-in people nearby, meet them, and retain the connection. No public feed/posts/likes in primary navigation.

## Onboarding and ticket proof

1. Login with an actual OIDC provider and verify the email.
2. Profile (who you are, role, interests, whom you want to meet).
3. A ticket number is NOT universally required. Devcon 8 ticket purchases are handled through Pretix (https://tickets.devcon.org/) and tickets may live in Apple/Google Wallet. Official PDF QR is issued a few days before the conference; use official order-management email link if the attendee needs to retrieve ticket details.
4. An organizer-permitted, read-only Pretix integration should check paid/current ticket and attest binding between ticket and user account (or approved transferred ownership). The current `TICKET_VERIFY_URL` adapter deliberately rejects if this is not configured. Never invoke check-in redemption.
5. Without such organizer permission, verified ticket status is **not established** by screenshots, a QR, order emails, an NFT, a wallet address, or an uploaded PDF. Do NOT silently promote these to verified. Show `Ticket confirmation pending`, and explain the limitation. A restricted/non-verified applicant waitlist can be built separately, but must not inherit a verified badge or sensitive discovery access.
6. General Admission can be transferred and discounted tickets are non-transferable: consider revocation, rebind, change-of-email, stolen codes, one-account-per-current-ticket and support review, without storing raw QR secrets.

## 30-minute session

- One click starts a server-enforced **30 minute** session for approximate GPS discovery and, only in an installed and tested native app, Bluetooth token exchange.
- Two-minute native ephemeral BLE token rotation; server authenticates both sides and blocks/revocations before revealing any profile. BLE is a radio sighting, not guaranteed distance or a background promise.
- Foreground GPS sample must be <75 seconds old, presence under 120 seconds old. Check-in must refresh while on site. Any failure to refresh must fail closed; session expires without refresh or after 30 minutes, whichever comes first.
- Stop revokes general sharing, stored last location, active location grants and issued BLE tokens. Existing saved connections persist.
- No silent restart or 24-hour broadcast. Starting another session requires explicit action.

## Maps and meetup

- Display **my location** and approved **venue landmarks** on an in-app map. Public landmark is fine; GPS is fallible indoors.
- Nearby attendee profiles appear in a list with `Bluetooth detected nearby` or conservative distance bands/`distance uncertain`. Never generate a fake precise marker from proximity bands; these do not carry coordinates or bearing.
- Location of **a particular attendee** may become an exact pin ONLY after that attendee grants time-limited permission to that requester. Otherwise show `same venue` or distance category, with no exact position or route.
- Allow meeting requests: agree on a named landmark, accept/reject, use maps to navigate there; no one needs to share exact live coordinates for a meetup.
- Wi-Fi/internet are used for synchronizing messages and verification. No claim of iOS/Android interoperable Wi-Fi Direct is made.

## Essential screens

Discover / Nearby / Meetups / Connections / Me. Chat appears from a connection or meetup and is not a feed. Safety: block, report, hide profile, stop scanning, delete account.

## Status and limitations

The website and API were patched for a fixed 30-minute opt-in discovery session. The native app now uses server-issued expiry for its local countdown and removes Feed from the main tab bar. Full production builds, approved ticket API, deployed service, physical BLE tests, map rendering and native signing remain separately unverified. Removing feed from navigation does not delete legacy backend posts data/routes; migration/retention requires a separate privacy review.
