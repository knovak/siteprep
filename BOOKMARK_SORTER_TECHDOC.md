# Bookmark Sorter interaction and selection updates

The hosted application lives in `initiatives/bookmark-sorter/work`. The separately distributed SQLite/WASM fork lives in `initiatives/experiment-with-wasm/work`; its packaging and persistence are described in `EXPERIMENT_WITH_WASM_TECHDOC.md`. These applications vendor their own source and must be updated together for shared interaction changes.

## Update timestamps

`updated-tag.mjs` formats `updated_at:YYYY-MM-DDTHH:mm:ss` from the action time in UTC, matching `tag_run` (seconds, no fractional part or timezone suffix). `applyTags` and `applyVerdict` replace every existing tag starting with `updated_at` with the one generated tag. Reapplying an existing tag or verdict also records an update. Entered `updated_at` tags cannot override the generated timestamp. Ordinary tag removals, imports, and collection copies preserve their existing timestamp behavior; importing records does not falsely stamp them as manually reviewed.

The SQL store changes the tags and records the action in the same database batch. Its statements remain within D1's 100-parameter limit. The WASM runtime additionally persists the entire mutation atomically. Action payloads retain previous timestamp tags and the generated tag; Undo restores those previous tags together with the original verdict or tag additions. Actions saved by older versions lack this metadata and retain their original undo behavior. No schema migration is required. The hosted memory store mirrors the SQL behavior for tests.

## String comparisons

The selection parser accepts `prefix:>value` and `prefix:<value`, for example `tag_run:>2026-09` or `updated_at:<2027`. They compare the full original suffix after the prefix colon lexicographically and case-sensitively with JavaScript's strict greater/less operators. They do not parse dates or compare numbers. Thus `2026-09-01` is greater than the string `2026-09`, while exactly `2026-09` is neither greater nor less. Missing and empty values do not match a comparison. Any prefix can be used, including future tag namespaces. Existing trailing wildcard syntax remains available: `updated_at*` matches timestamp tags.

Comparisons combine with `and`, `or`, `not`, and parentheses. Empty operands and combined comparison/wildcard syntax produce a syntax error. Original values are retained separately from normalized search aliases, so punctuation normalization cannot change comparison boundaries. The SQL compiler resolves matching distinct tag keys with the same evaluator and then filters/counts/pages in SQL, preserving membership parity with the in-memory evaluator.

## Bookmark controls

Each card has 20px K, A and N square buttons below its + button. They map to `keeper`, `archive`, and `needs-more-time`, with visible labels Keep, Archive and Needs-time. Tapping changes only a local pending choice: the button has a high-contrast pressed state and the card says “Keep on sweep” (or its chosen verdict). Tapping the same letter again clears it, and another letter replaces it. The saved verdict and `updated_at` tag are unchanged until a sweep. Pending choices are scoped to collection and item and survive paging, filtering, resizing and collection switches in the open page; reloading clears them.

Sweep untriaged submits the current page's untriaged items plus any explicitly chosen cards that already have verdicts. Each submitted ID gets its pending choice or the sweep dropdown fallback (normally Junk). Sweep all selected applies the same precedence to its selected items after the usual confirmation. Both use an optional `item_verdicts` map on the existing verdict endpoints. `verdict-plan.mjs` validates every choice before writes, and the stores group updates by verdict in a single batch/action, preserving one-step Undo, shared timestamps and binding limits. Choices outside an action's item IDs never expand its scope. Failed saves preserve choices for retry; successful saves clear the affected choices. Existing toolbar/keyboard actions retain their immediate marked-set behavior and replace any pending choice on the items they save. Native Enter/Space activation remains intact.

On phones, the toolbar wraps into fixed rows so the sweep dropdown, sweep button and page controls remain visible without horizontal scrolling.

The title's overlapping-squares button copies the complete stored title as plain text, independently of the existing Copy URL control. Both use the clipboard API and report success or failure. The title text can truncate while its copy control remains visible. Controls have descriptive accessible labels and quick verdicts expose their pressed state.

## Verification

Run each application's `npm test` and `npm run test:browser` with installed lockfile dependencies. The timestamp tests use real SQLite and WASM, check multiple old tags, repeated actions, exact undo, untouched bookmarks, comparison boundaries and counts, and 201-item bulk updates. Browser cases exercise local choices without writes, toggle/switch and keyboard activation, other marked items, title-copy payloads, mixed sweeps, save/retry, Undo, changed dropdown defaults, existing verdict overrides, reload, and desktop/phone geometry. The standalone distribution and preview package must be regenerated using their established snapshot procedure; production releases remain separate.
