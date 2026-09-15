/* oxlint-disable next/no-html-link-for-pages -- Full navigation clears account context. */
import { env } from 'cloudflare:workers';
import RehearsalHome from '@/components/rehearsal-home';
export const dynamic = 'force-dynamic';
export default function Home() {
  if ((env as unknown as { FLINGS_MODE?: string }).FLINGS_MODE !== 'chatgpt')
    return <RehearsalHome />;
  return (
    <main className="workspace">
      <header>
        <a className="wordmark" href="/">
          flings<span>✳</span>
        </a>
        <span className="rehearsal">Test rehearsal · fictional people</span>
      </header>
      <section className="intro">
        <p className="eyebrow">Organizer</p>
        <h1>Your gatherings</h1>
        <p>Open your organizer workspace with your ChatGPT account.</p>
        <a href="/organizer">Open organizer workspace →</a>
      </section>
      <p className="footnote">
        Use fictional gathering details during this test. No messages are sent.
      </p>
    </main>
  );
}
