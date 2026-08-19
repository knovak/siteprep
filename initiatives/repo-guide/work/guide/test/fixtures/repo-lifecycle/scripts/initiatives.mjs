// A full eight-stage lifecycle, which is what the simulator walk-through needs.
// `repo-ok` stays deliberately minimal for the fact-reader tests; this fixture
// exists so the simulator's stricter vocabulary requirements are exercised
// against names that are nothing like the real repository's.
export const STAGES = [
  'seed', 'sketched', 'chosen', 'ordered', 'making', 'polishing', 'resting', 'closed',
];

export const STAGE_DOCUMENTS = {
  sketched: ['shape.md'],
  chosen: ['shape.md', 'choice.md'],
  ordered: ['shape.md', 'choice.md', 'order.md'],
  making: ['shape.md', 'choice.md', 'order.md'],
  polishing: ['shape.md', 'choice.md', 'order.md'],
};

export const BLOCKER_PREFIXES = ['todo', 'person', 'ledger'];
export const HUMAN_BLOCKERS = new Set(['person', 'ledger']);
export const PROPOSABLE_BLOCKERS = new Set(['person']);
