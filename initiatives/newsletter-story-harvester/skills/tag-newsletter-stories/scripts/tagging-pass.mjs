#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {chmodSync, existsSync, readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {recordRun} from '../../../work/src/merge.mjs';
import {hydrate, loadStore, saveStore} from '../../../work/src/store.mjs';

const TAG = /^(theme|about):[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function fingerprint(store) {
  const state = {
    stories: [...store.stories]
      .map(story => ({id: story.id, tags: [...new Set(story.tags || [])].sort()}))
      .sort((a, b) => a.id.localeCompare(b.id)),
    clusters: Object.fromEntries(Object.entries(store.clusters || {}).sort(([a], [b]) => a.localeCompare(b))),
  };
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

function timestamp(value, label) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.valueOf())) throw new Error(`${label} must be an ISO timestamp`);
  return parsed.toISOString();
}

function proposalKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) throw new Error(`${label} has unknown fields: ${unknown.join(', ')}`);
}

function uniqueIds(value, label, minimum = 1) {
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id)) {
    throw new Error(`${label}.story_ids must be a list of story ids`);
  }
  const ids = [...new Set(value)];
  if (ids.length < minimum) throw new Error(`${label} needs at least ${minimum} distinct stories`);
  return ids;
}

function validateProposal(store, proposal) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new Error('proposal must be a JSON object');
  }
  proposalKeys(proposal, ['store_id', 'pass_id', 'created_at', 'themes', 'clusters'], 'proposal');
  if (proposal.store_id !== store.store_id) {
    throw new Error(`proposal store_id ${JSON.stringify(proposal.store_id)} does not match ${JSON.stringify(store.store_id)}`);
  }
  if (typeof proposal.pass_id !== 'string' || !/^[a-z0-9][a-z0-9-]{5,79}$/.test(proposal.pass_id)) {
    throw new Error('pass_id must be 6–80 lowercase letters, digits, or hyphens');
  }
  if ((store.runs || []).some(run => run.kind === 'tagging' && run.pass_id === proposal.pass_id)) {
    throw new Error(`tagging pass ${proposal.pass_id} already exists`);
  }
  const createdAt = timestamp(proposal.created_at, 'created_at');
  if (!Array.isArray(proposal.themes) || !Array.isArray(proposal.clusters)) {
    throw new Error('proposal themes and clusters must be arrays');
  }

  const byId = new Map(store.stories.map(story => [story.id, story]));
  const seenTags = new Set();
  const clusterMembers = new Set();
  const themes = proposal.themes.map((theme, index) => {
    if (!theme || typeof theme !== 'object' || Array.isArray(theme)) throw new Error(`theme ${index} must be an object`);
    proposalKeys(theme, ['tag', 'story_ids'], `theme ${index}`);
    if (!TAG.test(theme.tag) || !theme.tag.startsWith('theme:')) throw new Error(`theme ${index} needs a theme: slug`);
    if (seenTags.has(theme.tag)) throw new Error(`duplicate proposal tag ${theme.tag}`);
    seenTags.add(theme.tag);
    const storyIds = uniqueIds(theme.story_ids, `theme ${index}`);
    for (const id of storyIds) if (!byId.has(id)) throw new Error(`theme ${theme.tag} names unknown story ${id}`);
    return {tag: theme.tag, story_ids: storyIds};
  });

  const clusters = proposal.clusters.map((cluster, index) => {
    if (!cluster || typeof cluster !== 'object' || Array.isArray(cluster)) throw new Error(`cluster ${index} must be an object`);
    proposalKeys(cluster, ['tag', 'paraphrase', 'story_ids'], `cluster ${index}`);
    if (!TAG.test(cluster.tag) || !cluster.tag.startsWith('about:')) throw new Error(`cluster ${index} needs an about: slug`);
    if (seenTags.has(cluster.tag)) throw new Error(`duplicate proposal tag ${cluster.tag}`);
    seenTags.add(cluster.tag);
    if (typeof cluster.paraphrase !== 'string' || !cluster.paraphrase.trim()) {
      throw new Error(`cluster ${cluster.tag} needs a paraphrase`);
    }
    const storyIds = uniqueIds(cluster.story_ids, `cluster ${index}`, 2);
    const dates = [];
    for (const id of storyIds) {
      const story = byId.get(id);
      if (!story) throw new Error(`cluster ${cluster.tag} names unknown story ${id}`);
      if (clusterMembers.has(id)) throw new Error(`story ${id} appears in more than one proposed cluster`);
      clusterMembers.add(id);
      const date = new Date(`${story.story_date || story.issue_date}T00:00:00Z`);
      if (Number.isNaN(date.valueOf())) throw new Error(`story ${id} has no usable date`);
      dates.push(date.valueOf());
    }
    if ((Math.max(...dates) - Math.min(...dates)) / DAY_MS > 14) {
      throw new Error(`cluster ${cluster.tag} spans more than fourteen days`);
    }
    return {tag: cluster.tag, paraphrase: cluster.paraphrase.trim(), story_ids: storyIds};
  });

  return {store_id: proposal.store_id, pass_id: proposal.pass_id, created_at: createdAt, themes, clusters};
}

export function prepareTaggingBrief(store) {
  const hydrated = hydrate(store);
  if (!hydrated.store_id) throw new Error('store needs a store_id');
  return {
    store_id: hydrated.store_id,
    instructions: {
      themes: 'Group by useful recurring subject with theme:<slug>. A story may have several themes.',
      clusters: 'Group only the same named event or development with about:<slug>; require strong subject overlap and dates within 14 days.',
    },
    stories: hydrated.stories.map(story => ({
      id: story.id,
      title: story.title,
      text: story.text,
      source: story.source,
      issue_date: story.issue_date,
      story_date: story.story_date,
      tags: [...new Set(story.tags || [])].sort(),
    })),
  };
}

