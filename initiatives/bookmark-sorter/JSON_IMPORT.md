# Importing Bookmark Sorter JSON

Bookmark Sorter accepts a portable JSON format named `bookmark-sorter/v1`.
Use it to restore an export, copy bookmarks between collections, add tags to
bookmarks already in a collection, or add bookmarks that are not there yet.

Import always targets the collection currently open in Bookmark Sorter. The
`collection` value inside the file is descriptive only; it cannot redirect an
import to another collection.

## Quick recipe: add tags to existing bookmarks

For each bookmark, provide its URL and the tags to add:

```json
{
  "format": "bookmark-sorter/v1",
  "items": [
    {
      "url": "https://example.com/article",
      "tags": ["topic:climate", "read-later"]
    },
    {
      "url": "https://example.org/guide",
      "tags": ["topic:climate", "kind:reference"]
    }
  ]
}
```

Save the document with a `.json` extension, open the destination collection,
choose **Import bookmarks**, and import the file.

If a URL matches an existing bookmark, its tags are added to the bookmark's
existing tags. Existing tags and other user data are not removed. If a URL is
not already present, the import creates a bookmark; when no title is supplied,
the URL becomes its title.

For the most reliable match, start with a Bookmark Sorter export and edit only
its `tags` arrays. This preserves the exact URLs used by the collection.

## Complete example

This is the complete shape written by Bookmark Sorter's exporter:

```json
{
  "format": "bookmark-sorter/v1",
  "exported_at": "2026-08-25T19:30:00.000Z",
  "collection": "collection-123",
  "selection": "topic:climate and verdict:keep",
  "items": [
    {
      "url": "https://example.com/article?chapter=2",
      "title": "An example article",
      "note": "Return to the section on adaptation.",
      "added_at": "2024-02-10T18:15:00.000Z",
      "tags": ["kind:reference", "topic:climate"],
      "verdict": "keeper",
      "verdict_at": "2026-08-24T21:05:00.000Z"
    }
  ]
}
```

Only `format`, `items`, and each item's `url` are required for import.

## Document fields

| Field | Required | Meaning on import |
|---|---:|---|
| `format` | Yes | Must be exactly `bookmark-sorter/v1`. |
| `exported_at` | No | ISO 8601 timestamp written by the exporter. It does not control bookmark recency, but it supplies the verdict date when a legacy item has a verdict without `verdict_at`. If both dates are absent, the import time is used. |
| `collection` | No | Identifier of the source collection. It is not used to choose the destination. |
| `selection` | No | Expression that selected a partial export. It is descriptive and is not saved or applied during import. An empty string means the whole source collection was exported. |
| `items` | Yes | Array of bookmark objects. An empty array is valid. |

A top-level `proposal` field is reserved for the separate proposed-tags review
workflow. A document containing that field is rejected by the ordinary JSON
import, even if it also contains an `items` array.

Other top-level fields are currently ignored. Do not depend on ignored fields
being stored or round-tripped.

## Bookmark fields

