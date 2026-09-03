import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  compareDistributionTopologies,
  createRepresentativeUseTemplate,
  representativeUseStatus,
} from '../lib/representative-use.mjs';

const destination = resolve(
  process.argv[2] ?? 'representative-use-evidence.json',
);
try {
  await access(destination);
  throw new Error(`Refusing to replace existing evidence file ${destination}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const record = createRepresentativeUseTemplate({
  createdAt: new Date().toISOString(),
});
const output = {
  ...record,
  validation: representativeUseStatus(record),
  distributionComparison: compareDistributionTopologies(record),
};
await mkdir(dirname(destination), {recursive: true});
await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`, {
  flag: 'wx',
});
process.stdout.write(`${destination}\n`);
