# Hosted sequential keyboard checks — September 22, 2026 (UTC)

## Environment and scope

Checked the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site)
in the Codex in-app browser using the native owner's organizer session and the
populated fictional recovery gathering. The Sites read API reported version 14
and public access-policy revision 2. No deployment or access setting changed.
The gathering was `a83949b1-befc-4581-bb95-1a5b0d125ad7`.

These are sequential Tab observations on loaded pages, with targeted Enter,
Escape and Shift+Tab checks for the deletion dialog and notification history.
They extend the earlier form-entry/return checks. No business record was saved,
no gathering was deleted, no export was prepared, and no message was approved
or sent. Member previews use the existing organizer's read-only preview path.

## Six completed page passes

All viewports were 844 pixels high. Each recorded content stop had a nonzero
bounding box intersecting the viewport and matched `:focus-visible`.

| Surface | Width | Sequential content stops | Exceptions to those two checks |
|---|---:|---:|---:|
| Organizer, history and editors collapsed | 1280 | 50 | 0 |
| Organizer, history and editors collapsed | 390 | 50 | 0 |
| Accepted Alex Morgan preview | 1280 | 5 | 0 |
| Accepted Alex Morgan preview | 390 | 5 | 0 |
| Invited Robin Reed preview | 1280 | 2 | 0 |
| Invited Robin Reed preview | 390 | 2 | 0 |

The completed passes contain 114 observations. The order matched between
widths on each surface. The organizer pass began at the logo and ended at
Create member. The phone pass positioned focus at the logo before using Tab;
subsequent controls were reached by Tab rather than per-control locator focus.

Organizer order, with duplicate labels kept as separate stops:

```text
 1 flings                         26 JSON schema
 2 Organizer workspace            27 Fictional example
 3 Sign out of ChatGPT             28 Unencrypted-data acknowledgment
 4 Refresh coordination           29 Gathering JSON file
 5 Write a post                   30 Delete this gathering
 6 Create a poll                  31 Close fling
 7 Request a payment              32 Edit fling details
 8 Hide post                      33 Add activity
 9 Review notification batch      34 Edit Movie & dinner
10 Hide post                      35 Add event to Movie & dinner
11 Named responses and history    36 Edit The movie
12 Close poll                     37 Edit Dinner afterwards
13 Replace poll                   38 Preview Alex Morgan
14 Named responses and history    39 Edit profile for Alex Morgan
15 Close poll                     40 Withdraw Alex Morgan
16 Replace poll                   41 Preview Robin Reed
17 Open outside payment service   42 Edit profile for Robin Reed
18 Record adjustment              43 Withdraw Robin Reed
19 Recipient group                44 Existing organizer ID
20 Further limit to               45 Add organizer
21 Delivery channels              46 Member name
22 Review recipients              47 Member email
23 Also post to one discussion    48 Member phone
24 Message review history         49 Receive messages by
25 Read the file guide            50 Create member
```

The accepted preview's order was logo, Refresh coordination, selected Salad
radio, selected Tea radio, and Open outside payment service. Both selected
radios remained focusable while the accessibility tree marked their groups
and choices disabled; neither was activated. The invited preview exposed only
the logo and Refresh coordination as content Tab stops. Its contact inputs
were disabled, with no participant poll or payment controls displayed.

Computed styles exposed outlines for links, buttons, inputs, selects and
summaries. The two organizer checkboxes used a 3-pixel box-shadow ring instead
of an outline. This records the presence of a focus treatment; its contrast,
area and visibility against every background were not measured.

## Deletion cancellation and history navigation

At each width, Enter on Delete this gathering opened the confirmation dialog
with focus in Type the gathering title to delete. Three Tabs reached the
acknowledgment checkbox, Keep gathering, then the title input again. The
permanent-delete button stayed disabled: the title remained empty and the
acknowledgment unchecked.

At 1280 pixels, Escape closed the dialog and returned focus to Delete this
gathering. At 390 pixels, Shift+Tab from the title input reached Keep gathering;
Enter closed the dialog and returned focus to the same trigger. All recorded
dialog controls intersected the viewport. This tests cancellation and the
initial disabled state, not actual deletion or its database effects.

At 390 pixels, Enter on Review notification batch expanded Message review
history and navigated to the imported Dinner plans batch. The hash target was
not itself focused (`document.activeElement` was BODY); the next Tab reached
Reviewed discussion: Whole fling within that batch, and Enter expanded the
recorded discussion text. This is a successful native anchor/tab-start route,
not a claim that the batch heading received focus.

## Observation method and limits

After each Tab, the read-only DOM probe captured the active element's tag,
label, `:focus-visible`, computed outline/box shadow and bounding rectangle.
The intersection test was:

```js
const e = document.activeElement;
const r = e.getBoundingClientRect();
const intersectsViewport = r.width > 0 && r.height > 0 &&
  r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
const focusVisible = e.matches(':focus-visible');
```

This is not an occlusion test or a guarantee that the entire control and ring
fit inside the viewport. Labels were read from ARIA references, native labels
or text; that lightweight extraction is not an accessible-name conformance
algorithm. Accessibility snapshots supplied the checkbox names when the first
desktop probe did not follow `aria-labelledby`.

An initial accepted-preview desktop attempt resized while focus remained on
the last phone control, then tabbed through the browser boundary. The current
focus was outside the resized viewport and a subsequent focus refresh showed
Opening your member page. That incomplete attempt is excluded from the table.
Reopening the preview at desktop width, waiting for its read-only content and
walking all five stops from the page start passed. Browser-chrome transitions
and resize-in-place focus continuity are not established by these passes.

The viewport override was reset and the temporary tab closed. This evidence is
one owner session in one browser. It does not cover form submissions, every
expanded/error state, independent second-organizer access, live member writes,
the Chromium/Firefox/WebKit hosted matrix, text zoom, axe or an actual
screen-reader walkthrough. Simultaneous hosted writes, expiry/rollback,
managed-host recovery and provider backup retention/deletion remain open.
`verify-hosted-test` stays actionable and Phase 6 remains incomplete.
