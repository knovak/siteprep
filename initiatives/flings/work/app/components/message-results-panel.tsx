'use client';
import { useState } from 'react';
import MessageRetryPanel from './message-retry-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  MessageResultStore,
  ReportedStatus,
} from '../lib/message-results';
type Batch = Awaited<
  ReturnType<MessageResultStore['history']>
>['batches'][number];
type Preview = Awaited<ReturnType<MessageResultStore['previewResults']>>;
const label = (status: ReportedStatus) =>
  ({
    reported_sent: 'Reported sent',
    reported_failed: 'Reported failed',
    suppressed: 'Suppressed',
    unknown: 'Outcome unknown',
  })[status];
export default function MessageResultsPanel({
  batch,
  endpoint,
  request,
  refresh,
}: {
  batch: Batch;
  endpoint: string;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
  refresh: () => Promise<void>;
}) {
  const [text, setText] = useState(''),
    [preview, setPreview] = useState<Preview | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const counts = batch.results.counts;
  function edit(value: string) {
    setText(value);
    setPreview(null);
    setConfirmed(false);
    setNotice('');
    setError('');
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Reported delivery outcomes">
      <h5>Reported outcomes</h5>
      <p>
        {counts.reported_sent} reported sent · {counts.reported_failed} reported
        failed · {counts.suppressed} suppressed · {counts.unknown} unknown
      </p>
      <p className="muted">
        Reports describe what an organizer or external tool observed. They do
        not verify recipient receipt. Omitted deliveries keep their previous
        outcome, initially unknown.
      </p>
      {batch.results.deliveries.map((d) => (
        <div key={d.id} className="message-delivery">
          <strong>
            {d.name} · {d.channel}: {label(d.status)} (attempt {d.attempt})
          </strong>
          <p className="muted">Delivery ID: {d.id}</p>
          {d.reported_at !== null && (
            <p>
              Reported by {String(d.reporter_name)} ({String(d.reporter)}) ·{' '}
              {new Date(Number(d.reported_at)).toLocaleString()}
            </p>
          )}
          {d.evidence && (
            <p style={{ whiteSpace: 'pre-wrap' }}>
              Claimed evidence: {d.evidence}
            </p>
          )}
        </div>
      ))}
      {batch.imported_at === null && batch.exported !== null && (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            Report delivery results
          </Button>
          {expanded && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPreview(null);
                setConfirmed(false);
                void run(async () => {
                  let report;
                  try {
                    report = JSON.parse(text);
                  } catch {
                    throw new Error(
                      'Enter valid result JSON before previewing.',
                    );
                  }
                  if (
                    report?.batch_id !== batch.id ||
                    report?.revision !== batch.revision
                  )
                    throw new Error(
                      'Use the batch ID and revision shown in this batch’s template.',
                    );
                  setPreview(
                    (await request(endpoint + '/results-preview', 'POST', {
                      report,
                    })) as Preview,
                  );
                });
              }}
            >
              <fieldset disabled={busy}>
                <p>
                  Paste the external report, or fill in the template after
                  inspecting Sent or conversation history. Remove rows you are
                  not reporting. Keep personal access links out of evidence.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    edit(
                      JSON.stringify(
                        {
                          batch_id: batch.id,
                          revision: batch.revision,
                          results: batch.results.deliveries.map((d) => ({
                            delivery_id: d.id,
                            status: 'unknown',
                            evidence: '',
                            ...(d.attempt > 1 ? { attempt: d.attempt } : {}),
                          })),
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  Use result template
                </Button>
                <div className="field">
                  <Label htmlFor={'report-' + batch.id}>Result JSON</Label>
                  <Textarea
                    id={'report-' + batch.id}
                    value={text}
                    maxLength={30000}
                    onChange={(e) => edit(e.target.value)}
                    required
                  />
                </div>
                <p className="muted">
                  Status: reported_sent, reported_failed, suppressed, or
                  unknown. Evidence is optional text describing the claimed app
                  observation or message reference.
                </p>
                <Button type="submit" disabled={!text}>
                  Preview result changes
                </Button>
              </fieldset>
            </form>
          )}
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="notice" aria-label="Result changes preview">
          <h5>Review result changes</h5>
          {preview.changes.map((r) => (
            <div key={r.delivery_id}>
              <strong>
                {r.name} · {r.channel}: {label(r.previous)} → {label(r.status)}
              </strong>
              <p>Previous claimed evidence: {r.previous_evidence || 'None'}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>
                New claimed evidence: {r.evidence || 'None'}
              </p>
            </div>
          ))}
          <p>
            {preview.unchanged} other deliveries remain unchanged. Earlier
            reports will stay in history.
          </p>
          <fieldset disabled={busy}>
            <Label className="choice">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
              />
              I reviewed these reported outcomes and evidence.
            </Label>
            <Button
              disabled={!confirmed}
              onClick={() =>
                void run(async () => {
                  await request(endpoint + '/results-record', 'POST', {
                    report: preview.report,
                    token: preview.token,
                    expires: preview.expires,
                    results_revision: preview.results_revision,
                    confirm: true,
                  });
                  setPreview(null);
                  setConfirmed(false);
                  setText('');
                  setExpanded(false);
                  await refresh();
                  setNotice(
                    'Results recorded. Recipient receipt remains unverified.',
                  );
                })
              }
            >
              Record reported outcomes
            </Button>
          </fieldset>
        </section>
      )}
      {notice && <output className="notice">{notice}</output>}
      {batch.results.reports.length > 0 && (
        <details>
          <summary>Report history ({batch.results.reports.length})</summary>
          {batch.results.reports.map((r) => (
            <article key={r.id}>
              <p>
                Report {r.sequence} · {r.reporter_name} ({r.reporter}) ·{' '}
                {new Date(r.reported_at).toLocaleString()}
              </p>
              {r.results.map((item) => (
                <p key={item.delivery_id} style={{ whiteSpace: 'pre-wrap' }}>
                  {item.delivery_id} (attempt {item.attempt}):{' '}
                  {label(item.status)}. Claimed evidence:{' '}
                  {item.evidence || 'None'}
                </p>
              ))}
            </article>
          ))}
        </details>
      )}
      {batch.results_revision > 0 && (
        <p className="notice">
          Full-batch recopy stops after results or a selected retry are
          recorded. Check account history before preparing any further sending.
        </p>
      )}
      {batch.imported_at === null && batch.exported !== null && (
        <MessageRetryPanel
          batch={batch}
          endpoint={endpoint}
          request={request}
          refresh={refresh}
        />
      )}
    </section>
  );
}
