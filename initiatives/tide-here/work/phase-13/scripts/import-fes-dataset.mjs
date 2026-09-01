import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const directory = process.argv[2] ? resolve(process.argv[2]) : null;
const baseUrl = process.argv[3]?.replace(/\/$/, '');
const token = process.env.INIT_TOKEN;
if (!directory || !baseUrl || !token) {
  console.error('Usage: INIT_TOKEN=<secret> node import-fes-dataset.mjs <package-directory> <site-url>');
  process.exitCode = 2;
} else {
  const packageDocument = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  if (packageDocument?.schema !== 'tide-here/fes-upload-package/v1'
      || !packageDocument.dataset || !Array.isArray(packageDocument.objects)) {
    throw new Error('The FES upload package is invalid');
  }
  const request = async (path, options = {}, attempts = 4) => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}${path}`, options);
        const text = await response.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = {error: text};
        }
        if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body?.error ?? 'unknown error'}`);
        return body;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise(done => setTimeout(done, 500 * 2 ** (attempt - 1)));
      }
    }
    throw lastError;
  };
  const authorization = {authorization: `Bearer ${token}`};
  await request('/init', {method: 'POST', headers: authorization});

  let next = 0;
  let complete = 0;
  const upload = async () => {
    while (next < packageDocument.objects.length) {
      const index = next;
      next += 1;
      const object = packageDocument.objects[index];
      const body = await readFile(resolve(directory, object.file), 'utf8');
      const checksum = createHash('sha256').update(body).digest('hex');
      if (checksum !== object.sha256) throw new Error(`Local checksum does not match ${object.name}`);
      await request(`/import/object?name=${encodeURIComponent(object.name)}`, {
        method: 'POST',
        headers: {
          ...authorization,
          'content-type': 'application/json',
          'x-tide-dataset-id': packageDocument.dataset.id,
          'x-tide-dataset-version': packageDocument.dataset.version,
          'x-tide-dataset-schema': packageDocument.dataset.schema,
          'x-tide-dataset-prepared-at': packageDocument.dataset.preparedAt,
          'x-tide-sha256': checksum,
        },
        body,
      });
      complete += 1;
      if (complete % 25 === 0 || complete === packageDocument.objects.length) {
        console.log(JSON.stringify({uploaded: complete, total: packageDocument.objects.length}));
      }
    }
  };
  await Promise.all(Array.from({length: Math.min(6, packageDocument.objects.length)}, upload));
  const activation = await request('/import/activate', {
    method: 'POST',
    headers: {...authorization, 'content-type': 'application/json'},
    body: JSON.stringify({
      dataset: packageDocument.dataset,
      objects: packageDocument.objects.map(({name, sha256}) => ({name, sha256})),
    }),
  });
  const health = await request('/health');
  console.log(JSON.stringify({
    dataset: activation.dataset.dataset,
    registry: health.registry,
    provider: health.providers.find(provider => provider.id === 'fes2022'),
  }, null, 2));
}
