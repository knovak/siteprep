// The three extraction contracts - `spec.md` §3.1.
//
// A contract is what the harvester asks for, what it accepts back, and what it
// checks. The shape is declared per source (§4) and the contract is what makes
// that declaration mean something: the model reads, the contract decides.
//
// The reason all three are one kind of object is `plan.md` §3's: §3.2's
// per-issue override has to be a one-line decision, and it is only a one-line
// decision if a `long-form` source that this week is a link roundup can be run
// through the other contract without anything else changing.
//
// What is deliberately NOT here: the words of the summary, which are the
// model's, and the one thing in this pipeline that cannot be asserted
// (`test-plan.md` §2).

/**
 * What the model is asked to return.
 *
 * A finding names a *link index* rather than a URL, and that is the load-bearing
 * detail of this whole file. `spec.md` §3.3 requires identity to be structural;
 * if the model returned the href, a re-run that mis-copied one character would
 * produce a new id and a duplicate. The document owns the positions and the
 * hrefs (`html.mjs`); the model owns which of them are stories.
 */
export const FINDING_FIELDS = ['link_index', 'title', 'text', 'story_date'];

export const CONTRACTS = {
  'link-list': {
    shape: 'link-list',
    unit: 'one link with its sentence or two',
    band: { min: 10, max: 60 },
    text_is_summary: false,
    verbatim: true,
    needs_link: true,
    // A link inside a heading is a section heading, not a story - the failure
    // this shape is watched for, and structural enough to refuse rather than
    // hope the model noticed.
    heading_links: 'refuse',
    anchor: 'link-position',
    request: [
      'This is a link-list newsletter issue. Each story is one link with the',
      'sentence or two written about it.',
      '',
      'Return one finding per story link, as JSON:',
      '  link_index  the number of the link in the list below',
      '  title       the link text, or a better title from the same sentence',
      '  text        the blurb AS WRITTEN in the issue, copied not paraphrased',
      '  story_date  the story\'s own date if the issue states one, else null',
      '',
      'Do not return a finding for a section heading, a sponsor block, an',
      'unsubscribe or preferences link, or the newsletter\'s own navigation.',
      'Do not improve the blurb: it is copied so the reader can judge whether',
      'the source was worth reading.'
    ].join('\n'),
    failure_to_watch: 'a section heading harvested as a story'
  },

  'annotated-digest': {
    shape: 'annotated-digest',
    unit: 'one item with its paragraph',
    band: { min: 3, max: 15 },
    text_is_summary: false,
    verbatim: true,
    needs_link: true,
    // Here the item's own title *is* a heading with a link in it, so the same
    // structure that is a refusal above is the ordinary case.
    heading_links: 'accept',
    anchor: 'heading-path',
    request: [
      'This is an annotated-digest issue: a few items, each with a paragraph or',
      'more of commentary.',
      '',
      'Return one finding per item, as JSON:',
      '  link_index  the number of the item\'s link in the list below',
      '  title       the item\'s heading',
      '  text        the item\'s commentary AS WRITTEN, copied not paraphrased',
      '  story_date  the story\'s own date if the issue states one, else null',
      '',
      'An item whose commentary runs to several paragraphs is ONE story. Do not',
      'split it. Do not return a finding for a heading with no item under it.'
    ].join('\n'),
    failure_to_watch: 'one item split into three by its paragraphs'
  },

  'long-form': {
    shape: 'long-form',
    unit: 'the whole column',
    band: { min: 1, max: 1 },
    text_is_summary: true,
    verbatim: false,
    needs_link: false,
    heading_links: 'accept',
    anchor: 'document',
    request: [
      'This is a long-form column. THE WHOLE COLUMN IS ONE STORY.',
      '',
      'Return a JSON array containing exactly one finding:',
      '  link_index  the number of the column\'s own link if it has one, else null',
      '  title       the column\'s title',
      '  text        a summary of the column, in your own words',
      '  story_date  the column\'s own date if it states one, else null',
      '',
      'The links inside the column are citations to an argument, not stories.',
      'Never return one as a finding, however interesting it is.'
    ].join('\n'),
    failure_to_watch: 'thirty citations harvested as stories'
  }
};

export const SHAPES = Object.keys(CONTRACTS);

