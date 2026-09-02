// The lifecycle simulator.
//
// The point of this deliverable is that the process can be *watched*, not just
// read (`objectives.md`, objective 4). The first version did not manage that: it
// rendered six states by tearing down the item list and rebuilding it, so
// nothing ever visibly happened to anything. An item that turned amber between
// two steps was a different element with the same words, which reads as a new
// screen rather than as a consequence — and the left-hand narrative had to
// *tell* the reader what changed, because the picture never showed it.
//
// So items are keyed and the DOM is reconciled rather than replaced: an item
// that persists across a step is the same element, and it slides, recolours, or
// collapses out of the list. The interesting moments — a budget running out, a
// merge cascading — are choreographed as timed beats within one step rather
// than presented pre-finished.
//
// The choreography is fixed and abstract: it never reads an `initiative.json`.
// Only lifecycle vocabulary resolves from the repository, which is what keeps
// the "reads no initiative data" promise testable.

import {execFile as execFileCallback} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {resolveDating} from './dating.mjs';
import {resolveRepositoryFactKeys} from './facts.mjs';

const execFile = promisify(execFileCallback);
export const SIMULATOR_FACT_KEYS = [
  'lifecycle.stages',
  'lifecycle.stage_documents',
  'blockers.proposable',
  'blockers.human',
  'sweep.phases',
  'sweep.budget',
];
const SOURCE_PATHS = ['scripts/initiatives.mjs', 'initiatives/sweep.json'];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function embeddedJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function normaliseRepositoryUrl(value) {
  const trimmed = value.trim().replace(/\.git$/, '');
  if (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed;
  const ssh = trimmed.match(/^git@github\.com:([\w.-]+\/[\w.-]+)$/);
  if (ssh) return `https://github.com/${ssh[1]}`;
  throw new Error(`Unsupported GitHub origin: ${value.trim()}`);
}

async function gitValue(root, args) {
  const {stdout} = await execFile('git', ['-C', root, ...args]);
  return stdout.trim();
}

function requireArray(value, name, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum || value.some(item => typeof item !== 'string' || !item)) {
    throw new Error(`Simulator requires ${name} with at least ${minimum} non-empty value${minimum === 1 ? '' : 's'}`);
  }
  return value;
}

export function simulatorVocabulary(facts) {
  // Eight stages is what the full lifecycle walk-through needs: it visits every
  // one, including the quiet ones at the end.
  const stages = requireArray(facts['lifecycle.stages'], 'lifecycle.stages', 8);
  const stageDocuments = facts['lifecycle.stage_documents'];
  if (!stageDocuments || typeof stageDocuments !== 'object' || Array.isArray(stageDocuments)) {
    throw new Error('Simulator requires lifecycle.stage_documents');
  }
  for (const stage of Object.keys(stageDocuments)) {
    if (!stages.includes(stage)) throw new Error(`Lifecycle drift: stage_documents names unknown stage ${stage}`);
  }
  const proposable = requireArray(facts['blockers.proposable'], 'blockers.proposable');
  const humanClasses = requireArray(facts['blockers.human'], 'blockers.human', 2);
  const unproposable = humanClasses.find(name => !proposable.includes(name));
  if (!unproposable) throw new Error('Simulator requires a human blocker class that cannot be proposed');
  const phases = requireArray(facts['sweep.phases'], 'sweep.phases', 2);
  const budget = facts['sweep.budget']?.items_per_run;
  if (!Number.isInteger(budget) || budget < 2) throw new Error('Simulator requires sweep.budget.items_per_run of at least 2');
  return {
    stages,
    stage_documents: stageDocuments,
    blocker_classes: proposable,
    unproposable_class: unproposable,
    phases,
    items_per_run: budget,
  };
}

