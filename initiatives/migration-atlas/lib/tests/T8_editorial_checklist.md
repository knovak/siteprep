# T8 — Editorial QA checklist

Apply to every new or edited migration entry before merging. The automated
gates (`node tests/test_core.mjs`) enforce structure; this checklist covers
judgment that machines can't.

For each entry:

1. **Numbers traceable.** Every figure (migrants, settled, diaspora_today)
   traces to a named source in `references`. If sources disagree, record the
   spread in `migrants_range` and pick a defensible central value.
2. **Confidence honest.** `low` whenever scholarly estimates span more than
   ~2×, for most pre-1800 flows, and wherever diaspora claims are community
   self-reports (e.g. Lebanese descendant figures).
3. **Two quantities not conflated.** `migrants` counts people who moved in
   the period; `diaspora_today` is usually descendants. If settled exceeds
   migrants (return migration, multiple counting), explain in `migrants_note`.
4. **Language sober.** `cause` describes; it does not editorialize. Atrocities
   are named plainly (enslavement, expulsion, genocide) without euphemism and
   without drama. Death tolls in transit go in notes where documented.
5. **Type defensible.** Coerced/mixed flows (e.g. Korean colonial migration)
   get the closest type plus a note recording the coercion; don't launder
   forced movement as voluntary.
6. **Geography sane.** Source/destination coordinates land on the right
   places at world zoom AND at 6× zoom (run the app and look).
7. **Period defensible.** Start/end reflect the main flow, not the first or
   last individual; multi-wave movements either get one envelope with a note,
   or separate entries.
8. **Visual check.** Play through the entry's period: arrow visible, readable
   width, residual circle lands where the diaspora actually is, no ugly
   overlap that a small coordinate nudge would fix.

Applied to the four Phase 5 additions (highland-clearances,
korean-colonial-migration, lebanese-diaspora, cuban-exodus) on 2026-07-05:
all eight points pass; Lebanese diaspora carries `low` confidence with the
descendant-figure caveat in its note, and the Korean entry's forced-
mobilization component is recorded in `cause` and `migrants_note`.
