# Recovery export private-test refresh — September 14, 2026

Replaced the registered `chatgpt-site` / `sites-app` test deployment from
`initiatives/flings/work/app`: **200 tracked source files**, byte-compared with
an isolated Sites source checkout. The validated archive contains **104 files**,
**2,662,400 bytes**, including all nine D1 migrations. No schema migration, access
change, runtime-value change or production release was made.

**Test:** https://flings-test.ken-novak.chatgpt.site — owner-only/private,
version **4**, terminal deployment success at **2026-09-14T08:17:01.544572Z**.
**Production:** not released yet. Release summary: **on test, never released**.
A production release remains a separate `release-initiative` action.

The organizer's gathering page now offers a versioned JSON snapshot, a field
guide, schema and complete fictional example. Export requires the unencrypted
personal-data acknowledgement and provides a separate browser save link. It
preserves 22 business collections while excluding credentials and redacting
personal links. Edited-file validation, isolated restore and deletion remain
pending; this is not full T11 or Phase 6 acceptance.

## Deployment identity

- Site project: `appgprj_6aa6c7b8bc1081918c15432f472711b9`
- Sites source commit: `1da991af2630b2919fdcc4593e045f26ec0190ab`
- Saved version: `appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_f923d730cf9c81918f81678eb30cc406`
- Deployment: `appgdep_6aa7ad6f51f48191b427474ed68aa4da`
- Archive SHA-256: `5504c674999aa86f42541394f7986ce5f98ffd4d865cec3976ab9509182be2f7`

The source push finished before the full source SHA was read and the exact build
was packaged. Native Sites saving and private deployment returned the IDs and
terminal success above. The existing test D1 storage, Site audience and
visitor-bound fictional organizer/preview sessions were preserved.

## Evidence and limits

Local validation passed 118 database/API/time tests, type checking, lint,
application build, repository build and initiative scope checks. Eighteen
browser journeys covered recovery downloads, selected message retries and
coordination at desktop/phone sizes in Chromium, Firefox and WebKit. See
`../work/app/test/evidence/recovery-export-20260914.md` for commands and limits.

Post-build screenshots were saved and visually inspected locally:
`/Users/ken/projects/siteprep/screenshots/flings-recovery-20260914-workspace.png`,
`/Users/ken/projects/siteprep/screenshots/flings-recovery-20260914-detail.png`, and
`/Users/ken/projects/siteprep/screenshots/flings-recovery-20260914-guide.png`.
They use fictional records; private browser state and downloaded JSON remain in
disposable local storage and are not committed.

This receipt distinguishes local browser verification from the successful
hosting response. No new hosted end-to-end recovery journey, real data,
real-organizer identity, outside-member access, send, money transfer, restore
or deletion was exercised. Existing development-toolchain advisories and the
later hosted/human pilot requirements remain open.
