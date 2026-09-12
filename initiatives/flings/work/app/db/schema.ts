import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
  foreignKey,
  check,
  index,
} from 'drizzle-orm/sqlite-core';
export const flings = sqliteTable(
  'flings',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    description: text().notNull().default(''),
    defaultZone: text('default_zone').notNull().default('America/Los_Angeles'),
    state: text().notNull().default('open'),
    revision: integer().notNull().default(0),
  },
  (t) => [check('fling_state', sql`${t.state} in ('open','closed')`)],
);
export const organizers = sqliteTable('organizers', {
  id: text().primaryKey(),
  subject: text().notNull().unique(),
  name: text().notNull(),
});
export const assignments = sqliteTable(
  'assignments',
  {
    fling: text()
      .notNull()
      .references(() => flings.id),
    organizer: text()
      .notNull()
      .references(() => organizers.id),
  },
  (t) => [primaryKey({ columns: [t.fling, t.organizer] })],
);
export const members = sqliteTable(
  'members',
  {
    id: text().primaryKey(),
    fling: text()
      .notNull()
      .references(() => flings.id),
    name: text().notNull(),
    email: text().notNull().default(''),
    phone: text().notNull().default(''),
    preference: text().notNull().default('email'),
    state: text().notNull().default('active'),
    generation: integer().notNull().default(0),
    revision: integer().notNull().default(0),
  },
  (t) => [
    unique().on(t.id, t.fling),
    index('members_fling').on(t.fling),
    check('member_state', sql`${t.state} in ('active','removed')`),
    check('preference', sql`${t.preference} in ('email','text','both')`),
  ],
);
export const codes = sqliteTable(
  'codes',
  {
    id: text().primaryKey(),
    member: text().notNull(),
    fling: text().notNull(),
    digest: text().notNull().unique(),
    ciphertext: text(),
    generation: integer().notNull(),
    issued: integer().notNull(),
    firstUsed: integer('first_used'),
    sendUntil: integer('send_until').notNull(),
    expires: integer().notNull(),
    revoked: integer(),
  },
  (t) => [
    foreignKey({
      columns: [t.member, t.fling],
      foreignColumns: [members.id, members.fling],
    }),
    unique().on(t.id, t.member, t.fling),
    index('codes_member_issue').on(t.member, t.issued),
  ],
);
export const sessions = sqliteTable(
  'sessions',
  {
    digest: text().primaryKey(),
    member: text().notNull(),
    fling: text().notNull(),
    code: text().notNull(),
    generation: integer().notNull(),
    created: integer().notNull(),
    expires: integer().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.code, t.member, t.fling],
      foreignColumns: [codes.id, codes.member, codes.fling],
    }),
    index('sessions_code').on(t.code),
  ],
);
export const activities = sqliteTable(
  'activities',
  {
    id: text().primaryKey(),
    fling: text()
      .notNull()
      .references(() => flings.id),
    title: text().notNull(),
    summary: text().notNull(),
    details: text().notNull(),
    state: text().notNull().default('published'),
    position: integer().notNull().default(0),
  },
  (t) => [
    unique().on(t.id, t.fling),
    check(
      'activity_state',
      sql`${t.state} in ('draft','published','cancelled')`,
    ),
  ],
);
export const events = sqliteTable(
  'events',
  {
    id: text().primaryKey(),
    fling: text().notNull(),
    activity: text().notNull(),
    title: text().notNull(),
    starts: text().notNull(),
    ends: text(),
    invitationLocation: text('invitation_location').notNull().default(''),
    locationName: text('location_name').notNull().default(''),
    locationAddress: text('location_address').notNull().default(''),
    locationUrl: text('location_url').notNull().default(''),
    changedAt: integer('changed_at'),
    zone: text().notNull(),
    summary: text().notNull(),
    details: text().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.activity, t.fling],
      foreignColumns: [activities.id, activities.fling],
    }),
    index('events_activity').on(t.activity),
    unique().on(t.id, t.activity, t.fling),
    unique().on(t.id, t.fling),
  ],
);
export const invitations = sqliteTable(
  'invitations',
  {
    member: text().notNull(),
    activity: text().notNull(),
    fling: text().notNull(),
    state: text().notNull(),
    generation: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.member, t.activity] }),
    foreignKey({
      columns: [t.member, t.fling],
      foreignColumns: [members.id, members.fling],
    }),
    foreignKey({
      columns: [t.activity, t.fling],
      foreignColumns: [activities.id, activities.fling],
    }),
    check(
      'invitation_state',
      sql`${t.state} in ('invited','accepted','declined','withdrawn')`,
    ),
  ],
);
export const audit = sqliteTable('audit', {
  id: text().primaryKey(),
  fling: text()
    .notNull()
    .references(() => flings.id),
  actor: text().notNull(),
  revision: integer(),
  action: text().notNull(),
  object: text().notNull(),
  at: integer().notNull(),
});
// A failing CHECK converts a false application precondition into batch rollback.
export const guards = sqliteTable(
  'guards',
  { id: text().primaryKey(), ok: integer().notNull() },
  (t) => [check('required_precondition', sql`${t.ok}=1`)],
);
export const attempts = sqliteTable('attempts', {
  key: text().primaryKey(),
  bucket: integer().notNull(),
  count: integer().notNull(),
});

