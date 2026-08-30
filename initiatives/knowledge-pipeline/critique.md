# Critique of the plan before building

Written 2026-08-30, before Phase 0. `plan.md` supplies the order and
`test-plan.md` supplies the exits; this document checks whether those two can
establish the outcomes in `objectives.md` without making portability,
authorization, or recovery depend on an unstated host behavior.

## 1. Verdict

The plan has the right center of gravity: custody and restore precede a large
store, authorization precedes representative data, every stage shares one
accepted-change path, and human authority is expressed as a service invariant
rather than interface copy. The rights-safe fixture and the refusal cases are
strong enough to make Phase 0 useful engineering rather than schema theater.

**Phase 0 is ready to begin with the checkpoint and atomicity corrections now
written into the plan.** Later phases are not authorized merely because they
are described. Phase 1 still needs explicit permission before creating a
public-access test Site, and Phase 6 still needs explicit permission plus a
credential and recovery-key arrangement that keeps secrets out of automation
prose.

## 2. What should not be lost

1. **Portability is part of the first durable write.** The plan correctly
   refuses to treat a database dump or a download button as backup.
2. **Every caller converges on one commit boundary.** UI edits, native imports,
   proposal files, administrator actions, and schedules all earn the same
   validation, preview, receipt, and refusal behavior.
3. **Collection selection is visible and authoritative.** An import never
   silently creates or chooses its destination, and a changed destination
   invalidates stale work.
4. **The fixture makes dependence and disagreement visible.** Duplicate,
   syndicated, updating, and contradictory sources are present before scoring
   or narrative polish can hide them.
5. **Measured gates are attached to representative sizes.** The plan names the
   data shape, latency, memory, and restore budgets that later tuning must
   preserve.

## 3. Findings and corrections

### 3.1 The plan contradicted itself about Site access

The specification and tests require a publicly reachable login surface so
anonymous, unlisted, user, and administrator behavior can all be observed.
Phase 1 called the same deployment a “private test configuration.” A Site-level
owner-only deployment cannot prove the multi-identity boundary, while a public
Site without application authorization would expose private data.

`plan.md` now separates those controls: the test Site is public-access only
after explicit permission, while every data and administrative route remains
login- and allowlist-gated. An owner-only preview can prove assembly but cannot
exit Phase 1. `test-plan.md` now makes the access authorization itself part of
the evidence.

### 3.2 The identity flow had no hostile-header or administrator-bootstrap case

Naming two identity headers did not establish that application code receives
them from a trusted host context rather than from a client-controlled forwarded
header. The first administrator was also circular: only an administrator could
manage the allowlist, but the plan did not say how the first one appeared.

The corrected plan accepts identity only from the trusted Site request context,
refuses incomplete or conflicting identity, and ignores client lookalikes. One
deployment-seeded allowlist row bootstraps the administrator without public
self-enrollment; stable-id linking is one-way, and operator recovery is logged
and separate from the ordinary web path. Phase 1 tests now pin each boundary.

### 3.3 Local transaction success was allowed to over-promise hosted atomicity

Phase 0 builds a transactional importer against local SQLite, while hosted D1
does not appear until Phase 1. Without an explicit adapter-level atomicity
contract, the easiest response to a weaker hosted primitive would be to expose
partly accepted state or reinterpret “transactional” as “retryable.” That would
break the package receipt and restore guarantees after the core had already
been declared complete.

The repository contract now owns the all-or-nothing accepted-commit guarantee.
Local failure injection proves it in Phase 0; hosted failure and restart tests
prove the D1 adapter in Phase 1 before representative intake. A hosted adapter
may use a staging journal when it cannot use one native transaction, but no
reader may observe partial accepted state and retry must produce one receipt.

### 3.4 A Site-only encryption key was not portable recovery

The old Phase 6 test considered “loss of the Site-held key prevents restore” a
passing encryption result. That proves confidentiality, but it also proves the
scheduled backup cannot recover from loss of the deployment that held the key.
It conflicts with the objective that custody survive a hosted product.

The plan now uses a fresh artifact data key wrapped both by a versioned Site key
and a separately held operator recovery key. The exact operator custody and
rotation procedure must be recorded before schedules are enabled. The test is a
fresh-deployment restore using the recovery key, followed by wrong-key,
tampered-envelope, and retired-key refusals. Keys remain outside packages,
receipts, logs, and repository state.

### 3.5 The heartbeat named authentication without defining a safe credential

“Narrow authenticated action” did not say how the scheduler avoids carrying a
general administrator bearer token in a user-visible prompt, URL, log, or
receipt. A schedule that can export private knowledge needs a smaller authority
than a human session and replay protection of its own.

The trigger contract now binds timestamp, nonce, body hash, scope, and
idempotency identity to a dedicated run-due capability. The Site and scheduler
must each have an appropriate secret store before the live heartbeat is
enabled. If they do not, the deterministic adapter remains testable and the
hosted schedule remains visibly inactive; the plan does not smuggle a secret
into prose to make the feature look complete.

### 3.6 Phase 0 was one large noun list rather than an executable sequence

The phase had a sound exit but no internal order, which invited implementing
the entire entity model before the first restore worked. It is now split into
four checkpoints: envelope and minimum fixture; repository/versions/receipts;
relationships and the full logical round trip; then hostile inputs and scale.
Every checkpoint ends in an executable package round trip, and none builds a
workflow screen or generalized graph query language prematurely.

## 4. Readiness by phase

| Phase | Readiness | Condition |
|---|---|---|
| 0 — Portable custody core | **Ready** | Keep each checkpoint executable and preserve the adapter-independent commit contract |
| 1 — Login-gated Site | **Permission and live-contract gate** | Obtain explicit public-access permission; prove trusted identity, bootstrap, D1 atomicity, and R2 authorization before intake |
| 2–5 — Five-stage loop | **Ready after prior exits** | Do not weaken custody, collection scope, or human authority for UI convenience |
| 6 — Recovery and scheduling | **Credential and key-custody gate** | Record recovery-key custody; keep trigger secrets out of prompt/logs; obtain permission for the heartbeat |
| 7 — Representative use | **Ready after recovery** | Restore a fresh deployment and record witnessed human evidence before revisiting distribution |

## 5. Recommendation

Begin Phase 0 and stop at each of its four checkpoints long enough to run the
matching round trip and failure cases. Do not provision the public test Site or
the heartbeat as an incidental implementation step: each has an explicit
permission boundary, and the latter also has a credential and disaster-recovery
boundary to prove. No additional product feature is needed before the custody
core; the improvements here make its existing promise testable.
