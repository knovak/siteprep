import { AccessError, digest, mac, validMac, type Actor } from './access.ts';
import { RecoveryPreviewStore } from './recovery-preview.ts';
import schema from '../public/recovery/schema-v1.json' with { type: 'json' };

type Row = Record<string, unknown>;
type File = { records: Record<string, Row[]>; migration_notes: string };
type Ticket = {
  purpose: 'restore';
  id: string;
  actor: string;
  context: string;
  file: string;
  mapping: string;
  roster: string;
  expires: number;
};
const fields = Object.fromEntries(
  Object.entries(schema.definitions).map(([table, shape]) => [
    table,
    Object.keys(shape.properties),
  ]),
);
const references: Record<string, Record<string, string>> = {
  events: { activity: 'activities' },
  invitations: { member: 'members', activity: 'activities' },
  posts: { activity: 'activities', event: 'events' },
  post_history: { post: 'posts' },
  polls: { activity: 'activities', event: 'events', replaces: 'polls' },
  poll_audience: { poll: 'polls', member: 'members' },
  votes: { poll: 'polls', member: 'members' },
  payment_requests: { event: 'events', member: 'members', actor: 'organizers' },
  payment_ledger: { request: 'payment_requests', report: 'payment_ledger' },
  message_batches: { owner: 'organizers' },
  message_deliveries: { batch: 'message_batches', member: 'members' },
  message_discussions: { batch: 'message_batches', post: 'posts' },
  message_reports: { batch: 'message_batches', reporter: 'organizers' },
  message_results: {
    batch: 'message_batches',
    report: 'message_reports',
    delivery: 'message_deliveries',
  },
  message_retries: { batch: 'message_batches', owner: 'organizers' },
  message_retry_deliveries: {
    batch: 'message_batches',
    delivery: 'message_deliveries',
  },
};
const jsonFields = new Set([
  'polls.options',
  'votes.choices',
  'message_batches.selection',
  'message_batches.manifest',
  'message_batches.discussion',
]);
const order = [
  'flings',
  'organizers',
  'members',
  'activities',
  'events',
  'invitations',
  'posts',
  'post_history',
  'polls',
  'poll_audience',
  'votes',
  'payment_requests',
  'payment_ledger',
  'message_batches',
  'message_deliveries',
  'message_discussions',
  'message_reports',
  'message_results',
  'message_retries',
  'message_retry_deliveries',
  'audit',
];
const fail = () =>
  new AccessError(
    409,
    'This restore review changed or expired. Review the file and organizer choices again.',
  );

export class RecoveryRestoreStore extends RecoveryPreviewStore {
  override async recoveryPreview(actor: Actor, fling: string, input: Row) {
    const result = await super.recoveryPreview(actor, fling, input);
    if (!result.plan) return { ...result, confirmation: null };
    const value: Ticket = {
      purpose: 'restore',
      id: crypto.randomUUID(),
      actor: actor.kind === 'organizer' ? actor.id : '',
      context: fling,
      file: await digest(JSON.stringify(input.file)),
      mapping: await digest(JSON.stringify(result.plan.mappings)),
      roster: await digest(JSON.stringify(result.accounts)),
      expires: this.clock() + 10 * 60000,
    };
    // Only hashes and internal IDs enter this short-lived ticket; no uploaded text.
    const data = btoa(JSON.stringify(value));
    return {
      ...result,
      confirmation: {
        ticket: data + '.' + (await mac(this.secret, data)),
        expires: value.expires,
      },
    };
  }

