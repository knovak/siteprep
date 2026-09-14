# Recovery preview test deployment — September 14, 2026

Refreshed the existing private Flings test Site from
`sweep/flings/build-recovery-preview-20260914`.

- Test: https://flings-test.ken-novak.chatgpt.site — owner-only, version 6.
- Production: not released yet. This is a replacement of the registered test
  environment; audience and database binding are unchanged.
- Siteprep application source: `df3277a5a638e4a72e7b64e7441a4553dcd30358`.
- Sites source revision: `d54960f96ce311fe3791eb540d44cf29e75a7b76`.
- Successful deployment: September 14, 2026, 17:20:49 UTC.
- Saved version: `appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_bb3184370e348191a8a04e890692d827`.
- Deployment: `appgdep_6aa82ce51d10819199d8c8d59af65041`.
- Saved archive receipt: 104 files, 2,693,120 bytes,
  SHA-256 `6f46cf36e8d9c74b85e6bbde09420c09bdd42934f764ad194d536209be7a85f2`.

The app build passed and its Worker, hosting manifest, static assets and nine
unchanged migrations were packaged from the exact copied application source.
Source credentials and local rehearsal secrets were excluded. All 160 local
tests, 18 browser journeys, typecheck, lint and the repository build passed.
The test deployment returned terminal `succeeded` and retained private access.

The real signed-in browser opened the deployed organizer workspace, selected
fictional Casey and the existing movie/dinner gathering, checked the committed
46-record fictional backup, loaded current account choices, selected Casey's
account for the first historical organizer and history-only for Rowan, and
displayed the proposed new-gathering inventory. It showed retained importer
access, historical-only message outcomes and no created gathering. This was a
read-only recovery check/preview; no account grant, restore or message action
was performed. Local tests establish unchanged storage and adversarial cases;
this hosted smoke check does not claim the full Phase 6 acceptance matrix.

The test environment is disposable and later deployments may replace this
version. Confirmed atomic restore and deletion remain on `build-recovery`.
