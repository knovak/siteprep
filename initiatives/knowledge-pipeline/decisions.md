# Decisions

## 2026-08-31 — May Knowledge Pipeline deploy public Sites?

**Yes. Permission is granted for Knowledge Pipeline deployments as public
Sites.** This is standing permission, recorded so future phases do not stop to
ask the same access question again.

### What this settles, and what it does not

- Test and production Sites for this initiative may be created or updated with
  public Site access once the applicable build, test, and lifecycle gates pass.
- Public Site access does not make knowledge public: data, API, object, export,
  and administration routes remain authenticated and allowlist-gated.
- This does not authorize creating a heartbeat automation, bypassing a release
  gate, or choosing the initiative's eventual distribution model.

## 2026-09-02 — How should the fixed-fixture live-model proposal be reviewed?

This is a **proposal for the user's decision**, not a decision already made.
The live pass used the checked-in Phase 3 fixture: collection **Community heat
resilience**, selected source `source:one` titled **Cooling access** with body
**Fixture text**, and the explicitly omitted `source:two` titled **Heat plans**.
It proposed the same four operation classes exercised by the recorded fixture:

1. tag `source:one` with `cooling-access`;
2. assess relevance, quality, novelty, importance, and urgency separately;
3. leave promotion at `needs-review`; and
4. leave `cooling-access` at unknown vocabulary status.

The recorded process version is `phase-3-live-review-v1`; the proposer is an
OpenAI Codex live interactive sweep session on 2026-09-02. No model credential,
database credential, Site credential, or commit authority was supplied.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Accept all four operations unchanged** | Fastest path and every operation is structurally valid | Treats `novelty: 2` and `importance: 3` as evidence-backed even though the fixture contains no comparison set or consequence evidence |
| **Accept all four operation classes after correcting the assessment** | Preserves the useful tag, cautious promotion, vocabulary uncertainty, and independently reviewable assessment while making unsupported inferences explicit | Requires a human correction rather than accepting the model file verbatim |
| **Reject the proposal and rerun it** | Avoids accepting any weak inference from the deliberately tiny fixture | Adds no evidence unless the work packet, prompt, or review criteria also change; it does not exercise selective correction |

### Recommendation

**Recommendation: accept all four operation classes after correction.** Count
three of four operations as accepted unchanged (**75% operation-level
acceptance**). Accept the assessment operation only after changing novelty and
importance to **unknown**: the fixture supports high relevance to its named
collection, but it supplies neither a comparison baseline for novelty nor
evidence of consequences for importance. Quality and urgency should remain
unknown, and `needs-review` should remain the promotion disposition.

The two unsupported claims are therefore the numeric novelty and importance
values and their rationales. They are corrections inside one assessment
operation, not two additional operations. After those corrections, four of four
operation classes are acceptable; the unchanged-acceptance percentage remains
75% so the record does not hide the review work.

### What would change the recommendation

A work packet containing the source body, provenance, comparison sources, or
evidence of consequences could support numeric novelty, quality, importance,
or urgency values and would require a fresh review. A different process version
or materially different prompt would also require a new live evaluation rather
than inheriting this result.

### What this settles, and what it does not

- Merging this proposal records the required live-model review evidence and
  makes Phase 4 actionable.
- It demonstrates correction and selective acceptance; it does not establish a
  minimum acceptance percentage or a model-quality threshold.
- It does not commit a proposal to a live collection, grant an LLM authority,
  or make any later proposal safe without its own human review.

## 2026-09-05 — Prepare the connected curator exercise

Ken selected option 1: finish the missing workflow and prepare the acceptance
test, with Ken acting as curator. This authorizes the bounded implementation,
automated rehearsal, test-Site refresh, and disposable hosted recovery check
needed to make the exercise usable.

### What this settles, and what it does not

- Prepare the test so Ken can perform and report the curator sitting.
- Automated operation as Ken's signed-in session remains operator rehearsal,
  not independent human testimony or an acceptance finding.
- The representative-use todo remains blocked until measured curator feedback
  and the remaining evidence are supplied. No production release, hosted
  schedule, distribution recommendation, or merge is authorized.
