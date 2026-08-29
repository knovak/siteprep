# Objectives

What "done" would mean, derived from the wish. Outcomes, not implementation —
how any of this is built belongs in `spec.md`.

## The point

**Turn a growing stream of sources into curated topic documents without losing
the evidence, intermediate judgement, or human responsibility behind them.**

The pipeline succeeds when AI can do the repetitive first pass at every stage,
people can inspect and improve that work, and a later reader can trace a
conclusion back through its mini narratives and assessments to the original
references. Throughput alone is not success: a fast pipeline that hides source
loss, copied claims, uncertain promotion, or unreviewed document changes would
defeat the wish.

## Done means

1. **Sources can enter through several real collection paths without becoming
   second-class records.** Web search results, email material, direct user
   donations, and a browser-save flow can all produce references with their
   origin, contributor or collection context, capture time, available source
   metadata, and retention limitations visible. A missing snapshot or
   restricted source is represented honestly rather than silently discarded.

2. **Every original reference survives every later transformation.** Selection,
   tagging, topic assignment, mini-narrative construction, standing-document
   comparison, and archival retain backward links to the source records they
   used. Changes create reviewable history instead of overwriting the only copy,
   and a person can distinguish the original material from AI-generated and
   human-authored interpretation.

3. **Multi-dimensional tagging is useful without pretending the vocabulary is
   settled forever.** A source can carry several values across dimensions such
   as company, geography, actor category, technology type, and social-value
   area. People can inspect why tags were suggested, correct them, represent
   uncertainty, and understand how vocabulary changes affect earlier records.

4. **Promotion exposes the judgement behind quality and importance.** AI can
   assess relevance, source quality, novelty, importance, and urgency, while
   preserving the evidence and reasoning needed for review. Promoted, deferred,
   and rejected items remain findable; repetition, syndication, and source
   dependence are not counted as independent corroboration merely because
   several URLs repeat a claim.

5. **One source can contribute coherently to several topics.** Topic assignment
   is many-to-many, with each assignment retaining the shared source identity
   and any topic-specific interpretation. Related, redundant, supporting, and
   conflicting material can be combined into sequenced mini narratives without
   erasing disagreement or duplicating the underlying reference.

6. **New mini narratives can be compared with zero or more standing documents.**
   For each topic, the pipeline makes the amount, novelty, contradiction, and
   apparent urgency of incoming material inspectable against the current
   curated conclusions or positions. A topic with no standing document is a
   valid starting state, not an error or an invitation to fabricate one.

7. **Updating a standing document remains an accountable human act.** AI may
   prepare comparisons, candidate changes, and supporting evidence, but a
   person authors or explicitly approves the update. The resulting document
   shows which evidence changed it, what was not incorporated, and which
   conclusions remain disputed or provisional.

8. **Archival closes a loop rather than hiding an inbox.** A mini narrative
   moves into the reference archive only after there is a durable record of how
   it was incorporated, rejected, deferred, or superseded. Archived material
   remains searchable and traceable from the standing document and can be
   revisited when a source, topic, or conclusion changes.

9. **AI and human work can be reviewed stage by stage.** Each stage begins with
   a repeatable AI-produced proposal and has a clear place for people, including
   skill-assisted work, to correct, supplement, approve, or stop it. The record
   identifies the inputs, outputs, actor, time, and relevant model or process
   version well enough to audit a sample and understand why the next stage saw
   what it saw.

10. **The accumulated knowledge is portable and resilient.** References,
    metadata, links among stages, narrative records, review history, standing
    documents, and archive dispositions can be exported in documented forms.
    The pipeline does not depend on one read-it-later service, mailbox, model,
    or hosted product remaining available in order to preserve its audit trail.

## Explicitly not the first version

- A universal crawler, mailbox replacement, or publisher-specific capture
  system. The first version proves representative harvesting paths and an
  honest record for content it cannot retain.
- A universal ontology for all companies, places, actors, technologies, and
  social values. The first version must support useful dimensions and visible
  vocabulary evolution, not settle every taxonomy.
- Fully autonomous publication of standing documents. AI-prepared comparisons
  and draft changes do not remove the human authorship or approval boundary.
- A machine claim that source quality, importance, urgency, or truth has been
  objectively settled. Those judgements stay inspectable, correctable, and
  capable of expressing uncertainty and conflict.
- Indefinite storage of every copyrighted or access-controlled source body.
  Retention follows the source terms and available permissions while keeping
  the reference and provenance record honest.
- A collaborative editor, public knowledge portal, or generalized workflow
  platform. Those may consume the pipeline later; they are not prerequisites
  for proving its staged curation loop.

## How we will know

- A representative intake containing web results, email material, direct user
  contributions, and browser-saved items reaches one source inventory with
  provenance and explicit capture or retention status.
- Reviewers can follow sampled standing-document claims backward through every
  relevant narrative, topic assignment, promotion assessment, tag, and source,
  and can distinguish AI actions from human actions at each stage.
- A mixed batch exercises controlled and open tags, corrections, uncertain
  values, a vocabulary change, copied or syndicated material, and conflicting
  sources without turning repetition into false corroboration.
- The same reference is assigned to more than one topic and appears in
  topic-specific mini narratives while retaining one auditable source identity.
- For a topic with an existing standing document, the pipeline presents new,
  redundant, supporting, and conflicting narratives with understandable volume
  and urgency signals; for a new topic, it handles the absence of a standing
  document explicitly.
- A person reviews a proposed standing-document update, changes or rejects part
  of it, approves the final text, and can later show the evidence and review
  record for that result.
- Narratives move to the reference archive only with recorded dispositions, and
  an archived item can be recovered when later evidence reopens the topic.
- A documented export preserves the source records, stage links, judgements,
  standing documents, and archive history well enough for an independent
  reader to inspect without the original hosted service.

## Questions for the spec

The specification must choose the canonical retained objects and version
boundaries; the minimum lawful and useful source capture; which tag dimensions
are controlled, open, or hybrid; how tag vocabularies evolve; and how source
dependence, syndication, contradiction, confidence, and uncertainty are
represented.

It must also compare how stage proposals and human interventions are recorded;
what qualifies an item for promotion; how topic-specific mini narratives share
one underlying reference; how volume and urgency are measured against standing
documents; what exact act permits archival; how AI may suggest document changes
without crossing the human authorship boundary; and what portable export proves
that the audit trail survives. Those choices belong in `spec.md`, informed by
the prior-art and provenance lessons in `background.md`.
