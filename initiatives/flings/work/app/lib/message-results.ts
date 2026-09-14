import { AccessError, digest, mac, validMac, type Actor } from './access.ts';
import { safeText } from './coordination.ts';
import { MessageStore, type Manifest } from './messages.ts';
type Row = Record<string, unknown>;
type ReportEntry = {
  id: string;
  sequence: number;
  fingerprint: string;
  reporter: string;
  reporter_name: string;
  reported_at: number;
  delivery: string;
  status: ReportedStatus;
  evidence: string;
  attempt: number;
};
export type ReportedStatus =
  | 'reported_sent'
  | 'reported_failed'
  | 'suppressed'
  | 'unknown';
export type ResultReport = {
  batch_id: string;
  revision: number;
  results: {
    delivery_id: string;
    status: ReportedStatus;
    evidence: string;
    attempt?: number;
  }[];
};
export const statusLabels: Record<ReportedStatus, string> = {
  reported_sent: 'Reported sent',
  reported_failed: 'Reported failed',
  suppressed: 'Suppressed',
  unknown: 'Outcome unknown',
};
function object(value: unknown, fields: string[]): Row {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  )
    throw new AccessError(400, 'Use the documented result JSON fields.');
  return value as Row;
}
export function normalizeReport(value: unknown): ResultReport {
  const r = object(value, ['batch_id', 'revision', 'results']);
  if (
    typeof r.batch_id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(r.batch_id) ||
    r.revision !== 1 ||
    !Array.isArray(r.results) ||
    !r.results.length ||
    r.results.length > 5
  )
    throw new AccessError(
      400,
      'Supply this batch, revision 1 and one to five delivery results.',
    );
  const results = r.results
    .map((value) => {
      const item = object(value, [
        'delivery_id',
        'status',
        'evidence',
        'attempt',
      ]);
      if (
        typeof item.delivery_id !== 'string' ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(item.delivery_id) ||
        typeof item.status !== 'string' ||
        !Object.hasOwn(statusLabels, item.status)
      )
        throw new AccessError(
          400,
          'Use a known delivery ID and documented reported status.',
        );
      if (
        item.attempt !== undefined &&
        (!Number.isSafeInteger(item.attempt) || Number(item.attempt) < 1)
      )
        throw new AccessError(
          400,
          'Use the delivery attempt shown in the current result template.',
        );
      safeText(item.evidence, false);
      return {
        delivery_id: item.delivery_id,
        status: item.status as ReportedStatus,
        evidence: item.evidence as string,
        ...(Number(item.attempt) > 1 ? { attempt: Number(item.attempt) } : {}),
      };
    })
    .sort((a, b) => a.delivery_id.localeCompare(b.delivery_id));
  if (new Set(results.map((r) => r.delivery_id)).size !== results.length)
    throw new AccessError(
      400,
      'Each delivery ID may appear only once in a report.',
    );
  const report = { batch_id: r.batch_id, revision: 1, results };
  if (new TextEncoder().encode(JSON.stringify(report)).length > 12000)
    throw new AccessError(
      400,
      'Keep each result report within 12,000 bytes; split large reports by delivery.',
    );
  return report;
}

