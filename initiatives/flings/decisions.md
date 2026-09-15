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

## 2026-09-15 — Organizer sign-in, initial accounts and retention

The user supplied these answers and asked to record them and run a sweep:

1. **Organizer sign-in:** "use chatgpt logon, native to chatgpt sites".
2. **Initial organizer accounts:** Ken Novak, `krnovak@gmail.com`, and
   Lucas Novak, `lucas.d.novak@gmail.com`.
3. **Organizer action history:** keep it "until deleted".
4. **Backup requirements:** "no preference at this time - keep it simple".

### Alternatives considered

| Choice | Selected approach | Consequence |
|---|---|---|
| Organizer identity | Native ChatGPT Sites sign-in | Replaces the separately registered OpenID Connect provider proposed in the initial plan; no external issuer/client or callback setup is needed from the user for that proposal. The native identity path still needs implementation and verification. |
| Action-history retention | Until the gathering is explicitly deleted | No fixed-period automatic deletion of non-secret organizer action history. Existing access-code, session and raw-message expiry rules still apply. |
| Backups | Keep the existing recovery approach simple | No additional backup service or custom retention policy is selected. The host's actual backup and recovery/deletion behavior remains to be documented. |

### What this settles, and what it does not

- These are the user's decisions. They supersede the earlier open organizer
  provider and audit-retention choices in the specification and plan.
- The two named accounts are the initial authorized organizers. Sign-in must
  identify each organizer independently, and access to an existing gathering
  still requires its organizer assignment. Recording these addresses does not
  prove that either account has signed in or that hosted access works.
- `verify-hosted-test` is actionable: implement and verify native ChatGPT
  sign-in for the named accounts, repeat hosted acceptance, and investigate
  provider backup retention and recovery/deletion. These checks are work for
  the implementation; the user need not invent provider configuration or a
  backup policy before that work can begin.
- "Until deleted" applies to the gathering's action history in active
  application storage. It does not extend credential or raw-handoff lifetimes
  or promise deletion from downloaded exports, external messages or provider
  backups. The provider's behavior must be recorded before real member data.
- The existing login-free member-link requirement remains. Native organizer
  sign-in does not decide the separate host-audience setting for outside
  members. Hosted acceptance, pilot setup, actual message batches and a
  production release retain their existing prerequisites.
