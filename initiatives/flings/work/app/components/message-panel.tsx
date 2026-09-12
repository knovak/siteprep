'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Manifest } from '../lib/messages';
type Row = Record<string, unknown>;
type Props = {
  fling: string;
  selection: Row;
  deliveries: { member: string; name: string }[];
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
};
type Review = {
  manifest: Manifest;
  fingerprint: string;
  omissions: { member: string; name: string; reason: string }[];
  duplicates: { destination: string; channel: string }[];
};
type History = {
  id: string;
  owner: string;
  payload_hash: string;
  revision: number;
  approved: number | null;
  exported: number | null;
  send_until: number;
  manifest: Manifest;
  state: string;
  outcome: string;
  needs_renewed_review: boolean;
};
export default function MessagePanel({
  fling,
  selection,
  deliveries,
  request,
}: Props) {
  const [core, setCore] = useState(''),
    [subject, setSubject] = useState(''),
    [notes, setNotes] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review | null>(null),
    [approved, setApproved] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [duplicates, setDuplicates] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [prompt, setPrompt] = useState(''),
    [notice, setNotice] = useState(''),
    [history, setHistory] = useState<History[]>([]);
  const members = [...new Map(deliveries.map((d) => [d.member, d])).values()];
  const endpoint = fling + '/organizer/messages';
  async function refreshHistory() {
    const r = (await request(endpoint)) as { batches: History[] };
    setHistory(r.batches);
  }
  useEffect(() => {
    let cancelled = false;
    void request(endpoint)
      .then((r) => {
        if (!cancelled) setHistory((r as { batches: History[] }).batches);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [endpoint, request]);
  function clearReview() {
    setReview(null);
    setApproved(false);
    setConfirmed(false);
    setDuplicates(false);
    setPrompt('');
    setNotice('');
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setPrompt('');
    setNotice('');
    try {
      await fn();
      await refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    clearReview();
    await run(async () =>
      setReview(
        (await request(endpoint + '/prepare', 'POST', {
          ...selection,
          core_text: core,
          subject,
          suffixes: notes,
        })) as Review,
      ),
    );
  }
  const identity = (r: Review) => ({
    batch_id: r.manifest.batch_id,
    revision: r.manifest.revision,
    fingerprint: r.fingerprint,
  });
  async function copy(input: Row) {
    await run(async () => {
      const r = (await request(endpoint + '/export', 'POST', input)) as {
        prompt: string;
      };
      setPrompt(r.prompt);
      try {
        await navigator.clipboard.writeText(r.prompt);
        setNotice(
          'Prompt copied. Exported for sending; outcomes remain unknown.',
        );
      } catch {
        setNotice(
          'Prompt exported. Select and copy the text below; outcomes remain unknown.',
        );
      }
    });
  }
  return (
    <section
      id="message-composer"
      className="message-panel"
      aria-label="Exact message review"
    >
      <h3>Write the message</h3>
      <p>
        Prepare up to five individual deliveries. You will review every
        destination and personal link before approving.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void prepare();
        }}
      >
        <fieldset disabled={busy}>
          <div className="field">
            <Label htmlFor="message-subject">Email subject</Label>
            <Input
              id="message-subject"
              maxLength={200}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                clearReview();
              }}
            />
          </div>
          <div className="field">
            <Label htmlFor="message-core">Core message</Label>
            <Textarea
              id="message-core"
              required
              maxLength={4000}
              value={core}
              onChange={(e) => {
                setCore(e.target.value);
                clearReview();
              }}
            />
          </div>
          {members.map((m) => (
            <div className="field" key={m.member}>
              <Label htmlFor={'note-' + m.member}>
                Personal note for {m.name}
              </Label>
              <Textarea
                id={'note-' + m.member}
                maxLength={4000}
                value={notes[m.member] ?? ''}
                onChange={(e) => {
                  setNotes({ ...notes, [m.member]: e.target.value });
                  clearReview();
                }}
              />
              <p className="muted">
                Optional. Their personal link follows this note.
              </p>
            </div>
          ))}
          <Button
            type="submit"
            disabled={!deliveries.length || deliveries.length > 5}
          >
            Review exact messages
          </Button>
        </fieldset>
      </form>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {review && (
        <div className="message-review">
          <h3>Review each delivery</h3>
          <p>
            Created {new Date(review.manifest.created_at).toLocaleString()}.
            Send before {new Date(review.manifest.send_before).toLocaleString()}
            .
          </p>
          <p>
            Only the core message and personal note/link below go to each
            recipient. This batch creates no discussion post.
          </p>
          {review.omissions.map((m) => (
            <p key={m.member} className="notice">
              Omitted: {m.name} · {m.reason}
            </p>
          ))}
          {review.manifest.deliveries.map((d) => (
            <article className="message-delivery" key={d.id}>
              <h4>
                {d.name} · {d.channel}
              </h4>
              <p>{d.destination}</p>
              {d.subject !== undefined && (
                <p>
                  <strong>Subject:</strong> {d.subject}
                </p>
              )}
              <pre>{review.manifest.core_text + '\n\n' + d.suffix}</pre>
            </article>
          ))}
          {!approved ? (
            <fieldset disabled={busy}>
              {review.duplicates.length > 0 && (
                <div className="notice">
                  <p>
                    Shared destinations:{' '}
                    {review.duplicates
                      .map((d) => d.destination + ' (' + d.channel + ')')
                      .join(', ')}
                  </p>
                  <Label className="choice">
                    <Checkbox
                      checked={duplicates}
                      onCheckedChange={(v) => setDuplicates(v === true)}
                    />
                    I reviewed the separate memberships sharing destinations.
                  </Label>
                </div>
              )}
              <Label className="choice">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                />
                I reviewed every destination, exact message, omission and
                personal link.
              </Label>
              <Button
                disabled={
                  !confirmed || (review.duplicates.length > 0 && !duplicates)
                }
                onClick={() =>
                  void run(async () => {
                    await request(endpoint + '/approve', 'POST', {
                      ...identity(review),
                      confirm: true,
                      confirm_duplicates: duplicates,
                    });
                    setApproved(true);
                  })
                }
              >
                Approve these exact messages
              </Button>
            </fieldset>
          ) : (
            <p className="notice">
              Approved. Ready to copy; nothing has been sent.
            </p>
          )}
          {approved && (
            <Button disabled={busy} onClick={() => void copy(identity(review))}>
              Copy sending prompt
            </Button>
          )}
        </div>
      )}
      <p className="message-exposure">
        Copying exposes selected contacts and personal access links to your
        clipboard and external LLM. Use your intended sender accounts. Stop an
        external run if recipients or gathering details change. Flings cannot
        recall copied prompts. Check Sent or conversation history before
        retrying any unknown outcome.
      </p>
      {notice && <output className="notice">{notice}</output>}
      {prompt && (
        <div className="field">
          <Label htmlFor="sending-prompt">Exported sending prompt</Label>
          <Textarea
            id="sending-prompt"
            readOnly
            value={prompt}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
      <details className="message-history">
        <summary>Message review history ({history.length})</summary>
        {history.map((h) => (
          <article key={h.id} className="message-delivery">
            <h4>{h.manifest.deliveries[0]?.subject || 'Message batch'}</h4>
            <p>
              {h.state} · outcomes {h.outcome} · {h.manifest.deliveries.length}{' '}
              deliveries
            </p>
            <p>Send before {new Date(h.send_until).toLocaleString()}.</p>
            <p className="muted">
              Personal links are removed from this history.
              {h.needs_renewed_review &&
                ' Prepare a new review before sending.'}
            </p>
            {h.approved !== null && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void copy({
                    batch_id: h.id,
                    revision: h.revision,
                    fingerprint: h.payload_hash,
                  })
                }
              >
                Recheck and copy approved prompt
              </Button>
            )}
          </article>
        ))}
      </details>
    </section>
  );
}
