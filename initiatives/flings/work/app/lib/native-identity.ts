import { AccessError, digest } from './access.ts';

type NativeEnv = {
  FLINGS_MODE?: string;
  FLINGS_ORIGIN?: string;
  FLINGS_ORGANIZERS?: string;
};
type Allowed = { email: string; name: string };

export function nativeMode(env: NativeEnv) {
  return env.FLINGS_MODE === 'chatgpt';
}
export function nativeViewer(req: Request, env: NativeEnv) {
  if (
    !nativeMode(env) ||
    new URL(req.url).protocol !== 'https:' ||
    new URL(req.url).origin !== env.FLINGS_ORIGIN
  )
    return null;
  const subject = req.headers.get('oai-authenticated-user-id')?.trim();
  const email = req.headers
    .get('oai-authenticated-user-email')
    ?.trim()
    .toLowerCase();
  if (!subject || subject.length > 512 || !email || email.length > 254)
    return null;
  return { subject: 'chatgpt:' + subject, email };
}
function allowlist(env: NativeEnv): Allowed[] {
  try {
    const list: unknown = JSON.parse(env.FLINGS_ORGANIZERS || '');
    if (!Array.isArray(list) || !list.length || list.length > 20)
      throw new Error();
    const emails = new Set<string>();
    return list.map((entry) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        Array.isArray(entry) ||
        Object.keys(entry).some((key) => !['email', 'name'].includes(key)) ||
        typeof entry.email !== 'string' ||
        typeof entry.name !== 'string'
      )
        throw new Error();
      const email = entry.email.trim().toLowerCase(),
        name = entry.name.trim();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        !name ||
        name.length > 100 ||
        emails.has(email)
      )
        throw new Error();
      emails.add(email);
      return { email, name };
    });
  } catch {
    throw new AccessError(503, 'Organizer sign-in has not been configured.');
  }
}
// These headers are trusted only behind the Sites dispatcher at the configured
// HTTPS origin. Never put this Worker behind a header-preserving public proxy.
// The approved email is an enrollment allowlist, never a member/profile match.
// First explicit enrollment pins the immutable, Site-scoped platform subject.
export async function nativeOrganizer(
  req: Request,
  env: NativeEnv,
  db: D1Database,
  enroll = false,
) {
  const viewer = nativeViewer(req, env);
  if (!viewer)
    throw new AccessError(
      401,
      'Sign in with ChatGPT to open your organizer workspace.',
    );
  const entry = allowlist(env).find((item) => item.email === viewer.email);
  if (!entry)
    throw new AccessError(
      403,
      'This ChatGPT account is not an authorized organizer.',
    );
  const id = 'native-' + (await digest(entry.email)).slice(0, 40);
  if (enroll) {
    await db
      .prepare(
        'INSERT OR IGNORE INTO organizers(id,subject,name) VALUES(?,?,?)',
      )
      .bind(id, viewer.subject, entry.name)
      .run();
  }
  const record = await db
    .prepare('SELECT id,subject FROM organizers WHERE id=?')
    .bind(id)
    .first<{ id: string; subject: string }>();
  if (!record)
    throw new AccessError(
      401,
      'Open your organizer workspace to finish sign-in.',
    );
  if (record.subject !== viewer.subject)
    throw new AccessError(
      403,
      'This organizer account needs its sign-in binding reviewed.',
    );
  return {
    id: record.id,
    viewer: viewer.subject,
    credential:
      'native:' +
      (await digest(viewer.subject + ':' + JSON.stringify(allowlist(env)))),
  };
}
