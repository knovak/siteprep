export const STAGES =
  [ 'seed', /* formatting is deliberately odd */ 'grown', 'resting' ];

export const STAGE_DOCUMENTS = {
  grown:
    ['shape.md']
};

export const BLOCKER_PREFIXES = ['todo', 'person'];
export const HUMAN_BLOCKERS = new Set([
  'person'
]);
export const PROPOSABLE_BLOCKERS = new Set(['person']);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  process.stdout.write('fixture CLI should not run during import\n');
}
