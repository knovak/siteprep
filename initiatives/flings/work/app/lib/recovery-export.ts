import { AccessError, type Actor } from './access.ts';
import { MessageRetryStore } from './message-retries.ts';
import schemaFile from '../public/recovery/schema-v1.json' with { type: 'json' };
import packageFile from '../package.json' with { type: 'json' };
type Row = Record<string, unknown>;
type Shape = {
  type?: string | string[];
  properties?: Record<string, Shape>;
  required?: string[];
  items?: Shape;
  $ref?: string;
};
const definitions = schemaFile.definitions as Record<string, Shape>;
export const EXPORT_MAX_RECORDS = 10000,
  EXPORT_MAX_BYTES = 8 * 1024 * 1024;
const chosen = '(SELECT fling FROM chosen)';
// Every query is defined here, never supplied by the requester or an uploaded file.
const filters: Record<string, string> = {
  flings: `t.id=${chosen}`,
  organizers:
    '(' +
    [
      `SELECT organizer FROM assignments WHERE fling=${chosen}`,
      `SELECT owner FROM message_batches WHERE fling=${chosen}`,
      `SELECT reporter FROM message_reports WHERE fling=${chosen}`,
      `SELECT owner FROM message_retries WHERE fling=${chosen}`,
      `SELECT actor FROM posts WHERE fling=${chosen} AND actor_kind='organizer'`,
      `SELECT actor FROM audit WHERE fling=${chosen}`,
      `SELECT object FROM audit WHERE fling=${chosen} AND action IN ('assign-organizer','remove-organizer')`,
      `SELECT h.actor FROM post_history h JOIN posts p ON p.id=h.post WHERE p.fling=${chosen}`,
      `SELECT actor FROM payment_requests WHERE fling=${chosen}`,
      `SELECT l.actor FROM payment_ledger l JOIN payment_requests p ON p.id=l.request WHERE p.fling=${chosen}`,
    ]
      .map((query) => `t.id IN (${query})`)
      .join(' OR ') +
    ')',
  post_history: `t.post IN (SELECT id FROM posts WHERE fling=${chosen})`,
  payment_ledger: `t.request IN (SELECT id FROM payment_requests WHERE fling=${chosen})`,
};
const collections = Object.keys(definitions);
const from = (name: string) =>
  `FROM ${name} t WHERE ${filters[name] ?? `t.fling=${chosen}`}`;
