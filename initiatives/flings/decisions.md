# Decisions

## 2026-09-10 — First delivery path and recovery format, under review

In [PR #498's messaging review](https://github.com/knovak/siteprep/pull/498#discussion_r3976712643),
the user proposed an organizer-supplied core message and a copyable prompt for
an LLM with computer control to send through Gmail and Messages. The system
would resolve all fling members, activity invitees or accepted members, their
contacts/preferences and each personal URL. The user asked for advantages,
disadvantages and improvements, including an optional discussion post.

The [backup review](https://github.com/knovak/siteprep/pull/498#discussion_r3976757289)
proposed unencrypted, potentially editable exports first, with encryption
considered after useful production experience. Editability could support data
migrations after substantial code changes.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| Computer-control handoff | Uses existing sender accounts; makes each destination and message reviewable; avoids the initial delivery-API integration. | Desktop and LLM dependence; usage costs; no reliable app-observed receipts, recall or duplicate prevention; selected contacts and links reach the external tool. |
| Manual sending | Uses the same reviewed manifest without a computer-control dependency. | Slow and prone to transcription errors; results still need reporting. |
| Email/text APIs | Structured results and server-controlled jobs support larger or unattended batches. | Provider setup, credentials, operational work and possible charges. |
| Editable plain JSON recovery | Inspectable, portable and adaptable for migrations. | Anyone holding it can read included personal data; edits need validation. |
| Encrypted export format | Protects a misplaced file. | Key recovery and editing complexity before recovery usefulness is established. |

### Recommendation and what remains open

**Recommendation:** use the reviewed computer-control handoff as the initial
delivery path and unencrypted versioned JSON for recovery, following the
requested direction. Section 7 of the specification distinguishes copying,
reported sending and evidence of receipt; section 9 defines validated staging,
fresh access credentials and a restore that cannot send messages.

This records a revised specification proposal, not final approval or an
implemented integration. Poor pilot reliability, unacceptable contact/link
exposure, high volume or a need for unattended delivery would favor an API
adapter. Production experience may justify an encrypted export format.
The specific LLM, computer, host, sender accounts, retention and activation
permissions remain open for the plan and authorized pilot. Naming another
delivery or recovery option in review is enough to redirect this proposal.
