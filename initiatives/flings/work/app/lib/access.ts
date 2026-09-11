export const DAY = 86400000;
export class AccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export type Actor =
  | { kind: 'organizer'; id: string }
  | { kind: 'preview'; id: string; member: string }
  | { kind: 'member'; digest: string; member: string };
type Row = Record<string, unknown>;
const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const bytes = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0),
  );
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string) {
  return b64(
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))),
  );
}
export async function mac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))),
  );
}
export async function validMac(
  secret: string,
  value: string,
  signature: string,
) {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      bytes(signature),
      enc.encode(value),
    );
  } catch {
    return false;
  }
}
async function encryptionKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', enc.encode(secret)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}
async function encrypt(secret: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    enc.encode(value),
  );
  return b64(iv) + '.' + b64(new Uint8Array(data));
}
async function decrypt(secret: string, value: string) {
  const [iv, data] = value.split('.');
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(iv) },
      await encryptionKey(secret),
      bytes(data),
    ),
  );
}
export function profile(input: Row) {
  const field = (name: string) => {
    const value = input[name] ?? '';
    if (typeof value !== 'string')
      throw new AccessError(400, 'Profile fields must be text.');
    return value.trim();
  };
  const result = {
    name: field('name'),
    email: field('email'),
    phone: field('phone'),
    preference: field('preference'),
  };
  if (
    !result.name ||
    result.name.length > 100 ||
    result.email.length > 254 ||
    result.phone.length > 25 ||
    !['email', 'text', 'both'].includes(result.preference) ||
    (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) ||
    (result.phone && !/^\+[1-9][0-9]{7,14}$/.test(result.phone))
  )
    throw new AccessError(
      400,
      'Check the name, email, international phone number and preference.',
    );
  return result;
}
export function completeProfile(p: Row) {
  return (
    (p.preference === 'text' || !!p.email) &&
    (p.preference === 'email' || !!p.phone)
  );
}
export class AccessStore {
  db: D1Database;
  secret: string;
  clock: () => number;
  constructor(db: D1Database, secret: string, clock: () => number = Date.now) {
    if (secret.length < 32) throw new Error('Access secret is not configured');
    this.db = db;
    this.secret = secret;
    this.clock = clock;
  }
  q(sql: string, ...args: unknown[]) {
    return this.db.prepare(sql).bind(...args);
  }
  guard(id: string, sql: string, args: unknown[] = []) {
    return this.q(
      `INSERT INTO guards(id,ok) VALUES(?,CASE WHEN (${sql}) THEN 1 ELSE 0 END)`,
      id,
      ...args,
    );
  }
  authority(actor: Actor, fling: string, write = false): [string, unknown[]] {
    if (actor.kind === 'preview' && write)
      throw new AccessError(403, 'Member preview is read-only.');
    if (actor.kind === 'organizer' || actor.kind === 'preview')
      return [
        'EXISTS(SELECT 1 FROM assignments WHERE fling=? AND organizer=?)',
        [fling, actor.id],
      ];
    return [
      `EXISTS(SELECT 1 FROM sessions s JOIN members m ON m.id=s.member AND m.fling=s.fling JOIN codes c ON c.id=s.code WHERE s.digest=? AND s.fling=? AND s.member=? AND s.expires>? AND m.state='active' AND m.generation=s.generation AND c.revoked IS NULL)`,
      [actor.digest, fling, actor.member, this.clock()],
    ];
  }
  async batch(
    actor: Actor,
    fling: string,
    stmts: D1PreparedStatement[],
    write = false,
  ) {
    const id = crypto.randomUUID(),
      [sql, args] = this.authority(actor, fling, write);
    try {
      return (
        await this.db.batch([
          this.guard(id, sql, args),
          this.q(
            'UPDATE codes SET ciphertext=NULL WHERE fling=? AND (send_until<=? OR revoked IS NOT NULL)',
            fling,
            this.clock(),
          ),
          ...stmts,
          this.q('DELETE FROM guards WHERE id=?', id),
        ])
      ).slice(2, -1);
    } catch {
      throw new AccessError(
        409,
        'Access or the record changed. Reload and try again.',
      );
    }
  }
  async assertOrganizer(actor: Actor, fling: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    await this.batch(actor, fling, []);
  }
  audit(actor: Actor, fling: string, action: string, object: string) {
    return this.q(
      'INSERT INTO audit(id,fling,actor,action,object,at,revision) VALUES(?,?,?,?,?,?,(SELECT revision FROM members WHERE id=? AND fling=?))',
      crypto.randomUUID(),
      fling,
      actor.kind === 'member' ? actor.member : actor.id,
      action,
      object,
      this.clock(),
      object,
      fling,
    );
  }
  async issue(actor: Actor, fling: string, member: string, emergency = false) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const now = this.clock(),
      code = random(),
      id = crypto.randomUUID(),
      hash = await digest(code),
      sealed = await encrypt(this.secret, code),
      g = crypto.randomUUID();
    const steps = [
      this.guard(
        g,
        "EXISTS(SELECT 1 FROM members m JOIN flings f ON f.id=m.fling WHERE m.id=? AND m.fling=? AND m.state='active' AND f.state='open')",
        [member, fling],
      ),
    ];
    if (emergency)
      steps.push(
        this.q(
          'UPDATE codes SET revoked=?,ciphertext=NULL WHERE member=? AND fling=?',
          now,
          member,
          fling,
        ),
        this.q(
          'UPDATE members SET generation=generation+1,revision=revision+1 WHERE id=? AND fling=?',
          member,
          fling,
        ),
      );
    steps.push(
      this.q(
        'UPDATE codes SET ciphertext=NULL WHERE member=? AND (send_until<=? OR revoked IS NOT NULL)',
        member,
        now,
      ),
    );
    steps.push(
      this.q(
        `INSERT INTO codes(id,member,fling,digest,ciphertext,generation,issued,send_until,expires) SELECT ?,m.id,m.fling,?,?,m.generation,?,?,? FROM members m WHERE m.id=? AND m.fling=? AND NOT EXISTS(SELECT 1 FROM codes c WHERE c.member=m.id AND c.generation=m.generation AND c.revoked IS NULL AND c.send_until>?)`,
        id,
        hash,
        sealed,
        now,
        now + 14 * DAY,
        now + 35 * DAY,
        member,
        fling,
        now,
      ),
    );
    steps.push(
      this.q(
        `SELECT c.id,c.ciphertext,c.send_until,c.expires FROM codes c JOIN members m ON m.id=c.member WHERE c.member=? AND c.fling=? AND c.generation=m.generation AND c.revoked IS NULL AND c.send_until>? ORDER BY c.issued DESC LIMIT 1`,
        member,
        fling,
        now,
      ),
      this.audit(
        actor,
        fling,
        emergency ? 'replace-links' : 'prepare-link',
        member,
      ),
      this.q('DELETE FROM guards WHERE id=?', g),
    );
    const result = await this.batch(actor, fling, steps, true);
    const current = result.at(-3)!.results[0] as {
      id: string;
      ciphertext: string;
      send_until: number;
      expires: number;
    };
    return {
      id: current.id,
      code: await decrypt(this.secret, current.ciphertext),
      sendUntil: current.send_until,
      expires: current.expires,
    };
  }
  async exchange(fling: string, code: string) {
    const now = this.clock(),
      hash = await digest(code),
      token = random(),
      sessionHash = await digest(token),
      g = crypto.randomUUID();
    const condition = `EXISTS(SELECT 1 FROM codes c JOIN members m ON m.id=c.member AND m.fling=c.fling WHERE c.digest=? AND c.fling=? AND c.expires>? AND c.revoked IS NULL AND m.state='active' AND m.generation=c.generation)`;
    try {
      const results = await this.db.batch([
        this.guard(g, condition, [hash, fling, now]),
        this.q(
          'UPDATE codes SET first_used=COALESCE(first_used,?) WHERE digest=?',
          now,
          hash,
        ),
        this.q(
          'INSERT INTO sessions(digest,member,fling,code,generation,created,expires) SELECT ?,member,fling,id,generation,?,? FROM codes WHERE digest=?',
          sessionHash,
          now,
          now + 35 * DAY,
          hash,
        ),
        this.q(
          'SELECT member,expires FROM sessions WHERE digest=?',
          sessionHash,
        ),
        this.q('DELETE FROM guards WHERE id=?', g),
      ]);
      return {
        token,
        member: (results[3].results[0] as Row).member as string,
        expires: now + 35 * DAY,
      };
    } catch {
      throw new AccessError(
        401,
        'This member link is unavailable. Ask an organizer for a recent link.',
      );
    }
  }
  async currentMember(fling: string, sessionDigest: string) {
    const s = await this.q(
      `SELECT s.member FROM sessions s JOIN members m ON m.id=s.member JOIN codes c ON c.id=s.code WHERE s.digest=? AND s.fling=? AND s.expires>? AND m.state='active' AND m.generation=s.generation AND c.revoked IS NULL`,
      sessionDigest,
      fling,
      this.clock(),
    ).first<Row>();
    if (!s)
      throw new AccessError(
        401,
        'This member link is unavailable. Ask an organizer for a recent link.',
      );
    return String(s.member);
  }
  async projection(actor: Actor, fling: string, member: string) {
    if (
      (actor.kind === 'member' || actor.kind === 'preview') &&
      actor.member !== member
    )
      throw new AccessError(403, 'This page belongs to a different member.');
    const g = crypto.randomUUID();
    const results = await this.batch(actor, fling, [
      this.guard(
        g,
        "EXISTS(SELECT 1 FROM members WHERE id=? AND fling=? AND state='active')",
        [member, fling],
      ),
      this.q(
        'SELECT id,name,email,phone,preference,revision FROM members WHERE id=? AND fling=?',
        member,
        fling,
      ),
      this.q('SELECT id,title,state,revision FROM flings WHERE id=?', fling),
      this.q(
        `SELECT a.id,a.title,a.summary,a.state,i.state invitation,CASE WHEN i.state='accepted' AND a.state='published' THEN a.details ELSE NULL END details FROM activities a JOIN invitations i ON i.activity=a.id AND i.fling=a.fling WHERE i.member=? AND a.fling=? AND i.state!='withdrawn' AND a.state!='draft' ORDER BY a.id`,
        member,
        fling,
      ),
      this.q(
        `SELECT e.id,e.activity,e.title,e.starts,e.zone,e.summary,CASE WHEN i.state='accepted' AND a.state='published' THEN e.details ELSE NULL END details FROM events e JOIN activities a ON a.id=e.activity AND a.fling=e.fling JOIN invitations i ON i.activity=a.id AND i.fling=a.fling WHERE i.member=? AND e.fling=? AND i.state!='withdrawn' AND a.state!='draft' ORDER BY e.starts`,
        member,
        fling,
      ),
      this.q('DELETE FROM guards WHERE id=?', g),
    ]);
    const p = results[1].results[0] as {
      id: string;
      name: string;
      email: string;
      phone: string;
      preference: string;
      revision: number;
    };
    return {
      profile: { ...p, complete: completeProfile(p) } as Row & {
        complete: boolean;
      },
      fling: results[2].results[0],
      activities: results[3].results as Row[],
      events: results[4].results as Row[],
      preview: actor.kind === 'preview',
    };
  }
  async updateProfile(
    actor: Actor,
    fling: string,
    member: string,
    input: Row,
    revision: number,
  ) {
    if (!Number.isInteger(revision))
      throw new AccessError(400, 'Reload this profile.');
    if (actor.kind === 'preview')
      throw new AccessError(403, 'Member preview is read-only.');
    if (actor.kind === 'member' && actor.member !== member)
      throw new AccessError(403, 'This page belongs to a different member.');
    const p = profile(input),
      g = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        this.guard(
          g,
          "EXISTS(SELECT 1 FROM members WHERE id=? AND fling=? AND revision=? AND state='active')",
          [member, fling, revision],
        ),
        this.q(
          'UPDATE members SET name=?,email=?,phone=?,preference=?,revision=revision+1 WHERE id=? AND fling=?',
          p.name,
          p.email,
          p.phone,
          p.preference,
          member,
          fling,
        ),
        this.audit(actor, fling, 'edit-profile', member),
        this.q('DELETE FROM guards WHERE id=?', g),
      ],
      true,
    );
    return this.projection(actor, fling, member);
  }
  async revoke(actor: Actor, fling: string, member: string, codeId: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const g = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        this.guard(
          g,
          'EXISTS(SELECT 1 FROM codes WHERE id=? AND member=? AND fling=?)',
          [codeId, member, fling],
        ),
        this.q(
          'UPDATE codes SET revoked=?,ciphertext=NULL WHERE id=? AND member=? AND fling=?',
          this.clock(),
          codeId,
          member,
          fling,
        ),
        this.audit(actor, fling, 'revoke-link', codeId),
        this.q('DELETE FROM guards WHERE id=?', g),
      ],
      true,
    );
  }
  async removeMember(actor: Actor, fling: string, member: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const g = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        this.guard(g, 'EXISTS(SELECT 1 FROM members WHERE id=? AND fling=?)', [
          member,
          fling,
        ]),
        this.q(
          "UPDATE members SET state='removed',generation=generation+1,revision=revision+1 WHERE id=? AND fling=?",
          member,
          fling,
        ),
        this.q(
          'UPDATE codes SET revoked=?,ciphertext=NULL WHERE member=? AND fling=?',
          this.clock(),
          member,
          fling,
        ),
        this.audit(actor, fling, 'remove-member', member),
        this.q('DELETE FROM guards WHERE id=?', g),
      ],
      true,
    );
  }
  async removeOrganizer(actor: Actor, fling: string, organizer: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const g = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        this.guard(
          g,
          '(SELECT COUNT(*) FROM assignments WHERE fling=?)>1 AND EXISTS(SELECT 1 FROM assignments WHERE fling=? AND organizer=?)',
          [fling, fling, organizer],
        ),
        this.q(
          'DELETE FROM assignments WHERE fling=? AND organizer=?',
          fling,
          organizer,
        ),
        this.audit(actor, fling, 'remove-organizer', organizer),
        this.q('DELETE FROM guards WHERE id=?', g),
      ],
      true,
    );
  }
  async createMember(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const p = profile(input),
      id = crypto.randomUUID(),
      g = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        this.guard(
          g,
          "EXISTS(SELECT 1 FROM flings WHERE id=? AND state='open')",
          [fling],
        ),
        this.q(
          'INSERT INTO members(id,fling,name,email,phone,preference) VALUES(?,?,?,?,?,?)',
          id,
          fling,
          p.name,
          p.email,
          p.phone,
          p.preference,
        ),
        this.audit(actor, fling, 'create-member', id),
        this.q('DELETE FROM guards WHERE id=?', g),
      ],
      true,
    );
    return { id };
  }
  async assignOrganizer(actor: Actor, fling: string, organizer: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    await this.batch(
      actor,
      fling,
      [
        this.q(
          'INSERT INTO assignments(fling,organizer) VALUES(?,?)',
          fling,
          organizer,
        ),
        this.audit(actor, fling, 'assign-organizer', organizer),
      ],
      true,
    );
  }
}
