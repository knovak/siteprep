import {canonicalJson, sha256} from './domain.mjs';

const RIGHTS = new Set(['cleared', 'restricted', 'metadata-only', 'unknown']);
const CAPTURE = new Set(['complete', 'metadata-only', 'missing', 'restricted']);
const MAX_SOURCES = 1000;
const MAX_BODY_BYTES = 1024 * 1024;

function finding(code, path, message, severity = 'error') {
  return Object.freeze({code, path, message, severity});
}

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Harvest input must be a JSON object');
  return structuredClone(value);
}

function documentValue(value) {
  if (typeof value === 'string') return object(JSON.parse(value));
  return object(value);
}

function tag(value) {
  const label = String(value ?? '').trim().normalize('NFC');
  return label ? {label, key: label.toLocaleLowerCase('en-US')} : null;
}

function tags(values, {status = 'accepted', type = 'external'} = {}) {
  const result = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = tag(value);
    if (normalized) result.set(normalized.key, {...normalized, status, type, stage: 'harvest'});
  }
  return [...result.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function urlKey(value) {
  const url = new URL(String(value));
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Source URL must use http or https');
  url.hash = '';
  url.hostname = url.hostname.toLocaleLowerCase('en-US');
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  return url.href;
}

function bodyValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const body = String(value).normalize('NFC');
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw new TypeError('One source body exceeds 1 MiB');
  return body;
}

function operation({sourceKind, nativeId, url, title, body, bodyState, rightsState, captureState, capturedAt = null, contributor = null, sourceUpdatedAt = null, sourceTags = [], externalJudgement = null, dependencies = [], origin = {}, metadata = {}}) {
  const normalizedUrl = url ? urlKey(url) : null;
  const nativeKey = nativeId ? String(nativeId).normalize('NFC') : null;
  if (!normalizedUrl && !nativeKey) throw new TypeError('A source requires a URL or native id');
  const aliases = [];
  if (normalizedUrl) aliases.push({namespace: 'url', key: normalizedUrl});
  if (nativeKey) aliases.push({namespace: sourceKind, key: nativeKey});
  return {
    canonicalKey: normalizedUrl ?? `${sourceKind}:${nativeKey}`,
    aliases,
    sourceKind,
    title: String(title || normalizedUrl || nativeKey).trim().normalize('NFC'),
    url: normalizedUrl,
    body: bodyValue(body),
    bodyState,
    rightsState,
    captureState,
    sourceUpdatedAt,
    capturedAt,
    contributor,
    externalJudgement,
    tags: sourceTags,
    dependencies,
    origin,
    metadata,
  };
}

function direct(document, at) {
  const body = bodyValue(document.body);
  const requestedBodyState = ['quoted', 'summary', 'retained'].includes(document.bodyForm) ? document.bodyForm : 'retained';
  return [operation({
    sourceKind: document.sourceKind === 'browser-saved' ? 'browser-saved' : 'direct',
    nativeId: document.nativeId ?? null,
    url: document.url,
    title: document.title,
    body,
    bodyState: body ? requestedBodyState : 'metadata-only',
    rightsState: document.rightsState ?? 'unknown',
    captureState: document.captureState ?? (body ? 'complete' : 'metadata-only'),
    capturedAt: document.capturedAt ?? at,
    contributor: document.contributor ?? null,
    sourceTags: tags(document.tags, {status: 'accepted', type: 'user'}),
    origin: {route: document.sourceKind === 'browser-saved' ? 'browser-saved' : 'direct', savedFrom: document.savedFrom ?? null},
    metadata: {savedFrom: document.savedFrom ?? null},
  })];
}

function bookmarkSorter(document) {
  if (document.format !== 'bookmark-sorter/v1' || !Array.isArray(document.items)) throw new TypeError('Bookmark Sorter input must be a bookmark-sorter/v1 export');
  const {items: _items, runs: _runs, ...exportOrigin} = document;
  return document.items.map((item, index) => operation({
    sourceKind: 'bookmark-sorter',
    nativeId: item.id ?? `item-${index}`,
    url: item.url,
    title: item.title,
    body: item.note,
    bodyState: item.note ? 'metadata-note' : 'metadata-only',
    rightsState: 'metadata-only',
    captureState: Array.isArray(item.tags) && item.tags.some((value) => String(value).startsWith('err:')) ? 'missing' : 'metadata-only',
    capturedAt: item.added_at ?? item.verdict_at ?? document.exported_at ?? null,
    sourceUpdatedAt: item.verdict_at ?? item.added_at ?? document.exported_at ?? null,
    sourceTags: tags(item.tags),
    externalJudgement: item.verdict ? {system: 'bookmark-sorter', verdict: item.verdict, at: item.verdict_at ?? null} : null,
    origin: {format: document.format, payload: structuredClone(item), export: structuredClone(exportOrigin)},
    metadata: {collection: document.collection ?? null, selection: document.selection ?? ''},
  }));
}

