# Native organizer identity acceptance — September 15, 2026

## Local evidence

- `npm ci` used the existing lockfile. TypeScript and lint pass.
- All 176 real-D1/domain/HTTP/time tests pass, including six native identity
  tests. The denial, account-pinning, race, CSRF, preview and capability cases
  are enumerated in `../../../../NATIVE_AUTH_TECHDOC.md`.
- Six new native organizer journeys pass on Chromium, Firefox and WebKit,
  each at 1280×900 and 390×844. See `native-identity-browser-20260915.json`.
  This exercises actual UI and D1 through a fictional dispatcher simulation;
  none of the test identities is a real ChatGPT login.
- Six existing complete restore/deletion browser journeys also pass. Their new
  receipt is `recovery-native-regression-20260915.json`; prior receipts are
  preserved. The regression uses the unchanged local fictional identity mode.

The initial assertions were corrected to match the existing domain's 409
current-authority rejection, rather than expecting 403/401; rejection remained
mandatory. Browser tests now bound waits and assert the visible account-change
error without assuming the second account had already enrolled.

## Hosted boundary

The current private Site's access list was inspected: Ken is its only viewer,
with no external visitors. Lucas has not independently signed in. Native mode
requires runtime configuration using the two approved accounts; it does not
modify the Site audience or assign real accounts to existing fictional flings.
Actual deployment and owner-session results are recorded separately in
`../../../../notes/native-hosted-acceptance-20260915.md` when performed.

Full hosted T1-T12, a screen-reader walkthrough, interruption/restart testing,
independent second-organizer use and provider-specific database backup recovery
remain pending. Local tests cannot establish those facts. No real member data,
recipient sending, public access, pilot or production release is established.
