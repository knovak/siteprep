# Objectives

What "done" would mean, derived from the wish. Outcomes, not implementation —
how any of this is built belongs in `spec.md`.

## The point

**Let someone who has never seen this repository understand how work moves
through it — well enough to either copy the process or take part in it.**

The wish names two readers and they want different things from the same
material. One is *considering a fork*: they want to know what this process is,
whether it is worth having, and what they would have to carry across to get it.
The other is *considering a contribution*: they want to know what is expected of
them, what the agents will do without being asked, and where their judgement is
required. Both questions are about the same lifecycle; they are asked from
opposite sides of it.

The failure mode to name early is a **guide that is beautiful on the day it
ships and wrong a month later**. That is worse than no guide, because a reader
who trusts it makes decisions on it. The process this describes is not a stable
subject — it is edited by the very mechanism it documents, and the last six
weeks of `git log` are almost entirely changes to it. Any objective below that
cannot survive the process changing underneath it is not an objective; it is a
snapshot.

## What makes this hard, and what it changes

This repository already explains itself, at length, in five places:

| Source | What it holds | Length |
|---|---|---|
| `AGENTS.md` | Working conventions an agent must follow | ~16 KB |
| `INITIATIVES_VISION.md` | The design and its reasoning | ~87 KB |
| `INITIATIVES_TECHDOC.md` | What the build actually does | ~12 KB |
| `BUILD_TECHDOC.md` | The build, browser setup, screenshots | ~6 KB |
| `DEMOS_TECHDOC.md` | How a demo is published | ~2 KB |

So the guide is not filling a vacuum. Nothing here is undocumented; it is
documented at a length and in a register that assumes you already work here.
The gap is an *entry point*, not information.

That changes what the deliverables are for. The wish asks for five artefacts —
a web description, a 10–20 slide deck, PDFs of each, and a simulator — and the
naive reading makes each one a fresh retelling of the lifecycle. That is six
copies of every rule, five of which will be wrong first, and it is exactly the
failure mode above with more surface area. **The five artefacts are five ways
into one account, not five accounts.** Two of them (the PDFs) are renderings
rather than documents at all, which leaves three things that are genuinely
written: a description, a deck, and a simulator.

## Done means

1. **A newcomer can find the entry point without being told where it is.** The
   guide is reachable the way decks, demos and initiatives are reachable — from
   the site, and from the repository's front door — rather than being a file
   that has to be recommended.

2. **The initiative lifecycle can be explained in one sitting.** A reader comes
   away able to say what an initiative is, name its stages, and say what changes
   at each one. This is the wish's central theme and the material everything
   else is arranged around.

3. **The division of labour is explicit.** For each stage, the guide says what
   the person supplies and what the agents supply — which is the question a
   prospective contributor actually has, and the one that is hardest to answer
   from the existing documents because it is spread across all of them.

4. **The process can be watched, not just read.** The simulator steps through
   the lifecycle so a reader sees an initiative move — a wish becoming
   objectives, an item becoming blocked, a sweep opening a pull request, a merge
   unblocking something else. Reading a stage table tells you the stages exist;
   stepping through one shows what makes them advance.

5. **The other two content areas are covered honestly, and briefly.** How a deck
   is modified and how a demo is added are each a short section — enough that a
   reader knows the shape and where to look, and no more. The wish asks for a
   "brief description" of both, and this is one of the few places where saying
   less is the requirement rather than a compromise.

6. **A forker can tell what to take.** The guide identifies which parts of this
   repository carry the process — the instruction files, the workflows, the
   scripts, the test suites — and which parts are this repository's own content.
   Someone can copy the first set and leave the second behind without reverse-
   engineering the build.

7. **A reader can always reach the authoritative text.** The guide is a way in,
   not a replacement: every rule it states points at the file that actually
   governs it, so a reader who needs the real answer is one link from it. This
   is what keeps the guide short enough to stay true.

8. **The material is portable off the site.** The slides and the description
   exist as PDFs that can be sent to someone who will not clone anything or
   open a browser tab. They are made by hand and kept on Google Drive
   (`decisions.md`, 2026-08-17), so they are the one deliverable that is neither
   generated nor in the repository — which is why objective 9 applies to them
   most of all.

9. **Drift is detectable rather than discovered.** When the process changes, the
   guide's disagreement with the repository shows up where a person will see it
   — not as a reader following an instruction that stopped working. Two
   mechanisms, both settled in `decisions.md` on 2026-08-17: the process content
   is **generated from the repository's own sources**, so it cannot disagree;
   and **every output carries a date**, so the parts generation does not reach
   can be checked by hand. The second is not a weaker version of the first. It
   is what covers the hand-written narrative, the simulator, and the PDFs, none
   of which generation reaches.

## Explicitly not the first version

- **A tutorial that walks a reader through making a real contribution.**
  Valuable, and a different kind of document — it goes stale faster than
  anything above and cannot be written until the explanation exists to hang it
  on. `background.md` notes Diátaxis's distinction between explanation and
  guided instruction; this initiative is doing the first.
- **Placing the guide at the point of contribution** — a `CONTRIBUTING.md`, or
  links surfaced when someone opens a pull request. `background.md` records this
  as how GitHub expects process material to be found, and it is worth doing.
  It is also a small piece of plumbing that is much easier once there is
  something finished to point at.
- **A free-play sandbox in the simulator.** Objective 4 asks for a guided
  walk-through. Letting a reader construct arbitrary initiatives and see what
  the rules do is the more interesting toy and the larger build, and it is not
  what makes the process understandable the first time.

## How we will know

- Someone who has not worked in this repository reads the description, and can
  then say what stage a given initiative is at and what would move it on.
- **A contributor can answer "what is expected of me" without opening
  `INITIATIVES_VISION.md`.** That file is the design and its reasoning; needing
  it in order to take part is the gap this initiative closes.
- The deck can be presented in ten minutes without narration from someone who
  already knows the answer.
- The simulator is stepped through end to end, and every stage transition it
  shows corresponds to something `initiative.json` and the sweep actually do.
- **A process change lands, and the guide either updates with it or something
  complains.** This is the test objective 9 makes, and the one a guide that is
  merely accurate today would pass without meaning anything.

## Decisions this raised, and where they landed

Drafting these surfaced three questions the wish does not settle. All three were
answered on review the same day and are now in `decisions.md` — the reasoning
lives there, and this list is only a map to it. Nothing here is still waiting on
the user.

1. **What is authoritative, and how does the guide stay true to it?**
   The process content is **generated from the repository's own sources**, and
   **the outputs are dated** so the parts generation does not reach can be
   checked by hand. This is what makes the initiative a build rather than a piece
   of writing, and it is the whole of objective 9.

2. **How faithful is the simulator?** An **abstract lifecycle for now**, with an
   upgrade to the real `initiative.json` held open if the animation turns out not
   to be adequate. It is therefore the one deliverable outside decision 1's
   guarantee, which is the cost recorded with it.

3. **Where do the PDFs come from?** **Made by hand and kept on Google Drive** —
   so the repository's rule against committing generated files is sidestepped
   rather than argued, and objective 8 is written accordingly.

One question is left to the spec rather than raised as a blocker:

- **Whether the deck and the description share a source.** They cover the same
  ground at different lengths, which is either one document rendered two ways or
  two documents that will disagree. Decision 1 makes sharing a source the cheap
  default — if the process content is generated, generating it twice at two
  lengths is a parameter — but that is an argument for the spec to make, not a
  decision the user has taken.
