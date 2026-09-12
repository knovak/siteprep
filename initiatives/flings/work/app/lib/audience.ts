import { AccessError, completeProfile, type Actor } from './access.ts';
import { CoordinationStore } from './coordination.ts';
type Row = Record<string, unknown>;
export class AudienceStore extends CoordinationStore {
  async audience(actor: Actor, fling: string, input: Row) {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    const group = input.group ?? 'all',
      filter = input.filter ?? 'none',
      channel = input.channel ?? 'preference';
    if (
      typeof group !== 'string' ||
      typeof filter !== 'string' ||
      typeof channel !== 'string' ||
      !['all', 'invitees', 'accepted'].includes(group) ||
      ![
        'none',
        'individuals',
        'unanswered-invitation',
        'unanswered-poll',
        'outstanding-payment',
      ].includes(filter) ||
      !['preference', 'email', 'text'].includes(channel)
    )
      throw new AccessError(
        400,
        'Choose a recipient group, filter and delivery preference.',
      );
    const g = this.revisionGuard(fling, input.revision);
    const results = await this.batch(actor, fling, [
      g.statement,
      this.q(
        "SELECT id,name,email,phone,preference,revision FROM members WHERE fling=? AND state='active' ORDER BY name,id",
        fling,
      ),
      this.q(
        "SELECT id,title FROM activities WHERE fling=? AND state='published' ORDER BY position,id",
        fling,
      ),
      this.q(
        'SELECT member,activity,state,generation FROM invitations WHERE fling=?',
        fling,
      ),
      this.q(
        'SELECT id,title,activity,closed,deadline FROM polls WHERE fling=? ORDER BY created,id',
        fling,
      ),
      this.q('SELECT poll,member FROM poll_audience WHERE fling=?', fling),
      this.q(
        'SELECT poll,member,choices,generation,revision FROM votes WHERE fling=? ORDER BY revision DESC',
        fling,
      ),
      this.q(
        'SELECT p.id,p.member,p.amount,e.activity FROM payment_requests p JOIN events e ON e.id=p.event AND e.fling=p.fling WHERE p.fling=?',
        fling,
      ),
      this.q(
        'SELECT l.request,l.kind,l.amount FROM payment_ledger l JOIN payment_requests p ON p.id=l.request WHERE p.fling=?',
        fling,
      ),
      this.q('DELETE FROM guards WHERE id=?', g.id),
    ]);
    const [
      members,
      activities,
      invitations,
      polls,
      pollAudience,
      votes,
      requests,
      ledger,
    ] = results.slice(1, -1).map((r) => r.results as Row[]);
    const activity = input.activity ?? '';
    if (group !== 'all' || filter === 'unanswered-invitation') {
      if (!activities.some((a) => a.id === activity))
        throw new AccessError(
          400,
          'Choose a published activity in this fling.',
        );
    }
    let selected = members.filter(
      (m) =>
        group === 'all' ||
        invitations.some(
          (i) =>
            i.member === m.id &&
            i.activity === activity &&
            (group === 'accepted'
              ? i.state === 'accepted'
              : i.state !== 'withdrawn'),
        ),
    );
    if (filter === 'individuals') {
      if (
        !Array.isArray(input.individuals) ||
        !input.individuals.length ||
        input.individuals.length > 100 ||
        new Set(input.individuals).size !== input.individuals.length ||
        input.individuals.some((id) => !members.some((m) => m.id === id))
      )
        throw new AccessError(
          400,
          'Select current members of this fling, once each.',
        );
      selected = selected.filter((m) =>
        (input.individuals as unknown[]).includes(m.id),
      );
    }
    if (filter === 'unanswered-invitation')
      selected = selected.filter((m) =>
        invitations.some(
          (i) =>
            i.member === m.id &&
            i.activity === activity &&
            i.state === 'invited',
        ),
      );
    const openPolls = polls.filter(
      (p) =>
        !p.closed &&
        (p.deadline === null || Number(p.deadline) > this.clock()) &&
        activities.some((a) => a.id === p.activity),
    );
    if (filter === 'unanswered-poll') {
      const poll = openPolls.find((p) => p.id === input.poll);
      if (!poll || (group !== 'all' && poll.activity !== activity))
        throw new AccessError(
          400,
          'Choose an open poll in the selected activity.',
        );
      selected = selected.filter((m) => {
        const invitation = invitations.find(
          (i) =>
            i.member === m.id &&
            i.activity === poll.activity &&
            i.state === 'accepted',
        );
        if (
          !invitation ||
          !pollAudience.some((a) => a.poll === poll.id && a.member === m.id)
        )
          return false;
        const latest = votes.find(
          (v) => v.poll === poll.id && v.member === m.id,
        );
        return (
          !latest ||
          latest.generation !== invitation.generation ||
          (JSON.parse(latest.choices as string) as number[]).length === 0
        );
      });
    }
    if (filter === 'outstanding-payment')
      selected = selected.filter((m) =>
        requests.some(
          (p) =>
            p.member === m.id &&
            (group === 'all' || p.activity === activity) &&
            Number(p.amount) +
              ledger
                .filter((l) => l.request === p.id)
                .reduce((n, l) => n + this.effect(l), 0) >
              0,
        ),
      );
    const deliveries: {
        id: string;
        member: string;
        name: string;
        channel: string;
        destination: string;
        profile_revision: number;
      }[] = [],
      omissions: { member: string; name: string; reason: string }[] = [];
    for (const m of selected) {
      const identity = { member: m.id as string, name: m.name as string };
      if (!completeProfile(m)) {
        omissions.push({
          ...identity,
          reason:
            'Incomplete notification profile; correct the missing contact details before preparing messages.',
        });
        continue;
      }
      const channels =
        m.preference === 'both' ? ['email', 'text'] : [String(m.preference)];
      const chosen = channels.filter(
        (c) => channel === 'preference' || channel === c,
      );
      if (!chosen.length)
        omissions.push({
          ...identity,
          reason: 'Notification preference excludes the selected channel.',
        });
      for (const c of chosen)
        deliveries.push({
          id: identity.member + ':' + c,
          ...identity,
          channel: c,
          destination: String(c === 'email' ? m.email : m.phone),
          profile_revision: Number(m.revision),
        });
    }
    const destinations = new Map<string, typeof deliveries>();
    for (const d of deliveries) {
      const key =
        d.channel +
        ':' +
        (d.channel === 'email' ? d.destination.toLowerCase() : d.destination);
      destinations.set(key, [...(destinations.get(key) ?? []), d]);
    }
    return {
      revision: input.revision,
      generated_at: this.clock(),
      selected_members: selected.length,
      deliveries,
      omissions,
      duplicates: [...destinations.values()]
        .filter((d) => d.length > 1)
        .map((d) => ({
          channel: d[0].channel,
          destination: d[0].destination,
          members: d.map((x) => ({ id: x.member, name: x.name })),
        })),
      choices: {
        members: members.map((m) => ({ id: m.id, name: m.name })),
        activities,
        polls: openPolls,
      },
    };
  }
}
