# Flings specification

Draft for review, September 10, 2026 (UTC). This specifies the behavior in
[the wish](wish.html) and [objectives](objectives.html). It proposes the
baseline for the implementation plan; no provider account, paid service,
production deployment or real message sending is authorized by this document.

## 1. Product and boundaries

A fling contains activities; each activity contains one or more events. A
movie and a meal can be two events in one activity. A wedding weekend can have
several separately invited activities. A concert activity can contain events
months apart. The member's destination page belongs to one membership in one
fling, even when the same person participates elsewhere.

The first complete version includes organizer management, member links,
activity invitations, discussions at all three levels, event polls, payment
coordination, and reviewed AI-assisted email and text sending. A prototype
may use simulated providers, but simulated delivery does not satisfy the
objectives' real test-recipient delivery journey.

Public fling discovery, cross-fling member profiles, ticket sales, seat
inventory, recurring-event rules, automatic campaign sending, inbound email
or text synchronization, attachments and collection of card details are
outside this version. Organizers may enter repeated events individually.

## 2. Alternatives and proposed baseline

| Area | Alternatives and consequences | Proposed baseline |
|---|---|---|
| Application | A static/browser-only app is easy to distribute but cannot enforce shared private data or coordinate concurrent organizers. A server with a relational database supports access checks and transactions, with hosting and recovery work. | A web client, server-controlled permissions and a relational database. The plan selects the framework and host; no full private dataset is shipped to the browser. |
| Organizer sign-in | Managed identity avoids implementing password recovery but requires provider setup. Email sign-in links depend on email delivery and mailbox access. Application passwords require recovery and credential operations. | Managed identity for organizers, using a provider adapter and secure server session. A local development identity is restricted to local/test environments. |
| Shared authority | A single owner simplifies administration but conflicts with shared organizing. Equal organizers avoid owner hand-offs but allow every organizer to make consequential changes. Fine-grained roles add complexity. | Equal organizers within each fling, with explicit confirmation for closure, member-link replacement and adding/removing organizers. The last organizer cannot be removed without first appointing another. |
| Member access | Accounts improve identity assurance but contradict login-free access. One shared fling code cannot distinguish members. Individual bearer links meet the wish but can be forwarded. Immediately invalidating each previous link makes recent messages frustrating to use. | Multiple revocable codes per membership, issued in overlapping 14-day sending windows and valid for 35 days from first issue. Routine rotation preserves recent links; emergency replacement invalidates all earlier codes and sessions. |
| Invitations and discussions | Showing everything to every invitee is simple but defeats acceptance-dependent disclosure. Independent event invitations add another response hierarchy. | Invitations belong to activities; accepted members gain participant detail and activity/event discussions. A fling discussion serves all active fling memberships. |
| Polls | Free-form answers are flexible but hard to tally. Ranked voting adds election rules. | Single-choice and multiple-choice event polls, one current response per eligible member, editable until closure. |
| Payments | A ledger records coordination without handling funds. Outside payment links can accompany it. Integrated collection adds settlement, refund and provider responsibilities. | Fixed per-member requests and an organizer-confirmed ledger, with optional outside payment links. The application does not collect money. |
| Email | Resend documents API idempotency keys; Amazon SES offers API and SMTP delivery. Both need sender configuration and operational handling. Copying into a mail client is a useful fallback but provides no app-observed delivery result. | An email adapter with Resend as the first candidate and SES as the alternative. Confirm account access, sender identity, terms and current costs before enabling it. |
| Text | Twilio documents asynchronous delivery status callbacks. Opening the device's text composer avoids a provider integration but cannot reliably report delivery in this app. | A Twilio adapter as the first candidate; manual text composition remains explicitly untracked. Sender configuration, destination coverage and current cost approval precede live use. |
| AI drafts | A hosted model can generate drafts but receives selected context and incurs usage. Templates/manual writing are predictable fallbacks but do not provide the requested AI assistance. | A server-side draft-provider adapter, with OpenAI as a candidate and editable templates as fallback. Model choice, data terms and budget belong in the plan and activation decision. |

