# Organizer member-profile keyboard focus

`work/app/components/organizer-page.tsx` focuses the name field when a member's
profile editor opens. The effect depends on the membership ID, so typing and
ordinary data refreshes do not move focus back to the first field.

The page remembers the membership ID in a ref and marks each edit button with
`data-edit-member`. After cancellation or a successful save and refresh, it
finds the current button for that membership, even when the member's name has
changed. Restoration waits until the page is no longer busy or initializing.
If the member is absent, the Members & invitations heading is the fallback;
if the workspace was invalidated, Reload workspace is the fallback. Neither
path changes authorization, profile revisions or save behavior.

The independent-gathering browser matrix checks keyboard entry, typing without
focus theft, cancellation without a write, and return to the renamed trigger
after saving, alongside its existing stale-profile and role-isolation checks.
Use the pinned application dependencies and local fictional server:

```sh
FLINGS_EVIDENCE=../../notes/member-profile-focus-20260920.json node test/independent-gatherings-browser.mjs
```

The evidence override preserves earlier receipts; `FLINGS_BROWSER` can select
one engine and each engine can use its own receipt filename. The hosted reproduction and
separate deployment recheck are recorded in
`notes/member-profile-focus-20260920.md`.


## Member-link reentry

`work/app/components/member-page.tsx` listens for `hashchange`. A new `code`
or `preview` fragment on an already open member page clears the current
credentials and profile, then reloads the document. The existing entry effect
captures the fragment in memory, removes it with `history.replaceState`, and
exchanges the code or checks the preview. A full document reload discards old
profile drafts, child-panel state and outstanding reads. Ordinary anchors do
not reload. No code or session lifetime changes.

This handles a browser's same-document navigation: changing only the fragment
does not remount React. Without the listener, the previous member could remain
visible and the new capability stayed in the address bar until a manual reload.

The local `work/app/test/browser.mjs` matrix checks another member's link in
the same tab, a second exchange of that same link producing a distinct session,
and an invalid replacement hiding the prior profile. It retains the existing
two-fling, stale-tab, cookie, history and request/console checks. Run with the
local fictional server and pinned dependencies:

```sh
FLINGS_EVIDENCE=test/evidence/member-link-reentry-20261010.json npm run test:browser
```

`FLINGS_BROWSER` optionally selects one engine. The evidence override preserves
the original receipt. Neither option changes the test's assertions.
