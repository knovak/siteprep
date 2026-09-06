# Newsletter Story Harvester

Newsletter Story Harvester turns selected email newsletters into a private,
reviewable story collection. A harvest reads only the configured Gmail sources
and date range, extracts stories without retaining message bodies, merges repeat
stories into the existing collection, and preserves earlier judgments.

The current review Site is owner-only:

- **Test:** [newsletter-story-harvester-test.ken-novak.chatgpt.site](https://newsletter-story-harvester-test.ken-novak.chatgpt.site),
  version 6.
- **Production:** not released.

The Site contains the private story collection, so do not make it public. Its D1
database stores judgments for the collection; the local owner-only store remains
the source used for harvesting, tagging, offline review, and publication.

## Review stories

1. Open the test Site and wait for **All judgments saved** before changing a
   story. If loading fails, use **Reload judgments** before trying again.
2. Use **Sort**, **Filter by tag**, and **Page Layout** to arrange the current
   view. Layout names are rows by columns; a phone shows one card at a time.
   **Day** and **Night**, and the selected layout, are remembered in this
   browser when browser storage is available.
3. Read the story text inside each card. The title opens the original article.
   Choose **Drop**, **Keep**, or **Emphasize** below the text. The outlined
   button with a check mark is the saved judgment.
4. Use **Previous** and **Next** to move through the collection. **Judge visible
   unjudged** applies the selected judgment only to unjudged stories matching
   the current tag filter on the current page. A cluster judgment applies to
   all of that cluster's members.
5. **Undo** reverses the latest judgment action and saves the reversal. Wait for
   **All judgments saved** before closing the page.

**Export verdicts** is an optional backup for hosted review. It is also the
handoff for copying hosted judgments into the local store before local tagging,
offline review, or publication. Protect the downloaded JSON as private data.

## Load new stories

The Site does not read Gmail itself. Ask an assistant that has access to this
repository and the connected Gmail account to run the private harvest workflow.
Open **Help** on the Site to see the current source names and Gmail searches,
then send this request with real dates:

> Load new Newsletter Story Harvester stories from the sources listed in Help
> for [start date] through [end date]. Follow the private harvest workflow in
> initiatives/newsletter-story-harvester/work/README.md. Merge into the existing
> private store, preserving its store ID, story IDs, and judgments. Refresh the
> existing private test site.

The request must name a bounded date range. Re-harvesting adds or merges stories
rather than replacing the collection. The workflow checks the actual sender,
uses read-only Gmail operations, keeps raw message bodies in memory only, and
writes mailbox-specific files under the ignored owner-only `work/private/`
directory.

After harvesting, the optional `tag-newsletter-stories` skill can add subject
themes and group stories about the same event. A tagging pass changes no story
text, identity, provenance, link, date, or judgment, and can be undone by its
recorded pass id.

## Saving and recovery

Hosted Drop, Keep, Emphasize, cluster, sweep, and Undo actions save to D1 with a
revision check. A second tab cannot silently overwrite newer judgments. If a
save is uncertain, the page stops accepting changes and asks you to reload the
database state.

The bundled story collection is rebuilt from the protected local store during a
test deployment. Story and store ids remain stable across a re-harvest, so the
Site restores the matching D1 judgments after the refresh. Export the hosted
judgments and import them into the local store when those judgments need to be
used outside the Site.

The local inventory, story store, generated review page, backups, and any Gmail
handoff files are intentionally excluded from Git and must remain readable only
by their owner. The deployed archive includes the generated review application,
Worker, D1 migration, and hosting manifest; it does not include the local store
file, inventory file, backups, or raw newsletter bodies.

## Run and verify locally

Install the repository dependencies and run the repository build from the root:

```sh
npm ci
npm run build
```

Run the harvester tests from its work directory:

```sh
cd initiatives/newsletter-story-harvester/work
npm ci
npm test
```

The production-shaped Sites build additionally requires existing
`private/inventory.json` and `private/store.json` files, both regular owner-only
files with mode `0600`:

```sh
npm run build
```

That build never substitutes fixture content when the private inputs are
missing. Browser and publication checks are part of the test suite. The full
private protocol, fixture commands, store import, tagging, database API, and
failure behavior are documented in [`work/README.md`](work/README.md).

## Deploy

The initiative's [`initiative.json`](initiative.json) points the test deployment
at `initiatives/newsletter-story-harvester/work`. The project is a ChatGPT Sites
app with its own [hosting manifest](work/.openai/hosting.json), Worker, D1
migration, and private-input build.

Use the repository's `deploy-test` skill to replace the existing test Site. It
runs the project checks, uses the Sites hosting workflow, preserves owner-only
access, and records the successful version and source commit back in
`initiative.json`. Verify that the Site loads the expected story count, restores
saved judgments, saves one temporary judgment and its Undo, and reports no
unexpected Worker errors.

Use `release-initiative` only when a person explicitly asks to create or update
a production deployment. A merge, harvest, or test refresh is not a production
release.

For the product contract and privacy boundaries, see [`spec.md`](spec.md). For
the build order and evidence, see [`plan.md`](plan.md), [`test-plan.md`](test-plan.md),
and [`decisions.md`](decisions.md).
