import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
if (!existsSync('.dev.vars'))
  writeFileSync(
    '.dev.vars',
    `FLINGS_MODE="local"\nFLINGS_ORIGIN="http://localhost:5187"\nFLINGS_SECRET="${randomBytes(48).toString('base64url')}"\n`,
    { mode: 0o600 },
  );
const migration = spawnSync(
  'node_modules/.bin/wrangler',
  [
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    'wrangler.local.jsonc',
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
if (migration.status !== 0) process.exit(migration.status ?? 1);
const server = spawn('node_modules/.bin/vinext', ['dev', '--port', '5187'], {
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