function newsletterHarvester(document) {
  if (document.version !== 1 || !Array.isArray(document.stories)) throw new TypeError('Newsletter Story Harvester input must be a version 1 store or export');
  const {stories: _stories, runs: _runs, ...storeOrigin} = document;
  return document.stories.map((story, index) => operation({
    sourceKind: 'newsletter-story-harvester',
    nativeId: story.id ?? `story-${index}`,
    url: story.url ?? null,
    title: story.title,
    body: story.text,
    bodyState: story.text ? (story.text_is_summary ? 'summary' : 'retained') : 'metadata-only',
    rightsState: RIGHTS.has(story.rights_state) ? story.rights_state : 'unknown',
    captureState: story.text ? 'complete' : 'metadata-only',
    capturedAt: story.harvested_at ?? document.exported_at ?? null,
    sourceUpdatedAt: story.story_date ?? story.issue_date ?? story.harvested_at ?? null,
    sourceTags: tags(story.tags),
    externalJudgement: story.verdict ? {system: 'newsletter-story-harvester', verdict: story.verdict, at: story.verdict_at ?? null} : null,
    dependencies: (Array.isArray(story.merged_from) ? story.merged_from : []).map((key) => ({type: 'duplicate-of', targetNamespace: 'newsletter-story-harvester', targetKey: String(key), state: 'proposed'})),
    origin: {format: 'newsletter-story-harvester/store-v1', payload: structuredClone(story), store: structuredClone(storeOrigin)},
    metadata: {storeId: document.store_id ?? null, shape: story.shape ?? null, sourceDoc: story.source_doc ?? null, sourceAnchor: story.source_anchor ?? null},
  }));
}

function nativeActivities(kind, document) {
  if (!['bookmark-sorter', 'newsletter-story-harvester'].includes(kind) || !Array.isArray(document.runs)) return [];
  return document.runs.map((run, index) => ({
    type: 'native-harvest-run',
    sourceSystem: kind,
    nativeId: String(run.id ?? `run-${index}`),
    status: String(run.status ?? 'recorded'),
    createdAt: run.created_at ?? run.started_at ?? run.completed_at ?? null,
    details: structuredClone(run),
  }));
}

function validateOperation(item, index) {
  const findings = [];
  if (!item.title) findings.push(finding('harvest.title.required', `$.sources[${index}].title`, 'A source title is required'));
  if (!RIGHTS.has(item.rightsState)) findings.push(finding('harvest.rights.invalid', `$.sources[${index}].rightsState`, 'Rights state must be cleared, restricted, metadata-only, or unknown'));
  if (!CAPTURE.has(item.captureState)) findings.push(finding('harvest.capture.invalid', `$.sources[${index}].captureState`, 'Capture state is invalid'));
  if (item.rightsState === 'restricted' && item.body) findings.push(finding('harvest.body.restricted', `$.sources[${index}].body`, 'Restricted source bodies are not accepted'));
  if (item.rightsState === 'unknown' && item.body) findings.push(finding('harvest.body.rights_unknown', `$.sources[${index}].body`, 'A body with unknown rights remains a review finding', 'warning'));
  return findings;
}

export async function makeHarvestPreview(kind, value, {createdAt = new Date().toISOString()} = {}) {
  const document = documentValue(value);
  let sources;
  if (kind === 'direct' || kind === 'browser-saved') sources = direct({...document, sourceKind: kind}, createdAt);
  else if (kind === 'bookmark-sorter') sources = bookmarkSorter(document);
  else if (kind === 'newsletter-story-harvester') sources = newsletterHarvester(document);
  else throw new TypeError(`Unsupported harvest adapter: ${kind}`);
  if (!sources.length || sources.length > MAX_SOURCES) throw new TypeError(`Harvest preview requires 1-${MAX_SOURCES} sources`);
  const findings = sources.flatMap(validateOperation);
  const activities = nativeActivities(kind, document);
  const operations = {format: 'knowledge-pipeline/harvest-preview-v1', kind, createdAt, sources, activities};
  const contentHash = await sha256(canonicalJson({format: operations.format, kind, sources, activities}));
  return {
    contentHash,
    operations,
    findings,
    counts: {
      sources: sources.length,
      withBodies: sources.filter(({body}) => body).length,
      restricted: sources.filter(({rightsState}) => rightsState === 'restricted').length,
      unknownRights: sources.filter(({rightsState}) => rightsState === 'unknown').length,
      tags: new Set(sources.flatMap(({tags: values}) => values.map(({key}) => key))).size,
      dependencyProposals: sources.reduce((sum, source) => sum + source.dependencies.length, 0),
      nativeActivities: activities.length,
    },
  };
}

