import {readFile} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonicalJson, parseJsonStrict, sha256} from './canonical.mjs';
import {finding} from './findings.mjs';
import {validateDescriptor, validateCrosswalk, validateGeography} from './catalogue.mjs';

function inside(root, relative, label) {
  const target = resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new TypeError(`${label} must stay inside the contribution directory`);
  return target;
}

async function jsonFile(root, relative, label) {
  return parseJsonStrict(await readFile(inside(root, relative, label), 'utf8'));
}

function errors(findings) {
  return findings.some(({severity}) => severity === 'error');
}

export async function evaluateContribution({descriptor, sourceBytes, adapter, scene, geography = [], crosswalk = []}) {
  const findings = [...validateDescriptor(descriptor), ...validateGeography(geography), ...validateCrosswalk(crosswalk)];
  const sourceHash = sha256(sourceBytes);
  if (descriptor?.distribution?.checksum !== sourceHash) {
    findings.push(finding('source.checksum.changed', '$.distribution.checksum', `Recorded source is ${sourceHash}; descriptor names ${descriptor?.distribution?.checksum ?? 'nothing'}`));
  }
  if (scene?.descriptor?.id !== descriptor?.id || scene?.descriptor?.version !== descriptor?.version) {
    findings.push(finding('scene.descriptor.mismatch', '$.scene.descriptor', 'Example scene must name the exact descriptor revision'));
  }
  if (typeof adapter?.prepare !== 'function' || typeof adapter?.adapterVersion !== 'string') {
    findings.push(finding('adapter.interface.invalid', '$.adapter', 'Adapter must export adapterVersion and prepare'));
  }
  let prepared = null;
  if (!errors(findings)) {
    const priorFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('adapter.network.forbidden'); };
    try {
      prepared = await adapter.prepare(Object.freeze({
        descriptor: structuredClone(descriptor),
        recorded: parseJsonStrict(sourceBytes.toString('utf8')),
      }));
    } catch (error) {
      findings.push(finding(
        String(error?.message).includes('adapter.network.forbidden') ? 'adapter.network.forbidden' : 'adapter.prepare.failed',
        '$.adapter',
        String(error?.message ?? error),
      ));
    } finally {
      globalThis.fetch = priorFetch;
    }
  }
  if (prepared) {
    if (typeof prepared.artifact !== 'string' || !prepared.artifact.endsWith('\n')) findings.push(finding('adapter.artifact.invalid', '$.adapter.artifact', 'Adapter artifact must be newline-terminated UTF-8 JSON Lines'));
    if (prepared.report?.descriptorId !== descriptor.id || prepared.report?.descriptorVersion !== descriptor.version) findings.push(finding('adapter.report.identity', '$.adapter.report', 'Revision report must name the exact descriptor revision'));
  }
  if (descriptor?.rights?.status !== 'allowed') prepared = null;
  if (errors(findings)) prepared = null;
  return {
    findings,
    sourceHash,
    prepared: prepared ? {
      artifact: prepared.artifact,
      artifactHash: sha256(Buffer.from(prepared.artifact, 'utf8')),
      report: {...prepared.report, adapterVersion: adapter.adapterVersion, sourceHash},
    } : null,
  };
}

export async function validateContribution(directory) {
  const root = resolve(directory);
  const manifest = await jsonFile(root, 'contribution.json', 'manifest');
  const descriptor = await jsonFile(root, manifest.descriptor, 'descriptor');
  const sourceBytes = await readFile(inside(root, manifest.source, 'source'));
  const scene = await jsonFile(root, manifest.exampleScene, 'example scene');
  const geography = manifest.geography ? await jsonFile(root, manifest.geography, 'geography') : [];
  const crosswalk = manifest.crosswalk ? await jsonFile(root, manifest.crosswalk, 'crosswalk') : [];
  const adapterPath = inside(root, manifest.adapter, 'adapter');
  const adapter = await import(`${pathToFileURL(adapterPath).href}?source=${encodeURIComponent(sha256(await readFile(adapterPath)))}`);
  const result = await evaluateContribution({descriptor, sourceBytes, adapter, scene, geography, crosswalk});
  const expected = manifest.expectedFindings ? await jsonFile(root, manifest.expectedFindings, 'expected findings') : [];
  const actualCodes = result.findings.map(({code}) => code).sort();
  const expectedCodes = expected.map((item) => typeof item === 'string' ? item : item.code).sort();
  if (canonicalJson(actualCodes) !== canonicalJson(expectedCodes)) {
    result.findings.push(finding('contribution.expected_findings.mismatch', '$.expectedFindings', `Expected ${expectedCodes.join(', ') || 'none'}; found ${actualCodes.join(', ') || 'none'}`));
    result.prepared = null;
  }
  return {manifest, descriptor, scene, ...result};
}
