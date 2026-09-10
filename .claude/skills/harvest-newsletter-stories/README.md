# Using harvest-newsletter-stories

Use this skill in an assistant with this Siteprep checkout and a connected
Gmail account. It reads a bounded selection of newsletter issues, extracts
stories and merges them into your existing private collection. Repeating a
date range preserves existing stories and judgments while recovering new or
previously missed stories.

## Ask for a harvest

For the usual collection:

> Use $harvest-newsletter-stories for all configured sources for the last 30 days.

To make the results visible on the existing private test site as well:

> Use $harvest-newsletter-stories for all configured sources for the last 30 days,
> then refresh the existing private test site.

For particular newsletters and dates, name sources listed in the review page's
Help dialog or in your inventory. For example, using a **synthetic** source name:

> Use $harvest-newsletter-stories for Better News Fixture from January 10 through
> January 31, 2026, using store /private/example/store.json and inventory
> /private/example/inventory.json. Generate an offline review at
> /private/example/review.html.

That last example explains the inputs; the committed fixtures are test data,
not newsletters to search in your real Gmail. Replace the source and paths.

You can also ask the assistant to explain the skill or list the configured
sources without harvesting. Merely naming the skill in a request to implement,
document or test it does not request a mailbox read.

## What “store” and “inventory” mean

The **store** is the durable collection: one JSON file containing harvested
stories, their stable IDs, source references, tags, clusters, locally imported
judgments and a history of harvest runs. Its `store_id` identifies the collection.
A repeat harvest updates that same collection and keeps a previous-generation
backup. It does not create a replacement collection or reset its IDs.

The **inventory** is the configuration: a separate JSON file listing which
newsletters can be harvested, how to find them in Gmail, how to divide an issue
into stories, and any default date limits. It contains no harvested stories.
“All configured sources” means every source in the selected inventory, not
every newsletter in the mailbox. The inventory is read, not rewritten, by a run.

The hosted review's **judgment database** is separate from both files. Saved
hosted judgments survive a refresh with the same store and story IDs. To bring
those judgments into the local store for offline review or publication, export
them from the review page and have the assistant import them first. An open
offline review file also needs its verdict export imported before replacement.

## Run options, version 1

These are inputs to the assistant, expressible in ordinary language. They are
not shell flags, and there is no standalone `harvest-newsletter-stories` command
that connects to Gmail without an assistant.

Paths below are relative to the Siteprep root. `work/` means
`initiatives/newsletter-story-harvester/work/`. The assistant reports absolute
paths before running so the checkout and destination are clear.

| Input | Supported choices now | Default and meaning |
| --- | --- | --- |
| `store` | `configured`, or the path of an existing local JSON store | Reuse the store established in this session; otherwise `work/private/store.json`. The file must exist, be protected and have a nonempty `store_id`. No database, cloud URL, fixture fallback or create-new mode. |
| `inventory` | `configured`, or the path of an existing local JSON inventory | Reuse the inventory established in this session; otherwise `work/private/inventory.json`. Must pass the private inventory validator. The choice is a file, not a hard-coded list of publisher names. |
| `sources` | `all`, or a nonempty list of inventory keys, slugs or unique display names | `all` entries in the chosen inventory. An unknown or ambiguous name needs clarification before any body is read. No automatic discovery or enrollment of newsletters. |
| `window` | Explicit start/end dates; `last N days` for a positive whole number; or `configured` | Required: no implicit unbounded scan. Explicit dates and `last N days` override `lookback_days` for this run. `configured` uses each entry's lookback or `since` floor. See date rules below. |
| `time_zone` | An IANA time zone, such as `America/Los_Angeles` or `UTC` | Use the user's established time zone; ask if unavailable. Controls relative dates and issue dates. |
| `review` | `none`, `offline`, or `offline` with an output HTML path | `none`. `offline` writes `work/private/review.html` unless an output path is supplied. It embeds source Help from the matching inventory. |
| `tagging` | `none` or `themes-and-clusters` | `none`. The latter explicitly hands off to `tag-newsletter-stories` after the harvest succeeds. |
| `deployment` | `none` or `test` | `none`. `test` explicitly hands off to `deploy-test` for the recorded existing test Site, preserving access. It must build from this run's store and inventory; a different file cannot silently be replaced with the configured collection. |