export function newHarvestState() {
  return {sources: [], versions: [], aliases: [], tags: [], dependencyProposals: [], activities: [], receipts: []};
}

export async function commitHarvestState(inputState, preview, {actorId = 'actor:test', committedAt = preview.operations.createdAt} = {}) {
  const state = structuredClone(inputState);
  const existingReceipt = state.receipts.find(({operationId}) => operationId === `harvest:${preview.contentHash}`);
  if (existingReceipt) return {state, duplicate: true, receipt: existingReceipt};
  let created = 0;
  let updated = 0;
  for (const source of preview.operations.sources) {
    let record = state.sources.find((candidate) => candidate.canonicalKey === source.canonicalKey);
    if (!record) {
      record = {id: `source:${(await sha256(source.canonicalKey)).slice(7, 31)}`, canonicalKey: source.canonicalKey, state: 'active', currentVersionId: null, createdAt: committedAt};
      state.sources.push(record);
      created += 1;
    } else updated += 1;
    for (const alias of source.aliases) if (!state.aliases.some((candidate) => candidate.namespace === alias.namespace && candidate.key === alias.key)) state.aliases.push({sourceId: record.id, ...alias});
    const contentHash = await sha256(canonicalJson(source));
    let version = state.versions.find((candidate) => candidate.sourceId === record.id && candidate.contentHash === contentHash);
    if (!version) {
      version = {id: `version:${contentHash.slice(7, 39)}`, sourceId: record.id, contentHash, content: source, actorId, createdAt: committedAt};
      state.versions.push(version);
    }
    record.currentVersionId = version.id;
    for (const sourceTag of source.tags) if (!state.tags.some((candidate) => candidate.sourceId === record.id && candidate.key === sourceTag.key && candidate.status === sourceTag.status && candidate.stage === sourceTag.stage)) state.tags.push({sourceId: record.id, ...sourceTag, archivedAt: null, createdAt: committedAt});
    for (const proposal of source.dependencies) if (!state.dependencyProposals.some((candidate) => candidate.sourceId === record.id && candidate.type === proposal.type && candidate.targetKey === proposal.targetKey)) state.dependencyProposals.push({id: `dependency:${crypto.randomUUID()}`, sourceId: record.id, ...proposal, createdAt: committedAt});
  }
  for (const [index, nativeActivity] of preview.operations.activities.entries()) {
    state.activities.push({
      id: `activity:native:${preview.contentHash.slice(7, 23)}:${index}`,
      type: nativeActivity.type,
      actorId,
      createdAt: nativeActivity.createdAt ?? committedAt,
      details: nativeActivity,
    });
  }
  const activity = {id: `activity:${crypto.randomUUID()}`, type: 'harvest-commit', actorId, createdAt: committedAt, counts: {...preview.counts, created, updated}};
  const receipt = {id: `receipt:${crypto.randomUUID()}`, operationId: `harvest:${preview.contentHash}`, contentHash: preview.contentHash, activityId: activity.id, createdAt: committedAt, created, updated};
  state.activities.push(activity);
  state.receipts.push(receipt);
  return {state, duplicate: false, receipt};
}

export function measureTagInventory(state) {
  const inventory = new Map();
  for (const item of state.tags) {
    const key = `${item.key}|${item.status}|${item.type}|${item.stage}`;
    const row = inventory.get(key) ?? {tag: item.label, key: item.key, status: item.status, type: item.type, stage: item.stage, sources: new Set(), active: 0, archived: 0};
    row.sources.add(item.sourceId);
    if (item.archivedAt) row.archived += 1;
    else row.active += 1;
    inventory.set(key, row);
  }
  return [...inventory.values()].map(({sources, ...row}) => ({...row, sources: sources.size})).sort((left, right) => left.key.localeCompare(right.key) || left.status.localeCompare(right.status));
}
