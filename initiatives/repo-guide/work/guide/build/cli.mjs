#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRepositoryFacts } from './facts.mjs';

function usage() {
  return 'Usage: cli.mjs facts [--root <repository>]';
}

function parseArguments(argv) {
  const args = [...argv];
  const command = args.shift();
  let root;
  while (args.length > 0) {
    const option = args.shift();
    if (option === '--root' && args.length > 0) {
      root = resolve(args.shift());
      continue;
    }
    throw new Error(`Unknown or incomplete option: ${option}\n${usage()}`);
  }
  if (command !== 'facts') throw new Error(usage());
  return { command, root };
}

function defaultRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
}

export async function main(argv = process.argv.slice(2)) {
  const { root = defaultRoot() } = parseArguments(argv);
  const facts = await resolveRepositoryFacts(root);
  process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
