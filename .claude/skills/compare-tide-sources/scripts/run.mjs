// One command for the whole comparison: drive both apps, read every official
// service for the day the apps showed, then report problems first.
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true]));
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = args.repo ?? process.cwd();
const out = args.out ?? join(tmpdir(), 'tide-source-comparison', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(out, { recursive: true });

const pass = (name) => (args[name] ? [`--${name}=${args[name]}`] : []);
const step = (script, extra) => {
  const result = spawnSync(process.execPath, [join(here, script), ...extra], {
    stdio: 'inherit',
    env: { ...process.env, TIDE_COMPARE_REPO: repo }
  });
  if (result.status !== 0) {
    console.error(`\n${script} exited ${result.status}. Partial output is in ${out}.`);
    process.exit(result.status ?? 1);
  }
};

console.error(`Run directory: ${out}\n`);
step('collect-apps.mjs', [`--out=${join(out, 'apps.json')}`, `--repo=${repo}`, ...pass('only')]);
step('collect-official.mjs', [`--apps=${join(out, 'apps.json')}`, `--out=${join(out, 'official.json')}`, ...pass('only'), ...pass('date')]);
step('compare.mjs', [`--apps=${join(out, 'apps.json')}`, `--official=${join(out, 'official.json')}`, `--out=${join(out, 'report.md')}`, ...pass('baseline')]);
console.error(`\nReport: ${join(out, 'report.md')}`);
