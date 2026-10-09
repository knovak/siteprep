# Hosted browser zoom — October 9, 2026 (UTC)

## Scope and environment

Targeted T4/T12 checks on the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site),
from repository baseline `acbdc79fefd532b673a48802f0d860fd5b92eeab`.
The deployment record names version 16; this run did not query Sites metadata
or deploy application code. Google Chrome 154.0.8037.98 ran on macOS 26.6.2
(25G83), using the existing native owner identity.

The September 18 reflow receipt and October 8 member-offset receipt left zoom
acceptance open. This run checks actual **browser page zoom**, including the
event editor and accepted-member preview. It is not text-only enlargement,
a full accessibility audit, or completion of Phase 6.

## Method

Chrome's native View menu and zoom popup set 200% and 400%; the native
accessibility tree reported those percentages, and the page reported
`devicePixelRatio` 2 and 4 respectively. No CSS zoom or viewport emulation
was applied. The browser window's content width was 1200 pixels at 100%.

The existing fictional gathering was
`7149a04f-4100-4d26-8db4-de35042a7e85`, with its October 8 accepted member.
At each zoom level, read-only DOM probes measured document width and the
bounding rectangles of nonzero-size buttons, inputs, selects, textareas and
links within `main`. Viewport screenshots were inspected during the session.
The [structured receipt](hosted-zoom-20261009.json) records the observations.

## Results

| Surface | Zoom | CSS viewport | Document client / scroll width | Measured controls | Controls outside width |
| --- | ---: | --- | --- | ---: | --- |
| Organizer | 200% | 600 × 594 | 592 / 592 | 42 | Two hidden checkbox inputs only |
| Event editor | 200% | 600 × 594 | 592 / 592 | 56 | Two hidden checkbox inputs only |
| Accepted-member preview | 200% | 600 × 594 | 592 / 592 | 6 | None |
| Organizer | 400% | 300 × 297 | 296 / 296 | 42 | Two hidden checkbox inputs only |
| Event editor | 400% | 300 × 297 | 296 / 296 | 56 | Two hidden checkbox inputs only |
| Accepted-member preview | 400% | 300 × 297 | 296 / 296 | 6 | None |

The two inputs are intentionally hidden checkbox backing elements:
`aria-hidden=true`, `tabindex=-1`, 1 × 1 pixels, clipped with
`clip-path: inset(50%)` and a -1-pixel margin. Their measured left/right
edges were -1/0. No other measured application control exceeded the document
width, and none of the six layouts required horizontal document scrolling.

Both endpoint offsets and `America/Los_Angeles` remained in the rendered
event summaries. The accepted preview's two `time` elements retained
`2026-11-01T08:30:00.000Z` and `2026-11-01T09:15:00.000Z`.
Screenshot inspection showed the preview's date/offset/zone text wrapping at
400%, and the event and contact cards remained readable with vertical scrolling.
This does not prove that every glyph, native select option or focus outline
is visible in every state.

At both zoom levels, Enter on the event's Edit button opened the form with
focus on `author-title`. Enter on Cancel editing closed it and returned focus
to the same event's Edit button. No field was edited or saved. These controls
were targeted directly by browser tooling before Enter; this is not a complete
sequential keyboard journey. The accepted preview continued to show its
read-only notice, accepted status and disabled profile fieldset. Refresh
coordination remained usable.

## Limits, excluded attempts and cleanup

An attempted sequential Tab walk reached the native date-time input, where
the automation's `:focus` locator stopped matching. The unfinished walk is
excluded from passing evidence. An initial browser-level zoom shortcut did
not change the measured pixel ratio; only native-menu-confirmed zoom states
are counted. A first organizer view in the in-app browser and a separate
Chrome organizer tab both carried the owner account, so neither is claimed
as signed-out-member evidence.

The 400% title input displayed only part of its long value at once, as a
single-line input normally does; the control itself fit the page. The host's
floating Edit site toolbar overlaid part of the viewport and was excluded
from the application's `main` control measurements. Screenshots were viewed
in the session, not saved as repository artifacts.

Zoom was reset to 100%: pixel ratio 1, viewport 1200 × 1189, document widths
1185/1185. Temporary tabs were closed. The existing Chrome and ChatGPT
sessions were left signed in. No business form, message, invitation,
organizer assignment, restore, delete, publication or sharing action was
submitted. Preview issuance and ordinary reads may create application/host
audit records; no database before/after comparison was performed.

This adds six targeted hosted page-zoom observations. It does not establish
text-only zoom, other browser engines, screen-reader acceptance, independent
organizer identity, a valid signed-out member journey, the remaining hosted
authorization/concurrency matrix, or managed-provider recovery and retention.
`verify-hosted-test` and Phase 6 remain open.

Only documentation and sanitized evidence change. Repository build and scope
checks validate the PR; no app-source change or test redeployment is needed.

