# Google login and account loading — 24 October 2026

Two independent faults affected the Google journey:

1. Auth0 connection `google-oauth2` (`con_akqhT7gU1lzhmxCd`) had all optional Google permission groups selected, including invalid and retired scopes. Removed Calendar, Gmail, Drive, Sheets, Slides, Contacts, Tasks, YouTube, Other and Legacy permissions. Required basic/extended profile remain; Additional Scopes is empty. Reload confirmed persistence. A new Google request contained only `email profile`; the Auth0 connection tester returned **Successful transaction**. Client credentials were unchanged. App-level OIDC `offline_access` is separate and remains enabled.
2. The web Google button passed a per-request `extraQueryParams` object containing only `connection`. oidc-client-ts replaces the configured object with this override, dropping `audience`. The resulting identity-only token cannot authenticate to the API, leaving `/v1/me` rejected and the account screen loading. The button now explicitly includes both audience and connection. Account failures now show the error and offer reauthentication with the API audience retained.

`npm run test:browser:google` runs an isolated issuer/database/browser journey: click the actual Google button, assert audience + connection + PKCE, complete a sandbox login with a deliberately rejected account token, then assert the recovery request retains audience and asks for login. No real attendee is fabricated and no Google credentials are used in this test. Added to CI.

Existing sessions created without audience need one new app sign-in; retrying `/v1/me` with the same token cannot repair them. This is independent of Auth0 dashboard login. No backend, database, native binary or POA changes are required for the web fix.

Verification: `npm run check`, Vite web production build, targeted sandbox Google/recovery browser test, and all **122/122** API/regression tests passed. Staged deployment bundle matched the local tested bundle byte-for-byte. Promoted deployment `dpl_8PHn6zRctCmSPX1BJi5TY9W9pgnB` to `https://devcon-follow.vercel.app/`; the public HTML references the corrected `main-rljXMlSj.js` bundle. The old live session correctly displays the new recovery control; a fresh real-user login is checked separately from the sandbox evidence.