All run inputs can be combined, subject to their requirements. For example,
`review=offline` and `deployment=test` can both be requested. For a custom store,
specify the offline output path to avoid replacing the usual collection's review.
If the selected store/inventory do not match the test build's recorded private
inputs, the assistant reports the handoff mismatch rather than overwriting
another collection or deploying the wrong one.

Unsupported values are refused before mailbox access, with the supported
choices shown. The skill currently reads **Gmail only**, writes **local store
format version 1 only**, and delegates optional tagging and test deployment to
their own skills. Synthetic message sources and recorded model replies are
available for development tests, not as alternate live mailbox providers.

### Date rules

- `after` is inclusive and `before` is exclusive. “January 10 through January
  31, 2026” becomes `after=2026-01-10`, `before=2026-02-01`.
- “Last N days” includes today and the preceding N−1 calendar days, through
  the time the run reads Gmail. Its exclusive bound is tomorrow in the chosen
  time zone. This is a calendar window, not exactly N×24 elapsed hours.
- `configured` ends at that same exclusive tomorrow unless the user supplies
  another end. With `lookback_days=N`, start N days before that end. With only
  `since`, start there. A source with neither needs an explicit start or
  lookback; the assistant does not guess one.
- An inventory `since` is an earliest eligible date and remains a floor for
  every mode. If it shortens the requested window, the report says so. A source
  whose floor is at or after the end has no eligible interval and is skipped.
- Resolve, validate and report the requested window and each source's effective
  window before reading bodies. Invalid dates or reversed user bounds fail;
  selecting only sources with empty eligible intervals is a no-op.

## Choices inside an inventory

Each `sources` entry has a unique `key`, a unique lowercase hyphenated `slug`,
a display `name`, a `match` expression and a `shape`. The key addresses its
configuration; the slug is written into story provenance. Keep both stable
when renaming a display name. The optional top-level `id` labels the inventory
in run history; it is not a schema version.

| Extraction `shape` | What becomes one story | Current expected count per issue |
| --- | --- | --- |
| `link-list` | A story link and the text about it; section headings are excluded | 10–60 |
| `annotated-digest` | One item with all its commentary, even across paragraphs | 3–15 |
| `long-form` | The whole column; its citation links are not separate stories | 1 |

Counts outside these bands are flagged for review, not silently truncated or
filled in. An issue yielding no stories is still recorded. Source text up to
3,000 characters is copied; longer content may be faithfully summarized and
marked as a summary. A source's optional `overrides` maps individual message
IDs to one of these same three shapes; it does not introduce new shapes.

Supported matcher types are `from` (sender), `subject` (subject text), and
`label` (Gmail label). A single matcher selects one condition. An array joins
alternatives with **OR**. An `{ "all": [...] }` group joins conditions with
**AND**. For example, this synthetic configuration selects only the named
sender's Extra editions, with a 30-day default lookback:

```json
{
  "id": "example-inventory",
  "sources": [{
    "key": "example-extra",
    "slug": "example-extra",
    "name": "Example Extra",
    "match": {
      "all": [
        { "type": "from", "value": "editor@example.test" },
        { "type": "subject", "value": "Extra" }
      ]
    },
    "shape": "annotated-digest",
    "lookback_days": 30,
    "since": "2026-01-01"
  }]
}
```

Sender attribution is also checked against actual metadata before reading a
body; a broad label search does not override a configured sender constraint.
The assistant checks subject/label groups and dates too, and refuses ambiguous
cross-source attribution. Creating or editing this configuration is a separate
explicit request; a harvest uses the selected saved entries.

