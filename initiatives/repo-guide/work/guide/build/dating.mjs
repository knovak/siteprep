import {execFile as execFileCallback} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {isAbsolute, relative, resolve} from 'node:path';
import {promisify} from 'node:util';

import {createFactRegistry} from './facts.mjs';

const execFile = promisify(execFileCallback);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const SIMULATOR_SOURCE_PATHS = ['scripts/initiatives.mjs', 'initiatives/sweep.json'];

function requireDate(value, name) {
  if (typeof value !== 'string' || !DATE.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`${name} must be a real YYYY-MM-DD date`);
  }
  return value;
}

function requireLink(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an HTTPS link`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${name} must be an HTTPS link`);
  return value;
}

export function validateDatingConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('guide config must be an object');
  if (!Array.isArray(value.pdfs)) throw new Error('guide config pdfs must be an array');
  const ids = new Set();
  const pdfs = value.pdfs.map((pdf, index) => {
    const name = `guide config pdfs[${index}]`;
    if (!pdf || typeof pdf !== 'object' || Array.isArray(pdf)) throw new Error(`${name} must be an object`);
    if (typeof pdf.id !== 'string' || !/^[a-z0-9-]+$/.test(pdf.id)) throw new Error(`${name}.id must be a lowercase slug`);
    if (ids.has(pdf.id)) throw new Error(`guide config PDF id ${pdf.id} is duplicated`);
    ids.add(pdf.id);
    if (typeof pdf.label !== 'string' || !pdf.label.trim()) throw new Error(`${name}.label must be a non-empty string`);
    return {
      id: pdf.id,
      label: pdf.label.trim(),
      link: requireLink(pdf.link, `${name}.link`),
      refreshed: requireDate(pdf.refreshed, `${name}.refreshed`),
    };
  });
  return {pdfs, simulator_watched: requireDate(value.simulator_watched, 'guide config simulator_watched')};
}

export async function loadDatingConfig(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read guide config ${path}: ${error.message}`);
  }
  return validateDatingConfig(parsed);
}

function safeGitPaths(root, paths) {
  return [...new Set(paths)].map(path => {
    const candidate = isAbsolute(path) ? relative(root, path) : path;
    if (!candidate || candidate === '..' || candidate.startsWith('../') || isAbsolute(candidate)) {
      throw new Error(`Dating source is outside the repository: ${path}`);
    }
    return candidate;
  }).sort();
}

export async function newestCommitDate(root, paths) {
  const sources = safeGitPaths(root, paths);
  if (sources.length === 0) throw new Error('Dating needs at least one source path');
  const {stdout} = await execFile('git', ['-C', root, 'log', '-1', '--format=%cI', '--', ...sources]);
  const value = stdout.trim();
  if (!value) throw new Error(`No commit found for dating sources: ${sources.join(', ')}`);
  return value.slice(0, 10);
}

export function classifyDating(config, newestSourceDate, simulatorSourceDate) {
  requireDate(newestSourceDate, 'newest source date');
  requireDate(simulatorSourceDate, 'newest simulator source date');
  const pdfs = config.pdfs.map(pdf => ({
    ...pdf,
    source_date: newestSourceDate,
    possibly_stale: pdf.refreshed < newestSourceDate,
  }));
  const simulator = {
    watched: config.simulator_watched,
    source_date: simulatorSourceDate,
    possibly_stale: config.simulator_watched < simulatorSourceDate,
  };
  const diagnostics = [
    ...pdfs.filter(pdf => pdf.possibly_stale).map(pdf => `PDF "${pdf.label}" may be stale: refreshed ${pdf.refreshed}; sources changed ${pdf.source_date}.`),
    ...(simulator.possibly_stale ? [`Simulator may need re-watching: watched ${simulator.watched}; sources changed ${simulator.source_date}.`] : []),
  ];
  return {pdfs, simulator, diagnostics, source_date: newestSourceDate};
}

export async function resolveDating({root, guideRoot, configPath = resolve(guideRoot, 'config.json')} = {}) {
  if (!root || !guideRoot) throw new Error('root and guideRoot are required for dating');
  const config = await loadDatingConfig(configPath);
  const registry = await createFactRegistry({root});
  const sourcePaths = [...new Set(registry.entries().map(entry => entry.source))].sort();
  const [sourceDate, simulatorSourceDate] = await Promise.all([
    newestCommitDate(root, sourcePaths),
    newestCommitDate(root, SIMULATOR_SOURCE_PATHS),
  ]);
  return {...classifyDating(config, sourceDate, simulatorSourceDate), source_paths: sourcePaths};
}
