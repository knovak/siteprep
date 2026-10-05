# Hosted native-validation focus — September 25, 2026 (UTC)

## Environment and scope

Checked the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site)
in the Codex in-app browser with the native owner's organizer session. The
Sites read API reported active version 14, public access and policy revision 2.
The populated fictional recovery gathering was
`a83949b1-befc-4581-bb95-1a5b0d125ad7`. Both viewports were 844 pixels high;
their widths were 1280 and 390 pixels.

This T12 increment tests native browser validation on five expanded organizer
forms. It supplements the September 22 sequential page walk with invalid-draft
focus evidence. No valid draft was submitted, no message was prepared or sent,
and no deployment or access setting changed.

## Twenty completed validation checks

Each table row passed once at each width. Enter on the form's Save button
left the editor open, focused the named invalid field and exposed a nonempty
native `validationMessage`. The field had `validity.valid === false`, matched
`:focus-visible`, and had a nonzero rectangle intersecting the viewport.

| Form | Invalid draft | Focus after Save | 1280 | 390 |
|---|---|---|---|---|
| Write a post | Empty post text | Post text | Pass | Pass |
| Create a poll | Empty question | Poll question | Pass | Pass |
| Create a poll | Question supplied, choices empty | Choices, one per line | Pass | Pass |
| Request a payment | Empty description | Payment description | Pass | Pass |
| Request a payment | Description supplied, no member selected | Allocate to an accepted member | Pass | Pass |
| Request a payment | Description and member supplied, amount empty | Amount in minor units (USD cents, JPY yen) | Pass | Pass |
| Request a payment | Required fields supplied, optional link is `not-a-url` | Outside payment link (optional) | Pass | Pass |
| Add activity | Empty title | Activity title | Pass | Pass |
| Add event | Empty title | Event title | Pass | Pass |
| Add event | Title supplied, local date/time empty | Local date and time | Pass | Pass |

Required text, amount and date/time fields reported “Please fill out this
field.” The unselected member reported “Please select an item in the list.”
The malformed optional URL reported “Please enter a URL.” These are messages
observed in this browser, not prescribed cross-browser wording.

Intermediate drafts used the text `Unsaved keyboard validation`. The payment
draft selected fictional Alex Morgan and used 100 minor units only to reach
the invalid URL case. Every Save attempt retained a native-invalid field.
The initial post/poll constraints were inspected before activation; subsequent
attempts also used a guard that required an active form, native validation
enabled and at least one `willValidate` element with invalid validity. A
missing or valid form caused the helper to stop before Save.

## Cancellation and retained records

After each of the five forms, at both widths, Enter on Cancel or Cancel editing
closed the draft and returned focus to its opening button. All ten recorded
return positions matched `:focus-visible` and intersected the viewport. Add
event returned to Add event to Movie & dinner; the other forms returned to
their corresponding Write a post, Create a poll, Request a payment or Add
activity button.

After a final reload, the visible fixture still contained two discussion
posts, two polls, one payment request, one activity with two events, and Alex
Morgan and Robin Reed. The activity/event titles, displayed times and details
matched the initial page. Neither temporary draft string appeared. This is a
visible-record check, not a database diff or a network-request audit. No
business-record mutation was requested.

The desktop post form also completed its four-stop sequence: Discussion
audience, Post text, Save coordination, Cancel. That small observation is not
a complete sequential form walk for the other editors.

## Observation method and limits

Forms and buttons were activated with keyboard Enter through the browser's
locator API. Draft fields were filled or selected through that API. After
validation, a read-only DOM probe recorded `document.activeElement`, its label,
validity/message, focus-visible state and bounding rectangle. Visible labels
came from ARIA label references, native labels or element text. As in the
September 22 receipt, rectangle intersection does not establish full control
visibility, absence of occlusion or focus-ring contrast. Reading a native
validation message does not establish its spoken screen-reader announcement.

Two mouse-navigation attempts timed out before the validation matrix; direct
navigation and keyboard activation worked. A poll Tab-walk attempt timed out
and was excluded. An attempted member-profile check lost its form context
during a transient page refresh; the invalid-form guard stopped before Save.
That profile attempt is excluded, and no cause is assigned to the refresh.
The twenty recorded validation checks and ten cancellation checks completed
separately. Viewport overrides were reset and the temporary tab was closed.

This receipt covers one owner session in one browser, five organizer forms,
and the listed native constraint failures. It does not establish server-error
focus, every field constraint, a complete form Tab order, member-profile
validation, text zoom, axe, a screen-reader walkthrough or the full hosted
Chromium/Firefox/WebKit matrix. Independent organizer identity, simultaneous
hosted writes, expiry/rollback and managed-provider recovery/retention remain
open. `verify-hosted-test` stays actionable; Phase 6 remains incomplete.
