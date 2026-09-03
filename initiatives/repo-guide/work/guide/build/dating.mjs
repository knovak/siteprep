import {execFile as execFileCallback} from 'node:child_process';
import {isAbsolute, relative} from 'node:path';
import {promisify} from 'node:util';

const execFile = promisify(execFileCallback);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const SIMULATOR_SOURCE_PATHS = ['scripts/initiatives.mjs', 'initiatives/sweep.json'];
export const SIMULATOR_WATCHED_DATE = '2026-09-02';

function requireDate(value, name) {
  if (typeof value !== 'string' || !DATE.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`${name} must be a real YYYY-MM-DD date`);
  }
  return value;
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

export function classifySimulatorReview(watchedDate, sourceDate) {
  requireDate(watchedDate, 'simulator watched date');
  requireDate(sourceDate, 'newest simulator source date');
  const simulator = {
    watched: watchedDate,
    source_date: sourceDate,
    possibly_stale: watchedDate < sourceDate,
  };
  const diagnostics = simulator.possibly_stale
    ? [`Simulator may need re-watching: watched ${simulator.watched}; sources changed ${simulator.source_date}.`]
    : [];
  return {simulator, diagnostics};
}

export async function resolveDating({root, watchedDate = SIMULATOR_WATCHED_DATE} = {}) {
  if (!root) throw new Error('root is required for dating');
  const sourceDate = await newestCommitDate(root, SIMULATOR_SOURCE_PATHS);
  return {
    ...classifySimulatorReview(watchedDate, sourceDate),
    source_paths: [...SIMULATOR_SOURCE_PATHS],
  };
}