/** The contract for a shape, or a refusal - an unknown shape is never guessed. */
export function contractFor(shape) {
  const contract = CONTRACTS[shape];
  if (!contract) throw new Error(`no contract for shape "${shape}" (have: ${SHAPES.join(', ')})`);
  return contract;
}

/**
 * Chrome: the links every real newsletter carries and no contract may harvest.
 *
 * This is a **backstop, not the mechanism.** Under `spec.md` §3's option D the
 * model does the reading, and a model that returns the unsubscribe footer has
 * misread the issue. But `test-plan.md` §4.2's first row is an assertion about
 * this pipeline rather than about a recorded reply, and a rule that costs
 * nothing and catches the case in bulk belongs in the harvester: the footer is
 * in every issue, so a contract that only meets it in a hard case has the
 * difficulty exactly backwards (`test-plan.md` §3).
 *
 * Refusals are counted and reported, never silent - if this fires often, the
 * finding is about the prompt.
 */
const CHROME_HREF = [
  /unsubscribe/i, /\/preferences?\b/i, /manage[-_]?(your[-_]?)?(subscription|preferences)/i,
  /list-manage\.com\/(unsubscribe|profile|about)/i, /opt[-_]?out/i, /\/subscribe\b/i,
  /^mailto:/i, /^#/
];
const CHROME_TEXT = [
  /^unsubscribe/i, /update your preferences/i, /manage (your )?subscription/i,
  /view (this|it) (email )?in (your )?browser/i, /^subscribe\b/i, /^share\b/i,
  /^forward\b/i, /^advertisement$/i
];
const CHROME_HEADING = [/sponsor/i, /advertisement/i, /a message from/i, /together with/i];

export function chromeReason(link) {
  if (!link) return null;
  const href = link.href || '';
  if (!href) return 'no href';
  if (CHROME_HREF.some((p) => p.test(href))) return 'subscription link';
  if (CHROME_TEXT.some((p) => p.test(link.text || ''))) return 'subscription link text';
  if ((link.heading_path || []).some((h) => CHROME_HEADING.some((p) => p.test(h)))) {
    return 'sponsor block';
  }
  return null;
}

/**
 * `source_anchor` for a finding under a contract (`spec.md` §3.1).
 *
 * Structural in all three cases. `heading-path` falls back to the link position
 * when an item sits under no heading, which §3.1 writes as "heading path, else
 * position".
 */
export function anchorFor(contract, document, link, ordinal = 0) {
  if (contract.anchor === 'document') {
    // §3.1 says a long-form story's anchor is the document itself, and for the
    // one story a long-form issue is supposed to yield, it is.
    //
    // A *second* long-form story only exists when the shape was wrong, and that
    // is §3.2's loud case - the one `objectives.md` calls the sharpest test. If
    // every finding took the same anchor they would all collide on identity,
    // the yield would be 1 however many came back, and the pipeline would
    // silently swallow exactly the failure it is built to surface. So the
    // extras are disambiguated, structurally where the finding names a link.
    //
    // The cost, stated where somebody will meet it: an extra's identity is only
    // as stable as the reply's order when it names no link. That is the flagged
    // case rather than the ordinary one, and a flagged story a person will look
    // at is worth more than a stable id nobody will see.
    if (ordinal === 0) return 'document';
    return link ? `document#link:${link.index}` : `document#${ordinal}`;
  }
  if (contract.anchor === 'heading-path' && link?.heading_path?.length) {
    return `${link.heading_path.join(' > ')}#link:${link.index}`;
  }
  if (!link) throw new Error(`anchorFor: ${contract.shape} needs a link`);
  return `link:${link.index}`;
}

/** Whether a yield is inside the contract's band (`spec.md` §3.2). */
export function bandVerdict(contract, count) {
  const { min, max } = contract.band;
  if (count < min) return { inside: false, direction: 'under', min, max, count };
  if (count > max) return { inside: false, direction: 'over', min, max, count };
  return { inside: true, min, max, count };
}

/**
 * The loud case, by name (`spec.md` §3.2).
 *
 * A `long-form` source yielding more than one story is the exact silent failure
 * `objectives.md` names, so it is not one line in a count of flags - it is
 * reported first and it says which source and which issue.
 */
export function isLoudCase(contract, count) {
  return contract.shape === 'long-form' && count > contract.band.max;
}
