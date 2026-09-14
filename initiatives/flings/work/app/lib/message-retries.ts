import { AccessError, digest, mac, validMac, type Actor } from './access.ts';
import { safeText } from './coordination.ts';
import { MessageResultStore } from './message-results.ts';
import { sendingInstructions, type Manifest } from './messages.ts';
type Row = Record<string, unknown>;
type Check = { delivery_id: string; evidence: string };
function checks(value: unknown): Check[] {
  if (!Array.isArray(value) || !value.length || value.length > 5)
    throw new AccessError(
      400,
      'Select one to five deliveries after checking account history.',
    );
  const result = value
    .map((v) => {
      if (
        !v ||
        typeof v !== 'object' ||
        Array.isArray(v) ||
        Object.keys(v).some((k) => !['delivery_id', 'evidence'].includes(k)) ||
        typeof v.delivery_id !== 'string'
      )
        throw new AccessError(
          400,
          'Use delivery IDs and account-history evidence.',
        );
      safeText(v.evidence);
      return { delivery_id: v.delivery_id, evidence: v.evidence } as Check;
    })
    .sort((a, b) => a.delivery_id.localeCompare(b.delivery_id));
  if (
    new Set(result.map((c) => c.delivery_id)).size !== result.length ||
    new TextEncoder().encode(JSON.stringify(result)).length > 8000
  )
    throw new AccessError(
      400,
      'Select each delivery once and keep history notes within 8,000 bytes.',
    );
  return result;
}
function subset(manifest: Manifest, selected: Check[], attempt: number) {
  return {
    ...manifest,
    attempt,
    deliveries: manifest.deliveries.filter((d) =>
      selected.some((c) => c.delivery_id === d.id),
    ),
  };
}