const jsonFields = new Set([
  'message_batches.manifest',
  'message_batches.selection',
  'message_batches.discussion',
  'polls.options',
  'votes.choices',
]);
// Decode only for detection, preserving exact ordinary text in the exported file.
// Whole-field omission is intentional: never retain a fragment of an access URL.
export function containsAccessLink(value: string) {
  let decoded = value;
  for (let i = 0; i < 8; i++) {
    if (/[#?](?:code|preview)=|\/f\/[^\s]+\/member|\/preview\//i.test(decoded))
      return true;
    const next = decoded
      .replace(/(?:%[0-9a-f]{2})+/gi, (part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part.replace(/%([0-9a-f]{2})/gi, (_, n) =>
            String.fromCharCode(parseInt(n, 16)),
          );
        }
      })
      .replace(/\\u([0-9a-f]{4})/gi, (_, n) =>
        String.fromCharCode(parseInt(n, 16)),
      )
      .replace(/\\\//g, '/');
    if (next === decoded) return false;
    decoded = next;
  }
  // Unusually nested escaping is not safe to carry forward as ordinary text.
  return (
    /%(?:25|23|3f|2f)|\\u/i.test(decoded) ||
    /[#?](?:code|preview)=|\/f\/[^\s]+\/member|\/preview\//i.test(decoded)
  );
}
function project(
  shape: Shape,
  value: unknown,
  path: string,
  redactions: string[],
): unknown {
  if (shape.$ref) shape = definitions[shape.$ref.replace('#/definitions/', '')];
  const types = Array.isArray(shape.type) ? shape.type : [shape.type];
  if (value === null && types.includes('null')) return null;
  if (types.includes('string') && typeof value === 'string') {
    if (containsAccessLink(value)) {
      redactions.push(path);
      return '[personal access link removed]';
    }
    return value;
  }
  if (
    types.includes('integer') &&
    typeof value === 'number' &&
    Number.isSafeInteger(value)
  )
    return value;
  if (types.includes('array') && Array.isArray(value))
    return value.map((v, i) =>
      project(shape.items!, v, path + '/' + i, redactions),
    );
  if (
    types.includes('object') &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const row = value as Row;
    if ((shape.required ?? []).some((k) => !Object.hasOwn(row, k)))
      throw new AccessError(
        409,
        'A stored recovery record is incomplete. No file was prepared.',
      );
    return Object.fromEntries(
      Object.entries(shape.properties!)
        .filter(([key]) => Object.hasOwn(row, key))
        .map(([key, child]) => [
          key,
          project(child, row[key], path + '/' + key, redactions),
        ]),
    );
  }
  throw new AccessError(
    409,
    'A stored recovery record has an unsupported shape. No file was prepared.',
  );
}
export class RecoveryExportStore extends MessageRetryStore {
  async exportRecovery(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    if (input.confirm_unencrypted !== true)
      throw new AccessError(
        400,
        'Confirm that this download contains unencrypted personal data.',
      );
    const guard = this.condition(
      `WITH chosen AS (SELECT ? fling) SELECT (${collections.map((name) => `(SELECT COUNT(*) ${from(name)})`).join('+')})<=?`,
      [fling, EXPORT_MAX_RECORDS],
    );
    // Authority, size precondition and every collection share one real D1 transaction.
    // Explicit columns come from the reviewed format, not SELECT * or the live schema.
    const rows = await this.batch(actor, fling, [
      ...guard,
      ...collections.map((name) => {
        const fields = Object.keys(definitions[name].properties!);
        return this.q(
          `WITH chosen AS (SELECT ? fling) SELECT ${fields.map((f) => 't.' + f).join(',')}
        ${from(name)} ORDER BY ${fields.map((f) => 't.' + f).join(',')}`,
          fling,
        );
      }),
    ]).catch(() => {
      throw new AccessError(
        409,
        'Access changed or this gathering exceeds the 10,000-record export limit. No file was prepared.',
      );
    });
    const records: Record<string, Row[]> = {},
      redactions: string[] = [];
    for (const [i, name] of collections.entries()) {
      records[name] = rows[i + guard.length].results.map((raw, index) => {
        const row: Row = { ...(raw as Row) };
        for (const key of Object.keys(row))
          if (jsonFields.has(name + '.' + key) && row[key] !== null) {
            try {
              const stored = row[key];
              if (typeof stored !== 'string')
                throw new Error('Expected stored JSON text');
              row[key] = JSON.parse(stored);
            } catch {
              throw new AccessError(
                409,
                'A stored recovery record contains invalid JSON. No file was prepared.',
              );
            }
          }
        return project(
          definitions[name],
          row,
          '/records/' + name + '/' + index,
          redactions,
        ) as Row;
      });
    }
    if (records.flings.length !== 1)
      throw new AccessError(404, 'This gathering is unavailable.');
    const exportedAt = new Date(this.clock()).toISOString();
    const file = {
      format: 'flings-recovery',
      schema_version: 1,
      application_version: packageFile.version,
      exported_at: exportedAt,
      fling_id: fling,
      migration_notes: '',
      records,
      counts: Object.fromEntries(
        collections.map((name) => [name, records[name].length]),
      ),
      redactions: { text_fields: redactions.length, paths: redactions },
    };
    const bytes = new TextEncoder().encode(
      JSON.stringify(file, null, 2) + '\n',
    ).length;
    if (bytes > EXPORT_MAX_BYTES)
      throw new AccessError(
        413,
        'This export exceeds 8 MiB. No partial file was prepared.',
      );
    return {
      file,
      bytes,
      filename:
        'flings-' +
        fling.replace(/[^a-z0-9-]/gi, '_').slice(0, 80) +
        '-' +
        exportedAt.replace(/[:.]/g, '-') +
        '.json',
    };
  }
}