export function applyTaggingPass(storeInput, proposalInput) {
  const store = hydrate(structuredClone(storeInput));
  const proposal = validateProposal(store, proposalInput);
  const beforeFingerprint = fingerprint(store);
  const byId = new Map(store.stories.map(story => [story.id, story]));
  const addedByStory = new Map();
  const add = (storyId, tag) => {
    const story = byId.get(storyId);
    const tags = new Set(story.tags || []);
    if (tags.has(tag)) return;
    tags.add(tag);
    story.tags = [...tags].sort();
    if (!addedByStory.has(storyId)) addedByStory.set(storyId, []);
    addedByStory.get(storyId).push(tag);
  };

  for (const theme of proposal.themes) for (const id of theme.story_ids) add(id, theme.tag);
  const addedClusters = [];
  for (const cluster of proposal.clusters) {
    const existing = store.clusters[cluster.tag];
    if (existing) {
      const same = existing.paraphrase === cluster.paraphrase
        && JSON.stringify([...existing.members].sort()) === JSON.stringify([...cluster.story_ids].sort());
      if (!same) throw new Error(`cluster tag ${cluster.tag} already has different content`);
    } else {
      store.clusters[cluster.tag] = {
        tag: cluster.tag,
        paraphrase: cluster.paraphrase,
        members: [...cluster.story_ids],
        pass_id: proposal.pass_id,
        created_at: proposal.created_at,
      };
      addedClusters.push(cluster.tag);
    }
    for (const id of cluster.story_ids) add(id, cluster.tag);
  }

  const addedTags = [...addedByStory]
    .map(([story_id, tags]) => ({story_id, tags: tags.sort()}))
    .sort((a, b) => a.story_id.localeCompare(b.story_id));
  const tagsAdded = addedTags.reduce((sum, entry) => sum + entry.tags.length, 0);
  const afterFingerprint = fingerprint(store);
  recordRun(store, {
    kind: 'tagging',
    at: proposal.created_at,
    note: `Applied additive theme and cluster pass ${proposal.pass_id}`,
    report: {
      pass_id: proposal.pass_id,
      stories_tagged: addedTags.length,
      tags_added: tagsAdded,
      clusters_added: addedClusters.length,
      added_tags: addedTags,
      added_clusters: addedClusters.sort(),
      tag_state_before: beforeFingerprint,
      tag_state_after: afterFingerprint,
    },
  });
  return {store, report: {pass_id: proposal.pass_id, stories_tagged: addedTags.length, tags_added: tagsAdded, clusters_added: addedClusters.length}};
}

export function undoTaggingPass(storeInput, passId, {at = new Date().toISOString()} = {}) {
  const store = hydrate(structuredClone(storeInput));
  const run = [...store.runs].reverse().find(candidate => candidate.kind === 'tagging' && candidate.pass_id === passId);
  if (!run) throw new Error(`no tagging pass ${passId}`);
  if (run.undone_at) throw new Error(`tagging pass ${passId} is already undone`);
  if (fingerprint(store) !== run.tag_state_after) {
    throw new Error(`tags or clusters changed after ${passId}; refusing an inexact undo`);
  }
  const byId = new Map(store.stories.map(story => [story.id, story]));
  for (const entry of run.added_tags || []) {
    const story = byId.get(entry.story_id);
    if (!story) throw new Error(`story ${entry.story_id} from ${passId} is missing`);
    const remove = new Set(entry.tags || []);
    story.tags = (story.tags || []).filter(tag => !remove.has(tag)).sort();
  }
  for (const tag of run.added_clusters || []) delete store.clusters[tag];
  if (fingerprint(store) !== run.tag_state_before) throw new Error(`undo of ${passId} did not restore the prior tag state`);
  const undoneAt = timestamp(at, 'undo timestamp');
  run.undone_at = undoneAt;
  const tagsRemoved = (run.added_tags || []).reduce((sum, entry) => sum + entry.tags.length, 0);
  const clustersRemoved = (run.added_clusters || []).length;
  recordRun(store, {
    kind: 'tagging-undo',
    at: undoneAt,
    note: `Undid additive theme and cluster pass ${passId}`,
    report: {pass_id: passId, tags_removed: tagsRemoved, clusters_removed: clustersRemoved},
  });
  return {store, report: {pass_id: passId, tags_removed: tagsRemoved, clusters_removed: clustersRemoved}};
}

function writeStorePreservingMode(path, store) {
  const mode = existsSync(path) ? statSync(path).mode & 0o777 : null;
  saveStore(path, store);
  if (mode !== null) chmodSync(path, mode);
}

function usage() {
  throw new Error('usage: tagging-pass.mjs prepare STORE | apply STORE PROPOSAL | undo STORE PASS_ID');
}

async function main(args) {
  const [command, storePath, other, ...rest] = args;
  if (!command || !storePath || rest.length) usage();
  if (command === 'prepare' && !other) {
    process.stdout.write(`${JSON.stringify(prepareTaggingBrief(loadStore(storePath)), null, 2)}\n`);
    return;
  }
  if (command === 'apply' && other) {
    const result = applyTaggingPass(loadStore(storePath), JSON.parse(readFileSync(other, 'utf8')));
    writeStorePreservingMode(storePath, result.store);
    process.stdout.write(`${JSON.stringify(result.report)}\n`);
    return;
  }
  if (command === 'undo' && other) {
    const result = undoTaggingPass(loadStore(storePath), other);
    writeStorePreservingMode(storePath, result.store);
    process.stdout.write(`${JSON.stringify(result.report)}\n`);
    return;
  }
  usage();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
