import { AccessError, AccessStore, type Actor } from './access.ts';
type Input = Record<string, unknown>;

export class JourneyStore extends AccessStore {
  async assigned(actor: Actor) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    return (
      await this.q(
        'SELECT f.id,f.title,f.state FROM flings f JOIN assignments a ON a.fling=f.id WHERE a.organizer=? ORDER BY f.title',
        actor.id,
      ).all()
    ).results;
  }
  async overview(actor: Actor, fling: string) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const r = await this.batch(actor, fling, [
      this.q('SELECT id,title,state,revision FROM flings WHERE id=?', fling),
      this.q(
        "SELECT id,name,email,phone,preference,revision FROM members WHERE fling=? AND state='active' ORDER BY name,id",
        fling,
      ),
      this.q(
        'SELECT id,title,summary,details,state FROM activities WHERE fling=? ORDER BY id',
        fling,
      ),
      this.q(
        'SELECT member,activity,state FROM invitations WHERE fling=?',
        fling,
      ),
      this.q(
        'SELECT id,activity,title,starts,zone,summary,details FROM events WHERE fling=? ORDER BY starts,id',
        fling,
      ),
    ]);
    return {
      fling: r[0].results[0],
      members: r[1].results,
      activities: r[2].results,
      invitations: r[3].results,
      events: r[4].results,
    };
  }
  revisionGuard(fling: string, revision: unknown, open = true) {
    if (!Number.isSafeInteger(revision) || Number(revision) < 0)
      throw new AccessError(400, 'Reload this gathering before saving.');
    const id = crypto.randomUUID();
    return {
      id,
      statement: this.guard(
        id,
        `EXISTS(SELECT 1 FROM flings WHERE id=? AND revision=? ${open ? "AND state='open'" : ''})`,
        [fling, revision],
      ),
    };
  }
  async setState(actor: Actor, fling: string, input: Input) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    if (
      input.confirm !== true ||
      !['open', 'closed'].includes(String(input.state))
    )
      throw new AccessError(400, 'Confirm closing or reopening this fling.');
    const g = this.revisionGuard(fling, input.revision, false);
    await this.batch(
      actor,
      fling,
      [
        g.statement,
        this.q(
          'UPDATE flings SET state=?,revision=revision+1 WHERE id=?',
          input.state,
          fling,
        ),
        this.audit(
          actor,
          fling,
          input.state === 'closed' ? 'close-fling' : 'reopen-fling',
          fling,
        ),
        this.q('DELETE FROM guards WHERE id=?', g.id),
      ],
      true,
    );
  }
  async invite(actor: Actor, fling: string, input: Input) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    if (
      !['invited', 'withdrawn'].includes(String(input.state)) ||
      typeof input.member !== 'string' ||
      typeof input.activity !== 'string'
    )
      throw new AccessError(
        400,
        'Choose a member, activity and invitation action.',
      );
    const g = this.revisionGuard(fling, input.revision),
      child = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        g.statement,
        this.guard(
          child,
          "EXISTS(SELECT 1 FROM members WHERE id=? AND fling=? AND state='active') AND EXISTS(SELECT 1 FROM activities WHERE id=? AND fling=? AND state='published')",
          [input.member, fling, input.activity, fling],
        ),
        // Reinviting an accepted/declined member does not overwrite their response.
        this.q(
          "INSERT INTO invitations(member,activity,fling,state) VALUES(?,?,?,?) ON CONFLICT(member,activity) DO UPDATE SET state=CASE WHEN excluded.state='withdrawn' OR invitations.state='withdrawn' THEN excluded.state ELSE invitations.state END",
          input.member,
          input.activity,
          fling,
          input.state,
        ),
        this.q('UPDATE flings SET revision=revision+1 WHERE id=?', fling),
        this.audit(
          actor,
          fling,
          input.state === 'withdrawn' ? 'withdraw-invitation' : 'invite-member',
          input.activity + ':' + input.member,
        ),
        this.q('DELETE FROM guards WHERE id IN (?,?)', g.id, child),
      ],
      true,
    );
  }
  async respond(actor: Actor, fling: string, member: string, input: Input) {
    if (actor.kind !== 'member' || actor.member !== member)
      throw new AccessError(403, 'Respond from your own member page.');
    if (
      !['accepted', 'declined'].includes(String(input.state)) ||
      typeof input.activity !== 'string'
    )
      throw new AccessError(400, 'Choose accept or decline.');
    const g = this.revisionGuard(fling, input.revision),
      child = crypto.randomUUID();
    await this.batch(
      actor,
      fling,
      [
        g.statement,
        this.guard(
          child,
          "EXISTS(SELECT 1 FROM invitations i JOIN activities a ON a.id=i.activity AND a.fling=i.fling WHERE i.member=? AND i.fling=? AND i.activity=? AND i.state!='withdrawn' AND a.state='published')",
          [member, fling, input.activity],
        ),
        this.q(
          'UPDATE invitations SET state=? WHERE member=? AND activity=? AND fling=?',
          input.state,
          member,
          input.activity,
          fling,
        ),
        this.q('UPDATE flings SET revision=revision+1 WHERE id=?', fling),
        this.audit(actor, fling, 'respond-' + input.state, input.activity),
        this.q('DELETE FROM guards WHERE id IN (?,?)', g.id, child),
      ],
      true,
    );
  }
}
