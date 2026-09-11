/* oxlint-disable next/no-html-link-for-pages -- Full navigation clears the previous member page context. */
'use client';
import { useSyncExternalStore, useState } from 'react';
import { Button } from '@/components/ui/button';
const gatherings = [
  {
    id: 'outing',
    title: 'A movie, then dinner',
    detail: 'An evening together',
    label: 'Alex Morgan',
  },
  {
    id: 'wedding',
    title: 'Maya & Theo’s wedding',
    detail: 'Three days, separate invitations',
    label: 'Jordan Lee',
  },
  {
    id: 'concerts',
    title: 'Concerts through autumn',
    detail: 'A series over several months',
    label: 'Alex Morgan',
  },
];
export default function Home() {
  const [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  async function open(example: string) {
    setBusy(example);
    setError('');
    try {
      const r = await fetch('/api/flings/local/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-flings-local': '1' },
        body: JSON.stringify({ example }),
      });
      const data = (await r.json()) as { url: string; error?: string };
      if (!r.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy('');
    }
  }
  return (
    <main className="workspace">
      <header>
        <a className="wordmark" href="/">
          flings<span>✳</span>
        </a>
        <span className="rehearsal">Local rehearsal · fictional people</span>
      </header>
      <section className="intro">
        <p className="eyebrow">Gather together</p>
        <h1>A place for each fling.</h1>
        <p>
          Member pages keep each gathering’s invitations and contact details
          together.
        </p>
      </section>
      <p className="organizer-entry">
        <a href="/organizer">Open the organizer rehearsal →</a>
      </p>
      <div className="gatherings">
        {gatherings.map((g, i) => (
          <article key={g.id}>
            <span className="number">0{i + 1}</span>
            <h2>{g.title}</h2>
            <p>{g.detail}</p>
            <hr />
            <p className="member-name">{g.label}</p>
            <Button
              size="lg"
              disabled={!ready || !!busy}
              onClick={() => void open(g.id)}
            >
              {busy === g.id ? 'Opening…' : 'Open member page'}
            </Button>
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="footnote">
        Three fictional gatherings. Your profile is separate in each one. No
        messages are sent.
      </p>
    </main>
  );
}
