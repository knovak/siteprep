'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { RecoveryPreview } from '../lib/recovery-preview';

export default function RecoveryPreviewPanel({
  file,
  fling,
  request,
}: {
  file: File;
  fling: string;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}) {
  const [result, setResult] = useState<RecoveryPreview | null>(null),
    [choices, setChoices] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const sequence = useRef(0);
  const choice = (id: string) =>
    Object.hasOwn(choices, id) ? choices[id] : '';
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  async function review(withMapping: boolean) {
    const current = ++sequence.current;
    setBusy(true);
    setError('');
    setResult((previous) =>
      withMapping && previous ? { ...previous, plan: null } : null,
    );
    if (!withMapping) setChoices({});
    try {
      const value = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await file.arrayBuffer(),
        ),
      );
      if (current !== sequence.current) return;
      const body: Record<string, unknown> = { file: value };
      if (withMapping)
        body.organizer_mapping = result!.identities.map((r) => ({
          source: r.id,
          target: choice(r.id) === 'history' ? null : choice(r.id).slice(8),
        }));
      if (
        new TextEncoder().encode(JSON.stringify(body)).length >
        8 * 1024 * 1024
      )
        throw new Error(
          'The backup and organizer choices together must fit within 8 MiB.',
        );
      const next = (await request(
        fling + '/organizer/recovery/restore-preview',
        'POST',
        body,
      )) as RecoveryPreview;
      if (current !== sequence.current) return;
      if (!next.check.valid) {
        setResult(null);
        throw new Error(
          'The backup no longer passes file checks. Clear it and check the edited copy again.',
        );
      }
      setResult(next);
    } catch (e) {
      if (current === sequence.current) {
        setResult(null);
        setChoices({});
        setError((e as Error).message);
      }
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  const plan = result?.plan;
  return (
    <section className="profile-panel" aria-label="Preview a new gathering">
      <h3>Preview a new gathering</h3>
      <p>
        Choose which existing organizer accounts would manage a restored copy.
        Names in the file are historical labels, even when they match an
        account.
      </p>
      <p className="notice">
        Preview only. Creating the restored gathering is not available yet.
      </p>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void review(false)}
      >
        {busy && !result
          ? 'Loading organizer choices…'
          : 'Load organizer choices'}
      </Button>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {result?.importer && (
        <>
          <p>
            <strong>{result.importer.name}</strong> is your current organizer
            account and would keep access. Other choices are limited to accounts
            assigned to the gathering you opened.
          </p>
          <p>
            Choose <strong>History only</strong> to preserve a name without
            giving an account access. Historical organizers without an
            assignment in the file can only stay as history.
          </p>
          {result.identities.map((identity, index) => (
            <label className="block my-3" key={identity.id}>
              Organizer {index + 1} in file:{' '}
              <strong className="break-all">{identity.name}</strong>
              <span className="block text-sm break-all">
                File reference: {identity.id}
              </span>
              <select
                className="mt-2 block w-full min-w-0 rounded-md border p-2"
                aria-label={'Account for historical organizer ' + (index + 1)}
                value={choice(identity.id)}
                onChange={(e) => {
                  sequence.current++;
                  setBusy(false);
                  setError('');
                  setChoices({ ...choices, [identity.id]: e.target.value });
                  setResult({ ...result, plan: null });
                }}
              >
                <option value="" disabled>
                  Choose explicitly…
                </option>
                <option value="history">
                  History only — no account access
                </option>
                {identity.assigned &&
                  result.accounts.map((account) => (
                    <option key={account.id} value={'account:' + account.id}>
                      {account.name} ({account.id})
                      {account.id === result.importer!.id
                        ? ' — your account'
                        : ''}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <Button
            disabled={busy || result.identities.some((r) => !choice(r.id))}
            onClick={() => void review(true)}
          >
            {busy ? 'Preparing preview…' : 'Review restore preview'}
          </Button>
        </>
      )}
      {plan && (
        <div className="notice block" aria-live="polite">
          <h4>Proposed restore — nothing has been created</h4>
          <p>
            A new private gathering named{' '}
            <strong className="break-all">{plan.title}</strong>, preserving its{' '}
            <strong>{plan.state}</strong> state, would contain{' '}
            {plan.total.toLocaleString()} imported records. Existing gatherings
            would have no changes.
          </p>
          <p>
            Organizer accounts with proposed access:{' '}
            <strong>{plan.organizers.map((r) => r.name).join(', ')}</strong>.
            Your current account stays included.
          </p>
          <ul>
            {plan.mappings.map((r) => (
              <li className="break-all" key={r.source}>
                {r.name}:{' '}
                {r.account
                  ? 'account ' + r.account.name + ' (' + r.account.id + ')'
                  : 'history only; no account access'}
                . Historical attribution stays separate.
              </li>
            ))}
          </ul>
          <p>
            Restored records would receive fresh identifiers. Member profiles
            remain independent; matching names or contacts would not combine
            people.
          </p>
          <p>
            Access codes and sessions are excluded. {plan.unfinishedHandoffs}{' '}
            unfinished handoffs would be cancelled, and all{' '}
            {plan.importedResults} result records would be marked as imported
            history. No messages would be sent or resumed, and no money would be
            collected.
          </p>
          <p>
            {plan.redactions} personal-link fields were redacted in this file.
            New member links would need a separate explicit action.
          </p>
          <details>
            <summary>Proposed record additions</summary>
            <ul>
              {Object.entries(plan.counts).map(([name, count]) => (
                <li key={name}>
                  {name.replaceAll('_', ' ')}: {count}
                </li>
              ))}
            </ul>
          </details>
          <p>
            This preview is temporary and grants no access. The future restore
            step must check the file and account choices again before explicit
            confirmation.
          </p>
        </div>
      )}
    </section>
  );
}
