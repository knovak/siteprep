# Hosted semantic checks — September 25, 2026 (UTC)

## Environment and scope

Observed thirteen UI states on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), using the native
owner session in the Codex in-app browser. The Sites read API confirmed version
14 and public access-policy revision 2. The populated fictional gathering was
`a83949b1-befc-4581-bb95-1a5b0d125ad7`. Collection finished at
`2026-09-25T16:40:02.294Z`.

These are targeted T12 DOM checks for language, page structure, control names
and ARIA references. They extend the earlier keyboard evidence. They are not an
axe run, a screen-reader walkthrough or a complete accessibility assessment.
No form was submitted: editors were opened and cancelled, deletion was cancelled
with Keep gathering, and the two member views used read-only previews. No
business records, application source, deployment or access settings changed.

## Results

Every snapshot had `lang="en"`, title `Flings`, one `main` element and one
rendered H1. The name heuristic found no unnamed selected controls. There were
no duplicate IDs, unresolved `aria-labelledby` / `aria-describedby` /
`aria-controls` references, or downward heading-level jumps greater than one.

| Observed state | Selected rendered controls | Of these, input/select/textarea | Polite live regions |
|---|---:|---:|---:|
| Organizer index | 14 | 2 | 1 |
| Populated gathering, default view | 60 | 13 | 2 |
| Write a post | 54 | 15 | 2 |
| Create a poll | 58 | 19 | 2 |
| Request a payment | 58 | 19 | 2 |
| Edit fling details | 65 | 16 | 2 |
| Add activity | 66 | 17 | 2 |
| Add event | 72 | 23 | 2 |
| Edit Alex Morgan's profile | 66 | 17 | 2 |
| Deletion confirmation open | 64 | 15 | 2 |
| Message review history expanded | 60 | 13 | 2 |
| Accepted Alex Morgan preview | 11 | 8 | 1 |
| Invited Robin Reed preview | 6 | 4 | 1 |

Counts are whole-document observations, including disabled fields and repeated
controls across states; they are not unique controls, Tab stops or accessibility
tree sizes. The visibility filter below is deliberately limited. In particular,
the dialog row includes the background document, and an element's box does not
prove it is exposed to assistive technology or visible to the user.

The open confirmation exposed a named `alertdialog`: “Delete Hosted populated
recovery — fictional — 2026-09-16 permanently?” Its `aria-labelledby` reference
resolved, and its accessibility snapshot contained the dialog content rather
than the gathering behind it. The dialog omitted `aria-modal`; this observation
does not establish how a particular screen reader announces modality. The title
input stayed empty and the confirmation checkbox unchecked before cancellation.

The expanded history snapshot included the two batch headings at H4 and their
Reported outcomes headings at H5. Presence of polite live regions is only
markup evidence: this run did not induce errors or verify spoken announcements.

## Reproduction method

Navigate through the named controls above on the populated fictional gathering.
Wait for each requested form or preview to appear in the accessibility snapshot,
then evaluate the following read-only DOM probe. Cancel each editor before
opening the next one. Do not save, confirm deletion, issue member links, approve
messages or create a new export to reproduce these checks.

```js
() => {
  const shown = e => Boolean(e.getClientRects().length) &&
    getComputedStyle(e).visibility !== 'hidden';
  const name = e => e.getAttribute('aria-label') ||
    (e.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .map(id => document.getElementById(id)?.textContent || '').join(' ') ||
    [...(e.labels || [])].map(l => l.textContent || '').join(' ') ||
    (['BUTTON', 'A', 'SUMMARY'].includes(e.tagName) ? e.textContent : '') ||
    e.getAttribute('title') || '';
  const controls = [...document.querySelectorAll(
    'input:not([type=hidden]),select,textarea,button,a[href],summary'
  )].filter(shown);
  const fields = controls.filter(e =>
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName));
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  const refs = [...document.querySelectorAll(
    '[aria-labelledby],[aria-describedby],[aria-controls]'
  )].flatMap(e => ['aria-labelledby', 'aria-describedby', 'aria-controls']
    .flatMap(attr => (e.getAttribute(attr) || '').split(/\s+/).filter(Boolean)
      .filter(id => !document.getElementById(id))
      .map(id => ({ element: e.tagName, attr, id }))));
  const headings = [...document.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,[role=heading]'
  )].filter(shown).map(e => ({
    level: Number(e.getAttribute('aria-level') || e.tagName.slice(1)),
    text: e.textContent.trim()
  }));
  return {
    path: location.pathname,
    lang: document.documentElement.lang,
    title: document.title,
    mainCount: document.querySelectorAll('main,[role=main]').length,
    visibleControls: controls.length,
    visibleFields: fields.length,
    unnamedControls: controls.filter(e => !name(e).trim()).map(e => ({
      tag: e.tagName, id: e.id, type: e.getAttribute('type')
    })),
    duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
    brokenAriaReferences: refs,
    headings,
    headingJumps: headings.flatMap((h, i) =>
      i && h.level > headings[i - 1].level + 1 ? [h] : []),
    liveRegions: [...document.querySelectorAll(
      '[role=alert],[role=status],[aria-live]'
    )].map(e => ({
      role: e.getAttribute('role'), live: e.getAttribute('aria-live')
    })),
    dialogs: [...document.querySelectorAll(
      'dialog,[role=dialog],[role=alertdialog]'
    )].filter(shown).map(e => ({
      role: e.getAttribute('role'), name: name(e).trim(),
      modal: e.getAttribute('aria-modal')
    }))
  };
}
```

The name heuristic is not the Accessible Name and Description Computation
algorithm. It does not establish label quality, group relationships, all custom
roles, accessible descriptions or whether repeated names are distinguishable.
The rendered-box filter does not exclude inert/ARIA-hidden ancestors, measure
occlusion or prove viewport intersection. The checks inspect reference
existence, not whether each ARIA attribute is appropriate for its role.

Several browser-control operations reported focus/frame/input timeouts. Fresh
accessibility snapshots established whether navigation or a click had actually
completed before continuing. Only returned DOM results are counted. These
control-channel interruptions are not application outage or recovery evidence.
No viewport override was applied; this adds no new phone-width or zoom evidence.
The temporary browser tab was closed after collection.

## Remaining acceptance

`verify-hosted-test` stays actionable and Phase 6 remains incomplete. Still open
are full automated accessibility checks, an actual screen-reader walkthrough,
text zoom, the hosted Chromium/Firefox/WebKit matrix, independent second-organizer
access, simultaneous hosted writes, expiry/rollback, managed restart/migration
recovery and provider backup retention/deletion. The authorized pilot remains
a later phase. These observations do not establish general WCAG conformance.
