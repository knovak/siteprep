'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type ParticipationActivity = {
  id: string;
  title: string;
  capacity: number | null;
  cascading: number;
  timeout_minutes: number | null;
  allow_late: number;
  invitation_order: string;
};
type Invitation = {
  member: string;
  activity: string;
  state: string;
  timed_out: number;
};
export default function ParticipationPanel({
  activity: a,
  members,
  invitations,
  revision,
  disabled,
  save,
}: {
  activity: ParticipationActivity;
  members: { id: string; name: string }[];
  invitations: Invitation[];
  revision: number;
  disabled: boolean;
  save: (kind: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<{
    limited: boolean;
    capacity: string;
    cascading: boolean;
    timeout: string;
    late: boolean;
    ids: string[];
    revision: number;
  } | null>(null);
  const answers = invitations.filter(
    (i) => i.activity === a.id && members.some((m) => m.id === i.member),
  );
  const confirmed = answers.filter((i) => i.state === 'accepted').length;
  const pending = answers.filter((i) => i.state === 'invited').length;
  const selected = new Set(draft?.ids);
  function open() {
    const order = JSON.parse(a.invitation_order) as string[];
    const ids = [
      ...new Set([
        ...order,
        ...answers.filter((i) => i.state !== 'withdrawn').map((i) => i.member),
      ]),
    ].filter((id) => members.some((m) => m.id === id));
    setDraft({
      limited: a.capacity !== null,
      capacity: String(a.capacity ?? 1),
      cascading: !!a.cascading,
      timeout: a.timeout_minutes === null ? '' : String(a.timeout_minutes),
      late: !!a.allow_late,
      ids,
      revision,
    });
  }
  function move(index: number, direction: number) {
    const ids = [...draft!.ids];
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    setDraft({ ...draft!, ids });
  }
  return (
    <section
      className="participation-panel"
      aria-label={'Participation for ' + a.title}
    >
      <p>
        <strong>Participation:</strong>{' '}
        {a.capacity === null
          ? 'Unlimited'
          : `${confirmed} of ${a.capacity} confirmed${confirmed >= a.capacity ? ' · Closed — full' : ''}`}
        {pending > 0 && ` · ${pending} awaiting a response`}
      </p>
      {a.cascading === 1 && (
        <p className="muted">
          Cascading invitations · next members are invited as places become
          available.
        </p>
      )}
      {!draft ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={open}
        >
          Manage participation
        </Button>
      ) : (
        <form
          className="profile-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void save('participation', {
              id: a.id,
              revision: draft.revision,
              capacity: draft.limited ? Number(draft.capacity) : null,
              cascading: draft.limited && draft.cascading,
              timeout_minutes:
                draft.limited && draft.timeout !== ''
                  ? Number(draft.timeout)
                  : null,
              allow_late: draft.limited && draft.late,
              member_ids: draft.ids,
            })
              .then(() => setDraft(null))
              .catch(() => {});
          }}
        >
          <fieldset disabled={disabled}>
            <legend>Participation for {a.title}</legend>
            <label className="choice">
              <input
                type="checkbox"
                checked={draft.limited}
                onChange={(e) =>
                  setDraft({ ...draft, limited: e.target.checked })
                }
              />
              Limit participation
            </label>
            {draft.limited && (
              <>
                <label className="field">
                  Maximum confirmed members
                  <input
                    type="number"
                    min={Math.max(1, confirmed)}
                    max={10000}
                    step={1}
                    required
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft({ ...draft, capacity: e.target.value })
                    }
                  />
                </label>
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={draft.cascading}
                    onChange={(e) =>
                      setDraft({ ...draft, cascading: e.target.checked })
                    }
                  />
                  Cascading invitations
                </label>
                <p className="muted">
                  {draft.cascading
                    ? 'Invite in the order below, with one outstanding invitation per open place. Declines and timeouts invite the next member.'
                    : 'Invite the selected members together. Places go to the first members who confirm.'}
                </p>
                <label className="field">
                  Response timeout (minutes, optional)
                  <input
                    type="number"
                    min={1}
                    max={525600}
                    step={1}
                    value={draft.timeout}
                    placeholder="No timeout"
                    onChange={(e) =>
                      setDraft({ ...draft, timeout: e.target.value })
                    }
                  />
                </label>
                <p className="muted">
                  60 minutes = 1 hour; 1,440 minutes = 1 day. Time starts when
                  each invitation opens. Timeouts are checked automatically
                  while a page is open and when anyone returns.
                </p>
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={draft.late}
                    onChange={(e) =>
                      setDraft({ ...draft, late: e.target.checked })
                    }
                  />
                  Allow timed-out members to accept while a place remains
                </label>
              </>
            )}
            <h4>Select members to invite</h4>
            <p className="muted">
              Unselected invitations are withdrawn. Confirmed members stay
              selected. Existing answers are preserved.
            </p>
            {members.map((m) => (
              <label className="choice" key={m.id}>
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  disabled={answers.some(
                    (i) => i.member === m.id && i.state === 'accepted',
                  )}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ids: e.target.checked
                        ? [...draft.ids, m.id]
                        : draft.ids.filter((id) => id !== m.id),
                    })
                  }
                />
                {m.name}
              </label>
            ))}
            {draft.limited && draft.cascading && (
              <>
                <h4>Invitation order</h4>
                <ol>
                  {draft.ids.map((id, index) => {
                    const name = members.find((m) => m.id === id)?.name;
                    const invitation = answers.find((i) => i.member === id);
                    return (
                      <li key={id}>
                        <span>
                          {name} ·{' '}
                          {invitation?.timed_out &&
                          invitation.state === 'declined'
                            ? 'Timed out'
                            : invitation?.state &&
                                invitation.state !== 'withdrawn'
                              ? invitation.state
                              : 'Waiting in order'}
                        </span>
                        <div className="actions">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={index === 0}
                            aria-label={'Move ' + name + ' earlier'}
                            onClick={() => move(index, -1)}
                          >
                            Earlier
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={index === draft.ids.length - 1}
                            aria-label={'Move ' + name + ' later'}
                            onClick={() => move(index, 1)}
                          >
                            Later
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="muted">
                  Reordering affects invitations still waiting. Invitations
                  already open keep their place.
                </p>
              </>
            )}
            <div className="actions">
              <Button type="submit">Save participation</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                Cancel participation edit
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
