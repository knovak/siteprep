# Coordination interface keyboard focus

`work/app/components/coordination-panel.tsx` renders the organizer and member
discussion, poll and payment forms. Opening a form removes the action buttons
until the form closes, so keeping a reference to the original button cannot
restore focus: that DOM node no longer exists.

Each opening button has a stable `data-coordination-action` key scoped to this
panel. `begin` remembers the key and opens the draft. A layout effect focuses
the first enabled input, select or textarea. Scope selection and audience
changes do not recreate the draft or refocus the form while a person types.

After Cancel, or after a successful save and its refresh finish, the effect
finds the newly rendered button with that same key. Focus returns to that
button. If an action removed its trigger, such as hiding a post, focus moves
to the panel heading, which is programmatically focusable without adding a Tab
stop. Current authorization, revisions, validation and failed-request behavior
remain in the existing request layer.

## Verification

Start the pinned local D1 runtime with `npm run dev:local`, then run:

```sh
FLINGS_EVIDENCE=test/evidence/coordination-focus-20260918.json node test/coordination-browser.mjs
```

The existing six Chromium/Firefox/WebKit desktop/phone coordination journeys
now assert keyboard entry, Cancel and save return for organizer and member
forms, poll replacement cancellation, and heading fallback after hiding a
post. They retain the discussion privacy, voting, payment attribution,
preview, closure and history assertions. `FLINGS_BROWSER` optionally selects
one engine; `FLINGS_EVIDENCE` preserves earlier dated receipts when rerunning.
These local fictional-data journeys do not establish hosted screen-reader
or independent-account acceptance.
