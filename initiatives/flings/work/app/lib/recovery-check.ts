import { AccessError, type Actor } from './access.ts';
import {
  RecoveryExportStore,
  EXPORT_MAX_BYTES,
  EXPORT_MAX_RECORDS,
  containsAccessLink,
} from './recovery-export.ts';
import schema from '../public/recovery/schema-v1.json' with { type: 'json' };

type Row = Record<string, unknown>;
type Shape = {
  type?: string | string[];
  properties?: Record<string, Shape>;
  required?: string[];
  items?: Shape;
  $ref?: string;
  additionalProperties?: boolean;
  const?: unknown;
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  minItems?: number;
  maxItems?: number;
};
export type RecoveryCheck = {
  valid: boolean;
  issues: { path: string; message: string }[];
  truncated: boolean;
  summary: null | {
    counts: Record<string, number>;
    total: number;
    redactions: number;
    historicalOrganizers: number;
    unfinishedHandoffs: number;
  };
};
const definitions = schema.definitions as Record<string, Shape>;
const composite: Record<string, string[]> = {
  assignments: ['fling', 'organizer'],
  invitations: ['member', 'activity'],
  poll_audience: ['poll', 'member'],
  message_discussions: ['batch'],
  message_results: ['report', 'delivery'],
  message_retries: ['batch', 'attempt'],
  message_retry_deliveries: ['batch', 'attempt', 'delivery'],
};
const enums: Record<string, Record<string, unknown[]>> = {
  flings: { state: ['open', 'closed'] },
  activities: { state: ['draft', 'published', 'cancelled'] },
  members: {
    state: ['active', 'removed'],
    preference: ['email', 'text', 'both'],
  },
  invitations: { state: ['invited', 'accepted', 'declined', 'withdrawn'] },
  posts: { actor_kind: ['organizer', 'member'], hidden: [0, 1] },
  post_history: { action: ['edit', 'hide'] },
  polls: { multiple: [0, 1], closed: [0, 1] },
  payment_ledger: {
    kind: ['report', 'confirm', 'waiver', 'refund', 'correction'],
  },
  message_deliveries: { channel: ['email', 'text'] },
  message_results: {
    status: ['unknown', 'reported_sent', 'reported_failed', 'suppressed'],
  },
};
const references: Record<string, Record<string, string>> = {
  assignments: { organizer: 'organizers' },
  events: { activity: 'activities' },
  invitations: { activity: 'activities', member: 'members' },
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
    delivery: 'message_deliveries',
    report: 'message_reports',
  },
  message_retries: { batch: 'message_batches', owner: 'organizers' },
  message_retry_deliveries: {
    batch: 'message_batches',
    delivery: 'message_deliveries',
  },
};
const iso = (v: unknown) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === (v.includes('.') ? v : v.replace('Z', '.000Z'));
const currencies = new Set(Intl.supportedValuesOf('currency'));
const zone = (v: unknown) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: String(v) }).format(0);
    return true;
  } catch {
    return false;
  }
};
const safeURL = (v: unknown) => {
  if (v === '' || v === '[personal access link removed]') return true;
  try {
    const u = new URL(String(v));
    return (
      ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
};

// This fixed-schema walker interprets only our committed schema, never an uploaded
// schema or code. It collects bounded paths/messages without echoing uploaded text.
export function checkRecoveryFile(input: unknown): RecoveryCheck {
  const issues: RecoveryCheck['issues'] = [];
  let truncated = false;
  const issue = (path: string, message: string) => {
    if (issues.length < 100) issues.push({ path, message });
    else truncated = true;
  };
  const done = (summary: RecoveryCheck['summary'] = null): RecoveryCheck => ({
    valid: issues.length === 0,
    issues,
    truncated,
    summary: issues.length ? null : summary,
  });
  let bytes: number;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(input) ?? '').length;
  } catch {
    issue('/', 'Unsupported nesting or JSON value.');
    return done();
  }
  if (bytes > EXPORT_MAX_BYTES) {
    issue('/', 'File exceeds the 8 MiB limit.');
    return done();
  }
  const envelope = input as Row | null;
  if (
    envelope &&
    typeof envelope === 'object' &&
    envelope.schema_version !== 1
  ) {
    issue(
      '/schema_version',
      'Unsupported schema version. Supported version: 1.',
    );
    return done();
  }
  if (
    envelope &&
    typeof envelope.records === 'object' &&
    envelope.records &&
    Object.values(envelope.records).reduce(
      (n: number, v) => n + (Array.isArray(v) ? v.length : 0),
      0,
    ) > EXPORT_MAX_RECORDS
  ) {
    issue('/records', 'File exceeds the 10,000-record limit.');
    return done();
  }
  function shape(s: Shape, v: unknown, path: string) {
    if (issues.length >= 100) {
      truncated = true;
      return;
    }
    if (s.$ref) s = definitions[s.$ref.replace('#/definitions/', '')];
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const t =
      v === null
        ? 'null'
        : Array.isArray(v)
          ? 'array'
          : typeof v === 'number' && Number.isSafeInteger(v)
            ? 'integer'
            : typeof v;
    if (!types.includes(t)) {
      issue(path, 'Incorrect value type.');
      return;
    }
    if (Object.hasOwn(s, 'const') && v !== s.const)
      issue(path, 'Incorrect format value.');
    if (s.enum && !s.enum.includes(v))
      issue(path, 'Value is not an allowed option.');
    if (typeof v === 'string') {
      if (s.pattern && !new RegExp(s.pattern).test(v))
        issue(path, 'Incorrect value format.');
      if (containsAccessLink(v))
        issue(path, 'Remove the personal access link from this field.');
    }
    if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum)
      issue(path, 'Value is below the allowed minimum.');
    if (Array.isArray(v)) {
      if (
        (s.minItems !== undefined && v.length < s.minItems) ||
        (s.maxItems !== undefined && v.length > s.maxItems)
      )
        issue(path, 'Array length is outside the format limits.');
      for (let i = 0; i < v.length; i++) {
        if (issues.length >= 100) {
          truncated = true;
          break;
        }
        shape(s.items!, v[i], path + '/' + i);
      }
    } else if (v && typeof v === 'object') {
      const r = v as Row;
      // Do not include unknown key names in diagnostics: they can themselves hold secrets.
      if (
        s.additionalProperties === false &&
        Object.keys(r).some((k) => !Object.hasOwn(s.properties!, k))
      )
        issue(
          path || '/',
          'Unexpected field; remove fields outside the version-1 format.',
        );
      for (const k of s.required ?? [])
        if (!Object.hasOwn(r, k))
          issue(path + '/' + k, 'Required field is missing.');
      for (const [k, child] of Object.entries(s.properties ?? {}))
        if (Object.hasOwn(r, k)) shape(child, r[k], path + '/' + k);
    }
  }
  shape(schema as Shape, input, '');
  if (issues.length) return done();
  const f = input as {
    fling_id: string;
    exported_at: string;
    records: Record<string, Row[]>;
    counts: Record<string, number>;
    redactions: { text_fields: number; paths: string[] };
  };
  const records = f.records,
    total = Object.values(records).reduce((n, rows) => n + rows.length, 0);
  if (total > EXPORT_MAX_RECORDS) {
    issue('/records', 'File exceeds the 10,000-record limit.');
    return done();
  }
  if (!iso(f.exported_at))
    issue('/exported_at', 'Use a real UTC timestamp (optional milliseconds).');
  if (records.flings.length !== 1 || records.flings[0]?.id !== f.fling_id)
    issue(
      '/records/flings',
      'Include exactly the gathering named by fling_id.',
    );
  if (!records.assignments.length)
    issue(
      '/records/assignments',
      'Include at least one historical organizer assignment.',
    );
  const ids = Object.fromEntries(
    Object.entries(records).map(([name, rows]) => [
      name,
      new Map(rows.map((r) => [r.id, r])),
    ]),
  );
  const get = (name: string, id: unknown) => ids[name]?.get(id);
  for (const [name, rows] of Object.entries(records)) {
    if (f.counts[name] !== rows.length)
      issue('/counts/' + name, 'Count does not match the records array.');
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      const p = '/records/' + name + '/' + i;
      const keys = composite[name] ?? ['id'],
        key = JSON.stringify(keys.map((k) => r[k]));
      if (seen.has(key)) issue(p, 'Duplicate record identity.');
      seen.add(key);
      for (const k of keys)
        if (
          typeof r[k] === 'string' &&
          (!r[k] ||
            String(r[k]).length > 200 ||
            Array.from(String(r[k])).some((c) => c.charCodeAt(0) < 32))
        )
          issue(
            p + '/' + k,
            'Use a nonempty identifier of at most 200 characters without control characters.',
          );
      if (Object.hasOwn(r, 'fling') && r.fling !== f.fling_id)
        issue(p + '/fling', 'Record belongs to a different gathering.');
      for (const [k, values] of Object.entries(enums[name] ?? {}))
        if (!values.includes(r[k]))
          issue(p + '/' + k, 'Value is not an allowed option.');
      for (const [k, parent] of Object.entries(references[name] ?? {}))
        if (r[k] !== null && !get(parent, r[k]))
          issue(p + '/' + k, 'Referenced record is missing from this file.');
      for (const k of ['revision', 'generation', 'results_revision'])
        if (typeof r[k] === 'number' && Number(r[k]) < 0)
          issue(p + '/' + k, 'Revision or generation must be nonnegative.');
      for (const k of [
        'at',
        'created',
        'edited',
        'changed_at',
        'deadline',
        'approved',
        'exported',
        'send_until',
        'reported_at',
      ])
        if (
          typeof r[k] === 'number' &&
          (Number(r[k]) < 0 ||
            !Number.isFinite(new Date(Number(r[k])).getTime()))
        )
          issue(
            p + '/' + k,
            'Use a nonnegative, valid Unix millisecond timestamp.',
          );
      if (
        r.event != null &&
        Object.hasOwn(r, 'activity') &&
        get('events', r.event)?.activity !== r.activity
      )
        issue(p + '/event', 'Event does not belong to this activity.');
      if (typeof r.actor === 'string') {
        const parent =
          name === 'posts'
            ? r.actor_kind === 'member'
              ? 'members'
              : 'organizers'
            : name === 'payment_requests'
              ? 'organizers'
              : null;
        if (
          parent
            ? !get(parent, r.actor)
            : !get('members', r.actor) && !get('organizers', r.actor)
        )
          issue(
            p + '/actor',
            'Historical actor is missing or has the wrong role.',
          );
      }
      if (r.batch && name !== 'message_batches')
        for (const k of ['delivery', 'report'])
          if (
            r[k] &&
            get(
              k === 'delivery' ? 'message_deliveries' : 'message_reports',
              r[k],
            )?.batch !== r.batch
          )
            issue(p + '/' + k, 'History belongs to a different message batch.');
      if (name === 'flings' && !zone(r.default_zone))
        issue(p + '/default_zone', 'Use a supported time zone.');
      if (name === 'events') {
        if (!iso(r.starts))
          issue(
            p + '/starts',
            'Use a real UTC timestamp (optional milliseconds).',
          );
        if (
          r.ends !== null &&
          (!iso(r.ends) ||
            Date.parse(r.ends as string) <= Date.parse(String(r.starts)))
        )
          issue(
            p + '/ends',
            'End must be a real UTC timestamp after the start.',
          );
        if (!zone(r.zone)) issue(p + '/zone', 'Use a supported time zone.');
        if (!safeURL(r.location_url))
          issue(
            p + '/location_url',
            'Use an HTTP or HTTPS link without embedded credentials.',
          );
      }
      if (
        name === 'posts' &&
        r.edited !== null &&
        Number(r.edited) < Number(r.created)
      )
        issue(p + '/edited', 'Edit time precedes creation.');
      if (name === 'polls') {
        const opts = r.options as string[];
        if (
          opts.length < 2 ||
          opts.length > 20 ||
          new Set(opts).size !== opts.length ||
          opts.some((s) => !s.trim() || s.length > 200)
        )
          issue(
            p + '/options',
            'Use 2–20 different, nonempty choices of at most 200 characters.',
          );
        if (
          r.replaces !== null &&
          (r.replaces === r.id || get('polls', r.replaces)?.event !== r.event)
        )
          issue(
            p + '/replaces',
            'Replacement must name a different poll in the same event.',
          );
      }
      if (name === 'votes') {
        const poll = get('polls', r.poll),
          choices = r.choices as number[];
        if (
          poll &&
          (choices.some(
            (n) => n < 0 || n >= (poll.options as unknown[]).length,
          ) ||
            new Set(choices).size !== choices.length ||
            (!poll.multiple && choices.length > 1))
        )
          issue(
            p + '/choices',
            'Choices do not match the poll options or selection limit.',
          );
      }
      if (name === 'payment_requests') {
        if (!currencies.has(String(r.currency)))
          issue(p + '/currency', 'Use a supported three-letter currency code.');
        if (Number(r.amount) < 1 || Number(r.amount) > 1000000000)
          issue(
            p + '/amount',
            'Use 1–1,000,000,000 whole minor currency units.',
          );
        if (!safeURL(r.link))
          issue(
            p + '/link',
            'Use an HTTP or HTTPS link without embedded credentials.',
          );
      }
      if (name === 'payment_ledger') {
        if (
          r.amount === 0 ||
          Math.abs(Number(r.amount)) > 1000000000 ||
          (r.kind !== 'correction' && Number(r.amount) < 0)
        )
          issue(p + '/amount', 'Invalid ledger amount or sign.');
        const report = get('payment_ledger', r.report);
        if (
          r.kind === 'confirm'
            ? !report ||
              report.kind !== 'report' ||
              report.request !== r.request ||
              Number(report.at) > Number(r.at)
            : r.report !== null
        )
          issue(
            p + '/report',
            'Only a confirmation may reference an earlier report for this request.',
          );
        const request = get('payment_requests', r.request);
        if (
          r.kind === 'report'
            ? request?.member !== r.actor
            : !get('organizers', r.actor)
        )
          issue(
            p + '/actor',
            'Ledger actor does not match the required historical role.',
          );
      }
      if (
        Object.hasOwn(r, 'attempt') &&
        Number(r.attempt) < (name === 'message_results' ? 1 : 2)
      )
        issue(p + '/attempt', 'Invalid message attempt number.');
      if (name === 'message_reports' && Number(r.sequence) < 1)
        issue(p + '/sequence', 'Report sequence must start at 1.');
    });
  }
  const invitations = new Map(
    records.invitations.map((r) => [JSON.stringify([r.member, r.activity]), r]),
  );
  const audiences = new Set(
    records.poll_audience.map((r) => JSON.stringify([r.poll, r.member])),
  );
  records.votes.forEach((r, i) => {
    const poll = get('polls', r.poll),
      invitation = invitations.get(JSON.stringify([r.member, poll?.activity]));
    if (
      !invitation ||
      Number(r.generation) > Number(invitation.generation) ||
      !audiences.has(JSON.stringify([r.poll, r.member]))
    )
      issue(
        '/records/votes/' + i,
        'Vote history has no matching invitation generation or poll audience.',
      );
  });
  const checkedPolls = new Set<unknown>();
  records.polls.forEach((r, i) => {
    const visiting = new Set<unknown>();
    let current: Row | undefined = r;
    while (current && !checkedPolls.has(current.id)) {
      if (visiting.has(current.id)) {
        issue(
          '/records/polls/' + i + '/replaces',
          'Poll replacements contain a cycle.',
        );
        break;
      }
      visiting.add(current.id);
      current = get('polls', current.replaces);
    }
    for (const id of visiting) checkedPolls.add(id);
  });
  // Check unique secondary keys and per-request arithmetic without depending on file order.
  for (const [name, keys] of Object.entries({
    votes: ['poll', 'member', 'revision'],
    message_reports: ['batch', 'sequence'],
    message_deliveries: ['batch', 'member', 'channel'],
  })) {
    const seen = new Set<string>();
    records[name].forEach((r, i) => {
      const key = JSON.stringify(keys.map((k) => r[k]));
      if (seen.has(key))
        issue('/records/' + name + '/' + i, 'Duplicate history identity.');
      seen.add(key);
    });
  }
  const ledgerByRequest = new Map<unknown, Row[]>(),
    confirmations = new Map<unknown, bigint>();
  for (const r of records.payment_ledger) {
    const group = ledgerByRequest.get(r.request) ?? [];
    group.push(r);
    ledgerByRequest.set(r.request, group);
    if (r.kind === 'confirm')
      confirmations.set(
        r.report,
        (confirmations.get(r.report) ?? BigInt(0)) + BigInt(Number(r.amount)),
      );
  }
  records.payment_ledger.forEach((r, i) => {
    if (
      r.kind === 'report' &&
      (confirmations.get(r.id) ?? BigInt(0)) > BigInt(Number(r.amount))
    )
      issue(
        '/records/payment_ledger/' + i + '/amount',
        'Confirmations exceed this reported payment.',
      );
  });
  records.payment_requests.forEach((request, i) => {
    let balance = BigInt(Number(request.amount)),
      paid = BigInt(0);
    // All operations with the same millisecond are grouped: export has no total
    // order for those records, so do not invent one from random IDs or array order.
    const times = new Map<number, Row[]>();
    for (const r of ledgerByRequest.get(request.id) ?? []) {
      const group = times.get(Number(r.at)) ?? [];
      group.push(r);
      times.set(Number(r.at), group);
    }
    for (const [, entries] of [...times.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      for (const r of entries) {
        const n = BigInt(Number(r.amount));
        if (['confirm', 'waiver'].includes(String(r.kind))) balance -= n;
        if (['refund', 'correction'].includes(String(r.kind))) balance += n;
        if (r.kind === 'confirm') paid += n;
        if (r.kind === 'refund') paid -= n;
      }
      if (
        balance < BigInt(0) ||
        balance > BigInt(1000000000) ||
        paid < BigInt(0)
      ) {
        issue(
          '/records/payment_requests/' + i + '/amount',
          'Payment history produces an impossible balance or refund.',
        );
        break;
      }
    }
  });
  const retryKeys = new Set(
    records.message_retries.map((r) => JSON.stringify([r.batch, r.attempt])),
  );
  const retryDeliveries = new Set(
    records.message_retry_deliveries.map((r) =>
      JSON.stringify([r.batch, r.attempt, r.delivery]),
    ),
  );
  records.message_retry_deliveries.forEach((r, i) => {
    if (!retryKeys.has(JSON.stringify([r.batch, r.attempt])))
      issue(
        '/records/message_retry_deliveries/' + i,
        'Retry attempt is missing.',
      );
  });
  records.message_results.forEach((r, i) => {
    if (
      Number(r.attempt) > 1 &&
      !retryDeliveries.has(JSON.stringify([r.batch, r.attempt, r.delivery]))
    )
      issue(
        '/records/message_results/' + i + '/attempt',
        'Delivery was not selected for this retry attempt.',
      );
  });
  const deliveryCounts = new Map<unknown, number>();
  for (const d of records.message_deliveries)
    deliveryCounts.set(d.batch, (deliveryCounts.get(d.batch) ?? 0) + 1);
  records.message_batches.forEach((r, i) => {
    const p = '/records/message_batches/' + i,
      manifest = r.manifest as Row,
      selection = r.selection as Row;
    if (r.revision !== 1 || manifest.batch_id !== r.id)
      issue(
        p + '/manifest',
        'Manifest identity or revision does not match its batch.',
      );
    if (
      !iso(manifest.created_at) ||
      !iso(manifest.send_before) ||
      Date.parse(String(manifest.send_before)) <=
        Date.parse(String(manifest.created_at))
    )
      issue(
        p + '/manifest/send_before',
        'Invalid manifest creation time or sending boundary.',
      );
    if (
      !['all', 'invitees', 'accepted'].includes(String(selection.group)) ||
      ![
        'none',
        'individuals',
        'unanswered-invitation',
        'unanswered-poll',
        'outstanding-payment',
      ].includes(String(selection.filter)) ||
      !['preference', 'email', 'text'].includes(String(selection.channel))
    )
      issue(p + '/selection', 'Invalid historical audience selection.');
    for (const [field, table] of Object.entries({
      activity: 'activities',
      poll: 'polls',
    }))
      if (selection[field] !== undefined && !get(table, selection[field]))
        issue(p + '/selection/' + field, 'Audience reference is missing.');
    for (const id of (selection.individuals ?? []) as string[])
      if (!get('members', id))
        issue(p + '/selection/individuals', 'Audience member is missing.');
    const seen = new Set<unknown>();
    (manifest.deliveries as Row[]).forEach((d, j) => {
      const row = get('message_deliveries', d.id);
      if (
        seen.has(d.id) ||
        !row ||
        row.batch !== r.id ||
        row.member !== d.member ||
        row.channel !== d.channel
      )
        issue(
          p + '/manifest/deliveries/' + j,
          'Manifest delivery does not match its history record.',
        );
      seen.add(d.id);
    });
    if ((deliveryCounts.get(r.id) ?? 0) !== seen.size)
      issue(p + '/manifest/deliveries', 'Manifest and delivery counts differ.');
    if (r.discussion) {
      const d = r.discussion as Row;
      if (d.activity !== null && !get('activities', d.activity))
        issue(p + '/discussion/activity', 'Discussion activity is missing.');
      if (d.event !== null && get('events', d.event)?.activity !== d.activity)
        issue(
          p + '/discussion/event',
          'Discussion event does not match its activity.',
        );
      for (const [key, table] of Object.entries({
        readers: 'members',
        organizers: 'organizers',
      }))
        for (const person of d[key] as Row[])
          if (!get(table, person.id))
            issue(p + '/discussion/' + key, 'Historical reader is missing.');
    }
  });
  if (
    f.redactions.text_fields !== f.redactions.paths.length ||
    new Set(f.redactions.paths).size !== f.redactions.paths.length
  )
    issue('/redactions', 'Redaction count or paths are inconsistent.');
  for (let i = 0; i < f.redactions.paths.length; i++) {
    const path = f.redactions.paths[i];
    let value: unknown = f;
    if (!path.startsWith('/records/')) {
      issue(
        '/redactions/paths/' + i,
        'Redaction path must identify a record field.',
      );
      continue;
    }
    for (const key of path.slice(1).split('/'))
      value =
        value && typeof value === 'object' && Object.hasOwn(value, key)
          ? (value as Row)[key]
          : undefined;
    if (value !== '[personal access link removed]')
      issue(
        '/redactions/paths/' + i,
        'Redaction path must identify a removed personal-link field.',
      );
  }
  return done({
    counts: f.counts,
    total,
    redactions: f.redactions.text_fields,
    historicalOrganizers: records.organizers.length,
    unfinishedHandoffs: records.message_batches.filter(
      (r) => r.approved === null || r.exported === null,
    ).length,
  });
}

export class RecoveryCheckStore extends RecoveryExportStore {
  async checkRecovery(actor: Actor, fling: string, file: unknown) {
    // This operation deliberately does not use batch(): even its opportunistic
    // ciphertext purge would make a validation-only request mutate active storage.
    const authorized = async () => {
      if (actor.kind !== 'organizer')
        throw new AccessError(403, 'Organizer access is required.');
      if (
        !(await this.q(
          'SELECT 1 FROM assignments WHERE fling=? AND organizer=?',
          fling,
          actor.id,
        ).first())
      )
        throw new AccessError(
          403,
          'Organizer access is required for this gathering.',
        );
    };
    await authorized();
    const result = checkRecoveryFile(file);
    await authorized();
    return result;
  }
}
