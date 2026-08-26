// The model seam, and the recording that holds it still.
//
// `test-plan.md` §2 splits the one non-deterministic part of this system out of
// everything around it: a **contract** test is a fixture issue plus a recorded
// reply, and it gates every change; an **eval** is the same fixtures with a
// live call, scored rather than asserted, and deliberately outside the gating
// suite. This file is that split, and it is one function wide.
//
// The recorded implementation never falls back to a live call. A missing
// recording is an error, because a test suite that quietly reaches a model is a
// test suite that fails for reasons unrelated to the change under test - and
// that is precisely what §2.1 says gets muted.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A model call: `({ issue_id, shape, request, links }) -> raw reply text`.
 *
 * The harvester passes the *document's* link list, numbered, so the reply can
 * reference positions rather than URLs (`contracts.mjs`, FINDING_FIELDS).
 */
export function recordedModel(dir) {
  return async ({ issue_id: issueId, shape }) => {
    const path = join(dir, `${issueId}.${shape}.json`);
    if (!existsSync(path)) {
      throw new Error(
        `no recorded reply for ${issueId} under ${shape} (${path}). ` +
        'Contract tests never call a live model - record the reply first.'
      );
    }
    return readFileSync(path, 'utf8');
  };
}

/** A model that returns whatever a test hands it. For the failure paths only. */
export function stubModel(reply) {
  return async (request) => (typeof reply === 'function' ? reply(request) : reply);
}

/**
 * The prompt an issue and a contract produce.
 *
 * Built here rather than in the contract so that the numbered link list - the
 * thing `link_index` refers to - is constructed in exactly one place. A prompt
 * that numbered the links differently from the document would produce findings
 * that resolve to the wrong stories, and every id would still be stable and
 * still be wrong.
 */
export function buildRequest(contract, document) {
  const links = document.links
    .map((l) => `  ${l.index}. ${l.text || '(no text)'} -> ${l.href || '(no href)'}`)
    .join('\n');
  return [
    contract.request,
    '',
    'The links in this issue, numbered:',
    links || '  (none)',
    '',
    'The issue:',
    document.plain_text
  ].join('\n');
}

/**
 * Parse a reply into findings, strictly.
 *
 * Strict because a reply that is *nearly* right is the failure this layer is
 * for: a finding with an extra field is a model doing something the contract
 * did not ask for, and letting it through is how the contract stops describing
 * what actually happens.
 */
export function parseFindings(raw, { shape } = {}) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    throw new Error(`reply for ${shape} is not JSON: ${error.message}`);
  }

  const findings = Array.isArray(parsed) ? parsed : parsed?.findings;
  if (!Array.isArray(findings)) {
    throw new Error(`reply for ${shape} is not a list of findings`);
  }

  return findings.map((finding, position) => {
    if (!finding || typeof finding !== 'object') {
      throw new Error(`finding ${position} in the ${shape} reply is not an object`);
    }
    const unknown = Object.keys(finding).filter((k) => !FINDING_KEYS.has(k));
    if (unknown.length) {
      throw new Error(`finding ${position} in the ${shape} reply has unknown fields: ${unknown.join(', ')}`);
    }
    const index = finding.link_index;
    if (index !== null && index !== undefined && !Number.isInteger(index)) {
      throw new Error(`finding ${position} in the ${shape} reply has a non-integer link_index`);
    }
    if (finding.text_is_summary !== undefined && typeof finding.text_is_summary !== 'boolean') {
      throw new Error(`finding ${position} in the ${shape} reply has a non-boolean text_is_summary`);
    }
    return {
      link_index: index ?? null,
      title: String(finding.title ?? '').trim(),
      text: String(finding.text ?? '').trim(),
      text_is_summary: finding.text_is_summary ?? (shape === 'long-form'),
      story_date: finding.story_date ?? null
    };
  });
}

const FINDING_KEYS = new Set(['link_index', 'title', 'text', 'text_is_summary', 'story_date']);
