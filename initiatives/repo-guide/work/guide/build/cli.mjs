#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {generateDeck, runDeckBrowserChecks} from './deck.mjs';
import {generateDescription, runDescriptionBrowserChecks} from './description.mjs';
import { resolveRepositoryFacts } from './facts.mjs';
import {generateSimulator, runSimulatorBrowserChecks} from './simulator.mjs';

function usage() {
  return 'Usage: cli.mjs facts [--root <repository>] | description|deck|simulator [--root <repository>] [--output <file>] [--skip-browser-check]';
}

function parseArguments(argv) {
  const args = [...argv];
  const command = args.shift();
  let root;
  let output;
  let browserCheck = true;
  while (args.length > 0) {
    const option = args.shift();
    if (option === '--root' && args.length > 0) {
      root = resolve(args.shift());
      continue;
    }
    if (option === '--output' && args.length > 0) {
      output = resolve(args.shift());
      continue;
    }
    if (option === '--skip-browser-check') {
      browserCheck = false;
      continue;
    }
    throw new Error(`Unknown or incomplete option: ${option}\n${usage()}`);
  }
  if (!['facts', 'description', 'deck', 'simulator'].includes(command)) throw new Error(usage());
  if (command === 'facts' && (output || !browserCheck)) throw new Error(usage());
  return { command, root, output, browserCheck };
}

function defaultRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
}

export async function main(argv = process.argv.slice(2)) {
  const { command, root = defaultRoot(), output, browserCheck } = parseArguments(argv);
  if (command === 'facts') {
    const facts = await resolveRepositoryFacts(root);
    process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
    return;
  }
  const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const outputPath = output || resolve(guideRoot, `out/${command}.html`);
  const generators = {description: generateDescription, deck: generateDeck, simulator: generateSimulator};
  const checks = {description: runDescriptionBrowserChecks, deck: runDeckBrowserChecks, simulator: runSimulatorBrowserChecks};
  const generate = generators[command];
  const check = checks[command];
  const report = await generate({root, outputPath});
  if (browserCheck) {
    const browser = await check({root, outputPath});
    report.browser = {passed: true, output: browser.stdout.trim()};
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
