# Decisions

Questions this initiative was waiting on, and how they were settled. Newest at
the bottom. Written so a later reader — including a later version of us — does
not re-argue something already decided.

## 2026-08-14 — How large is the real bookmark pile?

**5,000–10,000 items.**

### What this settles

That number is large enough to rule things out, which is what makes it worth
recording:

- **Clustering is not a nicety, it is the mechanism.** Judging 5,000 items one
  at a time at even three seconds each is over four hours of unbroken attention.
  Objective 5 — judging related items as a group — is what makes the pile
  finishable at all, so it is core rather than a convenience.
- **The item view has to be virtualised.** Ten thousand DOM nodes with
  screenshots is not something to render naively; only a screenful should exist
  at a time.
- **Snapshot cost is now a real number.** At 10,000 items, anything per-item and
  slow — fetching and rendering each page — is hours of work and a storage bill,
  not a detail. This directly constrains the still-open snapshot question.
- **Storage is not a constraint.** Ten thousand rows of title, URL, date, tags
  and verdicts is small by any measure. Only the images matter.

## 2026-08-14 — Where should this run?

**A web app** — most likely hosted on an OpenAI site, using its database.

The "most likely" is the user's, and is kept: the *shape* is settled, the host
is a leaning.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Web app** *(chosen)* | One codebase spans widescreen, tablet and phone, which objective 3 asks for directly; full control of a dense snapshot grid and keyboard-driven triage; server-side storage makes backup and export straightforward; reachable from any device with no install | No direct access to browser bookmarks, so ingestion is a manual export; cannot capture page snapshots client-side; needs hosting and some access control for personal data |
| **Local script** | Simplest to build; no hosting, no auth, data obviously the user's; can fetch and render pages freely | Weakest at the thing that matters most — a fast visual grid across three form factors is not what a script is good at; single-machine, so no phone or tablet triage |
| **Browser extension** | Direct bookmark access, no export step; the only option where creating tab groups and bookmark folders is natural; can capture snapshots of pages as they are visited | Cramped UI for an 8×2 grid; per-browser implementation and review overhead; awkward on iOS |
| **Hosted service** | Most capable — server-side rendering for snapshots, cross-device harvesting, scale | Most infrastructure and the most to run and pay for; heaviest possible answer to a personal triage problem |

### Why the web app wins here

The wish's stated priority is triage speed, and objectives 3 and 4 turn that
into a screen-filling grid of snapshots that adapts from a widescreen to a
phone. That is the one requirement a local script cannot meet and an extension
meets awkwardly. Everything else in the wish — ingestion, tags, clusters,
export — is achievable in any of the four.

The specific cost is worth naming plainly: **the web app is the weakest option
for the two capabilities the wish lists as extensions.** Harvesting open tabs
from other devices and pushing subsets back into Chrome as tab groups are both
natural in an extension and awkward from a web page. Choosing the web app
trades those away in exchange for the triage experience being good. Given that
the wish marks both as extensions and triage as the point, that is the right
trade — but it should be a known one, not a surprise later.

### On hosting it on an OpenAI site

- **In favour** — hosting, storage and sign-in come with the platform, so none
  of it has to be built or run. A model is available in-platform, which fits
  auto-tagging by topic and automatic clustering (objectives 5 and 6) without a
  separate integration. The wish already anticipated this, noting the extensions
  "may be offered initially or exclusively through an LLM agent".
- **Against, or unknown** — objective 7 requires the data be exportable and
  portable, so whatever store is used has to let the data out; how much control
  there is over layout density matters for an 8×2 grid; and whether arbitrary
  third-party pages can be fetched and rendered there bears directly on
  snapshots.

None of those are blocking to start writing a spec. They are the questions the
spec has to answer.

### What this makes harder

**The snapshot question is now more constrained, not less.** A web page cannot
screenshot an arbitrary third-party page from the browser — same-origin rules
prevent it. So with a web app the options narrow to: capture server-side at
ingestion, use a third-party thumbnail service, or fall back to whatever
favicon and OpenGraph image the page already advertises.

Combined with a pile of 5,000–10,000, live-fetching per item on demand is
effectively ruled out on cost and latency. That is worth knowing before the
snapshot decision is made.

### Still open, following from this

- Which OpenAI surface, and what its database and export story actually is.
- How snapshots are obtained, now narrowed as above — recorded separately as an
  open blocker.
