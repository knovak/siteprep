import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SIMPLE_KEY = /^[A-Za-z0-9_-]+$/;

function sourceLabel(root, path) {
  const label = relative(root, path);
  return label && !label.startsWith('..') ? label : path;
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value;
}

function assertUniqueStrings(value, name) {
  const items = assertArray(value, name);
  if (items.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${name} must contain non-empty strings`);
  }
  if (new Set(items).size !== items.length) {
    throw new Error(`${name} must not contain duplicates`);
  }
  return items;
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

async function readJson(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON source ${path}: ${error.message}`);
  }
  return parsed;
}

async function importFactsModule(path) {
  let metadata;
  try {
    metadata = await stat(path);
  } catch (error) {
    throw new Error(`Cannot stat module source ${path}: ${error.message}`);
  }
  const url = pathToFileURL(path);
  url.searchParams.set('repo-guide-read', `${metadata.mtimeMs}-${metadata.size}`);
  try {
    return await import(url.href);
  } catch (error) {
    throw new Error(`Cannot import module source ${path}: ${error.message}`);
  }
}

function readExport(module, name, path) {
  if (!Object.hasOwn(module, name)) {
    throw new Error(`Unresolvable fact: ${path} does not export ${name}`);
  }
  return module[name];
}

function normaliseSet(value, name) {
  if (!(value instanceof Set)) {
    throw new Error(`${name} must be a Set`);
  }
  return assertUniqueStrings([...value], name);
}

function validateLifecycle(stages, stageDocuments) {
  assertUniqueStrings(stages, 'STAGES');
  assertObject(stageDocuments, 'STAGE_DOCUMENTS');
  for (const [stage, documents] of Object.entries(stageDocuments)) {
    if (!stages.includes(stage)) {
      throw new Error(`Lifecycle drift: STAGE_DOCUMENTS names unknown stage ${stage}`);
    }
    assertUniqueStrings(documents, `STAGE_DOCUMENTS.${stage}`);
  }
}

function readStrictBlockKeys(text, heading, path) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex((line) => line === `${heading}:`);
  if (start === -1) {
    throw new Error(`${path}: missing ${heading}: block`);
  }

  const keys = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length === 0 || /^\s*#/.test(line)) continue;
    if (!line.startsWith(' ')) break;
    if (line.startsWith('    ')) continue;

    const match = line.match(/^  ([A-Za-z0-9_-]+):(?:\s*#.*)?$/);
    if (!match) {
      throw new Error(`${path}: unsupported direct child in ${heading}: block: ${line.trim()}`);
    }
    keys.push(match[1]);
  }

  if (keys.length === 0) {
    throw new Error(`${path}: empty ${heading}: block`);
  }
  return keys;
}

export function readWorkflow(text, path = '<workflow>') {
  return {
    triggers: readStrictBlockKeys(text, 'on', path),
    jobs: readStrictBlockKeys(text, 'jobs', path)
  };
}

