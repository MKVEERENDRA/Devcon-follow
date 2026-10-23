# Devcon Follow — public invitation and user guide

## What can be shared today

Public web URL: https://devcon-follow.vercel.app/

Anyone can create a verified-email community account. This is an independent community project, not the official Devcon app, an admission pass or official ticket verification. There are no seeded attendees; an empty directory means nobody matching the filters has explicitly opted in yet.

Android installer: https://devcon-follow.vercel.app/install.html . The signed Android 0.3.8/build 9 is still restricted to the approved tester cohort. Do not advertise this as an unrestricted APK download. iPhone users can use the web app; there is no TestFlight release.

## Suggested post — publishable now

Going to Devcon Mumbai? Who do you actually want to meet?

I’m opening early access to Devcon Follow, an independent community app for finding people you want to meet and keeping the connection after the event.

Create a profile, share what you’re building and whom you’re looking for, and opt into the event directory. Find people by role and interests, save a connection, and chat when you both follow each other.

Maybe you’re a founder looking for a security researcher. Maybe you’re a developer looking for a team. Start with a clear reason to talk.

Try the web app: https://devcon-follow.vercel.app/

No app download is needed to get started. Android testing is currently limited; on-site Nearby and venue meetups are being prepared for Devcon.

Joining? Add the kind of person you want to meet to your profile, and tell me where the experience gets confusing.

Independent community project; not affiliated with or endorsed by Devcon.

## Short post

Heading to Devcon Mumbai? I’m opening early access to Devcon Follow: create a profile, find people by role and interests, and keep in touch after you connect.

Join the web app: https://devcon-follow.vercel.app/

Independent community project. Android testing and on-site features are still being prepared.

## User steps

1. Open the public web link and choose Get started. Complete Google/email sign-in and any required email verification.
2. Create your profile: role, interests, what you’re building and whom you want to meet. Enable profile discovery and the event directory only if you want others to find you before arrival.
3. In Discover, search/filter profiles that others chose to share. A blank directory is not evidence of a broken login or hidden fake attendees.
4. Open a person’s profile and explicitly follow/save them. QR links also open a profile; scanning never follows automatically. Mutual follows can chat. Notes about a saved connection remain private to their author.
5. At the actual event, after approved venue activation, refresh check-in with foreground GPS and explicitly start a 30-minute Nearby session. Bluetooth is optional in the native candidate; web uses GPS estimates. Stop ends location sharing. No global raw attendee location map exists.
6. Venue meetups require enabled public meeting points and on-site access. Saved connections, notes and permitted chat remain usable after leaving.

Do not describe steps 5–6 as publicly available today while venue activation is incomplete.

## Venue preparation performed

Sources checked 23 October 2026:
- https://devcon.org/en/travel-guide/
- https://tickets.devcon.org/
- https://tickets.devcon.org/ical

Official event: Devcon 8 India, Jio World Centre, G Block, BKC, Mumbai, 3–6 November 2026. Official iCalendar interval: 3 November 09:30 IST to 6 November 17:00 IST. It does not establish overnight attendee access.

A disabled draft named **Devcon 8 India · Jio World Centre** was saved through the existing signed-in administrator UI. Proposed center: 19.0639375, 72.8674375, derived from the published Mumbai Plus Code 3V78+HX (full code 7JFJ3V78+HX). Proposed radius: 250 m, an app planning choice, not an official venue boundary or ticket check. Screenshot: `artifacts/devcon-venue-draft.png`.

Draft ID: `73500a03-2e72-40e9-a573-5f27935357ed`. A database read caught the browser retaining its default times despite the edited fields. Only this new disabled draft was corrected through the existing VM to the official ISO interval `2026-11-03T04:00:00.000Z`–`2026-11-06T11:30:00.000Z`; existing records and enablement were unchanged.

The draft is not organizer approval. Do not enable it or invent halls/entrances/coffee points from a map pin. Obtain the permitted attendee boundary, event access hours and identifiable public meeting points from the venue/organizer. Keep approval provenance and revisit the continuous event interval if daily access windows are required.

## Attracting the first useful group

Lead with whom someone can meet, not Bluetooth or test counts. Ask joining people to fill in one concrete sentence: “I’m working on ___ and want to meet ___.” Invite one relevant conference community at a time, with its moderators’ permission, rather than claiming thousands of users. Do not scrape attendees or send unsolicited bulk invitations. Share screenshots of your own profile and actual consented flows; label any staged example. Measure signup-to-profile completion and successful connections using aggregate counts, without tracking precise movement.

## Public native launch still needs

- A signed APK incorporating native cleanup source `af542c5`; the current 0.3.8 APK predates that fix.
- Resolution of the documented native dependency gate or a separately recorded, explicit scoped release decision; it is still failing.
- Organizer-approved venue boundary/access windows and public meeting points, then activation through the existing administrator flow.
- Actual device acceptance for advertised native GPS/Bluetooth behavior; software cases and native compilation do not establish RF operation.

This document is copy and instructions only; no social post or message was sent.

## Subsequent owner confirmation

The owner explicitly confirmed this configuration on 23 October. Venue `73500a03-2e72-40e9-a573-5f27935357ed` is now enabled under independent community-app owner approval; it is not organizer-endorsed. Its event interval remains future-dated, so this does not grant pre-event presence. A real public meeting point remains unconfigured. No named security-risk acceptance or physical-device pass is inferred from the confirmation. Android/iOS source compilation for `af542c5` both passed.
