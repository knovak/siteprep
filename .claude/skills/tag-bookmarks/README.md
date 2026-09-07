# tag-bookmarks

Tag a pile of bookmarks by hand-free judgement instead of by hand. You export a
selection from Bookmark Sorter, ask for the tagging pass, and import the file it
gives back. The tags land on the bookmarks you already have; nothing is
overwritten and nothing is deleted.

## The round trip

1. **Export from Bookmark Sorter.** Open the collection, then open **Export**
   and choose **Current collection**, or open a selection first and choose
   **Current selection** to tag only that group. The download is named
   `bookmark-sorter-<collection-name>.json`. Save it somewhere outside this
   repository.
2. **Ask for the pass.** In a session with this repository, say something like:

   > Tag the bookmarks in ~/Downloads/pile-export.json

   Claude reads every item, assigns tags, and writes a second file, by default
   `pile-export-tagged.json` beside the first.
3. **Import the tagged file.** Back in Bookmark Sorter, open the same
   collection, open **Import**, select the tagged file, and choose **Import
   files**. The result reads `Imported 0 new; merged N`, which is what a tagging
   file should say: no new bookmarks, N of them enriched.
4. **Use the tags.** In **Select and tag**, type an expression such as
   `climate and usa`, or `ai and post-2020 and not corporation`, and choose
   **Open selection**.

A later version will replace steps 1 and 3 with a direct connection. Until then
the files are the interface, which has one advantage worth keeping in mind: you
can open the tagged file and read exactly what is about to be added.

## What gets written

The output is an ordinary `bookmark-sorter/v1` file that carries each bookmark's
URL, its title, and only the **new** tags:

```json
{
  "format": "bookmark-sorter/v1",
  "collection": "sample-collection",
  "items": [
    {
      "url": "https://www.example-times.com/2024/03/11/california-drought-rules",
      "title": "California tightens water rules after a third dry winter",
      "tags": ["2001-2019", "california", "climate", "environment", "major_publication", "politics", "usa"]
    }
  ]
}
```

Import matches on the URL, so the tags reach the bookmarks you exported. Import
adds tags and never removes them, so re-importing the same file twice changes
nothing the second time. Verdicts, notes, titles, and dates are untouched: the
file does not contain them.

Items that received no tags are left out of the file, and the run tells you how
many there were.

## The default tags

Four **dimensions**. An item takes tags from as many of them as apply, and more
than one tag from a dimension where more than one fits.

| Dimension | Tags |
|---|---|
| **topic** | politics, technology, media, business_economics, covid_19, science, international_affairs, law_crime, arts_culture, books_writing, health, social_justice, ai, environment, energy, climate, travel, history |
| **location** | australia, california, africa, developing_countries, cameroon, latin_america, europe, usa, canada, india, china, asia |
| **period** | pre-2000, 2001-2019, post-2020 |
| **sourcetype** | major_publication, blogger, corporation, ngo, government |

Overlap is deliberate. An article about a California water rule is tagged
`california` **and** `usa`; a piece on model training is `ai` **and**
`technology`. Selections then work at either grain: `california` finds the
narrow set, `usa` finds it along with everything else American.

Some of that overlap is filled in for you. The vocabulary records that
`california` implies `usa`, `cameroon` implies `africa`, `india` and `china`
imply `asia`, `ai` implies `technology`, `covid_19` implies `health`, and
`climate` implies `environment`. Ask for `--no-implied` if you want only the
tags that were judged directly.

Two things the pass will not do:

- **Guess.** An item whose title says nothing about where it happened gets no
  location tag. A missing tag is easy to find later; a wrong one is not.
- **Open the page.** Tags come from the title, the URL and host, the note, and
  the tags the bookmark already carries. Bookmark Sorter's own captured
  metadata is not in the export, so it is not available here.

### Where the periods divide

`pre-2000` covers everything up to and including the year 2000, `2001-2019` the
years between, and `post-2020` the year 2020 onwards. The period is the era the
item is *about* when it is historical, and otherwise when it was published,
taken from a date in the title, the URL, or the bookmark's added date.

## Asking for less, or for something else

**Fewer dimensions.** Say which ones you want:

> Tag these by topic and location only

**Your own tags.** Give a file. The quickest form is a text list — the same
shape as the table above:

```
# my-tags.txt
dimension: mood
cheerful
bleak

dimension: length
short
long
```

Then:

> Tag ~/Downloads/pile-export.json using ~/Documents/my-tags.txt

A tag belongs to exactly one dimension; the same tag in two dimensions is
rejected, because there would be no way to say which one an item was tagged
from.

**A richer vocabulary.** For guidance notes and implied tags, copy
`vocabularies/default.json` and edit it. Each dimension takes a `description`,
a list of `notes`, its `tags`, per-tag `tag_notes`, and an `implies` map. Adding
a dimension is adding one object to `dimensions`; nothing else changes.

## Reviewing a pass

Ask for a report and you get a markdown file next to the output listing how many
items were tagged, how often each tag was used within its dimension, and which
items came back untagged:

> Tag ~/Downloads/pile-export.json and write me a report

Read it before importing. If a tag was applied too widely, say so and ask for
that dimension to be run again — nothing has reached the collection until you
import.

If you do import something you would rather not have, Bookmark Sorter's
**Untag items** removes named tags from a selection in one undoable step. Open
the tag you regret as a selection, switch the Tag control to **Untag items**,
and enter it.

## Running the commands yourself

The skill drives one script, and you can run it directly.

```bash
# What tags are in play
node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs vocabulary

# The worksheet the model reads
node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs prepare export.json -o worksheet.json

# The file Bookmark Sorter imports
node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs apply export.json assignments.json \
  -o export-tagged.json --report report.md
```

`prepare` writes a worksheet of items with a `ref` for each one. The tagging
step answers with an assignments file of `{"ref": "b0001", "tags": [...]}`
entries. `apply` checks every tag against the vocabulary and every ref against
the export, then writes the importable file. A large pile can be prepared in
slices with `--offset` and `--limit`, and `apply` merges the batches:

```bash
node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs apply export.json batch-1.json batch-2.json
```

Full options: `tag-bookmarks.mjs --help`.

## A note on privacy

Your bookmarks are private. Keep the export, the worksheet, the assignments, and
the tagged file outside this repository, and delete them when the pass is done.
The report names bookmarks too. Nothing from a pass is committed, and the
summary printed at the end of a run counts items rather than listing them.
