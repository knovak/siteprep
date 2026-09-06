import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

// One atomic snapshot per store keeps cluster judgments and Undo all-or-nothing.
export const reviewState = sqliteTable('review_state', {
  storeId: text('store_id').primaryKey(),
  judgments: text('judgments').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
