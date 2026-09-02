import {contentIdentity, deepClone} from './canonical.mjs';
import {SceneCoreError, finding} from './findings.mjs';

export function migrateSceneV0(source) {
  if (source?.schema !== 'educational-global-maps/scene/v0') {
    throw new SceneCoreError([finding('migration.source.unsupported', '$.schema', 'Only scene/v0 can migrate to scene/v1')]);
  }
  const target = {
    schema: 'educational-global-maps/scene/v1',
    id: source.id.replace(/-v0$/u, '-v1'),
    content: {
      ...deepClone(source.content),
      camera: {center: [0, 0], zoom: 1},
      intentRevision: 0,
    },
  };
  const sourceIdentity = contentIdentity(source);
  const targetIdentity = contentIdentity(target);
  return {
    target,
    receipt: {
      schema: 'educational-global-maps/migration-receipt/v1',
      id: `migration:${targetIdentity.slice(7, 31)}`,
      sourceIdentity,
      targetIdentity,
      migrator: 'scene-v0-to-v1/1',
    },
  };
}
