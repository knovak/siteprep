# Flings plan critique

September 10, 2026. Reviewed the merged wish, objectives, specification,
implementation plan, test plan and recorded messaging/recovery direction.
This is a document review. No application, provider integration or acceptance
journey was executed, and no independent human usability review is claimed.

## Findings and disposition

| Finding | Why it matters | Revision and acceptance evidence |
|---|---|---|
| Phase 1 promised all T1-T3 before the Phase 2 interface exists. | T3 compares real member and preview pages, and T1 includes stale tabs. Reporting them passed from API fixtures would overstate coverage. | The phase table and evidence rules now separate domain/HTTP tests and a minimal session harness from Phase 2 interface journeys. Pending checks stay visible. |
| Atomicity was required without an early proof in the chosen database. | An exception rollback alone does not show that a rejected revision/generation precondition undoes prior successful statements. | Phase 1 begins with real-database tests for constraint failure, ordinary failed preconditions and competing final-organizer removals. The implementation must document its actual mechanism. |
| Revocation could race the gap between authorization and mutation. | A request can read permission before removal, then write after the revocation transaction completes. | Generation, membership and code revocation checks must be part of the atomic session-creation/write operation. Tests exercise both commit orderings and compare all affected records. |
| Independent sessions lacked a stale-page context test. | A shared cookie or client cache could switch which member acts after a second link is opened. | Phase 1's browser harness retains two flings simultaneously and binds each page's expected fling/membership to server-verified authority. A same-fling member replacement must refuse or reload a stale page. |
| Immutable approval and expiring raw handoffs needed a storage distinction. | Keeping the exact raw link in an immutable revision would defeat the 14-day sending-copy purge even if the current code ciphertext were deleted. | Phase 4 separates durable redacted approval/fingerprint records from encrypted expiring payloads. T9 inspects all copies and proves that result history survives without enabling stale recopy. |

## Boundaries checked

The 14-day sending window, 35-day link lifetime and independent 35-day sessions
remain fixed. Routine rotation still permits older unexpired links; explicit
revocation still invalidates their sessions. Preview remains read-only and
contact matching never grants authority. These requirements come from the
specification and are retained in T1-T3.

The plan correctly distinguishes a copied handoff from a send, reported results
from receipt, and local handoff exclusion from end-to-end duplicate prevention.
A copied prompt remains outside the application's control. Real sender accounts,
recipients, costs and exact batches remain prerequisites for the authorized pilot.
No external tool capability is inferred from this review.

Editable restore still creates a new fling, maps fresh identifiers and explicit
organizer authority, excludes access credentials and sends nothing. The staging,
rollback and deletion journeys remain T11 work. Production, public access,
in-app models, delivery APIs and encrypted export formats remain outside the
current implementation authorization.

## Result and next work

The plan is ready for a local fictional-data access increment with the revisions
above. Queue `build-access-foundations` from Phase 1 and keep the initiative at
`planned` until usable application content exists. Its four checkpoints bound
the work and prevent early completion. Later hosted identity, retention and
pilot inputs remain the named prerequisites already in the plan; this critique
does not supply or approve them.
