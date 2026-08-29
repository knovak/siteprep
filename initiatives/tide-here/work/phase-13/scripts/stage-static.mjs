import {copyFile, cp, mkdir, rm} from 'node:fs/promises';

const workRoot = new URL('../../', import.meta.url);
const destination = new URL('site-public/', workRoot);

await rm(destination, {recursive: true, force: true});
await mkdir(destination, {recursive: true});
await copyFile(new URL('index.html', workRoot), new URL('index.html', destination));

const files = [
  'phase-6/app.mjs',
  'phase-6/index.html',
  'phase-6/styles.css',
];
const directories = [
  'phase-0/fixtures',
  'phase-1/data',
  'phase-1/src',
  'phase-2/data',
  'phase-2/src',
  'phase-3/src',
  'phase-4/src',
  'phase-4/vendor',
  'phase-5/data',
  'phase-5/src',
  'phase-6/data',
  'phase-6/src',
  'phase-7/src',
];

for (const relative of files) {
  const target = new URL(relative, destination);
  await mkdir(new URL('./', target), {recursive: true});
  await copyFile(new URL(relative, workRoot), target);
}
for (const relative of directories) {
  await cp(new URL(`${relative}/`, workRoot), new URL(`${relative}/`, destination), {recursive: true});
}
