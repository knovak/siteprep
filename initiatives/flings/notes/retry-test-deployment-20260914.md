# Selected retries private test deployment — September 14, 2026

The existing owner-only Flings test Site was refreshed from
`sweep/flings/build-message-handoff`, preserving its fictional rehearsal
D1 database and visitor-bound organizer/preview sessions.

- Test: https://flings-test.ken-novak.chatgpt.site
- Successful deployment: September 14, 2026, 04:44:34 UTC, version **3**.
- Repository application source: `8c64a73ceb54e530dbc2b441f2481ff2a6f9b40a`.
- Separate Sites source: `cf08221ec07f47c15bc278cdfc88d79bcbaabfea`.
  All **191** tracked application files match byte for byte.
- Site: `appgprj_6aa6c7b8bc1081918c15432f472711b9`.
- Version: `appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_a6f3f0c4d0388191b48a8881dc65fd07`.
- Deployment: `appgdep_6aa77ba6fc3081918f5a0093e23f2163`; native status `succeeded`.
- Archive: **101 files**, **2,529,280 bytes**;
  SHA-256 `f61b92b767527e3097246f9c630bf82fadaa09e820d62662db43f0c11fda37cc`.

Application build, TypeScript, lint, 107 domain/API/time tests, 20 final targeted
tests and 24 browser journeys passed. The archive includes the Worker, hosting
manifest and all nine migrations. Migration `0008` adds attempts while retaining
old results as attempt 1. Source and built output were packaged in a separate
Sites repository; runtime secrets and authenticated browser state were excluded.

Local interface evidence is in the application receipt. Deployment success
confirms publication; this run does not claim an additional hosted user sitting.
Production is not released. Local Phase 4 is complete; editable recovery and
later identity, hosted and authorized pilot acceptance remain in the plan.
