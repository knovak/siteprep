'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NativeSelect } from '@/components/ui/native-select';
type Scope = { activity: string | null; event: string | null; title: string };
type Post = Scope & {
  id: string;
  author: string;
  body: string;
  created: number;
  edited: number | null;
  hidden: number;
  can_edit: boolean;
};
type Poll = {
  id: string;
  title: string;
  activity: string;
  event: string;
  options: string[];
  multiple: number;
  closed: boolean;
  deadline: number | null;
  replaces: string | null;
  choices: number[];
  totals: number[] | null;
  audience?: string[];
  responses: {
    id: string;
    name: string;
    choices: number[];
    current: boolean;
    at: number;
  }[];
};
type Entry = {
  id: string;
  kind: string;
  amount: number;
  report: string | null;
  note: string;
  author: string;
  at: number;
};
type Payment = {
  id: string;
  event: string;
  member: string;
  name: string;
  title: string;
  currency: string;
  amount: number;
  balance: number;
  link: string;
  entries: Entry[];
};
type Data = {
  revision: number;
  state: string;
  scopes: Scope[];
  posts: Post[];
  post_history: {
    id: string;
    post: string;
    action: string;
    actor: string;
    reason: string;
    body: string;
    at: number;
  }[];
  polls: Poll[];
  payments: Payment[];
};
type Draft = {
  kind: 'post' | 'poll' | 'payment' | 'ledger';
  revision: number;
  post?: Post;
  hide?: boolean;
  poll?: Poll;
  payment?: Payment;
};
type Member = { id: string; name: string };
type Props = {
  endpoint: string;
  parentRevision: number;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
  refresh: () => Promise<void>;
  organizer?: boolean;
  preview?: boolean;
  members?: Member[];
  invitations?: { member: string; activity: string; state: string }[];
};
const when = (time: number) => new Date(time).toLocaleString();
function Field({
  name,
  label,
  children,
  ...props
}: {
  name: string;
  label: string;
  children?: ReactNode;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: number;
  step?: number;
}) {
  return (
    <div className="field">
      <Label htmlFor={'coord-' + name}>{label}</Label>
      {children || <Input id={'coord-' + name} name={name} {...props} />}
    </div>
  );
}
function PlainText({ text }: { text: string }) {
  return (
    <p className="post-text">
      {text.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          try {
            const url = new URL(part);
            if (!url.username && !url.password)
              return (
                <a
                  key={i}
                  href={url.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  {part}
                </a>
              );
          } catch {
            /* Display malformed links as text. */
          }
        }
        return part;
      })}
    </p>
  );
}
export default function CoordinationPanel(props: Props) {
  const {
    endpoint,
    parentRevision,
    organizer = false,
    preview = false,
    members = [],
    invitations = [],
  } = props;
  const api = useRef(props);
  useEffect(() => {
    api.current = props;
  });
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState<Draft | null>(null);
  const [scope, setScope] = useState(0),
    [audience, setAudience] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    void api.current
      .request(endpoint)
      .then((value) => {
        if (!cancelled) setData(value as Data);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, parentRevision]);
  const open = !!data && data.state === 'open' && !preview;
  const begin = (value: Omit<Draft, 'revision'>) => {
    if (!data || busy) return;
    setScope(
      value.poll
        ? data.scopes.findIndex((s) => s.event === value.poll!.event)
        : value.post
          ? data.scopes.findIndex(
              (s) =>
                s.activity === value.post!.activity &&
                s.event === value.post!.event,
            )
          : value.kind === 'poll' || value.kind === 'payment'
            ? Math.max(
                0,
                data.scopes.findIndex((s) => !!s.event),
              )
            : 0,
    );
    setAudience(value.poll?.audience ?? []);
    setDraft({ ...value, revision: data.revision });
    setError('');
    setNotice('');
  };
  const save = async (input: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.current.request(endpoint, 'POST', input);
      setDraft(null);
      await api.current.refresh();
      setData((await api.current.request(endpoint)) as Data);
      setNotice('Saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (form: HTMLFormElement) => {
    if (!draft || !data) return;
    const fields = Object.fromEntries(
      [...new FormData(form)].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
    const selected = data.scopes[scope];
    let input: Record<string, unknown> = {
      ...fields,
      kind: draft.kind,
      revision: draft.revision,
    };
    if (draft.kind === 'post')
      input = {
        ...input,
        activity: selected.activity,
        event: selected.event,
        id: draft.post?.id,
        action: draft.hide ? 'hide' : 'post',
      };
    if (draft.kind === 'poll')
      input = {
        ...input,
        activity: selected.activity,
        event: selected.event,
        options: String(fields.options)
          .split('\n')
          .filter((x) => x.trim()),
        members: audience,
        multiple: fields.multiple === 'multiple',
        deadline: fields.deadline ? Date.parse(String(fields.deadline)) : null,
        replaces: draft.poll?.id,
      };
    if (draft.kind === 'payment')
      input = {
        ...input,
        activity: selected.activity,
        event: selected.event,
        amount: Number(fields.amount),
      };
    if (draft.kind === 'ledger')
      input = {
        ...input,
        request: draft.payment!.id,
        amount: Number(fields.amount),
        entry_kind: organizer ? fields.entry_kind : 'report',
      };
    void save(input);
  };
  return (
    <section className="coordination" aria-label="Coordination">
      <div className="coord-heading">
        <h2>Discussions, polls & payments</h2>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void api.current.refresh().catch((e) => setError(e.message))
          }
        >
          Refresh coordination
        </Button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <output aria-live="polite">{notice}</output>
      {!data && !error && <p>Loading coordination…</p>}
      {data && (
        <>
          {!open && (
            <p className="muted">
              {preview
                ? 'Member preview is read-only.'
                : 'This fling is closed. History remains available.'}
            </p>
          )}
          {open && !draft && (
            <div className="actions">
              <Button disabled={busy} onClick={() => begin({ kind: 'post' })}>
                Write a post
              </Button>
              {organizer && (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => begin({ kind: 'poll' })}
                  >
                    Create a poll
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => begin({ kind: 'payment' })}
                  >
                    Request a payment
                  </Button>
                </>
              )}
            </div>
          )}
          {draft && (
            <form
              className="profile-panel coordination-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit(e.currentTarget);
              }}
            >
              <h3>
                {draft.kind === 'post'
                  ? draft.hide
                    ? 'Hide post'
                    : draft.post
                      ? 'Edit post'
                      : 'Write a post'
                  : draft.kind === 'poll'
                    ? draft.poll
                      ? 'Replace poll'
                      : 'Create a poll'
                    : draft.kind === 'payment'
                      ? 'Request a payment'
                      : organizer
                        ? 'Record a ledger adjustment'
                        : 'Report an outside payment'}
              </h3>
              <fieldset disabled={busy || !open}>
                {draft.kind !== 'ledger' && !draft.post && (
                  <Field
                    name="scope"
                    label={
                      draft.kind === 'post' ? 'Discussion audience' : 'Event'
                    }
                  >
                    <NativeSelect
                      id="coord-scope"
                      value={scope}
                      onChange={(e) => {
                        setScope(Number(e.target.value));
                        setAudience([]);
                      }}
                    >
                      {data.scopes.map(
                        (s, i) =>
                          (draft.kind === 'post' || s.event) && (
                            <option key={i} value={i}>
                              {s.title}
                              {s.event
                                ? ' · event'
                                : s.activity
                                  ? ' · accepted members'
                                  : ' · all active members'}
                            </option>
                          ),
                      )}
                    </NativeSelect>
                  </Field>
                )}
                {draft.kind === 'post' && (
                  <Field
                    name={draft.hide ? 'reason' : 'body'}
                    label={draft.hide ? 'Reason for hiding' : 'Post text'}
                  >
                    <Textarea
                      id={draft.hide ? 'coord-reason' : 'coord-body'}
                      name={draft.hide ? 'reason' : 'body'}
                      defaultValue={draft.hide ? '' : (draft.post?.body ?? '')}
                      maxLength={4000}
                      required
                    />
                  </Field>
                )}
                {draft.kind === 'poll' && (
                  <>
                    {draft.poll && (
                      <p>
                        The old poll and its responses stay in history. The
                        replacement starts without votes.
                      </p>
                    )}
                    <Field
                      name="title"
                      label="Poll question"
                      defaultValue={draft.poll?.title}
                      required
                    />
                    <Field name="options" label="Choices, one per line">
                      <Textarea
                        id="coord-options"
                        name="options"
                        defaultValue={draft.poll?.options.join('\n')}
                        required
                      />
                    </Field>
                    <Field name="multiple" label="Selection">
                      <NativeSelect
                        id="coord-multiple"
                        name="multiple"
                        defaultValue={
                          draft.poll?.multiple ? 'multiple' : 'single'
                        }
                      >
                        <option value="single">One choice</option>
                        <option value="multiple">Multiple choices</option>
                      </NativeSelect>
                    </Field>
                    <Field
                      name="deadline"
                      label="Deadline in your local time (optional)"
                      type="datetime-local"
                    />
                    <fieldset>
                      <legend>Review eligible members for this poll</legend>
                      {members
                        .filter((m) =>
                          invitations.some(
                            (i) =>
                              i.member === m.id &&
                              i.activity === data.scopes[scope]?.activity &&
                              i.state === 'accepted',
                          ),
                        )
                        .map((m) => (
                          <Label key={m.id} className="choice">
                            <Checkbox
                              checked={audience.includes(m.id)}
                              onCheckedChange={(checked) =>
                                setAudience(
                                  checked
                                    ? [...audience, m.id]
                                    : audience.filter((x) => x !== m.id),
                                )
                              }
                            />
                            {m.name}
                          </Label>
                        ))}
                      {!members.some((m) =>
                        invitations.some(
                          (i) =>
                            i.member === m.id &&
                            i.activity === data.scopes[scope]?.activity &&
                            i.state === 'accepted',
                        ),
                      ) && <p>No accepted members in this event’s activity.</p>}
                    </fieldset>
                  </>
                )}
                {draft.kind === 'payment' && (
                  <>
                    <Field name="title" label="Payment description" required />
                    <Field name="member" label="Allocate to an accepted member">
                      <NativeSelect id="coord-member" name="member" required>
                        <option value="">Choose a member</option>
                        {members
                          .filter((m) =>
                            invitations.some(
                              (i) =>
                                i.member === m.id &&
                                i.activity === data.scopes[scope]?.activity &&
                                i.state === 'accepted',
                            ),
                          )
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field
                      name="currency"
                      label="Currency code (for example USD)"
                      defaultValue="USD"
                      required
                    />
                    <Field
                      name="amount"
                      label="Amount in minor units (USD cents, JPY yen)"
                      type="number"
                      min={1}
                      step={1}
                      required
                    />
                    <Field
                      name="link"
                      label="Outside payment link (optional)"
                      type="url"
                    />
                    <p className="muted">
                      Each allocation is explicit. A link opens the outside
                      service; it does not record payment.
                    </p>
                  </>
                )}
                {draft.kind === 'ledger' && (
                  <>
                    <p>
                      {draft.payment!.title} · {draft.payment!.name} ·{' '}
                      {draft.payment!.currency}
                    </p>
                    {organizer && (
                      <>
                        <Field name="entry_kind" label="Ledger action">
                          <NativeSelect id="coord-entry_kind" name="entry_kind">
                            <option value="confirm">
                              Confirm reported payment
                            </option>
                            <option value="correction">
                              Correction (+ adds to balance, − reduces it)
                            </option>
                            <option value="waiver">Waiver</option>
                            <option value="refund">
                              Record an outside refund
                            </option>
                          </NativeSelect>
                        </Field>
                        <Field
                          name="report"
                          label="Reported payment to confirm"
                        >
                          <NativeSelect id="coord-report" name="report">
                            <option value="">
                              Choose a report for confirmation
                            </option>
                            {draft
                              .payment!.entries.filter(
                                (e) => e.kind === 'report',
                              )
                              .map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.amount} units · {e.note || 'No reference'}{' '}
                                  · {when(e.at)}
                                </option>
                              ))}
                          </NativeSelect>
                        </Field>
                      </>
                    )}
                    <Field
                      name="amount"
                      label="Amount in minor units"
                      type="number"
                      step={1}
                      required
                    />
                    <Field
                      name="note"
                      label={
                        organizer
                          ? 'Reason or reference'
                          : 'Outside payment reference (optional)'
                      }
                      required={organizer}
                    />
                    {!organizer && (
                      <p>
                        Your report stays unconfirmed until an organizer checks
                        it.
                      </p>
                    )}
                  </>
                )}
                <div className="actions">
                  <Button type="submit">
                    {draft.hide
                      ? 'Hide post'
                      : draft.kind === 'ledger' && !organizer
                        ? 'Submit report'
                        : 'Save coordination'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </fieldset>
            </form>
          )}
          <div className="coord-columns">
            <section aria-label="Discussions">
              <h3>Discussions</h3>
              {data.posts.length === 0 && (
                <p className="muted">No posts in your discussions yet.</p>
              )}
              {data.posts.map((p) => (
                <article className="coord-card" key={p.id}>
                  <p className="eyebrow">
                    {
                      data.scopes.find(
                        (s) => s.activity === p.activity && s.event === p.event,
                      )?.title
                    }
                  </p>
                  <p className="muted">
                    {p.author} · {when(p.created)}
                    {p.edited ? ' · edited' : ''}
                  </p>
                  {p.hidden ? (
                    <p>Post hidden by an organizer.</p>
                  ) : (
                    <PlainText text={p.body} />
                  )}
                  {organizer && !!p.hidden && (
                    <details>
                      <summary>Hidden text and audit</summary>
                      <PlainText text={p.body} />
                      {data.post_history
                        .filter((h) => h.post === p.id)
                        .map((h) => (
                          <p key={h.id}>
                            {h.action} · {h.actor} · {when(h.at)} · {h.reason}
                          </p>
                        ))}
                    </details>
                  )}
                  {open && !draft && !p.hidden && (
                    <div className="actions">
                      {p.can_edit && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => begin({ kind: 'post', post: p })}
                        >
                          Edit post
                        </Button>
                      )}
                      {organizer && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            begin({ kind: 'post', post: p, hide: true })
                          }
                        >
                          Hide post
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </section>
            <section aria-label="Polls">
              <h3>Polls</h3>
              {data.polls.length === 0 && (
                <p className="muted">No polls available.</p>
              )}
              {data.polls.map((p) => (
                <article className="coord-card" key={p.id}>
                  <h4>{p.title}</h4>
                  <p className="muted">
                    {data.scopes.find((s) => s.event === p.event)?.title}
                  </p>
                  <p className="muted">
                    {p.closed ? 'Closed' : 'Open'}
                    {p.deadline ? ' · deadline ' + when(p.deadline) : ''}
                    {p.replaces ? ' · replacement poll' : ''}
                  </p>
                  {organizer ? (
                    <ol>
                      {p.options.map((option, i) => (
                        <li key={i}>
                          {option} · {p.totals?.[i] ?? 0} votes
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <VoteForm
                      key={p.id + ':' + data.revision}
                      poll={p}
                      disabled={!open || p.closed || busy}
                      submit={(choices) =>
                        void save({
                          kind: 'vote',
                          poll: p.id,
                          choices,
                          revision: data.revision,
                        })
                      }
                    />
                  )}
                  {!organizer && p.totals && (
                    <p>
                      Results:{' '}
                      {p.options
                        .map((o, i) => `${o}: ${p.totals![i]}`)
                        .join(' · ')}
                    </p>
                  )}
                  {organizer && (
                    <details>
                      <summary>Named responses and history</summary>
                      {p.responses.length === 0 && <p>No responses.</p>}
                      {p.responses.map((v) => (
                        <p key={v.id}>
                          {v.name}:{' '}
                          {v.choices.map((i) => p.options[i]).join(', ') ||
                            'No selection'}{' '}
                          · {v.current ? 'current' : 'historical, excluded'} ·{' '}
                          {when(v.at)}
                        </p>
                      ))}
                    </details>
                  )}
                  {organizer && open && !draft && (
                    <div className="actions">
                      {!p.closed && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void save({
                              kind: 'poll',
                              action: 'close',
                              id: p.id,
                              revision: data.revision,
                            })
                          }
                        >
                          Close poll
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => begin({ kind: 'poll', poll: p })}
                      >
                        Replace poll
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </section>
            <section aria-label="Payments">
              <h3>Payments</h3>
              {data.payments.length === 0 && (
                <p className="muted">No payment requests.</p>
              )}
              {data.payments.map((p) => (
                <article className="coord-card" key={p.id}>
                  <h4>{p.title}</h4>
                  <p className="muted">
                    {data.scopes.find((s) => s.event === p.event)?.title}
                  </p>
                  {organizer && <p>{p.name}</p>}
                  <p className="balance">
                    {p.balance} {p.currency} minor units outstanding
                  </p>
                  <p className="muted">
                    Original request: {p.amount} minor units
                  </p>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      Open outside payment service
                    </a>
                  )}
                  <ul className="ledger">
                    {p.entries.map((e) => (
                      <li key={e.id}>
                        <strong>
                          {e.kind === 'report'
                            ? reportStatus(e, p.entries)
                            : e.kind}
                        </strong>
                        : {e.amount} units · {e.author} · {when(e.at)}
                        {e.note && <PlainText text={e.note} />}
                      </li>
                    ))}
                  </ul>
                  {open && !draft && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => begin({ kind: 'ledger', payment: p })}
                    >
                      {organizer
                        ? 'Record adjustment'
                        : 'Report outside payment'}
                    </Button>
                  )}
                </article>
              ))}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
function VoteForm({
  poll,
  disabled,
  submit,
}: {
  poll: Poll;
  disabled: boolean;
  submit: (choices: number[]) => void;
}) {
  const [choices, setChoices] = useState<number[]>(poll.choices);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(choices);
      }}
    >
      <fieldset disabled={disabled}>
        <legend>
          {poll.multiple ? 'Choose any that apply' : 'Choose one'}
        </legend>
        {poll.multiple ? (
          poll.options.map((option, i) => (
            <Label key={i} className="choice">
              <Checkbox
                checked={choices.includes(i)}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  setChoices(
                    checked ? [...choices, i] : choices.filter((x) => x !== i),
                  )
                }
              />
              {option}
            </Label>
          ))
        ) : (
          <RadioGroup
            value={choices.length ? String(choices[0]) : null}
            disabled={disabled}
            onValueChange={(value) => setChoices([Number(value)])}
            aria-label={poll.title}
          >
            {poll.options.map((option, i) => (
              <Label key={i} className="choice">
                <RadioGroupItem value={String(i)} />
                {option}
              </Label>
            ))}
          </RadioGroup>
        )}
        {!disabled && (
          <Button variant="outline" type="submit">
            Save vote
          </Button>
        )}
      </fieldset>
    </form>
  );
}

function reportStatus(report: Entry, entries: Entry[]) {
  const confirmed = entries
    .filter((e) => e.kind === 'confirm' && e.report === report.id)
    .reduce((n, e) => n + e.amount, 0);
  return confirmed
    ? `Reported: ${confirmed} confirmed, ${report.amount - confirmed} unconfirmed`
    : 'Reported, unconfirmed';
}
