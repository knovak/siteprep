# Gathering editor keyboard focus — September 17, 2026

## Hosted finding

On the private Flings test Site, version 10, the signed-in owner created
`Hosted keyboard acceptance — fictional — 2026-09-17`
(`456b42c8-b279-47e2-affa-1ea79f0ce83f`) and a published activity named
`Keyboard dinner — fictional`. Typing, Tab, arrow keys and Enter completed
the activity form, but saving left focus on the page. Activating Add event with
Enter left focus on its trigger; the following Tab skipped the inserted event
form and focused Existing organizer ID. This was observed in the Codex in-app
browser on macOS, not inferred from source alone.

Only fictional gathering/activity details were added. There were no members,
codes, messages or payment actions. The fixture remains available for review.
The Sites connector confirmed one owner viewer, no groups or external visitors,
and access-policy revision 1 before the update.

## Correction and local evidence

The gathering editor now focuses its title on each explicit opening, including
when replacing an already-open editor. Focus requests are separate from draft
updates, so typing does not jump back to the title. Save and Cancel restore the
opening button after the operation; a removed/disabled trigger falls back to
the Activities & events heading. Existing authority/revision checks are intact.

- TypeScript checking passed.
- All 176 existing domain/HTTP/real-local-D1 tests passed.
- Six new browser journeys passed in Chromium 143.0.7499.4, Firefox 144.0.2 and
  WebKit 26.0 at 1280 and 390 CSS pixels, on Node 23.11.0 / Darwin 25.6.0.
- Each journey checks settings, activities and events; Tab into the next field;
  focus while typing; Save/Cancel return; return after an event title changes;
  and switching editors while a form remains mounted.
- The Sites application build passed using the existing pinned dependencies.

Commands: `npm run typecheck`, `npm test`, and
`node test/authoring-focus-browser.mjs`, with the local D1 server started by
`npm run dev:local`. Machine-readable browser evidence is
`work/app/test/evidence/authoring-focus-20260917.json`.

## Acceptance limits

This closes the observed editor entry/exit focus defect, not the full T12
accessibility matrix. The local browser journeys use fictional organizer mode;
they do not substitute for independent native-account acceptance. Actual
screen-reader use, hosted member/coordination workflows, simultaneous writes,
expiry/rollback and managed-host restart/backup recovery remain open.
`verify-hosted-test` stays actionable and Phase 6 remains incomplete.
