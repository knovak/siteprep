# Log

## 2026-08-17 — Draft objectives.md - what "done" would mean

Drafted objectives.md from the wish: nine outcomes, arranged around the initiative lifecycle as the wish's central theme, with the two readers it names - a forker and a contributor - asking the same question from opposite sides.

The finding that shapes the rest: this repository already explains itself in five files totalling well over 100 KB, so the guide is not filling a vacuum. The gap is an entry point, not information - and the naive reading of the wish's five artefacts makes each a fresh retelling of the lifecycle, which is six copies of every rule and five that will be wrong first. Two of the five are renderings rather than documents, leaving three things genuinely written.

Drift is therefore recorded as an objective in its own right rather than a caveat: the process is edited by the very mechanism the guide describes, so a guide that is merely accurate today has a shelf life.

Two questions the wish does not settle are recorded as blocked items rather than answered: what is authoritative and how the guide stays true to it, and how faithful the simulator has to be. Two more are left to the spec - where the PDFs come from, given that this repository does not commit generated files, and whether the deck and the description share a source.

## 2026-08-17 — Decide what is authoritative, and how the guide stays true to it

Answered on review of #227: generate the guide's process content from the repository's own sources, and date the outputs so a manual double-check can tell whether they are current. Recorded in decisions.md.

The dating is not the third option arriving through the back door - the user took generation and the dating that belonged to accepting drift, which says generation is not assumed to be total and a date is what covers the part it does not reach. Unblocks draft-spec, which is now a spec for a generator. Leaves open which repository source is authoritative for a given claim, which is the real work this creates.

## 2026-08-17 — Decide how faithful the lifecycle simulator has to be

Answered on review of #227: animate an abstract lifecycle for now, with an upgrade to the real initiative.json held open if the animation turns out not to be adequate. Recorded in decisions.md.

The trigger for the upgrade is the user's judgement and is deliberately not converted into a metric. The cost recorded with it: the simulator is the one deliverable outside the generation guarantee, so it is the case the dating requirement is carrying.

## 2026-08-17 — Draft spec.md - how the description, deck, PDFs, and simulator are built

spec.md drafted: one generated fact set, hand-written narrative that cites it by token, and four renderings of one source. Settles the two questions decisions.md left open - authority per claim, and where the generated/written line falls - and names the protected-path change publication needs.

## 2026-08-18 — Review round on the spec: generated on request, self-contained, and delivery out of scope

Seven comments, and three of them changed the shape of the thing rather than its wording.

The guide is now produced **on request by a skill**, not by the site build. That removes the build.sh hook, and with it the arrangement where a fact-extraction failure sat in the path of an unrelated deck's deploy - the guide's correctness now gates the guide only. The cost, recorded rather than absorbed: nothing prompts a regeneration, so an artefact in circulation can be stale, which makes the dating requirement load-bearing instead of a nicety.

Each artefact is a **single self-contained HTML file** - styling, script and data inline, no origin needed. That is what makes deployment a later choice rather than a prerequisite, and it is why the deck cannot share the site's assets by reference.

**Delivery is out of scope**, on the user's instruction. This leaves objective 1 - a newcomer finding the entry point without being told where it is - unmet by what is specified, since a file in guide/out/ is reachable by nobody. Recorded in a section of its own rather than quietly reworded, with the two ways it can go, because amending an objective is the user's call.

A vocabulary correction, which was worth more than it looked: the spec said "hand-written" and "hand-drawn" where it meant "not derived from a source". Nothing here is written by hand - it is all authored by an agent. The distinction that matters is where a sentence gets its truth, so the words are now **derived** and **composed**, defined once in §1.

The protected-path change shrank from three edits to one: five `export` keywords in scripts/initiatives.mjs, drafted as its own pull request because a sweep branch cannot touch scripts/.
