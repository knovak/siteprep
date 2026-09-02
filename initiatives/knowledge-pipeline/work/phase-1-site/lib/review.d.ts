export type ReviewSource = {
  id: string;
  currentVersionId?: string;
  versionId?: string;
  contentHash?: string;
  content_hash?: string;
  title?: string;
  url?: string | null;
  body?: string | null;
  content?: Record<string, unknown>;
  tags?: unknown[];
};

export type ReviewPacket = Record<string, unknown> & {
  packageId: string;
  packageHash: string;
  createdAt: string;
  destination: Record<string, unknown>;
  acceptedInputs: ReviewSource[];
};

export const ASSESSMENT_DIMENSIONS: string[];
export const PROMOTION_DISPOSITIONS: string[];
export function makeWorkPacket(input: {
  collection: Record<string, unknown>;
  actorId: string;
  sources: ReviewSource[];
  selectedSourceIds?: string[];
  omittedDependencies?: Array<{id: string; reason: string}>;
  createdAt?: string;
  maxSources?: number;
}): Promise<ReviewPacket>;
export function previewProposal(packet: ReviewPacket, proposal: unknown, currentDestination?: Record<string, unknown>): any;
export function newReviewState(): any;
export function commitProposalState(state: any, preview: any, input: any): Promise<any>;
export function vocabularyImpact(state: any, change: any): any;
export function dependenceAdjustedCounts(sources: any[], relationships: any[]): any;
export function orderedAssessmentView(assessments: any[], rule?: string): any;
