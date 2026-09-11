/* oxlint-disable next/no-html-link-for-pages -- Full navigation clears member credentials held in memory. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profile as validateProfile } from '@/lib/access';

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preference: string;
  revision: number;
  complete: boolean;
};
type Projection = {
  profile: Profile;
  fling: {
    id: string;
    title: string;
    description: string;
    default_zone: string;
    state: string;
    revision: number;
  };
  activities: {
    id: string;
    title: string;
    summary: string;
    details: string | null;
    state: string;
    invitation: string;
  }[];
  events: {
    id: string;
    activity: string;
    starts: string;
    ends: string | null;
    invitation_location: string;
    location_name: string | null;
    location_address: string | null;
    location_url: string | null;
    changed_at: number | null;
    zone: string;
    title: string;
    summary: string;
    details: string | null;
  }[];
  preview: boolean;
};
type Credentials = { member: string; csrf?: string; preview?: string };
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};
type ModelDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: Tool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};
export default function MemberPage({
  fling,
  previewMember,
}: {
  fling: string;
  previewMember?: string;
}) {
  const [data, setData] = useState<Projection | null>(null),
    [form, setForm] = useState<Profile | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false);
  const credentials = useRef<Credentials | null>(null),
    started = useRef(false),
    current = useRef<Projection | null>(null);
  const apply = useCallback((value: Projection | null) => {
    current.current = value;
    setData(value);
    setForm(value?.profile ?? null);
  }, []);
  const call = useCallback(
    async <T,>(path: string, method = 'GET', body?: unknown) => {
      const c = credentials.current;
      const r = await fetch(
        `/api/flings/${encodeURIComponent(fling)}/${path}`,
        {
          method,
          cache: 'no-store',
          headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(c?.csrf ? { 'x-flings-csrf': c.csrf } : {}),
            ...(c?.preview ? { Authorization: 'Bearer ' + c.preview } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const result = (await r.json()) as T & { error?: string };
      if (!r.ok) {
        if ([401, 403, 409].includes(r.status)) apply(null);
        throw new Error(result.error);
      }
      return result as T;
    },
    [fling, apply],
  );
  const refresh = useCallback(async () => {
    const c = credentials.current;
    if (!c) return;
    apply(await call<Projection>('member/' + encodeURIComponent(c.member)));
  }, [call, apply]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Capture in memory and remove immediately, before making any request.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = fragment.get('code'),
      preview = fragment.get('preview');
    history.replaceState(null, '', window.location.pathname);
    void (async () => {
      try {
        if (previewMember) {
          if (!preview)
            throw new Error(
              'Open a fresh preview from the organizer rehearsal.',
            );
          credentials.current = { member: previewMember, preview };
        } else if (code) {
          const r = await fetch(
            `/api/flings/${encodeURIComponent(fling)}/exchange`,
            {
              method: 'POST',
              cache: 'no-store',
              headers: {
                'Content-Type': 'application/json',
                'x-flings-exchange': '1',
              },
              body: JSON.stringify({ code }),
            },
          );
          const result = (await r.json()) as Credentials & { error?: string };
          if (!r.ok) throw new Error(result.error);
          credentials.current = result;
        } else credentials.current = await call<Credentials>('session');
        await refresh();
      } catch (e) {
        apply(null);
        setError((e as Error).message);
      }
    })();
  }, [fling, previewMember, call, refresh, apply]);
  useEffect(() => {
    const recheck = () => {
      if (!credentials.current) return;
      apply(null);
      setNotice('');
      void refresh().catch((e) => setError(e.message));
    };
    const pageShow = (e: PageTransitionEvent) => {
      if (e.persisted) recheck();
    };
    window.addEventListener('focus', recheck);
    window.addEventListener('pageshow', pageShow);
    return () => {
      window.removeEventListener('focus', recheck);
      window.removeEventListener('pageshow', pageShow);
    };
  }, [refresh, apply]);
  const save = useCallback(
    async (input: unknown) => {
      if (previewMember || !current.current || !credentials.current)
        throw new Error('Open your current member page before saving.');
      if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Enter a profile.');
      const allowed = ['name', 'email', 'phone', 'preference'];
      if (Object.keys(input).some((k) => !allowed.includes(k)))
        throw new Error('Only profile fields may be changed.');
      for (const k of allowed)
        if (typeof (input as Record<string, unknown>)[k] !== 'string')
          throw new Error('Provide all four profile fields.');
      const p = validateProfile(input as Record<string, unknown>);
      setSaving(true);
      setError('');
      setNotice('');
      try {
        const result: Projection = await call<Projection>(
          'member/' + encodeURIComponent(credentials.current.member),
          'PUT',
          { ...p, revision: current.current.profile.revision },
        );
        flushSync(() => {
          apply(result);
          setNotice('Your profile is saved for this fling.');
        });
        return {
          saved: true,
          revision: result.profile.revision,
          complete: result.profile.complete,
        };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [previewMember, call, apply],
  );
  useEffect(() => {
    if (previewMember) return;
    const context = (document as ModelDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'update_member_profile',
            title: 'Save this member profile',
            description:
              'Save the four contact profile fields for the member already open on this page. Uses the same save action as the form. Never changes the fling or member context.',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                preference: { type: 'string', enum: ['email', 'text', 'both'] },
              },
              required: ['name', 'email', 'phone', 'preference'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: save,
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional browser capability; the form remains available. */
      });
    } catch {
      /* Unsupported registry; no authority is granted by registration. */
    }
    return () => lifecycle.abort();
  }, [previewMember, save]);
  async function respond(activity: string, state: string) {
    if (!current.current || !credentials.current || previewMember) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      apply(
        await call<Projection>(
          'member/' +
            encodeURIComponent(credentials.current.member) +
            '/respond',
          'POST',
          { activity, state, revision: current.current.fling.revision },
        ),
      );
      setNotice('Your invitation response is saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const fields = ['name', 'email', 'phone'] as const;
  return (
    <main className="workspace member-workspace">
      <header>
        <a className="wordmark" href="/">
          flings<span>✳</span>
        </a>
        <span className="rehearsal">Local rehearsal · fictional people</span>
      </header>
      {error && (
        <div className="notice error" role="alert">
          <p>{error}</p>
          {!data && <a href="/">Return to the rehearsals</a>}
        </div>
      )}
      {!data && !error && (
        <output className="intro">Opening your member page…</output>
      )}
      {data && (
        <>
          {previewMember && (
            <output className="notice preview">
              Preview — {data.profile.name} · read-only
            </output>
          )}
          <section className="intro">
            <p className="eyebrow">Your fling</p>
            <h1>{data.fling.title}</h1>
            {data.fling.description && <p>{data.fling.description}</p>}
            <p>Welcome, {data.profile.name}. Here’s what you’re invited to.</p>
          </section>
          {data.fling.state === 'closed' && (
            <div className="notice">
              This fling is closed. You can still correct your contact details.
            </div>
          )}
          <div className="member-grid">
            <section aria-labelledby="activities-title">
              <h2 id="activities-title" className="section-title">
                Your activities <span>{data.activities.length}</span>
              </h2>
              {data.activities.length === 0 && <p>No current invitations.</p>}
              {data.activities.map((a) => (
                <article className="activity" key={a.id}>
                  <span className={'badge ' + a.invitation}>
                    {a.state === 'cancelled'
                      ? 'Cancelled'
                      : a.invitation === 'accepted'
                        ? 'You’re going'
                        : a.invitation === 'declined'
                          ? 'Declined'
                          : 'Invited'}
                  </span>
                  <h2>{a.title}</h2>
                  <p>{a.summary}</p>
                  {a.details && <p className="details">{a.details}</p>}
                  {data.events
                    .filter((e) => e.activity === a.id)
                    .map((e) => (
                      <div className="event" key={e.id}>
                        <h3>{e.title}</h3>
                        <p>
                          <time dateTime={e.starts}>
                            {new Intl.DateTimeFormat('en-US', {
                              timeZone: e.zone,
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(e.starts))}
                          </time>{' '}
                          {e.ends && (
                            <>
                              {' '}
                              –{' '}
                              <time dateTime={e.ends}>
                                {new Intl.DateTimeFormat('en-US', {
                                  timeZone: e.zone,
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }).format(new Date(e.ends))}
                              </time>{' '}
                            </>
                          )}
                          · {e.zone}
                        </p>
                        <p>{e.summary}</p>
                        {e.invitation_location && (
                          <p>{e.invitation_location}</p>
                        )}
                        {e.location_name && <p>{e.location_name}</p>}
                        {e.location_address && <p>{e.location_address}</p>}
                        {e.location_url && (
                          <a
                            href={e.location_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                          >
                            Location link
                          </a>
                        )}
                        {e.changed_at !== null && (
                          <p className="muted small">
                            Updated{' '}
                            {new Intl.DateTimeFormat('en-US', {
                              timeZone: e.zone,
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(e.changed_at))}{' '}
                            · {e.zone}
                          </p>
                        )}
                        {e.details && <p>{e.details}</p>}
                      </div>
                    ))}
                  {!previewMember &&
                    data.fling.state === 'open' &&
                    a.state === 'published' && (
                      <div className="actions">
                        {a.invitation !== 'accepted' && (
                          <Button
                            disabled={saving}
                            onClick={() => void respond(a.id, 'accepted')}
                          >
                            Accept invitation
                          </Button>
                        )}
                        {a.invitation !== 'declined' && (
                          <Button
                            disabled={saving}
                            variant="outline"
                            onClick={() => void respond(a.id, 'declined')}
                          >
                            Decline invitation
                          </Button>
                        )}
                      </div>
                    )}
                </article>
              ))}
            </section>
            <aside>
              <section
                className="profile-panel"
                aria-labelledby="profile-title"
              >
                <p className="eyebrow">Just for this fling</p>
                <h2 id="profile-title">Your contact details</h2>
                <p className="muted">
                  Changes here won’t change your profile in another fling.
                </p>
                {!data.profile.complete && (
                  <output className="notice">
                    Your delivery preference is missing a contact detail. You
                    can save now and add it later.
                  </output>
                )}
                {form && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save({
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        preference: form.preference,
                      }).catch((e) => setError(e.message));
                    }}
                  >
                    <fieldset disabled={!!previewMember || saving}>
                      {fields.map((field) => (
                        <div className="field" key={field}>
                          <Label htmlFor={field}>
                            {field === 'name'
                              ? 'Name'
                              : field === 'email'
                                ? 'Email'
                                : 'Phone'}
                          </Label>
                          <Input
                            id={field}
                            name={field}
                            type={
                              field === 'email'
                                ? 'email'
                                : field === 'phone'
                                  ? 'tel'
                                  : 'text'
                            }
                            autoComplete={field === 'phone' ? 'tel' : field}
                            value={form[field]}
                            onChange={(e) =>
                              setForm({ ...form, [field]: e.target.value })
                            }
                            required={field === 'name'}
                          />
                        </div>
                      ))}
                      <div className="field">
                        <Label htmlFor="preference">Receive messages by</Label>
                        <select
                          id="preference"
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
                      <p className="muted small">
                        Phone numbers use an international prefix, such as +1.
                      </p>
                      {!previewMember && (
                        <Button type="submit" size="lg" disabled={saving}>
                          {saving ? 'Saving…' : 'Save profile'}
                        </Button>
                      )}
                    </fieldset>
                  </form>
                )}
                <output className="save-status">{notice}</output>
              </section>
            </aside>
          </div>
          <p className="footnote">
            Your member link opens this fling only. Keep it to yourself. These
            rehearsals never send messages.
          </p>
        </>
      )}
    </main>
  );
}
