'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { MessageRetryStore } from '../lib/message-retries';
type Batch = Awaited<
  ReturnType<MessageRetryStore['history']>
>['batches'][number];
type Preview = Awaited<ReturnType<MessageRetryStore['previewRetry']>>;
export default function MessageRetryPanel({
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
  const [selected, setSelected] = useState<Record<string, string>>({}),
    [checked, setChecked] = useState(false),
    [stopped, setStopped] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [preview, setPreview] = useState<Preview | null>(null),
    [prompt, setPrompt] = useState<{ text: string; revision: number } | null>(
      null,
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const identity = {
    batch_id: batch.id,
    revision: batch.revision,
    fingerprint: batch.payload_hash,
  };
  const eligible = batch.results.deliveries.filter((d) =>
    ['unknown', 'reported_failed'].includes(d.status),
  );
  function clear() {
    setPreview(null);
    setConfirmed(false);
    setPrompt(null);
    setError('');
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setPrompt(null);
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
  async function showPrompt(result: {
    prompt: string;
    results_revision: number;
  }) {
    await refresh();
    setPrompt({ text: result.prompt, revision: result.results_revision });
    try {
      await navigator.clipboard.writeText(result.prompt);
    } catch {
      /* The visible text is the copy fallback. */
    }
  }
  return (
    <section aria-label="Selected delivery retries">
      <h5>Retry selected deliveries</h5>
      <p>
        Stop the previous external run. For each delivery, inspect the correct
        account’s Sent or conversation history and confirm it was not sent.
        Leave uncertain deliveries alone. Flings cannot inspect those accounts
        or prevent reuse of an old copied prompt.
      </p>
      <p className="muted">
        Copying exposes the selected contacts and personal links to your
        clipboard and external tool. It does not send or verify receipt. Send
        before {new Date(Number(batch.send_until)).toLocaleString()}.
      </p>
      {batch.needs_renewed_review ? (
        <p className="notice">
          This batch needs a new message review before further sending.
        </p>
      ) : (
        <fieldset disabled={busy}>
          {eligible.map((d) => (
            <div className="field" key={d.id}>
              <Label className="choice">
                <Checkbox
                  checked={Object.hasOwn(selected, d.id)}
                  onCheckedChange={(v) => {
                    clear();
                    const next = { ...selected };
                    if (v === true) next[d.id] = '';
                    else delete next[d.id];
                    setSelected(next);
                  }}
                />
                {d.name} · {d.channel} · attempt {d.attempt}
              </Label>
              {Object.hasOwn(selected, d.id) && (
                <>
                  <Label htmlFor={'history-' + d.id}>
                    Account-history check for {d.name} · {d.channel}
                  </Label>
                  <Textarea
                    id={'history-' + d.id}
                    value={selected[d.id]}
                    maxLength={4000}
                    onChange={(e) => {
                      clear();
                      setSelected({ ...selected, [d.id]: e.target.value });
                    }}
                    placeholder="Which account and history did you inspect, and what established that this delivery was not sent?"
                  />
                </>
              )}
            </div>
          ))}
          {!eligible.length && (
            <p>No failed or unknown deliveries to select.</p>
          )}
          <Label className="choice">
            <Checkbox
              checked={stopped}
              onCheckedChange={(v) => {
                clear();
                setStopped(v === true);
              }}
            />
            The prior sending run has stopped.
          </Label>
          <Label className="choice">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => {
                clear();
                setChecked(v === true);
              }}
            />
            I checked account history and confirmed every selected delivery was
            not sent.
          </Label>
          <Button
            disabled={
              !stopped ||
              !checked ||
              !Object.keys(selected).length ||
              Object.values(selected).some((v) => !v.trim())
            }
            onClick={() =>
              void run(async () => {
                setConfirmed(false);
                setPreview(
                  (await request(endpoint + '/retry-preview', 'POST', {
                    ...identity,
                    history_checked: checked,
                    prior_run_stopped: stopped,
                    checks: Object.entries(selected).map(
                      ([delivery_id, evidence]) => ({ delivery_id, evidence }),
                    ),
                  })) as Preview,
                );
              })
            }
          >
            Review selected retry
          </Button>
        </fieldset>
      )}
      {preview && preview.results_revision === batch.results_revision && (
        <section className="notice" aria-label="Selected retry review">
          <h5>Review attempt {preview.manifest.attempt}</h5>
          <p>
            Only these {preview.manifest.deliveries.length} deliveries will
            appear in the retry prompt. The existing discussion post stays in
            place.
          </p>
          {preview.manifest.deliveries.map((d) => (
            <div className="message-delivery" key={d.id}>
              <strong>
                {d.name} · {d.channel} · {d.destination}
              </strong>
              {d.subject && <p>Subject: {d.subject}</p>}
              <pre>{preview.manifest.core_text + '\n\n' + d.suffix}</pre>
              <p>
                Account-history evidence:{' '}
                {preview.checks.find((c) => c.delivery_id === d.id)?.evidence}
              </p>
            </div>
          ))}
          <fieldset disabled={busy}>
            <Label className="choice">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
              />
              I reviewed these exact selected messages and destinations.
            </Label>
            <Button
              disabled={!confirmed}
              onClick={() =>
                void run(async () => {
                  const result = (await request(
                    endpoint + '/retry-export',
                    'POST',
                    {
                      ...preview,
                      manifest: undefined,
                      confirm: true,
                      history_checked: checked,
                      prior_run_stopped: stopped,
                    },
                  )) as { prompt: string; results_revision: number };
                  setPreview(null);
                  setSelected({});
                  setChecked(false);
                  setStopped(false);
                  setConfirmed(false);
                  await showPrompt(result);
                })
              }
            >
              Confirm and copy selected retry
            </Button>
          </fieldset>
        </section>
      )}
      {batch.retries.length > 0 && (
        <details>
          <summary>Retry history ({batch.retries.length})</summary>
          {batch.retries.map((r) => (
            <article key={r.attempt}>
              <p>
                Attempt {r.attempt} · {r.owner_name} ({r.owner}) ·{' '}
                {new Date(r.exported).toLocaleString()} · {r.checks.length}{' '}
                selected deliveries
              </p>
              {r.checks.map((c) => (
                <p key={c.delivery_id}>
                  {c.delivery_id}: {c.evidence}
                </p>
              ))}
              {r.can_recopy && !batch.needs_renewed_review && (
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    void run(async () => {
                      await showPrompt(
                        (await request(endpoint + '/retry-recopy', 'POST', {
                          ...identity,
                          attempt: r.attempt,
                        })) as { prompt: string; results_revision: number },
                      );
                    })
                  }
                >
                  Recheck and copy attempt {r.attempt}
                </Button>
              )}
            </article>
          ))}
        </details>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {prompt && prompt.revision === batch.results_revision && (
        <>
          <p className="notice">
            Retry exported for sending. Selected outcomes are unknown until
            reported. Copy the text below if clipboard access was unavailable.
          </p>
          <Label htmlFor={'retry-prompt-' + batch.id}>
            Selected retry sending prompt
          </Label>
          <Textarea
            id={'retry-prompt-' + batch.id}
            value={prompt.text}
            readOnly
            rows={10}
          />
        </>
      )}
    </section>
  );
}
