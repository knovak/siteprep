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

## 2026-08-14 — Where do page snapshots come from?

**Captured at ingestion.** Not live-fetched per item on demand, and not left to
whatever favicon the page already advertises.

The user asked for the follow-on question to be worked out rather than left:
*"Identify ways to do this: how do iMessage, WhatsApp, and Google Chat do it?
How about browsers' tab displays? Find alternatives, compare, and choose one."*
So the choice of **mechanism** below is ours, made on their instruction; the
choice of **ingestion time** is theirs.

### How the systems that do this at scale actually do it

Worth stating first, because it reframes the question: **none of the three
messaging apps takes a screenshot.** All three build a card out of metadata.

| System | Who fetches | What it captures | Notable |
|---|---|---|---|
| **iMessage** | The sender's device | Open Graph tags — `og:title`, `og:description`, `og:image` | Apple's crawler is deliberately conservative: HTTPS only, static HTML only, **no JavaScript executed**. Missing or JS-injected tags mean no card at all — it degrades to a bare URL rather than guessing |
| **WhatsApp** | The sender's device (mobile); Meta's servers on WhatsApp Web | Same Open Graph tags | The preview is generated once and **travels with the message** — the recipient sees the sender's capture, and sees it even with previews disabled locally |
| **Google Chat** | Google's server-side unfurl service (UA `GoogleMessages`) | Same Open Graph tags, falling back to `<title>` and `<meta name=description>` | Fetch once per URL, **cache against the URL**. Aggressive enough that a corrected tag can take a long time to appear |
| **Browser tab thumbnails** (Chrome, Firefox, Safari) | The browser itself | Real pixels — a compositor capture of the rendered page | Only possible because *the browser already has the page rendered*. Extensions get `chrome.tabs.captureVisibleTab`, and the name is the limit: the **visible** tab |

Two things fall out of that table and they drive everything below.

**The metadata path is universal because it is cheap and it degrades well.**
Every one of these products chose two HTTP requests and a fallback ladder — OG
tags, then `<title>`, then bare URL — over rendering a page. At messaging volume
the economics are the same as ours at 10,000 items.

**Pixels only appear where a renderer already had the page.** The browser is not
solving our problem; it is capturing something it rendered anyway for its own
reasons. Reproducing that means standing up the renderer ourselves, and Firefox's
history is the warning label. Its background thumbnailer captured pages
*without cookies*, so the thumbnail was the logged-out view rather than the page
the user saw — the substance of Mozilla's bug 1413650, which proposed capturing
the loaded tab instead. And the opposite failure has a scar too: in 2012
Firefox's new-tab thumbnails were found to be caching views of logged-in pages,
exposing private data on a shared screen. An anonymous render is inaccurate; an
authenticated one is a liability.

### Alternatives considered

All are "at ingestion" — the family the user chose. They differ in what gets
captured.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Metadata card** — fetch the HTML, parse `og:image`/`twitter:image`, title, description, favicon; fetch and downscale that one image | What every messaging app does, for good reason. Two requests per item, trivially parallel — 10,000 items in minutes, not hours. No browser to run. Degrades in defined steps instead of failing | Coverage is partial: news, blogs and product pages carry `og:image`; documentation, PDFs, forum threads and old personal sites often carry nothing. Worse, `og:image` is frequently a **site-wide banner**, so fifty links from one site produce fifty identical cards — precisely where clustering puts them side by side |
| **B. Headless render** — Playwright screenshots every URL server-side | Near-total coverage, and the capture is of *that page* rather than its publisher's banner. Most faithful to objective 4's "judged on sight" | 300–500 MB of RAM per browser process, so real capacity planning. Roughly an hour of wall clock for 10,000 pages at eight workers. Many captures are worthless anyway — cookie walls, consent overlays, paywalls, and login screens all screenshot beautifully and tell you nothing |
| **C. Third-party screenshot API** | No infrastructure. Priced around $4–10 per thousand, so a 10,000-item backlog is a one-off $40–100 — not the blocker it might sound like | Every URL in a personal bookmark pile is handed to a third party. Recurring cost for a personal tool, and one more dependency between a bookmark and its picture |
| **D. Capture on visit** — an extension grabs the page as you actually browse it, the way a browser fills its own thumbnail cache | The only option that captures the *logged-in, dismissed-banner* page, because a human was there | Nothing to show for a backlog accumulated over years — it can only work forward. Already ruled out upstream: the runtime is a web app, not an extension |
| **E. Metadata first, render the gaps** *(chosen)* | Spends the cheap path on the majority and the expensive one only where the cheap path fails the sight test. One pipeline, one fallback ladder | Two capture paths to build and keep working. Needs a rule for what counts as "failed", which is the interesting part |

### The choice: metadata first, render the gaps

