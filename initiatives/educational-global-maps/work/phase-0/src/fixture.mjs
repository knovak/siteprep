import {sha256} from './canonical.mjs';

export const FIXED_TIME = '2026-09-01T00:00:00.000Z';

function asset(id, path, mediaType, text, rights = 'Project-authored CC0 fixture', redistributable = true) {
  const bytes = Buffer.from(text, 'utf8');
  return {
    id,
    path,
    mediaType,
    size: bytes.byteLength,
    hash: sha256(bytes),
    redistributable,
    rights,
    ...(redistributable ? {bytes: bytes.toString('base64')} : {}),
  };
}

function descriptor(id, title, profile) {
  return {
    schema: 'educational-global-maps/dataset-descriptor/v1',
    id,
    content: {
      title,
      provider: 'Siteprep synthetic fixture',
      sourceUrl: 'https://example.invalid/educational-global-maps-fixture',
      rights: {licence: 'CC0-1.0', attribution: 'Siteprep synthetic fixture', snapshotPermitted: true},
      measure: {name: title, unit: profile === 'points-events' ? 'event' : 'index', valueType: 'number'},
      space: {levels: profile === 'points-events' ? ['city'] : ['country'], coverage: 'synthetic-world'},
      time: {start: '2020', end: '2025', resolution: 'year', semantics: 'measured'},
      access: [{kind: 'recorded-fixture', mediaType: profile === 'raster-frame' ? 'image/png' : 'application/x-ndjson'}],
      version: {descriptor: 1, source: 'synthetic-v1'},
      capabilities: {profiles: [profile], projections: profile === 'raster-frame' ? ['equal-earth'] : ['equal-earth', 'airocean', 'population-cartogram']},
    },
  };
}

function prepared(id, descriptorRef, artifactRef) {
  return {
    schema: 'educational-global-maps/prepared-revision/v1',
    id,
    content: {
      descriptorRef,
      upstreamVersion: 'synthetic-v1',
      preparedAt: FIXED_TIME,
      preparation: {adapter: 'synthetic/1', transformations: ['none']},
      geographyRef: 'geography:synthetic-world-v1',
      artifactRefs: [artifactRef],
      measure: {unit: 'index'},
      time: {periods: ['2020', '2025'], statuses: ['measured', 'missing', 'suppressed', 'zero']},
      rights: {snapshotPermitted: true, attribution: 'Siteprep synthetic fixture'},
    },
  };
}

function layer(id, profile, revision, artifactRef, projections) {
  return {
    schema: 'educational-global-maps/layer/v1',
    id,
    content: {
      profile,
      preparedRevisionRef: revision,
      geographyRef: 'geography:synthetic-world-v1',
      artifactRef,
      encoding: profile === 'origin-destination-flow' ? 'directed-arcs' : profile === 'raster-frame' ? 'raster-frame' : 'color-and-symbol',
      statusSemantics: ['measured', 'zero', 'missing', 'suppressed'],
      projections,
    },
  };
}

