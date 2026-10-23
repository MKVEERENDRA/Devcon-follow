# Discovery software verification — 23 October 2026

The owner requested executable GPS/Bluetooth software tests without waiting for physical phones. No live attendee data, production venue, Atlas configuration or infrastructure was changed.

## Fix

`mobile/radio.ts` now delegates its radio lifecycle to `mobile/radio-session.js`, the same production helper exercised by Node tests. Android permission requests and Expo native-module selection remain in the adapter. Failed startup now stops partially initialized native resources. Fatal radio events and synchronous/asynchronous rotation failures stop Bluetooth, detach listeners and discard queued callbacks. Stop is idempotent, including when the native stop method throws. GPS fallback remains owned by the existing foreground discovery session.

A temporary copy of the previous lifecycle, with only native dependencies injected, failed 11 of the 12 new behavioral cases. The corrected production helper passes all 12. The comparison log is `artifacts/discovery-software/prior-radio-regression.log`; no temporary comparison implementation ships in the app.

## Results

| Check | Result |
| --- | --- |
| Full automated suite | PASS — 121/121, zero failures/skips |
| New executable native radio cases | PASS — 12/12 |
| Disposable-database reliability cases | PASS — 5/5, including two new GPS/BLE cases |
| Two-account browser journey | PASS |
| Node syntax / native TypeScript | PASS |
| Android and iOS Hermes exports | PASS — 2.8 MB bundles each |
| Native dependency security gate | FAIL — 15 high, zero critical |

## Executed cases

- Permission rejection never subscribes or starts Bluetooth.
- Successful startup/token rotation, repeated Stop, malformed events and callbacks queued after Stop.
- Fatal unavailable, scan, advertising, GATT-service and permission events each stop and detach the radio.
- Partial startup failure; synchronous/asynchronous rotation failure; fatal event while startup is pending; native stop throwing.
- Real disposable MongoDB with independently signed sandbox identities: GPS-only discovery with zero BLE tokens, uncertainty-aware distance, poor/invalid accuracy, boundary uncertainty, off-venue samples, stale readings/presence and disabled venue.
- BLE token uniqueness, duplicate-sighting deduplication, malformed/oversized batches, expired-token replay, cross-venue isolation, blocking and explicit departure cleanup. Responses expose no raw attendee positions or BLE distance.
- Existing integration regression retains server-enforced 30-minute expiry, concurrent-start rejection, Stop revoking GPS/BLE and one-to-one location grants without relying on eventual MongoDB TTL deletion.
- Complete two-browser public-community journey passes: PKCE sign-in, pre-arrival directory, check-in, 30-minute Nearby, meetup/reschedule, QR-link explicit follow, private notes/chat, Stop, departure and retained chat.

Reproduce with Node 24:

```sh
node --test test/native-radio.test.js test/pilot-reliability.integration.test.js
npm test
npm run check
npm --prefix mobile run typecheck
CHROME_PATH=/opt/google/chrome/chrome node scripts/browser-journey.mjs --community
cd mobile
npx expo export --platform android --platform ios --output-dir ../artifacts/discovery-software/native-export
```

Full logs are local in `artifacts/discovery-software/` (ignored build/test evidence). The normal CI test glob automatically includes the new tests; native source changes trigger existing Android/iOS compile jobs.

## Evidence limits and release impact

These are executed production JavaScript lifecycle tests with injected native boundaries, real sandbox API/database integration and a browser journey. They do not execute Android/iOS Bluetooth drivers or establish physical RF interoperability, GPS sensor accuracy or indoor bearings. Synthetic approved venues are confined to a disposable database; testing venue validation does not configure an actual event venue.

The existing signed Android 0.3.8/build 9 still contains source `d640371`; this source fix requires a subsequent signed APK before phone users receive it. It has not been silently added to the existing APK or deployed to the backend. The independent native dependency audit still fails: 15 high findings, zero critical, associated with the previously documented braces/node-forge roots. No gate was suppressed and no risk acceptance was invented.
