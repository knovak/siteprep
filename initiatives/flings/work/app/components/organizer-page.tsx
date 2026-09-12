/* oxlint-disable next/no-html-link-for-pages -- Navigation discards the current authority context. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AudiencePanel from './audience-panel';
import CoordinationPanel from './coordination-panel';
import GatheringEditor from './gathering-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

type Fling = {
  id: string;
  title: string;
  description: string;
  default_zone: string;
  state: string;
  revision: number;
};
type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preference: string;
  revision: number;
};
type Activity = {
  id: string;
  title: string;
  summary: string;
  details: string;
  state: string;
};
type Organizer = { id: string; name: string };
type Snapshot = {
  organizer: string;
  csrf: string;
  fling: Fling;
  members: Member[];
  organizers: Organizer[];
  activities: Activity[];
  events: {
    id: string;
    activity: string;
    title: string;
    starts: string;
    ends: string | null;
    invitation_location: string;
    location_name: string;
    location_address: string;
    location_url: string;
    changed_at: number | null;
    zone: string;
    summary: string;
    details: string;
  }[];
  invitations: { member: string; activity: string; state: string }[];
};
const blank = { name: '', email: '', phone: '', preference: 'email' };
export default function OrganizerPage({ fling }: { fling?: string }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [list, setList] = useState<Fling[] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blank),
    [confirmation, setConfirmation] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [memberDraft, setMemberDraft] = useState<Member | null>(null);
  const [addOrganizer, setAddOrganizer] = useState<string | null>(null);
  const [removeOrganizer, setRemoveOrganizer] = useState<Organizer | null>(
    null,
  );
  const auth = useRef<{ id: string; csrf: string } | null>(null);
  const request = useCallback(
    async (path: string, method = 'GET', body?: unknown) => {
      const r = await fetch('/api/flings/' + path, {
        method,
        cache: 'no-store',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(path.startsWith('local/') ? { 'x-flings-local': '1' } : {}),
          ...(auth.current && !path.startsWith('local/')
            ? {
                'x-flings-csrf': auth.current.csrf,
                'x-flings-organizer': auth.current.id,
              }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const value = (await r.json()) as Snapshot & {
        id: string;
        flings: Fling[];
        name: string;
        url: string;
        error?: string;
      };
      if (!r.ok) {
        if ([401, 403, 409].includes(r.status)) {
          setError(
            value.error ||
              'Access or the record changed. Reload this workspace.',
          );
          setData(null);
          setList(null);
          setMemberDraft(null);
        }
        throw new Error(value.error);
      }
      return value;
    },
    [],
  );
  const refreshRun = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++refreshRun.current;
    if (!auth.current) setInitializing(true);
    const value = await request((fling || 'workspace') + '/organizer').catch(
      (error) => {
        if (run === refreshRun.current) setInitializing(false);
        throw error;
      },
    );
    if (run !== refreshRun.current) return;
    auth.current = { id: value.organizer, csrf: value.csrf };
    if (fling) setData(value);
    else {
      setList(value.flings);
      setProfileName(value.name);
    }
    setInitializing(false);
  }, [fling, request]);

  useEffect(() => {
    void Promise.resolve()
      .then(refresh)
      .catch((e) => {
        if (fling) setError(e.message);
      });
    const recheck = () => {
      void refresh().catch((e) => setError(e.message));
    };
    window.addEventListener('focus', recheck);
    return () => window.removeEventListener('focus', recheck);
  }, [refresh, fling]);
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signIn(organizer: string) {
    await request('local/organizer', 'POST', { organizer });
    auth.current = null;
    await refresh();
  }
  async function changeInvitation(
    member: string,
    activity: string,
    state: string,
  ) {
    await request(fling + '/organizer/invitation', 'POST', {
      member,
      activity,
      state,
      revision: data!.fling.revision,
    });
    await refresh();
    setNotice(
      state === 'withdrawn'
        ? 'Invitation withdrawn.'
        : 'Invitation saved. No message was sent.',
    );
  }
  return (
    <main className="workspace organizer-workspace">
      <header>
        <a className="wordmark" href="/">
          flings<span>✳</span>
        </a>
        <a href="/organizer">Organizer workspace</a>
        <span className="rehearsal">Local rehearsal · fictional people</span>
      </header>
      <section className="intro">
        <p className="eyebrow">Organizer</p>
        <h1>{data?.fling.title || 'Your gatherings'}</h1>
        {data?.fling.description && <p>{data.fling.description}</p>}
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}{' '}
          <Button
            variant="outline"
            disabled={busy || initializing}
            onClick={() => void act(refresh)}
          >
            Reload workspace
          </Button>
        </div>
      )}
      <output aria-live="polite">{notice}</output>
      {!fling && (
        <section className="identity">
          <h2>Choose a fictional organizer</h2>
          <div className="actions">
            {[
              ['a', 'Casey'],
              ['b', 'Rowan'],
              ['c', 'Sam'],
            ].map(([id, name]) => (
              <Button
                key={id}
                disabled={busy || initializing}
                onClick={() => void act(() => signIn(id))}
              >
                {name}
              </Button>
            ))}
          </div>
          <p className="muted">Only that organizer’s assigned flings appear.</p>
        </section>
      )}
      {!fling && list && (
        <div className="gatherings">
          {list.map((f) => (
            <article key={f.id}>
              <span className="badge">{f.state}</span>
              <h2>
                <a href={'/organizer/' + f.id}>{f.title}</a>
              </h2>
            </article>
          ))}
          {!list.length && <p>No assigned gatherings.</p>}
        </div>
      )}
      {!fling && list && (
        <form
          className="profile-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await request('workspace/organizer/profile', 'POST', {
                name: profileName,
              });
              setNotice('Organizer name saved.');
            });
          }}
        >
          <h2>Your organizer profile</h2>
          <p className="muted">
            This name appears to members and co-organizers across every fling
            you organize.
          </p>
          <fieldset disabled={busy || initializing}>
            <div className="field">
              <Label htmlFor="organizer-name">Organizer name</Label>
              <Input
                id="organizer-name"
                required
                maxLength={100}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <Button type="submit">Save name</Button>
          </fieldset>
        </form>
      )}
      {!fling && list && (
        <form
          className="profile-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const result = await request('workspace/organizer', 'POST', {
                title: newTitle,
              });
              window.location.assign('/organizer/' + result.id);
            });
          }}
        >
          <h2>Create a fling</h2>
          <fieldset disabled={busy || initializing}>
            <div className="field">
              <Label htmlFor="fling-title">New fling title</Label>
              <Input
                id="fling-title"
                required
                maxLength={4000}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <Button type="submit">Create fling</Button>
          </fieldset>
        </form>
      )}
      {fling && !data && !error && <output>Opening your gathering…</output>}
      {data && (
        <div hidden={initializing}>
          <CoordinationPanel
            endpoint={fling + '/organizer/coordination'}
            parentRevision={data.fling.revision}
            request={request}
            refresh={refresh}
            organizer
            members={data.members}
            invitations={data.invitations}
          />
          <AudiencePanel
            key={
              data.fling.revision +
              ':' +
              data.members.map((m) => m.id + ':' + m.revision).join(',')
            }
            fling={fling!}
            revision={data.fling.revision}
            state={data.fling.state}
            request={request}
          />
          <div className="gathering-state">
            <span className="badge">{data.fling.state}</span>
            <Button
              variant="outline"
              disabled={busy || initializing}
              onClick={() => setConfirmation(true)}
            >
              {data.fling.state === 'open' ? 'Close fling' : 'Reopen fling'}
            </Button>
          </div>
          {data.fling.state === 'closed' && (
            <p className="notice">
              This fling is closed. Invitation responses are preserved and
              contact corrections remain available.
            </p>
          )}
          <AlertDialog open={confirmation} onOpenChange={setConfirmation}>
            <AlertDialogContent>
              <AlertDialogTitle>
                {data.fling.state === 'open'
                  ? 'Close this fling?'
                  : 'Reopen this fling?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {data.fling.state === 'open'
                  ? 'Invitations and responses stop. Members can still read permitted history and correct their contact details.'
                  : 'Invitations and responses become available again. Existing responses are preserved and nothing is sent.'}
              </AlertDialogDescription>
              <AlertDialogCancel>Keep current state</AlertDialogCancel>
              <Button
                disabled={busy || initializing}
                onClick={() =>
                  void act(async () => {
                    await request(fling + '/organizer/state', 'POST', {
                      state: data.fling.state === 'open' ? 'closed' : 'open',
                      revision: data.fling.revision,
                      confirm: true,
                    });
                    setConfirmation(false);
                    await refresh();
                    setNotice('Gathering state saved.');
                  })
                }
              >
                Confirm {data.fling.state === 'open' ? 'closure' : 'reopening'}
              </Button>
            </AlertDialogContent>
          </AlertDialog>
          <GatheringEditor
            data={data}
            busy={busy || initializing}
            save={async (kind, input) => {
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await request(fling + '/organizer/' + kind, 'POST', {
                  ...input,
                  revision: input.revision ?? data.fling.revision,
                });
                await refresh();
                setNotice('Gathering plan saved. No message was sent.');
              } catch (e) {
                setError((e as Error).message);
                throw e;
              } finally {
                setBusy(false);
              }
            }}
          />
          <div className="member-grid">
            <section aria-labelledby="members-title">
              <h2 id="members-title">Members & invitations</h2>
              {data.members.map((m) => (
                <article className="activity" key={m.id}>
                  <h2>{m.name}</h2>
                  <p className="muted">
                    {m.preference === 'both' ? 'Email and text' : m.preference}{' '}
                    · {m.email || 'No email'} · {m.phone || 'No phone'}
                  </p>
                  <Button
                    variant="outline"
                    disabled={busy || initializing}
                    onClick={() =>
                      void act(async () => {
                        const result = await request(
                          fling + '/organizer/' + m.id + '/preview',
                          'POST',
                          {},
                        );
                        window.location.assign(result.url);
                      })
                    }
                  >
                    Preview {m.name}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || initializing}
                    onClick={() => setMemberDraft({ ...m })}
                  >
                    Edit profile for {m.name}
                  </Button>
                  {memberDraft?.id === m.id && (
                    <form
                      className="profile-editor"
                      aria-label={'Edit profile for ' + m.name}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          await request(
                            fling + '/organizer/' + memberDraft.id,
                            'PUT',
                            {
                              name: memberDraft.name,
                              email: memberDraft.email,
                              phone: memberDraft.phone,
                              preference: memberDraft.preference,
                              revision: memberDraft.revision,
                            },
                          );
                          setMemberDraft(null);
                          await refresh();
                          setNotice(
                            'Member profile saved for this fling. No message was sent.',
                          );
                        });
                      }}
                    >
                      <p>
                        Changes apply only to this membership. Missing contact
                        details can be added later.
                      </p>
                      <fieldset disabled={busy}>
                        {(['name', 'email', 'phone'] as const).map((field) => (
                          <div className="field" key={field}>
                            <Label htmlFor={'edit-member-' + field}>
                              Edit member {field}
                            </Label>
                            <Input
                              id={'edit-member-' + field}
                              required={field === 'name'}
                              type={
                                field === 'email'
                                  ? 'email'
                                  : field === 'phone'
                                    ? 'tel'
                                    : 'text'
                              }
                              value={memberDraft[field]}
                              onChange={(e) =>
                                setMemberDraft({
                                  ...memberDraft,
                                  [field]: e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                        <div className="field">
                          <Label htmlFor="edit-member-preference">
                            Edit member message preference
                          </Label>
                          <select
                            id="edit-member-preference"
                            value={memberDraft.preference}
                            onChange={(e) =>
                              setMemberDraft({
                                ...memberDraft,
                                preference: e.target.value,
                              })
                            }
                          >
                            <option value="email">Email</option>
                            <option value="text">Text</option>
                            <option value="both">Email and text</option>
                          </select>
                        </div>
                        <Button type="submit">Save member profile</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMemberDraft(null)}
                        >
                          Cancel profile edit
                        </Button>
                      </fieldset>
                    </form>
                  )}
                  <div className="invitation-list">
                    {data.activities
                      .filter((a) => a.state === 'published')
                      .map((a) => {
                        const state = data.invitations.find(
                          (i) => i.member === m.id && i.activity === a.id,
                        )?.state;
                        const active = !!state && state !== 'withdrawn';
                        return (
                          <div className="invitation-row" key={a.id}>
                            <div>
                              <strong>{a.title}</strong>
                              <p className="muted">{state || 'Not invited'}</p>
                            </div>
                            <Button
                              variant="outline"
                              disabled={busy || data.fling.state === 'closed'}
                              aria-label={
                                (active ? 'Withdraw ' : 'Invite ') +
                                m.name +
                                ' · ' +
                                a.title
                              }
                              onClick={() =>
                                void act(() =>
                                  changeInvitation(
                                    m.id,
                                    a.id,
                                    active ? 'withdrawn' : 'invited',
                                  ),
                                )
                              }
                            >
                              {active ? 'Withdraw' : 'Invite'}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </article>
              ))}
            </section>
            <aside>
              <section className="profile-panel">
                <h2>Organizers</h2>
                <ul className="organizer-list">
                  {data.organizers.map((o) => (
                    <li key={o.id}>
                      <span>
                        {o.name}
                        {o.id === data.organizer ? ' (you)' : ''}
                      </span>
                      <Button
                        variant="outline"
                        disabled={busy || data.organizers.length <= 1}
                        onClick={() => setRemoveOrganizer(o)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
                {data.organizers.length <= 1 && (
                  <p className="muted">
                    A fling always needs at least one organizer, so the last one
                    cannot be removed here.
                  </p>
                )}
                <AlertDialog
                  open={!!removeOrganizer}
                  onOpenChange={(open) => !open && setRemoveOrganizer(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogTitle>
                      Remove {removeOrganizer?.name} as an organizer?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      They lose organizer access to this fling immediately. This
                      does not affect their access to any other fling, and
                      nothing is sent to them.
                    </AlertDialogDescription>
                    <AlertDialogCancel>Keep organizer</AlertDialogCancel>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          await request(
                            fling + '/organizer/assignments/remove',
                            'POST',
                            { organizer: removeOrganizer!.id, confirm: true },
                          );
                          setRemoveOrganizer(null);
                          await refresh();
                          setNotice('Organizer removed.');
                        })
                      }
                    >
                      Confirm removal
                    </Button>
                  </AlertDialogContent>
                </AlertDialog>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newOrganizer.trim())
                      setAddOrganizer(newOrganizer.trim());
                  }}
                >
                  <fieldset disabled={busy}>
                    <div className="field">
                      <Label htmlFor="new-organizer">
                        Existing organizer ID
                      </Label>
                      <Input
                        id="new-organizer"
                        required
                        value={newOrganizer}
                        onChange={(e) => setNewOrganizer(e.target.value)}
                      />
                    </div>
                    <Button type="submit">Add organizer</Button>
                  </fieldset>
                </form>
                <AlertDialog
                  open={addOrganizer !== null}
                  onOpenChange={(open) => !open && setAddOrganizer(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogTitle>
                      Add organizer {addOrganizer} to this fling?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      They will have full organizer access, including member
                      contact details and the ability to change other
                      organizers. This applies only to this fling. Nothing is
                      sent to them.
                    </AlertDialogDescription>
                    <AlertDialogCancel>
                      Keep current organizers
                    </AlertDialogCancel>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          const organizer = addOrganizer;
                          setAddOrganizer(null);
                          await request(
                            fling + '/organizer/assignments',
                            'POST',
                            {
                              organizer,
                              confirm: true,
                            },
                          );
                          setNewOrganizer('');
                          await refresh();
                          setNotice(
                            'Organizer added. They see this fling next time they open their workspace.',
                          );
                        })
                      }
                    >
                      Confirm addition
                    </Button>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
              <section className="profile-panel">
                <h2>Add a member</h2>
                <p className="muted">
                  This creates a profile for this fling. Invitations and sending
                  remain separate actions.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await request(fling + '/organizer/members', 'POST', form);
                      setForm(blank);
                      await refresh();
                      setNotice('Member profile created. No message was sent.');
                    });
                  }}
                >
                  <fieldset disabled={busy || data.fling.state === 'closed'}>
                    {(['name', 'email', 'phone'] as const).map((f) => (
                      <div className="field" key={f}>
                        <Label htmlFor={'new-' + f}>
                          {f === 'name'
                            ? 'Member name'
                            : f === 'email'
                              ? 'Member email'
                              : 'Member phone'}
                        </Label>
                        <Input
                          id={'new-' + f}
                          value={form[f]}
                          required={f === 'name'}
                          type={
                            f === 'email'
                              ? 'email'
                              : f === 'phone'
                                ? 'tel'
                                : 'text'
                          }
                          onChange={(e) =>
                            setForm({ ...form, [f]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                    <div className="field">
                      <Label htmlFor="new-preference">
                        Receive messages by
                      </Label>
                      <select
                        id="new-preference"
                        value={form.preference}
                        onChange={(e) =>
                          setForm({ ...form, preference: e.target.value })
                        }
                      >
                        <option value="email">Email</option>
                        <option value="text">Text</option>
                        <option value="both">Email and text</option>
                      </select>
                    </div>
                    <Button type="submit">Create member</Button>
                  </fieldset>
                </form>
              </section>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
