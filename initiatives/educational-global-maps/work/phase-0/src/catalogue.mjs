import {finding} from './findings.mjs';

const ID = /^[a-z][a-z0-9-]*(?::[a-z0-9][a-z0-9._-]*)+$/u;
const PROFILES = new Set(['country-time-series', 'subnational-time-series', 'city-points', 'flows', 'raster-frames']);
const PLACE_LEVELS = new Set(['country', 'state', 'county', 'city', 'point', 'grid']);

const array = (value) => Array.isArray(value) ? value : [];
const presentString = (value) => typeof value === 'string' && value.trim().length > 0;

export function validateDescriptor(descriptor) {
  const findings = [];
  const required = [
    ['$.id', descriptor?.id],
    ['$.version', descriptor?.version],
    ['$.title', descriptor?.title],
    ['$.description', descriptor?.description],
    ['$.provider.id', descriptor?.provider?.id],
    ['$.provider.label', descriptor?.provider?.label],
    ['$.measure.name', descriptor?.measure?.name],
    ['$.measure.unit', descriptor?.measure?.unit],
    ['$.distribution.sourceUrl', descriptor?.distribution?.sourceUrl],
    ['$.distribution.sourceVersion', descriptor?.distribution?.sourceVersion],
    ['$.distribution.retrievedAt', descriptor?.distribution?.retrievedAt],
  ];
  if (descriptor?.schemaVersion !== 1) findings.push(finding('descriptor.version.unsupported', '$.schemaVersion', 'Descriptor schemaVersion must be 1'));
  for (const [path, value] of required) if (!presentString(value)) findings.push(finding('descriptor.required', path, `${path} is required`));
  if (presentString(descriptor?.id) && !ID.test(descriptor.id)) findings.push(finding('descriptor.id.invalid', '$.id', 'Descriptor id must be namespaced and stable'));
  if (!PROFILES.has(descriptor?.profile)) findings.push(finding('descriptor.profile.invalid', '$.profile', 'Profile is not supported'));
  if (!array(descriptor?.topics).length) findings.push(finding('descriptor.topics.empty', '$.topics', 'At least one topic is required'));
  if (!array(descriptor?.placeLevels).length || array(descriptor?.placeLevels).some((level) => !PLACE_LEVELS.has(level))) {
    findings.push(finding('descriptor.place_level.invalid', '$.placeLevels', 'Place levels must use the controlled vocabulary'));
  }
  if (!presentString(descriptor?.timeCoverage?.start) || !presentString(descriptor?.timeCoverage?.end)) {
    findings.push(finding('descriptor.time_coverage.invalid', '$.timeCoverage', 'Start and end must remain explicit'));
  }
  if (!array(descriptor?.projectionCapabilities).length) {
    findings.push(finding('descriptor.projection_capability.empty', '$.projectionCapabilities', 'At least one projection capability is required'));
  }
  if (!presentString(descriptor?.rights?.status)) findings.push(finding('rights.status.missing', '$.rights.status', 'Rights status must be explicit'));
  if (!presentString(descriptor?.rights?.licenseId)) findings.push(finding('rights.license.missing', '$.rights.licenseId', 'Licence identity must be explicit'));
  if (!presentString(descriptor?.rights?.sourceUrl)) findings.push(finding('rights.source.missing', '$.rights.sourceUrl', 'Rights source URL must be recorded'));
  if (descriptor?.rights?.status !== 'allowed') {
    findings.push(finding('rights.artifact.blocked', '$.rights.status', 'Metadata may be listed, but its artifact may not be published', 'warning'));
  }
  return findings;
}

function catalogueRecord(descriptor) {
  const fields = [descriptor.title, descriptor.description, descriptor.provider.label, descriptor.measure.name, ...descriptor.topics, ...descriptor.placeLevels];
  return Object.freeze({
    id: descriptor.id,
    version: descriptor.version,
    title: descriptor.title,
    description: descriptor.description,
    providerId: descriptor.provider.id,
    providerLabel: descriptor.provider.label,
    topics: [...descriptor.topics],
    placeLevels: [...descriptor.placeLevels],
    timeCoverage: {...descriptor.timeCoverage},
    profile: descriptor.profile,
    licence: descriptor.rights.licenseId,
    rightsStatus: descriptor.rights.status,
    projectionCapabilities: [...descriptor.projectionCapabilities],
    searchText: fields.join(' ').normalize('NFC').toLocaleLowerCase('en-US'),
  });
}

export function buildCatalogue(descriptors) {
  const findings = [];
  const seen = new Set();
  const records = [];
  for (const [index, descriptor] of descriptors.entries()) {
    const current = validateDescriptor(descriptor).map((item) => ({...item, path: `$[${index}]${item.path.slice(1)}`}));
    findings.push(...current);
    const key = `${descriptor?.id}@${descriptor?.version}`;
    if (seen.has(key)) findings.push(finding('catalogue.identity.duplicate', `$[${index}].id`, `Duplicate catalogue identity ${key}`));
    seen.add(key);
    if (!current.some(({severity}) => severity === 'error')) records.push(catalogueRecord(descriptor));
  }
  records.sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
  return Object.freeze({records: Object.freeze(records), findings: Object.freeze(findings)});
}

function requested(recordValues, selected) {
  const wanted = array(selected);
  return !wanted.length || wanted.every((value) => recordValues.includes(value));
}

