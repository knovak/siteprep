'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
type Choice = { id: string; name: string };
type Audience = {
  selected_members: number;
  deliveries: {
    id: string;
    member: string;
    name: string;
    channel: string;
    destination: string;
    profile_revision: number;
  }[];
  omissions: { member: string; name: string; reason: string }[];
  duplicates: { channel: string; destination: string; members: Choice[] }[];
  choices: {
    members: Choice[];
    activities: { id: string; title: string }[];
    polls: { id: string; title: string; activity: string }[];
  };
};
type Props = {
  fling: string;
  revision: number;
  state: string;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
};
const initial = {
  group: 'all',
  filter: 'none',
  channel: 'preference',
  activity: '',
  poll: '',
  individuals: [] as string[],
};
export default function AudiencePanel({
  fling,
  revision,
  state,
  request,
}: Props) {
  const [form, setForm] = useState(initial),
    [result, setResult] = useState<Audience | null>(null),
    [choices, setChoices] = useState<Audience['choices'] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (state !== 'open') return;
    let cancelled = false;
    void request(fling + '/organizer/audience', 'POST', {
      ...initial,
      revision,
    })
      .then((r) => {
        if (!cancelled) setChoices((r as Audience).choices);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fling, revision, state, request]);
  async function review() {
    setBusy(true);
    setResult(null);
    setError('');
    try {
      const data = (await request(fling + '/organizer/audience', 'POST', {
        ...form,
        revision,
      })) as Audience;
      setResult(data);
      setChoices(data.choices);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function change(field: keyof typeof initial, value: string) {
    setForm({
      ...form,
      [field]: value,
      individuals:
        field === 'group' || field === 'filter' ? [] : form.individuals,
    });
    setResult(null);
  }
  return (
    <section className="audience-panel" aria-label="Message audience">
      <h2>Message audience</h2>
      <p>
        Review the individual recipients, delivery preferences and any contact
        details that need attention.
      </p>
      {state !== 'open' ? (
        <p className="muted">
          Close-out history remains available above. Reopen the fling to prepare
          a new message audience.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void review();
            }}
          >
            <fieldset disabled={busy || !choices}>
              <div className="audience-fields">
                <div className="field">
                  <Label htmlFor="audience-group">Recipient group</Label>
                  <NativeSelect
                    id="audience-group"
                    value={form.group}
                    onChange={(e) => change('group', e.target.value)}
                  >
                    <option value="all">All active members</option>
                    <option value="invitees">Current activity invitees</option>
                    <option value="accepted">Accepted activity members</option>
                  </NativeSelect>
                </div>
                <div className="field">
                  <Label htmlFor="audience-filter">Further limit to</Label>
                  <NativeSelect
                    id="audience-filter"
                    value={form.filter}
                    onChange={(e) => change('filter', e.target.value)}
                  >
                    <option value="none">Everyone in this group</option>
                    <option value="individuals">Selected individuals</option>
                    <option value="unanswered-invitation">
                      Unanswered invitations
                    </option>
                    <option value="unanswered-poll">
                      Unanswered poll members
                    </option>
                    <option value="outstanding-payment">
                      Outstanding payments
                    </option>
                  </NativeSelect>
                </div>
                <div className="field">
                  <Label htmlFor="audience-channel">Delivery channels</Label>
                  <NativeSelect
                    id="audience-channel"
                    value={form.channel}
                    onChange={(e) => change('channel', e.target.value)}
                  >
                    <option value="preference">
                      Use each member’s preference
                    </option>
                    <option value="email">Email only</option>
                    <option value="text">Text only</option>
                  </NativeSelect>
                </div>
              </div>
              {(form.group !== 'all' ||
                form.filter === 'unanswered-invitation') && (
                <div className="field">
                  <Label htmlFor="audience-activity">Audience activity</Label>
                  <NativeSelect
                    id="audience-activity"
                    required
                    value={form.activity}
                    onChange={(e) => change('activity', e.target.value)}
                  >
                    <option value="">Choose an activity</option>
                    {choices?.activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              {form.filter === 'unanswered-poll' && (
                <div className="field">
                  <Label htmlFor="audience-poll">Audience poll</Label>
                  <NativeSelect
                    id="audience-poll"
                    required
                    value={form.poll}
                    onChange={(e) => change('poll', e.target.value)}
                  >
                    <option value="">Choose an open poll</option>
                    {choices?.polls
                      .filter(
                        (p) =>
                          form.group === 'all' || p.activity === form.activity,
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </NativeSelect>
                </div>
              )}
              {form.filter === 'individuals' && (
                <fieldset>
                  <legend>Individual memberships</legend>
                  {choices?.members.map((m) => (
                    <Label key={m.id} className="choice">
                      <Checkbox
                        checked={form.individuals.includes(m.id)}
                        onCheckedChange={(checked) => {
                          setForm({
                            ...form,
                            individuals: checked
                              ? [...form.individuals, m.id]
                              : form.individuals.filter((id) => id !== m.id),
                          });
                          setResult(null);
                        }}
                      />
                      {m.name}
                    </Label>
                  ))}
                </fieldset>
              )}
              <Button type="submit">
                {busy ? 'Reviewing…' : 'Review recipients'}
              </Button>
            </fieldset>
          </form>
          {result && (
            <div className="audience-result" aria-live="polite">
              <h3>
                {result.selected_members}{' '}
                {result.selected_members === 1 ? 'membership' : 'memberships'} ·{' '}
                {result.deliveries.length} individual{' '}
                {result.deliveries.length === 1 ? 'message' : 'messages'}
              </h3>
              {result.duplicates.length > 0 && (
                <div className="notice">
                  <h3>Shared destinations need review</h3>
                  {result.duplicates.map((d, i) => (
                    <p key={i}>
                      {d.destination} ({d.channel}) ·{' '}
                      {d.members.map((m) => m.name).join(', ')}. These remain
                      separate memberships.
                    </p>
                  ))}
                </div>
              )}
              <div className="audience-columns">
                <section>
                  <h3>Recipients</h3>
                  {!result.deliveries.length && (
                    <p>No deliverable recipients match this selection.</p>
                  )}
                  <ul>
                    {result.deliveries.map((d) => (
                      <li key={d.id}>
                        <strong>{d.name}</strong> · {d.channel}
                        <br />
                        {d.destination}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>Omissions</h3>
                  {!result.omissions.length && <p>No contact omissions.</p>}
                  <ul>
                    {result.omissions.map((m) => (
                      <li key={m.member}>
                        <strong>{m.name}</strong> · {m.reason}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
