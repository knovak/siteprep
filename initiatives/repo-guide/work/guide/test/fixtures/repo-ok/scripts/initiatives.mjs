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

export const DOCUMENTS = [['shape.md', 'Shape'], ['record.md', 'Record']];
export const DEPLOY_ENVIRONMENTS = ['preview', 'live'];
export const DEPLOYMENT_LABELS = { folder: 'Folder', widget: 'Widget' };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  process.stdout.write('fixture CLI should not run during import\n');
}
