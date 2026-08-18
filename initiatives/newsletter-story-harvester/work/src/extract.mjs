// Extraction - one issue, under one contract, into records.
//
// `spec.md` §3's option D in code: the shape is declared per source, the model
// reads within it, and this file is the part that decides. Everything a record
// depends on for identity comes from `html.mjs`; everything a reader will judge
// comes from the model; and the three things that make a wrong shape visible
// rather than plausible - the override, the count band, the loud case - are
// §3.2 and they all land here.
//
// Nothing of the mail survives (§6, `plan.md` §2). The document is read, the
// findings are resolved against it, and what leaves this function is records
// and a report of counts and ids. No HTML, no image, no attachment, and no
// temporary file.

import { readDocument, appearsIn } from './html.mjs';
import { contractFor, anchorFor, bandVerdict, isLoudCase, chromeReason } from './contracts.mjs';
import { buildRequest, parseFindings } from './model.mjs';
import { buildUrlKey } from './url-key.mjs';
import { makeRecord, uniqueTags } from './identity.mjs';

/**
 * Extract one issue.
 *
 * @param {object} issue          `{ id, html, source, issue_date, shape, unwrap }`
 *                                where `shape` is the inventory's declaration
 * @param {object} options
 * @param {string} [options.overrideShape] §3.2's per-issue override. What is
 *                                recorded on every record is what was
 *                                *extracted*, not what was expected
 * @param {Function} options.model     the model seam (`model.mjs`)
 * @param {string} options.harvester   which skill produced these records (§6)
 * @returns {Promise<{records: object[], report: object}>}
 */
export async function extractIssue(issue, { overrideShape, model, harvester = 'harvest-newsletters', now } = {}) {
  if (!issue?.id) throw new Error('extractIssue: an issue id is required');
  if (typeof model !== 'function') throw new Error('extractIssue: a model is required');

  const declaredShape = issue.shape;
  const shape = overrideShape || declaredShape;
  const contract = contractFor(shape);
  const document = readDocument(issue.html, { docId: issue.id });

  const raw = await model({
    issue_id: issue.id,
    shape,
    request: buildRequest(contract, document),
    links: document.links
  });
  const findings = parseFindings(raw, { shape });

  const records = [];
  const refused = [];
  const seenAnchors = new Map();

  for (const [position, finding] of findings.entries()) {
    const refuse = (reason, detail) => refused.push({ position, reason, detail: detail ?? null });

    let link = null;
    if (finding.link_index !== null) {
      link = document.links[finding.link_index];
      if (!link) {
        // A finding pointing at a link the document does not have is the model
        // reading a list that is not this one. Never guessed at.
        refuse('no such link', `link_index ${finding.link_index}`);
        continue;
      }
    }

    if (contract.needs_link && !link) {
      refuse('no link', `${contract.shape} stories are a link with its blurb`);
      continue;
    }

    const chrome = link ? chromeReason(link) : null;
    if (chrome) {
      refuse('chrome', chrome);
      continue;
    }

    if (link?.in_heading && contract.heading_links === 'refuse') {
      refuse('section heading', truncateForReport(link.text));
      continue;
    }

    // The strongest check in the suite (`test-plan.md` §5), and it is only
    // possible because §3.1 says the blurb is copied rather than paraphrased.
    if (contract.verbatim && !appearsIn(document, finding.text)) {
      refuse('text not in the issue', truncateForReport(finding.title));
      continue;
    }

    const anchor = anchorFor(contract, document, link, records.length);
    if (seenAnchors.has(anchor)) {
      refuse('duplicate anchor', anchor);
      continue;
    }

    const resolved = link?.href
      ? buildUrlKey(link.href, { unwrap: issue.unwrap })
      : { url: null, url_key: null, tags: [] };

    const record = makeRecord({
      url: resolved.url,
      url_key: resolved.url_key,
      title: finding.title || link?.text || '',
      text: finding.text,
      text_is_summary: contract.text_is_summary,
      source: issue.source,
      harvester,
      issue_date: issue.issue_date,
      story_date: finding.story_date ?? null,
      // §3.2: `shape` describes what was extracted, not what was expected.
      shape: contract.shape,
      source_doc: issue.id,
      source_anchor: anchor,
      tags: resolved.tags
    }, { now });

    seenAnchors.set(anchor, record.id);
    records.push(record);
  }

  // The band is checked on what was kept, not on what came back. A reply of
  // forty findings that were nearly all chrome is a yield of three, and three
  // is the number a reader would want flagged.
  const band = bandVerdict(contract, records.length);
  if (!band.inside) {
    for (const record of records) record.tags = uniqueTags([...record.tags, 'err:count']);
  }

  return {
    records,
    report: issueReport({ issue, declaredShape, contract, document, records, refused, band, findings })
  };
}

/**
 * What one issue's extraction says about itself.
 *
 * Counts and ids only - see the file header. `loud` is §3.2's case that gets
 * reported first and by name rather than counted, and it carries the source and
 * the issue because "a long-form source yielded thirty stories" is not
 * actionable without them.
 */
function issueReport({ issue, declaredShape, contract, document, records, refused, band, findings }) {
  return {
    issue_id: issue.id,
    source: issue.source,
    issue_date: issue.issue_date,
    declared_shape: declaredShape,
    extracted_shape: contract.shape,
    overridden: declaredShape !== contract.shape,
    links_in_document: document.links.length,
    findings_returned: findings.length,
    stories: records.length,
    refused: refused,
    refused_by_reason: countBy(refused, (r) => r.reason),
    band: { min: band.min, max: band.max, inside: band.inside, direction: band.direction ?? null },
    flagged: !band.inside,
    loud: isLoudCase(contract, records.length)
      ? {
          source: issue.source,
          issue_id: issue.id,
          issue_date: issue.issue_date,
          stories: records.length,
          message:
            `${issue.source} is declared long-form and issue ${issue.id} yielded ` +
            `${records.length} stories. A long-form issue is one story.`
        }
      : null,
    story_ids: records.map((r) => r.id)
  };
}

/**
 * The run's report, over many issues (`spec.md` §3.2, §5.2).
 *
 * Loud cases first, by name. Then the count flags. Then everything else - which
 * is the order a person reads in, and the reason the loud case is not one line
 * in a total.
 */
export function summariseRun(issueReports) {
  const loud = issueReports.map((r) => r.loud).filter(Boolean);
  const flagged = issueReports.filter((r) => r.flagged && !r.loud);
  return {
    loud,
    flagged: flagged.map((r) => ({
      issue_id: r.issue_id,
      source: r.source,
      shape: r.extracted_shape,
      stories: r.stories,
      band: `${r.band.min}-${r.band.max}`,
      direction: r.band.direction
    })),
    overridden: issueReports.filter((r) => r.overridden).map((r) => ({
      issue_id: r.issue_id,
      declared: r.declared_shape,
      extracted: r.extracted_shape
    })),
    issues: issueReports.length,
    stories: issueReports.reduce((n, r) => n + r.stories, 0),
    refused: issueReports.reduce((n, r) => n + r.refused.length, 0),
    refused_by_reason: mergeCounts(issueReports.map((r) => r.refused_by_reason))
  };
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

function mergeCounts(all) {
  const merged = {};
  for (const counts of all) {
    for (const [k, n] of Object.entries(counts)) merged[k] = (merged[k] || 0) + n;
  }
  return merged;
}

/** A title in a report is a label, not content. Long enough to recognise. */
function truncateForReport(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
}
