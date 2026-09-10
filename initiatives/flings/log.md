# Log

## 2026-09-10 — Draft objectives.md - what "done" would mean

Defined wish-derived outcomes and acceptance journeys for independent flings, organizer/member views, coded member access, invitations, discussions, polls, payment coordination and assisted direct messaging; queued the specification and its open design choices.

## 2026-09-10 — Draft spec.md with alternatives for roles, invitations, member access, payments and messaging

Specified roles, member capabilities, invitation disclosure, discussions, polls, payment records, reviewed AI-assisted sending and independent delivery/discussion outcomes; compared alternatives and queued the implementation and test plans.

## 2026-09-10 — First specification review response

Addressed four review threads on PR #498: organizer-created profiles editable
by members, with email/text/both notification preferences; independent organizer
and member roles across multiple flings; fixed 35-day member sessions; and
overlapping member codes with 14-day sending windows, 35-day expiry from first
issue and first-use records. Distinguished routine rotation from emergency
revocation, preserved per-fling profile isolation and added acceptance cases.
The wish and lifecycle stage are unchanged by this response.

The four-thread sweep budget is spent. Two specific review requests remain
unanswered and are not superseded by this commit: [computer-control messaging
as the first provider, with advantages, disadvantages and improvements](https://github.com/knovak/siteprep/pull/498#discussion_r3976712643),
and [unencrypted, potentially editable backup exports before considering an
encrypted format](https://github.com/knovak/siteprep/pull/498#discussion_r3976757289).
The provider and backup choices in the specification are still pending that
review; this revision does not claim to settle either request.

## 2026-09-10 — Complete the two carried-over specification reviews

Addressed the two requests explicitly deferred by the prior four-thread pass.
The specification now proposes a computer-control prompt as the first sending
path, with organizer-supplied core text, resolved preference-aware recipients,
personal links, an escaped manifest, per-delivery results and a discussion post
whose status does not overstate sending. It compares the benefits and limits
against manual/API delivery and records improvements and pilot acceptance.

Recovery now starts with editable, unencrypted versioned JSON, excludes live
credentials, validates an isolated restore and cannot resume old sends or
sessions. Encryption is deferred until useful production experience. The
recommendations and remaining decisions are recorded in decisions.md. The
wish, objectives and lifecycle stage are unchanged by this response.
