'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { RecoveryCheck } from '../lib/recovery-check';
import RecoveryPreviewPanel from './recovery-preview-panel';
const MAX_BYTES = 8 * 1024 * 1024;
export default function RecoveryCheckPanel({
  fling,
  request,
}: {
  fling: string;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<RecoveryCheck | null>(null);
  const sequence = useRef(0),
    input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  function clear() {
    sequence.current++;
    setFile(null);
    setBusy(false);
    setError('');
    setResult(null);
    if (input.current) input.current.value = '';
  }
  async function check() {
    if (!file) return;
    const current = ++sequence.current;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      if (file.size > MAX_BYTES)
        throw new Error('Choose a JSON file no larger than 8 MiB.');
      let value: unknown;
      try {
        value = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            await file.arrayBuffer(),
          ),
        );
      } catch {
        throw new Error(
          'This file is not valid UTF-8 JSON. Preserve the original and correct a copy.',
        );
      }
      if (current !== sequence.current) return;
      const report = (await request(
        fling + '/organizer/recovery/check',
        'POST',
        value,
      )) as RecoveryCheck;
      if (current === sequence.current) setResult(report);
    } catch (e) {
      if (current === sequence.current) setError((e as Error).message);
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  return (
    <section className="profile-panel" aria-label="Check a gathering backup">
      <h2>Check an edited backup</h2>
      <p>
        Preserve your original export and choose an edited copy to check.
        Checking sends the file to this private workspace for validation; the
        upload is not saved.
      </p>
      <p className="notice">
        This checks the file only. It does not restore a gathering, grant access
        or send messages.
      </p>
      <label className="block">
        Gathering JSON file (up to 8 MiB)
        <input
          className="mt-2 block w-full min-w-0 rounded-md border p-2"
          ref={input}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            sequence.current++;
            setBusy(false);
            setResult(null);
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            setError(
              selected && selected.size > MAX_BYTES
                ? 'Choose a JSON file no larger than 8 MiB.'
                : '',
            );
          }}
        />
      </label>
      <div className="actions">
        <Button
          disabled={!file || file.size > MAX_BYTES || busy}
          onClick={() => void check()}
        >
          {busy ? 'Checking file…' : 'Check backup file'}
        </Button>
        <Button
          variant="outline"
          onClick={clear}
          disabled={!file && !result && !error}
        >
          Clear file and result
        </Button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <output className="notice block" aria-live="polite">
          {result.valid && result.summary ? (
            <>
              <p>
                <strong>File checks passed.</strong>{' '}
                {result.summary.total.toLocaleString()} records in{' '}
                {Object.keys(result.summary.counts).length} collections.
              </p>
              <p>
                {result.summary.historicalOrganizers} historical organizer
                names; these grant no access. {result.summary.redactions}{' '}
                personal-link fields were removed in the export.
              </p>
              <p>
                Message records describe historical claims only. Restore cancels
                unfinished handoffs. New member links require a separate action.
              </p>
              <p>
                No gathering was created or changed. Passing these checks does
                not prove the file is trustworthy or that a restore has
                succeeded.
              </p>
              <details>
                <summary>Records in this file</summary>
                <ul>
                  {Object.entries(result.summary.counts).map(
                    ([name, count]) => (
                      <li key={name}>
                        {name.replaceAll('_', ' ')}: {count}
                      </li>
                    ),
                  )}
                </ul>
              </details>
            </>
          ) : (
            <>
              <p>
                <strong>Correct this copy before continuing.</strong>{' '}
                {result.issues.length}{' '}
                {result.truncated
                  ? 'listed issues (more may remain)'
                  : 'issues found'}
                .
              </p>
              <ul>
                {result.issues.map((item, i) => (
                  <li key={i}>
                    <code className="break-all">{item.path || '/'}</code>:{' '}
                    {item.message}
                  </li>
                ))}
              </ul>
              <p>
                Paths use zero-based positions: /records/events/0 means the
                first event. No uploaded text is included in these errors.
              </p>
            </>
          )}
        </output>
      )}
      {file && result?.valid && (
        <RecoveryPreviewPanel file={file} fling={fling} request={request} />
      )}
    </section>
  );
}
