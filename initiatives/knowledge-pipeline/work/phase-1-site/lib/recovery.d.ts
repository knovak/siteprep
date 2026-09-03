export const RETRY_DELAYS_MS: readonly number[];
export const RETENTION_POLICY: Readonly<{ daily: number; monthly: number }>;
export type RecoveryRecord = Record<string, unknown>;
export function packageIdentity(pkg: RecoveryRecord): Promise<string>;
export function assertCredentialFree(value: unknown, path?: string): void;
export function scheduleOperationId(scheduleId: string, dueAt: string): string;
export function hostedScheduleStatus(permissionGranted: boolean): {
  active: boolean;
  code: string;
};
export function runExportCaller(input: RecoveryRecord): Promise<unknown>;
export function runDueScheduleTrigger(
  input: RecoveryRecord,
): Promise<unknown[]>;
export function runWithRecoveryRetries(input: RecoveryRecord): Promise<unknown>;
export function selectRetainedSuccesses(
  artifacts: RecoveryRecord[],
  policy?: { daily: number; monthly: number },
): RecoveryRecord[];
export function makeKnowledgeSpaceBackup(
  input: RecoveryRecord,
): Promise<RecoveryRecord>;
export function copyCollectionSubset(
  pkg: RecoveryRecord,
  input: RecoveryRecord,
): Promise<unknown>;
export function verifyRecoveryPackage(
  pkg: RecoveryRecord,
  expectedHash?: string,
): Promise<boolean>;
export function restoreAtomically(input: RecoveryRecord): Promise<unknown>;
export function migrateRecoveryPackage(
  pkg: RecoveryRecord,
): Promise<RecoveryRecord>;
export function eraseCollectionBatch(
  state: RecoveryRecord,
  input?: RecoveryRecord,
): unknown;
export function pageRows<T extends { id: string }>(
  rows: T[],
  input?: { after?: string | null; limit?: number },
): { rows: T[]; next: string | null };
