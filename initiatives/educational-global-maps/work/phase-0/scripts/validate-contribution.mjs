#!/usr/bin/env node
import {validateContribution} from '../src/contribution.mjs';

const directories = process.argv.slice(2);
if (!directories.length) {
  console.error('usage: node scripts/validate-contribution.mjs <contribution-directory>...');
  process.exitCode = 2;
} else {
  let failed = false;
  for (const directory of directories) {
    const result = await validateContribution(directory);
    const errors = result.findings.filter(({severity}) => severity === 'error');
    console.log(`${result.descriptor.id}@${result.descriptor.version}: ${errors.length ? 'FAILED' : 'accepted'}; ${result.findings.length} finding(s); ${result.prepared ? result.prepared.artifactHash : 'metadata only'}`);
    for (const item of result.findings) console.log(`  ${item.severity} ${item.code} ${item.path}: ${item.message}`);
    failed ||= errors.length > 0;
  }
  if (failed) process.exitCode = 1;
}
