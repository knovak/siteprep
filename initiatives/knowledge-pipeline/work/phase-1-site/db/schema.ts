import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const authorizedUser = sqliteTable(
  'authorized_user',
  {
    id: text('id').primaryKey(),
    normalizedEmail: text('normalized_email').notNull(),
    siteUserId: text('site_user_id'),
    role: text('role', { enum: ['admin', 'user'] }).notNull(),
    createdAt: text('created_at').notNull(),
    createdByActorId: text('created_by_actor_id').notNull(),
    disabledAt: text('disabled_at'),
  },
  (table) => [
    uniqueIndex('idx_authorized_user_email').on(table.normalizedEmail),
    uniqueIndex('idx_authorized_user_site_id').on(table.siteUserId),
  ],
);

export const actor = sqliteTable(
  'actor',
  {
    id: text('id').primaryKey(),
    authorizedUserId: text('authorized_user_id').notNull(),
    normalizedEmail: text('normalized_email').notNull(),
    siteUserId: text('site_user_id').notNull(),
    role: text('role', { enum: ['admin', 'user'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_actor_authorized_user').on(table.authorizedUserId), uniqueIndex('idx_actor_site_user').on(table.siteUserId)],
);

export const collection = sqliteTable(
  'collection',
  {
    id: text('id').primaryKey(),
    ownerActorId: text('owner_actor_id').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    state: text('state', { enum: ['active', 'tombstoned', 'erased'] }).notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    tombstonedAt: text('tombstoned_at'),
    erasedAt: text('erased_at'),
  },
  (table) => [
    uniqueIndex('idx_collection_owner_name').on(table.ownerActorId, table.normalizedName),
    index('idx_collection_owner_state').on(table.ownerActorId, table.state),
  ],
);

export const actorState = sqliteTable('actor_state', {
  actorId: text('actor_id').primaryKey(),
  selectedCollectionId: text('selected_collection_id'),
  selectionRevision: integer('selection_revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const activity = sqliteTable(
  'activity',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id'),
    actorId: text('actor_id').notNull(),
    type: text('type').notNull(),
    status: text('status', { enum: ['completed', 'failed'] }).notNull(),
    createdAt: text('created_at').notNull(),
    detailsJson: text('details_json').notNull(),
  },
  (table) => [index('idx_activity_collection_created').on(table.collectionId, table.createdAt)],
);

export const receipt = sqliteTable(
  'receipt',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    activityId: text('activity_id').notNull(),
    operationId: text('operation_id').notNull(),
    packageHash: text('package_hash').notNull(),
    mode: text('mode').notNull(),
    createdAt: text('created_at').notNull(),
    resultJson: text('result_json').notNull(),
  },
  (table) => [uniqueIndex('idx_receipt_collection_operation').on(table.collectionId, table.operationId)],
);

export const backup = sqliteTable(
  'backup',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    actorId: text('actor_id').notNull(),
    objectKey: text('object_key').notNull(),
    packageId: text('package_id').notNull(),
    contentHash: text('content_hash').notNull(),
    byteSize: integer('byte_size').notNull(),
    state: text('state', { enum: ['accepted', 'failed', 'retained'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_backup_collection_created').on(table.collectionId, table.createdAt)],
);

export const asset = sqliteTable('asset', {
  id: text('id').primaryKey(),
  objectKey: text('object_key').notNull(),
  contentHash: text('content_hash').notNull(),
  byteSize: integer('byte_size').notNull(),
  mediaType: text('media_type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const collectionAssetRef = sqliteTable(
  'collection_asset_ref',
  {
    collectionId: text('collection_id').notNull(),
    assetId: text('asset_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_collection_asset_ref').on(table.collectionId, table.assetId), index('idx_asset_collection_ref').on(table.assetId)],
);

export const importPreview = sqliteTable(
  'import_preview',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    collectionId: text('collection_id').notNull(),
    selectionRevision: integer('selection_revision').notNull(),
    collectionRevision: integer('collection_revision').notNull(),
    packageHash: text('package_hash').notNull(),
    intakeKind: text('intake_kind'),
    operationsJson: text('operations_json'),
    findingsJson: text('findings_json'),
    state: text('state', { enum: ['pending', 'committed', 'invalidated'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_import_preview_actor_state').on(table.actorId, table.state)],
);

export const sourceRecord = sqliteTable(
  'source_record',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    canonicalKey: text('canonical_key').notNull(),
    currentVersionId: text('current_version_id'),
    state: text('state', { enum: ['active', 'archived'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_source_collection_key').on(table.collectionId, table.canonicalKey),
    index('idx_source_collection_state').on(table.collectionId, table.state),
  ],
);

export const sourceVersion = sqliteTable(
  'source_version',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    contentHash: text('content_hash').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    sourceKind: text('source_kind').notNull(),
    bodyState: text('body_state').notNull(),
    rightsState: text('rights_state').notNull(),
    captureState: text('capture_state').notNull(),
    sourceUpdatedAt: text('source_updated_at'),
    contentJson: text('content_json').notNull(),
    createdByActorId: text('created_by_actor_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_source_version_hash').on(table.sourceId, table.contentHash),
    index('idx_source_version_created').on(table.sourceId, table.createdAt),
  ],
);

export const externalAlias = sqliteTable(
  'external_alias',
  {
    collectionId: text('collection_id').notNull(),
    sourceId: text('source_id').notNull(),
    namespace: text('namespace').notNull(),
    aliasKey: text('alias_key').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_external_alias_identity').on(table.collectionId, table.namespace, table.aliasKey),
    index('idx_external_alias_source').on(table.sourceId),
  ],
);

export const sourceTag = sqliteTable(
  'source_tag',
  {
    sourceId: text('source_id').notNull(),
    label: text('label').notNull(),
    tagKey: text('tag_key').notNull(),
    status: text('status', { enum: ['accepted', 'proposed'] }).notNull(),
    type: text('type').notNull(),
    stage: text('stage').notNull(),
    createdAt: text('created_at').notNull(),
    archivedAt: text('archived_at'),
  },
  (table) => [
    uniqueIndex('idx_source_tag_identity').on(table.sourceId, table.tagKey, table.status, table.stage),
    index('idx_source_tag_inventory').on(table.tagKey, table.status, table.stage, table.archivedAt),
  ],
);

export const dependencyProposal = sqliteTable(
  'dependency_proposal',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    sourceId: text('source_id').notNull(),
    relationType: text('relation_type').notNull(),
    targetNamespace: text('target_namespace').notNull(),
    targetKey: text('target_key').notNull(),
    state: text('state', { enum: ['proposed', 'accepted', 'rejected'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_dependency_proposal_identity').on(table.sourceId, table.relationType, table.targetNamespace, table.targetKey),
    index('idx_dependency_proposal_collection_state').on(table.collectionId, table.state),
  ],
);

export const workPacket = sqliteTable(
  'work_packet',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    actorId: text('actor_id').notNull(),
    selectionRevision: integer('selection_revision').notNull(),
    collectionRevision: integer('collection_revision').notNull(),
    packageHash: text('package_hash').notNull(),
    packageJson: text('package_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_work_packet_collection_created').on(table.collectionId, table.createdAt)],
);

export const proposalReview = sqliteTable(
  'proposal_review',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    actorId: text('actor_id').notNull(),
    workPacketId: text('work_packet_id').notNull(),
    proposalId: text('proposal_id').notNull(),
    proposalJson: text('proposal_json').notNull(),
    previewJson: text('preview_json').notNull(),
    state: text('state', {enum: ['pending', 'committed', 'invalidated']}).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_proposal_review_collection_state').on(table.collectionId, table.state, table.createdAt)],
);

export const reviewRecord = sqliteTable(
  'review_record',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    sourceId: text('source_id'),
    sourceVersionHash: text('source_version_hash'),
    kind: text('kind', {enum: ['tag', 'assessment', 'promotion', 'vocabulary']}).notNull(),
    payloadJson: text('payload_json').notNull(),
    rationale: text('rationale').notNull(),
    proposedByJson: text('proposed_by_json').notNull(),
    processVersion: text('process_version').notNull(),
    acceptedByActorId: text('accepted_by_actor_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_review_record_collection_kind').on(table.collectionId, table.kind, table.createdAt),
    index('idx_review_record_source').on(table.sourceId, table.createdAt),
  ],
);
