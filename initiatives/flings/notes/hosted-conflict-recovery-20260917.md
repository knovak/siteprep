# Hosted stale-edit recovery — September 17, 2026

## Environment and scope

Exercised the actual [private Flings test Site](https://flings-test.ken-novak.chatgpt.site)
through two Codex in-app browser tabs on macOS 26.6.2 (25G83), using the existing
signed-in owner organizer session. Repository baseline:
`3989e91ad8fce857c9bc7970570cc3a490c08181`. The repository records test version 10;
this run did not independently inspect the deployment version or access policy.
The browser engine version was not collected.

Created one empty fictional gathering, `Hosted concurrency — fictional — 2026-09-17`,
ID `173f1751-7d21-4a0f-8e91-b3d468bbeb6f`. No existing fixture was edited, no member
was added, and no access code, message, payment or sharing action was requested.
The fixture remains available for review. No application source or deployment
was changed.

## Procedure and observations

1. Opened Edit fling details in two tabs before either saved, with the original
   title, blank description and America/Los_Angeles default zone.
2. In the first tab, saved description `Committed first edit — fictional hosted check.`
   The page displayed that value and `Gathering plan saved. No message was sent.`
3. In the still-open second form, submitted description
   `Stale second edit — must not replace the first.` The page rejected the edit,
   removed the gathering controls and displayed
   `Access or the record changed. Reload and try again.` with Reload workspace.
4. Used Reload workspace, then reopened Edit fling details. Both the page and
   description field contained the first committed value, not the stale value.
5. Entered `Fresh retry after conflict — fictional hosted check.` and activated
   Save fling details with Enter. The success message returned.
6. Reloaded the first tab from the server. It displayed the fresh retry value,
   establishing persistence across an independent page reload.

All six observations matched the expected behavior. This is an actual hosted
T12 stale-form conflict and recovery check, not a simultaneous transaction race.
The two tabs used the same organizer identity. Server status codes, database
revision/audit counts, and other stored fields were not independently inspected;
no claim of full transactional rollback follows from the visible description.
The Enter action is one keyboard activation, not a full keyboard accessibility
or screen-reader walkthrough.

## Remaining acceptance

`verify-hosted-test` remains actionable and Phase 6 incomplete. Remaining work
includes member-session and coordination writes, simultaneous mutations and
transaction rollback, code expiry, broader browser/accessibility coverage,
network/server/migration recovery and managed-host backup recovery/deletion.
Independent second-organizer sign-in and outside-member access remain separate
from the existing owner session. This receipt does not authorize or establish
pilot, real sending or production acceptance.
