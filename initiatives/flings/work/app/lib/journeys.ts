import { AccessError, AccessStore, type Actor } from './access.ts';
import { resolveTime } from './event-time.ts';
type Input = Record<string, unknown>;

export class JourneyStore extends AccessStore {
  text(input: Input, key: string, required = false) {
    const value = input[key];
    if (
      typeof value !== 'string' ||
      value.length > 4000 ||
      (required && !value.trim())
    )
      throw new AccessError(
        400,
        'Enter a valid ' + key + ' (up to 4,000 characters).',
      );
    return value.trim();
  }
  async createFling(actor: Actor, input: Input) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const title = this.text(input, 'title', true),
      id = crypto.randomUUID(),
      guard = crypto.randomUUID();
    try {
      await this.db.batch([
        this.guard(guard, 'EXISTS(SELECT 1 FROM organizers WHERE id=?)', [
          actor.id,
        ]),
        this.q('INSERT INTO flings(id,title) VALUES(?,?)', id, title),
        this.q(
          'INSERT INTO assignments(fling,organizer) VALUES(?,?)',
          id,
          actor.id,
        ),
        this.audit(actor, id, 'create-fling', id),
        this.q('DELETE FROM guards WHERE id=?', guard),
      ]);
    } catch {
      throw new AccessError(
        409,
        'Organizer access changed. Reopen your workspace.',
      );
    }
    return { id };
  }
  async author(actor: Actor, fling: string, kind: string, input: Input) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const g = this.revisionGuard(fling, input.revision),
      child = crypto.randomUUID();
    const steps: D1PreparedStatement[] = [g.statement];
    let object = fling;
    if (kind === 'title') {
      steps.push(
        this.q(
          'UPDATE flings SET title=? WHERE id=?',
          this.text(input, 'title', true),
          fling,
        ),
      );
    } else if (kind === 'settings') {
      const zone = this.text(input, 'default_zone', true);
      try {
        new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
      } catch {
        throw new AccessError(400, 'Enter an IANA time zone.');
      }
      steps.push(
        this.q(
          'UPDATE flings SET title=?,description=?,default_zone=? WHERE id=?',
          this.text(input, 'title', true),
          this.text(input, 'description'),
          zone,
          fling,
        ),
      );
    } else if (kind === 'activity') {
      const id = typeof input.id === 'string' ? input.id : crypto.randomUUID();
      const title = this.text(input, 'title', true),
        summary = this.text(input, 'summary'),
        details = this.text(input, 'details');
      if (!['draft', 'published', 'cancelled'].includes(String(input.state)))
        throw new AccessError(400, 'Choose an activity status.');
      object = id;
      if (input.id) {
        steps.push(
          this.guard(
            child,
            'EXISTS(SELECT 1 FROM activities WHERE id=? AND fling=?)',
            [id, fling],
          ),
        );
        steps.push(
          this.q(
            'UPDATE activities SET title=?,summary=?,details=?,state=? WHERE id=? AND fling=?',
            title,
            summary,
            details,
            input.state,
            id,
            fling,
          ),
        );
      } else {
        steps.push(
          this.q(
            'INSERT INTO activities(id,fling,title,summary,details,state,position) VALUES(?,?,?,?,?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM activities WHERE fling=?))',
            id,
            fling,
            title,
            summary,
            details,
            input.state,
            fling,
          ),
        );
      }
    } else if (kind === 'order') {
      if (
        !Array.isArray(input.ids) ||
        !input.ids.length ||
        input.ids.length > 500 ||
        input.ids.some((id) => typeof id !== 'string') ||
        new Set(input.ids).size !== input.ids.length
      )
        throw new AccessError(400, 'Supply every activity once.');
      const ids = input.ids as string[];
      steps.push(
        this.guard(
          child,
          `(SELECT COUNT(*) FROM activities WHERE fling=?)=? AND (SELECT COUNT(*) FROM activities WHERE fling=? AND id IN (${ids.map(() => '?').join(',')}))=?`,
          [fling, ids.length, fling, ...ids, ids.length],
        ),
      );
      ids.forEach((id, i) =>
        steps.push(
          this.q(
            'UPDATE activities SET position=? WHERE id=? AND fling=?',
            i,
            id,
            fling,
          ),
        ),
      );
    } else if (kind === 'event') {
      const id = typeof input.id === 'string' ? input.id : crypto.randomUUID();
      const activity = this.text(input, 'activity', true),
        title = this.text(input, 'title', true),
        summary = this.text(input, 'summary'),
        details = this.text(input, 'details');
      const zone = this.text(input, 'zone', true),
        local = this.text(input, 'local', true);
      let starts: string;
      let ends: string | null = null;
      const optional = (key: string) =>
        this.text({ [key]: input[key] ?? '' }, key);
      const invitationLocation = optional('invitation_location'),
        locationName = optional('location_name'),
        locationAddress = optional('location_address'),
        endLocal = optional('end_local');
      let locationUrl = optional('location_url');
      if (locationUrl) {
        try {
          const url = new URL(locationUrl);
          if (
            !['https:', 'http:'].includes(url.protocol) ||
            url.username ||
            url.password
          )
            throw new Error();
          locationUrl = url.href;
        } catch {
          throw new AccessError(
            400,
            'Use an http or https location link without credentials.',
          );
        }
      }
      try {
        starts = resolveTime(local, zone, input.starts);
        if (endLocal) {
          ends = resolveTime(endLocal, zone, input.ends);
          if (Date.parse(ends) <= Date.parse(starts))
            throw new Error('The end must be after the start.');
        } else if (input.ends)
          throw new Error('Enter a local end time for the selected end.');
      } catch (error) {
        throw new AccessError(400, (error as Error).message);
      }
      object = id;
      steps.push(
        this.guard(
          child,
          `EXISTS(SELECT 1 FROM activities WHERE id=? AND fling=?) ${input.id ? 'AND EXISTS(SELECT 1 FROM events WHERE id=? AND activity=? AND fling=?)' : ''}`,
          [activity, fling, ...(input.id ? [id, activity, fling] : [])],
        ),
      );
      steps.push(
        input.id
          ? this.q(
              'UPDATE events SET title=?,starts=?,zone=?,summary=?,details=?,ends=?,invitation_location=?,location_name=?,location_address=?,location_url=?,changed_at=? WHERE id=? AND fling=?',
              title,
              starts,
              zone,
              summary,
              details,
              ends,
              invitationLocation,
              locationName,
              locationAddress,
              locationUrl,
              this.clock(),
              id,
              fling,
            )
          : this.q(
              'INSERT INTO events(id,fling,activity,title,starts,zone,summary,details,ends,invitation_location,location_name,location_address,location_url,changed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              id,
              fling,
              activity,
              title,
              starts,
              zone,
              summary,
              details,
              ends,
              invitationLocation,
              locationName,
              locationAddress,
              locationUrl,
              this.clock(),
            ),
      );
    } else throw new AccessError(400, 'Unknown gathering action.');
    steps.push(
      this.q('UPDATE flings SET revision=revision+1 WHERE id=?', fling),
      this.audit(actor, fling, 'save-' + kind, object),
      this.q('DELETE FROM guards WHERE id IN (?,?)', g.id, child),
    );
    await this.batch(actor, fling, steps, true);
    return { id: object };
  }

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
      this.q(
        'SELECT id,title,description,default_zone,state,revision FROM flings WHERE id=?',
        fling,
      ),
      this.q(
        "SELECT id,name,email,phone,preference,revision FROM members WHERE fling=? AND state='active' ORDER BY name,id",
        fling,
      ),
      this.q(
        'SELECT id,title,summary,details,state,position FROM activities WHERE fling=? ORDER BY position,id',
        fling,
      ),
      this.q(
        'SELECT member,activity,state FROM invitations WHERE fling=?',
        fling,
      ),
      this.q(
        'SELECT id,activity,title,starts,ends,zone,summary,details,invitation_location,location_name,location_address,location_url,changed_at FROM events WHERE fling=? ORDER BY starts,id',
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