Link handling uses the existing URL normalization rules. The optional `unwrap`
rule name can select `substack`, `mailchimp`, `query-param` or `base64-path`;
omitting it uses automatic recognition. The existing fixture value
`{"kind":"none"}` is a legacy fixture setting, not a supported live rule name.
Network redirect following has a lower-level hook but is not a v1 skill option.
Unknown rule names must be refused rather than treated as automatic recognition.

## What you get

On success:

- The same store path contains the merged collection, with a harvest run record,
  exact requested/effective dates and per-source issue accounting.
- `<store path>.prev` contains the preceding generation. It is a one-generation
  recovery copy, replaced on the next successful store write.
- A summary gives the sources and dates, issues read, accepted/refused story
  findings, added/matched/merged/conflicted counts, flags, judgments preserved,
  final story total and store/backup paths. Accepted findings are not necessarily
  new stories: overlaps can match existing records.
- If requested, the assistant also returns the offline review path, tagging
  result, or verified test URL. It reports each follow-up separately.

The inventory is unchanged. Store, backup and offline review files remain
private and excluded from Git; files use mode `0600` and their working directory
uses `0700`. Raw message bodies remain in memory. Public reports contain counts,
not private story text, sender addresses or message IDs.

A search, read, extraction or validation failure before save leaves the original
store and review file unchanged. A failure in a later review, tagging or test
deployment step does not roll back the successful harvest: the report states
which outputs completed and what remains. Gmail is never modified by harvesting.

## Adding choices in future revisions

This **v1 invocation contract** is independent of `store.version` and
`inventory.id`. Keep option names and existing meanings stable. An additive
choice or optional input can extend v1 when existing requests keep their
behavior; record its default, validation, effects, output and failure behavior
in the tables above. A changed default, meaning, required input or storage
format needs an explicitly documented v2 contract and compatibility/migration
instructions, not a silent reinterpretation of old prompts.

Use these extension points:

| New choice | Where to implement and verify it |
| --- | --- |
| Another newsletter using current choices | Add a private inventory entry on request, validate it with `src/private-inventory.mjs`, and test its attribution and bounded date search. No new skill, shape or source provider is required. |
| Another extraction shape | Add the named contract in `src/contracts.mjs` and private-inventory validation; define the story unit, anchor, link/text rules, count band and model findings. Add synthetic issue/reply fixtures, extraction tests and an overlapping-run identity check. |
| Another matcher | Update `src/source-contract.mjs`, Gmail query construction and the fixture source; define both search and metadata verification semantics, including OR/AND groups and mismatches rejected before body reads. |
| Another mailbox provider | Implement `search(entry, range)` and `read(message)` from `src/run.mjs`, preserve the envelope/HTML seam, and document connector requirements, pagination, time zones and read-only behavior. Add it to the supported provider choices only after a tested adapter exists. |
| Another store or inventory backend | Add an explicit selector/resolver and validator; define identity, permissions, concurrency, backup and atomic-failure behavior. Do not interpret a new URI as a local file or silently create an empty store. |
| Another date, redirect or follow-up option | Wire it through the actual run/bridge path and reporting. For redirect rules use `src/url-key.mjs`; a lower-level hook alone is not a supported skill option. Define whether it changes saved data, adds network access or delegates an action. |

All module paths in this table are under `work/`. For each extension, update
this guide and [SKILL.md](SKILL.md), relevant techdoc and any affected Help
copy in the same change. Test successful use, unknown-value rejection and the
relevant failure boundary, plus a repeat harvest preserving store/story IDs
and judgments. Add synthetic fixtures only; never commit real mail.

Validate discovery with the skill validator, its agent manifest and Codex
symlink, then regenerate the root skill index with
`node scripts/skills_index.mjs` if the name or description changes. More choices
must not implicitly enable mailbox writes, new-store creation, publication,
production deployment or changes to access settings.