Ingest with the metadata path. Then run a **second pass, deferred and
resumable**, that renders only the items the first pass could not make
distinguishable:

1. **No image found** — no `og:image`, no `twitter:image`, nothing usable.
2. **A duplicated image** — hash each captured image, and where one image covers
   more than a handful of items, treat all of them as having no image. This is
   the case worth naming: fifty links to one documentation site all inheriting
   one banner is a *worse* outcome than fifty blanks, because it looks like it
   worked.

Everything else keeps its metadata card. Ingestion never waits on the render
queue; an item is usable — title, site, tags, verdict buttons — the moment it
lands, and its picture improves later.

The reason this beats plain B is not cost, which at these volumes is real but
survivable either way. It is that **B's failure mode is invisible and A's is
loud.** A screenshot of a consent wall is a confident, wrong picture; a missing
`og:image` is a hole you can see and queue work against.

### Rules this carries

- **Capture anonymously.** No cookies, no session, ever — the 2012 Firefox flap
  is what the other choice looks like. The logged-out view is less useful and it
  is the only one safe to store.
- **Do not execute JavaScript on the metadata path.** Apple's crawler doesn't,
  and it keeps the cheap path cheap and predictable. JS-rendered pages fall
  through to the render pass, which is exactly where they belong.
- **Store the derivative, not the original.** Grid cells are small — an 8×2
  widescreen layout is roughly 300 px wide per cell — so downscale to a fixed
  size on capture. Ten thousand items at that size is a few hundred megabytes,
  which the earlier finding already established is not the constraint.
- **Cache against the URL and never re-fetch on view**, as Google Chat does.
  Re-capture is an explicit action, not a page load.
- **Record the failure as data.** Dead links, timeouts and 404s discovered during
  capture are not errors to swallow — in a pile assembled over years they are
  among the most valuable triage signals available, and should reach the item as
  a tag.

### What this settles, and what it does not

- **Settled**: snapshots are captured once, at ingestion, server-side and
  anonymously; metadata is the primary path, an anonymous headless render is the
  fallback for items with no image or a shared one; captures are stored
  downscaled and never refreshed on view.
- **Settled on review**: the render pass uses a **paid screenshot API**, not a
  headless browser we run. See below.
- **Settled on review**: the duplicate threshold **starts at 30** — an image
  covering 30 or more items marks all of them as needing a render. A starting
  value, to be moved once there is real data.
- **Unblocks** `draft-spec`, which was waiting on this to write its alternatives
  section — most of the table above is the raw material.

### The render pass runs on a paid API

The user's call on review: *"Use a paid API."*

It reads better than it did as option C standing alone, because metadata-first
changes its arithmetic and its privacy cost at the same time. Only the gap items
are rendered — a minority of the pile — so a 10,000-item backlog is a few
thousand captures, well inside the $4–10 per thousand band and a one-off rather
than a running bill. The same reduction applies to the objection: instead of
handing every bookmarked URL to a third party, we hand over only those with no
usable `og:image`. That is still a real disclosure and should be recorded as an
accepted cost, not argued away — but it is a fraction of the pile rather than
all of it.

What it buys is that nobody has to run and pay for a browser fleet, and the
300–500 MB-per-process capacity planning in option B never has to happen. For a
personal tool with a one-off backlog and a slow trickle after it, that is the
right shape: the expensive path is rented for the burst, not owned for the year.

The dependency is the thing to keep an eye on. A capture that cannot be re-made
without a vendor is a capture worth storing carefully, which is the next section.

### The export carries no captures, and a cache makes that cheap

WhatsApp's preview *travels with the message*: capture and content move
together. The question was whether an export should do the same. Answered on
review: **"No metadata in the export."**

So an export is the user's own material — items, URLs, tags, verdicts — and
nothing derived. That is a cleaner reading of objective 7 than bundling images
would have been. What must not be trapped is the *judgement*: which things are
keepers, and what they were called. Pictures are a rebuildable convenience, and
shipping thousands of them inside a JSON file would make the portable artefact
large and awkward in exchange for data the system can produce again.

The user's follow-on, and it is the right one: *"Consider if our system should
keep its own thumbnail cache, so re-import of a collection can re-use the cache
rather than reprocessing."*

**Yes — the capture store should be keyed by URL, not by item.** Without that,
the decision above has an ugly consequence: re-importing a collection you
exported last week would re-capture every item, paying the API a second time for
pictures we already have. Keying by URL removes it, and the same key pays off
three more times:

- **Collections overlap.** Several people testing the same demo, or two users
  who both bookmarked the same well-known page, capture it once between them.
- **The demo collection is free.** It is the same URLs as somebody's real one.
- **Re-import is the normal case, not the exception.** Export and re-import is
  how a collection moves between users and how a test collection gets reset.

