---
name: tag-bookmarks
description: Read a Bookmark Sorter export and write an importable file that adds vocabulary tags to those bookmarks, judging each item from its title, URL, note, and existing tags. Use when asked to tag, theme, categorize, classify, or organize a bookmark export by topic, location, period, or source type, or when given a bookmark-sorter/v1 JSON file to tag.
---

# Tag Bookmarks

Take a `bookmark-sorter/v1` export, decide which vocabulary tags each bookmark
should carry, and write a second `bookmark-sorter/v1` file holding only URLs and
their new tags. The user exports the input from Bookmark Sorter and imports the
output back into the same collection, where import adds tags and removes
nothing.

`README.md` beside this file is the user-facing guide. Read it when the user asks
how the round trip works.

Never change a verdict, note, title, or added date: the output file carries
`url`, `title`, and `tags` only. Bookmark URLs, titles, and notes are private
user data. Keep the export, the worksheet, the assignments, and the output
together outside the repository, and do not paste bookmark text into a commit
message, a pull request, or a final report.

## Run a tagging pass

The script does the reading and the writing; the judgement in step 2 is yours.

1. Prepare a worksheet from the export:

   ```bash
   node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs prepare /path/to/export.json -o /path/to/worksheet.json
   ```

   Add `--dimensions topic,location` to use fewer dimensions, and
   `--vocabulary /path/to/tags.json` (or a `.txt` list) for the user's own tags.
   For a large pile, take it in batches of 100 to 200 items with `--offset` and
   `--limit`; refs stay stable across batches.

2. Read every item in the worksheet and write an assignments file:

   ```json
   {
     "format": "bookmark-tags/assignments/v1",
     "source_fingerprint": "the worksheet's source.fingerprint",
     "items": [
       {"ref": "b0001", "tags": ["climate", "politics", "california", "2001-2019", "major_publication"]},
       {"ref": "b0002", "tags": ["ai", "technology", "blogger", "post-2020"]}
     ]
   }
   ```

   Use only tags the worksheet lists, and follow each dimension's own `notes`
   and `tag_notes`. One item takes tags from as many dimensions as apply, and
   more than one tag from a dimension where more than one fits. Omit an item, or
   omit a dimension for an item, when the title, URL, note, and existing tags
   give no evidence — a wrong tag costs more than a missing one, because the
   user can find an untagged item but will not re-examine a mistagged one.

   Judge from what the file actually contains. Fetching a page is not part of
   this skill; say so rather than guessing at a page you have not seen.

3. Write the importable file:

   ```bash
   node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs apply /path/to/export.json /path/to/assignments.json -o /path/to/tagged.json --report /path/to/report.md
   ```

   `apply` takes several assignments files at once and merges them, which is how
   batches from step 1 come back together. It refuses a tag outside the
   vocabulary, a ref that is not in the export, and assignments whose
   `source_fingerprint` belongs to a different export.

The vocabulary's implied tags are added during `apply` — `california` also
writes `usa`, `ai` also writes `technology` — so the output holds the full set
even where the assignment named only the narrower tag. `--no-implied` turns that
off. Tags a bookmark already carries are dropped from the output, and items that
gained nothing are left out unless `--include-untagged` is given.

To see the tags in play before starting:

```bash
node .claude/skills/tag-bookmarks/scripts/tag-bookmarks.mjs vocabulary
```

## Report

Give the user the output file's path and tell them to import it into the same
collection they exported from. Report the item counts, the number of items
tagged, the tags written per dimension, and anything left untagged and why. Name
the vocabulary and dimensions used. Do not list bookmark titles or URLs in the
report; the `--report` file holds those for the user to read locally.

## Tests

```bash
node --test .claude/skills/tag-bookmarks/test/tag-bookmarks.test.mjs
```
