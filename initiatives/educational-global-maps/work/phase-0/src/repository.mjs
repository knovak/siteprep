import {mkdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {canonicalJson, contentIdentity, parseJsonStrict} from './canonical.mjs';
import {assertNoErrors, finding, SceneCoreError} from './findings.mjs';
import {trustedInventory, validateInventory} from './validate.mjs';

function mergeRecords(existing, candidate, group, identity) {
  const records = new Map(existing.map((record) => [record[identity], record]));
  for (const record of candidate) {
    const id = record[identity];
    if (records.has(id) && canonicalJson(records.get(id)) !== canonicalJson(record)) {
      throw new SceneCoreError([finding(`repository.${group}.immutable_conflict`, `$.${group}.${id}`, `${group} id ${id} already has different content`)]);
    }
    records.set(id, record);
  }
  return [...records.values()].sort((a, b) => a[identity].localeCompare(b[identity]));
}

export class SceneRepository {
  constructor(root) {
    this.root = root;
    this.acceptedPath = join(root, 'accepted', 'inventory.json');
  }

  async initialize() {
    await mkdir(join(this.root, 'accepted'), {recursive: true});
  }

  async inventory() {
    try {
      return parseJsonStrict(await readFile(this.acceptedPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {objects: [], assets: []};
      throw error;
    }
  }

  async fingerprint() {
    return contentIdentity(await this.inventory());
  }

  async acceptedMtime() {
    try {
      return (await stat(this.acceptedPath)).mtimeMs;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async accept(candidate, {faultAt = null} = {}) {
    await this.initialize();
    const trusted = trustedInventory(candidate);
    assertNoErrors(validateInventory(trusted), 'Candidate inventory is invalid');
    if (faultAt === 'after-validation') throw new Error('Injected fault after validation');
    const existing = await this.inventory();
    const merged = {
      objects: mergeRecords(existing.objects, trusted.objects, 'objects', 'id'),
      assets: mergeRecords(existing.assets, trusted.assets, 'assets', 'id'),
    };
    const before = canonicalJson(existing);
    const after = canonicalJson(merged);
    if (before === after) return {changed: false, fingerprint: contentIdentity(merged)};
    const stagePath = join(this.root, `.staging-${randomUUID()}.json`);
    try {
      await writeFile(stagePath, after, {encoding: 'utf8', flag: 'wx'});
      if (faultAt === 'after-stage') throw new Error('Injected fault after staging');
      const staged = parseJsonStrict(await readFile(stagePath, 'utf8'));
      assertNoErrors(validateInventory(staged), 'Staged inventory is invalid');
      if (contentIdentity(staged) !== contentIdentity(merged)) {
        throw new SceneCoreError([finding('repository.stage.mismatch', '$', 'Staged inventory differs from candidate')]);
      }
      if (faultAt === 'before-commit') throw new Error('Injected fault before commit');
      await rename(stagePath, this.acceptedPath);
      return {changed: true, fingerprint: contentIdentity(merged)};
    } finally {
      await rm(stagePath, {force: true});
    }
  }
}
