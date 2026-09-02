export type HarvestFinding = {code: string; path: string; message: string; severity: 'error' | 'warning'};
export type HarvestPreview = {contentHash: string; operations: any; findings: HarvestFinding[]; counts: {sources: number; withBodies: number; restricted: number; unknownRights: number; tags: number; dependencyProposals: number; nativeActivities: number}};
export function makeHarvestPreview(kind: string, value: unknown, options?: {createdAt?: string}): Promise<HarvestPreview>;
export function newHarvestState(): any;
export function commitHarvestState(state: any, preview: HarvestPreview, options?: {actorId?: string; committedAt?: string}): Promise<{state: any; duplicate: boolean; receipt: any}>;
export function measureTagInventory(state: any): any[];
