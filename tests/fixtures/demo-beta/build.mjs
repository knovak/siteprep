// Fixture: the smallest thing that honors the beta build contract -
// `node build.mjs <directory>` writes the beta, entry page included, into the
// directory. Used by tests/initiatives-deployments.test.mjs; never published.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node build.mjs <output-directory>');
  process.exit(2);
}
mkdirSync(resolve(outDir), { recursive: true });
writeFileSync(join(resolve(outDir), 'main.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Fixture demo beta</title></head>
  <body><h1>Fixture demo beta</h1></body>
</html>
`);
