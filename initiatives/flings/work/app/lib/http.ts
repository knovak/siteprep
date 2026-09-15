import { AccessError, digest, mac, validMac } from './access.ts';
import type { Actor } from './access.ts';
import { RecoveryRestoreStore as MessageStore } from './recovery-restore.ts';
import { EXPORT_MAX_BYTES } from './recovery-export.ts';
import { seed } from './fixtures.ts';
import {
  nativeMode,
  nativeViewer,
  nativeOrganizer,
} from './native-identity.ts';
export type Bindings = {
  DB: D1Database;
  FLINGS_SECRET?: string;
  FLINGS_MODE?: string;
  FLINGS_ORIGIN?: string;
  FLINGS_ORGANIZERS?: string;
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
// Private Sites inject this identity after their access gate. Never expose this
// rehearsal Worker through a proxy that accepts caller-supplied identity headers.
const testViewer = (req: Request, env: Bindings) =>
  env.FLINGS_MODE === 'private-test' &&
  new URL(req.url).protocol === 'https:' &&
  new URL(req.url).origin === env.FLINGS_ORIGIN
    ? req.headers.get('oai-authenticated-user-id')?.trim() || ''
    : '';
const rehearsal = (req: Request, env: Bindings) =>
  local(req, env) || !!testViewer(req, env);
const headers = {
  'Cache-Control': 'no-store, private',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie, Authorization, oai-authenticated-user-id, oai-authenticated-user-email',
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
async function body(req: Request, limit = 16384) {
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
  const decoder = new TextDecoder('utf-8', { fatal: limit > 16384 });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AccessError(413, 'This request is too large.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(400, 'Enter valid UTF-8 JSON.');
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
    if (nativeMode(env) && new URL(req.url).origin !== env.FLINGS_ORIGIN)
      throw new AccessError(403, 'Open the configured Flings address.');
    const viewer = nativeMode(env)
      ? nativeViewer(req, env)?.subject || ''
      : testViewer(req, env);
    if (env.FLINGS_MODE === 'private-test' && !viewer)
      throw new AccessError(401, 'Sign in to this private Flings test Site.');
    const store = new MessageStore(env.DB, env.FLINGS_SECRET),
      parts = new URL(req.url).pathname
        .replace(/^\/api\/flings\//, '')
        .split('/'),
      [fling, action, member, sub] = parts;
    if (fling === 'native' && action === 'status' && req.method === 'GET') {
      const identity = nativeViewer(req, env);
      return json({
        native: nativeMode(env),
        rehearsal: rehearsal(req, env),
        signedIn: !!identity,
        email: identity?.email || '',
      });
    }
    if (fling === 'native' && action === 'open' && req.method === 'POST') {
      if (!nativeMode(env))
        throw new AccessError(
          403,
          'ChatGPT organizer sign-in is unavailable here.',
        );
      sameOrigin(req);
      if (req.headers.get('x-flings-native') !== '1')
        throw new AccessError(403, 'Open your organizer workspace.');
      await body(req);
      const identity = await nativeOrganizer(req, env, env.DB, true);
      return json({ organizer: identity.id });
    }
    if (fling === 'local') {
      if (!rehearsal(req, env) || req.method !== 'POST')
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
          viewer: viewer || null,
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
      if (
        t.role !== 'preview' ||
        t.fling !== fling ||
        !(rehearsal(req, env) || nativeMode(env)) ||
        (nativeMode(env) && t.mode !== 'chatgpt') ||
        (viewer && t.viewer !== viewer)
      )
        throw new AccessError(403, 'Member preview is unavailable.');
      if (nativeMode(env)) {
        const identity = await nativeOrganizer(req, env, env.DB);
        if (identity.id !== t.id || identity.viewer !== t.viewer)
          throw new AccessError(403, 'Member preview is unavailable.');
      }
      actor = { kind: 'preview', id: t.id, member: t.member };
      credential = preview;
    } else if (action === 'organizer' && nativeMode(env)) {
      const identity = await nativeOrganizer(req, env, env.DB);
      if (
        req.headers.has('x-flings-organizer') &&
        req.headers.get('x-flings-organizer') !== identity.id
      )
        throw new AccessError(409, 'Organizer changed. Reopen your workspace.');
      actor = { kind: 'organizer', id: identity.id };
      credential = identity.credential;
    } else if (action === 'organizer') {
      if (!rehearsal(req, env))
        throw new AccessError(
          503,
          'Organizer sign-in has not been configured.',
        );
      credential = cookie(req, 'flings_organizer');
      const t = await readTicket(env.FLINGS_SECRET, credential);
      if (t.role !== 'organizer')
        throw new AccessError(403, 'Organizer access is required.');
      if (viewer && t.viewer !== viewer)
        throw new AccessError(
          401,
          'Organizer sign-in changed. Choose your test organizer again.',
        );
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
    if (
      fling === 'workspace' &&
      action === 'organizer' &&
      req.method === 'GET'
    ) {
      const assigned = await store.assigned(actor);
      return json({
        organizer: actor.kind === 'organizer' ? actor.id : null,
        name: assigned.name,
        csrf: await mac(env.FLINGS_SECRET, credential),
        flings: assigned.flings,
      });
    }
    if (
      fling === 'workspace' &&
      action === 'organizer' &&
      req.method === 'POST'
    ) {
      const input = await body(req);
      if (member === 'profile')
        return json(await store.updateOrganizerProfile(actor, input));
      return json(await store.createFling(actor, input), 201);
    }
    if (
      action === 'organizer' &&
      member === 'audience' &&
      req.method === 'POST'
    )
      return json(await store.audience(actor, fling, await body(req)));
    if (
      action === 'organizer' &&
      member === 'recovery' &&
      sub === 'export' &&
      req.method === 'POST'
    )
      return json(await store.exportRecovery(actor, fling, await body(req)));
    if (
      action === 'organizer' &&
      member === 'recovery' &&
      sub === 'check' &&
      req.method === 'POST'
    ) {
      return json(
        await store.checkRecovery(
          actor,
          fling,
          await body(req, EXPORT_MAX_BYTES),
        ),
      );
    }
    if (
      action === 'organizer' &&
      member === 'recovery' &&
      sub === 'restore-preview' &&
      req.method === 'POST'
    )
      return json(
        await store.recoveryPreview(
          actor,
          fling,
          await body(req, EXPORT_MAX_BYTES),
        ),
      );
    if (
      action === 'organizer' &&
      member === 'recovery' &&
      req.method === 'POST'
    ) {
      if (sub === 'restore')
        return json(
          await store.restoreRecovery(
            actor,
            fling,
            await body(req, EXPORT_MAX_BYTES),
          ),
          201,
        );
      if (sub === 'delete')
        return json(await store.deleteRecovery(actor, fling, await body(req)));
    }
    if (action === 'organizer' && member === 'messages') {
      if (req.method === 'GET' && !sub)
        return json(await store.history(actor, fling));
      if (req.method === 'POST') {
        const input = await body(req);
        if (sub === 'retry-preview')
          return json(await store.previewRetry(actor, fling, input));
        if (sub === 'retry-export')
          return json(await store.exportRetry(actor, fling, input));
        if (sub === 'retry-recopy')
          return json(await store.recopyRetry(actor, fling, input));
        if (sub === 'prepare') {
          if (
            !env.FLINGS_ORIGIN ||
            new URL(req.url).origin !== env.FLINGS_ORIGIN
          )
            throw new AccessError(503, 'The message origin is not configured.');
          return json(
            await store.prepare(actor, fling, input, env.FLINGS_ORIGIN),
          );
        }
        if (sub === 'approve')
          return json(await store.approve(actor, fling, input));
        if (sub === 'export')
          return json(await store.exportPrompt(actor, fling, input));
        if (sub === 'results-preview')
          return json(await store.previewResults(actor, fling, input));
        if (sub === 'results-record')
          return json(await store.recordResults(actor, fling, input));
      }
      throw new AccessError(405, 'Use the message review form.');
    }
    const coordination =
      (action === 'organizer' && member === 'coordination') ||
      (action === 'member' && sub === 'coordination');
    if (coordination) {
      if (
        action === 'member' &&
        actor.kind === 'preview' &&
        actor.member !== member
      )
        throw new AccessError(403, 'Open the selected member preview.');
      if (action === 'organizer') await store.assertOrganizer(actor, fling);
      if (req.method === 'GET')
        return json(await store.coordination(actor, fling));
      if (req.method === 'POST') {
        const input = await body(req);
        const method = input.kind;
        if (method === 'post')
          return json(await store.post(actor, fling, input));
        if (method === 'poll')
          return json(await store.poll(actor, fling, input));
        if (method === 'vote') {
          await store.vote(actor, fling, input);
          return json({ ok: true });
        }
        if (method === 'payment')
          return json(await store.payment(actor, fling, input));
        if (method === 'ledger')
          return json(
            await store.ledger(actor, fling, {
              ...input,
              kind: input.entry_kind,
            }),
          );
        throw new AccessError(400, 'Choose a coordination action.');
      }
      throw new AccessError(405, 'Use the coordination form.');
    }
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
      if (
        req.method === 'POST' &&
        ['title', 'settings', 'activity', 'event', 'order'].includes(member)
      )
        return json(await store.author(actor, fling, member, await body(req)));
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
          mode: nativeMode(env) ? 'chatgpt' : 'rehearsal',
          viewer: viewer || null,
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
