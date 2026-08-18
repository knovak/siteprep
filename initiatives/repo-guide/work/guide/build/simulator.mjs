import {execFile as execFileCallback} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {resolveRepositoryFactKeys} from './facts.mjs';

const execFile = promisify(execFileCallback);
export const SIMULATOR_FACT_KEYS = ['lifecycle.stages', 'blockers.proposable', 'sweep.phases', 'sweep.budget'];
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
  const stages = requireArray(facts['lifecycle.stages'], 'lifecycle.stages', 3);
  const blockerClasses = requireArray(facts['blockers.proposable'], 'blockers.proposable');
  const phases = requireArray(facts['sweep.phases'], 'sweep.phases');
  const budget = facts['sweep.budget']?.items_per_run;
  if (!Number.isInteger(budget) || budget < 1) throw new Error('Simulator requires a positive sweep.budget.items_per_run');
  return {stages, blocker_classes: blockerClasses, phases, items_per_run: budget};
}

export function buildSimulatorSteps(facts) {
  const vocabulary = simulatorVocabulary(facts);
  const [wish, shaped, specified] = vocabulary.stages;
  const blocker = vocabulary.blocker_classes[0];
  const phaseStatus = (active, completed = []) => Object.fromEntries(vocabulary.phases.map(phase => [
    phase,
    completed.includes(phase) ? 'complete' : phase === active ? 'active' : 'waiting',
  ]));
  const firstPhase = vocabulary.phases[0];
  const workPhase = vocabulary.phases.at(-1);

  return {vocabulary, steps: [
    {
      id: 'wish-written', stage: wish, eyebrow: 'A durable intent appears', title: 'Start with the wish',
      narrative: 'The original words are recorded. The initiative exists, but it has not yet been shaped into outcomes.',
      items: [{label: 'Draft objectives', state: 'actionable', detail: 'The first move is visible.'}],
      phases: phaseStatus(null),
      changes: ['One initiative enters the lifecycle.', 'The wish remains the record of intent.'],
    },
    {
      id: 'objectives-drafted', stage: shaped, eyebrow: 'The outcome becomes testable', title: 'Shape the work',
      narrative: 'Objectives describe what done would mean, the stage advances, and the backlog gains concrete next moves.',
      items: [
        {label: 'Draft the specification', state: 'actionable', detail: 'A lifecycle move is ready.'},
        {label: 'Choose the interaction', state: 'actionable', detail: 'A judgment call has surfaced.'},
      ],
      phases: phaseStatus(null),
      changes: ['The stage advances.', 'The todo list now carries the next moves.'],
    },
    {
      id: 'human-blocker', stage: shaped, eyebrow: 'A person is required', title: 'Name the blocker honestly',
      narrative: 'A judgment call cannot be manufactured from repository facts. The item turns amber and the digest carries it to a person.',
      items: [
        {label: 'Draft the specification', state: 'actionable', detail: 'Still available to work.'},
        {label: 'Choose the interaction', state: 'blocked', detail: `${blocker}: select the trade-off`},
      ],
      phases: phaseStatus(firstPhase),
      changes: [`The blocker class is ${blocker}.`, 'The digest makes the decision visible.'],
    },
    {
      id: 'budgeted-sweep', stage: shaped, eyebrow: 'A bounded sweep runs', title: 'Finish what fits',
      narrative: `The sweep moves through its configured phases and spends at most ${vocabulary.items_per_run} items. One item starts; another is passed over because the budget is gone.`,
      items: [
        {label: 'Draft the specification', state: 'in-flight', detail: 'A pull request is open.'},
        {label: 'Build the first increment', state: 'passed', detail: `Passed over at ${vocabulary.items_per_run}/${vocabulary.items_per_run}.`},
        {label: 'Choose the interaction', state: 'blocked', detail: `${blocker}: still waiting`},
      ],
      phases: phaseStatus(workPhase, vocabulary.phases.filter(phase => phase !== workPhase)),
      changes: ['The highest-scoring available item moves.', 'Budget is a boundary, not a suggestion.'],
    },
    {
      id: 'answer-recorded', stage: shaped, eyebrow: 'The decision arrives', title: 'Clear the blocker',
      narrative: 'The answer is recorded with its reasoning. The blocker disappears and the item becomes actionable without rewriting the original wish.',
      items: [
        {label: 'Draft the specification', state: 'in-flight', detail: 'Review continues in its pull request.'},
        {label: 'Choose the interaction', state: 'actionable', detail: 'The recorded answer makes this doable.'},
      ],
      phases: phaseStatus(null, vocabulary.phases),
      changes: ['The decision becomes durable.', 'The formerly blocked item joins the work queue.'],
    },
    {
      id: 'merge-cascade', stage: specified, eyebrow: 'A merge changes the state', title: 'Let completion cascade',
      narrative: 'The finished item leaves the backlog. Its dependent becomes actionable, and the lifecycle advances to the next derived stage.',
      items: [
        {label: 'Plan the build', state: 'actionable', detail: 'Unblocked by the merged specification.', cascade: true},
        {label: 'Choose the interaction', state: 'actionable', detail: 'Ready for a later bounded run.'},
      ],
      phases: phaseStatus(null, vocabulary.phases),
      changes: ['The completed item disappears.', 'A dependent unblocks.', 'The stage advances.'],
    },
  ]};
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
    :root { color-scheme: light; font: 16px/1.45 ui-sans-serif, system-ui, sans-serif; color: #17233d; background: #eef2f8; --navy: #132b59; --blue: #2e5fc4; --orange: #ef6a3a; --amber: #d59422; --green: #25805a; }
    * { box-sizing: border-box; }
    body { min-width: 320px; min-height: 100vh; margin: 0; background: radial-gradient(circle at 9% 8%, #dbe7ff 0, transparent 26%), #eef2f8; }
    button { font: inherit; }
    .shell { width: min(1180px, calc(100% - 28px)); margin: 0 auto; padding: 24px 0 18px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 28px; padding: 18px 4px 20px; }
    .eyebrow { margin: 0 0 5px; color: #5a6b8c; font-size: .75rem; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
    h1 { margin: 0; color: var(--navy); font-size: clamp(2rem, 5vw, 4.3rem); line-height: .98; letter-spacing: -.05em; }
    .step-number { color: #66738d; font-size: .82rem; font-weight: 750; white-space: nowrap; }
    .stage-track { display: flex; gap: 5px; overflow-x: auto; padding: 0 2px 15px; }
    .stage { flex: 1 0 max-content; min-width: 86px; padding: 7px 9px; border: 1px solid #cfd7e6; border-radius: 999px; color: #6a7488; background: #f8faff; font-size: .72rem; font-weight: 780; text-align: center; }
    .stage.complete { color: #23664b; border-color: #8fc5ae; background: #e8f5ee; }
    .stage.current { color: white; border-color: var(--blue); background: var(--blue); box-shadow: 0 5px 14px #285abb3d; }
    .simulator { min-height: 610px; display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); border: 1px solid #d5ddeb; border-radius: 24px; overflow: hidden; background: white; box-shadow: 0 22px 60px #2231531f; }
    .story { display: flex; flex-direction: column; padding: 42px; color: white; background: linear-gradient(145deg, #132b59, #254f9d 72%, #315fb8); }
    .story .eyebrow { color: #bfcdf0; }
    h2 { max-width: 560px; margin: 0; font-size: clamp(2.25rem, 4vw, 4.2rem); line-height: 1; letter-spacing: -.045em; text-wrap: balance; }
    #narrative { max-width: 560px; margin: 22px 0; color: #e2e9fa; font-size: 1.05rem; }
    .changes { display: grid; gap: 8px; margin: auto 0 0; padding: 0; list-style: none; }
    .changes li { display: flex; gap: 9px; align-items: start; color: #d9e2f7; }
    .changes li::before { content: '→'; color: #ff9b76; font-weight: 900; }
    .board { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 20px; padding: 34px; background: #f8f9fc; }
    .board-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .stage-badge { padding: 6px 10px; border-radius: 999px; color: #254f9d; background: #e6edff; font-size: .75rem; font-weight: 850; text-transform: uppercase; }
    h3 { margin: 0; color: #25365b; font-size: 1.05rem; }
    #items { display: grid; align-content: start; gap: 10px; }
    .item { position: relative; padding: 16px 17px 15px 21px; border: 1px solid #d8deea; border-radius: 14px; background: white; box-shadow: 0 6px 16px #2435590b; }
    .item::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 6px; border-radius: 14px 0 0 14px; background: #7b8ba9; }
    .item strong { display: block; color: #22355b; }
    .item span { display: block; margin-top: 3px; color: #68738a; font-size: .8rem; }
    .item[data-item-state="blocked"]::before { background: var(--amber); }
    .item[data-item-state="blocked"] { background: #fffaf0; }
    .item[data-item-state="in-flight"]::before { background: var(--blue); }
    .item[data-item-state="passed"]::before { background: #8c6c9b; }
    .item[data-item-state="passed"] { opacity: .72; }
    .item[data-item-state="actionable"]::before { background: var(--green); }
    .item[data-cascade="true"] { animation: pulse 700ms ease-out; }
    @keyframes pulse { 0% { transform: translateY(8px); box-shadow: 0 0 0 0 #56a67d66; } 60% { box-shadow: 0 0 0 10px #56a67d00; } 100% { transform: none; } }
    .phases { padding-top: 16px; border-top: 1px solid #dbe1ec; }
    .phase-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
    .phase { padding: 5px 8px; border-radius: 7px; color: #6c7484; background: #e8ebf1; font-size: .7rem; font-weight: 800; }
    .phase.active { color: white; background: var(--orange); }
    .phase.complete { color: #23664b; background: #dff2e8; }
    .controls { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px 0 4px; }
    .controls button { min-width: 100px; min-height: 44px; border: 1px solid #bdc8dc; border-radius: 11px; color: #263b65; background: white; font-weight: 800; cursor: pointer; }
    .controls button.primary { color: white; border-color: var(--blue); background: var(--blue); }
    .controls button:disabled { opacity: .42; cursor: default; }
    .progress { min-width: 82px; color: #61708b; font-weight: 780; text-align: center; font-variant-numeric: tabular-nums; }
    footer { display: flex; justify-content: space-between; gap: 18px; padding: 13px 4px 0; color: #6a7488; font-size: .72rem; }
    footer a { color: #365da8; }
    @media (max-width: 800px) { .simulator { grid-template-columns: 1fr; } .story { min-height: 390px; padding: 30px; } .board { padding: 26px; } header { align-items: start; flex-direction: column; gap: 10px; } footer { flex-direction: column; } }
  </style>
</head>
<body data-source-sha="${escapeHtml(sha)}" data-generated-date="${escapeHtml(generatedDate)}">
  <div class="shell">
    <header><div><p class="eyebrow">Repository lifecycle simulator</p><h1>How an initiative moves</h1></div><span class="step-number">Abstract behaviour · live vocabulary</span></header>
    <nav id="stage-track" class="stage-track" aria-label="Lifecycle stages"></nav>
    <main class="simulator" aria-live="polite">
      <section class="story"><p id="step-eyebrow" class="eyebrow"></p><h2 id="step-title"></h2><p id="narrative"></p><ul id="changes" class="changes"></ul></section>
      <section class="board"><div class="board-heading"><h3>Initiative state</h3><span id="current-stage" class="stage-badge"></span></div><div id="items"></div><div class="phases"><h3>Sweep phases</h3><div id="phase-row" class="phase-row"></div></div></section>
    </main>
    <nav class="controls" aria-label="Simulator controls"><button id="back" type="button">← Back</button><span id="progress" class="progress">1 / 6</span><button id="step" class="primary" type="button">Step →</button><button id="play" type="button">Play</button></nav>
    <footer><span>Generated ${escapeHtml(generatedDate)} from ${escapeHtml(sha)}</span><span>Vocabulary sources: ${sources}</span></footer>
  </div>
  <script id="simulator-data" type="application/json">${embeddedJson({steps, vocabulary})}</script>
  <script>
    (() => {
      'use strict';
      const data = JSON.parse(document.querySelector('#simulator-data').textContent);
      const elements = Object.fromEntries(['stage-track','step-eyebrow','step-title','narrative','changes','current-stage','items','phase-row','back','step','play','progress'].map(id => [id, document.getElementById(id)]));
      let current = 0;
      let timer = null;
      const visited = [0];
      function node(tag, className, value) { const element = document.createElement(tag); if (className) element.className = className; if (value !== undefined) element.textContent = value; return element; }
      function renderStages(stage) {
        const currentIndex = data.vocabulary.stages.indexOf(stage);
        elements['stage-track'].replaceChildren(...data.vocabulary.stages.map((value, index) => {
          const item = node('span', 'stage ' + (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'future'), value);
          item.dataset.stage = value; return item;
        }));
      }
      function show(index) {
        current = Math.max(0, Math.min(data.steps.length - 1, index));
        const state = data.steps[current];
        document.body.dataset.step = state.id; document.body.dataset.stage = state.stage;
        renderStages(state.stage);
        elements['step-eyebrow'].textContent = state.eyebrow; elements['step-title'].textContent = state.title; elements.narrative.textContent = state.narrative; elements['current-stage'].textContent = state.stage;
        elements.changes.replaceChildren(...state.changes.map(value => node('li', '', value)));
        elements.items.replaceChildren(...state.items.map(item => {
          const card = node('article', 'item'); card.dataset.itemState = item.state; if (item.cascade) card.dataset.cascade = 'true';
          card.append(node('strong', '', item.label), node('span', '', item.detail)); return card;
        }));
        elements['phase-row'].replaceChildren(...data.vocabulary.phases.map(value => { const phase = node('span', 'phase ' + state.phases[value], value); phase.dataset.phase = value; phase.dataset.phaseState = state.phases[value]; return phase; }));
        elements.progress.textContent = (current + 1) + ' / ' + data.steps.length;
        elements.back.disabled = current === 0; elements.step.disabled = current === data.steps.length - 1;
        if (visited.at(-1) !== current) visited.push(current);
      }
      function stop() { if (timer) clearInterval(timer); timer = null; elements.play.textContent = 'Play'; elements.play.setAttribute('aria-pressed', 'false'); }
      function play() {
        if (timer) { stop(); return; }
        if (current === data.steps.length - 1) { visited.length = 0; show(0); }
        elements.play.textContent = 'Pause'; elements.play.setAttribute('aria-pressed', 'true');
        timer = setInterval(() => { if (current >= data.steps.length - 1) { stop(); return; } show(current + 1); if (current === data.steps.length - 1) stop(); }, 700);
      }
      elements.back.addEventListener('click', () => { stop(); show(current - 1); });
      elements.step.addEventListener('click', () => { stop(); show(current + 1); });
      elements.play.addEventListener('click', play);
      window.simulatorState = {current: () => current, count: data.steps.length, show, play, stop, visited: () => [...visited], vocabulary: data.vocabulary};
      show(0);
    })();
  </script>
</body>
</html>\n`;
}

export async function generateSimulator({root, outputPath, now = new Date(), sha, repositoryUrl, factOverrides = {}} = {}) {
  if (!root || !outputPath) throw new Error('root and outputPath are required');
  const facts = await resolveRepositoryFactKeys(root, SIMULATOR_FACT_KEYS, factOverrides);
  const {steps, vocabulary} = buildSimulatorSteps(facts);
  const resolvedSha = sha || await gitValue(root, ['rev-parse', '--short=12', 'HEAD']);
  const resolvedRepository = repositoryUrl || normaliseRepositoryUrl(await gitValue(root, ['remote', 'get-url', 'origin']));
  const generatedDate = new Date(now).toISOString().slice(0, 10);
  for (const path of SOURCE_PATHS) await access(resolve(root, path));
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, simulatorHtml({steps, vocabulary, generatedDate, sha: resolvedSha, repositoryUrl: resolvedRepository}), 'utf8');
  return {output: outputPath, generated_date: generatedDate, sha: resolvedSha, steps: steps.length, vocabulary, source_paths: SOURCE_PATHS};
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
