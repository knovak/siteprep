# Discussion posting private test deployment — September 14, 2026

The existing Flings test Site was replaced from branch
`sweep/flings/build-message-handoff`. It remains owner-only and uses the
existing fictional rehearsal database and visitor-bound organizer/preview
sessions. No production environment exists and no access setting changed.

- Test: https://flings-test.ken-novak.chatgpt.site
- Successful deployment: September 14, 2026, 02:18:19 UTC, version **2**.
- Repository application source: `e757d7ce9cc023c44fdc486d2fadeac5d559be81`.
- Separate Sites source: `ce30c4a7ec80621e9a453e05430b941ca4593482`.
  All **180** tracked source files match the tested repository app byte for byte.
- Site project: `appgprj_6aa6c7b8bc1081918c15432f472711b9`.
- Saved version: `appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_21ef8c80e4e08191a26d172c635e5fb7`.
- Deployment: `appgdep_6aa75953462081918fabc7b2e25bd8e3`; native status `succeeded`.
- Saved archive: **99 files**, **2,437,120 bytes**;
  SHA-256 `c2869818a4ffdca3877601538f8bb6fbba64e23a08653ef106eea96fd71bbee3`.

TypeScript, lint, 96 database/HTTP/time tests, 24 desktop/phone browser journeys
and the application build passed before publication. The archive includes the
Worker, hosting manifest and all eight migrations; migration `0007` adds the
optional discussion record/link without replacing existing data. The Sites
source repository is isolated from the parent Siteprep checkout. Only tracked
application files and validated build output were copied; local secrets,
credentials and authenticated screenshot state were excluded.

The local browser evidence covers the new controls. Deployment success confirms
publication and migrations; no additional hosted organizer/member walkthrough
was run during this sweep. The repository build and current-head GitHub checks
are recorded in the PR. Selected retries and later recovery/identity/pilot
acceptance remain pending. Copying or reporting performs no real send.