function readInlineScalar(value, field, path) {
  const scalar = value.trim();
  if (!scalar || /^["'&*[{]/.test(scalar)) {
    throw new Error(`${path}: unsupported ${field} scalar`);
  }
  return scalar;
}

export function readSkillFrontmatter(text, path = '<skill>') {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines[0] !== '---') {
    throw new Error(`${path}: frontmatter must begin on line one`);
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    throw new Error(`${path}: missing closing delimiter`);
  }

  const values = {};
  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (line.length === 0) continue;
    const match = line.match(/^([a-z_][a-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match || !['name', 'description'].includes(match[1])) {
      throw new Error(`${path}: unsupported frontmatter line: ${line}`);
    }
    const [, field, rawValue = ''] = match;
    if (Object.hasOwn(values, field)) {
      throw new Error(`${path}: duplicate ${field}`);
    }
    if (/^[>|][+-]?$/.test(rawValue)) {
      const block = [];
      while (index + 1 < end && lines[index + 1].startsWith('  ')) {
        block.push(lines[index + 1].slice(2));
        index += 1;
      }
      if (block.length === 0) {
        throw new Error(`${path}: empty ${field} block scalar`);
      }
      values[field] = block.join(rawValue.startsWith('>') ? ' ' : '\n').trim();
    } else {
      values[field] = readInlineScalar(rawValue, field, path);
    }
  }

  for (const field of ['name', 'description']) {
    if (!values[field]) throw new Error(`${path}: missing ${field}`);
  }
  return values;
}

function firstParagraph(lines, start, end, path, phaseNumber) {
  let index = start;
  while (index < end && lines[index].trim() === '') index += 1;
  const paragraph = [];
  while (index < end && lines[index].trim() !== '') {
    if (/^(#|[-*] |```)/.test(lines[index])) {
      throw new Error(`${path}: phase ${phaseNumber} has no first paragraph`);
    }
    paragraph.push(lines[index].trim());
    index += 1;
  }
  if (paragraph.length === 0) {
    throw new Error(`${path}: phase ${phaseNumber} has no first paragraph`);
  }
  return paragraph.join(' ');
}

export function readSweepPrompt(text, configuredPhases, path = '<sweep-prompt>') {
  assertUniqueStrings(configuredPhases, 'configured sweep phases');
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^## Phase (\d+) — (.+)$/);
    if (match) headings.push({ number: Number(match[1]), title: match[2], index });
  }
  const actual = headings.map(({ number }) => number);
  const expected = configuredPhases.map((_, index) => index + 1);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${path}: phase headings were ${actual.join(',')}, expected ${expected.join(',')}`);
  }

  const phaseSummaries = headings.map((heading, index) => ({
    phase: configuredPhases[index],
    title: heading.title,
    summary: firstParagraph(
      lines,
      heading.index + 1,
      headings[index + 1]?.index ?? lines.length,
      path,
      heading.number
    )
  }));

  const rulesHeading = lines.indexOf('## Rules');
  if (rulesHeading === -1) throw new Error(`${path}: missing Rules heading`);
  const rules = [];
  for (let index = rulesHeading + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;
    if (line.startsWith('## ')) break;
    const bullet = line.match(/^- (.+)$/);
    if (bullet) {
      rules.push(bullet[1]);
      continue;
    }
    if (/^  \S/.test(line) && rules.length > 0) {
      rules[rules.length - 1] += ` ${line.trim()}`;
      continue;
    }
    throw new Error(`${path}: unsupported line in Rules list: ${line}`);
  }
  if (rules.length === 0) throw new Error(`${path}: empty Rules list`);
  return { phaseSummaries, rules };
}

export class FactRegistry {
  #entries = new Map();

  register(key, source, reader) {
    if (typeof key !== 'string' || key.length === 0 || typeof reader !== 'function') {
      throw new Error('A fact registration needs a key, source, and reader');
    }
    if (this.#entries.has(key)) {
      const previous = this.#entries.get(key);
      throw new Error(`Fact ${key} has more than one source: ${previous.source}, ${source}`);
    }
    this.#entries.set(key, { source, reader });
    return this;
  }

  entries() {
    return [...this.#entries.entries()].map(([key, { source }]) => ({ key, source }));
  }

  async resolve() {
    const facts = {};
    for (const [key, entry] of [...this.#entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      try {
        facts[key] = await entry.reader();
      } catch (error) {
        throw new Error(`Cannot resolve ${key} from ${entry.source}: ${error.message}`);
      }
    }
    return facts;
  }
}

export function repositorySources(rootPath, overrides = {}) {
  const root = resolve(rootPath);
  return {
    root,
    initiativesModule: join(root, 'scripts', 'initiatives.mjs'),
    sweepConfig: join(root, 'initiatives', 'sweep.json'),
    sweepPrompt: join(root, 'initiatives', 'sweep-prompt.md'),
    initiativesDir: join(root, 'initiatives'),
    workflowsDir: join(root, '.github', 'workflows'),
    skillsDir: join(root, '.claude', 'skills'),
    packageJson: join(root, 'package.json'),
    ...overrides
  };
}

async function directoryFiles(path, suffix) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(path, entry.name))
    .sort();
}

async function skillFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    files.push(join(path, entry.name, 'SKILL.md'));
  }
  return files;
}

async function readLiveInitiatives(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const live = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const initiativePath = join(path, entry.name, 'initiative.json');
    let initiative;
    try {
      initiative = await readJson(initiativePath);
    } catch (error) {
      if (error.message.includes('ENOENT')) continue;
      throw error;
    }
    if (typeof initiative.title !== 'string' || typeof initiative.stage !== 'string') {
      throw new Error(`${initiativePath}: title and stage are required strings`);
    }
    live.push({ slug: entry.name, title: initiative.title, stage: initiative.stage });
  }
  return live;
}

export async function createFactRegistry(sourceConfig) {
  const sources = repositorySources(sourceConfig.root, sourceConfig);
  const registry = new FactRegistry();
  let modulePromise;
  let sweepPromise;
  let promptPromise;
  const loadModule = () => (modulePromise ??= importFactsModule(sources.initiativesModule));
  const loadSweep = () => (sweepPromise ??= readJson(sources.sweepConfig));
  const loadPrompt = async () => {
    if (!promptPromise) {
      promptPromise = Promise.all([readFile(sources.sweepPrompt, 'utf8'), loadSweep()])
        .then(([text, sweep]) => readSweepPrompt(text, sweep.phases, sources.sweepPrompt));
    }
    return promptPromise;
  };

  const moduleLabel = sourceLabel(sources.root, sources.initiativesModule);
  registry
    .register('lifecycle.stages', moduleLabel, async () => {
      const module = await loadModule();
      const stages = assertUniqueStrings(readExport(module, 'STAGES', sources.initiativesModule), 'STAGES');
      const documents = readExport(module, 'STAGE_DOCUMENTS', sources.initiativesModule);
      validateLifecycle(stages, documents);
      return stages;
    })
    .register('lifecycle.stage_documents', moduleLabel, async () => {
      const module = await loadModule();
      const stages = readExport(module, 'STAGES', sources.initiativesModule);
      const documents = readExport(module, 'STAGE_DOCUMENTS', sources.initiativesModule);
      validateLifecycle(stages, documents);
      return documents;
    })
    .register('blockers.prefixes', moduleLabel, async () => {
      const module = await loadModule();
      return assertUniqueStrings(readExport(module, 'BLOCKER_PREFIXES', sources.initiativesModule), 'BLOCKER_PREFIXES');
    })
    .register('blockers.human', moduleLabel, async () => {
      const module = await loadModule();
      return normaliseSet(readExport(module, 'HUMAN_BLOCKERS', sources.initiativesModule), 'HUMAN_BLOCKERS');
    })
    .register('blockers.proposable', moduleLabel, async () => {
      const module = await loadModule();
      return normaliseSet(readExport(module, 'PROPOSABLE_BLOCKERS', sources.initiativesModule), 'PROPOSABLE_BLOCKERS');
    })
    .register('sweep.phases', sourceLabel(sources.root, sources.sweepConfig), async () => {
      const sweep = await loadSweep();
      return assertUniqueStrings(sweep.phases, 'sweep.phases');
    })
    .register('sweep.budget', sourceLabel(sources.root, sources.sweepConfig), async () => {
      const sweep = await loadSweep();
      const budget = {};
      for (const key of ['items_per_run', 'max_items_per_initiative', 'max_open_prs', 'max_effort']) {
        if (!Object.hasOwn(sweep, key)) throw new Error(`sweep.json is missing ${key}`);
        budget[key] = sweep[key];
      }
      return budget;
    })
    .register('sweep.protected_paths', sourceLabel(sources.root, sources.sweepConfig), async () => {
      const sweep = await loadSweep();
      return assertUniqueStrings(sweep.protected_paths, 'sweep.protected_paths');
    })
    .register('sweep.phase_summaries', sourceLabel(sources.root, sources.sweepPrompt), async () => (await loadPrompt()).phaseSummaries)
    .register('sweep.rules', sourceLabel(sources.root, sources.sweepPrompt), async () => (await loadPrompt()).rules)
    .register('agent.commands', sourceLabel(sources.root, sources.packageJson), async () => {
      const packageData = await readJson(sources.packageJson);
      return assertObject(packageData.scripts, 'package.json scripts');
    })
    .register('initiatives.live', sourceLabel(sources.root, sources.initiativesDir), () => readLiveInitiatives(sources.initiativesDir));

  for (const workflowPath of await directoryFiles(sources.workflowsDir, '.yml')) {
    const name = basename(workflowPath, '.yml');
    if (!SIMPLE_KEY.test(name)) throw new Error(`Unsupported workflow fact key: ${name}`);
    registry.register(`workflows.${name}`, sourceLabel(sources.root, workflowPath), async () => ({
      file: basename(workflowPath),
      ...readWorkflow(await readFile(workflowPath, 'utf8'), workflowPath)
    }));
  }

  for (const skillPath of await skillFiles(sources.skillsDir)) {
    const directoryName = basename(dirname(skillPath));
    if (!SIMPLE_KEY.test(directoryName)) throw new Error(`Unsupported skill fact key: ${directoryName}`);
    registry.register(`skills.${directoryName}`, sourceLabel(sources.root, skillPath), async () => {
      const skill = readSkillFrontmatter(await readFile(skillPath, 'utf8'), skillPath);
      if (skill.name !== directoryName) {
        throw new Error(`${skillPath}: name ${skill.name} does not match directory ${directoryName}`);
      }
      return skill;
    });
  }
  return registry;
}

export async function resolveRepositoryFacts(rootPath, overrides = {}) {
  const registry = await createFactRegistry(repositorySources(rootPath, overrides));
  return registry.resolve();
}