export class MessageRetryStore extends MessageResultStore {
  async retryReview(actor: Actor, fling: string, input: Row) {
    if (input.history_checked !== true || input.prior_run_stopped !== true)
      throw new AccessError(
        400,
        'Stop the previous run and check Sent or conversation history for every selected delivery first.',
      );
    const selected = checks(input.checks),
      { row, manifest } = await this.verified(actor, fling, input),
      state = await this.resultState(actor, fling, String(row.id));
    if (row.approved === null || row.exported === null)
      throw new AccessError(
        409,
        'Only an approved, exported batch can be retried.',
      );
    for (const c of selected) {
      const d = state.deliveries.find((d) => d.id === c.delivery_id);
      if (!d || !['unknown', 'reported_failed'].includes(d.status))
        throw new AccessError(
          409,
          'Select only failed or unknown deliveries confirmed not sent in account history.',
        );
    }
    const attempt =
        Math.max(1, ...state.retries.map((r) => Number(r.attempt))) + 1,
      retry = subset(manifest, selected, attempt),
      fingerprint = await digest(JSON.stringify(retry));
    // Preview may disclose the existing payload only while its original codes remain eligible.
    await this.batch(actor, fling, [
      ...this.currentGuard(fling, String(row.context)),
      ...this.codeGuard(String(row.id)),
    ]);
    return {
      row,
      selected,
      manifest: retry,
      fingerprint,
      results_revision: Number(state.row.results_revision),
    };
  }
  retryText(
    actor: Actor,
    fling: string,
    review: Awaited<ReturnType<MessageRetryStore['retryReview']>>,
    expires: number,
  ) {
    return JSON.stringify([
      'flings-retry-v1',
      actor,
      fling,
      review.row.context,
      review.selected,
      review.fingerprint,
      review.results_revision,
      expires,
    ]);
  }
  async previewRetry(actor: Actor, fling: string, input: Row) {
    const review = await this.retryReview(actor, fling, input),
      expires = this.clock() + 10 * 60000;
    return {
      batch_id: review.row.id,
      revision: 1,
      fingerprint: review.row.payload_hash,
      checks: review.selected,
      manifest: review.manifest,
      retry_fingerprint: review.fingerprint,
      results_revision: review.results_revision,
      expires,
      token: await mac(
        this.secret,
        this.retryText(actor, fling, review, expires),
      ),
    };
  }
  async exportRetry(actor: Actor, fling: string, input: Row) {
    const review = await this.retryReview(actor, fling, input);
    if (
      input.confirm !== true ||
      typeof input.token !== 'string' ||
      typeof input.expires !== 'number' ||
      this.clock() >= input.expires ||
      input.results_revision !== review.results_revision ||
      input.retry_fingerprint !== review.fingerprint ||
      !(await validMac(
        this.secret,
        this.retryText(actor, fling, review, input.expires),
        input.token,
      ))
    )
      throw new AccessError(
        409,
        'Review these selected messages again, then explicitly confirm the retry.',
      );
    const now = this.clock(),
      id = String(review.row.id),
      attempt = review.manifest.attempt;
    await this.batch(
      actor,
      fling,
      [
        ...this.currentGuard(fling, String(review.row.context)),
        ...this.codeGuard(id),
        ...this.condition(
          `EXISTS(SELECT 1 FROM message_batches WHERE id=? AND approved IS NOT NULL
        AND exported IS NOT NULL AND ciphertext IS NOT NULL AND send_until>? AND results_revision=?)`,
          [id, now, review.results_revision],
        ),
        this.q(
          'UPDATE message_batches SET results_revision=results_revision+1 WHERE id=?',
          id,
        ),
        this.q(
          'INSERT INTO message_retries(batch,fling,attempt,owner,exported,payload_hash,results_revision) VALUES(?,?,?,?,?,?,?)',
          id,
          fling,
          attempt,
          review.row.owner,
          now,
          review.fingerprint,
          review.results_revision + 1,
        ),
        ...review.selected.map((c) =>
          this.q(
            'INSERT INTO message_retry_deliveries(batch,fling,attempt,delivery,evidence) VALUES(?,?,?,?,?)',
            id,
            fling,
            attempt,
            c.delivery_id,
            c.evidence,
          ),
        ),
        this.audit(actor, fling, 'export-message-retry', id + ':' + attempt),
      ],
      true,
    );
    return {
      prompt: sendingInstructions + JSON.stringify(review.manifest, null, 2),
      attempt,
      results_revision: review.results_revision + 1,
      state: 'exported for sending',
      send_before: review.manifest.send_before,
    };
  }
  async recopyRetry(actor: Actor, fling: string, input: Row) {
    const { row, manifest } = await this.verified(actor, fling, input),
      state = await this.resultState(actor, fling, String(row.id)),
      selected = state.retries.filter((r) => r.attempt === input.attempt);
    if (
      !selected.length ||
      selected[0].results_revision !== state.row.results_revision
    )
      throw new AccessError(
        409,
        'This retry has results or a newer attempt. Inspect history and review a new selection.',
      );
    const retry = subset(
      manifest,
      selected.map((r) => ({
        delivery_id: String(r.delivery),
        evidence: String(r.evidence),
      })),
      Number(input.attempt),
    );
    if ((await digest(JSON.stringify(retry))) !== selected[0].payload_hash)
      throw new AccessError(
        409,
        'This retry could not be verified. Review a new selection.',
      );
    await this.batch(actor, fling, [
      ...this.currentGuard(fling, String(row.context)),
      ...this.codeGuard(String(row.id)),
      ...this.condition(
        'EXISTS(SELECT 1 FROM message_batches WHERE id=? AND ciphertext IS NOT NULL AND send_until>? AND results_revision=?)',
        [row.id, this.clock(), selected[0].results_revision],
      ),
    ]);
    return {
      prompt: sendingInstructions + JSON.stringify(retry, null, 2),
      attempt: retry.attempt,
      results_revision: Number(selected[0].results_revision),
      state: 'exported for sending',
      send_before: retry.send_before,
    };
  }
}