export class MessageResultStore extends MessageStore {
  async resultState(actor: Actor, fling: string, id: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const r = await this.batch(actor, fling, [
      this.q('SELECT * FROM message_batches WHERE id=? AND fling=?', id, fling),
      this.q(
        `SELECT r.id,r.sequence,r.fingerprint,r.reporter,o.name reporter_name,r.reported_at,
        e.delivery,e.status,e.evidence,e.attempt FROM message_reports r
        JOIN organizers o ON o.id=r.reporter JOIN message_results e ON e.report=r.id
        WHERE r.batch=? AND r.fling=? ORDER BY r.sequence,e.delivery`,
        id,
        fling,
      ),
      this.q(
        `SELECT d.*,r.owner,r.exported,r.payload_hash,r.results_revision,o.name owner_name
        FROM message_retry_deliveries d JOIN message_retries r ON r.batch=d.batch AND r.attempt=d.attempt
        JOIN organizers o ON o.id=r.owner WHERE d.batch=? AND d.fling=? ORDER BY d.attempt,d.delivery`,
        id,
        fling,
      ),
    ]);
    const row = r[0].results[0] as Row | undefined;
    if (!row) throw new AccessError(404, 'This message batch is unavailable.');
    // Use only the redacted immutable manifest; reporting never decrypts a link.
    const manifest = JSON.parse(String(row.manifest)) as Manifest;
    const entries = r[1].results as ReportEntry[];
    const retries = r[2].results as Row[];
    const deliveries = manifest.deliveries.map((d) => {
      const attempt = Math.max(
        1,
        ...retries
          .filter((r) => r.delivery === d.id)
          .map((r) => Number(r.attempt)),
      );
      const last = entries
        .filter((e) => e.delivery === d.id && e.attempt === attempt)
        .at(-1);
      return {
        id: d.id,
        name: d.name,
        channel: d.channel,
        attempt,
        status: (last?.status ?? 'unknown') as ReportedStatus,
        evidence: String(last?.evidence ?? ''),
        reporter: last?.reporter ?? null,
        reporter_name: last?.reporter_name ?? null,
        reported_at: last?.reported_at ?? null,
      };
    });
    const reports = [...new Set(entries.map((e) => String(e.id)))].map((id) => {
      const items = entries.filter((e) => e.id === id),
        first = items[0];
      return {
        id,
        sequence: Number(first.sequence),
        reporter: String(first.reporter),
        reporter_name: String(first.reporter_name),
        reported_at: Number(first.reported_at),
        results: items.map((e) => ({
          delivery_id: String(e.delivery),
          status: e.status as ReportedStatus,
          evidence: String(e.evidence),
          attempt: e.attempt,
        })),
      };
    });
    const counts = {
      reported_sent: 0,
      reported_failed: 0,
      suppressed: 0,
      unknown: 0,
    };
    for (const d of deliveries) counts[d.status]++;
    return { row, manifest, entries, deliveries, reports, counts, retries };
  }
  async reportReview(actor: Actor, fling: string, value: unknown) {
    const report = normalizeReport(value),
      context = await this.context(actor, fling);
    const state = await this.resultState(actor, fling, report.batch_id);
    if (JSON.parse(context).state !== 'open')
      throw new AccessError(
        409,
        'This fling is closed. Result history remains readable.',
      );
    if (state.row.exported === null || state.row.revision !== report.revision)
      throw new AccessError(409, 'Only an exported batch can receive results.');
    if (
      report.results.some(
        (r) => !state.deliveries.some((d) => d.id === r.delivery_id),
      )
    )
      throw new AccessError(
        400,
        'A delivery ID does not belong to this batch.',
      );
    if (
      report.results.some(
        (r) =>
          (r.attempt ?? 1) !==
          state.deliveries.find((d) => d.id === r.delivery_id)!.attempt,
      )
    )
      throw new AccessError(
        409,
        'A newer attempt exists. Check account history and use the current result template.',
      );
    const fingerprint = await digest(JSON.stringify(report));
    if (state.entries.some((e) => e.fingerprint === fingerprint))
      throw new AccessError(
        409,
        'This exact report is already recorded. Review history before reporting again.',
      );
    const changes = report.results.map((r) => {
      const d = state.deliveries.find((d) => d.id === r.delivery_id)!;
      return {
        ...r,
        name: d.name,
        channel: d.channel,
        previous: d.status,
        previous_evidence: d.evidence,
      };
    });
    const counts = { ...state.counts };
    for (const change of changes) {
      counts[change.previous]--;
      counts[change.status]++;
    }
    return { report, state, context, fingerprint, changes, counts };
  }
  previewText(
    actor: Actor,
    fling: string,
    fingerprint: string,
    context: string,
    revision: number,
    expires: number,
  ) {
    return JSON.stringify([
      'flings-result-preview-v1',
      actor,
      fling,
      fingerprint,
      context,
      revision,
      expires,
    ]);
  }
  async previewResults(actor: Actor, fling: string, input: Row) {
    const review = await this.reportReview(actor, fling, input.report),
      resultsRevision = Number(review.state.row.results_revision),
      expires = this.clock() + 10 * 60000;
    return {
      report: review.report,
      changes: review.changes,
      counts: review.counts,
      unchanged: review.state.deliveries.length - review.changes.length,
      results_revision: resultsRevision,
      expires,
      token: await mac(
        this.secret,
        this.previewText(
          actor,
          fling,
          review.fingerprint,
          review.context,
          resultsRevision,
          expires,
        ),
      ),
    };
  }
  async recordResults(actor: Actor, fling: string, input: Row) {
    const review = await this.reportReview(actor, fling, input.report);
    if (
      input.confirm !== true ||
      typeof input.token !== 'string' ||
      typeof input.expires !== 'number' ||
      this.clock() >= input.expires ||
      !Number.isSafeInteger(input.results_revision) ||
      input.results_revision !== review.state.row.results_revision ||
      !(await validMac(
        this.secret,
        this.previewText(
          actor,
          fling,
          review.fingerprint,
          review.context,
          Number(input.results_revision),
          input.expires,
        ),
        input.token,
      ))
    )
      throw new AccessError(
        409,
        'Preview these results again, then confirm the displayed changes.',
      );
    const id = crypto.randomUUID(),
      now = this.clock();
    await this.batch(
      actor,
      fling,
      [
        ...this.currentGuard(fling, review.context),
        ...this.condition(
          `EXISTS(SELECT 1 FROM message_batches WHERE id=? AND fling=? AND revision=?
        AND exported IS NOT NULL AND results_revision=?)`,
          [
            review.report.batch_id,
            fling,
            review.report.revision,
            input.results_revision,
          ],
        ),
        this.q(
          'UPDATE message_batches SET results_revision=results_revision+1 WHERE id=?',
          review.report.batch_id,
        ),
        this.q(
          'INSERT INTO message_reports(id,batch,fling,sequence,fingerprint,reporter,reported_at) VALUES(?,?,?,?,?,?,?)',
          id,
          review.report.batch_id,
          fling,
          Number(input.results_revision) + 1,
          review.fingerprint,
          actor.kind === 'organizer' ? actor.id : '',
          now,
        ),
        ...review.report.results.map((r) =>
          this.q(
            'INSERT INTO message_results(report,delivery,batch,fling,status,evidence,attempt) VALUES(?,?,?,?,?,?,?)',
            id,
            r.delivery_id,
            review.report.batch_id,
            fling,
            r.status,
            r.evidence,
            r.attempt ?? 1,
          ),
        ),
        this.audit(actor, fling, 'report-message-results', id),
      ],
      true,
    );
    return {
      report_id: id,
      results_revision: Number(input.results_revision) + 1,
      reported_at: now,
      counts: review.counts,
    };
  }
  override async history(actor: Actor, fling: string) {
    const base = await super.history(actor, fling);
    const batches = [];
    for (const batch of base.batches) {
      const state = await this.resultState(actor, fling, String(batch.id));
      batches.push({
        ...batch,
        outcome: state.reports.length
          ? 'reported results; receipt unverified'
          : 'unknown',
        results_revision: Number(state.row.results_revision),
        retries: [...new Set(state.retries.map((r) => Number(r.attempt)))].map(
          (attempt) => {
            const checks = state.retries.filter((r) => r.attempt === attempt),
              first = checks[0];
            return {
              attempt,
              owner: String(first.owner),
              owner_name: String(first.owner_name),
              exported: Number(first.exported),
              can_recopy:
                Number(first.results_revision) === state.row.results_revision,
              checks: checks.map((r) => ({
                delivery_id: String(r.delivery),
                evidence: String(r.evidence),
              })),
            };
          },
        ),
        results: {
          deliveries: state.deliveries,
          reports: state.reports,
          counts: state.counts,
        },
      });
    }
    return { batches };
  }
}