The provider observations above were checked against
[Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Amazon SES sending documentation](https://docs.aws.amazon.com/en_en/ses/latest/dg/send-email.html),
[Twilio outbound status documentation](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks)
and [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
These sources establish capabilities, not account eligibility, prices or a
completed integration. The proposed choices are design judgments.

## 3. Records and isolation

| Record | Required relationships and information |
|---|---|
| Organizer | Authentication subject and display name; access comes from explicit organizer-to-fling assignments. |
| Fling | Identifier, title, description, default time zone, open/closed state and organizer assignments. |
| Membership and profile | Fling, display name, email address, text-capable phone number, notification preference (email, text or both), active/removed state, profile revision and access-revocation generation. The organizer creates the initial profile; the member can edit their own. Duplicate contact details do not merge memberships across flings. |
| Member access code | One membership, token digest, protected value while eligible for sending, first-issued time, first-use time (initially empty), sending-window end, expiry and optional revocation time/reason. Several records may be valid simultaneously. |
| Member session | One membership, originating access-code record, membership revocation generation, creation time and fixed expiry. |
| Activity | One parent fling, title, invitation summary, participant details, published/cancelled state and a display order. |
| Event | One activity, title, start and end, IANA time zone, location name/address/link, invitation-visible summary and accepted-participant details. |
| Invitation | Unique activity/membership pair, invited/accepted/declined/withdrawn state, response time and revision. |
| Discussion and post | Exactly one fling/activity/event scope, author, content, timestamps and any linked outbound-message identifier. |
| Poll and response | One event, question, options, single/multiple choice, optional deadline, open/closed state and one response per membership. |
| Payment request and entry | One event, payee/instructions, currency, amounts by membership, optional due date/link, and an append-only record of claims, confirmations and adjustments. |
| Message and delivery | Fling, author, immutable approved revision, channel-specific content, reviewed recipient snapshot, optional discussion target and a separate delivery record per recipient/channel. |
| Audit event | Actor, fling, object, action, revision and time; omit raw access codes and provider secrets. |

Every child relationship is checked against its fling on both read and write.
A request supplying an event from fling A and a member from fling B fails
before returning content or producing a side effect. Database constraints and
transactions enforce unique memberships/invitations/responses and valid parent
relationships. Non-secret identifiers identify records; they never grant access.

Profiles belong to memberships in this first version. A member can edit their
own display name, email address, text number and notification preference from
their member page, without a separate login. Assigned organizers can create
and maintain those profiles in their fling. Other members cannot read or edit
them. Email-only requires an email address, text-only requires a text number,
and both requires both; a profile without a usable selected destination may
be saved as incomplete, with notifications unavailable until corrected. Never
silently substitute an unselected channel. Validate contact syntax, show the
saved values and preference, and record the actor and revision of changes.
Editing contacts does not automatically send a message or change invitations,
roles or member codes. It requires renewed review of affected queued messages
as described in section 7. A member can also correct their profile while the
fling is closed; closure still prevents new messages and coordination writes.

The same person commonly organizes several flings and participates as an
ordinary member in several others. Organizer assignments and memberships are
independent: being an organizer anywhere gives no organizer access elsewhere,
and removing one assignment leaves other assignments and memberships intact.
An organizer may also have a membership in a fling they organize, for their
own invitations and responses. Organizer sign-in and a member link never
implicitly grant each other's authority. Membership profiles are not linked
by matching names, email addresses or phone numbers; a profile edit applies
to the displayed fling only. This preserves the existing per-fling boundary
but means a person updates their contact details separately in each fling.
A shared cross-fling profile remains outside this version.

## 4. Access and member links

Organizers sign in and see their assigned flings in an organizer interface.
Members receive a URL such as `/f/<fling-id>/member#code=<random-code>`.
The client exchanges the fragment over HTTPS for a membership session and
removes it from the displayed URL. Fragments keep the raw code out of the
initial HTTP URL. Each code uses at least 128 bits of cryptographically random
entropy. Verification uses a one-way token digest. To append the same current
code to several messages, the sender additionally retains its value encrypted
with a server-managed key outside the database, accessible only to the code
issuance/sending path. Remove this recoverable copy when its sending window
ends or it is revoked; its digest remains for access checks until expiry.
Retain the code record and revocation state while any originating session can
still be active. Never log raw codes. Member pages contain no third-party scripts or tracking
assets.

Each code records `first_issued_at` when it is first made available for member
delivery, and `first_used_at` on its first successful session exchange. First
use is recorded once; failed lookups and later visits do not change it. The
server applies these fixed windows using elapsed time in UTC:

- Reuse the newest eligible code in outgoing messages for 14 days from first
  issue. At or after that boundary, prepare a new code when the next message
  or explicit link issuance needs one. Concurrent preparations share one new
  current code. Rotation alone never sends a message.
- Accept each code for 35 days from its first issue, irrespective of first
  use or subsequent sends. Routine issuance of a newer code does not revoke
  older unexpired codes. At the exact expiry boundary it cannot open a new
  session, and an unused code expires on the same schedule.
- For example, codes issued on days 0, 14 and 28 may all work on day 28. The
  day-0 code expires on day 35; the other two expire on days 49 and 63. A first
  visit on day 34 does not extend the day-0 code's lifetime.
- Recheck the code's sending window before dispatch. If a reviewed message
  waited beyond that window, pause it and prepare a current link for renewed
  review; do not send the old code or silently change an approved message.

The session is bound to one fling, membership, originating code and membership
revocation generation. It uses secure, HttpOnly cookies, request-forgery
protection and a fixed 35-day lifetime from session creation; ordinary visits
do not extend it. Reopening any unexpired, non-revoked member link starts a new
35-day session without login. Routine code expiry stops new exchanges but
does not end an already established session: opening a code on day 34 may
therefore keep that session usable until day 69. Server checks of membership
state, session expiry, generation and explicit code revocation happen on every
request. The longer session is a convenience choice; forwarding a code still
grants access for the lifetimes described here.
Opening another fling's link does not create a combined member dashboard or
silently switch an action to that fling.

Closing a fling makes coordination read-only; profile corrections remain
available as specified in section 3. A forwarded link grants the same
member access; it does not prove who is holding it. The invitation explains
this plainly. An organizer can explicitly revoke one code and all sessions
created from it. For a lost or exposed set of links, the organizer checks the
intended member through an existing contact channel, then uses emergency
replacement: revoke every existing code and session for that membership,
advance its revocation generation and issue a fresh code. Membership removal
also revokes all its codes and sessions immediately. Routine rotation and
emergency replacement are distinct controls, with replacement requiring
confirmation. Unknown, expired, removed and revoked links show the same
unavailable-page message with instructions to request a recent link from an
organizer, without exposing membership details. Expiry does not send one
automatically.

| Viewer | Fling summary and discussion | Activity invitation summary | Participant details and activity/event discussions | Organizer tools and other members' contacts |
|---|---|---|---|---|
| Active member, not invited to the activity | Yes | No | No | No |
| Invited or declined member | Yes | Yes | No | No |
| Accepted member | Yes | Yes | Yes | No |
| Removed member or invalid code | No | No | No | No |
| Assigned organizer | Yes | Yes | Yes | Yes, only within that fling |
| Organizer viewing a member | Exactly the selected member's readable information | Same | Same | No, until leaving preview |

The invitation summary includes the activity description and its published
event titles, dates, times and organizer-designated invitation location text.
Private addresses, joining instructions, participant discussion and polls/payment
requests stay in the accepted view. An organizer previews both views before
publishing. Draft activities are organizer-only; cancellation leaves previously
invited members a visible cancellation notice.

Member preview uses the same server-side read projection as real member
access, with a separate organizer preview context. It never obtains or displays
the member's access code. The selected name and a persistent preview notice
remain visible. Preview credentials cannot edit a profile, accept invitations,
vote, claim a payment, post or send; these requests fail on the server as well as being
absent from the interface.

## 5. Invitations, event changes and closure

An organizer creates a membership, generates its link and chooses activity
invitations. Accepting one activity affects only that invitation. Declining
removes participant access but preserves the invitation summary; a member may
accept again while the invitation and fling remain open. Organizer withdrawal
removes the invitation from the member page and revokes its access.

Each event records a local date/time with its time zone and an unambiguous
instant. Missing or ambiguous daylight-saving times require correction or an
explicit offset before save. Members see the event's local time and zone;
an optional viewer-local rendering must retain the event's zone. Changed
events show when they changed. The organizer can prepare a reviewed update;
saving a change alone does not send messages.

Closing a fling freezes invitations, discussion posting, votes, payment
changes and new sends. Members retain read access to their permitted record;
organizers can inspect it and explicitly reopen the fling. Reopening preserves
accepted invitations, closed polls and payment history; it does not resend
anything. Not-yet-submitted delivery jobs are cancelled on close, while
provider-accepted messages may still arrive and their status continues to update.
Closure displays this distinction before confirmation.

Removing a member revokes access without erasing financial adjustments or
already delivered posts. Their private contact data is visible only to
organizers until the retention/deletion operation removes it. Removing an
organizer revokes organizer sessions for that fling without affecting their
other assignments or any separate member link.

## 6. Discussions, polls and payments

Fling discussions contain information suitable for every active membership.
Activity/event discussions are available only to accepted activity members and
organizers. An organizer can post to any scope they manage. All posts show
attribution and time. Plain text is rendered safely; links open without leaking
the member capability. Members can edit their own posts while the fling is
open, with an edited marker. Organizers can hide a post with an audit reason;
hiding does not recall copies already sent directly.

Poll eligibility is accepted membership in the containing activity, optionally
restricted to a reviewed subset. Members see their own current selection;
organizers see named responses and totals. Members see aggregate results after
the poll closes. A change to options after voting starts creates a replacement
poll, preserving the old one. Withdrawal/decline removes the member from active
tallies, while retaining an organizer-visible audit record. Reacceptance requires
a fresh vote. A closed fling or poll rejects late writes, including stale tabs.

A payment request uses one currency and integer minor units, with a fixed
amount per selected member. The organizer enters allocations explicitly;
automatic splitting, exchange rates, netting between people and card processing
are deferred. A member may report an outside payment with an optional reference.
It remains **reported**, distinct from **confirmed**, until an organizer
confirms it. Partial confirmations reduce the outstanding amount. Corrections,
waivers and refunds are separately attributed ledger adjustments; they do not
overwrite history. Outstanding balances cannot become negative silently.

A member sees only their own request/ledger entries; organizers see the full
event ledger. Accepting, declining, withdrawal or event cancellation never
silently deletes an outstanding amount or issues a refund. The organizer must
explicitly adjust it. Following an outside payment link is never recorded as
payment success. Do not store bank credentials or payment-card details.

## 7. Drafting and sending direct messages

The organizer chooses one fling, a context, permitted notification channels,
and an individual or subgroup. Initial subgroup choices are all active members,
activity invitees, accepted members, unanswered invitees, unanswered poll
members and members with outstanding payment requests. The composer displays
the actual recipients and omissions, including incomplete profiles and channel
opt-outs. By default it follows each member's profile preference: one email,
one text or both. A channel-restricted message reaches only members whose
preferences include that channel, with omissions shown before approval. Both
means two separate deliveries, using the same current member code when a
member link is included. Each recipient receives an individual message so
other members' contact details are not disclosed.

AI receives only the organizer-selected context needed for that draft. Raw
member codes, provider secrets and other flings are excluded. Private payment
amounts and personalized instructions require per-recipient drafts; a shared
body cannot silently incorporate one member's private information. Discussion
text is source material, not instructions to operate the system. The model can
return draft text and flagged uncertainties; it has no send or membership tools.
An unavailable/refusing model leaves an editable manual draft and a clear error.
Structured model output does not establish factual accuracy.

Before sending, the organizer reviews the edited content, final recipient list,
channel, omissions and any discussion audience. Changing the content, scope
or recipient selection invalidates approval. The server freezes the approved
revision and recipients, then checks their current eligibility at dispatch.
If membership, invitations, profile contacts/preferences or relevant source content changed
since review, pause the affected send for renewed review; never add newly
eligible recipients to an approved batch. Removed or opted-out members are
suppressed even if previously approved. The send action is explicit and remains
separate from AI drafting, saving, event editing and previewing.

States distinguish draft, awaiting review, approved/queued, provider accepted,
delivered when reported, failed, suppressed and outcome unknown. Preserve the
provider's raw status and message identifier. Provider acceptance is not proof
of delivery, and absence of a delivery callback is not failure. Verify callback
authenticity and tolerate duplicates and out-of-order events.

Store a durable outbox job and application idempotency key for each approved
recipient/channel. Resend documents a 24-hour key window; application history
must outlive that window. When a provider lacks a usable deduplication contract
and submission times out, mark the outcome unknown and reconcile it before
allowing an explicit retry. Never blindly retry an ambiguous send. Do not
promise exactly-once delivery across an external provider.

## 8. Sending and recording in a discussion

The composer may additionally target one discussion in the same fling. It
shows both the direct audience and who may read that discussion. The shared
post contains only content suitable for all discussion readers; member-specific
amounts, contact details and access links stay in individual direct messages.
The organizer approves the shared version separately when it differs.

Approval atomically creates the durable message, optional discussion post and
outbox records in the database. Database failure creates none of them. Once
committed, direct delivery proceeds independently. A visible discussion post
can therefore coexist with failed or unknown direct deliveries; the organizer
sees the separate outcomes and can retry only eligible failed recipients.
Retrying delivery never duplicates the discussion post. Later edits to the
post are marked as edits and do not alter the immutable sent-message record.

## 9. Operations and acceptance for the plan

Use fictional members and provider simulators for initial work. Before any real
pilot, record the chosen host, organizer identity provider, verified sender
identities, delivery/AI providers, supported destinations, current costs and
spending limits, data retention terms and test-recipient authorization. Paid
activation and production publication require explicit approval. Represent an
unavailable credential as a `data:` blocker and a spending authorization as a
`cost:` blocker; do not infer approval from choosing a candidate here.

The plan must include per-fling export and deletion, encrypted backups, a
restore rehearsal, provider-callback reconciliation and an operator-visible
failed-job list. Closed flings remain retained until an organizer explicitly
deletes them under the recorded retention policy. Export/delete requests are
organizer-only, warn that delivered messages cannot be recalled, and include
the treatment of posts, contact details and payment history. The retention
period and backup expiry must be settled before real personal data is used.

Concurrent edits use revision checks; stale saves return the current state
for review instead of overwriting another organizer's work. Interface states
cover loading, empty, denied, failed and retriable actions. The member summary,
invitation response, poll, payment claim and discussion flows must work by
keyboard and on a narrow phone display.

The next plan and test plan must map every objective to a complete journey,
including people organizing multiple flings while holding ordinary memberships
in several others, and an organizer with their own membership in a managed
fling; organizer-created and member-edited profiles; email/text/both preferences,
incomplete contacts, changes after message review and profile isolation;
accepted versus invited detail; forwarded/revoked links; first-use recording,
overlapping codes at days 14/28, exact day-35 expiry, unused-code expiry,
independent 35-day sessions, concurrent issuance, queued-message rotation and
emergency revocation of every old code/session; forged cross-fling requests; preview
write denial; daylight-saving ambiguity; concurrent invitation/vote edits;
partial payments; changed recipients after review; model failure; provider
timeout; duplicate callbacks; discussion success with delivery failure; and
closure/reopening. The movie-and-meal, wedding-weekend and concert-series
fixtures must exercise the same model. None of these acceptance paths is
claimed implemented by this specification.