  async restoreRecovery(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    if (input.confirm_restore !== true)
      throw new AccessError(
        400,
        'Confirm creation of the reviewed new gathering.',
      );
    if (
      Object.keys(input).some(
        (k) =>
          !['file', 'organizer_mapping', 'ticket', 'confirm_restore'].includes(
            k,
          ),
      )
    )
      throw new AccessError(400, 'Use the reviewed restore form.');
    let ticket: Ticket;
    try {
      if (typeof input.ticket !== 'string' || input.ticket.length > 4096)
        throw fail();
      const [data, signature, ...rest] = input.ticket.split('.');
      if (
        rest.length ||
        !data ||
        !signature ||
        !(await validMac(this.secret, data, signature))
      )
        throw fail();
      ticket = JSON.parse(atob(data));
      if (
        ticket.purpose !== 'restore' ||
        ticket.actor !== actor.id ||
        ticket.context !== fling ||
        !Number.isFinite(ticket.expires) ||
        ticket.expires <= this.clock()
      )
        throw fail();
    } catch {
      throw fail();
    }
    // Revalidate semantics and current mappings. A prior browser result is never trusted.
    const preview = await super.recoveryPreview(actor, fling, {
      file: input.file,
      organizer_mapping: input.organizer_mapping,
    });
    if (
      !preview.plan ||
      ticket.file !== (await digest(JSON.stringify(input.file))) ||
      ticket.mapping !==
        (await digest(JSON.stringify(preview.plan.mappings))) ||
      ticket.roster !== (await digest(JSON.stringify(preview.accounts)))
    )
      throw fail();

    const file = structuredClone(input.file) as File,
      records = file.records;
    const ids = new Map<string, Map<unknown, string>>();
    for (const table of order)
      ids.set(
        table,
        new Map(
          records[table]
            .filter((r) => Object.hasOwn(r, 'id'))
            .map((r) => [r.id, crypto.randomUUID()]),
        ),
      );
    const mapped = (table: string, id: unknown): string | null => {
      if (id === null) return null;
      const value = ids.get(table)?.get(id);
      if (!value) throw fail();
      return value;
    };
    const id = mapped('flings', records.flings[0].id)!;
    // Actor IDs are polymorphic in legacy history. Reject ambiguous roleless IDs.
    const actorId = (value: unknown, role?: string) => {
      if (role)
        return mapped(role === 'member' ? 'members' : 'organizers', value);
      const member = ids.get('members')?.has(value),
        organizer = ids.get('organizers')?.has(value);
      if (member && organizer)
        throw new AccessError(
          400,
          'A historical actor ID has two roles. Use distinct IDs and check the edited copy again.',
        );
      return mapped(member ? 'members' : 'organizers', value);
    };
    const unknownTargets = new Map<unknown, string>();
    const targetId = (value: unknown) => {
      const matches = [...ids.values()].flatMap((group) =>
        group.has(value) ? [group.get(value)!] : [],
      );
      if (matches.length === 1) return matches[0];
      // Removed credential references remain inert fresh historical identifiers.
      if (!unknownTargets.has(value))
        unknownTargets.set(value, crypto.randomUUID());
      return unknownTargets.get(value)!;
    };
    const now = this.clock();
    const restored: Record<string, Row[]> = {};
    for (const table of order)
      restored[table] = records[table].map((original) => {
        const r = { ...original };
        if (Object.hasOwn(r, 'id')) r.id = mapped(table, original.id);
        if (Object.hasOwn(r, 'fling')) r.fling = id;
        for (const [field, parent] of Object.entries(references[table] ?? {}))
          r[field] = mapped(parent, original[field]);
        if (Object.hasOwn(r, 'actor'))
          r.actor = actorId(
            original.actor,
            table === 'posts'
              ? String(r.actor_kind)
              : table === 'payment_requests'
                ? 'organizer'
                : table === 'payment_ledger'
                  ? r.kind === 'report'
                    ? 'member'
                    : 'organizer'
                  : undefined,
          );
        if (table === 'audit') r.object = targetId(original.object);
        if (table === 'organizers') r.subject = 'recovery:' + id + ':' + r.id;
        if (table === 'message_deliveries') r.code = null;
        if (table === 'message_retries') r.payload_hash = '';
        if (table === 'message_batches') {
          r.context = '';
          r.audience_hash = '';
          r.payload_hash = '';
          r.ciphertext = null;
          r.imported_at = now;
          const manifest = r.manifest as Row;
          manifest.batch_id = r.id;
          for (const d of manifest.deliveries as Row[]) {
            d.id = mapped('message_deliveries', d.id);
            d.member = mapped('members', d.member);
          }
          const selection = r.selection as Row;
          if (selection.activity !== undefined)
            selection.activity = mapped('activities', selection.activity);
          if (selection.poll !== undefined)
            selection.poll = mapped('polls', selection.poll);
          if (selection.individuals)
            selection.individuals = (selection.individuals as unknown[]).map(
              (m) => mapped('members', m),
            );
          if (r.discussion) {
            const discussion = r.discussion as Row;
            discussion.activity = mapped('activities', discussion.activity);
            discussion.event = mapped('events', discussion.event);
            for (const [key, parent] of [
              ['readers', 'members'],
              ['organizers', 'organizers'],
            ])
              for (const person of discussion[key] as Row[])
                person.id = mapped(parent, person.id);
          }
        }
        return r;
      });
    // No purge-on-read: the source gathering and its expired secrets stay byte-equivalent.
    const rosterJSON = JSON.stringify(preview.accounts);
    const guard = crypto.randomUUID();
    const stmts = [
      this.guard(
        guard,
        `
      EXISTS(SELECT 1 FROM assignments WHERE fling=? AND organizer=?) AND
      (SELECT json_group_array(json_object('id',id,'name',name)) FROM
        (SELECT o.id,o.name FROM organizers o JOIN assignments a ON a.organizer=o.id WHERE a.fling=? ORDER BY o.id))=?`,
        [fling, actor.id, fling, rosterJSON],
      ),
      this.q(
        'INSERT INTO recovery_tokens(id,expires) VALUES(?,?)',
        ticket.id,
        ticket.expires,
      ),
    ];
    for (const table of order) {
      const extras: Record<string, string[]> = {
        organizers: ['subject'],
        message_batches: [
          'context',
          'audience_hash',
          'payload_hash',
          'ciphertext',
          'imported_at',
        ],
        message_deliveries: ['code'],
        message_retries: ['payload_hash'],
      };
      const columns = [...fields[table], ...(extras[table] ?? [])];
      // Fixed columns and bound JSON keep uploaded values out of executable SQL.
      // Bounded chunks avoid one parameter containing an entire large collection.
      let chunk: Row[] = [],
        size = 0;
      const flush = () => {
        if (!chunk.length) return;
        stmts.push(
          this.q(
            `INSERT INTO ${table}(${columns.join(',')})
          SELECT ${columns.map((k) => `json_extract(value,'$.${k}')`).join(',')} FROM json_each(?)`,
            JSON.stringify(chunk),
          ),
        );
        chunk = [];
        size = 0;
      };
      for (const row of restored[table]) {
        const r = { ...row };
        for (const k of columns)
          if (jsonFields.has(table + '.' + k) && r[k] !== null)
            r[k] = JSON.stringify(r[k]);
        const bytes = new TextEncoder().encode(JSON.stringify(r)).length;
        if (size + bytes > 128 * 1024 || chunk.length >= 200) flush();
        chunk.push(r);
        size += bytes;
      }
      flush();
    }
    for (const account of preview.plan.organizers)
      stmts.push(
        this.q(
          'INSERT INTO assignments(fling,organizer) VALUES(?,?)',
          id,
          account.id,
        ),
      );
    stmts.push(
      this.q(
        'INSERT INTO recovery_imports(id,fling,importer,imported_at) VALUES(?,?,?,?)',
        ticket.id,
        id,
        actor.id,
        now,
      ),
      this.audit(actor, id, 'restore-gathering', id),
      this.q('DELETE FROM guards WHERE id=?', guard),
      this.q('DELETE FROM recovery_tokens WHERE expires<=?', now),
    );
    if (ticket.expires <= this.clock()) throw fail();
    try {
      await this.db.batch(stmts);
    } catch {
      throw new AccessError(
        409,
        'No new gathering was created. The review was already used, access changed, or a record could not be restored. Reload your gatherings before trying again.',
      );
    }
    return { id, title: preview.plan.title, imported_at: now };
  }

