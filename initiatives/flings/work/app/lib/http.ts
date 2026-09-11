import { AccessError, digest, mac, validMac } from './access.ts';
import type { Actor } from './access.ts';
import { JourneyStore } from './journeys.ts';
import { seed } from './fixtures.ts';
export type Bindings = {
  DB: D1Database;
  FLINGS_SECRET?: string;
  FLINGS_MODE?: string;
  FLINGS_ORIGIN?: string;
};
const cookieName = (fling: string) => `flings_${fling}`;
const cookie = (req: Request, name: string) =>
  req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1) || '';
const local = (req: Request, env: Bindings) =>
  env.FLINGS_MODE === 'local' &&
  new URL(req.url).origin === env.FLINGS_ORIGIN &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(req.url).hostname);
const headers = {
  'Cache-Control': 'no-store, private',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie, Authorization',
};
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { ...headers, ...extra } });
}
function sameOrigin(req: Request) {
  if (req.headers.get('Origin') !== new URL(req.url).origin)
    throw new AccessError(403, 'Open this action from the Flings page.');
}
function encode(value: unknown) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function decode(value: string) {
  return JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
}
async function ticket(secret: string, value: unknown) {
  const data = encode(value);
  return data + '.' + (await mac(secret, data));
}
async function readTicket(secret: string, value: string) {
  const [data, signature, ...rest] = value.split('.');
  if (
    rest.length ||
    !data ||
    !signature ||
    !(await validMac(secret, data, signature))
  )
    throw new AccessError(401, 'Organizer access is unavailable.');
  const result = decode(data);
  if (result.expires <= Date.now())
    throw new AccessError(401, 'Organizer access is unavailable.');
  return result;
}
function setCookie(req: Request, name: string, value: string) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${35 * 86400}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function body(req: Request) {
  if (
    !req.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new AccessError(415, 'Use the Flings form.');
  const reader = req.body?.getReader();
  if (!reader) throw new AccessError(400, 'Enter valid form data.');
  let size = 0,
    text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new AccessError(413, 'This request is too large.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new AccessError(400, 'Enter valid form data.');
  }
}
export async function handle(req: Request, env: Bindings) {
  try {
    if (!env.FLINGS_SECRET || env.FLINGS_SECRET.length < 32)
      throw new AccessError(503, 'This Flings workspace is not configured.');
    if (new URL(req.url).protocol !== 'https:' && !local(req, env))
      throw new AccessError(403, 'Use a secure Flings address.');
    const store = new JourneyStore(env.DB, env.FLINGS_SECRET),
      parts = new URL(req.url).pathname
        .replace(/^\/api\/flings\//, '')
        .split('/'),
      [fling, action, member, sub] = parts;
    if (fling === 'local') {
      if (!local(req, env) || req.method !== 'POST')
        throw new AccessError(403, 'Local rehearsal is unavailable here.');
      sameOrigin(req);
      if (req.headers.get('x-flings-local') !== '1')
        throw new AccessError(403, 'Open the local rehearsal page.');
      const input = await body(req);
      if (action === 'open') {
        const fixtures: Record<string, [string, string, string]> = {
          outing: ['outing', 'alex-outing', 'a'],
          wedding: ['wedding', 'jordan-wedding', 'a'],
          concerts: ['concerts', 'alex-concerts', 'c'],
        };
        const choice = fixtures[input.example];
        if (!choice) throw new AccessError(400, 'Choose a rehearsal.');
        await seed(store);
        const [f, m, o] = choice;
        const link = await store.issue({ kind: 'organizer', id: o }, f, m);
        return json({ url: `/f/${f}/member#code=${link.code}` });
      }
      if (action === 'organizer') {
        if (!['a', 'b', 'c'].includes(input.organizer))
          throw new AccessError(400, 'Choose a fictional organizer.');
        await seed(store);
        const value = await ticket(env.FLINGS_SECRET, {
          role: 'organizer',
          id: input.organizer,
          expires: Date.now() + 3600000,
        });
        return json({ csrf: await mac(env.FLINGS_SECRET, value) }, 200, {
          'Set-Cookie': setCookie(req, 'flings_organizer', value),
        });
      }
      throw new AccessError(404, 'Page not found.');
    }
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(fling))
      throw new AccessError(400, 'Invalid fling.');
    if (action === 'exchange' && req.method === 'POST') {
      sameOrigin(req);
      if (req.headers.get('x-flings-exchange') !== '1')
        throw new AccessError(403, 'Open your member link.');
      const client =
        req.headers.get('cf-connecting-ip') ||
        (local(req, env) ? 'local' : null);
      if (!client) throw new AccessError(503, 'Member entry is unavailable.');
      const bucket = Math.floor(Date.now() / 60000),
        key = await digest(client + ':' + fling);
      const result = await store
        .q(
          'INSERT INTO attempts(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN bucket=excluded.bucket THEN count+1 ELSE 1 END,bucket=excluded.bucket RETURNING count',
          key,
          bucket,
        )
        .first<{ count: number }>();
      if (result!.count > 20)
        throw new AccessError(
          429,
          'Please wait a minute before trying another link.',
        );
      const input = await body(req);
      if (
        typeof input.code !== 'string' ||
        !/^[a-zA-Z0-9_-]{43}$/.test(input.code)
      )
        throw new AccessError(
          401,
          'This member link is unavailable. Ask an organizer for a recent link.',
        );
      const session = await store.exchange(fling, input.code);
      return json(
        {
          member: session.member,
          csrf: await mac(env.FLINGS_SECRET, session.token),
        },
        200,
        { 'Set-Cookie': setCookie(req, cookieName(fling), session.token) },
      );
    }
    let actor: Actor;
    let credential = '';
    const preview = req.headers.get('Authorization');
    if (preview) {
      const t = await readTicket(
        env.FLINGS_SECRET,
        preview.replace(/^Bearer /, ''),
      );
      if (t.role !== 'preview' || t.fling !== fling || !local(req, env))
        throw new AccessError(403, 'Member preview is unavailable.');
      actor = { kind: 'preview', id: t.id, member: t.member };
      credential = preview;
    } else if (action === 'organizer') {
      if (!local(req, env))
        throw new AccessError(
          503,
          'Organizer sign-in has not been configured.',
        );
      credential = cookie(req, 'flings_organizer');
      const t = await readTicket(env.FLINGS_SECRET, credential);
      if (t.role !== 'organizer')
        throw new AccessError(403, 'Organizer access is required.');
      if (
        req.headers.has('x-flings-organizer') &&
        req.headers.get('x-flings-organizer') !== t.id
      )
        throw new AccessError(409, 'Organizer changed. Reopen your workspace.');
      actor = { kind: 'organizer', id: t.id };
    } else {
      credential = cookie(req, cookieName(fling));
      const hash = await digest(credential);
      const expected =
        action === 'session' ? await store.currentMember(fling, hash) : member;
      if (!expected) throw new AccessError(401, 'Open your member page.');
      actor = { kind: 'member', digest: hash, member: expected };
    }
    if (req.method !== 'GET') {
      sameOrigin(req);
      if (actor.kind === 'preview')
        throw new AccessError(403, 'Member preview is read-only.');
      if (
        !(await validMac(
          env.FLINGS_SECRET,
          credential,
          req.headers.get('x-flings-csrf') || '',
        ))
      )
        throw new AccessError(403, 'Reload this page before saving.');
    }
    if (action === 'session' && req.method === 'GET')
      return json({
        member: actor.kind === 'member' ? actor.member : null,
        csrf: await mac(env.FLINGS_SECRET, credential),
      });
    if (fling === 'workspace' && action === 'organizer' && req.method === 'GET')
      return json({
        organizer: actor.kind === 'organizer' ? actor.id : null,
        csrf: await mac(env.FLINGS_SECRET, credential),
        flings: await store.assigned(actor),
      });
    if (action === 'member' && member) {
      if (sub === 'respond' && req.method === 'POST') {
        const input = await body(req);
        await store.respond(actor, fling, member, input);
        return json(await store.projection(actor, fling, member));
      }
      if (req.method === 'GET')
        return json(await store.projection(actor, fling, member));
      if (req.method === 'PUT') {
        const input = await body(req);
        if (!Number.isInteger(input.revision))
          throw new AccessError(400, 'Reload this profile.');
        return json(
          await store.updateProfile(
            actor,
            fling,
            member,
            input,
            input.revision,
          ),
        );
      }
    }
    if (action === 'organizer') {
      await store.assertOrganizer(actor, fling);
      if (req.method === 'GET' && !member)
        return json({
          ...(await store.overview(actor, fling)),
          organizer: actor.kind === 'organizer' ? actor.id : null,
          csrf: await mac(env.FLINGS_SECRET, credential),
        });
      if (req.method === 'POST' && ['invitation', 'state'].includes(member)) {
        const input = await body(req);
        if (member === 'invitation') await store.invite(actor, fling, input);
        else await store.setState(actor, fling, input);
        return json({ ok: true });
      }
      if (sub === 'preview' && req.method === 'POST') {
        await store.projection(actor, fling, member);
        const token = await ticket(env.FLINGS_SECRET, {
          role: 'preview',
          id: (actor as { id: string }).id,
          fling,
          member,
          expires: Date.now() + 900000,
        });
        return json({ url: `/preview/${fling}/${member}#preview=${token}` });
      }
      if (req.method === 'POST') {
        const input = await body(req);
        if (member === 'assignments') {
          if (input.confirm !== true)
            throw new AccessError(400, 'Confirm organizer change.');
          if (sub === 'remove')
            await store.removeOrganizer(actor, fling, String(input.organizer));
          else
            await store.assignOrganizer(actor, fling, String(input.organizer));
          return json({ ok: true });
        }
        if (member === 'members')
          return json(await store.createMember(actor, fling, input), 201);
        if (sub === 'issue')
          return json(await store.issue(actor, fling, member));
        if (sub === 'replace') {
          if (input.confirm !== true)
            throw new AccessError(400, 'Confirm replacement.');
          return json(await store.issue(actor, fling, member, true));
        }
        if (sub === 'revoke') {
          await store.revoke(actor, fling, member, String(input.codeId));
          return json({ ok: true });
        }
        if (sub === 'remove') {
          if (input.confirm !== true)
            throw new AccessError(400, 'Confirm removal.');
          await store.removeMember(actor, fling, member);
          return json({ ok: true });
        }
      }
      if (req.method === 'PUT' && member) {
        const input = await body(req);
        return json(
          await store.updateProfile(
            actor,
            fling,
            member,
            input,
            input.revision,
          ),
        );
      }
    }
    throw new AccessError(404, 'Page not found.');
  } catch (error) {
    return error instanceof AccessError
      ? json({ error: error.message }, error.status)
      : json({ error: 'This request could not be completed.' }, 500);
  }
}