The one thing this forces into the open: **a URL-keyed store shared across
collections means one user's capture is served to another.** The content itself
is harmless — every capture is anonymous and logged-out, so it holds nothing
that a stranger visiting the URL would not see. What can leak is *existence*: a
fast cache hit says someone, somewhere, has this URL. Whether that matters
depends entirely on whether collections are meant to be private from each other,
which is the `collection-access` question already waiting on the user. Recorded
there rather than decided here — but the two answers have to agree, and if
collections turn out to be private, the cache should be per-collection with the
extra capture cost accepted.

## 2026-08-14 — How are collections identified and protected?

**Signed-in accounts.** The user's words: *"(presuming we use ChatGPT sites,
user IDs will be built in.)"*

The parenthesis is theirs and is kept as one. The **model** is settled —
collections belong to identified users rather than to whoever holds a link. The
**mechanism** rests on the same leaning as the runtime decision above, that the
host is an OpenAI surface and supplies identity. If that host changes, sign-in
becomes something to build rather than something inherited, and it is not a
small piece of work. Worth knowing before the surface is chosen, not after.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Signed-in accounts** *(chosen)* | A collection has a real owner, so "one per user" means something enforceable. Free if the host supplies identity. Private by default, which is the right default for a pile of personal bookmarks | Costs a sign-in before a tester can look at anything — the highest-friction option for the exact case that motivated collections. Ties the project to whatever identity the host offers |
| **Unguessable share links, no sign-in** | Lowest friction for testers — send a link, they are in. No identity to build or depend on | The link *is* the credential, so it leaks by being forwarded, logged, or pasted. Nothing to attach "one per user" to, and no way to revoke one person |
| **One shared instance, named collections, no protection** | Simplest thing that could work; fine for a demo | Anyone can open, edit, or delete anyone's collection, including by accident. Untenable the moment a real pile is in there |

### What this settles, and what it does not

- **Settled**: collections have owners, and a collection is private unless
  something explicitly makes it otherwise.
- **Settled, following from that**: the URL-keyed capture cache stays **shared
  across collections**. See below — the reason the earlier entry gave for
  splitting it does not survive contact with this answer.
- **Not settled**: how non-personal collections work. The wish asks for them
  ("eg to use as a demo"), and private-by-default is exactly what a demo is not.
  Recorded as a new blocker rather than assumed.
- **Not settled**: which OpenAI surface, still — this decision now leans on that
  question rather than merely following it.

### The cache stays shared, and the earlier entry was too cautious

The previous entry said that if collections turned out to be private, the cache
should be split per collection. That rule was written before the answer existed
and is worth correcting rather than obeying: **the deferred capture pipeline
already closes the channel it was worried about.**

The concern was a timing side channel — an instant thumbnail tells you someone
else already has this URL. But captures were already specified as deferred and
asynchronous, precisely so ingestion never blocks: a picture arrives *after* the
item, whether it came from the cache or the API. There is no fast path to
observe.

What is left is weak even if you could observe it. Every capture is anonymous
and logged-out, so the content is what any stranger visiting the URL would see.
The only inference available is *"someone else also bookmarked a URL that I
myself just bookmarked"* — you have to already hold the URL to learn anything
about it. Splitting the cache would trade the demo collection's near-zero cost,
and cheap re-import, for a defence against that.

So: one URL-keyed capture store, shared. If the sharing decision below lands
somewhere that makes this uncomfortable, it is cheap to revisit — the cache is
derived data and can be partitioned later without touching anything the user
owns.

### Still open, following from this

- **What makes a collection non-personal?** A general sharing model with owners
  and explicit readers, a public/private flag where public means any signed-in
  user may read it, or demo collections special-cased and seeded rather than
  shared at all. Recorded as `collection-sharing`.
- Whether a user may hold several collections of their own, which the wish's
  "one per user" implies but does not require, and which the "choose collection"
  menu has to render either way.

## 2026-08-14 — What makes a collection non-personal?

**Special-case the demo collections — seeded, not shared — for now.** With, in
the user's words, a *"plan to have a general sharing scheme for a later
revision."*

Both halves matter. The first version builds no sharing machinery at all. The
second half is not a hedge: sharing is expected, so nothing in the first version
should make it harder to add.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Seeded demo collections** *(chosen)* | No sharing model, no ACLs, no reader lists — the whole question is deferred rather than half-answered. Every collection stays exactly what decision 3 made it: one owner, private. Testers cannot tread on each other | Only solves the demo case. Any real "show this to a colleague" need has to wait for the general scheme |
| **Public/private flag** | One boolean, and a demo collection is just a public one. Cheap to build | A boolean is a sharing model, and the smallest one that is already wrong: no way to share with *one* person, and "public" means different things once real piles are in there. The kind of thing that is hard to migrate off precisely because it was cheap |
| **General sharing model now** | Solves it properly and once — owners, explicit readers, revocation | Substantial machinery in service of a demo, before anyone has used the tool. The wish calls triage the point, and none of this makes triage faster |

