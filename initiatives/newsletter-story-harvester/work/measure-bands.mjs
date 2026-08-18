// `test-plan.md` §4.2's measured row: what each contract actually yields on the
// fixtures, and what the bands should be.
//
// A script rather than a test, because the numbers decide things (`plan.md` §4)
// rather than pass or fail. Run it, read it, and put the numbers in
// `decisions.md` - a band learned from data and then buried in a constant is a
// decision nobody can revisit.
//
//   node initiatives/newsletter-story-harvester/work/measure-bands.mjs

import { readFileSync } from 'node:fs';
import { extractIssue, summariseRun } from './src/extract.mjs';
import { recordedModel } from './src/model.mjs';
import { CONTRACTS } from './src/contracts.mjs';

const ISSUES = new URL('./fixtures/issues/', import.meta.url).pathname;
const model = recordedModel(new URL('./fixtures/responses/', import.meta.url).pathname);

const CASES = [
  { id: 'link-list-typical', shape: 'link-list' },
  { id: 'link-list-headings', shape: 'link-list' },
  { id: 'annotated-digest-typical', shape: 'annotated-digest' },
  { id: 'long-form-citations', shape: 'long-form' },
  { id: 'long-form-roundup', shape: 'long-form' },
  { id: 'long-form-roundup', shape: 'long-form', override: 'link-list' },
  { id: 'empty-issue', shape: 'link-list' }
];

const reports = [];
const rows = [];

for (const { id, shape, override } of CASES) {
  const { records, report } = await extractIssue(
    {
      id,
      html: readFileSync(`${ISSUES}${id}.html`, 'utf8'),
      source: `src-${id}`,
      issue_date: '2026-01-12',
      shape
    },
    { overrideShape: override, model }
  );
  reports.push(report);
  rows.push({
    issue: id,
    extracted_as: report.extracted_shape,
    links: report.links_in_document,
    findings: report.findings_returned,
    stories: records.length,
    refused: report.refused.length,
    band: `${report.band.min}-${report.band.max}`,
    flag: report.band.inside ? '' : report.band.direction
  });
}

console.table(rows);

console.log('\nrefusals by reason, across every fixture:');
console.table(summariseRun(reports).refused_by_reason);

console.log('\nyield against the band, per contract:');
for (const [shape, contract] of Object.entries(CONTRACTS)) {
  const yields = reports.filter((r) => r.extracted_shape === shape).map((r) => r.stories);
  console.log(
    `  ${shape.padEnd(18)} band ${contract.band.min}-${contract.band.max}` +
    `  observed ${yields.join(', ') || '(none)'}`
  );
}
