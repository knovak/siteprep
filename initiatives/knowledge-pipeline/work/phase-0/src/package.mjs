import {canonicalJson, deepClone, parseJsonStrict, sha256} from './canonical.mjs';
import {createWriteStream} from 'node:fs';
import {once} from 'node:events';
import {assertNoErrors, CustodyError, finding} from './findings.mjs';
import {PACKAGE_LIMITS} from './limits.mjs';
import {readZip, utf8, writeZip} from './zip.mjs';
import {trustedPackage, validatePackage} from './validate.mjs';

export async function exportPackageFile(path, pkg) {
  const candidate = trustedPackage(deepClone(pkg));
  const findings = validatePackage(candidate);
  assertNoErrors(findings);
  const manifest = deepClone(candidate);
  const files = {};
  for (const asset of manifest.assets) {
    if (asset.bytes === undefined) continue;
    files[asset.path] = Buffer.from(asset.bytes, 'base64');
    delete asset.bytes;
  }
  files['manifest.json'] = canonicalJson(manifest);
  await writeZip(path, files);
  return {path, packageId: candidate.packageId, findings};
}

export async function readPackageFile(path, limits = PACKAGE_LIMITS) {
  const files = await readZip(path, limits);
  if (!files['manifest.json']) {
    throw new CustodyError([finding('package.manifest.missing', '$', 'manifest.json is required')]);
  }
  if (files['manifest.json'].byteLength > limits.maxManifestBytes) {
    throw new CustodyError([finding('package.manifest.limit', '$.manifest', 'Manifest exceeds the configured byte limit')]);
  }
  let parsed;
  try {
    parsed = parseJsonStrict(utf8(files['manifest.json']));
  } catch (error) {
    throw new CustodyError([
      finding(error.code ?? 'package.manifest.json', error.path ?? '$.manifest', error.message ?? 'Manifest is not valid JSON'),
    ]);
  }
  const candidate = trustedPackage(parsed);
  for (const asset of candidate.assets ?? []) {
    if (asset.redistributable === false) continue;
    const bytes = files[asset.path];
    if (!bytes) {
      throw new CustodyError([finding('asset.file.missing', `$.assets.${asset.path}`, 'Redistributable asset is missing from archive')]);
    }
    if (bytes.byteLength !== asset.size || sha256(bytes) !== asset.hash) {
      throw new CustodyError([finding('asset.file.mismatch', `$.assets.${asset.path}`, 'Asset size or checksum does not match')]);
    }
    asset.bytes = Buffer.from(bytes).toString('base64');
  }
  const findings = validatePackage(candidate, limits);
  assertNoErrors(findings);
  return {package: candidate, findings};
}

async function writeChunk(stream, value) {
  if (!stream.write(value)) await once(stream, 'drain');
}

export async function writeCanonicalManifest(path, pkg) {
  const candidate = trustedPackage(deepClone(pkg));
  const findings = validatePackage(candidate);
  assertNoErrors(findings);
  const stream = createWriteStream(path, {encoding: 'utf8'});
  try {
    await writeChunk(stream, '{"assets":');
    await writeChunk(stream, canonicalJson(candidate.assets));
    await writeChunk(stream, ',"createdAt":');
    await writeChunk(stream, canonicalJson(candidate.createdAt));
    if (candidate.extensions !== undefined) {
      await writeChunk(stream, ',"extensions":');
      await writeChunk(stream, canonicalJson(candidate.extensions));
    }
    await writeChunk(stream, ',"format":');
    await writeChunk(stream, canonicalJson(candidate.format));
    await writeChunk(stream, ',"packageId":');
    await writeChunk(stream, canonicalJson(candidate.packageId));
    await writeChunk(stream, ',"records":{');
    const groups = ['activities', 'entities', 'entityVersions', 'receipts', 'relationships'];
    for (const [groupIndex, group] of groups.entries()) {
      if (groupIndex > 0) await writeChunk(stream, ',');
      await writeChunk(stream, `${canonicalJson(group)}:[`);
      for (const [recordIndex, record] of candidate.records[group].entries()) {
        if (recordIndex > 0) await writeChunk(stream, ',');
        await writeChunk(stream, canonicalJson(record));
      }
      await writeChunk(stream, ']');
    }
    await writeChunk(stream, '},"scope":');
    await writeChunk(stream, canonicalJson(candidate.scope));
    await writeChunk(stream, '}');
    stream.end();
    await once(stream, 'finish');
  } catch (error) {
    stream.destroy();
    throw error;
  }
  return {path, packageId: candidate.packageId, findings};
}
