---
name: tag-newsletter-stories
description: Add theme tags, event clusters, and cluster paraphrases to a Newsletter Story Harvester JSON store. Use when asked to theme, group, cluster, organize, or retag harvested newsletter stories, or to undo one of those tagging passes without changing story content or verdicts.
---

# Tag Newsletter Stories

Work only on the supplied Newsletter Story Harvester store. This skill may add
ordinary `theme:` and `about:` tags, a `clusters` entry, and an audit run. It
must never change a story's verdict, text, title, identity, provenance, link, or
dates.

## Tag a store

Run from the repository root. Keep the brief and proposal outside the initiative
when the store is private.

1. Prepare the model-readable brief:

   ```bash
   node initiatives/newsletter-story-harvester/skills/tag-newsletter-stories/scripts/tagging-pass.mjs prepare /path/to/store.json > /private/path/tagging-brief.json
   ```

2. Read every story in the brief and write a proposal JSON object:

   ```json
   {
     "store_id": "the brief's store_id",
     "pass_id": "tag-2026-08-19-energy-and-permitting",
     "created_at": "2026-08-19T18:00:00.000Z",
     "themes": [
       {"tag": "theme:clean-energy", "story_ids": ["u1-a", "u1-b"]}
     ],
     "clusters": [
       {
         "tag": "about:permitting-reform",
         "paraphrase": "Several accounts examine the same permitting reform push.",
         "story_ids": ["u1-b", "u1-c"]
       }
     ]
   }
   ```

   Use short lowercase hyphenated slugs. Apply as many `theme:` tags as help a
   reader filter the pile. Create an `about:` cluster only when at least two
   stories describe the same named event or development, not merely the same
   broad subject. Cluster member dates must be within fourteen days. Keep every
   member's own link, source, and date; the paraphrase summarizes the event,
   not the sources.

3. Apply the checked proposal atomically:

   ```bash
   node initiatives/newsletter-story-harvester/skills/tag-newsletter-stories/scripts/tagging-pass.mjs apply /path/to/store.json /private/path/proposal.json
   ```

The command validates the store address, story ids, tag prefixes, date window,
and non-overlapping clusters before it writes. Existing tags are preserved.
Existing identical clusters are left unchanged; conflicting reuse of an
`about:` slug is refused.

## Undo a tagging pass

Undo only by the recorded pass id:

```bash
node initiatives/newsletter-story-harvester/skills/tag-newsletter-stories/scripts/tagging-pass.mjs undo /path/to/store.json tag-2026-08-19-energy-and-permitting
```

The command removes exactly the tags and clusters that pass added. It refuses
the undo if tags or clusters changed afterwards, because removing an older pass
would no longer restore the previous state exactly. Verdict-only work does not
block an undo.

## Report

Report the pass id, story count tagged, tags added, clusters added, and store
path. Do not print private story text in the final report.
