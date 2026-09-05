import { canonicalJson, sha256 } from './domain.mjs';
import {
  emptyWorkflow,
  synchronizeWorkflow,
  applyWorkflowOperation,
  workflowPackage,
  validateWorkflowPackage,
  restoreWorkflowPackage,
  workflowCounts,
  MAX_WORKFLOW_BYTES,
  MAX_UPLOAD_BYTES,
} from './workflow.mjs';
import {
  runExportCaller,
  restoreAtomically,
  packageIdentity,
} from './recovery.mjs';

export class WorkflowError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

// The same repository executes with real D1 and the SQLite test adapter.
export function workflowStore(db, files, actor) {
  async function selection() {
    const row = await db
      .prepare(
        'SELECT c.*, a.selection_revision FROM collection c JOIN actor_state a ON a.selected_collection_id=c.id WHERE a.actor_id=? AND c.owner_actor_id=? AND c.state=?',
      )
      .bind(actor.id, actor.id, 'active')
      .first();
    if (!row)
      throw new WorkflowError('Select an active collection first.', 404);
    return row;
  }
  async function load(collectionId) {
    const selected = await selection();
    if (selected.id !== collectionId)
      throw new WorkflowError(
        'The selected collection changed. Reload before continuing.',
      );
    const row = await db
      .prepare(
        'SELECT * FROM workflow_snapshot WHERE collection_id=? ORDER BY revision DESC LIMIT 1',
      )
      .bind(collectionId)
      .first();
    let state;
    if (row) state = JSON.parse(row.state_json);
    else {
      state = emptyWorkflow(collectionId);
      // Preserve pre-workspace Harvest records when opening an existing collection.
      const sources = await db
        .prepare(
          'SELECT * FROM source_record WHERE collection_id=? ORDER BY id',
        )
        .bind(collectionId)
        .all();
      for (const source of sources.results) {
        state.harvest.sources.push({
          id: source.id,
          canonicalKey: source.canonical_key,
          state: source.state,
          currentVersionId: source.current_version_id,
          createdAt: source.created_at,
        });
        const versions = await db
          .prepare(
            'SELECT * FROM source_version WHERE source_id=? ORDER BY created_at,id',
          )
          .bind(source.id)
          .all();
        state.harvest.versions.push(
          ...versions.results.map((v) => ({
            id: v.id,
            sourceId: source.id,
            contentHash: v.content_hash,
            content: JSON.parse(v.content_json),
            actorId: v.created_by_actor_id,
            createdAt: v.created_at,
          })),
        );
        const tags = await db
          .prepare('SELECT * FROM source_tag WHERE source_id=?')
          .bind(source.id)
          .all();
        state.harvest.tags.push(
          ...tags.results.map((t) => ({
            sourceId: source.id,
            label: t.label,
            key: t.tag_key,
            status: t.status,
            type: t.type,
            stage: t.stage,
            createdAt: t.created_at,
            archivedAt: t.archived_at,
          })),
        );
      }
      const aliases = await db
        .prepare('SELECT * FROM external_alias WHERE collection_id=?')
        .bind(collectionId)
        .all();
      state.harvest.aliases = aliases.results.map((a) => ({
        sourceId: a.source_id,
        namespace: a.namespace,
        key: a.alias_key,
      }));
      const activities = await db
        .prepare(
          'SELECT * FROM activity WHERE collection_id=? ORDER BY created_at,id',
        )
        .bind(collectionId)
        .all();
      state.harvest.activities = activities.results.map((a) => ({
        id: a.id,
        type: a.type,
        actorId: a.actor_id,
        createdAt: a.created_at,
        details: JSON.parse(a.details_json),
      }));
      const dependencies = await db
        .prepare(
          'SELECT * FROM dependency_proposal WHERE collection_id=? ORDER BY id',
        )
        .bind(collectionId)
        .all();
      state.harvest.dependencyProposals = dependencies.results.map((d) => ({
        id: d.id,
        sourceId: d.source_id,
        type: d.relation_type,
        targetNamespace: d.target_namespace,
        targetKey: d.target_key,
        state: d.state,
        createdAt: d.created_at,
      }));
      const reviews = await db
        .prepare(
          'SELECT * FROM review_record WHERE collection_id=? ORDER BY created_at,id',
        )
        .bind(collectionId)
        .all();
      state.harvest.reviewRecords = reviews.results.map((r) => ({
        id: r.id,
        sourceId: r.source_id,
        sourceVersionHash: r.source_version_hash,
        kind: r.kind,
        payload: JSON.parse(r.payload_json),
        rationale: r.rationale,
        proposedBy: JSON.parse(r.proposed_by_json),
        processVersion: r.process_version,
        acceptedByActorId: r.accepted_by_actor_id,
        createdAt: r.created_at,
      }));
      const receipts = await db
        .prepare(
          'SELECT * FROM receipt WHERE collection_id=? ORDER BY created_at,id',
        )
        .bind(collectionId)
        .all();
      state.harvest.receipts = receipts.results.map((r) => ({
        id: r.id,
        operationId: r.operation_id,
        contentHash: r.package_hash,
        activityId: r.activity_id,
        mode: r.mode,
        result: JSON.parse(r.result_json),
        createdAt: r.created_at,
      }));
      state = synchronizeWorkflow(state);
    }
    return {
      state,
      revision: row?.revision ?? 0,
      createdAt: row?.created_at ?? selected.created_at,
      selectionRevision: selected.selection_revision,
      collectionRevision: selected.revision,
      name: selected.name,
    };
  }
  async function append(collectionId, previous, state, operationId) {
    const encoded = canonicalJson(state);
    if (new TextEncoder().encode(encoded).byteLength > MAX_WORKFLOW_BYTES)
      throw new WorkflowError(
        'Workspace exceeds the bounded acceptance capacity. Export before creating another collection.',
      );
    const hash = await sha256(encoded);
    const at = new Date().toISOString();
    const portable = await workflowPackage(state, previous.name, at);
    if (
      new TextEncoder().encode(canonicalJson(portable)).byteLength >
      MAX_UPLOAD_BYTES - 10000
    ) {
      throw new WorkflowError(
        'This change would exceed the restorable package limit. Export this collection and start another.',
      );
    }
    // One conditional INSERT is the complete commit. Concurrent edits, collection
    // changes, and selection changes cannot expose half an accepted operation.
    const result = await db
      .prepare(
        'INSERT INTO workflow_snapshot (collection_id,revision,operation_id,state_json,content_hash,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM collection c JOIN actor_state a ON a.selected_collection_id=c.id WHERE c.id=? AND c.owner_actor_id=? AND c.state=? AND c.revision=? AND a.actor_id=? AND a.selection_revision=?) AND COALESCE((SELECT MAX(revision) FROM workflow_snapshot WHERE collection_id=?),0)=?',
      )
      .bind(
        collectionId,
        previous.revision + 1,
        operationId,
        encoded,
        hash,
        at,
        collectionId,
        actor.id,
        'active',
        previous.collectionRevision,
        actor.id,
        previous.selectionRevision,
        collectionId,
        previous.revision,
      )
      .run();
    if (Number(result.meta.changes) !== 1)
      throw new WorkflowError(
        'This collection or selection changed. Reload and review the current state.',
      );
    return { revision: previous.revision + 1, hash, createdAt: at };
  }
  function checkPreview(loaded, input) {
    if (
      loaded.revision !== input.revision ||
      loaded.selectionRevision !== input.selectionRevision
    )
      throw new WorkflowError(
        'This page is stale. Reload before approving a change.',
      );
  }
  async function mutate(collectionId, input) {
    const loaded = await load(collectionId);
    const duplicate = loaded.state.operations.some(
      (o) => o.id === input.operationId,
    );
    if (duplicate) return { duplicate: true };
    checkPreview(loaded, input);
    const result = await applyWorkflowOperation(loaded.state, input, actor);
    return append(collectionId, loaded, result.state, input.operationId);
  }
  async function exportCollection(collectionId, caller, operationId) {
    if (caller === 'admin' && actor.role !== 'admin')
      throw new WorkflowError(
        'Administrator export requires an administrator.',
        403,
      );
    const loaded = await load(collectionId);
    const id =
      'export:' +
      (await sha256(actor.id + ':' + collectionId + ':' + operationId)).slice(
        7,
        39,
      );
    const existing = await db
      .prepare('SELECT * FROM workflow_export WHERE id=? AND actor_id=?')
      .bind(id, actor.id)
      .first();
    if (existing)
      return {
        id,
        packageHash: existing.content_hash,
        bytes: existing.byte_size,
        duplicate: true,
      };
    const pkg = await workflowPackage(
      loaded.state,
      loaded.name,
      loaded.createdAt,
    );
    const bytes = new TextEncoder().encode(canonicalJson(pkg));
    // Per-attempt staging prevents a losing concurrent retry from deleting the
    // successful attempt's object after the export id's unique constraint fires.
    const objectKey =
      'workflow/' + actor.id + '/' + id + '/' + crypto.randomUUID();
    const contentHash = await sha256(bytes);
    await runExportCaller({
      caller,
      context: { actorId: actor.id, role: actor.role },
      requestedScope: pkg.scope,
      operationId,
      exportsByOperation: new Map(),
      exportScope: async () => pkg,
      storeAccepted: async ({ receipt }) => {
        await files.put(objectKey, bytes);
        try {
          const selected = await selection();
          if (
            selected.id !== collectionId ||
            selected.selection_revision !== loaded.selectionRevision
          )
            throw new WorkflowError('Selection changed during export.');
          await db
            .prepare(
              'INSERT INTO workflow_export (id,collection_id,actor_id,object_key,content_hash,byte_size,package_id,caller,receipt_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              id,
              collectionId,
              actor.id,
              objectKey,
              contentHash,
              bytes.byteLength,
              pkg.packageId,
              caller,
              canonicalJson(receipt),
              new Date().toISOString(),
            )
            .run();
        } catch (error) {
          await files.delete(objectKey);
          throw error;
        }
        return { objectKey };
      },
    });
    return {
      id,
      packageId: pkg.packageId,
      packageHash: contentHash,
      bytes: bytes.byteLength,
    };
  }
  async function readExport(id) {
    const row = await db
      .prepare(
        'SELECT e.* FROM workflow_export e JOIN collection c ON c.id=e.collection_id WHERE e.id=? AND e.actor_id=? AND c.owner_actor_id=? AND c.state=?',
      )
      .bind(id, actor.id, actor.id, 'active')
      .first();
    if (!row) throw new WorkflowError('Export is unavailable.', 404);
    const object = await files.get(row.object_key);
    if (!object) throw new WorkflowError('Export object is unavailable.', 404);
    const bytes = new Uint8Array(await object.arrayBuffer());
    if ((await sha256(bytes)) !== row.content_hash)
      throw new WorkflowError('Stored export checksum does not match.');
    return { bytes, row };
  }
  async function previewRestore(collectionId, pkg, input) {
    const loaded = await load(collectionId);
    checkPreview(loaded, input);
    if (
      loaded.state.harvest.sources.length ||
      loaded.state.topics.entities.length
    )
      throw new WorkflowError(
        'Restore requires an empty destination collection.',
      );
    const state = await validateWorkflowPackage(pkg);
    const id = 'restore:' + crypto.randomUUID();
    const bytes = new TextEncoder().encode(canonicalJson(pkg));
    const objectKey = 'workflow-staging/' + actor.id + '/' + id;
    const hash = await sha256(bytes);
    await files.put(objectKey, bytes);
    try {
      await db
        .prepare(
          'INSERT INTO workflow_restore_preview (id,collection_id,actor_id,object_key,content_hash,revision,selection_revision,created_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          collectionId,
          actor.id,
          objectKey,
          hash,
          loaded.revision,
          loaded.selectionRevision,
          new Date().toISOString(),
        )
        .run();
    } catch (error) {
      await files.delete(objectKey);
      throw error;
    }
    return {
      id,
      packageId: pkg.packageId,
      sourceName: pkg.extensions['siteprep:collection'].name,
      sourceCollectionId: state.collectionId,
      destinationName: loaded.name,
      destinationCollectionId: collectionId,
      packageHash: hash,
      counts: workflowCounts(state),
      owner:
        'The signed-in destination owner. Historical authors remain unchanged.',
    };
  }
  async function commitRestore(collectionId, id) {
    const loaded = await load(collectionId);
    if (loaded.state.operations.some((o) => o.id === id))
      return { duplicate: true };
    const preview = await db
      .prepare(
        'SELECT * FROM workflow_restore_preview WHERE id=? AND collection_id=? AND actor_id=?',
      )
      .bind(id, collectionId, actor.id)
      .first();
    if (!preview)
      throw new WorkflowError('Restore preview is unavailable.', 404);
    checkPreview(loaded, {
      revision: preview.revision,
      selectionRevision: preview.selection_revision,
    });
    if (
      loaded.state.harvest.sources.length ||
      loaded.state.topics.entities.length
    )
      throw new WorkflowError('Restore destination is no longer empty.');
    const object = await files.get(preview.object_key);
    if (!object)
      throw new WorkflowError(
        'Staged restore package is unavailable. Preview it again.',
      );
    const bytes = new Uint8Array(await object.arrayBuffer());
    if ((await sha256(bytes)) !== preview.content_hash)
      throw new WorkflowError('Staged restore checksum does not match.');
    const pkg = JSON.parse(new TextDecoder().decode(bytes));
    const assetKeys = [];
    const restoreAttempt = crypto.randomUUID();
    let accepted;
    await restoreAtomically({
      pkg,
      expectedHash: await packageIdentity(pkg),
      createStage: async () => ({
        writeCollection: async () => {
          accepted = await restoreWorkflowPackage(pkg, collectionId);
          for (const asset of accepted.assets) {
            const key =
              'workflow-assets/' +
              collectionId +
              '/' +
              id +
              '/' +
              restoreAttempt +
              '/' +
              asset.id;
            assetKeys.push(key);
            await files.put(key, new TextEncoder().encode(asset.text));
            const retained = await files.get(key);
            if (
              !retained ||
              (await sha256(new Uint8Array(await retained.arrayBuffer()))) !==
                (await sha256(new TextEncoder().encode(asset.text)))
            )
              throw new WorkflowError(
                'Restored asset checksum does not match.',
              );
          }
        },
      }),
      commitStage: async () => {
        accepted.operations.push({
          id,
          type: 'restore',
          actor,
          createdAt: new Date().toISOString(),
          sourcePackageId: pkg.packageId,
          sourceHash: preview.content_hash,
        });
        return append(collectionId, loaded, accepted, id);
      },
      abortStage: async () => {
        for (const key of assetKeys) await files.delete(key);
      },
    });
    await files.delete(preview.object_key);
    await db
      .prepare('DELETE FROM workflow_restore_preview WHERE id=? AND actor_id=?')
      .bind(id, actor.id)
      .run();
    return {
      status: 'completed',
      counts: workflowCounts(accepted),
      sourceHash: preview.content_hash,
      restoredAssetObjects: assetKeys.length,
    };
  }
  return {
    load,
    mutate,
    exportCollection,
    readExport,
    previewRestore,
    commitRestore,
  };
}
