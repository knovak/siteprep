export const adapterVersion = 'owid-recorded-population/1.0.0';

export function prepare({descriptor, recorded}) {
  const rows = recorded.observations
    .map((row) => ({datasetId: descriptor.id, datasetVersion: descriptor.version, unit: descriptor.measure.unit, ...row}))
    .sort((left, right) => left.placeId.localeCompare(right.placeId));
  return {
    artifact: `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
    report: {
      descriptorId: descriptor.id,
      descriptorVersion: descriptor.version,
      sourceVersion: recorded.source.datasetVersion,
      inputRows: recorded.observations.length,
      outputRows: rows.length,
      transformations: ['selected recorded observations', 'sorted by stable place id']
    }
  };
}
