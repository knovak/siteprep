import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {gzipSync} from 'node:zlib';

import {addBomUtcOffsets, parseBomAnnualBbox, parseBomCoordinates, parseBomDatum} from '../src/bom-annual-pdf.mjs';

const run = promisify(execFile);
const [selectionPath, sourceOutputPath, manifestOutputPath] = process.argv.slice(2);

if (!selectionPath || !sourceOutputPath || !manifestOutputPath) {
  console.error('Usage: node fetch-bom-annual.mjs <selection.json> <source.json.gz> <manifest.json>');
  process.exitCode = 2;
} else {
  const selection = JSON.parse(await readFile(selectionPath, 'utf8'));
  if (selection.schema !== 'tide-here/bom-annual-port-selection/v1' || !Array.isArray(selection.ports)) {
    throw new Error('Unsupported Bureau annual port selection');
  }
  if (!/^\d{4}-bom-v\d+$/.test(selection.datasetVersion ?? '')) {
    throw new Error('Bureau annual port selection requires an immutable datasetVersion');
  }
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'tide-here-bom-'));
  try {
    const sourceFiles = [];
    const ports = [];
    for (const [index, port] of selection.ports.entries()) {
      const response = await fetch(port.sourceUrl, {headers: {'user-agent': 'Tide Here annual tide-table preparation'}});
      if (!response.ok) throw new Error(`${port.sourceUrl} returned HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const checksum = createHash('sha256').update(bytes).digest('hex');
      const pdfPath = join(temporaryDirectory, `${index}.pdf`);
      const bboxPath = join(temporaryDirectory, `${index}.html`);
      await writeFile(pdfPath, bytes);
      await run('pdftotext', ['-bbox', pdfPath, bboxPath]);
      const [{stdout: layoutText}, bboxXml] = await Promise.all([
        run('pdftotext', ['-layout', pdfPath, '-'], {maxBuffer: 10 * 1024 * 1024}),
        readFile(bboxPath, 'utf8'),
      ]);
      const coordinates = parseBomCoordinates(layoutText);
      const datum = parseBomDatum(layoutText);
      let parsedPredictions;
      try {
        parsedPredictions = parseBomAnnualBbox(bboxXml, selection.year);
      } catch (error) {
        throw new Error(`${port.name}: ${error.message}`, {cause: error});
      }
      const predictions = addBomUtcOffsets(parsedPredictions, port.timeZone);
      sourceFiles.push({
        portId: port.id,
        url: port.sourceUrl,
        sha256: checksum,
        bytes: bytes.length,
        predictions: predictions.length,
      });
      ports.push({
        ...port,
        ...coordinates,
        datum,
        predictions,
      });
    }
    const source = {
      schema: 'tide-here/australia-standard-ports-source/v1',
      metadata: {
        datasetId: 'australia-bom-annual-tides',
        datasetVersion: selection.datasetVersion,
        sourceYear: selection.year,
        coverageStart: `${selection.year}-01-01`,
        coverageEnd: `${selection.year}-12-31`,
        preparedAt: selection.preparedAt,
        dataClass: 'licensed-source',
        sourceName: selection.sourceName,
        sourceUrl: selection.sourceUrl,
        attribution: selection.attribution,
        disclaimer: selection.disclaimer,
        licenceReference: selection.licenceReference,
        licenceUrl: selection.licenceUrl,
        sourceFiles,
      },
      ports,
    };
    const manifest = {
      schema: 'tide-here/bom-annual-source-manifest/v1',
      preparedAt: selection.preparedAt,
      year: selection.year,
      datasetVersion: selection.datasetVersion,
      sourceUrl: selection.sourceUrl,
      sourceFiles,
    };
    await Promise.all([
      writeFile(sourceOutputPath, gzipSync(`${JSON.stringify(source)}\n`, {level: 9})),
      writeFile(manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`),
    ]);
    console.log(JSON.stringify({ports: ports.length, predictions: ports.reduce((sum, port) => sum + port.predictions.length, 0)}, null, 2));
  } finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
  }
}