### What "seeded" has to mean

Recording the reading, because the other one quietly reintroduces what we just
deferred. **A demo collection is seeded as a per-user copy** — a tester signs in
and receives their own collection populated from fixed content. It is an
ordinary private collection that happened to arrive pre-filled.

The alternative reading — one system-owned demo collection that many users
read — *is* sharing, and would need the model this decision defers. If that is
what was meant, this decision doesn't hold and the general scheme comes first.
Flagging it rather than assuming it.

Read as per-user copies, it is better for the actual purpose than sharing would
have been: **each tester's verdicts are their own.** A single shared demo would
have testers overwriting each other's keeper/junk calls, which is precisely the
thing being tested.

### Why this is cheap, and what makes it cheap

Per-user copies duplicate rows, which the size finding already established is
not a constraint — ten thousand rows of title, URL, date, tags and verdicts is
small, and a demo is far smaller than that.

The part that could have been expensive is captures, and last round's decision
already handles it: **the capture store is keyed by URL, so twenty testers with
the same seeded demo cost exactly one capture between them.** That decision was
made for re-import and is what makes seeded copies nearly free. Worth noting as
a case where two decisions happened to line up — and as a reason not to
partition the cache per collection later without checking this first.

### What this settles, and what it does not

- **Settled**: no sharing in the first version. A collection has one owner and
  is private, without exception. Demo collections are seeded copies.
- **Settled**: a general sharing scheme is planned, not merely possible. It goes
  into `objectives.md` under "Explicitly not the first version", alongside the
  two extensions the wish already holds back — that section is where this repo
  keeps things that are real but deliberately later.
- **Not settled**: what a general sharing scheme looks like. Deliberately. It
  should be designed against real use, not against a guess made before anyone
  has triaged anything.
- **Not settled, and worth watching**: what seeds a demo, and where that content
  lives. A spec question rather than a decision.

### The one thing to keep true for later

Since sharing is planned rather than hypothetical, the first version should
avoid the choice that makes it hard: **do not let "owner" become the only way an
item is reachable.** Whatever the store looks like, a collection's identity
should be separable from the single user attached to it, so a reader list can be
added later without rewriting every query. That costs nothing now and is the
difference between adding sharing and retrofitting it.

That is a constraint on the spec, not a design — recorded here so the spec has
to answer it.

## 2026-08-17 — When does judging a group ask for confirmation?

**On the unbounded action, not the large one.** A verdict swept across the
selection on screen asks nothing, whatever its size; a verdict applied to a set
the user is not looking at confirms and shows the count.

Raised by the critique of `plan.md` and `test-plan.md`, and accepted by the user
on review of that pull request: *"accepted. please update any docs needed for
this, including spec.md if needed"*. `spec.md` §8.3 is rewritten accordingly.

### The problem

`spec.md` §8.3 confirmed above a count — "say 25 items" — while §7.1 describes
mark-then-sweep over a selection of fifty as **the common case**. Held together,
the flow designed to be a single gesture asked a question nearly every time it
was used.

That is worse than it sounds. A confirmation that always fires is one people
learn to dismiss without reading, so it stops being a safeguard while continuing
to cost the speed O3 is about. The two mechanisms were also redundant by design:
`undo` already reverses a sweep as one action, which is the recovery a
confirmation exists to provide.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Confirm on visibility** *(chosen)* | Asks in the one case where the user genuinely does not know the size, and never in the case §7.1 exists to make fast. Costs nothing to implement — the selection view already displays its count | "Visible" has to be defined once and honoured; a future surface that applies a verdict from somewhere new has to decide which side it is on |
| **Confirm above a count** *(the original)* | Simple, and one number to tune | Fires on the common path by construction. Tuning it is choosing between a safeguard nobody reads and no safeguard |
| **No confirmation at all** | Simplest, and `undo` is genuinely the recovery | Leaves the unbounded case unguarded, where undo does not help somebody who did not know what they were about to do |

### What this settles, and what it does not

- **The discriminator is visibility, not cardinality.** A sweep across several
  thousand visible items asks nothing; a verdict on a saved selection invoked
  from a menu asks, and shows the count.
- **Left open:** nothing in the mechanism, but the rule has to be applied at each
  new entry point rather than being a property of the verdict function. That is
  noted in §8.3 as its cost.
- **What would reopen it:** sweeps being regretted often enough that `undo` is
  not sufficient recovery on the visible path. `test-plan.md` §4.4 now measures
  both that and how often the confirmation fires at all, so the question is
  answered from a real sitting rather than re-argued.
