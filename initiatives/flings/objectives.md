# Objectives

What "done" would mean, derived from [the wish](wish.html). These are the
outcomes to preserve while the specification chooses how to deliver them.

## Done means

1. **A fling can hold a simple outing or a long series.** Organizers can create
   and close flings, organize activities within them, and give each activity
   one or more events with a time and location. A movie followed by a meal, a
   wedding weekend, and concerts spread over months fit the same structure
   without losing the distinction between fling, activity and event.

2. **Several organizers can run a fling together.** The website supports
   multiple organizers and multiple flings, including shared organizers.
   Organizers can manage their flings, membership invitations and activities
   through an interface members do not see. Sharing organizer duties does not
   grant access to unrelated flings.

3. **Each member has a useful destination for each fling.** Their page
   summarizes the activities to which they have been invited, their responses,
   and the information relevant to their participation. Accepting an activity
   invitation makes its additional participant information available. The page
   makes it clear which activities are invitations and which are accepted.

4. **Member access works without login.** A URL containing a code unique to
   that member in that fling opens their page. The same person uses a separate
   page for another fling. A code for one membership cannot reveal another
   member's page, another fling, or organizer-only information; the
   specification must address forwarded, lost and replaced links without
   turning ordinary member access into a login flow.

5. **Flings remain independent.** Activities, invitations, discussions, polls,
   payment coordination and direct-message audiences stay attached to the
   intended fling. A person participating in two flings does not receive or
   see one fling's private content through the other fling's page.

6. **Members can discuss the right part of the gathering.** Discussions exist
   at fling, activity and event level. People can identify which gathering a
   conversation concerns, follow its messages and contribute within the access
   they have. The specification must define visibility before and after an
   activity invitation is accepted.

7. **Polls and payment coordination support participation.** Events can have
   polls of their relevant membership and coordinated payments. Members can
   understand what response or payment is requested of them, and organizers can
   track the corresponding responses and payment status. Poll formats,
   calculation rules and whether payments are recorded, linked to an outside
   service or processed by the application remain specification choices.

8. **Organizers can prepare direct messages for the intended audience.** They
   can address an individual or subgroup within a fling and use AI assistance
   to draft email or text updates about events, discussions or other
   instructions. The organizer can inspect and edit the draft and its
   recipients before sending. Draft preparation, sending and any available
   delivery status are distinguishable, so a draft does not appear to have
   reached its recipients.

9. **A direct message can also become part of a discussion.** When an
   organizer chooses both destinations, the message is sent directly and
   recorded in the intended discussion. The interface makes both audiences
   clear, including when the discussion's readers differ from the direct
   recipients, and does not imply success for a destination that failed.

10. **Organizers can check the experience of any member in their fling.** A
    member-view mode shows the information that member can see, including
    invitation-dependent detail, and makes the selected member clear. Merely
    inspecting the page does not accept invitations, cast votes, make payments
    or send messages as that member.

## How we will know

- Create the movie-and-meal outing, the multi-activity wedding weekend and the
  concert series. Give events their own times and places and confirm that
  organizers and members can understand the grouping and sequence.
- Have two organizers manage one fling, and one of those organizers manage a
  second fling with an overlapping member. Exercise each role and each member
  URL; information and actions remain within the appropriate fling.
- Invite a member to two activities. Open their unique page without login,
  accept one invitation, and confirm that the accepted activity exposes its
  additional details while the other retains the invitation view. Compare
  both with the organizer's member-view mode.
- Exchange messages in a fling discussion, an activity discussion and an
  event discussion; complete an event poll and the chosen payment-coordination
  workflow. Confirm that members and organizers see the relevant state.
- Draft and edit an AI-assisted message to one member and another to a
  subgroup, then exercise the chosen email and text delivery paths with test
  recipients. Also send a message that is recorded in a discussion; verify
  audience, content and the displayed outcome for each destination, including
  a simulated failure.
- Close a fling and check the specified behavior for existing member links,
  outstanding invitations and unfinished coordination. Reopening or archiving,
  if supported, must follow the lifecycle chosen in the specification.

## Questions for the specification

Compare alternatives for organizer authentication and shared authority; the
member-code lifecycle; activity invitations and disclosure rules; discussion
access; poll scope and result visibility; and payment coordination, including
what the site is responsible for recording or collecting. Define what closing
a fling does and how event time zones and changes reach the member page.

Compare email and text providers, how AI drafts obtain the relevant fling
context, and the behavior when direct delivery and discussion recording have
different outcomes. Address recipient review, data retention and recovery as
part of those choices. None of these objectives selects a technology stack,
provider, paid service or autonomous sending policy; those belong in the
specification with alternatives and the approvals they require.
