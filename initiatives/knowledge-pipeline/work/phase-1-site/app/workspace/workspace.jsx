'use client';
import {
  useEffect,
  useState,
  useId,
  Children,
  cloneElement,
  isValidElement,
} from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
const stages = [
  'Harvest',
  'Tag & Promote',
  'Topics & Narratives',
  'Documents',
  'Archive',
  'Backup',
];
const selectClass =
  'w-full min-h-10 rounded-lg border border-input bg-background px-3 text-sm';
const value = (form, name) =>
  typeof form.get(name) === 'string' ? form.get(name) : '';
function Field({ label, children }) {
  const id = useId();
  return (
    <div className="grid gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        (child.type === Input ||
          child.type === Textarea ||
          child.type === 'select')
          ? cloneElement(child, { id })
          : child,
      )}
    </div>
  );
}
function Panel({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}
function safeUrl(url) {
  try {
    return ['https:', 'http:'].includes(new URL(url).protocol)
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}
function version(entity) {
  return entity.versions.find((v) => v.versionId === entity.currentVersionId);
}
export default function Workspace() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [packageText, setPackageText] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [restorePreview, setRestorePreview] = useState(null);
  async function refresh() {
    const response = await fetch('/api/workflow', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setData(body);
  }
  useEffect(() => {
    let active = true;
    fetch('/api/workflow', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (active) setData(body);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const loaded = data?.workspace;
  const state = loaded?.state;
  const sources = state?.harvest.sources ?? [];
  const selectedSource = sources.find((s) => s.id === sourceId) ?? sources[0];
  const selectedVersion = state?.harvest.versions.find(
    (v) => v.id === selectedSource?.currentVersionId,
  );
  const topics = state?.integration.topics ?? [];
  const topic = topics.find((t) => t.id === topicId) ?? topics[0];
  const narratives = state?.integration.narratives ?? [];
  const documents = state?.integration.documents ?? [];
  const document = documents.find((d) => d.topicId === topic?.id);
  const topicNarratives = narratives.filter(
    (n) => n.topicId === topic?.id && n.stage !== 'archived',
  );
  const decisions =
    state?.decisions.filter((d) => d.sourceId === selectedSource?.id) ?? [];
  async function act(input, message = 'Saved.') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          collectionId: data.selectedId,
          revision: loaded?.revision,
          selectionRevision: loaded?.selectionRevision,
          ...input,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await refresh();
      setNotice(message);
      return body.result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function form(handler) {
    return (event) => {
      event.preventDefault();
      handler(new FormData(event.currentTarget));
    };
  }
  const chooseSource = (
    <Field label="Source">
      <select
        className={selectClass}
        value={selectedSource?.id ?? ''}
        onChange={(e) => setSourceId(e.target.value)}
      >
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {
              state.harvest.versions.find((v) => v.id === s.currentVersionId)
                ?.content.title
            }
          </option>
        ))}
      </select>
    </Field>
  );
  const chooseTopic = (
    <Field label="Topic">
      <select
        className={selectClass}
        value={topic?.id ?? ''}
        onChange={(e) => setTopicId(e.target.value)}
      >
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Knowledge Pipeline
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sources, decisions, and documents with their evidence intact.
            </p>
          </div>
          <div className="text-right text-sm">
            <p>{data?.displayName}</p>
            {/* Dispatcher-owned authentication must use a full top-level navigation. */}
            {/* oxlint-disable-next-line nextjs/no-html-link-for-pages */}
            <a
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
              className="underline"
            >
              Sign out
            </a>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive bg-destructive/10 p-4"
          >
            {error}
          </p>
        )}
        {notice && (
          <output className="rounded-lg border bg-accent p-4">{notice}</output>
        )}
        {!data && !error && <output>Opening your workspace…</output>}
        {data && (
          <Panel
            title="Collection"
            description="Every action applies to the selected collection."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Selected collection">
                <select
                  disabled={busy}
                  className={selectClass}
                  value={data.selectedId ?? ''}
                  onChange={async (e) => {
                    setRestorePreview(null);
                    setPackageText('');
                    setExportResult(null);
                    setSourceId('');
                    setTopicId('');
                    await act({
                      type: 'select-collection',
                      collectionId: e.target.value,
                    });
                  }}
                >
                  <option value="" disabled>
                    Choose a collection
                  </option>
                  {data.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <form
                className="flex items-end gap-2"
                onSubmit={form((f) =>
                  act(
                    { type: 'create-collection', name: value(f, 'name') },
                    'Collection created.',
                  ),
                )}
              >
                <Field label="New collection">
                  <Input
                    name="name"
                    placeholder="Community heat resilience acceptance"
                    required
                    maxLength={80}
                  />
                </Field>
                <Button type="submit" disabled={busy}>
                  Create
                </Button>
              </form>
            </div>
            {data.role === 'admin' && (
              <Link href="/admin" className="text-sm underline">
                Manage application access
              </Link>
            )}
          </Panel>
        )}
        <Link href="/acceptance" className="text-sm underline">
          Open your curator exercise
        </Link>
        {state && (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>{sources.length} sources</span>
              <span>{topics.length} topics</span>
              <span>{narratives.length} narratives</span>
              <span>{documents.length} documents</span>
              <span className="text-muted-foreground">
                Saved revision {loaded.revision}
              </span>
            </div>
            {sources.length === 0 && (
              <Panel
                title="Practice the complete workflow"
                description="Load 18 project-authored sources, two topics, six practice narratives, and one baseline document. This creates synthetic practice records; it does not record your acceptance findings."
              >
                <Button
                  disabled={busy}
                  onClick={() =>
                    act(
                      { type: 'fixture' },
                      'Practice collection prepared. Your curator exercise starts now.',
                    )
                  }
                >
                  Load 18-source practice collection
                </Button>
              </Panel>
            )}
            {state.fixture && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Practice material only. Curator observations are still pending.
              </p>
            )}
            <Tabs defaultValue="Harvest" className="gap-5">
              <TabsList className="h-auto w-full flex-wrap justify-start">
                {stages.map((stage) => (
                  <TabsTrigger key={stage} value={stage}>
                    {stage}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="Harvest" className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel
                    title="Add a source"
                    description="Preview before saving. Only retain text you have permission to use."
                  >
                    <form
                      className="grid gap-3"
                      onSubmit={form((f) =>
                        act(
                          {
                            type: 'intake-preview',
                            kind: value(f, 'kind'),
                            payload: {
                              url: value(f, 'url'),
                              title: value(f, 'title'),
                              body: value(f, 'body') || null,
                              bodyForm: value(f, 'bodyForm'),
                              rightsState: value(f, 'rights'),
                              tags: value(f, 'tags')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          },
                          'Review the intake preview, then commit it.',
                        ),
                      )}
                    >
                      <Field label="Intake route">
                        <select name="kind" className={selectClass}>
                          <option value="direct">Direct</option>
                          <option value="browser-saved">Browser-saved</option>
                        </select>
                      </Field>
                      <Field label="Source title">
                        <Input name="title" required />
                      </Field>
                      <Field label="Source URL">
                        <Input name="url" type="url" required />
                      </Field>
                      <Field label="Retained text">
                        <Textarea name="body" rows={4} />
                      </Field>
                      <Field label="Text form">
                        <select name="bodyForm" className={selectClass}>
                          <option value="retained">Retained original</option>
                          <option value="quoted">Quotation</option>
                          <option value="summary">Summary</option>
                        </select>
                      </Field>
                      <Field label="Rights">
                        <select name="rights" className={selectClass}>
                          <option value="metadata-only">Metadata only</option>
                          <option value="cleared">Cleared for retention</option>
                          <option value="restricted">
                            Restricted — no retained body
                          </option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </Field>
                      <Field label="Tags, comma separated">
                        <Input name="tags" />
                      </Field>
                      <Button type="submit" disabled={busy}>
                        Preview intake
                      </Button>
                    </form>
                  </Panel>
                  <Panel
                    title="Import a native file"
                    description="The incoming collection name never changes your destination."
                  >
                    <form
                      className="grid gap-3"
                      onSubmit={form((f) => {
                        try {
                          void act(
                            {
                              type: 'intake-preview',
                              kind: value(f, 'kind'),
                              payload: JSON.parse(value(f, 'payload')),
                            },
                            'Review the native intake preview.',
                          );
                        } catch {
                          setError('Paste valid JSON from the exported file.');
                        }
                      })}
                    >
                      <Field label="File format">
                        <select name="kind" className={selectClass}>
                          <option value="bookmark-sorter">
                            Bookmark Sorter
                          </option>
                          <option value="newsletter-story-harvester">
                            Newsletter Story Harvester
                          </option>
                        </select>
                      </Field>
                      <Field label="Exported JSON">
                        <Textarea
                          name="payload"
                          rows={10}
                          required
                          placeholder={
                            '{"format":"bookmark-sorter/v1","items":[{"id":"practice","url":"https://example.org/practice","title":"Practice bookmark","tags":["fixture"]}]}'
                          }
                        />
                      </Field>
                      <Button type="submit" disabled={busy}>
                        Preview native import
                      </Button>
                    </form>
                  </Panel>
                </div>
                {state.pendingIntake && (
                  <Panel
                    title="Intake preview"
                    description={'Destination: ' + loaded.name}
                  >
                    <p>
                      {state.pendingIntake.counts.sources} sources;{' '}
                      {state.pendingIntake.counts.withBodies} retained bodies;{' '}
                      {state.pendingIntake.counts.tags} tags.
                    </p>
                    <ul className="list-disc pl-5">
                      {state.pendingIntake.operations.sources.map((s) => (
                        <li key={s.canonicalKey}>
                          {s.title} — {s.rightsState}, {s.captureState}
                        </li>
                      ))}
                    </ul>
                    {state.pendingIntake.findings.map((f) => (
                      <p key={f.code}>{f.message}</p>
                    ))}
                    <Button
                      disabled={busy}
                      onClick={() =>
                        act(
                          {
                            type: 'intake-commit',
                            previewHash: state.pendingIntake.contentHash,
                          },
                          'Intake committed with original text and a receipt.',
                        )
                      }
                    >
                      Commit intake to {loaded.name}
                    </Button>
                  </Panel>
                )}
                {!!sources.length && (
                  <Panel title="Retained originals">
                    {chooseSource}
                    <h3 className="font-semibold">
                      {selectedVersion?.content.title}
                    </h3>
                    <a
                      href={safeUrl(selectedVersion?.content.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline"
                    >
                      {selectedVersion?.content.url}
                    </a>
                    <p className="text-sm">
                      {selectedVersion?.content.rightsState} ·{' '}
                      {selectedVersion?.content.bodyState} ·{' '}
                      {selectedVersion?.content.captureState}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {selectedVersion?.content.body ??
                        'No body retained. The source reference remains available.'}
                    </p>
                    <details>
                      <summary className="cursor-pointer text-sm underline">
                        Exact source version and custody
                      </summary>
                      <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(selectedVersion, null, 2)}
                      </pre>
                    </details>
                  </Panel>
                )}
              </TabsContent>
              <TabsContent value="Tag & Promote">
                <Panel
                  title="Review source"
                  description="Correct the tags and assess each dimension separately. Your rationale and earlier decisions are retained."
                >
                  {sources.length ? (
                    <>
                      {chooseSource}
                      <p className="whitespace-pre-wrap rounded-lg bg-secondary p-3">
                        {selectedVersion?.content.body ??
                          'This source has no retained body.'}
                      </p>
                      <form
                        key={selectedVersion?.id}
                        className="grid gap-4"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'review-source',
                              sourceId: selectedSource.id,
                              sourceHash: selectedVersion.contentHash,
                              tags: value(f, 'tags'),
                              disposition: value(f, 'disposition'),
                              rationale: value(f, 'rationale'),
                              dimensions: Object.fromEntries(
                                [
                                  'relevance',
                                  'quality',
                                  'novelty',
                                  'importance',
                                  'urgency',
                                ].map((key) => [
                                  key,
                                  value(f, key) === 'unknown'
                                    ? 'unknown'
                                    : Number(value(f, key)),
                                ]),
                              ),
                            },
                            'Source review recorded.',
                          ),
                        )}
                      >
                        <Field label="Corrected tags, comma separated">
                          <Input
                            name="tags"
                            defaultValue={(
                              decisions.at(-1)?.tags ??
                              selectedVersion.content.tags.map((t) => t.label)
                            ).join(', ')}
                          />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-5">
                          {[
                            'relevance',
                            'quality',
                            'novelty',
                            'importance',
                            'urgency',
                          ].map((key) => (
                            <Field key={key} label={key}>
                              <select
                                name={key}
                                className={selectClass}
                                defaultValue="unknown"
                              >
                                <option value="unknown">Unknown</option>
                                {[0, 1, 2, 3, 4].map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          ))}
                        </div>
                        <Field label="Promotion decision">
                          <select name="disposition" className={selectClass}>
                            <option value="needs-review">Needs review</option>
                            <option value="promoted">Promote</option>
                            <option value="deferred">Defer</option>
                            <option value="rejected">Reject</option>
                          </select>
                        </Field>
                        <Field label="Rationale and corrections">
                          <Textarea name="rationale" required />
                        </Field>
                        <Button type="submit" disabled={busy}>
                          Record review decision
                        </Button>
                      </form>
                      {decisions.map((d) => (
                        <p key={d.id} className="rounded-lg border p-3 text-sm">
                          {d.disposition} — {d.rationale}
                        </p>
                      ))}
                    </>
                  ) : (
                    <p>Import a source first.</p>
                  )}
                </Panel>
              </TabsContent>
              <TabsContent value="Topics & Narratives" className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Topics">
                    <form
                      className="flex gap-2"
                      onSubmit={form((f) =>
                        act(
                          { type: 'create-topic', title: value(f, 'title') },
                          'Topic created.',
                        ),
                      )}
                    >
                      <Input
                        name="title"
                        aria-label="New topic title"
                        placeholder="New topic title"
                        required
                      />
                      <Button type="submit" disabled={busy}>
                        Add topic
                      </Button>
                    </form>
                    {!!topics.length && chooseTopic}
                    {!!sources.length && !!topics.length && (
                      <>
                        {chooseSource}
                        <Button
                          disabled={busy}
                          onClick={() =>
                            act(
                              {
                                type: 'assign-topic',
                                sourceId: selectedSource.id,
                                topicId: topic.id,
                              },
                              'Source assigned to topic.',
                            )
                          }
                        >
                          Assign source to {topic?.title}
                        </Button>
                        <ul className="list-disc pl-5 text-sm">
                          {state.topics.relationships
                            .filter(
                              (r) =>
                                r.type === 'assigned-to-topic' &&
                                r.fromEntityId === selectedSource.id,
                            )
                            .map((r) => (
                              <li key={r.id}>
                                {
                                  topics.find((t) => t.id === r.toEntityId)
                                    ?.title
                                }
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                  </Panel>
                  <Panel
                    title="Accept a narrative"
                    description="Rewrite the proposed wording and select its exact evidence sources."
                  >
                    {!!topics.length && (
                      <form
                        className="grid gap-3"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'narrative',
                              title: value(f, 'title'),
                              topicId: topic.id,
                              sourceIds: f.getAll('sourceId'),
                              proposedText: value(f, 'proposedText'),
                              text: value(f, 'text'),
                            },
                            'Narrative accepted with exact source versions.',
                          ),
                        )}
                      >
                        <p className="text-sm">Topic: {topic?.title}</p>
                        <Field label="Narrative title">
                          <Input name="title" required />
                        </Field>
                        <Field label="Original proposed wording">
                          <Textarea
                            name="proposedText"
                            required
                            defaultValue="The practice sources suggest reviewing cooling access."
                          />
                        </Field>
                        <Field label="Your accepted wording">
                          <Textarea name="text" required />
                        </Field>
                        <fieldset className="max-h-48 overflow-y-auto rounded-lg border p-3">
                          <legend className="text-sm">Evidence sources</legend>
                          {sources.map((s) => (
                            <label
                              key={s.id}
                              className="flex gap-2 py-1 text-sm"
                            >
                              <input
                                type="checkbox"
                                name="sourceId"
                                value={s.id}
                              />
                              {
                                state.harvest.versions.find(
                                  (v) => v.id === s.currentVersionId,
                                )?.content.title
                              }
                            </label>
                          ))}
                        </fieldset>
                        <Button type="submit" disabled={busy}>
                          Accept narrative
                        </Button>
                      </form>
                    )}
                  </Panel>
                </div>
                {narratives.map((n) => (
                  <Panel
                    key={n.id}
                    title={n.title}
                    description={topics.find((t) => t.id === n.topicId)?.title}
                  >
                    <p>{version(n).text}</p>
                    <p className="text-sm">{n.stage}</p>
                    <details>
                      <summary className="cursor-pointer underline">
                        Trace retained originals
                      </summary>
                      {version(n).sourceVersionIds.map((id) => {
                        const v = state.harvest.versions.find(
                          (v) => v.id === id,
                        );
                        return (
                          <div key={id} className="mt-3 rounded-lg border p-3">
                            <p className="font-semibold">{v?.content.title}</p>
                            <p className="whitespace-pre-wrap">
                              {v?.content.body ?? 'Metadata-only reference'}
                            </p>
                            <p className="break-all text-xs">
                              {id} · {v?.contentHash}
                            </p>
                          </div>
                        );
                      })}
                    </details>
                  </Panel>
                ))}
              </TabsContent>
              <TabsContent value="Documents" className="grid gap-5">
                <Panel title="Compare and propose a document revision">
                  {topics.length ? (
                    <>
                      {chooseTopic}
                      <div className="rounded-lg bg-secondary p-4">
                        <h3 className="mb-2 font-semibold">
                          {document
                            ? 'Current standing document'
                            : 'No standing document'}
                        </h3>
                        <p className="whitespace-pre-wrap">
                          {document
                            ? version(document).text
                            : 'Review the incoming narratives without an invented baseline.'}
                        </p>
                      </div>
                      <form
                        key={topic?.id}
                        className="grid gap-4"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'document-proposal',
                              topicId: topic.id,
                              text: value(f, 'text'),
                              rationale: value(f, 'rationale'),
                              classifications: Object.fromEntries(
                                topicNarratives.map((n) => [
                                  n.currentVersionId,
                                  value(f, n.id),
                                ]),
                              ),
                              urgency: Object.fromEntries(
                                [
                                  'timeSensitivity',
                                  'delayConsequence',
                                  'evidenceStrengthIndependence',
                                  'documentContradiction',
                                  'documentAge',
                                ].map((key) => [
                                  key,
                                  value(f, key) === 'unknown'
                                    ? 'unknown'
                                    : Number(value(f, key)),
                                ]),
                              ),
                            },
                            'Comparison and document proposal saved for separate approval.',
                          ),
                        )}
                      >
                        {topicNarratives.map((n) => (
                          <Field key={n.id} label={n.title}>
                            <p className="font-normal">{version(n).text}</p>
                            <select name={n.id} className={selectClass}>
                              {[
                                'new',
                                'supporting',
                                'contradictory',
                                'redundant',
                                'updating',
                              ].map((kind) => (
                                <option key={kind}>{kind}</option>
                              ))}
                            </select>
                          </Field>
                        ))}
                        <div className="grid gap-3 sm:grid-cols-5">
                          {[
                            'timeSensitivity',
                            'delayConsequence',
                            'evidenceStrengthIndependence',
                            'documentContradiction',
                            'documentAge',
                          ].map((key) => (
                            <Field
                              key={key}
                              label={key.replace(/([A-Z])/g, ' $1')}
                            >
                              <select name={key} className={selectClass}>
                                <option value="unknown">Unknown</option>
                                {[0, 1, 2, 3, 4].map((n) => (
                                  <option key={n}>{n}</option>
                                ))}
                              </select>
                            </Field>
                          ))}
                        </div>
                        <Field label="Comparison rationale">
                          <Textarea name="rationale" required />
                        </Field>
                        <Field label="Proposed document text">
                          <Textarea
                            name="text"
                            required
                            rows={5}
                            defaultValue={
                              document ? version(document).text : ''
                            }
                          />
                        </Field>
                        <Button
                          type="submit"
                          disabled={busy || !topicNarratives.length}
                        >
                          Save comparison and proposal
                        </Button>
                      </form>
                    </>
                  ) : (
                    <p>Create a topic and narrative first.</p>
                  )}
                </Panel>
                {state.integration.comparisons
                  .filter((c) => c.topicId === topic?.id)
                  .slice(-1)
                  .map((c) => (
                    <Panel key={c.id} title="Latest comparison">
                      <p>
                        {c.rawSourceCount} source versions;{' '}
                        {c.independentSourceCount} distinct source records;
                        independence has not been assessed.
                      </p>
                      <p>
                        Baseline: {c.baseline.status}.{' '}
                        {Object.entries(c.buckets)
                          .map(([key, list]) => key + ': ' + list.length)
                          .join(' · ')}
                      </p>
                    </Panel>
                  ))}
                {state.integration.proposals
                  .filter((p) => p.state === 'proposed')
                  .map((p) => (
                    <Panel
                      key={p.id}
                      title="Review proposed revision"
                      description={
                        topics.find((t) => t.id === p.topicId)?.title
                      }
                    >
                      <form
                        className="grid gap-3"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'approve-document',
                              proposalId: p.id,
                              text: value(f, 'text'),
                              rejectedParts: value(f, 'rejectedParts'),
                            },
                            'Your approved document revision is current.',
                          ),
                        )}
                      >
                        <Field label="Final text you approve">
                          <Textarea
                            name="text"
                            defaultValue={p.proposedText}
                            required
                            rows={5}
                          />
                        </Field>
                        <Field label="Parts rejected or corrected">
                          <Textarea name="rejectedParts" />
                        </Field>
                        <Button type="submit" disabled={busy}>
                          Approve this final text
                        </Button>
                      </form>
                    </Panel>
                  ))}
                {documents.map((d) => (
                  <Panel
                    key={d.id}
                    title={
                      'Accepted: ' +
                      topics.find((t) => t.id === d.topicId)?.title
                    }
                  >
                    <p className="whitespace-pre-wrap">{version(d).text}</p>
                    <p className="text-sm">
                      {d.versions.length} immutable revision(s)
                    </p>
                    <details>
                      <summary className="cursor-pointer underline">
                        Backward evidence and approval record
                      </summary>
                      <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(
                          {
                            document: version(d),
                            narratives: narratives.filter((n) =>
                              version(d).citedNarrativeVersionIds.includes(
                                n.currentVersionId,
                              ),
                            ),
                            sources: state.harvest.versions.filter((s) =>
                              version(d).citedSourceVersionIds.includes(s.id),
                            ),
                            decisions: state.decisions,
                            activities: state.integration.activities,
                            receipts: state.integration.receipts,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </Panel>
                ))}
              </TabsContent>
              <TabsContent value="Archive" className="grid gap-5">
                {narratives.map((n) => (
                  <Panel
                    key={n.id}
                    title={n.title}
                    description={
                      n.stage === 'archived'
                        ? 'Archived; evidence retained'
                        : 'Active narrative'
                    }
                  >
                    <p>{version(n).text}</p>
                    {n.stage === 'archived' ? (
                      <form
                        className="flex gap-2"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'reopen',
                              narrativeId: n.id,
                              reason: value(f, 'reason'),
                            },
                            'Narrative reopened. Earlier disposition preserved.',
                          ),
                        )}
                      >
                        <Input
                          name="reason"
                          aria-label="Reason for reopening"
                          placeholder="Reason for reopening"
                          required
                        />
                        <Button type="submit" disabled={busy}>
                          Reopen narrative
                        </Button>
                      </form>
                    ) : (
                      <form
                        className="grid gap-3 sm:grid-cols-2"
                        onSubmit={form((f) =>
                          act(
                            {
                              type: 'archive',
                              narrativeId: n.id,
                              kind: value(f, 'kind'),
                              reason: value(f, 'reason'),
                              revisitCondition: value(f, 'revisit'),
                              standingDocumentVersionId:
                                value(f, 'documentVersion') || null,
                              replacingNarrativeVersionId:
                                value(f, 'replacement') || null,
                            },
                            'Archive disposition recorded.',
                          ),
                        )}
                      >
                        <Field label="Disposition">
                          <select name="kind" className={selectClass}>
                            <option value="rejected">Rejected</option>
                            <option value="deferred">Deferred</option>
                            <option value="incorporated">Incorporated</option>
                            <option value="superseded">Superseded</option>
                          </select>
                        </Field>
                        <Field label="Reason">
                          <Input name="reason" />
                        </Field>
                        <Field label="Revisit condition (deferred)">
                          <Input name="revisit" />
                        </Field>
                        <Field label="Document revision (incorporated)">
                          <select
                            name="documentVersion"
                            className={selectClass}
                          >
                            <option value="">Choose a revision</option>
                            {documents
                              .filter((d) => d.topicId === n.topicId)
                              .flatMap((d) =>
                                d.versions.map((v, i) => (
                                  <option key={v.versionId} value={v.versionId}>
                                    Revision {i + 1}: {v.text.slice(0, 55)}
                                  </option>
                                )),
                              )}
                          </select>
                        </Field>
                        <Field label="Replacement (superseded)">
                          <select name="replacement" className={selectClass}>
                            <option value="">Choose another narrative</option>
                            {narratives
                              .filter(
                                (other) =>
                                  other.id !== n.id &&
                                  other.topicId === n.topicId,
                              )
                              .map((other) => (
                                <option
                                  key={other.id}
                                  value={other.currentVersionId}
                                >
                                  {other.title}
                                </option>
                              ))}
                          </select>
                        </Field>
                        <Button
                          type="submit"
                          disabled={busy}
                          className="self-end"
                        >
                          Archive narrative
                        </Button>
                      </form>
                    )}
                    {state.integration.archiveDispositions
                      .filter((a) => a.narrativeId === n.id)
                      .map((a) => (
                        <p
                          key={a.id}
                          className="rounded-lg bg-secondary p-3 text-sm"
                        >
                          {a.kind} ·{' '}
                          {a.reason ??
                            a.revisitCondition ??
                            a.standingDocumentVersionId ??
                            a.replacingNarrativeVersionId}
                        </p>
                      ))}
                  </Panel>
                ))}
              </TabsContent>
              <TabsContent value="Backup" className="grid gap-5">
                <Panel
                  title="Export the complete collection"
                  description="Includes exact originals, accepted versions, decisions, documents, archives, and cleared practice assets. Works without a model or remote source."
                >
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        const result = await act(
                          { type: 'export', caller: 'web' },
                          'Complete export stored privately.',
                        );
                        if (result) setExportResult(result);
                      }}
                    >
                      Create web export
                    </Button>
                    {data.role === 'admin' && (
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={async () => {
                          const result = await act(
                            { type: 'export', caller: 'admin' },
                            'Administrator export stored privately.',
                          );
                          if (result) setExportResult(result);
                        }}
                      >
                        Create administrator export
                      </Button>
                    )}
                  </div>
                  {exportResult && (
                    <>
                      <p className="break-all text-sm">
                        {exportResult.packageHash} · {exportResult.bytes} bytes
                      </p>
                      <a
                        className="underline"
                        href={
                          '/api/workflow?export=' +
                          encodeURIComponent(exportResult.id)
                        }
                      >
                        Download canonical package
                      </a>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const response = await fetch(
                            '/api/workflow?export=' +
                              encodeURIComponent(exportResult.id),
                          );
                          if (response.ok)
                            setPackageText(await response.text());
                          else setError('Export is unavailable.');
                        }}
                      >
                        Show package for recovery
                      </Button>
                      {packageText && (
                        <Field label="Canonical package">
                          <Textarea readOnly value={packageText} rows={8} />
                        </Field>
                      )}
                    </>
                  )}
                </Panel>
                <Panel
                  title="Restore into an empty collection"
                  description="Create and select an empty destination above, then upload or paste an exported package. Preview pins the destination before any knowledge is accepted."
                >
                  <Field label="Canonical package file">
                    <Input
                      type="file"
                      accept=".json,application/json"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1500000) {
                          setError('Package exceeds the 1.5 MB upload bound.');
                          return;
                        }
                        setRestoreText(await file.text());
                        setRestorePreview(null);
                      }}
                    />
                  </Field>
                  <Field label="Package JSON to restore">
                    <Textarea
                      value={restoreText}
                      onChange={(e) => {
                        setRestoreText(e.target.value);
                        setRestorePreview(null);
                      }}
                      rows={6}
                    />
                  </Field>
                  <Button
                    disabled={busy || !restoreText}
                    onClick={async () => {
                      try {
                        const result = await act(
                          {
                            type: 'restore-preview',
                            package: JSON.parse(restoreText),
                          },
                          'Review destination and counts before confirming restore.',
                        );
                        if (result) setRestorePreview(result);
                      } catch {
                        setError('Package is not valid JSON.');
                      }
                    }}
                  >
                    Preview uploaded restore
                  </Button>
                  {restorePreview && (
                    <div className="grid gap-3 rounded-lg border p-4">
                      <p>From: {restorePreview.sourceName}</p>
                      <p className="font-semibold">
                        Destination: {restorePreview.destinationName}
                      </p>
                      <p>
                        {Object.entries(restorePreview.counts)
                          .map(([k, v]) => k + ': ' + v)
                          .join(' · ')}
                      </p>
                      <p>{restorePreview.owner}</p>
                      <p className="break-all text-sm">
                        {restorePreview.packageHash}
                      </p>
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          const result = await act(
                            {
                              type: 'restore-commit',
                              previewId: restorePreview.id,
                            },
                            'Restore completed; originals and accepted history are available.',
                          );
                          if (result) {
                            setRestorePreview(null);
                            setNotice(
                              'Restore completed; verified ' +
                                result.restoredAssetObjects +
                                ' retained asset object(s).',
                            );
                          }
                        }}
                      >
                        Confirm restore into {restorePreview.destinationName}
                      </Button>
                    </div>
                  )}
                </Panel>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
