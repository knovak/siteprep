import {sql} from "drizzle-orm";
import {
  AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const appUsers = sqliteTable("app_users", {
  ownerId: text("owner_id").primaryKey(),
  canEditTemplates: integer("can_edit_templates").notNull().default(0),
}, table => [
  check("app_users_can_edit_templates_check", sql`${table.canEditTemplates} in (0, 1)`),
]);

export const authorizedUser = sqliteTable("authorized_user", {
  email: text("email").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
}, table => [
  check("authorized_user_type_check", sql`${table.type} in ('admin', 'user')`),
  uniqueIndex("idx_authorized_user_user_id").on(table.userId).where(sql`${table.userId} is not null`),
]);

export const selectionHistory = sqliteTable("selection_history", {
  ownerId: text("owner_id").notNull().references(() => appUsers.ownerId, {onDelete: "cascade"}),
  expression: text("expression").notNull(),
  usedAt: text("used_at").notNull(),
}, table => [
  primaryKey({columns: [table.ownerId, table.expression]}),
  index("idx_selection_history_owner_used").on(table.ownerId, table.usedAt),
]);

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => appUsers.ownerId),
  kind: text("kind").notNull(),
  templateId: text("template_id").references((): AnySQLiteColumn => collections.id),
  copiedAt: text("copied_at"),
  createdAt: text("created_at").notNull(),
}, table => [
  check("collections_kind_check", sql`${table.kind} in ('personal', 'private', 'demo-template', 'demo-copy')`),
  uniqueIndex("idx_collections_owner_personal").on(table.ownerId).where(sql`${table.kind} = 'personal'`),
  index("idx_collections_owner_kind_created").on(table.ownerId, table.kind, table.createdAt),
  index("idx_collections_template_id").on(table.templateId).where(sql`${table.templateId} is not null`),
]);

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id, {onDelete: "cascade"}),
  url: text("url").notNull(),
  urlKey: text("url_key").notNull(),
  title: text("title").notNull(),
  titleKey: text("title_key").notNull().default(""),
  note: text("note"),
  addedAt: text("added_at"),
  ingestedAt: text("ingested_at").notNull(),
  verdict: text("verdict"),
  verdictAt: text("verdict_at"),
}, table => [
  uniqueIndex("items_collection_url_key_unique").on(table.collectionId, table.urlKey),
  index("items_collection_added_idx").on(table.collectionId, table.addedAt),
  index("idx_items_collection_untriaged").on(table.collectionId).where(sql`${table.verdict} is null`),
  index("idx_items_collection_title_key").on(table.collectionId, table.titleKey),
]);

export const tags = sqliteTable("tags", {
  itemId: text("item_id").notNull().references(() => items.id, {onDelete: "cascade"}),
  tag: text("tag").notNull(),
}, table => [
  primaryKey({columns: [table.itemId, table.tag]}),
  index("tags_tag_idx").on(table.tag, table.itemId),
]);

export const selections = sqliteTable("selections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  collectionId: text("collection_id").references(() => collections.id, {onDelete: "cascade"}),
  expression: text("expression").notNull(),
});

export const captures = sqliteTable("captures", {
  urlKey: text("url_key").primaryKey(),
  imageRef: text("image_ref"),
  source: text("source").notNull(),
  capturedAt: text("captured_at"),
  imageHash: text("image_hash"),
  state: text("state").notNull(),
  pageTitle: text("page_title"),
  description: text("description"),
  faviconUrl: text("favicon_url"),
  errorTag: text("error_tag"),
  imageCandidate: text("image_candidate"),
  contentType: text("content_type"),
  width: integer("width"),
  height: integer("height"),
  byteSize: integer("byte_size"),
}, table => [
  check("captures_source_check", sql`${table.source} in ('og', 'screenshot', 'none')`),
  index("idx_captures_image_hash").on(table.imageHash).where(sql`${table.imageHash} is not null`),
]);

export const triageSessions = sqliteTable("triage_sessions", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id, {onDelete: "cascade"}),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  itemsJudged: integer("items_judged").notNull().default(0),
  elapsedMs: integer("elapsed_ms"),
});

export const triageActions = sqliteTable("triage_actions", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id, {onDelete: "cascade"}),
  sessionId: text("session_id").notNull().references(() => triageSessions.id, {onDelete: "cascade"}),
  actionKind: text("action_kind").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
  undoneAt: text("undone_at"),
}, table => [
  check("triage_actions_kind_check", sql`${table.actionKind} in ('verdict', 'tag-apply', 'tag-remove')`),
  index("idx_triage_actions_session_active").on(table.sessionId, table.createdAt).where(sql`${table.undoneAt} is null`),
]);

export const captureQueue = sqliteTable("capture_queue", {
  urlKey: text("url_key").primaryKey().references(() => captures.urlKey, {onDelete: "cascade"}),
  reason: text("reason").notNull(),
  state: text("state").notNull(),
  queuedAt: text("queued_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
}, table => [
  check("capture_queue_reason_check", sql`${table.reason} in ('missing-image', 'duplicate-image')`),
  check("capture_queue_state_check", sql`${table.state} in ('queued', 'running', 'complete', 'failed')`),
  index("idx_capture_queue_pending").on(table.queuedAt, table.urlKey).where(sql`${table.state} in ('queued', 'failed')`),
]);
