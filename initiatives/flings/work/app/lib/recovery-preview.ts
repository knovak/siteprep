import { AccessError, type Actor } from './access.ts';
import {
  RecoveryCheckStore,
  checkRecoveryFile,
  type RecoveryCheck,
} from './recovery-check.ts';

type Row = Record<string, unknown>;
type Account = { id: string; name: string };
type Identity = { id: string; name: string; assigned: boolean };
type Mapping = { source: string; target: string | null };
export type RecoveryPreview = {
  confirmation?: { ticket: string; expires: number } | null;
  check: RecoveryCheck;
  identities: Identity[];
  accounts: Account[];
  importer: Account | null;
  plan: null | {
    title: string;
    state: string;
    mappings: (Mapping & { name: string; account: Account | null })[];
    organizers: Account[];
    counts: Record<string, number>;
    total: number;
    redactions: number;
    unfinishedHandoffs: number;
    importedResults: number;
  };
};

export class RecoveryPreviewStore extends RecoveryCheckStore {
  async recoveryPreview(
    actor: Actor,
    fling: string,
    input: Row,
  ): Promise<RecoveryPreview> {
    if (actor.kind !== 'organizer')
      throw new AccessError(403, 'Organizer access is required.');
    // Only the current page determines which real accounts can be offered.
    // Uploaded names and IDs are never used in these queries. A SELECT-only
    // snapshot avoids batch()'s purge-on-read writes during an isolated preview.
    const roster = async () => {
      const rows = (
        await this.q(
          `SELECT o.id,o.name FROM organizers o JOIN assignments a ON a.organizer=o.id
         WHERE a.fling=? AND EXISTS(SELECT 1 FROM assignments WHERE fling=? AND organizer=?)
         ORDER BY o.id`,
          fling,
          fling,
          actor.id,
        ).all<Account>()
      ).results;
      if (!rows.some((row) => row.id === actor.id))
        throw new AccessError(
          403,
          'Organizer access is required for this gathering.',
        );
      return rows;
    };
    const accounts = await roster();
    if (
      Object.keys(input).some((k) => !['file', 'organizer_mapping'].includes(k))
    )
      throw new AccessError(
        400,
        'Use the backup and organizer choices from this form.',
      );
    const check = checkRecoveryFile(input.file);
    const result: RecoveryPreview = {
      check,
      identities: [],
      accounts: [],
      importer: null,
      plan: null,
    };
    if (check.valid && check.summary) {
      const file = input.file as { records: Record<string, Row[]> };
      const assigned = new Set(
        file.records.assignments.map((r) => r.organizer),
      );
      result.identities = file.records.organizers.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        assigned: assigned.has(r.id),
      }));
      result.accounts = accounts;
      result.importer = accounts.find((r) => r.id === actor.id)!;
      if (Object.hasOwn(input, 'organizer_mapping')) {
        const choices = input.organizer_mapping;
        const fail = () => {
          throw new AccessError(
            400,
            'Choose history only or a listed account for every historical organizer; only assigned organizers can map to accounts.',
          );
        };
        if (
          !Array.isArray(choices) ||
          choices.length !== result.identities.length
        )
          fail();
        const mappings = new Map<string, string | null>();
        const sourceIds = new Set(result.identities.map((r) => r.id));
        const accountIds = new Set(accounts.map((r) => r.id));
        for (const value of choices as unknown[]) {
          if (!value || typeof value !== 'object' || Array.isArray(value))
            fail();
          const row = value as Row;
          if (
            Object.keys(row).length !== 2 ||
            !Object.hasOwn(row, 'source') ||
            !Object.hasOwn(row, 'target') ||
            typeof row.source !== 'string' ||
            !(row.target === null || typeof row.target === 'string')
          )
            fail();
          const source = row.source as string,
            target = row.target as string | null;
          if (
            mappings.has(source) ||
            !sourceIds.has(source) ||
            (target !== null &&
              (!assigned.has(source) || !accountIds.has(target)))
          )
            fail();
          mappings.set(source, target);
        }
        // The importer always remains an organizer, even when every imported
        // assignment is explicitly kept as history only. Never merge old actors.
        const grants = new Set([
          actor.id,
          ...[...mappings.values()].filter((id) => id !== null),
        ]);
        result.plan = {
          title: String(file.records.flings[0].title),
          state: String(file.records.flings[0].state),
          mappings: result.identities.map((r) => ({
            source: r.id,
            name: r.name,
            target: mappings.get(r.id)!,
            account: accounts.find((a) => a.id === mappings.get(r.id)) ?? null,
          })),
          organizers: accounts.filter((r) => grants.has(r.id)),
          counts: { ...check.summary.counts },
          total: check.summary.total,
          redactions: check.summary.redactions,
          unfinishedHandoffs: check.summary.unfinishedHandoffs,
          importedResults: file.records.message_results.length,
        };
      }
    }
    // Recheck the complete offered roster, including co-organizer removals or
    // renamed accounts. A stale choice must not produce a current-looking plan.
    if (JSON.stringify(await roster()) !== JSON.stringify(accounts))
      throw new AccessError(
        409,
        'Organizer accounts changed. Load the choices and review again.',
      );
    return result;
  }
}
