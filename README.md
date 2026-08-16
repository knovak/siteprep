# Site generator experiment

This repository holds experimental deck content and a simple static build pipeline for publishing to GitHub Pages.

## Decks

- **india1** – Dubai transit tips plus overviews for Bengaluru, Udaipur, Jodhpur, Jaipur, Delhi, Kochi, and the Art of Living Ashram.
- **india2** – Kerala-focused deck with Kumarakom excursions and nearby day trips.

- **aus2503** – Guerilla Bay hiking, WOMADelaide 2026, and Brisbane cultural highlights.
- **poland** – Current Warsaw planning notes with weather expectations, contact details, and milk bar recommendations.
- **mexico** – Mexico City and San Miguel de Allende overviews with population, history, and early-July climate notes.
- **australia-october-2026** – Minjerribah (North Stradbroke Island) planning for October 26–31, 2026.
- **british-columbia** – Option deck for Vancouver, October 1–15, 2026, with VIFF film and music planning.
- **rockies** – Option deck for Jackson Hole stays in October and December 2026.


## Initiatives

`initiatives/` is a third top-level content area alongside `decks/` and `demos/`. An
**initiative** is a durable unit of intent - the wish behind a piece of work, the
documents that elaborate it (objectives, spec, plan, test plan), the capability it
develops, and pointers to whatever it produced. Unlike a project it does not end; it
goes dormant and can be revisited to produce a later version using the tooling it built
the first time.

An initiative can produce a deck, a demo, code that runs somewhere else entirely, or
nothing published at all - an initiative whose only output is a reusable script or
skill is still an initiative.

Each initiative moves through a lifecycle - `wish` → `shaped` → `specified` → `planned`
→ `building` → `refining` → `dormant` - and carries a todo list of what is actionable
and what is blocked.

A scheduled **sweep** reads the initiatives, reports what needs a decision, answers
review comments on its own pull requests, proposes answers to open questions, and works
the todo lists - opening a pull request for everything and merging nothing. What it is
allowed to do is set by `phases` in `initiatives/sweep.json`.

See `INITIATIVES_VISION.md` for the full design, `INITIATIVES_TECHDOC.md` for what the
build actually does, `initiatives/sweep-setup.md` for how the sweep is scheduled and
switched on, and the Initiatives section of `AGENTS.md` for the working conventions.

### Deck asset convention

Each deck owns an independent `assets/styles.css` and `assets/scripts.js`, seeded from a starting template, that a deck is free to customize or diverge from for its own formatting, rendering, and navigation experiments - decks are not required to stay in sync with each other. Common widgets that are easy to get wrong when reimplemented by hand - standard maps, photo galleries, distance visualizations - live in `shared/` as opt-in libraries instead; see `shared/README.md`.

### Deck Configuration

Each deck can optionally include a `deck.json` file to customize its appearance on the homepage. The `group` field accepts `Current`, `Future`, `Option`, or `Past`; homepage groups appear in that order.

#### deck.json Format

Create a `deck.json` file in your deck's root directory (e.g., `/decks/india1/deck.json`):

```json
{
  "title": "India Travel Guide 2024",
  "sort_order": "01",
  "description": "Dubai transit tips plus overviews for Indian cities."
}
```

**Fields:**
- `title` (optional): Display name for the deck on the homepage. Defaults to the folder name if not specified.
- `sort_order` (optional): String used to sort decks on the homepage (lexicographic sort). Defaults to the folder name if not specified.
- `description` (optional): Description shown on the homepage card. Defaults to the folder name if not specified.

**Sorting behavior:**
- Decks are sorted lexicographically by `sort_order`
- Use numeric prefixes for simple ordering: `"01"`, `"02"`, `"03"`
- Or use descriptive strings: `"main"`, `"secondary"`, `"archive"`
- Without `deck.json`, decks default to alphabetical order by folder name

## Build and preview

```bash
scripts/build.sh
```

The script assembles the static site into the `/gh-pages` directory for local preview or GitHub Pages deployment.

## GitHub Pages URL

After pushing to `main`, GitHub Actions builds and publishes the site. View it at:

```
https://<your-github-username>.github.io/siteprep/
```

Open the India1 deck directly at:

```
https://<your-github-username>.github.io/siteprep/decks/india1/
```
