# Flings private test deployment — September 13, 2026

The requested first test Site is live at
[flings-test.ken-novak.chatgpt.site](https://flings-test.ken-novak.chatgpt.site).
It is owner-only and requires ChatGPT sign-in. The owner can select fictional
organizers Casey, Rowan or Sam and open the three example member pages.
The test uses its own D1 database and runtime secret; edits persist.
Production has not been released.

## Deployment receipt

- Sites project: `appgprj_6aa6c7b8bc1081918c15432f472711b9`.
- Saved version: **1**, `appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_f0324a417b80819192b8fc3d4f73661f`.
- Deployment: `appgdep_6aa6caefafd08191983e724eb1f123c2`; terminal status **succeeded**.
- First observed success: **2026-09-13T16:10:38.628487Z**.
- Runtime environment revision: **1**.
- Repository source: `8ee0421b20a0ac19960c1b0d9291113075652a35`,
  `initiatives/flings/work/app`.
- Independent Sites source commit:
  `ae50c03fa84138222001aa135b009861e7e68352`.
  All 170 source files match the repository app byte for byte.
- Saved archive: **97 files**,
  **2365440 bytes**;
  `sha256:370676e57e5b6e22cb19b8674efd8ca3dd094e13ee05eb042ea9667d61eeced3`.
  The package includes the Worker, client assets, project metadata and seven
  Drizzle migrations. The clean local transport archive is 570,594 bytes.
- Access was verified as owner-only and the private publishing operation
  preserved it. No public access, groups, outside viewers or real sending
  providers were added. Secrets and sign-in tokens are absent from this receipt.

## Verification

Before publishing: `npm ci`, TypeScript, lint, 87 database/domain/HTTP/time
tests and the application build passed. Four added tests cover the explicit
private-test mode, trusted Site identity, HTTPS/exact origin, visitor-bound
organizer and preview tickets, current assignment, member exchange and CSRF.
The production dependency audit has zero findings; the development toolchain
still has six moderate and four high findings, detailed in
[the preflight receipt](../work/app/test/evidence/private-test-preflight-20260913.json).

All six existing member browser journeys passed again across Chromium, Firefox
and WebKit at desktop/phone sizes on the updated dependency stack. Their
[separate receipt](private-test-browser-regression-20260913.json) preserves the
earlier phase evidence.

Hosted checks used the real browser sign-in flow, not an identity-less bypass:
the anonymous Site showed its sign-in gate, the existing owner signed in,
Casey's assigned gathering list and outing detail loaded, and Alex's member
page opened with the code removed from the address. Live D1 inspection found
all 23 application tables. The initial organizer workspace 401 occurs
before a fictional organizer is selected; subsequent reads succeed. Observed
Worker logs showed no server exception; the unrelated favicon route is absent.

## Limits and next work

This is an early fictional rehearsal requested before Phase 4/recovery are
complete. It does not establish independent real-organizer identity, login-free
outside-member access, editable recovery, complete Phase 6 acceptance or a
live sending pilot. Remaining Phase 4 work is the optional atomic discussion
post and selected retries with account-history inspection and attempt tracking.
