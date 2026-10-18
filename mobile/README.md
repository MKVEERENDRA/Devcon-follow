# Devcon Follow native client

The Expo Android/iOS client uses the same Fastify API and eligibility checks as the web app. It includes OIDC authorization-code + PKCE sign-in, encrypted local access-token storage, verified-ticket gating, profiles, social QR follow, approved-venue check-in, temporary location sharing, and **foreground BLE discovery**.

## Wireless system

The native app uses Bluetooth Low Energy (BLE), specifically a small GATT service. When discovery is on, each phone advertises the same public service UUID and makes a short-lived random peer token readable over a GATT characteristic. It does not broadcast a name, account ID, ticket QR, phone number, or exact coordinates. The token rotates every two minutes and expires on the API after at most three minutes. The app sends observed tokens to the API, which returns an attendee only when both accounts satisfy the verified-ticket, approved-venue presence, and active-consent checks. BLE is only a discovery signal; RSSI is not presented as exact distance.

Discovery is foreground-only: keep the app open in the foreground. Stopping discovery turns off BLE and revokes the temporary location share. The PWA does not perform BLE scanning. iOS/Android radio behavior, crowded-venue performance, and cross-platform interoperability still need physical-device acceptance tests.

## Configure and install for development

1. Install Node.js 22 and npm, Android Studio with Android SDK/platform tools for Android, and Xcode for local iOS builds (macOS only).
2. Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to the HTTPS origin of the running API. Do not put server secrets in this file.
3. Configure the API's OIDC issuer, audience, JWKS URL, and public client ID. Register `devconfollow://callback` with the provider.
4. From `mobile/`, run `npm ci`, then `npm run typecheck`.
5. Generate native projects and run on a physical phone with `npx expo prebuild` followed by `npx expo run:android` or `npx expo run:ios`. Local iOS builds need macOS and Xcode. Alternatively, create an EAS development build after configuring EAS project and signing credentials. **Expo Go cannot load this custom native BLE module.**
6. Install the development build on two physical phones for the first BLE check. Enable Bluetooth and grant Nearby devices on Android; allow Bluetooth and foreground location on iOS. Sign in, complete organizer-backed ticket verification, check into an approved venue, then tap **Start for 30 minutes**. Keep both apps open in the foreground. Tap **Stop sharing and discovery** to shut down the radio and revoke consent.

The backend needs `PROXIMITY_TOKEN_HMAC_KEY`, trusted OIDC configuration, an official read-only ticket verifier, and approved event venue records. Until those are configured, eligibility checks intentionally prevent discovery. Metro exports are JavaScript bundles, not installable APK/IPA files. No signed release artifact or native device test is included yet.

## Privacy and release status

No admission QR codes are stored or redeemed, no sample attendees are created, and no location history is designed. Venue discovery requires user opt-in and an approved venue. Do not market the feature as exact-distance detection or as production-ready before the device matrix and backend launch gates in `../docs/NATIVE_PROXIMITY.md` pass.
