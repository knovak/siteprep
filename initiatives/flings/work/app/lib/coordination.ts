import { AccessError, type Actor } from './access.ts';
import { JourneyStore } from './journeys.ts';
type Row = Record<string, unknown>;
export const safeText = (value: unknown, required = true) => {
  if (
    typeof value !== 'string' ||
    value.length > 4000 ||
    (required && !value.trim())
  )
    throw new AccessError(400, 'Enter text up to 4,000 characters.');
  let decoded = value;
  for (let i = 0; i < 2; i++) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
  }
  if (/#(?:code|preview)=|\/f\/[^\s]+\/member|\/preview\//i.test(decoded))
    throw new AccessError(
      400,
      'Keep personal access links out of shared text and payment notes.',
    );
  return value.trim();
};
export const safeLink = (value: unknown) => {
  const text = safeText(value ?? '', false);
  if (!text) return '';
  try {
    const url = new URL(text);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.href;
  } catch {
    throw new AccessError(
      400,
      'Enter an http or https link without credentials.',
    );
  }
};
const actorId = (actor: Actor) =>
  actor.kind === 'member' ? actor.member : actor.id;
const organizer = (actor: Actor) => {
  if (actor.kind !== 'organizer')
    throw new AccessError(403, 'Organizer access is required.');
};
const amount = (value: unknown, signed = false) => {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) === 0 ||
    Math.abs(Number(value)) > 1000000000 ||
    (!signed && Number(value) < 0)
  )
    throw new AccessError(
      400,
      'Enter a whole number of minor currency units from 1 to 1,000,000,000.',
    );
  return Number(value);
};
export class CoordinationStore extends JourneyStore {
  async mutate(
    actor: Actor,
    fling: string,
    input: Row,
    action: string,
    object: string,
    steps: D1PreparedStatement[],
  ) {
    const g = this.revisionGuard(fling, input.revision);
    await this.batch(
      actor,
      fling,
      [
        g.statement,
        ...steps,
        this.q('UPDATE flings SET revision=revision+1 WHERE id=?', fling),
        this.audit(actor, fling, action, object),
        this.q('DELETE FROM guards WHERE id=?', g.id),
      ],
      true,
    );
  }
  condition(sql: string, args: unknown[]) {
    const id = crypto.randomUUID();
    return [
      this.guard(id, sql, args),
      this.q('DELETE FROM guards WHERE id=?', id),
    ];
  }
  scope(
    actor: Actor,
    fling: string,
    activity: unknown,
    event: unknown,
  ): D1PreparedStatement[] {
    if (
      (activity !== null && typeof activity !== 'string') ||
      (event !== null && typeof event !== 'string') ||
      (event && !activity)
    )
      throw new AccessError(400, 'Choose a discussion in this fling.');
    const steps: D1PreparedStatement[] = [];
    if (activity)
      steps.push(
        ...this.condition(
          `EXISTS(SELECT 1 FROM activities WHERE id=? AND fling=? ${actor.kind === 'organizer' ? '' : "AND state='published'"})`,
          [activity, fling],
        ),
      );
    if (event)
      steps.push(
        ...this.condition(
          'EXISTS(SELECT 1 FROM events WHERE id=? AND activity=? AND fling=?)',
          [event, activity, fling],
        ),
      );
    if (actor.kind !== 'organizer') {
      const member = actor.member;
      steps.push(
        ...this.condition(
          "EXISTS(SELECT 1 FROM members WHERE id=? AND fling=? AND state='active')",
          [member, fling],
        ),
      );
      if (activity)
        steps.push(
          ...this.condition(
            "EXISTS(SELECT 1 FROM invitations WHERE member=? AND activity=? AND fling=? AND state='accepted')",
            [member, activity, fling],
          ),
        );
    }
    return steps;
  }
  async coordination(actor: Actor, fling: string) {
    // All reads share the same authority-checked transaction and therefore one revision.
    const member = actor.kind === 'organizer' ? null : actor.member;
    const r = await this.batch(actor, fling, [
      ...this.scope(actor, fling, null, null),
      this.q('SELECT revision,state FROM flings WHERE id=?', fling),
      this.q('SELECT id,title,state FROM activities WHERE fling=?', fling),
      this.q('SELECT id,activity,title FROM events WHERE fling=?', fling),
      this.q(
        'SELECT member,activity,state,generation FROM invitations WHERE fling=?',
        fling,
      ),
      this.q('SELECT * FROM posts WHERE fling=? ORDER BY created,id', fling),
      this.q(
        'SELECT h.* FROM post_history h JOIN posts p ON p.id=h.post WHERE p.fling=? ORDER BY h.at,h.id',
        fling,
      ),
      this.q('SELECT * FROM polls WHERE fling=? ORDER BY created,id', fling),
      this.q('SELECT * FROM poll_audience WHERE fling=?', fling),
      this.q(
        'SELECT v.*,m.name,m.state AS member_state FROM votes v JOIN members m ON m.id=v.member WHERE v.fling=? ORDER BY v.revision DESC',
        fling,
      ),
      this.q(
        'SELECT p.*,m.name FROM payment_requests p JOIN members m ON m.id=p.member WHERE p.fling=? ORDER BY p.at,p.id',
        fling,
      ),
      this.q(
        'SELECT l.* FROM payment_ledger l JOIN payment_requests p ON p.id=l.request WHERE p.fling=? ORDER BY l.at,l.id',
        fling,
      ),
    ]);
    // scope() contributes guards only for a member/preview; strip those empty results.
    const data = r.slice(-11).map((x) => x.results as Row[]);
    const [
      flings,
      activities,
      events,
      invitations,
      posts,
      history,
      polls,
      audience,
      votes,
      requests,
      ledger,
    ] = data;
    const allowed = (activity: unknown) =>
      !member ||
      !activity ||
      (activities.some((a) => a.id === activity && a.state === 'published') &&
        invitations.some(
          (i) =>
            i.member === member &&
            i.activity === activity &&
            i.state === 'accepted',
        ));
    const permittedPolls = polls.filter(
      (p) =>
        allowed(p.activity) &&
        (!member ||
          audience.some((a) => a.poll === p.id && a.member === member)),
    );
    return {
      ...flings[0],
      posts: posts
        .filter((p) => allowed(p.activity))
        .map((p) => ({
          ...p,
          id: p.id,
          hidden: p.hidden,
          body: p.hidden && member ? '' : p.body,
          can_edit:
            actor.kind !== 'preview' &&
            !p.hidden &&
            p.actor === actorId(actor) &&
            p.actor_kind === actor.kind,
        })),
      post_history: member ? [] : history,
      polls: permittedPolls.map((p) => {
        const options = JSON.parse(String(p.options)) as string[];
        const all = votes.filter((v) => v.poll === p.id);
        const seen = new Set<unknown>();
        const current = all.filter((v) => {
          if (seen.has(v.member)) return false;
          seen.add(v.member);
          return (
            v.member_state === 'active' &&
            invitations.some(
              (i) =>
                i.member === v.member &&
                i.activity === p.activity &&
                i.state === 'accepted' &&
                i.generation === v.generation,
            )
          );
        });
        const closed =
          !!p.closed ||
          (p.deadline !== null && Number(p.deadline) <= this.clock());
        return {
          ...p,
          id: p.id,
          options,
          closed,
          audience: member
            ? undefined
            : audience.filter((a) => a.poll === p.id).map((a) => a.member),
          choices: member
            ? JSON.parse(
                (current.find((v) => v.member === member)?.choices as
                  | string
                  | undefined) ?? '[]',
              )
            : [],
          totals:
            !member || closed
              ? options.map(
                  (_, index) =>
                    current.filter((v) =>
                      (JSON.parse(String(v.choices)) as number[]).includes(
                        index,
                      ),
                    ).length,
                )
              : null,
          responses: member
            ? []
            : all.map((v) => ({
                ...v,
                choices: JSON.parse(String(v.choices)),
                current: current.includes(v),
              })),
        };
      }),
      payments: requests
        .filter((p) => !member || p.member === member)
        .map((p) => {
          const entries = ledger.filter((l) => l.request === p.id);
          return {
            ...p,
            entries,
            balance:
              Number(p.amount) +
              entries.reduce((sum, l) => sum + this.effect(l), 0),
          };
        }),
      // These contain titles and IDs only; hidden scopes never leave the server.
      scopes: [
        { activity: null, event: null, title: 'Whole fling' },
        ...activities
          .filter((a) => allowed(a.id))
          .map((a) => ({ activity: a.id, event: null, title: a.title })),
        ...events
          .filter((e) => allowed(e.activity))
          .map((e) => ({ activity: e.activity, event: e.id, title: e.title })),
      ],
    };
  }
  effect(entry: Row) {
    return ['confirm', 'waiver'].includes(String(entry.kind))
      ? -Number(entry.amount)
      : ['refund', 'correction'].includes(String(entry.kind))
        ? Number(entry.amount)
        : 0;
  }
  async post(actor: Actor, fling: string, input: Row) {
    const activity = input.activity ?? null,
      event = input.event ?? null;
    const id = typeof input.id === 'string' ? input.id : crypto.randomUUID();
    const steps = this.scope(actor, fling, activity, event);
    const hide = input.action === 'hide';
    if (hide) organizer(actor);
    const body = hide ? '' : safeText(input.body);
    if (input.id) {
      steps.push(
        ...this.condition(
          `EXISTS(SELECT 1 FROM posts WHERE id=? AND fling=? AND activity IS ? AND event IS ? AND hidden=0 ${hide ? '' : 'AND actor=? AND actor_kind=?'})`,
          [
            id,
            fling,
            activity,
            event,
            ...(hide ? [] : [actorId(actor), actor.kind]),
          ],
        ),
      );
      steps.push(
        this.q(
          'INSERT INTO post_history(id,post,actor,action,body,reason,at) SELECT ?,id,?,?,body,?,? FROM posts WHERE id=?',
          crypto.randomUUID(),
          actorId(actor),
          hide ? 'hide' : 'edit',
          hide ? safeText(input.reason) : '',
          this.clock(),
          id,
        ),
      );
      steps.push(
        hide
          ? this.q(
              'UPDATE posts SET hidden=1,revision=revision+1 WHERE id=?',
              id,
            )
          : this.q(
              'UPDATE posts SET body=?,edited=?,revision=revision+1 WHERE id=?',
              body,
              this.clock(),
              id,
            ),
      );
    } else {
      if (hide) throw new AccessError(400, 'Choose a post to hide.');
      const source = actor.kind === 'organizer' ? 'organizers' : 'members';
      steps.push(
        this.q(
          `INSERT INTO posts(id,fling,activity,event,actor,actor_kind,author,body,created) SELECT ?,?,?,?,?,?,name,?,? FROM ${source} WHERE id=?`,
          id,
          fling,
          activity,
          event,
          actorId(actor),
          actor.kind,
          body,
          this.clock(),
          actorId(actor),
        ),
      );
    }
    await this.mutate(
      actor,
      fling,
      input,
      hide ? 'hide-post' : input.id ? 'edit-post' : 'create-post',
      id,
      steps,
    );
    return { id };
  }
  async poll(actor: Actor, fling: string, input: Row) {
    organizer(actor);
    const id = crypto.randomUUID(),
      event = String(input.event),
      activity = String(input.activity);
    if (input.action === 'close') {
      const target = String(input.id);
      await this.mutate(actor, fling, input, 'close-poll', target, [
        ...this.condition(
          'EXISTS(SELECT 1 FROM polls WHERE id=? AND fling=?)',
          [target, fling],
        ),
        this.q('UPDATE polls SET closed=1 WHERE id=?', target),
      ]);
      return { id: target };
    }
    if (
      !Array.isArray(input.options) ||
      input.options.length < 2 ||
      input.options.length > 20 ||
      typeof input.multiple !== 'boolean'
    )
      throw new AccessError(
        400,
        'Supply 2–20 choices and choose single or multiple selection.',
      );
    const options = input.options.map((x) => safeText(x));
    if (
      new Set(options).size !== options.length ||
      options.some((x) => x.length > 200)
    )
      throw new AccessError(
        400,
        'Use different choices, each up to 200 characters.',
      );
    if (
      !Array.isArray(input.members) ||
      !input.members.length ||
      input.members.length > 100 ||
      input.members.some((x) => typeof x !== 'string') ||
      new Set(input.members).size !== input.members.length
    )
      throw new AccessError(400, 'Select 1–100 accepted members once each.');
    const deadline = input.deadline ?? null;
    if (
      deadline !== null &&
      (!Number.isSafeInteger(deadline) || Number(deadline) <= this.clock())
    )
      throw new AccessError(400, 'Choose a future deadline or leave it blank.');
    const steps = this.scope(actor, fling, activity, event);
    steps.push(
      ...this.condition(
        "EXISTS(SELECT 1 FROM activities WHERE id=? AND fling=? AND state='published')",
        [activity, fling],
      ),
    );
    for (const member of input.members)
      steps.push(
        ...this.condition(
          "EXISTS(SELECT 1 FROM invitations i JOIN members m ON m.id=i.member WHERE i.member=? AND i.fling=? AND i.activity=? AND i.state='accepted' AND m.state='active')",
          [member, fling, activity],
        ),
      );
    // A replacement always preserves its predecessor, even before its first vote.
    if (input.replaces)
      steps.push(
        ...this.condition(
          'EXISTS(SELECT 1 FROM polls WHERE id=? AND fling=? AND event=? AND activity=?)',
          [input.replaces, fling, event, activity],
        ),
        this.q('UPDATE polls SET closed=1 WHERE id=?', input.replaces),
      );
    steps.push(
      this.q(
        'INSERT INTO polls(id,fling,activity,event,title,options,multiple,deadline,replaces,created) VALUES(?,?,?,?,?,?,?,?,?,?)',
        id,
        fling,
        activity,
        event,
        safeText(input.title),
        JSON.stringify(options),
        input.multiple ? 1 : 0,
        deadline,
        input.replaces ?? null,
        this.clock(),
      ),
    );
    for (const member of input.members)
      steps.push(
        this.q(
          'INSERT INTO poll_audience(poll,fling,member) VALUES(?,?,?)',
          id,
          fling,
          member,
        ),
      );
    await this.mutate(actor, fling, input, 'create-poll', id, steps);
    return { id };
  }
  async vote(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'member')
      throw new AccessError(403, 'Vote from your own member page.');
    // The later fling revision guard rejects changes between this lookup and write.
    const p = await this.q(
      'SELECT * FROM polls WHERE id=? AND fling=?',
      input.poll,
      fling,
    ).first<Row>();
    if (!p) throw new AccessError(404, 'Poll unavailable.');
    const options = JSON.parse(String(p.options)) as string[];
    if (
      !Array.isArray(input.choices) ||
      (!p.multiple && input.choices.length > 1) ||
      input.choices.some(
        (x) => !Number.isInteger(x) || x < 0 || x >= options.length,
      ) ||
      new Set(input.choices).size !== input.choices.length
    )
      throw new AccessError(400, 'Choose valid poll options.');
    const steps = this.scope(actor, fling, p.activity, p.event);
    steps.push(
      ...this.condition(
        'EXISTS(SELECT 1 FROM polls p JOIN poll_audience a ON a.poll=p.id WHERE p.id=? AND p.fling=? AND a.member=? AND p.closed=0 AND (p.deadline IS NULL OR p.deadline>?))',
        [p.id, fling, actor.member, this.clock()],
      ),
    );
    steps.push(
      this.q(
        'INSERT INTO votes(id,poll,fling,member,choices,generation,revision,at) SELECT ?,?,?,?,?,generation,?,? FROM invitations WHERE member=? AND activity=? AND fling=?',
        crypto.randomUUID(),
        p.id,
        fling,
        actor.member,
        JSON.stringify(input.choices),
        input.revision,
        this.clock(),
        actor.member,
        p.activity,
        fling,
      ),
    );
    await this.mutate(actor, fling, input, 'vote', String(p.id), steps);
  }
  async payment(actor: Actor, fling: string, input: Row) {
    organizer(actor);
    const id = crypto.randomUUID(),
      event = String(input.event),
      activity = String(input.activity),
      member = String(input.member);
    const currency =
      typeof input.currency === 'string' ? input.currency.toUpperCase() : '';
    // The code labels explicitly entered minor units; no currency conversion occurs.
    if (!Intl.supportedValuesOf('currency').includes(currency))
      throw new AccessError(400, 'Enter a three-letter currency code.');
    const steps = this.scope(actor, fling, activity, event);
    steps.push(
      ...this.condition(
        "EXISTS(SELECT 1 FROM invitations i JOIN members m ON m.id=i.member JOIN activities a ON a.id=i.activity WHERE i.member=? AND i.fling=? AND i.activity=? AND i.state='accepted' AND m.state='active' AND a.state='published')",
        [member, fling, activity],
      ),
    );
    steps.push(
      this.q(
        'INSERT INTO payment_requests(id,fling,event,member,title,currency,amount,link,actor,at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        id,
        fling,
        event,
        member,
        safeText(input.title),
        currency,
        amount(input.amount),
        safeLink(input.link),
        actorId(actor),
        this.clock(),
      ),
    );
    await this.mutate(actor, fling, input, 'request-payment', id, steps);
    return { id };
  }
  async ledger(actor: Actor, fling: string, input: Row) {
    const request = String(input.request),
      kind = String(input.kind),
      value = amount(input.amount, kind === 'correction');
    if (!['report', 'confirm', 'correction', 'waiver', 'refund'].includes(kind))
      throw new AccessError(400, 'Choose a ledger action.');
    if (kind === 'report') {
      if (actor.kind !== 'member')
        throw new AccessError(
          403,
          'Report an outside payment from your own page.',
        );
    } else organizer(actor);
    const note = safeText(input.note ?? '', kind !== 'report');
    const steps = this.condition(
      `EXISTS(SELECT 1 FROM payment_requests WHERE id=? AND fling=? ${kind === 'report' ? 'AND member=?' : ''})`,
      [request, fling, ...(kind === 'report' ? [actorId(actor)] : [])],
    );
    if (kind === 'confirm')
      steps.push(
        ...this.condition(
          "EXISTS(SELECT 1 FROM payment_ledger r WHERE r.id=? AND r.request=? AND r.kind='report' AND r.amount >= ? + (SELECT COALESCE(SUM(c.amount),0) FROM payment_ledger c WHERE c.report=r.id AND c.kind='confirm'))",
          [input.report ?? null, request, value],
        ),
      );
    // Refunds return recorded confirmed money; correction is the separate way to repair a claim.
    if (kind === 'refund')
      steps.push(
        ...this.condition(
          "(SELECT COALESCE(SUM(CASE WHEN kind='confirm' THEN amount WHEN kind='refund' THEN -amount ELSE 0 END),0) FROM payment_ledger WHERE request=?)>=?",
          [request, value],
        ),
      );
    const delta = this.effect({ kind, amount: value });
    steps.push(
      ...this.condition(
        "(SELECT amount FROM payment_requests WHERE id=?) + (SELECT COALESCE(SUM(CASE WHEN kind IN ('confirm','waiver') THEN -amount WHEN kind IN ('refund','correction') THEN amount ELSE 0 END),0) FROM payment_ledger WHERE request=?) + ? BETWEEN 0 AND 1000000000",
        [request, request, delta],
      ),
    );
    const id = crypto.randomUUID(),
      source = actor.kind === 'member' ? 'members' : 'organizers';
    steps.push(
      this.q(
        `INSERT INTO payment_ledger(id,request,kind,amount,report,note,actor,author,at) SELECT ?,?,?,?,?,?,?,name,? FROM ${source} WHERE id=?`,
        id,
        request,
        kind,
        value,
        kind === 'confirm' ? input.report : null,
        note,
        actorId(actor),
        this.clock(),
        actorId(actor),
      ),
    );
    await this.mutate(actor, fling, input, 'payment-' + kind, request, steps);
    return { id };
  }
}
