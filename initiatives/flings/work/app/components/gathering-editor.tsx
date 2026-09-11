'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { localTime, timeChoices } from '@/lib/event-time';

type Activity = {
  id: string;
  title: string;
  summary: string;
  details: string;
  state: string;
};
type Event = {
  id: string;
  activity: string;
  title: string;
  starts: string;
  zone: string;
  summary: string;
  details: string;
};
type Draft = Record<string, string>;
export default function GatheringEditor({
  data,
  busy,
  save,
}: {
  data: {
    fling: { title: string; state: string; revision: number };
    activities: Activity[];
    events: Event[];
  };
  busy: boolean;
  save: (kind: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const [editor, setEditor] = useState<{
    kind: string;
    draft: Draft;
    revision: number;
  } | null>(null);
  const [timeError, setTimeError] = useState('');
  const disabled = busy || data.fling.state === 'closed';
  function open(kind: string, draft: Draft) {
    setEditor({ kind, draft, revision: data.fling.revision });
    setTimeError('');
  }
  function field(key: string, label: string, type = 'text') {
    const id = 'author-' + key;
    return (
      <div className="field" key={key}>
        <Label htmlFor={id}>{label}</Label>
        {type === 'textarea' ? (
          <Textarea
            id={id}
            value={editor!.draft[key] || ''}
            maxLength={4000}
            onChange={(e) => change(key, e.target.value)}
          />
        ) : (
          <Input
            id={id}
            type={type}
            required
            value={editor!.draft[key] || ''}
            maxLength={4000}
            onChange={(e) => change(key, e.target.value)}
          />
        )}
      </div>
    );
  }
  function change(key: string, value: string) {
    setEditor({
      ...editor!,
      draft: {
        ...editor!.draft,
        [key]: value,
        ...(['local', 'zone'].includes(key) ? { starts: '' } : {}),
      },
    });
    setTimeError('');
  }
  let choices: ReturnType<typeof timeChoices> = [];
  if (editor?.kind === 'event' && editor.draft.local && editor.draft.zone) {
    try {
      choices = timeChoices(editor.draft.local, editor.draft.zone);
    } catch {
      /* Save explains invalid input. */
    }
  }
  async function submit() {
    if (editor!.kind === 'event') {
      try {
        const options = timeChoices(editor!.draft.local, editor!.draft.zone);
        if (!options.length)
          throw new Error(
            'That local time does not exist in this zone. Choose another time.',
          );
        if (options.length > 1 && !editor!.draft.starts)
          throw new Error('This time occurs twice. Choose a UTC offset.');
      } catch (error) {
        setTimeError((error as Error).message);
        return;
      }
    }
    await save(editor!.kind, { ...editor!.draft, revision: editor!.revision });
    setEditor(null);
  }
  return (
    <section className="gathering-editor" aria-label="Gathering plan">
      <div className="actions">
        <h2>Activities & events</h2>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => open('title', { title: data.fling.title })}
        >
          Rename fling
        </Button>
        <Button
          disabled={disabled}
          onClick={() =>
            open('activity', {
              title: '',
              summary: '',
              details: '',
              state: 'draft',
            })
          }
        >
          Add activity
        </Button>
      </div>
      {editor && (
        <form
          className="profile-panel author-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit().catch(() => {});
          }}
        >
          <h3>
            {editor.draft.id ? 'Edit ' : 'New '}
            {editor.kind === 'title' ? 'fling name' : editor.kind}
          </h3>
          <fieldset disabled={disabled}>
            {field(
              'title',
              editor.kind === 'event'
                ? 'Event title'
                : editor.kind === 'activity'
                  ? 'Activity title'
                  : 'Fling title',
            )}
            {editor.kind !== 'title' && (
              <>
                {field('summary', 'Invitation summary', 'textarea')}
                {field(
                  'details',
                  'Accepted members only: place and details',
                  'textarea',
                )}
              </>
            )}
            {editor.kind === 'activity' && (
              <div className="field">
                <Label htmlFor="author-state">Activity status</Label>
                <NativeSelect
                  id="author-state"
                  value={editor.draft.state}
                  onChange={(e) => change('state', e.target.value)}
                >
                  <option value="draft">Draft — organizers only</option>
                  <option value="published">
                    Published — available for invitations
                  </option>
                  <option value="cancelled">
                    Cancelled — notice remains for invitees
                  </option>
                </NativeSelect>
              </div>
            )}
            {editor.kind === 'event' && (
              <>
                {field('local', 'Local date and time', 'datetime-local')}
                {field('zone', 'Event time zone')}
                <p className="muted">
                  Use an IANA zone such as America/Los_Angeles or
                  Australia/Brisbane.
                </p>
                {choices.length > 1 && (
                  <div className="field">
                    <Label htmlFor="author-starts">
                      This time occurs twice: choose UTC offset
                    </Label>
                    <NativeSelect
                      id="author-starts"
                      required
                      value={editor.draft.starts || ''}
                      onChange={(e) => change('starts', e.target.value)}
                    >
                      <option value="">Choose an occurrence</option>
                      {choices.map((c) => (
                        <option key={c.starts} value={c.starts}>
                          {c.label} · {c.starts}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
                {timeError && <p role="alert">{timeError}</p>}
              </>
            )}
            <div className="actions">
              <Button type="submit">
                Save {editor.kind === 'title' ? 'fling name' : editor.kind}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditor(null)}
              >
                Cancel editing
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="activity-plan">
        {data.activities.map((activity, index) => (
          <article className="activity" key={activity.id}>
            <span className="badge">{activity.state}</span>
            <h3>{activity.title}</h3>
            <p>{activity.summary}</p>
            <div className="actions">
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => open('activity', { ...activity })}
              >
                Edit {activity.title}
              </Button>
              <Button
                variant="outline"
                disabled={disabled || index === 0}
                onClick={() => {
                  const ids = data.activities.map((a) => a.id);
                  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                  void save('order', { ids }).catch(() => {});
                }}
              >
                Move {activity.title} up
              </Button>
              <Button
                disabled={disabled}
                onClick={() =>
                  open('event', {
                    activity: activity.id,
                    title: '',
                    summary: '',
                    details: '',
                    local: '',
                    zone: 'America/Los_Angeles',
                    starts: '',
                  })
                }
              >
                Add event to {activity.title}
              </Button>
            </div>
            {data.events
              .filter((event) => event.activity === activity.id)
              .map((event) => (
                <div className="event" key={event.id}>
                  <h4>{event.title}</h4>
                  <p>
                    {localTime(event.starts, event.zone).replace('T', ' ')} ·{' '}
                    {event.zone}
                  </p>
                  <p>{event.details}</p>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    onClick={() =>
                      open('event', {
                        ...event,
                        local: localTime(event.starts, event.zone),
                        starts: new Date(event.starts).toISOString(),
                      })
                    }
                  >
                    Edit {event.title}
                  </Button>
                </div>
              ))}
          </article>
        ))}
        {!data.activities.length && (
          <p>No activities yet. Start with a draft, then add its events.</p>
        )}
      </div>
    </section>
  );
}
