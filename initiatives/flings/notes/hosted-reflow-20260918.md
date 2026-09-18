# Hosted reflow and keyboard checks — September 18, 2026 (UTC)

Continued T12 acceptance on the existing private Flings test Site, recorded as
version 12. The macOS Codex in-app browser used the actual owner's native
organizer session and the existing populated fictional recovery gathering.
This run covered rendering and read-only navigation; it changed no business
records, application source, deployment or audience settings.

## Method and results

At each viewport size, a read-only DOM probe compared the document's
`scrollWidth` and `clientWidth`, and measured the bounding rectangles of
rendered buttons, inputs, selects, textareas and links. No measured control
extended beyond the viewport. A basic label probe found no rendered input,
select, textarea or button lacking label text, `aria-label`, `aria-labelledby`
or its own text. This is a structural probe, not an axe run or a complete
accessible-name computation.

All viewports were 844 pixels high. The 15-pixel difference below is the
browser's scrollbar space; the document did not require horizontal scrolling.

| Surface | Viewport width | Document client / scroll width | Overflowing controls | Missing label candidates |
|---|---:|---:|---:|---:|
| Organizer, history collapsed | 320 | 305 / 305 | 0 | 0 |
| Organizer, history collapsed | 390 | 375 / 375 | 0 | 0 |
| Organizer, history collapsed | 1280 | 1265 / 1265 | 0 | 0 |
| Organizer, message/report/discussion history expanded | 320 | 305 / 305 | 0 | 0 |
| Organizer, message/report/discussion history expanded | 390 | 375 / 375 | 0 | 0 |
| Organizer, message/report/discussion history expanded | 1280 | 1265 / 1265 | 0 | 0 |
| Accepted-member preview | 320 | 305 / 305 | 0 | 0 |
| Accepted-member preview | 390 | 375 / 375 | 0 | 0 |
| Accepted-member preview | 1280 | 1265 / 1265 | 0 | 0 |
| Invited-member preview | 320 | 305 / 305 | 0 | 0 |
| Invited-member preview | 390 | 375 / 375 | 0 | 0 |
| Invited-member preview | 1280 | 1265 / 1265 | 0 | 0 |

Enter activated both member-preview buttons and expanded the message, report
and reviewed-discussion history disclosures. In the accepted preview at 320
pixels, successive Tab presses reached the home link and Refresh coordination;
Enter refreshed coordination, with focus remaining on the refresh button.
Preview and disclosure targets were focused directly by browser tooling before
Enter; this is not evidence of a complete sequential Tab journey through the
organizer page.

The accepted preview showed the existing Salad and Tea choices, with all four
poll radio inputs disabled at every width. Profile controls were also disabled.
The invited preview showed invitation summaries and the whole-fling discussion,
but no participant-only location instructions, event discussion, polls or
payment requests. Expanded organizer history retained the imported-history
qualification, unknown live outcomes and the separate claimed failure report.
No payment link was followed, message prepared, vote saved or backup uploaded.
The temporary viewport override was reset after verification.

## Limits and remaining work

These twelve layout observations use one browser, one owner session and one
existing fictional gathering. They add hosted narrow-layout, label-structure
and targeted keyboard evidence. They do not establish text-zoom behavior,
contrast, all error/dialog paths, an axe audit, a screen-reader walkthrough,
Firefox/WebKit hosted coverage, independent organizer or actual member access,
simultaneous writes, expiry/rollback or managed-provider recovery. Existing
local evidence for those areas remains separate. Full Phase 6 and
`verify-hosted-test` remain open.
