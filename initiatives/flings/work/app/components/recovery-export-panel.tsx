'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RecoveryExportStore } from '../lib/recovery-export';
type Export = Awaited<ReturnType<RecoveryExportStore['exportRecovery']>>;
export default function RecoveryExportPanel({
  fling,
  request,
}: {
  fling: string;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}) {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [ready, setReady] = useState<{
    url: string;
    filename: string;
    bytes: number;
    counts: Record<string, number>;
    redactions: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (ready) URL.revokeObjectURL(ready.url);
    },
    [ready],
  );
  return (
    <section className="profile-panel" aria-label="Export gathering records">
      <h2>Save a copy of this gathering</h2>
      <p>
        Download a JSON file containing member contacts, activities,
        discussions, polls, payment history and reported message history. Access
        credentials and personal links are excluded.
      </p>
      <p className="notice">
        The file is unencrypted personal data. Keep it somewhere you control.
        Preserve the original before editing a copy. Restoring an edited file
        and deleting a gathering are still being built.
      </p>
      <p>
        <a href="/recovery/format-v1.html" target="_blank" rel="noreferrer">
          Read the file guide
        </a>{' '}
        ·{' '}
        <a href="/recovery/schema-v1.json" download>
          JSON schema
        </a>{' '}
        ·{' '}
        <a href="/recovery/example-v1.json" download>
          Fictional example
        </a>
      </p>
      <fieldset disabled={busy}>
        <Label className="choice">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => {
              setConfirmed(v === true);
              setReady(null);
              setError('');
            }}
          />
          I understand that this file contains unencrypted personal data.
        </Label>
        <Button
          disabled={!confirmed}
          onClick={() => {
            setBusy(true);
            setError('');
            setReady(null);
            void request(fling + '/organizer/recovery/export', 'POST', {
              confirm_unencrypted: true,
            })
              .then((value) => {
                if (!alive.current) return;
                const result = value as Export;
                const blob = new Blob(
                  [JSON.stringify(result.file, null, 2) + '\n'],
                  { type: 'application/json;charset=utf-8' },
                );
                setReady({
                  url: URL.createObjectURL(blob),
                  filename: result.filename,
                  bytes: result.bytes,
                  counts: result.file.counts,
                  redactions: result.file.redactions.text_fields,
                });
              })
              .catch((e) => {
                if (alive.current) setError((e as Error).message);
              })
              .finally(() => {
                if (alive.current) setBusy(false);
              });
          }}
        >
          {busy ? 'Preparing file…' : 'Prepare JSON export'}
        </Button>
      </fieldset>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {ready && (
        <output className="notice block">
          <p>
            Ready: {Object.values(ready.counts).reduce((a, b) => a + b, 0)}{' '}
            records · {ready.bytes.toLocaleString()} bytes. {ready.redactions}{' '}
            text fields removed because they contained personal access links.
          </p>
          <p>
            <a href={ready.url} download={ready.filename}>
              Save JSON file
            </a>
          </p>
          <p className="muted">
            Your browser controls where the file is saved; use Save Link As to
            choose a folder. This is a snapshot, so prepare another export after
            later edits.
          </p>
          <details>
            <summary>Records included</summary>
            <ul>
              {Object.entries(ready.counts).map(([name, count]) => (
                <li key={name}>
                  {name.replaceAll('_', ' ')}: {count}
                </li>
              ))}
            </ul>
          </details>
        </output>
      )}
    </section>
  );
}
