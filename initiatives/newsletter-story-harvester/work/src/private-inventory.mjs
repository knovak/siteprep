import { chmodSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { matcherGroupsFor } from './source-contract.mjs';

const SHAPES = new Set(['link-list', 'annotated-digest', 'long-form']);

export function validatePrivateInventory(inventory) {
  if (!inventory || typeof inventory !== 'object' || !Array.isArray(inventory.sources) || !inventory.sources.length) {
    throw new Error('private inventory: sources must be a non-empty array');
  }
  const keys = new Set();
  for (const entry of inventory.sources) {
    if (!entry?.key || !entry.name || !SHAPES.has(entry.shape)) {
      throw new Error('private inventory: every source needs key, name, and a supported shape');
    }
    if (keys.has(entry.key)) throw new Error(`private inventory: duplicate key ${entry.key}`);
    keys.add(entry.key);
    matcherGroupsFor(entry);
    if (entry.lookback_days !== undefined && (!Number.isInteger(entry.lookback_days) || entry.lookback_days < 1)) {
      throw new Error(`private inventory: ${entry.key}.lookback_days must be a positive integer`);
    }
  }
  return inventory;
}

export function writePrivateInventory(path, inventory) {
  validatePrivateInventory(inventory);
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
    chmodSync(path, 0o600);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

export function loadPrivateInventory(path) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error('private inventory: path must be a regular file');
  if ((info.mode & 0o077) !== 0) throw new Error('private inventory: file must not be group- or world-readable');
  const inventory = JSON.parse(readFileSync(path, 'utf8'));
  return validatePrivateInventory(inventory);
}