export function makeMinimumFixture() {
  const assets = [
    asset('asset:world-geometry-v1', 'assets/world.geojson', 'application/geo+json', '{"type":"FeatureCollection","features":[]}'),
    asset('asset:scalar-v1', 'assets/scalar.jsonl', 'application/x-ndjson', '{"place":"place:aaa","period":"2020","value":1,"status":"measured"}\n{"place":"place:bbb","period":"2025","value":null,"status":"missing"}\n'),
    asset('asset:flow-v1', 'assets/flow.jsonl', 'application/x-ndjson', '{"origin":"place:aaa","destination":"place:bbb","period":"2025","value":0,"status":"zero"}\n'),
    asset('asset:points-v1', 'assets/points.jsonl', 'application/x-ndjson', '{"id":"point:one","coordinates":[10,20],"period":"2025","status":"measured"}\n'),
    asset('asset:raster-v1', 'assets/raster.png', 'image/png', 'project-authored-raster-placeholder'),
    asset('asset:restricted-v1', 'references/restricted.remote', 'application/octet-stream', 'not-bundled', 'Metadata-only; redistribution not permitted', false),
  ];
  const descriptors = [
    descriptor('descriptor:scalar-v1', 'Synthetic scalar measure', 'place-time-series'),
    descriptor('descriptor:flow-v1', 'Synthetic movement flow', 'origin-destination-flow'),
    descriptor('descriptor:points-v1', 'Synthetic city events', 'points-events'),
    descriptor('descriptor:raster-v1', 'Synthetic raster frame', 'raster-frame'),
  ];
  const revisions = [
    prepared('revision:scalar-v1', 'descriptor:scalar-v1', 'asset:scalar-v1'),
    prepared('revision:flow-v1', 'descriptor:flow-v1', 'asset:flow-v1'),
    prepared('revision:points-v1', 'descriptor:points-v1', 'asset:points-v1'),
    prepared('revision:raster-v1', 'descriptor:raster-v1', 'asset:raster-v1'),
  ];
  const layers = [
    layer('layer:scalar-v1', 'place-time-series', 'revision:scalar-v1', 'asset:scalar-v1', ['equal-earth', 'airocean', 'population-cartogram']),
    layer('layer:flow-v1', 'origin-destination-flow', 'revision:flow-v1', 'asset:flow-v1', ['equal-earth', 'airocean']),
    layer('layer:points-v1', 'points-events', 'revision:points-v1', 'asset:points-v1', ['equal-earth', 'airocean']),
    layer('layer:raster-v1', 'raster-frame', 'revision:raster-v1', 'asset:raster-v1', ['equal-earth']),
  ];
  const geography = {
    schema: 'educational-global-maps/geography-set/v1',
    id: 'geography:synthetic-world-v1',
    content: {
      title: 'Synthetic source-aware world',
      version: 'v1',
      places: [
        {id: 'place:aaa', namespace: 'synthetic', label: 'A', type: 'country', validFrom: '2020'},
        {id: 'place:bbb', namespace: 'synthetic', label: 'B', type: 'country', validFrom: '2020'},
      ],
      geometryAssetRef: 'asset:world-geometry-v1',
      rights: {licence: 'CC0-1.0'},
    },
  };
  const crosswalk = {
    schema: 'educational-global-maps/crosswalk/v1',
    id: 'crosswalk:synthetic-self-v1',
    content: {
      fromGeographyRef: geography.id,
      toGeographyRef: geography.id,
      method: 'identity-by-reviewed-source-id',
      reviewStatus: 'accepted',
      matches: [{from: 'place:aaa', to: 'place:aaa', validFrom: '2020', confidence: 1}],
    },
  };
  const scene = {
    schema: 'educational-global-maps/scene/v1',
    id: 'scene:minimum-v1',
    content: {
      title: 'Minimum global change scene',
      period: '2025',
      projection: 'equal-earth',
      camera: {center: [0, 0], zoom: 1},
      layers: layers.map(({id}) => id),
      citations: descriptors.map(({id}) => ({descriptorRef: id, source: 'Siteprep synthetic fixture', rights: 'CC0-1.0'})),
      intentRevision: 0,
    },
  };
  const session = {
    schema: 'educational-global-maps/session-snapshot/v1',
    id: 'session:minimum-v1',
    content: {sessionId: 'session:minimum', sceneRef: scene.id, acceptedRevision: 0, state: scene.content},
  };
  const intent = {
    schema: 'educational-global-maps/intent/v1',
    id: 'intent:set-time-v1',
    content: {intentId: 'intent:set-time', sessionId: 'session:minimum', baseRevision: 0, type: 'set-time', payload: {period: '2020'}},
  };
  const spherical = {
    schema: 'educational-global-maps/spherical-report/v1',
    id: 'spherical-report:minimum-v1',
    content: {sceneRef: scene.id, status: 'deferred', findings: ['Direct sphere rendering is outside Phase 0']},
  };
  return {
    rootScene: scene.id,
    objects: [geography, crosswalk, ...descriptors, ...revisions, ...layers, scene, session, intent, spherical],
    assets,
  };
}