  async deleteRecovery(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    if (
      input.confirm_delete !== true ||
      typeof input.title !== 'string' ||
      !Number.isInteger(input.revision)
    )
      throw new AccessError(
        400,
        'Type the gathering title and confirm permanent deletion.',
      );
    const guard = crypto.randomUUID();
    const stmts = [
      this.guard(
        guard,
        `EXISTS(SELECT 1 FROM flings f JOIN assignments a ON a.fling=f.id
      WHERE f.id=? AND a.organizer=? AND f.title=? AND f.revision=?)`,
        [fling, actor.id, input.title, input.revision],
      ),
    ];
    // Children first. All deletions and the final parent removal share one transaction.
    for (const table of [
      'message_results',
      'message_retry_deliveries',
      'message_retries',
      'message_reports',
      'message_discussions',
      'message_deliveries',
      'message_batches',
      'votes',
      'poll_audience',
      'polls',
    ])
      stmts.push(this.q(`DELETE FROM ${table} WHERE fling=?`, fling));
    stmts.push(
      this.q(
        'DELETE FROM post_history WHERE post IN (SELECT id FROM posts WHERE fling=?)',
        fling,
      ),
      this.q(
        'DELETE FROM payment_ledger WHERE request IN (SELECT id FROM payment_requests WHERE fling=?)',
        fling,
      ),
    );
    for (const table of [
      'posts',
      'payment_requests',
      'invitations',
      'events',
      'activities',
      'sessions',
      'codes',
      'members',
      'audit',
      'assignments',
      'recovery_imports',
    ])
      stmts.push(this.q(`DELETE FROM ${table} WHERE fling=?`, fling));
    const prefix = 'recovery:' + fling + ':';
    stmts.push(
      this.q(
        'DELETE FROM organizers WHERE substr(subject,1,length(?))=?',
        prefix,
        prefix,
      ),
      this.q('DELETE FROM flings WHERE id=?', fling),
      this.q('DELETE FROM guards WHERE id=?', guard),
    );
    try {
      await this.db.batch(stmts);
    } catch {
      throw new AccessError(
        409,
        'Nothing was deleted. The gathering or your organizer access changed. Reload and confirm again.',
      );
    }
    return { deleted: true };
  }
}
