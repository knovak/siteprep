export const adapterVersion = 'datacommons-recorded-observations/1.0.0';

export function prepare({descriptor, recorded}) {
  const rows = recorded.observations
    .map((row) => ({
      datasetId: descriptor.id,
      datasetVersion: descriptor.version,
      unit: descriptor.measure.unit,
      provenance: {provider: recorded.source.provider, importName: recorded.source.importName, facetId: recorded.source.facetId, url: recorded.source.provenanceUrl},
      ...row
    }))
    .sort((left, right) => left.placeId.localeCompare(right.placeId));
  return {
    artifact: `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
    report: {
      descriptorId: descriptor.id,
      descriptorVersion: descriptor.version,
      sourceVersion: recorded.source.retrievedAt,
      inputRows: recorded.observations.length,
      outputRows: rows.length,
      transformations: ['selected one documented provenance facet', 'sorted by stable place id']
    }
  };
}
