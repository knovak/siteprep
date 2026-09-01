import {
  activateImportedJsonDataset,
  importJsonDatasetObject,
} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';

const ATLAS = Object.freeze({
  name: 'FES2022b_OceanTide_NSgrid.nc',
  bytes: 3_953_139_340,
  sha256: '6479dbd9acdfb63405ff15de1265154c4659b1f7112b8dfb1cabef945a481a23',
});

function datasetFromHeaders(request) {
  return {
    id: request.headers.get('x-tide-dataset-id'),
    version: request.headers.get('x-tide-dataset-version'),
    schema: request.headers.get('x-tide-dataset-schema'),
    preparedAt: request.headers.get('x-tide-dataset-prepared-at'),
  };
}

function validateGlobalDataset(dataset) {
  const atlas = dataset?.sourceFiles?.find(file => file?.name === ATLAS.name);
  if (!dataset?.id?.startsWith('fes2022b-global-coast')
      || dataset.schema !== 'tide-here/fes-prepared-dataset/v2'
      || dataset.dataClass !== 'licensed-source'
      || dataset.isFes2022 !== true
      || !dataset.sourceUrl || !dataset.licenceUrl || !dataset.disclaimer
      || dataset.sampling?.pointCount < 1_000
      || atlas?.bytes !== ATLAS.bytes || atlas?.sha256 !== ATLAS.sha256) {
    throw new Error('The imported dataset is not a checksum-recorded global FES2022 coastal package');
  }
  return dataset;
}

function importedRegistry(dataset) {
  const safeVersion = dataset.version.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  return {
    ...stageFourProviderRegistry,
    version: `stage-4-global-${safeVersion}`,
    preparedAt: dataset.preparedAt,
    providers: stageFourProviderRegistry.providers.map(provider => (
      provider.id === 'fes2022'
        ? {
            ...provider,
            dataRef: {
              id: dataset.id,
              version: dataset.version,
              verification: 'manifest-and-selected-objects',
            },
            attribution: dataset.attribution,
          }
        : {...provider}
    )),
  };
}

async function validateInventory(store, dataset, objects) {
  const byName = new Map(objects.map(object => [object.name, object]));
  const key = `tide-data/datasets/${dataset.id}/${dataset.version}/tile-index.json`;
  const stored = await store.get(key);
  let index;
  try {
    index = JSON.parse(stored?.body ?? '');
  } catch {
    throw new Error('The imported FES tile index is invalid');
  }
  if (index?.schema !== 'tide-here/fes-tile-index/v1'
      || index.dataset?.id !== dataset.id
      || index.dataset?.version !== dataset.version
      || !Array.isArray(index.inventory) || index.inventory.length === 0) {
    throw new Error('The imported FES tile index does not match the dataset');
  }
  const declared = new Set(['tile-index']);
  for (const entry of index.inventory) {
    if (!entry?.objectName || declared.has(entry.objectName)
        || byName.get(entry.objectName)?.sha256 !== entry.sha256) {
      throw new Error('The imported FES tile inventory is incomplete or inconsistent');
    }
    declared.add(entry.objectName);
  }
  if (declared.size !== byName.size || [...byName.keys()].some(name => !declared.has(name))) {
    throw new Error('The imported FES package contains undeclared objects');
  }
}

export async function importFesDataset({request, url, store, now = () => new Date()}) {
  if (url.pathname === '/import/object') {
    const dataset = datasetFromHeaders(request);
    const name = url.searchParams.get('name');
    return importJsonDatasetObject(store, {
      dataset,
      name,
      body: await request.text(),
      checksum: request.headers.get('x-tide-sha256'),
    });
  }
  if (url.pathname === '/import/activate') {
    const payload = await request.json();
    const dataset = validateGlobalDataset(payload?.dataset);
    if (!Array.isArray(payload?.objects)) throw new Error('The imported FES object inventory is required');
    await validateInventory(store, dataset, payload.objects);
    const imported = await activateImportedJsonDataset(store, payload, {now});
    const registry = await initializeProviderRegistry(store, importedRegistry(dataset), {now});
    return {dataset: imported, registry};
  }
  throw new Error('Unknown dataset import route');
}