export function buildSimulatorSteps(facts) {
  const vocabulary = simulatorVocabulary(facts);
  const [wish, shaped, specified, planned, building, refining, dormant, archived] = vocabulary.stages;
  const proposable = vocabulary.blocker_classes[0];
  const factClass = vocabulary.unproposable_class;
  const budget = vocabulary.items_per_run;
  const phases = vocabulary.phases;
  const firstPhase = phases[0];
  const respondPhase = phases[Math.min(1, phases.length - 1)];
  const proposePhase = phases[Math.min(2, phases.length - 1)];
  const workPhase = phases.at(-1);

  const phaseStatus = (active, completed = []) => Object.fromEntries(phases.map(phase => [
    phase,
    completed.includes(phase) ? 'complete' : phase === active ? 'active' : 'waiting',
  ]));
  const idle = phaseStatus(null);
  const allComplete = phaseStatus(null, phases);
  const documentsFor = stage => vocabulary.stage_documents[stage] ?? [];

  const step = value => ({
    phases: idle,
    budget: {spent: 0, of: budget},
    documents: documentsFor(value.stage),
    beats: null,
    ...value,
  });

  const steps = [
    step({
      id: 'wish-written', actor: 'person', stage: wish,
      eyebrow: 'You start it', title: 'Write the wish in your own words',
      narrative: 'You write down what you want. That wording becomes the durable starting point, before an agent shapes it or proposes a solution.',
      items: [{key: 'objectives', label: 'Draft objectives', state: 'actionable', detail: 'Ready for an agent.'}],
      fork: ['Research first', 'Skip research'],
      changes: ['The initiative exists.', 'You can ask for background research first, or move straight to shaping.'],
      advance: 'you choose whether research would help',
    }),
    step({
      id: 'research-choice', actor: 'agent', stage: wish,
      eyebrow: 'Optional path', title: 'Research first, or not',
      narrative: 'If you want background research, the agent records it as context. If you do not, the wish moves ahead unchanged. Both paths lead to the same next item.',
      items: [{key: 'objectives', label: 'Draft objectives', state: 'actionable', detail: 'Research can inform this, but it is not required.'}],
      fork: ['Research notes added', 'No research needed'],
      flow: ['wish.md', 'optional research', 'objectives.md'],
      changes: ['Research stays optional.', 'The wish remains your words either way.'],
      advance: 'the agent drafts objectives in a branch',
    }),
    step({
      id: 'objectives-pr', actor: 'agent', stage: wish,
      eyebrow: 'A proposal, not a change', title: 'Draft objectives for review',
      narrative: 'The agent turns your wish into checkable outcomes on a branch, runs the write-scope check, and opens a ready pull request with a branch preview.',
      items: [{key: 'objectives', label: 'Draft objectives', state: 'in-flight', detail: 'Ready pull request waiting for you.'}],
      flow: ['objectives item', 'sweep branch', 'write-scope check', 'branch preview', 'ready pull request'],
      changes: ['You can inspect the proposal before it becomes history.', 'Nothing merges automatically.'],
      advance: 'you merge the objectives',
    }),
    step({
      id: 'objectives-merged', actor: 'person', stage: shaped,
      eyebrow: 'Your merge moves the stage', title: 'You merge: the initiative is shaped',
      narrative: 'You merge the objectives when they say what done should mean. The initiative moves to shaped and the specification becomes the next item.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Ready for an agent.', changed: true},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'A judgment call still needs to be named.'},
      ],
      flow: ['objectives item', 'branch', 'pull request', 'you merge'],
      changes: ['objectives.md joins the record.', 'Your merge advances the stage.'],
      advance: 'the agent finds a question it cannot answer',
    }),
    step({
      id: 'blocker-named', actor: 'agent', stage: shaped,
      eyebrow: 'A person is required', title: 'Name the question instead of guessing',
      narrative: 'The repository cannot choose the interaction for you. The agent labels the item honestly, stops on that question, and adds it to the digest.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Other work can continue.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: pick the trade-off`},
      ],
      phases: phaseStatus(firstPhase),
      digest: {change: 'added', lines: ['Choose the interaction — waiting on your judgment']},
      changes: [`The blocker class is ${proposable}.`, 'The digest gains one line for you.'],
      advance: 'a bounded sweep works around the question',
    }),
    step({
      id: 'sweep-runs', actor: 'agent', stage: shaped,
      eyebrow: 'Bounded automation', title: 'The sweep finishes what fits',
      narrative: `The sweep handles review replies, proposals, and remaining work in that order. Its shared limit is currently ${budget} items, so lower-ranked work waits when the meter fills.`,
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Waiting for the work phase.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
        {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Lower in the ranking.'},
      ],
      digest: {change: 'present', lines: ['Choose the interaction — waiting on your judgment']},
      changes: ['Review replies come first.', `The shared limit is ${budget} items for the whole run.`],
      advance: 'you answer the waiting question',
      beats: [
        {at: 0, phases: phaseStatus(firstPhase), budget: {spent: 0, of: budget}},
        {at: 900, phases: phaseStatus(respondPhase, [firstPhase]), budget: {spent: Math.max(1, budget - 3), of: budget}},
        {at: 1800, phases: phaseStatus(proposePhase, phases.filter(phase => phases.indexOf(phase) < phases.indexOf(proposePhase))), budget: {spent: Math.max(1, budget - 2), of: budget}},
        {at: 2700, phases: phaseStatus(workPhase, phases.filter(phase => phase !== workPhase)), budget: {spent: budget - 1, of: budget}, items: [
          {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'A ready pull request is open.'},
          {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
          {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Next in the ranking.'},
        ]},
        {at: 3600, phases: allComplete, budget: {spent: budget, of: budget}, items: [
          {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'A ready pull request is open.'},
          {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
          {key: 'increment', label: 'Build the first increment', state: 'passed', detail: `Passed over at ${budget}/${budget}.`},
        ]},
      ],
    }),
    step({
      id: 'answer-recorded', actor: 'person', stage: shaped,
      eyebrow: 'Your answer clears the blocker', title: 'Answer the question',
      narrative: 'You choose the trade-off. The agent records your answer and reasoning in decisions.md, unblocks the item, and removes the line from the digest.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'Review continues in its pull request.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'Your recorded answer makes this doable.', changed: true},
      ],
      phases: allComplete, budget: {spent: budget, of: budget},
      digest: {change: 'removed', lines: []},
      changes: ['decisions.md keeps the answer.', 'The digest line disappears.'],
      advance: 'you merge the specification',
    }),
    step({
      id: 'spec-merged', actor: 'person', stage: specified,
      eyebrow: 'Your merge moves the stage', title: 'You merge: the initiative is specified',
      narrative: 'You merge the specification after review. The finished item leaves the list, spec.md joins the record, and planning becomes actionable.',
      items: [{key: 'plan', label: 'Plan the build', state: 'actionable', detail: 'Unblocked by your merge.', changed: true}],
      flow: ['specification item', 'branch', 'pull request', 'you merge'],
      changes: ['The completed item leaves the queue.', 'Your merge advances the stage.'],
      advance: 'an assumption sends the work backwards',
    }),
    step({
      id: 'assumption-breaks', actor: 'agent', stage: shaped,
      eyebrow: 'The lifecycle can move backwards', title: 'Move back when the reasoning changes',
      narrative: 'The agent finds that an assumption in the specification does not hold. It moves the stage back and proposes a revision instead of pretending the work is further along.',
      items: [{key: 'spec-revision', label: 'Revise the specification', state: 'actionable', detail: 'The rejected alternative now looks stronger.'}],
      changes: ['The stage moves back honestly.', 'The earlier record stays readable.'],
      advance: 'you merge the revised specification',
    }),
    step({
      id: 'revision-merged', actor: 'person', stage: specified,
      eyebrow: 'Your merge restores the path', title: 'You merge: the revision is specified',
      narrative: 'You merge the corrected specification. Planning can now use reasoning that matches what the team learned.',
      items: [{key: 'plan', label: 'Plan the build', state: 'actionable', detail: 'Ready on the corrected specification.', changed: true}],
      flow: ['revision item', 'branch', 'pull request', 'you merge'],
      changes: ['spec.md keeps the revised reasoning.', 'Your merge advances the stage again.'],
      advance: 'the agent proposes a plan and test plan',
    }),
    step({
      id: 'plan-pr', actor: 'agent', stage: specified,
      eyebrow: 'Order before implementation', title: 'Propose the plan and its tests',
      narrative: 'The agent breaks the build into reviewable increments, pairs them with checks, and opens a pull request for plan.md and test-plan.md.',
      items: [{key: 'plan', label: 'Plan the build', state: 'in-flight', detail: 'Plan and tests are ready for your review.'}],
      flow: ['plan item', 'sweep branch', 'write-scope check', 'branch preview', 'ready pull request'],
      changes: ['The order is reviewable.', 'Implementation has not started.'],
      advance: 'you merge the plan',
    }),
    step({
      id: 'plan-merged', actor: 'person', stage: planned,
      eyebrow: 'Your merge moves the stage', title: 'You merge: the initiative is planned',
      narrative: 'You merge the plan and test plan. The first item is not implementation: it is a deliberate critique of the plan.',
      items: [
        {key: 'critique-plan', label: 'Critique the plan', state: 'actionable', detail: 'Required before increment one.', changed: true},
        {key: 'increment-one', label: 'Build increment one', state: 'blocked', detail: 'todo: waits for the critique'},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      flow: ['plan item', 'branch', 'pull request', 'you merge'],
      changes: ['plan.md and test-plan.md join the record.', 'Critique comes before code.'],
      advance: 'the agent critiques the plan in its own pull request',
    }),
    step({
      id: 'critique-pr', actor: 'agent', stage: planned,
      eyebrow: 'Challenge the plan first', title: 'Critique the plan before increment one',
      narrative: 'The agent tests the sequence, risks, and checks against the repository. It revises the plan in a branch and opens a separate ready pull request.',
      items: [
        {key: 'critique-plan', label: 'Critique the plan', state: 'in-flight', detail: 'Revised plan waiting for you.'},
        {key: 'increment-one', label: 'Build increment one', state: 'blocked', detail: 'todo: waits for the critique'},
      ],
      flow: ['critique item', 'sweep branch', 'write-scope check', 'branch preview', 'ready pull request'],
      changes: ['The critique changes the plan before code.', 'The first increment stays blocked.'],
      advance: 'you merge the critique',
    }),
    step({
      id: 'critique-merged', actor: 'person', stage: building,
      eyebrow: 'Your merge starts the build', title: 'You merge: building can begin',
      narrative: 'You merge the revised plan. The critique leaves the queue and increment one becomes actionable.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'actionable', detail: 'Unblocked by your merge.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      flow: ['critique item', 'branch', 'pull request', 'you merge'],
      changes: ['The critique is complete.', 'Your merge advances the stage.'],
      advance: 'the agent builds increment one on a branch',
    }),
    step({
      id: 'increment-one-branch', actor: 'agent', stage: building,
      eyebrow: 'Increment one', title: 'Build and check the branch',
      narrative: 'The agent builds increment one on its own branch, verifies that it wrote only inside the initiative, and prepares a branch preview.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'in-flight', detail: 'Branch checks are running.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      flow: ['increment one', 'sweep branch', 'write-scope check', 'branch preview'],
      changes: ['The change is isolated.', 'The preview is visible before review.'],
      advance: 'the agent opens the pull request',
    }),
    step({
      id: 'increment-one-pr', actor: 'agent', stage: building,
      eyebrow: 'Increment one', title: 'Open a ready pull request',
      narrative: 'The checked branch becomes a ready pull request. The agent reports the tests and leaves the merge to you.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'review', detail: 'Ready pull request under review.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      flow: ['increment one', 'sweep branch', 'write-scope check', 'branch preview', 'ready pull request'],
      changes: ['Review now has a concrete change.', 'Nothing merges automatically.'],
      advance: 'the agent answers review comments',
    }),
    step({
      id: 'review-returns', actor: 'agent', stage: building,
      eyebrow: 'Review work comes first', title: 'Answer comments before opening more work',
      narrative: 'When review comments arrive, the sweep handles them before proposals or new items. The agent revises or replies, but leaves every thread and the merge for the reviewer.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'review', detail: 'Review comments waiting for an answer.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      flow: ['increment one', 'branch updated', 'pull request answered', 'reviewer decides'],
      changes: ['The agent answers the comments.', 'The reviewer keeps control of the thread.'],
      advance: 'you merge increment one',
      beats: [
        {at: 0, phases: phaseStatus(firstPhase), budget: {spent: 0, of: budget}},
        {at: 1000, phases: phaseStatus(respondPhase, [firstPhase]), budget: {spent: 1, of: budget}, items: [
          {key: 'increment-one', label: 'Build increment one', state: 'in-flight', detail: 'Answered and back with you.', changed: true},
          {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
        ]},
      ],
    }),
    step({
      id: 'increment-one-merged', actor: 'person', stage: building,
      eyebrow: 'Your merge unblocks the next item', title: 'You merge: increment one is complete',
      narrative: 'You merge increment one. It leaves the queue, and increment two becomes actionable without changing the stage.',
      items: [{key: 'increment-two', label: 'Build increment two', state: 'actionable', detail: 'Unblocked by your merge.', changed: true}],
      flow: ['increment one', 'branch', 'pull request', 'you merge'],
      changes: ['The first increment is complete.', 'The next item becomes actionable.'],
      advance: 'the agent builds increment two',
    }),
    step({
      id: 'increment-two-branch', actor: 'agent', stage: building,
      eyebrow: 'Increment two', title: 'Build and check the second branch',
      narrative: 'The agent repeats the same visible path for increment two: branch, write-scope check, and branch preview.',
      items: [{key: 'increment-two', label: 'Build increment two', state: 'in-flight', detail: 'Branch checks are running.', changed: true}],
      flow: ['increment two', 'sweep branch', 'write-scope check', 'branch preview'],
      changes: ['The same boundary applies to every increment.', 'The preview comes before the pull request.'],
      advance: 'the agent opens the second pull request',
    }),
    step({
      id: 'increment-two-pr', actor: 'agent', stage: building,
      eyebrow: 'Increment two', title: 'Put the second increment under review',
      narrative: 'The agent opens a ready pull request for increment two and reports its checks. You still decide whether it merges.',
      items: [{key: 'increment-two', label: 'Build increment two', state: 'review', detail: 'Ready pull request waiting for you.', changed: true}],
      flow: ['increment two', 'sweep branch', 'write-scope check', 'branch preview', 'ready pull request'],
      changes: ['The second increment is reviewable.', 'The output has not graduated yet.'],
      advance: 'you merge and graduate the output',
    }),
    step({
      id: 'outputs-registered', actor: 'person', stage: refining,
      eyebrow: 'Your merge graduates the output', title: 'You merge: the output enters refining',
      narrative: 'You merge the final increment and graduate the output. The initiative keeps a pointer to it and seeds two refining items: polish the output, and release it only when you ask.',
      items: [
        {key: 'polish', label: 'Tidy the rough edges', state: 'actionable', detail: 'A normal refining item.', changed: true},
        {key: 'release', label: 'Release to production', state: 'blocked', detail: 'permission: waits for your explicit request', changed: true},
      ],
      flow: ['increment two', 'branch', 'pull request', 'you merge', 'output graduates'],
      changes: ['Two refining items are seeded.', 'Production is still unchanged.'],
      advance: 'the agent finishes the polish item',
    }),
    step({
      id: 'polish-finished', actor: 'agent', stage: refining,
      eyebrow: 'Refining work continues', title: 'Polish without publishing',
      narrative: 'The agent can finish the ordinary refining item and refresh a test preview. That still does not authorize a production release.',
      items: [
        {key: 'release', label: 'Release to production', state: 'blocked', detail: 'permission: waits for your explicit request'},
        {key: 'validation', label: 'Record practitioner validation', state: 'blocked', detail: `${factClass}: only the named reviewer can supply it`},
      ],
      changes: ['The test preview can change.', 'Production stays where it was.'],
      advance: 'you ask for a production release',
    }),
    step({
      id: 'release-requested', actor: 'person', stage: refining,
      eyebrow: 'Production needs your authority', title: 'You ask to release',
      narrative: 'You explicitly ask for a release. That clears the permission blocker; a green preview or completed build never clears it by itself.',
      items: [
        {key: 'release', label: 'Release to production', state: 'actionable', detail: 'Your request authorizes this step.', changed: true},
        {key: 'validation', label: 'Record practitioner validation', state: 'blocked', detail: `${factClass}: still waiting on the named reviewer`},
      ],
      changes: ['The release item becomes actionable.', 'Your request is the authorization.'],
      advance: 'the agent runs the release checks',
    }),
    step({
      id: 'production-released', actor: 'agent', stage: refining,
      eyebrow: 'Release is explicit', title: 'Write production only after the request',
      narrative: 'Because you asked, the agent checks the committed source and build, then writes the production deployment and records exactly what was released.',
      items: [{key: 'validation', label: 'Record practitioner validation', state: 'blocked', detail: `${factClass}: still waiting on the named reviewer`}],
      flow: ['explicit request', 'committed source', 'build checks', 'production release', 'release record'],
      changes: ['Production changes only here.', 'The initiative records the deployed commit.'],
      advance: 'you decide whether the initiative should rest',
    }),
    step({
      id: 'goes-quiet', actor: 'person', stage: dormant,
      eyebrow: 'Resting is your choice', title: 'Choose to let it go quiet',
      narrative: 'If you do not want another round now, you can declare the initiative dormant. Its record and blocked validation stay intact, but sweeps stop selecting it.',
      items: [{key: 'validation', label: 'Record practitioner validation', state: 'blocked', detail: `${factClass}: still waiting on the named reviewer`}],
      changes: ['You choose the resting state.', 'Nothing is erased or called finished.'],
      advance: 'you may eventually archive the record',
    }),
    step({
      id: 'archived', actor: 'person', stage: archived,
      eyebrow: 'The record outlives the work', title: 'Archive without losing the reasoning',
      narrative: 'When the initiative no longer needs to return, you can archive it. The wish, decisions, alternatives, plans, and release history remain readable.',
      items: [],
      changes: ['The lifecycle reaches its final state.', 'The reasoning remains available to whoever comes next.'],
      advance: null,
    }),
  ];

  // The record only ever grows. `stage_documents` says what a stage *expects*,
  // and the quiet stages at the end expect nothing new — but a document written
  // at an earlier stage does not vanish when the work goes quiet, and showing it
  // vanish would contradict the whole reason the record is kept this way.
  const accumulated = ['wish.md'];
  for (const value of steps) {
    for (const name of value.documents) {
      if (!accumulated.includes(name)) accumulated.push(name);
    }
    value.documents = [...accumulated];
  }

  return {vocabulary, steps};
}

function simulatorHtml({steps, vocabulary, generatedDate, sha, repositoryUrl}) {
  const sources = SOURCE_PATHS.map(path => `<a data-source-path="${escapeHtml(path)}" href="${escapeHtml(`${repositoryUrl}/blob/${sha}/${path}`)}">${escapeHtml(path)}</a>`).join(' · ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SitePrep Repo Guide: lifecycle simulator</title>
  <style>
    :root {
      color-scheme: light; font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a2233; background: #fff;
      --ink: #1a2233; --muted: #5b6578; --line: #e1e5ec; --navy: #163a8f;
      --blue: #1e4bb8; --blue-soft: #e9effc; --orange: #ef6a3a;
      --amber: #c77700; --amber-soft: #fff5e5; --green: #2a8c5c; --green-soft: #e6f5ec;
      --violet: #7b5ea7; --doc: #e8ecf4;
    }
    * { box-sizing: border-box; }
    body { min-width: 320px; min-height: 100vh; margin: 0; background: #fff; }
    button { font: inherit; }
    .shell { width: min(1080px, calc(100% - 40px)); margin: 0 auto; padding: 28px 0 18px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 28px; padding: 8px 0 24px; }
    .eyebrow { margin: 0 0 7px; color: var(--muted); font-size: .74rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin: 0; color: var(--navy); font-size: clamp(2rem, 4.5vw, 3.45rem); line-height: 1.02; letter-spacing: -.035em; }
    .step-number { color: var(--muted); font-size: .8rem; font-weight: 700; white-space: nowrap; text-align: right; }
    .lifecycle { position: sticky; top: 0; z-index: 10; margin: 0 -12px; padding: 12px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: #fffffff2; backdrop-filter: blur(12px); }
    .stage-track { display: flex; gap: 18px; overflow-x: auto; padding: 2px 2px 8px; }
    .stage { position: relative; flex: 1 0 max-content; min-width: 94px; padding: 7px 10px; border: 1px solid #d7dce6; border-radius: 17px; color: var(--muted); background: #f4f6fa; font-size: .72rem; font-weight: 800; text-align: center; transition: background 320ms ease, color 320ms ease, border-color 320ms ease; }
    .stage:not(:first-child)::before { content: '→'; position: absolute; right: calc(100% + 5px); color: #9aa4b8; }
    .stage.complete { color: #1c5f3f; border-color: #a8d3ba; background: var(--green-soft); }
    .stage.current { color: white; border-color: var(--blue); background: var(--blue); }
    .stage.current[data-changed="true"] { border-color: var(--orange); background: var(--orange); }
    .top-record { display: flex; align-items: center; gap: 6px; min-height: 27px; padding: 2px 3px 0; overflow-x: auto; }
    .top-record h3 { flex: 0 0 auto; margin-right: 4px; color: var(--muted); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
    .simulator { min-height: 530px; border-bottom: 1px solid var(--line); background: white; }
    .story { position: relative; padding: 30px 36px 26px; border-bottom: 1px solid var(--line); border-left: 6px solid var(--blue); background: #fff; }
    body[data-actor="person"] .story { border-left-color: var(--amber); background: linear-gradient(90deg, var(--amber-soft), #fff 30%); }
    body[data-actor="agent"] .story { border-left-color: var(--blue); background: linear-gradient(90deg, var(--blue-soft), #fff 30%); }
    .actor-badge { position: absolute; top: 28px; right: 34px; padding: 5px 10px; border-radius: 999px; color: var(--blue); background: var(--blue-soft); font-size: .72rem; font-weight: 850; text-transform: uppercase; }
    body[data-actor="person"] .actor-badge { color: #7a4a00; background: var(--amber-soft); }
    h2 { max-width: 760px; margin: 0; padding-right: 110px; color: var(--ink); font-size: clamp(1.65rem, 3.2vw, 2.65rem); line-height: 1.08; letter-spacing: -.035em; text-wrap: balance; }
    #narrative { max-width: 78ch; margin: 16px 0; color: #3a455b; font-size: 1rem; }
    .changes { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 0; padding: 0; list-style: none; }
    .changes li { display: flex; gap: 8px; align-items: start; color: var(--muted); font-size: .88rem; }
    .changes li::before { content: '→'; color: var(--blue); font-weight: 900; }
    body[data-actor="person"] .changes li::before { color: var(--amber); }
    .fork, .digest { display: none; max-width: 780px; margin: 16px 0 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: #fbfcfe; }
    .fork[data-visible="true"], .digest[data-visible="true"] { display: block; }
    .fork strong, .digest strong { display: block; margin-bottom: 7px; color: var(--muted); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
    .fork-options { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
    .fork-option { padding: 6px 10px; border: 1px solid #a8bce8; border-radius: 8px; color: var(--navy); background: var(--blue-soft); font-size: .82rem; font-weight: 750; }
    .fork-or { color: var(--muted); font-size: .78rem; font-weight: 800; text-transform: uppercase; }
    .digest { border-color: #e7c27d; background: var(--amber-soft); }
    .digest-change { color: #7a4a00; font-size: .78rem; font-weight: 750; }
    .digest-line { margin-top: 5px; padding: 6px 9px; border-left: 3px solid var(--amber); background: white; color: #5c451d; font-size: .82rem; }
    .board { display: grid; gap: 18px; padding: 24px 36px 30px; background: #fbfcfe; }
    .board-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .stage-badge { padding: 6px 10px; border-radius: 999px; color: var(--navy); background: var(--blue-soft); font-size: .75rem; font-weight: 850; text-transform: uppercase; transition: background 320ms ease, color 320ms ease; }
    .stage-badge[data-changed="true"] { color: white; background: var(--orange); animation: pulse-stage 900ms ease-out; }
    @keyframes pulse-stage { 0% { box-shadow: 0 0 0 0 #ef6a3a66; } 70% { box-shadow: 0 0 0 12px #ef6a3a00; } 100% { box-shadow: 0 0 0 0 #ef6a3a00; } }
    h3 { margin: 0; color: var(--ink); font-size: .92rem; }
    .muted { color: var(--muted); font-size: .78rem; font-weight: 700; }
    .flow-section { display: none; }
    .flow-section[data-visible="true"] { display: block; }
    .flow { display: flex; gap: 18px; margin-top: 9px; overflow-x: auto; padding: 2px 2px 6px; }
    .flow-step { position: relative; flex: 0 0 auto; padding: 7px 10px; border: 1px solid #a8bce8; border-radius: 8px; color: var(--navy); background: var(--blue-soft); font-size: .78rem; font-weight: 750; }
    .flow-step[data-actor="person"] { border-color: #e7c27d; color: #7a4a00; background: var(--amber-soft); }
    .flow-step:not(:first-child)::before { content: '→'; position: absolute; right: calc(100% + 5px); color: #8792a8; }
    #items { display: grid; align-content: start; gap: 9px; }
    #items:empty { align-content: center; justify-items: center; }
    #items:empty::after { content: 'Nothing left to do.'; color: #97a1b5; font-size: .9rem; font-style: italic; }
    .item { position: relative; overflow: hidden; padding: 13px 16px 12px 20px; border: 1px solid #d8deea; border-radius: 10px; background: white; transition: background 320ms ease, border-color 320ms ease, opacity 320ms ease; }
    .item::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 6px; border-radius: 14px 0 0 14px; background: #7b8ba9; transition: background 320ms ease; }
    .item strong { display: block; color: #22355b; font-size: .95rem; }
    .item span { display: block; margin-top: 3px; color: #68738a; font-size: .79rem; }
    .item[data-item-state="blocked"]::before { background: var(--amber); }
    .item[data-item-state="blocked"] { background: var(--amber-soft); }
    .item[data-item-state="in-flight"]::before { background: var(--blue); }
    .item[data-item-state="review"]::before { background: var(--violet); }
    .item[data-item-state="review"] { background: #f8f4fd; }
    .item[data-item-state="passed"]::before { background: #8c6c9b; }
    .item[data-item-state="passed"] { opacity: .6; }
    .item[data-item-state="actionable"]::before { background: var(--green); }
    /* Entering, leaving, and changing are the whole point: an item that just
       appeared in place would read as a new screen rather than a consequence. */
    .item[data-entering="true"] { opacity: 0; transform: translateY(10px); }
    .item[data-exiting="true"] { max-height: 0 !important; margin-top: -9px; padding-top: 0; padding-bottom: 0; border-width: 0; opacity: 0; transform: translateX(26px); transition: all 380ms cubic-bezier(.4,0,1,.6); }
    .item[data-changed="true"] { animation: pulse 780ms ease-out; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 #1e4bb855; } 70% { box-shadow: 0 0 0 11px #1e4bb800; } 100% { box-shadow: none; } }
    .document { flex: 0 0 auto; padding: 4px 8px; border-radius: 5px; color: #45536f; background: var(--doc); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .69rem; font-weight: 650; animation: settle 420ms ease-out; }
    @keyframes settle { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
    .phases { padding-top: 16px; border-top: 1px solid var(--line); }
    .phase-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .phase-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .phase { padding: 5px 8px; border-radius: 7px; color: #6c7484; background: #e8ebf1; font-size: .7rem; font-weight: 800; transition: background 300ms ease, color 300ms ease; }
    .phase.active { color: white; background: var(--orange); }
    .phase.complete { color: #1c5f3f; background: var(--green-soft); }
    .meter { display: flex; gap: 5px; margin-top: 9px; }
    .slot { flex: 1; height: 9px; border: 1px solid #ccd5e6; border-radius: 4px; background: #eef1f8; transition: background 300ms ease, border-color 300ms ease; }
    .slot[data-spent="true"] { border-color: var(--blue); background: var(--blue); }
    .controls { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 0 4px; flex-wrap: wrap; }
    .controls button { min-width: 100px; min-height: 44px; padding: 0 16px; border: 1px solid #bdc8dc; border-radius: 11px; color: #263b65; background: white; font-weight: 800; cursor: pointer; }
    .controls button.primary { color: white; border-color: var(--blue); background: var(--blue); }
    .controls button:disabled { opacity: .42; cursor: default; }
    .progress { min-width: 78px; color: #61708b; font-weight: 780; text-align: center; font-variant-numeric: tabular-nums; }
    #next-label { flex: 0 0 100%; margin: 2px 0 0; color: #6b7691; font-size: .8rem; text-align: center; }
    footer { display: flex; justify-content: space-between; gap: 18px; padding: 16px 0 0; color: var(--muted); font-size: .72rem; }
    footer a { color: var(--blue); }
    @media (max-width: 760px) { .shell { width: min(100% - 24px, 1080px); } .story, .board { padding: 24px 20px; } .actor-badge { position: static; display: inline-block; margin-bottom: 10px; } h2 { padding-right: 0; } header { align-items: start; flex-direction: column; gap: 10px; } .step-number { text-align: left; } footer { flex-direction: column; } }
    @media (prefers-reduced-motion: reduce) { * { animation-duration: 1ms !important; transition-duration: 1ms !important; } }
  </style>
</head>
<body data-source-sha="${escapeHtml(sha)}" data-generated-date="${escapeHtml(generatedDate)}">
  <div class="shell">
    <header>
      <div><p class="eyebrow">Repo guide · generated from the repository</p><h1>SitePrep Repo Guide: lifecycle simulator</h1></div>
      <span class="step-number">Made-up initiative · real vocabulary<br>Every stage, start to finish</span>
    </header>
    <div class="lifecycle">
      <nav id="stage-track" class="stage-track" aria-label="Lifecycle stages"></nav>
      <div class="top-record"><h3>Documents so far</h3><div id="documents" style="display:contents"></div></div>
    </div>
    <main class="simulator">
      <section class="story" aria-live="polite">
        <span id="actor" class="actor-badge"></span>
        <p id="step-eyebrow" class="eyebrow"></p>
        <h2 id="step-title"></h2>
        <p id="narrative"></p>
        <ul id="changes" class="changes"></ul>
        <div id="fork" class="fork"><strong>Optional fork</strong><div id="fork-options" class="fork-options"></div></div>
        <div id="digest" class="digest"><strong>Digest</strong><div id="digest-content"></div></div>
      </section>
      <section class="board">
        <div class="board-heading"><h3>Initiative state</h3><span id="current-stage" class="stage-badge"></span></div>
        <div id="flow-section" class="flow-section"><h3>Work trail</h3><div id="flow" class="flow"></div></div>
        <div id="items"></div>
        <div class="phases">
          <div class="phase-head"><h3>Sweep phases</h3><span id="budget-label" class="muted"></span></div>
          <div id="phase-row" class="phase-row"></div>
          <div id="meter" class="meter" aria-hidden="true"></div>
        </div>
      </section>
    </main>
    <nav class="controls" aria-label="Simulator controls">
      <button id="back" type="button">← Back</button>
      <span id="progress" class="progress">1 / ${steps.length}</span>
      <button id="step" class="primary" type="button">Step →</button>
      <button id="play" type="button">Play</button>
      <p id="next-label"></p>
    </nav>
    <footer><span>Generated ${escapeHtml(generatedDate)} from ${escapeHtml(sha)}</span><span>Vocabulary sources: ${sources}</span></footer>
  </div>
  <script id="simulator-data" type="application/json">${embeddedJson({steps, vocabulary})}</script>
  <script>
    (() => {
      'use strict';
      const data = JSON.parse(document.querySelector('#simulator-data').textContent);
      const ids = ['stage-track','step-eyebrow','step-title','narrative','changes','current-stage','actor','fork','fork-options','digest','digest-content','flow-section','flow','items','documents','phase-row','meter','budget-label','back','step','play','progress','next-label'];
      const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const EXIT_MS = reduceMotion ? 0 : 380;
      let current = 0;
      let playTimer = null;
      let beatTimers = [];
      const visited = [0];

      function node(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (value !== undefined) element.textContent = value;
        return element;
      }

      function renderStages(stage, changed) {
        const currentIndex = data.vocabulary.stages.indexOf(stage);
        elements['stage-track'].replaceChildren(...data.vocabulary.stages.map((value, index) => {
          const item = node('span', 'stage ' + (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'future'), value);
          item.dataset.stage = value;
          if (index === currentIndex && changed) item.dataset.changed = 'true';
          return item;
        }));
      }

      // A step's stage either differs from the one before it or does not, so
      // the highlight is a property of where you are rather than of how you
      // got there: stepping back onto a move shows it the same way stepping
      // forward onto it did.
      function stageChangedAt(index) {
        const previous = data.steps[index - 1];
        return Boolean(previous) && previous.stage !== data.steps[index].stage;
      }

      function renderStageBadge(stage, changed, {animate}) {
        elements['current-stage'].textContent = stage;
        elements['current-stage'].removeAttribute('data-changed');
        if (!changed) return;
        if (animate) void elements['current-stage'].offsetWidth;
        elements['current-stage'].dataset.changed = 'true';
      }

      function buildItem(item) {
        const card = node('article', 'item');
        card.dataset.key = item.key;
        card.append(node('strong', '', item.label), node('span', '', item.detail));
        return card;
      }

      // Keyed reconciliation. An item that survives a step is the same element,
      // so the reader watches it change instead of watching a list get replaced.
      function renderItems(items, {animate}) {
        const container = elements.items;
        const existing = new Map();
        for (const child of [...container.children]) {
          if (child.dataset.exiting === 'true') { child.remove(); continue; }
          existing.set(child.dataset.key, child);
        }
        const firstTops = new Map();
        for (const [key, child] of existing) firstTops.set(key, child.getBoundingClientRect().top);

        const wanted = new Set(items.map(item => item.key));
        for (const [key, child] of existing) {
          if (wanted.has(key)) continue;
          if (!animate) { child.remove(); continue; }
          child.style.maxHeight = child.getBoundingClientRect().height + 'px';
          child.dataset.exiting = 'true';
          window.setTimeout(() => child.remove(), EXIT_MS);
        }

        const ordered = [];
        for (const item of items) {
          let card = existing.get(item.key);
          const isNew = !card;
          if (isNew) card = buildItem(item);
          card.querySelector('strong').textContent = item.label;
          card.querySelector('span').textContent = item.detail;
          card.dataset.itemState = item.state;
          if (item.changed && animate) {
            card.removeAttribute('data-changed');
            void card.offsetWidth;
            card.dataset.changed = 'true';
          } else if (!item.changed) {
            card.removeAttribute('data-changed');
          }
          if (isNew && animate) {
            card.dataset.entering = 'true';
            window.requestAnimationFrame(() => {
              card.style.transition = 'opacity 320ms ease, transform 320ms cubic-bezier(.2,.7,.3,1)';
              card.removeAttribute('data-entering');
            });
          }
          ordered.push(card);
        }
        for (const card of ordered) container.append(card);

        if (!animate) return;
        // Anything that moved because a neighbour left slides to its new place
        // rather than jumping there.
        window.requestAnimationFrame(() => {
          for (const card of ordered) {
            const from = firstTops.get(card.dataset.key);
            if (from === undefined) continue;
            const delta = from - card.getBoundingClientRect().top;
            if (Math.abs(delta) < 1) continue;
            card.style.transition = 'none';
            card.style.transform = 'translateY(' + delta + 'px)';
            window.requestAnimationFrame(() => {
              card.style.transition = 'transform 380ms cubic-bezier(.2,.7,.3,1)';
              card.style.transform = '';
            });
          }
        });
      }

      function renderPhases(phases) {
        elements['phase-row'].replaceChildren(...data.vocabulary.phases.map(value => {
          const phase = node('span', 'phase ' + phases[value], value);
          phase.dataset.phase = value;
          phase.dataset.phaseState = phases[value];
          return phase;
        }));
      }

      function renderBudget(budget) {
        const slots = [];
        for (let index = 0; index < budget.of; index += 1) {
          const slot = node('span', 'slot');
          slot.dataset.spent = String(index < budget.spent);
          slots.push(slot);
        }
        elements.meter.replaceChildren(...slots);
        elements['budget-label'].textContent = budget.spent + ' of ' + budget.of + ' items spent';
      }

      function renderDocuments(documents) {
        if (documents.length === 0) {
          elements.documents.replaceChildren(node('span', 'muted', 'Nothing written down yet beyond the wish.'));
          return;
        }
        elements.documents.replaceChildren(...documents.map(name => node('span', 'document', name)));
      }

      function renderFork(options) {
        elements.fork.dataset.visible = String(Boolean(options?.length));
        if (!options?.length) { elements['fork-options'].replaceChildren(); return; }
        const children = [];
        options.forEach((option, index) => {
          if (index) children.push(node('span', 'fork-or', 'or'));
          children.push(node('span', 'fork-option', option));
        });
        elements['fork-options'].replaceChildren(...children);
      }

      function renderDigest(digest) {
        elements.digest.dataset.visible = String(Boolean(digest));
        if (!digest) { elements['digest-content'].replaceChildren(); return; }
        const labels = {
          added: 'A line was added for you',
          present: 'This line is still waiting',
          removed: 'Your answer removed the line',
        };
        const children = [node('span', 'digest-change', labels[digest.change] || digest.change)];
        for (const line of digest.lines) children.push(node('div', 'digest-line', line));
        elements['digest-content'].replaceChildren(...children);
      }

      function renderFlow(flow) {
        elements['flow-section'].dataset.visible = String(Boolean(flow?.length));
        if (!flow?.length) { elements.flow.replaceChildren(); return; }
        elements.flow.replaceChildren(...flow.map(value => {
          const item = node('span', 'flow-step', value);
          item.dataset.actor = /^you\b/i.test(value) || /explicit request/i.test(value) ? 'person' : 'agent';
          return item;
        }));
      }

      function clearBeats() {
        for (const timer of beatTimers) window.clearTimeout(timer);
        beatTimers = [];
      }

      function applyBeat(beat, {animate}) {
        if (beat.items) renderItems(beat.items, {animate});
        if (beat.phases) renderPhases(beat.phases);
        if (beat.budget) renderBudget(beat.budget);
      }

      function show(index, {animate = true} = {}) {
        clearBeats();
        current = Math.max(0, Math.min(data.steps.length - 1, index));
        const state = data.steps[current];
        document.body.dataset.step = state.id;
        document.body.dataset.stage = state.stage;
        document.body.dataset.actor = state.actor;
        const stageChanged = stageChangedAt(current);
        document.body.dataset.stageChanged = String(stageChanged);
        renderStages(state.stage, stageChanged);
        elements['step-eyebrow'].textContent = state.eyebrow;
        elements['step-title'].textContent = state.title;
        elements.narrative.textContent = state.narrative;
        elements.actor.textContent = state.actor === 'person' ? 'You · person' : 'Agent';
        renderStageBadge(state.stage, stageChanged, {animate});
        elements.changes.replaceChildren(...state.changes.map(value => node('li', '', value)));
        renderDocuments(state.documents);
        renderFork(state.fork);
        renderDigest(state.digest);
        renderFlow(state.flow);
        renderItems(state.items, {animate});
        renderPhases(state.phases);
        renderBudget(state.budget);

        if (state.beats && animate && !reduceMotion) {
          for (const beat of state.beats) {
            if (beat.at === 0) { applyBeat(beat, {animate: true}); continue; }
            beatTimers.push(window.setTimeout(() => applyBeat(beat, {animate: true}), beat.at));
          }
        } else if (state.beats) {
          applyBeat(state.beats[state.beats.length - 1], {animate: false});
        }

        elements.progress.textContent = (current + 1) + ' / ' + data.steps.length;
        elements.back.disabled = current === 0;
        elements.step.disabled = current === data.steps.length - 1;
        elements['next-label'].textContent = state.advance ? 'Next: ' + state.advance : 'That is the complete lifecycle, start to finish.';
        if (visited.at(-1) !== current) visited.push(current);
      }

      // Jump a step straight to its finished state: used when navigating away
      // mid-choreography, and by the tests, which cannot wait on wall time.
      function settle() {
        clearBeats();
        const state = data.steps[current];
        if (state.beats) applyBeat(state.beats[state.beats.length - 1], {animate: false});
      }

      function stop() {
        if (playTimer) window.clearTimeout(playTimer);
        playTimer = null;
        elements.play.textContent = 'Play';
        elements.play.setAttribute('aria-pressed', 'false');
      }

      function stepDuration(index) {
        const state = data.steps[index];
        const beatTime = state.beats ? state.beats[state.beats.length - 1].at : 0;
        // Long enough to read the narrative, plus whatever the step animates.
        return 2600 + beatTime + Math.min(2600, state.narrative.length * 12);
      }

      function play() {
        if (playTimer) { stop(); return; }
        if (current === data.steps.length - 1) { visited.length = 0; show(0); }
        elements.play.textContent = 'Pause';
        elements.play.setAttribute('aria-pressed', 'true');
        const advance = () => {
          if (current >= data.steps.length - 1) { stop(); return; }
          show(current + 1);
          if (current >= data.steps.length - 1) { stop(); return; }
          playTimer = window.setTimeout(advance, stepDuration(current));
        };
        playTimer = window.setTimeout(advance, stepDuration(current));
      }

      elements.back.addEventListener('click', () => { stop(); show(current - 1); });
      elements.step.addEventListener('click', () => { stop(); show(current + 1); });
      elements.play.addEventListener('click', play);
      document.addEventListener('keydown', event => {
        if (['ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); stop(); show(current + 1); }
        else if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); stop(); show(current - 1); }
      });

      window.simulatorState = {
        current: () => current,
        count: data.steps.length,
        indexOf: id => data.steps.findIndex(step => step.id === id),
        show,
        settle,
        play,
        stop,
        playing: () => playTimer !== null,
        visited: () => [...visited],
        vocabulary: data.vocabulary,
      };
      show(0, {animate: false});
    })();
  </script>
</body>
</html>\n`;
}

export async function generateSimulator({root, outputPath, now = new Date(), sha, repositoryUrl, factOverrides = {}, dating} = {}) {
  if (!root || !outputPath) throw new Error('root and outputPath are required');
  const facts = await resolveRepositoryFactKeys(root, SIMULATOR_FACT_KEYS, factOverrides);
  const {steps, vocabulary} = buildSimulatorSteps(facts);
  const resolvedSha = sha || await gitValue(root, ['rev-parse', '--short=12', 'HEAD']);
  const resolvedRepository = repositoryUrl || normaliseRepositoryUrl(await gitValue(root, ['remote', 'get-url', 'origin']));
  const generatedDate = new Date(now).toISOString().slice(0, 10);
  const resolvedDating = dating || await resolveDating({root});
  for (const path of SOURCE_PATHS) await access(resolve(root, path));
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, simulatorHtml({steps, vocabulary, generatedDate, sha: resolvedSha, repositoryUrl: resolvedRepository}), 'utf8');
  return {
    output: outputPath,
    generated_date: generatedDate,
    sha: resolvedSha,
    steps: steps.length,
    stages_visited: [...new Set(steps.map(step => step.stage))],
    vocabulary,
    source_paths: SOURCE_PATHS,
    dating: {simulator: resolvedDating.simulator, diagnostics: resolvedDating.diagnostics},
  };
}

export async function runSimulatorBrowserChecks({root, outputPath} = {}) {
  const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const playwright = resolve(root, 'node_modules', '.bin', 'playwright');
  const config = resolve(guideRoot, 'test', 'simulator.playwright.config.mjs');
  const {stdout, stderr} = await execFile(playwright, ['test', '--config', config], {
    cwd: root,
    env: {...process.env, GUIDE_REPO_ROOT: root, GUIDE_SIMULATOR_PATH: outputPath},
  });
  return {stdout, stderr};
}