| Field | Required | Accepted value and behavior |
|---|---:|---|
| `url` | Yes | Non-empty, valid absolute URL. HTTP and HTTPS are the normal forms; other schemes such as `file:` remain accepted so legacy bookmarks previously exported by the app can round-trip. The URL determines whether the bookmark is new or matches an existing one. |
| `title` | No | Non-empty string. A missing, non-string, or blank title falls back to the URL for a new bookmark. It never replaces an existing bookmark's title. |
| `note` | No | A string or `null` is the portable form. Missing or `null` means no incoming note. The current importer converts any other non-null JSON value to a string, but files should not rely on that compatibility behavior. A non-empty existing note is preserved; an incoming note can fill a missing one but cannot replace or clear one. |
| `added_at` | No | ISO 8601 date or timestamp string, or `null`. When records merge, the earliest non-null value is kept. Use one consistent UTC form, such as `2024-02-10T18:15:00.000Z`, so dates compare predictably. |
| `tags` | No | Array of non-empty strings. Missing or `null` means no incoming tags. See [Tags](#tags). |
| `verdict` | No | `keeper`, `junk`, `archive`, `needs-more-time`, or `null`. An existing non-null verdict is never overwritten by import. |
| `verdict_at` | No | ISO 8601 date or timestamp string, or `null`. When `verdict` is non-null and this date is absent, the importer uses `exported_at`, then the current import time. Use an explicit date in newly generated files. |

The importer ignores other item fields. In particular, database identifiers,
normalised URL keys, capture records, and internal ingestion timestamps are not
portable fields.

### Tags

Tags are free-form strings rather than a fixed vocabulary. For example:

```json
"tags": [
  "topic:climate",
  "kind:reference",
  "response-required",
  "folder:Reading/Climate"
]
```

During import:

- leading and trailing whitespace is removed from each tag;
- empty or whitespace-only tags reject the document;
- duplicate tags in the file are collapsed;
- tags already on the bookmark are retained;
- imported tags are added as a set, so the same tag is never stored twice;
- tag spelling and case are significant; and
- array order has no meaning and is not preserved.

Prefixes such as `topic:`, `kind:`, `folder:`, `src:`, and `in:` are naming
conventions, not schema requirements. Unprefixed tags are valid too. When using
tags in a selection expression, write the tag itself, such as `topic:climate`;
there is no extra `tag:` prefix. Selection search keys do not alter the stored
tag: they lowercase its text, replace punctuation, symbols, and whitespace with
single dashes, and retain the first colon as the conventional prefix separator.
For example, the stored tag `Topic:Modern Art` is selected with
`topic:modern-art`. The exact stored spelling remains available through
`tag-key:<percent-encoded-tag>` when that distinction matters.
A trailing `*` matches the beginning of a normalized value, while paired
wildcards match the value anywhere: `topic:*modern-art*`. Empty contains values
are rejected, and existing exact and prefix expressions keep their meaning.

JSON imports do not automatically add `src:`, `in:`, or `folder:` tags. Those
are generated when browser bookmark HTML is imported. If those tags matter for
a JSON import, include them explicitly in each item's `tags` array. The
**Source tag** field in the Import panel applies only to HTML imports.

## How bookmarks are matched

Bookmark identity is the normalised URL within the destination collection.
For host-based URLs, Bookmark Sorter:

- lowercases the URL scheme and host;
- removes a default port;
- removes the fragment after `#`;
- removes `utm_*`, `fbclid`, and `gclid` query parameters;
- removes the trailing slash from an otherwise empty path; and
- unwraps an HTTP or HTTPS destination from a Google `/url` redirect.

Other valid absolute schemes are retained for compatibility with legacy
bookmarks. They still receive a normalised identity key, but web-specific host
and tracking rules have no effect when those URL components are absent.

Other query parameters remain significant. For example,
`https://example.com/page?chapter=2` and
`https://example.com/page?chapter=3` are different bookmarks. Using a
substantially rewritten or shortened URL can therefore create a fresh bookmark
instead of enriching the intended existing one.

Normalisation is used for matching. For an ordinary new URL, Bookmark Sorter
still retains the URL supplied in the file. When an imported URL matches an
existing bookmark, the already-stored URL is preserved.

## Merge rules

The importer first combines repeated URLs inside the JSON file, then merges the
result into the open collection.

| Data | Fresh URL | URL already in the collection |
|---|---|---|
| URL | Stores the imported URL. | Keeps the stored URL. |
| Title | Stores the imported title, or the URL as a fallback. | Keeps the stored title. |
| Note | Stores the incoming note or no note. | Keeps a non-empty stored note; otherwise fills it from the import. |
| Added date | Stores the incoming date or `null`. | Keeps the earliest non-null stored or incoming date. |
| Tags | Adds every incoming tag. | Unions incoming and stored tags; removes nothing. |
| Verdict | Stores the incoming verdict or leaves the bookmark untriaged. | Keeps a stored verdict; fills an untriaged bookmark from the import. |
| Verdict date | Travels with the imported verdict; falls back to the export or import time when absent. | Stays with the verdict that wins under the rule above. |
| Ingestion time | Records the time of this import. | Keeps the bookmark's original ingestion time. |
| Capture image and metadata | Not contained in the file. | Not overwritten. A cached capture for the matched URL remains available. |

Verdicts do not use "newest timestamp wins." Once the destination bookmark has
a verdict, import preserves it even when the file contains a different verdict
with a later `verdict_at` value. Likewise, import cannot clear a note, verdict,
tag, or added date by supplying `null`, an empty array, or an omitted field.

If the same normalised URL occurs more than once inside one file:

- all of its tags are combined;
- the earliest added date is kept;
- the first non-empty note and first non-null verdict are used; and
- the first record supplies the stored URL and title for a fresh bookmark.

Keeping one item per URL in a hand-written file makes the result easier to
review, but redundant entries are safe.

## Fresh bookmarks and captures

A URL that does not match the destination collection creates one new bookmark.
Partial records are valid: a bookmark containing only `url` is created with the
URL as its title, no note, no tags, no added date, and an untriaged verdict.

The JSON file neither contains nor imports page captures. If the global capture
cache already has metadata or an image for the URL, the new bookmark can reuse
it. Otherwise, JSON import leaves capture work for the app's separate
**Capture metadata** action. This differs from browser HTML import, which can
start its initial capture pass automatically.

## Import result counts

After an import, the interface reports how many rows were added and merged.

- **Imported _N_ new** is the number of distinct normalised URLs newly added to
  the collection.
- **Merged _N_** is the number of input item rows that were not counted as new.
  It includes matches that added tags or filled data, exact no-op reimports, and
  redundant occurrences of the same URL within the file.

Consequently, `Imported 0 new; merged 100` can mean a safe no-op reimport of 100
bookmarks. The merged count does not mean that 100 stored bookmarks changed.

## Validation and limits

The Import panel accepts `.json` files up to 20 MB. The entire document and all
recognized item fields are parsed and validated before the merge begins. Common
errors include:

- missing or misspelled `format`;
- missing `items` array;
- an item without a URL;
- an invalid or relative URL;
- `tags` supplied as a string instead of an array;
- an empty tag;
- an unsupported verdict; and
- an invalid date in `exported_at`, `added_at`, or `verdict_at`.

An ordinary export can be imported into the same collection as a no-op backup
test, into another collection as a copy, or after editing its tag arrays as an
enrichment file. Exporting never removes anything from the source collection.
