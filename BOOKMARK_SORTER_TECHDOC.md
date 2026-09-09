# Bookmark Sorter interaction and selection updates

The hosted application lives in `initiatives/bookmark-sorter/work`. The separately distributed SQLite/WASM fork lives in `initiatives/experiment-with-wasm/work`; its packaging and persistence are described in `EXPERIMENT_WITH_WASM_TECHDOC.md`. These applications vendor their own source and must be updated together for shared interaction changes.

## Update timestamps

`updated-tag.mjs` formats `updated_at:YYYY-MM-DDTHH:mm:ss` from the action time in UTC, matching `tag_run` (seconds, no fractional part or timezone suffix). `applyTags` and `applyVerdict` replace every existing tag starting with `updated_at` with the one generated tag. Reapplying an existing tag or verdict also records an update. Entered `updated_at` tags cannot override the generated timestamp. Ordinary tag removals, imports, and collection copies preserve their existing timestamp behavior; importing records does not falsely stamp them as manually reviewed.

The SQL store changes the tags and records the action in the same database batch. Its statements remain within D1's 100-parameter limit. The WASM runtime additionally persists the entire mutation atomically. Action payloads retain previous timestamp tags and the generated tag; Undo restores those previous tags together with the original verdict or tag additions. Actions saved by older versions lack this metadata and retain their original undo behavior. No schema migration is required. The hosted memory store mirrors the SQL behavior for tests.

## String comparisons

The selection parser accepts `prefix:>value` and `prefix:<value`, for example `tag_run:>2026-09` or `updated_at:<2027`. They compare the full original suffix after the prefix colon lexicographically and case-sensitively with JavaScript's strict greater/less operators. They do not parse dates or compare numbers. Thus `2026-09-01` is greater than the string `2026-09`, while exactly `2026-09` is neither greater nor less. Missing and empty values do not match a comparison. Any prefix can be used, including future tag namespaces. Existing trailing wildcard syntax remains available: `updated_at*` matches timestamp tags.

Comparisons combine with `and`, `or`, `not`, and parentheses. Empty operands and combined comparison/wildcard syntax produce a syntax error. Original values are retained separately from normalized search aliases, so punctuation normalization cannot change comparison boundaries. The SQL compiler resolves matching distinct tag keys with the same evaluator and then filters/counts/pages in SQL, preserving membership parity with the in-memory evaluator.

## Bookmark controls

Each card has K, A and N square buttons below its + button. They map to `keeper`, `archive`, and `needs-more-time`, with visible labels Keep, Archive and Needs-time. A card button submits only that card's ID, regardless of the focused item or marked set. Saving disables duplicate submissions, preserves other marks, refreshes selection membership and proposal counts, and reports errors without applying a local verdict. Existing toolbar and keyboard shortcuts retain their marked-set behavior. Native Enter/Space activation is preserved for buttons and links.

The title's overlapping-squares button copies the complete stored title as plain text, independently of the existing Copy URL control. Both use the clipboard API and report success or failure. The title text can truncate while its copy control remains visible. Controls have descriptive accessible labels and quick verdicts expose their pressed state.

## Verification

Run each application's `npm test` and `npm run test:browser` with installed lockfile dependencies. The timestamp tests use real SQLite and WASM, check multiple old tags, repeated actions, exact undo, untouched bookmarks, comparison boundaries and counts, and 201-item bulk updates. Browser cases exercise single-card actions with another card marked, keyboard activation, title-copy payload, selection changes, tagging, Undo, reload, and desktop/phone geometry. The standalone distribution and preview package must be regenerated using their established snapshot procedure; production releases remain separate.