export function searchCatalogue(catalogue, query = {}) {
  const text = String(query.text ?? '').trim().normalize('NFC').toLocaleLowerCase('en-US');
  return catalogue.records.filter((record) => {
    if (text && !record.searchText.includes(text)) return false;
    if (!requested(record.topics, query.topics)) return false;
    if (!requested([record.providerId], query.providers)) return false;
    if (!requested(record.placeLevels, query.placeLevels)) return false;
    if (!requested([record.profile], query.profiles)) return false;
    if (!requested([record.licence], query.licences)) return false;
    if (!requested(record.projectionCapabilities, query.projectionCapabilities)) return false;
    if (query.coverageStart && record.timeCoverage.end < query.coverageStart) return false;
    if (query.coverageEnd && record.timeCoverage.start > query.coverageEnd) return false;
    return true;
  });
}

export function descriptorDetail(descriptor) {
  const field = (value) => value === undefined ? {state: 'unknown', value: null} : value === null ? {state: 'absent', value: null} : {state: 'known', value};
  return Object.freeze({
    id: descriptor.id,
    version: descriptor.version,
    title: descriptor.title,
    definition: field(descriptor.measure?.definition),
    unit: field(descriptor.measure?.unit),
    source: field(descriptor.distribution?.sourceUrl),
    licence: field(descriptor.rights?.licenseId),
    coverage: field(descriptor.timeCoverage),
    gaps: field(descriptor.gaps),
    access: field(descriptor.distribution?.access),
    transformations: field(descriptor.transformations),
    renderability: field(descriptor.renderability),
  });
}

export function generateScaleDescriptors(count = 500) {
  const topics = ['population', 'climate', 'health', 'education', 'mobility'];
  const providers = ['fixture-alpha', 'fixture-beta', 'fixture-gamma', 'fixture-delta'];
  const profiles = [...PROFILES];
  const levels = ['country', 'state', 'city', 'point', 'grid'];
  return Array.from({length: count}, (_, index) => {
    const topic = topics[index % topics.length];
    const provider = providers[index % providers.length];
    const profile = profiles[index % profiles.length];
    const level = levels[index % levels.length];
    return {
      schemaVersion: 1,
      id: `dataset:scale-${String(index).padStart(3, '0')}`,
      version: 'fixture-1',
      title: `Scale ${topic} descriptor ${String(index).padStart(3, '0')}`,
      description: `Metadata-only ${profile} fixture for ${topic}`,
      topics: [topic],
      provider: {id: provider, label: provider.replace('-', ' ')},
      placeLevels: [level],
      timeCoverage: {start: String(1900 + (index % 100)), end: String(2000 + (index % 25))},
      profile,
      measure: {name: `${topic} measure`, unit: index % 2 ? 'count' : 'percent', definition: 'Generated deterministic scale metadata.'},
      distribution: {sourceUrl: `https://example.invalid/${provider}/${index}`, sourceVersion: 'fixture-1', retrievedAt: '2026-09-02', access: 'recorded fixture'},
      rights: {status: 'allowed', licenseId: index % 2 ? 'CC0-1.0' : 'CC-BY-4.0', sourceUrl: 'https://example.invalid/rights'},
      projectionCapabilities: index % 3 ? ['equal-area', 'airocean'] : ['equal-area'],
      renderability: {status: 'metadata-only'},
    };
  });
}

export function validateGeography(records) {
  const findings = [];
  const ids = new Set(records.map(({id}) => id));
  const labels = new Map();
  for (const [index, record] of records.entries()) {
    const label = String(record.label ?? '').normalize('NFC').toLocaleLowerCase('en-US');
    if (label) {
      const matches = labels.get(label) ?? [];
      matches.push(record.id);
      labels.set(label, matches);
    }
    if (record.parentId && !ids.has(record.parentId)) findings.push(finding('geography.parent.missing', `$[${index}].parentId`, `Missing parent ${record.parentId}`));
    if (record.validFrom && record.validTo && record.validFrom > record.validTo) findings.push(finding('geography.date.invalid', `$[${index}]`, 'validFrom must not follow validTo'));
  }
  for (const [label, matches] of labels) if (matches.length > 1) findings.push(finding('geography.label.ambiguous', '$', `Label ${label} names ${matches.join(', ')}`, 'warning'));
  return findings;
}

export function validateCrosswalk(entries) {
  const findings = [];
  const accepted = new Map();
  for (const [index, entry] of entries.entries()) {
    if (!presentString(entry.sourceId) || !presentString(entry.targetId) || !presentString(entry.method)) {
      findings.push(finding('crosswalk.required', `$[${index}]`, 'sourceId, targetId, and method are required'));
      continue;
    }
    if (entry.validFrom && entry.validTo && entry.validFrom > entry.validTo) findings.push(finding('crosswalk.date.invalid', `$[${index}]`, 'validFrom must not follow validTo'));
    const key = `${entry.sourceId}|${entry.validFrom ?? ''}|${entry.validTo ?? ''}`;
    const previous = accepted.get(key);
    if (previous && previous !== entry.targetId) findings.push(finding('crosswalk.temporal.conflict', `$[${index}]`, `${entry.sourceId} maps to multiple targets in the same interval`));
    accepted.set(key, entry.targetId);
  }
  return findings;
}
