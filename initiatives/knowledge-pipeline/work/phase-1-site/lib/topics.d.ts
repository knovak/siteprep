export type EntityType = 'source' | 'topic' | 'assessment' | 'narrative' | 'comparison' | 'standing-document' | 'archive-disposition';
export type RelationshipState = 'proposed' | 'accepted' | 'disputed' | 'rejected' | 'retracted';
export interface TopicEntity { id: string; type: EntityType; collectionId: string; currentVersionId?: string; versionIds?: string[] }
export interface Relationship { id?: string; type: string; fromEntityId: string; toEntityId: string; fromVersionId?: string; toVersionId?: string; topicScopeId?: string | null; scope?: string; state?: RelationshipState; primary?: boolean; rationale?: string }
export interface TopicState { collectionId: string; entities: TopicEntity[]; relationships: Relationship[]; proposals: Relationship[]; narratives: TopicEntity[]; activities: unknown[]; receipts: unknown[] }
export const RELATIONSHIP_REGISTRY: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
export function newTopicState(input: {collectionId: string; entities?: TopicEntity[]; relationships?: Relationship[]; proposals?: Relationship[]}): TopicState;
export function validateRelationship(state: TopicState, candidate: Relationship, options?: {derived?: boolean}): {ok: boolean; code: string | null; disposition?: string};
export function acceptRelationship(state: TopicState, candidate: Relationship, options?: Record<string, unknown>): Promise<{state: TopicState; relationship: Relationship | null; validation: {ok: boolean; code: string | null}}>;
export function assignToTopic(state: TopicState, assignment: Relationship, options?: Record<string, unknown>): ReturnType<typeof acceptRelationship>;
export function deriveLatestUpdate(state: TopicState, options: {rootEntityId: string; topicScopeId?: string | null}): Relationship | null;
export function commitNarrativeProposal(state: TopicState, proposal: Record<string, unknown>, options: Record<string, unknown>): Promise<Record<string, unknown>>;
export function evidenceClosure(state: TopicState, narrativeId: string): Record<string, unknown> | null;
export function reorderTopic(state: TopicState, options: Record<string, unknown>): {state: TopicState; narrativeVersionsUnchanged: boolean};
export function relationshipTable(state: TopicState): Relationship[];
export function relationshipNeighborhood(state: TopicState, entityId: string, options?: {limit?: number}): Record<string, unknown>;
