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
      id: 'wish-written',
      stage: wish,
      eyebrow: 'A durable intent appears',
      title: 'Start with the wish',
      narrative: 'Somebody writes down what they want, in their own words, and nothing else happens yet. The record exists before any of the work does.',
      items: [
        {key: 'objectives', label: 'Draft objectives', state: 'actionable', detail: 'The only move available.'},
      ],
      changes: ['One initiative enters the lifecycle.', 'The original wording becomes the record of intent.'],
      advance: 'an agent drafts objectives',
    }),
    step({
      id: 'objectives-drafted',
      stage: shaped,
      eyebrow: 'The outcome becomes testable',
      title: 'Say what done would mean',
      narrative: 'Objectives turn a want into something you could check. The stage advances, the record gains its first document, and the backlog gains real next moves.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Ready to work.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'A judgement call, not yet named as one.'},
      ],
      changes: ['The stage advances.', 'The first document joins the record.'],
      advance: 'the agent hits a question it cannot answer',
    }),
    step({
      id: 'blocker-named',
      stage: shaped,
      eyebrow: 'A person is required',
      title: 'Name the blocker honestly',
      narrative: 'The interaction question cannot be settled from anything in the repository. Rather than guessing, the item says so and stops — and the digest carries it to a person.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Still available to work.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: pick the trade-off`},
      ],
      phases: phaseStatus(firstPhase),
      changes: [`The blocker class is ${proposable}.`, 'A guess would have become history; a label does not.'],
      advance: 'a bounded sweep runs',
    }),
    step({
      id: 'sweep-runs',
      stage: shaped,
      eyebrow: 'A bounded sweep runs',
      title: 'Finish what fits',
      narrative: `Watch the allowance. The run works through its phases in order and spends at most ${budget} items; when the allowance is gone, the next item is passed over rather than squeezed in.`,
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Waiting for the run to reach it.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
        {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Also available.'},
      ],
      changes: ['Earlier phases spend the allowance first.', 'The budget is a boundary, not a suggestion.'],
      advance: 'the person answers the question',
      // The moment worth watching, choreographed rather than presented finished.
      beats: [
        {
          at: 0,
          phases: phaseStatus(firstPhase),
          budget: {spent: 0, of: budget},
        },
        {
          at: 900,
          phases: phaseStatus(respondPhase, [firstPhase]),
          budget: {spent: Math.max(1, budget - 3), of: budget},
          items: [
            {key: 'spec', label: 'Draft the specification', state: 'actionable', detail: 'Waiting for the run to reach it.'},
            {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
            {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Also available.'},
          ],
        },
        {
          at: 1800,
          phases: phaseStatus(workPhase, phases.filter(phase => phase !== workPhase)),
          budget: {spent: budget - 1, of: budget},
          items: [
            {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'A pull request is open.'},
            {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
            {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Next in the ranking.'},
          ],
        },
        {
          at: 2700,
          phases: allComplete,
          budget: {spent: budget, of: budget},
          items: [
            {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'A pull request is open.'},
            {key: 'interaction', label: 'Choose the interaction', state: 'blocked', detail: `${proposable}: still waiting`},
            {key: 'increment', label: 'Build the first increment', state: 'passed', detail: `Passed over at ${budget}/${budget}.`},
          ],
        },
      ],
    }),
    step({
      id: 'answer-recorded',
      stage: shaped,
      eyebrow: 'The decision arrives',
      title: 'Clear the blocker',
      narrative: 'The person answers, and the answer is written down with its reasoning and with what it leaves open. The amber goes away without anybody rewriting the original wish.',
      items: [
        {key: 'spec', label: 'Draft the specification', state: 'in-flight', detail: 'Review continues in its pull request.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'The recorded answer makes this doable.', changed: true},
        {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Waiting for the next run.'},
      ],
      phases: allComplete,
      budget: {spent: budget, of: budget},
      changes: ['The decision becomes durable.', 'The formerly blocked item rejoins the queue.'],
      advance: 'the specification merges',
    }),
    step({
      id: 'spec-merged',
      stage: specified,
      eyebrow: 'A merge changes the state',
      title: 'Let completion cascade',
      narrative: 'The merge is the event that makes proposed work real. The finished item leaves the list, the record gains a document, and the stage advances.',
      items: [
        {key: 'plan', label: 'Plan the build', state: 'actionable', detail: 'Unblocked by the merged specification.', changed: true},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'Ready for a later run.'},
        {key: 'increment', label: 'Build the first increment', state: 'actionable', detail: 'Waiting for the next run.'},
      ],
      changes: ['The completed item disappears.', 'A dependent unblocks.', 'The stage advances.'],
      advance: 'an assumption turns out to be wrong',
    }),
    step({
      id: 'assumption-breaks',
      stage: shaped,
      eyebrow: 'The lifecycle runs backwards too',
      title: 'Move back when the reasoning changes',
      narrative: 'Something in the specification turns out not to hold. The stage moves back rather than pretending the work is further along than it is — that is the honest state, and it is a supported move, not a failure.',
      items: [
        {key: 'spec-revision', label: 'Revise the specification', state: 'actionable', detail: 'The rejected alternative looks better now.'},
        {key: 'interaction', label: 'Choose the interaction', state: 'actionable', detail: 'Unaffected by the revision.'},
      ],
      changes: ['The stage moves back.', 'Nothing is deleted; the reasoning is amended.'],
      advance: 'the revision lands',
    }),
    step({
      id: 'plan-written',
      stage: planned,
      eyebrow: 'The build gets a sequence',
      title: 'Plan it before building it',
      narrative: 'A plan cuts the work into increments small enough to review, each with the tests that would show it works. The record now carries purpose, outcomes, a chosen shape, and an order.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'actionable', detail: 'First in the sequence.'},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      changes: ['The plan and its tests join the record.', 'Work is now ordered rather than merely listed.'],
      advance: 'a run opens the first increment',
    }),
    step({
      id: 'increment-open',
      stage: building,
      eyebrow: 'Work becomes reviewable',
      title: 'One increment at a time',
      narrative: 'An agent builds the first increment and opens a pull request. It does not merge it. From here the initiative is visibly in flight, and a person can see exactly what is being proposed.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'in-flight', detail: 'A pull request is open for review.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      phases: phaseStatus(workPhase, phases.filter(phase => phase !== workPhase)),
      budget: {spent: 1, of: budget},
      changes: ['The stage advances.', 'A proposal exists; nothing is merged.'],
      advance: 'a reviewer comments',
    }),
    step({
      id: 'review-returns',
      stage: building,
      eyebrow: 'Feedback comes back first',
      title: 'Answer review before starting anything',
      narrative: 'A reviewer leaves comments. On the next run, answering them outranks opening anything new — which is why a run that spends everything on feedback and starts nothing is working correctly.',
      items: [
        {key: 'increment-one', label: 'Build increment one', state: 'review', detail: 'Review comments waiting for an answer.', changed: true},
        {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
      ],
      changes: ['Finishing outranks starting.', 'The agent replies; it never resolves the thread itself.'],
      advance: 'the reviewer merges',
      beats: [
        {
          at: 0,
          phases: phaseStatus(firstPhase),
          budget: {spent: 0, of: budget},
        },
        {
          at: 1000,
          phases: phaseStatus(respondPhase, [firstPhase]),
          budget: {spent: 1, of: budget},
          items: [
            {key: 'increment-one', label: 'Build increment one', state: 'in-flight', detail: 'Answered, and back with the reviewer.', changed: true},
            {key: 'increment-two', label: 'Build increment two', state: 'blocked', detail: 'todo: waits for increment one'},
          ],
        },
      ],
    }),
    step({
      id: 'increment-merged',
      stage: building,
      eyebrow: 'A merge unblocks the next thing',
      title: 'Completion cascades again',
      narrative: 'The reviewer merges. The finished increment leaves the list and the one that was waiting on it becomes actionable — the same cascade as before, now inside the build.',
      items: [
        {key: 'increment-two', label: 'Build increment two', state: 'actionable', detail: 'Unblocked by the merge.', changed: true},
      ],
      changes: ['The merged item disappears.', 'Its dependent becomes actionable.'],
      advance: 'the build finishes and produces something',
    }),
    step({
      id: 'outputs-registered',
      stage: refining,
      eyebrow: 'The work produces something',
      title: 'Register what it made',
      narrative: 'The build is done and the initiative records pointers to what came out of it. What is left is smaller: polish, follow-ups, the things worth doing but not worth blocking on.',
      items: [
        {key: 'polish', label: 'Tidy the rough edges', state: 'actionable', detail: 'Worth doing, not worth blocking on.'},
        {key: 'follow-up', label: 'Extend the output', state: 'blocked', detail: `${factClass}: needs a number only the person has`},
      ],
      changes: ['The stage advances.', 'Outputs are registered on the initiative.'],
      advance: 'nothing actionable is left',
    }),
    step({
      id: 'goes-quiet',
      stage: dormant,
      eyebrow: 'Resting is a supported state',
      title: 'Let it go quiet',
      narrative: 'Nobody needs the next version right now, and the one blocked item needs a fact nobody has supplied. The initiative rests. It is not abandoned and it is not finished — those would both be lies.',
      items: [
        {key: 'follow-up', label: 'Extend the output', state: 'blocked', detail: `${factClass}: still waiting on a person`},
      ],
      changes: ['The stage moves to rest.', 'Sweeps stop selecting it; the record stays intact.'],
      advance: 'the record is closed out',
    }),
    step({
      id: 'archived',
      stage: archived,
      eyebrow: 'The record outlives the work',
      title: 'Close it without losing it',
      narrative: 'Eventually the initiative is closed out. Everything stays readable: the original wish, what done was going to mean, the alternatives that lost, and why it stopped. That is the whole point of keeping the record this way.',
      items: [],
      changes: ['The lifecycle reaches its last stage.', 'The reasoning remains legible to whoever reads it next.'],
      advance: null,
    }),
  ];

  // The record only ever grows. `stage_documents` says what a stage *expects*,
  // and the quiet stages at the end expect nothing new — but a document written
  // at an earlier stage does not vanish when the work goes quiet, and showing it
  // vanish would contradict the whole reason the record is kept this way.
  const accumulated = [];
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
  <title>How an initiative moves</title>
  <style>
    :root { color-scheme: light; font: 16px/1.45 ui-sans-serif, system-ui, sans-serif; color: #17233d; background: #eef2f8; --navy: #132b59; --blue: #2e5fc4; --orange: #ef6a3a; --amber: #d59422; --green: #25805a; --violet: #7b5ea7; }
    * { box-sizing: border-box; }
    body { min-width: 320px; min-height: 100vh; margin: 0; background: radial-gradient(circle at 9% 8%, #dbe7ff 0, transparent 26%), #eef2f8; }
    button { font: inherit; }
    .shell { width: min(1220px, calc(100% - 28px)); margin: 0 auto; padding: 22px 0 16px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 28px; padding: 14px 4px 16px; }
    .eyebrow { margin: 0 0 5px; color: #5a6b8c; font-size: .75rem; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
    h1 { margin: 0; color: var(--navy); font-size: clamp(1.9rem, 4.4vw, 3.6rem); line-height: .98; letter-spacing: -.05em; }
    .step-number { color: #66738d; font-size: .82rem; font-weight: 750; white-space: nowrap; text-align: right; }
    .stage-track { display: flex; gap: 5px; overflow-x: auto; padding: 0 2px 14px; }
    .stage { flex: 1 0 max-content; min-width: 82px; padding: 7px 9px; border: 1px solid #cfd7e6; border-radius: 999px; color: #6a7488; background: #f8faff; font-size: .72rem; font-weight: 780; text-align: center; transition: background 320ms ease, color 320ms ease, border-color 320ms ease, box-shadow 320ms ease; }
    .stage.complete { color: #23664b; border-color: #8fc5ae; background: #e8f5ee; }
    .stage.current { color: white; border-color: var(--blue); background: var(--blue); box-shadow: 0 5px 14px #285abb3d; }
    .simulator { min-height: 560px; display: grid; grid-template-columns: minmax(0, .88fr) minmax(0, 1.12fr); border: 1px solid #d5ddeb; border-radius: 24px; overflow: hidden; background: white; box-shadow: 0 22px 60px #2231531f; }
    .story { display: flex; flex-direction: column; padding: 38px; color: white; background: linear-gradient(145deg, #132b59, #254f9d 72%, #315fb8); }
    .story .eyebrow { color: #bfcdf0; }
    h2 { max-width: 560px; margin: 0; font-size: clamp(1.9rem, 3.4vw, 3.3rem); line-height: 1.02; letter-spacing: -.045em; text-wrap: balance; }
    #narrative { max-width: 560px; margin: 20px 0; color: #e2e9fa; font-size: 1.02rem; }
    .changes { display: grid; gap: 8px; margin: auto 0 0; padding: 0; list-style: none; }
    .changes li { display: flex; gap: 9px; align-items: start; color: #d9e2f7; font-size: .95rem; }
    .changes li::before { content: '→'; color: #ff9b76; font-weight: 900; }
    .board { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: 16px; padding: 28px 30px; background: #f8f9fc; }
    .board-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .stage-badge { padding: 6px 10px; border-radius: 999px; color: #254f9d; background: #e6edff; font-size: .75rem; font-weight: 850; text-transform: uppercase; }
    h3 { margin: 0; color: #25365b; font-size: .95rem; }
    .muted { color: #7c869c; font-size: .78rem; font-weight: 700; }
    #items { display: grid; align-content: start; gap: 9px; }
    #items:empty { align-content: center; justify-items: center; }
    #items:empty::after { content: 'Nothing left to do.'; color: #97a1b5; font-size: .9rem; font-style: italic; }
    .item { position: relative; overflow: hidden; padding: 14px 16px 13px 20px; border: 1px solid #d8deea; border-radius: 14px; background: white; box-shadow: 0 6px 16px #2435590b; transition: background 320ms ease, border-color 320ms ease, opacity 320ms ease; }
    .item::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 6px; border-radius: 14px 0 0 14px; background: #7b8ba9; transition: background 320ms ease; }
    .item strong { display: block; color: #22355b; font-size: .95rem; }
    .item span { display: block; margin-top: 3px; color: #68738a; font-size: .79rem; }
    .item[data-item-state="blocked"]::before { background: var(--amber); }
    .item[data-item-state="blocked"] { background: #fffaf0; }
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
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 #2e5fc455; } 70% { box-shadow: 0 0 0 11px #2e5fc400; } 100% { box-shadow: 0 6px 16px #2435590b; } }
    .record { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-top: 14px; border-top: 1px solid #dbe1ec; }
    .record h3 { flex: 0 0 100%; margin-bottom: 3px; }
    .document { padding: 4px 9px; border-radius: 6px; color: #4a5a7c; background: #e9edf6; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .72rem; font-weight: 600; animation: settle 420ms ease-out; }
    .record .muted { flex: 0 0 100%; font-style: italic; }
    @keyframes settle { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
    .phases { padding-top: 14px; border-top: 1px solid #dbe1ec; }
    .phase-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .phase-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .phase { padding: 5px 8px; border-radius: 7px; color: #6c7484; background: #e8ebf1; font-size: .7rem; font-weight: 800; transition: background 300ms ease, color 300ms ease; }
    .phase.active { color: white; background: var(--orange); }
    .phase.complete { color: #23664b; background: #dff2e8; }
    .meter { display: flex; gap: 5px; margin-top: 9px; }
    .slot { flex: 1; height: 9px; border: 1px solid #ccd5e6; border-radius: 4px; background: #eef1f8; transition: background 300ms ease, border-color 300ms ease; }
    .slot[data-spent="true"] { border-color: var(--blue); background: var(--blue); }
    .controls { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 0 4px; flex-wrap: wrap; }
    .controls button { min-width: 100px; min-height: 44px; padding: 0 16px; border: 1px solid #bdc8dc; border-radius: 11px; color: #263b65; background: white; font-weight: 800; cursor: pointer; }
    .controls button.primary { color: white; border-color: var(--blue); background: var(--blue); }
    .controls button:disabled { opacity: .42; cursor: default; }
    .progress { min-width: 78px; color: #61708b; font-weight: 780; text-align: center; font-variant-numeric: tabular-nums; }
    #next-label { flex: 0 0 100%; margin: 2px 0 0; color: #6b7691; font-size: .8rem; text-align: center; }
    footer { display: flex; justify-content: space-between; gap: 18px; padding: 13px 4px 0; color: #6a7488; font-size: .72rem; }
    footer a { color: #365da8; }
    @media (max-width: 860px) { .simulator { grid-template-columns: 1fr; } .story { min-height: 340px; padding: 26px; } .board { padding: 22px; } header { align-items: start; flex-direction: column; gap: 10px; } .step-number { text-align: left; } footer { flex-direction: column; } }
    @media (prefers-reduced-motion: reduce) { * { animation-duration: 1ms !important; transition-duration: 1ms !important; } }
  </style>
</head>
<body data-source-sha="${escapeHtml(sha)}" data-generated-date="${escapeHtml(generatedDate)}">
  <div class="shell">
    <header>
      <div><p class="eyebrow">Repository lifecycle simulator</p><h1>How an initiative moves</h1></div>
      <span class="step-number">Abstract behaviour · live vocabulary<br>Every stage, start to finish</span>
    </header>
    <nav id="stage-track" class="stage-track" aria-label="Lifecycle stages"></nav>
    <main class="simulator">
      <section class="story" aria-live="polite">
        <p id="step-eyebrow" class="eyebrow"></p>
        <h2 id="step-title"></h2>
        <p id="narrative"></p>
        <ul id="changes" class="changes"></ul>
      </section>
      <section class="board">
        <div class="board-heading"><h3>Initiative state</h3><span id="current-stage" class="stage-badge"></span></div>
        <div id="items"></div>
        <div class="record"><h3>The record so far</h3><div id="documents" class="record-documents" style="display:contents"></div></div>
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
      const ids = ['stage-track','step-eyebrow','step-title','narrative','changes','current-stage','items','documents','phase-row','meter','budget-label','back','step','play','progress','next-label'];
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

      function renderStages(stage) {
        const currentIndex = data.vocabulary.stages.indexOf(stage);
        elements['stage-track'].replaceChildren(...data.vocabulary.stages.map((value, index) => {
          const item = node('span', 'stage ' + (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'future'), value);
          item.dataset.stage = value;
          return item;
        }));
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
        renderStages(state.stage);
        elements['step-eyebrow'].textContent = state.eyebrow;
        elements['step-title'].textContent = state.title;
        elements.narrative.textContent = state.narrative;
        elements['current-stage'].textContent = state.stage;
        elements.changes.replaceChildren(...state.changes.map(value => node('li', '', value)));
        renderDocuments(state.documents);
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
        elements['next-label'].textContent = state.advance ? 'Next: ' + state.advance : 'The walk-through is complete.';
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
