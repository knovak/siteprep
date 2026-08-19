# Critique of the six-phase build

Written 2026-08-19, after phases 1–6 were built. `plan.md` §3 is the order this
assesses; `test-plan.md` §4 is the gate it applies. This document does not
change any code or any decision — it says what the build is, what it is not
yet, and what the graduation-or-dormancy decision needs in order to be made.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md`.

## 1. Applying the initiative's own gate

`test-plan.md` §4 states the rule this critique is mostly an application of:

> a phase can be entirely written, fully green, and still not exit. "Code
> complete" and "phase complete" are two states, and only the second is what §3
> gates on.

Applied honestly, that gives a different picture from the log:

| Phase | Code | Exit | Why |
|---|---|---|---|
| 0 — Host spike | n/a | **exited** | All three sharp rows observed live 2026-08-18; §10's table filled in |
| 1 — The pile lands | complete | **exited** | §4.1 has no `Measured:` row; the 10,000-item sizing run is generated and passing |
| 2 — The grid, blind | complete | **not exited** | §4.2's blind baseline is unmeasured |
| 3 — Captures, pass 1 | complete | **not exited** | §4.3's coverage and duplicate distribution are unmeasured |
| 4 — Selections | complete | **not exited** | §4.4's confirmation rate and regretted-sweep rate are unmeasured |
| 5 — The round trip | complete | **exited** | §4.5 is entirely automated, and passes |
| 6 — Identity and collections | complete | **exited** *(with a caveat — §3.3)* | §4.6's rows all pass against real SQLite |
| 7 — Turning pass 2 on | n/a | **does not run** | No acceptable vendor as of 2026-08-18 |

**Three of the seven built phases have not exited, and the reason is the same
one in all three cases: nobody has used the thing on a real pile.** Those three
missing measurements are exactly the three `data:` blockers now sitting in the
digest. This is not a coincidence to be noted and moved past — it is the whole
of the initiative's remaining risk, and §4 below is about what it means.

The suite itself is green: **42 Node tests and 3 browser tests pass** as of this
writing, including the generated 10,000-item pile and the visible 3,000-item
sweep.

## 2. What is genuinely good, and worth not losing

A critique that only lists faults gives a false impression of a build whose
engineering is, on inspection, careful. Six things are better than they had to
be:

1. **One selection evaluator, used by every caller.** `src/selections.mjs` is
   shared by the UI-scoped path, the administrative path, saved expressions and
   proposal expressions. §8.2's three ways of writing a tag genuinely converge
   on one parser rather than three that agree by accident.
2. **Owner scoping is checked per method in the store, not at the routing
   layer.** `d1-store.mjs` re-checks the active collection in D1 even when its
   id arrives in a header. Supplying another owner's collection id directly is
   a tested attack, not an assumed impossibility.
3. **Captures are URL-keyed and global; items are collection-keyed.** Deleting a
   demo copy cannot delete a capture another collection is using, and this falls
   out of the schema rather than out of care in a delete path.
4. **Nothing joins an item to a user.** The path is item → collection → user,
   and there is a schema test asserting no shortcut exists. That is the right
   thing to pin, because the shortcut is what someone adds when a query is slow.
5. **The capture tests use a local HTTP fixture server rather than mocking the
   fetch.** 404, timeout, TLS failure and a parked domain are exercised as
   responses, not as thrown stubs. This is the difference between testing the
   pipeline and testing the mock.
6. **The pass-2 queue is explicitly driven and there is a test that nothing
   drains it unasked.** `plan.md` deferred the automatic drivers *to keep the
   measurement honest*, and the test pins that reason rather than the
   convenience.

## 3. Findings

### 3.1 The one image path that must not fail open has no implementation, and neither of its guards is tested

`capture-pipeline.mjs` will not store an image unless an injected
`transformImage` returns a complete derivative within 600×360. Two guards
enforce it: an incompleteness check, and a size check. The design is right —
it fails closed, storing nothing rather than putting an original in R2.

But `transformImage` is **injected everywhere and implemented nowhere.**
`work/README.md` says "the deployment assembler supplies the server-side
`transformImage` function"; there is no assembler in `work/`. And the test stub
(`test/capture.test.mjs`) returns a hard-coded `600×360` every time, so:

- no test ever exercises the oversize guard;
- no test ever exercises the incompleteness guard;
- the only other `transformImage` in the suite (`test/pile-app.test.mjs`,
  `value => value`) belongs to a test that pre-seeds its capture row and never
  runs the pipeline's image branch at all.

So the single rule that keeps original bytes out of R2 — §6's derivative-only
promise, which is also the privacy claim — is enforced by code that has never
been shown to enforce anything. **This is the most fixable finding here**: two
stub variants and two assertions, no new design. It should be closed before
deployment, not after.

### 3.2 The build has never run on the host it was designed for

Phase 0 deployed a *throwaway probe* to ChatGPT Sites, observed its rows, and
deleted it. The application itself has never been assembled or deployed. Every
result in phases 1–6 comes from Node, from `MemoryBookmarkStore`, from real
SQLite run locally, or from local Playwright against generated data.

That is a defensible way to build — `plan.md` §2's seams are what made it
possible — but it means two things are still assumptions:

- **Identity (O8) is tested against a header we supply ourselves.** The tests
  prove the Worker rejects a missing `oai-authenticated-user-id` and scopes
  correctly to whatever it is given. They cannot prove ChatGPT Sites supplies
  what `site-identity.mjs` expects, in the form it expects, for two different
  real accounts. Phase 0 observed the header at the host level; the two-user
  isolation attack was deliberately left as "the phase 6 product test", and
  phase 6 ran it against simulated sessions.
- **§4.0's recorded batch and export numbers sized phase 3 and phase 5, but
  those phases were then built and measured locally.** The ten-concurrent-fetch
  elapsed time and the export byte count are evidence from the probe, not from
  the app.

Neither is alarming. Both are the kind of thing that is cheap to settle by
deploying once and expensive to discover after the graduation decision is made.

### 3.3 Pass 2 is permanently off, and that is a product fact now, not a deferral

On 2026-08-18 the user found no acceptable screenshot vendor. `plan.md` phase 7
says the app is then "finished without it and gap items keep no picture —
visibly missing rather than confidently wrong". That reasoning holds. What has
changed is only that it is no longer provisional: **the shipped product is one
where an unknown fraction of items have no picture at all.**

The size of that fraction is §4.3's unmeasured coverage number. Which means the
question "is a blind grid with holes in it still fast to triage?" — the question
O3 exists to answer — cannot currently be answered even in principle. It is
downstream of a measurement nobody has taken.

### 3.4 There is no target rate, and there cannot be one yet

`objectives.md` is explicit that the rate target is "a target to be set in
`spec.md`, once there is a measured baseline to argue from. Setting it now would
be a guess dressed as a requirement." That was the right call. Its consequence,
now due, is that **O3's success criterion is not merely unmet — it is
undefined.** The session instrument built in phase 2 records a rate; nothing
says what rate would be good.

This is the finding that most directly gates the decision in §5. "Is this worth
graduating?" is very close to "is the rate worth it?", and that has no answer
yet by design.

### 3.5 The repository's ordinary graduation path does not fit this initiative

`DEMOS_TECHDOC.md` publishes `demos/<name>/` as static files copied to GitHub
Pages. The bookmark sorter is a Worker with D1 and R2 behind signed-in identity.
It cannot become a `demos/` entry, and the `deploy-demo` skill is not the route.

Graduation here means **deploying to ChatGPT Sites and handing a tester a seeded
demo collection** — which is what O8's "how we will know" row already describes.
Worth stating explicitly, because "graduate it" in this repository usually means
something else, and the mismatch would otherwise be discovered at the moment
somebody tries.

### 3.6 Smaller notes

- **`spec.md` §12's rate target row and `spec.md` §6's duplicate threshold are
  both still placeholders** awaiting the same measurements. They are correctly
  marked, but they mean two spec sections currently describe intentions rather
  than the build.
- **The four blocked items are all `effort: small`.** That is accurate — each is
  one sitting or one confirmation — and it is worth noticing that the entire
  remaining risk of this initiative is four small things that only the user can
  do. Nothing here needs another build phase.
- **Cost, not capability, gates the host.** `confirm-sites-metering` is the one
  non-`data:` blocker, and it can invalidate the host choice rather than degrade
  it: a limit that binds at 10,000 items plus a few hundred MB is a different
  host, not a smaller feature.

## 4. What this build actually proved, stated plainly

It proved the **mechanism**: 10,000 items land idempotently, a blind grid stays
bounded at four layouts, a 3,000-item sweep is one visible action with one undo,
a collection survives an export/import round trip, and two owners cannot reach
each other. Every one of those is a real answer to a real risk, and several
were the risks most likely to sink the design.

It has not begun to prove the **premise**: that triaging a large pile this way is
fast enough, and pleasant enough, to be worth having built. Every test in the
suite runs against generated or hand-written data. The user's actual pile — the
5,000–10,000 items the whole design is sized for — has never entered it.

That asymmetry is not a failure of the plan; `plan.md` §7 named the person-and-a-
real-pile dependency as its largest scheduling risk, and it was right. But the
build has now run out of things that can be learned without it.

## 5. The graduation-or-dormancy decision, prepared

**This decision is not settled here.** It rests on the four blocked items, three
of which are facts only the user has and one of which needs their authority.
What follows is the decision laid out so that making it is cheap.

### The options

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Deploy, then measure** *(recommended)* | The four blockers are all cheap once the app is running with a real pile in it, and three of them can be satisfied by the same sitting; it closes §3.2's assumptions in the same step; the tester row of "how we will know" becomes possible | Requires the `cost:` answer first, and §3.1's image path fixed first; spends effort before the premise is validated |
| **B — Measure on the local build, then decide** | Needs no host and no cost answer; the blind baseline and the selection sitting can both be taken against the local Worker with the real pile imported | Coverage and duplicates (§4.3) need real outbound fetches over real bookmarks, which is most of a deployment anyway; leaves §3.2 open; a local sitting is not the sitting O7 and O8 describe |
| **C — Dormant now, with the build intact** | Honest about an unvalidated premise; costs nothing further; the work is committed, tested, and documented well enough to resume | The three measurements get harder to take the longer the context fades; a dormant initiative one sitting away from an answer is an odd place to stop |
| **D — Archive** | — | Not defensible on the evidence: nothing has failed. The mechanism worked at every phase gate that could be automated |

### The recommendation, as a recommendation

**Option A**, sequenced: answer `confirm-sites-metering`; close §3.1's two
untested guards and write the real `transformImage`; deploy; import the real
pile; take one sitting that satisfies the blind baseline and the selection
measurements together; read coverage and duplicates off the same import.

The argument is that three of the four blockers collapse into one afternoon
*once the app is running*, and the fourth is a yes/no the user already has the
information to answer. Against that, dormancy costs an initiative that is one
sitting away from knowing whether it was worth building.

### What would change the answer

- **If the metering answer is no**, A is unavailable as written and the decision
  becomes B or C — and §2's host choice reopens, which is a larger question than
  this critique.
- **If a real import shows metadata coverage is poor** — say, under half the
  pile getting a distinguishable picture — then with pass 2 permanently off
  (§3.3), the blind grid is a grid of mostly-blank cards, and dormancy becomes
  the honest reading rather than the cautious one.
- **If the measured rate is close to the blind-baseline rate**, the mechanism
  did not earn its complexity, and that is a finding worth having rather than a
  disappointment.
- **If the user's appetite is for a different pile problem entirely**, none of
  the above matters and C is right regardless of the numbers.

### What this critique does not recommend

Building anything further before the measurements. There is no phase 8 worth
designing, no feature whose absence is currently the problem, and no test whose
addition would change the decision — except the two in §3.1, which are about
protecting a promise already made rather than extending the product.
