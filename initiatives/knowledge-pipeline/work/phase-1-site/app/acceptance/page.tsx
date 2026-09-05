import Link from 'next/link';

export default function Acceptance() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <Link href="/workspace" className="underline">
        Open the workspace
      </Link>
      <h1 className="text-3xl font-semibold">Your curator exercise</h1>
      <p>
        Allow roughly 30–45 minutes. Record the start time, finish time,
        confusing steps, corrections you had to make, and any lost or inaccurate
        information. This is a usability test, not a test of you.
      </p>
      <p>
        Create a new collection named <strong>Ken curator acceptance</strong>,
        then choose <strong>Load 18-source practice collection</strong>. The
        material is synthetic and cleared for this exercise. Do not use
        confidential or copyrighted full text.
      </p>
      <ol className="list-decimal space-y-5 pl-6">
        <li>
          <strong>Harvest.</strong> Preview and accept one direct note and one
          browser-captured source. Use an example.org URL, your own short text,
          and rights “cleared.” Also preview and accept both native examples
          below, choosing the matching file format. Confirm the original title,
          URL, and text remain inspectable after reload.
        </li>
        <li>
          <strong>Tag and Promote.</strong> Choose the first practice source.
          Add a useful tag, score the five assessment dimensions, and promote it
          with your reason. Defer a different source. Check that your first
          decision remains visible.
        </li>
        <li>
          <strong>Topics and Narratives.</strong> Assign the promoted source to
          both topics. Create a narrative in Cooling access, select its
          evidence, and write a short original proposal. Rewrite the accepted
          text in your own words. Check that the original and accepted versions,
          exact sources, and your rationale are retained.
        </li>
        <li>
          <strong>Documents.</strong> Use Cooling access to inspect the
          no-baseline case, then inspect the existing heat-planning document.
          Select a narrative, classify the comparison, choose urgency
          separately, and propose a change. In the approval step, rewrite the
          proposed document text, identify a rejected part, and approve. Confirm
          the resulting document and its backward evidence trail.
        </li>
        <li>
          <strong>Archive.</strong> Use four different practice narratives to
          record all four outcomes: rejected (give a reason); deferred (give a
          revisit condition); incorporated (select a document version that
          actually cites that narrative); and superseded (select a different
          narrative in the same topic). Reopen one archived narrative. If an
          outcome is correctly refused, record why and supply the missing
          evidence before retrying.
        </li>
        <li>
          <strong>Backup and recovery.</strong> Make a web export, note its
          checksum, then an administrator export without editing the collection.
          The checksums must match. Download the package. Create a new empty
          collection named <strong>Ken curator recovery</strong>, upload or
          paste the package, inspect the named destination, and confirm restore.
          Reload and check a source original, your narrative rewrite, document
          revision, and archive/reopen history. Separate-Site recovery is an
          operator check; you do not need to create another Site.
        </li>
        <li>
          <strong>Report back.</strong> Send your elapsed time, approximate time
          spent rewriting, number of corrections or retries, confusing controls,
          and whether any evidence or decisions were lost. Say whether this
          would be useful for your real work and whether another independent
          curator should repeat it. Your feedback is still required even if all
          automated checks pass.
        </li>
      </ol>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Native import examples</h2>
        <p>Choose Bookmark Sorter and paste this into Exported JSON:</p>
        <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
          {JSON.stringify(
            {
              format: 'bookmark-sorter/v1',
              items: [
                {
                  id: 'curator-bookmark',
                  title: 'Curator bookmark note',
                  url: 'https://example.org/curator-bookmark',
                  note: 'An original practice note written by the curator.',
                },
              ],
            },
            null,
            2,
          )}
        </pre>
        <p>Then choose Newsletter Story Harvester and paste this:</p>
        <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
          {JSON.stringify(
            {
              version: 1,
              stories: [
                {
                  id: 'curator-newsletter',
                  title: 'Curator newsletter note',
                  url: 'https://example.org/curator-newsletter',
                  text: 'An original synthetic newsletter story for this test.',
                  rights_state: 'cleared',
                },
              ],
            },
            null,
            2,
          )}
        </pre>
      </section>
      <p className="rounded-lg border p-4">
        Keep scheduling off for this exercise. The automated rehearsal is not
        independent human acceptance, and this bounded workspace does not
        establish large-collection performance or authorize production release.
      </p>
    </main>
  );
}