export const posts = sqliteTable(
  'posts',
  {
    id: text().primaryKey(),
    fling: text()
      .notNull()
      .references(() => flings.id),
    activity: text(),
    event: text(),
    actor: text().notNull(),
    actorKind: text('actor_kind').notNull(),
    author: text().notNull(),
    body: text().notNull(),
    created: integer().notNull(),
    edited: integer(),
    hidden: integer().notNull().default(0),
    revision: integer().notNull().default(0),
  },
  (t) => [
    foreignKey({
      columns: [t.activity, t.fling],
      foreignColumns: [activities.id, activities.fling],
    }),
    foreignKey({
      columns: [t.event, t.activity, t.fling],
      foreignColumns: [events.id, events.activity, events.fling],
    }),
    check(
      'post_event_parent',
      sql`${t.event} IS NULL OR ${t.activity} IS NOT NULL`,
    ),
    check('post_actor_kind', sql`${t.actorKind} IN ('organizer','member')`),
    check('post_hidden', sql`${t.hidden} IN (0,1)`),
  ],
);
export const postHistory = sqliteTable('post_history', {
  id: text().primaryKey(),
  post: text()
    .notNull()
    .references(() => posts.id),
  actor: text().notNull(),
  action: text().notNull(),
  body: text().notNull(),
  reason: text().notNull(),
  at: integer().notNull(),
});
export const polls = sqliteTable(
  'polls',
  {
    id: text().primaryKey(),
    fling: text()
      .notNull()
      .references(() => flings.id),
    activity: text().notNull(),
    event: text().notNull(),
    title: text().notNull(),
    options: text().notNull(),
    multiple: integer().notNull(),
    deadline: integer(),
    closed: integer().notNull().default(0),
    replaces: text(),
    created: integer().notNull(),
  },
  (t) => [
    unique().on(t.id, t.fling),
    foreignKey({
      columns: [t.activity, t.fling],
      foreignColumns: [activities.id, activities.fling],
    }),
    foreignKey({
      columns: [t.event, t.activity, t.fling],
      foreignColumns: [events.id, events.activity, events.fling],
    }),
    check('poll_multiple', sql`${t.multiple} IN (0,1)`),
    check('poll_closed', sql`${t.closed} IN (0,1)`),
  ],
);
export const pollAudience = sqliteTable(
  'poll_audience',
  {
    poll: text().notNull(),
    fling: text().notNull(),
    member: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.poll, t.member] }),
    foreignKey({
      columns: [t.poll, t.fling],
      foreignColumns: [polls.id, polls.fling],
    }),
    foreignKey({
      columns: [t.member, t.fling],
      foreignColumns: [members.id, members.fling],
    }),
  ],
);
export const votes = sqliteTable(
  'votes',
  {
    id: text().primaryKey(),
    poll: text().notNull(),
    fling: text().notNull(),
    member: text().notNull(),
    choices: text().notNull(),
    generation: integer().notNull(),
    revision: integer().notNull(),
    at: integer().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.poll, t.fling],
      foreignColumns: [polls.id, polls.fling],
    }),
    foreignKey({
      columns: [t.member, t.fling],
      foreignColumns: [members.id, members.fling],
    }),
    unique().on(t.poll, t.member, t.revision),
  ],
);
export const paymentRequests = sqliteTable(
  'payment_requests',
  {
    id: text().primaryKey(),
    fling: text().notNull(),
    event: text().notNull(),
    member: text().notNull(),
    title: text().notNull(),
    currency: text().notNull(),
    amount: integer().notNull(),
    link: text().notNull(),
    actor: text().notNull(),
    at: integer().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.member, t.fling],
      foreignColumns: [members.id, members.fling],
    }),
    foreignKey({
      columns: [t.event, t.fling],
      foreignColumns: [events.id, events.fling],
    }),
    check('request_amount', sql`${t.amount}>0 AND ${t.amount}<=1000000000`),
  ],
);
export const paymentLedger = sqliteTable(
  'payment_ledger',
  {
    id: text().primaryKey(),
    request: text()
      .notNull()
      .references(() => paymentRequests.id),
    kind: text().notNull(),
    amount: integer().notNull(),
    report: text(),
    note: text().notNull(),
    actor: text().notNull(),
    author: text().notNull(),
    at: integer().notNull(),
  },
  (t) => [
    check(
      'ledger_kind',
      sql`${t.kind} IN ('report','confirm','correction','waiver','refund')`,
    ),
    check(
      'ledger_amount',
      sql`${t.amount}!=0 AND ABS(${t.amount})<=1000000000`,
    ),
  ],
);
