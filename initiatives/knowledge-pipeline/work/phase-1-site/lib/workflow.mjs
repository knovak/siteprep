import { canonicalJson, sha256 } from './domain.mjs';
import {
  makeHarvestPreview,
  commitHarvestState,
  newHarvestState,
} from './harvest.mjs';
import {
  newTopicState,
  assignToTopic,
  acceptRelationship,
  commitNarrativeProposal,
} from './topics.mjs';
import {
  newIntegrationState,
  createComparison,
  proposeDocumentPatch,
  approveDocumentPatch,
  archiveNarrative,
  reopenNarrative,
  URGENCY_DIMENSIONS,
} from './documents.mjs';
import {
  packageIdentity,
  verifyRecoveryPackage,
  assertCredentialFree,
} from './recovery.mjs';

export const MAX_WORKFLOW_BYTES = 800_000;
export const MAX_UPLOAD_BYTES = 1_500_000;
export const WORKFLOW_SCHEMA = 'knowledge-pipeline/workflow/v1';
const clone = (value) => structuredClone(value);
const required = (value, label) => {
  const result = String(value ?? '').trim();
  if (!result || result.length > 50000)
    throw new Error(label + ' is required (maximum 50,000 characters).');
  return result;
};
const current = (entity) =>
  entity.versions.find(
    (version) => version.versionId === entity.currentVersionId,
  );

export function emptyWorkflow(collectionId) {
  return {
    schema: WORKFLOW_SCHEMA,
    collectionId,
    harvest: newHarvestState(),
    topics: newTopicState({ collectionId }),
    integration: newIntegrationState({ collectionId }),
    decisions: [],
    operations: [],
    pendingIntake: null,
    assets: [],
  };
}

export function synchronizeWorkflow(state) {
  const next = clone(state);
  const sources = next.harvest.sources.map((source) => {
    const versions = next.harvest.versions
      .filter((v) => v.sourceId === source.id)
      .map((v) => ({
        ...v,
        versionId: v.id,
        activityId:
          v.activityId ??
          next.harvest.receipts.find((r) => r.createdAt === v.createdAt)
            ?.activityId ??
          null,
      }));
    return {
      ...source,
      type: 'source',
      collectionId: next.collectionId,
      versions,
      versionIds: versions.map((v) => v.id),
    };
  });
  next.topics.entities = [
    ...next.topics.entities.filter((entity) => entity.type !== 'source'),
    ...sources,
  ];
  next.integration.sources = sources;
  next.integration.topics = next.topics.entities.filter(
    (entity) => entity.type === 'topic',
  );
  const activities = [
    ...next.harvest.activities,
    ...next.topics.activities,
    ...next.integration.activities,
  ];
  next.integration.activities = [
    ...new Map(activities.map((a) => [a.id, a])).values(),
  ];
  const relationships = [
    ...next.topics.relationships,
    ...next.integration.relationships,
  ];
  next.integration.relationships = [
    ...new Map(relationships.map((r) => [r.id, r])).values(),
  ];
  return next;
}

function sourceVersion(state, sourceId) {
  const source = state.harvest.sources.find((s) => s.id === sourceId);
  if (!source) throw new Error('Source is outside this collection.');
  return {
    source,
    version: state.harvest.versions.find(
      (v) => v.id === source.currentVersionId,
    ),
  };
}

function appendActivity(state, actor, type, details, at) {
  const activity = {
    id: 'activity:' + crypto.randomUUID(),
    type,
    actor: clone(actor),
    createdAt: at,
    ...details,
  };
  state.integration.activities.push(activity);
  return activity.id;
}

export async function applyWorkflowOperation(
  original,
  input,
  actor,
  at = new Date().toISOString(),
) {
  if (actor?.kind !== 'human' || !actor.id)
    throw new Error('A signed-in human must approve this action.');
  const operationId = required(input.operationId, 'Operation id');
  if (original.operations.some((o) => o.id === operationId))
    return { state: clone(original), duplicate: true };
  let state = synchronizeWorkflow(original);
  const type = input.type;
  if (type === 'intake-preview') {
    const preview = await makeHarvestPreview(input.kind, input.payload, {
      createdAt: at,
    });
    if (preview.findings.some((f) => f.severity === 'error'))
      throw new Error(preview.findings.map((f) => f.message).join(' '));
    state.pendingIntake = preview;
  } else if (type === 'intake-commit') {
    if (
      !state.pendingIntake ||
      state.pendingIntake.contentHash !== input.previewHash
    )
      throw new Error('Intake preview changed. Preview the source again.');
    state.harvest = (
      await commitHarvestState(state.harvest, state.pendingIntake, {
        actorId: actor.id,
        committedAt: at,
      })
    ).state;
    state.pendingIntake = null;
  } else if (type === 'review-source') {
    const { source, version } = sourceVersion(state, input.sourceId);
    if (version.contentHash !== input.sourceHash)
      throw new Error('Source changed. Review the current version.');
    if (
      !['promoted', 'deferred', 'rejected', 'needs-review'].includes(
        input.disposition,
      )
    )
      throw new Error('Choose a promotion disposition.');
    const rationale = required(input.rationale, 'Review rationale');
    const dimensions = {};
    for (const key of [
      'relevance',
      'quality',
      'novelty',
      'importance',
      'urgency',
    ]) {
      const value = input.dimensions?.[key];
      if (
        value !== 'unknown' &&
        !(Number.isInteger(value) && value >= 0 && value <= 4)
      )
        throw new Error(key + ' must be 0–4 or unknown.');
      dimensions[key] = {
        value: value === 'unknown' ? null : value,
        unknown: value === 'unknown',
        confidence: value === 'unknown' ? 0 : Number(input.confidence ?? 0.5),
        rationale,
        evidence: [version.id],
      };
    }
    if (
      Object.values(dimensions).some(
        (d) =>
          !Number.isFinite(d.confidence) ||
          d.confidence < 0 ||
          d.confidence > 1,
      )
    )
      throw new Error('Confidence must be between 0 and 1.');
    const tags = [
      ...new Set(
        String(input.tags ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    const activityId = appendActivity(
      state,
      actor,
      'source-reviewed',
      { sourceId: source.id, sourceVersionId: version.id },
      at,
    );
    const decision = {
      id: 'decision:' + crypto.randomUUID(),
      sourceId: source.id,
      targetVersionId: version.id,
      disposition: input.disposition,
      dimensions,
      tags,
      rationale,
      actor,
      activityId,
      createdAt: at,
    };
    state.decisions.push(decision);
    state.integration.assessments.push(decision);
    state.integration.tagAssignments.push(
      ...tags.map((tag) => ({
        id: 'tag:' + crypto.randomUUID(),
        entityId: source.id,
        tag,
        state: 'accepted',
        activityId,
      })),
    );
  } else if (type === 'create-topic') {
    const title = required(input.title, 'Topic title');
    if (
      state.integration.topics.some(
        (topic) => topic.title.toLowerCase() === title.toLowerCase(),
      )
    )
      throw new Error('A topic with that title already exists.');
    const topic = {
      id: 'topic:' + crypto.randomUUID(),
      type: 'topic',
      collectionId: state.collectionId,
      title,
    };
    state.topics.entities.push(topic);
    appendActivity(state, actor, 'topic-created', { topicId: topic.id }, at);
  } else if (type === 'assign-topic') {
    const { source, version } = sourceVersion(state, input.sourceId);
    state.topics = (
      await assignToTopic(
        state.topics,
        {
          fromEntityId: source.id,
          fromVersionId: version.id,
          toEntityId: input.topicId,
        },
        { actor, createdAt: at },
      )
    ).state;
  } else if (type === 'narrative') {
    const topic = state.integration.topics.find((t) => t.id === input.topicId);
    if (!topic) throw new Error('Choose a topic in this collection.');
    const sourceIds = [...new Set(input.sourceIds ?? [])];
    if (!sourceIds.length) throw new Error('Choose at least one source.');
    const sourceVersionIds = sourceIds.map(
      (id) => sourceVersion(state, id).version.id,
    );
    const narrativeId = 'narrative:' + crypto.randomUUID();
    const text = required(input.text, 'Narrative text');
    const proposal = {
      id: 'proposal:' + crypto.randomUUID(),
      narrativeId,
      title: required(input.title, 'Narrative title'),
      topicId: topic.id,
      text: String(input.proposedText ?? text),
      sourceVersionIds,
      relationships: [],
      proposedBy: {
        kind: 'recorded-proposal',
        id: 'process:curator-workspace-v1',
      },
    };
    const result = await commitNarrativeProposal(state.topics, proposal, {
      actor,
      acceptNarrative: true,
      textEdit: text,
      createdAt: at,
    });
    state.topics = result.state;
    const activityId = result.state.activities.at(-1).id;
    state.integration.narratives.push({
      id: narrativeId,
      type: 'narrative',
      title: proposal.title,
      topicId: topic.id,
      stage: 'integration',
      currentVersionId: result.narrative.currentVersionId,
      versions: [
        {
          versionId: result.narrative.currentVersionId,
          state: 'accepted',
          text,
          sourceVersionIds,
          sourceClusterIds: sourceIds,
          activityId,
          actor,
          createdAt: at,
        },
      ],
    });
    state.topics = (
      await assignToTopic(
        state.topics,
        {
          fromEntityId: narrativeId,
          fromVersionId: result.narrative.currentVersionId,
          toEntityId: topic.id,
        },
        { actor, createdAt: at },
      )
    ).state;
    for (const sourceId of sourceIds)
      state.topics = (
        await acceptRelationship(
          state.topics,
          {
            type: 'derived-from',
            fromEntityId: narrativeId,
            fromVersionId: result.narrative.currentVersionId,
            toEntityId: sourceId,
            toVersionId: sourceVersion(state, sourceId).version.id,
          },
          { actor, createdAt: at },
        )
      ).state;
  } else if (type === 'document-proposal') {
    const topic = state.integration.topics.find((t) => t.id === input.topicId);
    if (!topic) throw new Error('Topic is outside this collection.');
    const narratives = state.integration.narratives.filter(
      (n) => n.topicId === topic.id && n.stage !== 'archived',
    );
    const document = state.integration.documents.find(
      (d) => d.topicId === topic.id,
    );
    const rationale = required(input.rationale, 'Comparison rationale');
    const urgency = {
      processVersion: 'curator-comparison-v1',
      rationale,
      evidenceIds: narratives.map((n) => n.currentVersionId),
      dimensions: Object.fromEntries(
        URGENCY_DIMENSIONS.map((key) => [
          key,
          {
            value: input.urgency?.[key] ?? 'unknown',
            rationale,
            evidenceIds: narratives.map((n) => n.currentVersionId),
          },
        ]),
      ),
    };
    const comparison = await createComparison(state.integration, {
      topicId: topic.id,
      narrativeVersionIds: narratives.map((n) => n.currentVersionId),
      documentVersionId: document?.currentVersionId ?? null,
      classifications: input.classifications ?? {},
      urgency,
      actor,
      createdAt: at,
    });
    const result = await proposeDocumentPatch(comparison.state, {
      comparisonId: comparison.comparison.id,
      documentId: document?.id ?? 'document:' + crypto.randomUUID(),
      proposedText: required(input.text, 'Proposed document text'),
      citedNarrativeVersionIds: narratives.map((n) => n.currentVersionId),
      citedSourceVersionIds: [
        ...new Set(narratives.flatMap((n) => current(n).sourceVersionIds)),
      ],
      proposedParts: [required(input.text, 'Proposed document text')],
      processVersion: 'curator-document-proposal-v1',
      actor,
      createdAt: at,
    });
    state.integration = result.state;
  } else if (type === 'approve-document') {
    const proposal = state.integration.proposals.find(
      (p) => p.id === input.proposalId && p.state === 'proposed',
    );
    if (!proposal) throw new Error('Document proposal is no longer pending.');
    const document = state.integration.documents.find(
      (d) => d.id === proposal.documentId,
    );
    if ((document?.currentVersionId ?? null) !== proposal.baseDocumentVersionId)
      throw new Error('Document changed. Prepare a new comparison.');
    const acceptedText = required(input.text, 'Approved document text');
    state.integration = (
      await approveDocumentPatch(state.integration, proposal.id, {
        actor,
        acceptedText,
        rejectedProposalParts: input.rejectedParts
          ? [String(input.rejectedParts)]
          : [],
        claims: [
          {
            id: 'claim:' + crypto.randomUUID(),
            text: acceptedText,
            narrativeVersionIds: proposal.citedNarrativeVersionIds,
          },
        ],
        createdAt: at,
      })
    ).state;
  } else if (type === 'archive') {
    const narrative = state.integration.narratives.find(
      (n) => n.id === input.narrativeId,
    );
    if (!narrative) throw new Error('Narrative is outside this collection.');
    if (input.kind === 'incorporated') {
      const document = state.integration.documents.find(
        (d) =>
          d.topicId === narrative.topicId &&
          d.versions.some(
            (v) =>
              v.versionId === input.standingDocumentVersionId &&
              v.citedNarrativeVersionIds?.includes(narrative.currentVersionId),
          ),
      );
      if (!document)
        throw new Error(
          'Choose a document revision that actually cites this narrative.',
        );
    }
    if (
      input.kind === 'superseded' &&
      !state.integration.narratives.some(
        (n) =>
          n.id !== narrative.id &&
          n.topicId === narrative.topicId &&
          n.versions.some(
            (v) => v.versionId === input.replacingNarrativeVersionId,
          ),
      )
    )
      throw new Error('Choose a different narrative revision in this topic.');
    state.integration = (
      await archiveNarrative(state.integration, {
        ...input,
        actor,
        createdAt: at,
      })
    ).state;
  } else if (type === 'reopen') {
    state.integration = reopenNarrative(state.integration, {
      ...input,
      actor,
      reason: required(input.reason, 'Reopen reason'),
      createdAt: at,
    }).state;
  } else if (type === 'fixture') {
    if (state.harvest.sources.length || state.topics.entities.length)
      throw new Error('The acceptance fixture requires an empty collection.');
    state = await createAcceptanceFixture(state.collectionId, actor, at);
  } else throw new Error('Unknown workflow action.');
  state.operations.push({ id: operationId, type, actor, createdAt: at });
  state = synchronizeWorkflow(state);
  if (
    new TextEncoder().encode(canonicalJson(state)).byteLength >
    MAX_WORKFLOW_BYTES
  )
    throw new Error(
      'This bounded acceptance workspace is full (800 KB). Export it before starting another collection.',
    );
  return { state, duplicate: false };
}

export async function createAcceptanceFixture(collectionId, actor, at) {
  let state = emptyWorkflow(collectionId);
  const titles = [
    'Cooling centre hours',
    'Bus access to cooling',
    'Neighbour check-ins',
    'Shade at bus stops',
    'Library cooling rooms',
    'Language access',
    'Evening access',
    'Rural transport',
    'Water access',
    'Heat alerts',
    'Volunteer coordination',
    'Accessible entrances',
    'Weekend coverage',
    'Public seating',
    'Updated opening plan',
    'Syndicated opening report',
    'Metadata-only reference',
    'Unavailable reference',
  ];
  for (let index = 0; index < titles.length; index += 1) {
    const data = {
      url: 'https://example.org/knowledge-pipeline-fixture/' + (index + 1),
      title: titles[index],
      body:
        index < 16
          ? 'Project-authored exercise source ' +
            (index + 1) +
            ': ' +
            titles[index] +
            ' should be considered when reviewing the fictional community cooling plan. This is synthetic practice material, not real-world evidence.'
          : null,
      rightsState: index < 16 ? 'cleared' : 'metadata-only',
      captureState:
        index === 17 ? 'missing' : index === 16 ? 'metadata-only' : 'complete',
      capturedAt: at,
      tags: ['fixture', 'heat-resilience'],
    };
    const kind =
      index === 1
        ? 'browser-saved'
        : index === 2
          ? 'bookmark-sorter'
          : index === 3
            ? 'newsletter-story-harvester'
            : 'direct';
    const payload =
      kind === 'bookmark-sorter'
        ? {
            format: 'bookmark-sorter/v1',
            items: [
              {
                id: 'fixture-bookmark',
                url: data.url,
                title: data.title,
                tags: data.tags,
              },
            ],
            exported_at: at,
          }
        : kind === 'newsletter-story-harvester'
          ? {
              version: 1,
              stories: [
                {
                  id: 'fixture-newsletter',
                  url: data.url,
                  title: data.title,
                  text: data.body,
                  rights_state: 'cleared',
                  tags: data.tags,
                },
              ],
              exported_at: at,
            }
          : data;
    state.harvest = (
      await commitHarvestState(
        state.harvest,
        await makeHarvestPreview(kind, payload, { createdAt: at }),
        { actorId: actor.id, committedAt: at },
      )
    ).state;
  }
  state.topics.entities = ['Community heat resilience', 'Cooling access'].map(
    (title, i) => ({
      id: 'topic:fixture-' + i,
      type: 'topic',
      collectionId,
      title,
    }),
  );
  state = synchronizeWorkflow(state);
  for (let index = 0; index < 6; index += 1) {
    state = (
      await applyWorkflowOperation(
        state,
        {
          operationId: 'fixture:narrative:' + index,
          type: 'narrative',
          topicId: 'topic:fixture-' + (index === 5 ? 1 : 0),
          sourceIds: [state.harvest.sources[index].id],
          title: [
            'Cooling hours summary',
            'Transport summary',
            'Neighbour support',
            'Shade summary',
            'Opening plan update',
            'Cooling access summary',
          ][index],
          proposedText: 'Recorded fixture proposal for curator review.',
          text:
            'Fixture narrative: ' +
            titles[index] +
            ' is a consideration for the fictional community plan.',
        },
        actor,
        at,
      )
    ).state;
  }
  state = (
    await applyWorkflowOperation(
      state,
      {
        operationId: 'fixture:document-proposal',
        type: 'document-proposal',
        topicId: 'topic:fixture-0',
        text: 'Project-authored baseline for the exercise: the fictional community plan should consider cooling access. Review the incoming narratives before revising this text.',
        rationale: 'Set up the documented topic for the acceptance exercise.',
      },
      actor,
      at,
    )
  ).state;
  state = (
    await applyWorkflowOperation(
      state,
      {
        operationId: 'fixture:document-baseline',
        type: 'approve-document',
        proposalId: state.integration.proposals.at(-1).id,
        text: state.integration.proposals.at(-1).proposedText,
      },
      actor,
      at,
    )
  ).state;
  state.assets = [
    {
      id: 'asset:fixture-notice',
      name: 'fixture-notice.txt',
      mediaType: 'text/plain',
      rightsState: 'cleared',
      text: 'Project-authored fixture attachment. This is synthetic practice material.',
    },
  ];
  state.fixture = {
    synthetic: true,
    preparedAt: at,
    humanAcceptanceComplete: false,
  };
  return state;
}

export async function workflowPackage(state, name, at) {
  const accepted = clone(state);
  accepted.pendingIntake = null;
  const entities = [
    ...accepted.topics.entities,
    ...accepted.integration.documents,
    ...accepted.integration.archiveDispositions,
  ];
  const unique = [
    ...new Map(entities.map((entity) => [entity.id, entity])).values(),
  ];
  const versions = [
    ...accepted.harvest.versions.map((v) => ({
      id: v.id,
      entityId: v.sourceId,
      content: v.content,
      contentHash: v.contentHash,
    })),
    ...accepted.integration.narratives.flatMap((n) =>
      n.versions.map((v) => ({ id: v.versionId, entityId: n.id, content: v })),
    ),
    ...accepted.integration.documents.flatMap((d) =>
      d.versions.map((v) => ({ id: v.versionId, entityId: d.id, content: v })),
    ),
  ];
  for (const v of versions)
    v.contentHash ??= await sha256(canonicalJson(v.content));
  const assets = await Promise.all(
    accepted.assets.map(async (asset) => ({
      ...asset,
      content: asset.text,
      contentHash: await sha256(canonicalJson(asset.text)),
    })),
  );
  const pkg = {
    format: 'knowledge-pipeline/v1',
    createdAt: at,
    scope: {
      knowledgeSpaceId: 'space:' + state.collectionId,
      collectionId: state.collectionId,
    },
    records: {
      entities: unique,
      entityVersions: versions,
      relationships: accepted.integration.relationships,
      activities: accepted.integration.activities,
      receipts: [
        ...accepted.harvest.receipts,
        ...accepted.topics.receipts,
        ...accepted.integration.receipts,
        ...accepted.operations,
      ],
    },
    assets,
    extensions: {
      'siteprep:workflow-v1': accepted,
      'siteprep:collection': { name },
      'siteprep:sourceTags': accepted.harvest.tags,
    },
  };
  pkg.packageId = 'package:' + (await packageIdentity(pkg)).slice(7, 39);
  return pkg;
}

export async function validateWorkflowPackage(pkg) {
  assertCredentialFree(pkg);
  await verifyRecoveryPackage(pkg);
  const state = pkg.extensions?.['siteprep:workflow-v1'];
  if (
    state?.schema !== WORKFLOW_SCHEMA ||
    state.collectionId !== pkg.scope?.collectionId
  )
    throw new Error('This package has no supported complete-workflow state.');
  if (
    new TextEncoder().encode(canonicalJson(state)).byteLength >
    MAX_WORKFLOW_BYTES
  )
    throw new Error('Workspace exceeds the 800 KB bound.');
  for (const group of [
    'sources',
    'versions',
    'aliases',
    'tags',
    'activities',
    'receipts',
  ])
    if (!Array.isArray(state.harvest?.[group]))
      throw new Error('Invalid Harvest group: ' + group);
  for (const group of [
    'topics',
    'sources',
    'narratives',
    'documents',
    'comparisons',
    'proposals',
    'archiveDispositions',
    'relationships',
    'assessments',
    'tagAssignments',
    'activities',
    'receipts',
  ])
    if (!Array.isArray(state.integration?.[group]))
      throw new Error('Invalid integration group: ' + group);
  if (
    !Array.isArray(state.operations) ||
    !Array.isArray(state.assets) ||
    !Array.isArray(state.decisions)
  )
    throw new Error('Invalid workflow state.');
  const rebuilt = await workflowPackage(
    state,
    pkg.extensions['siteprep:collection'].name,
    pkg.createdAt,
  );
  if (rebuilt.packageId !== pkg.packageId)
    throw new Error('Package records disagree with workflow state.');
  const sourceIds = new Set(state.harvest.sources.map((s) => s.id));
  const versions = new Set(state.harvest.versions.map((v) => v.id));
  if (
    sourceIds.size !== state.harvest.sources.length ||
    versions.size !== state.harvest.versions.length
  )
    throw new Error('Duplicate source or version ids.');
  for (const source of state.harvest.sources)
    if (
      !state.harvest.versions.some(
        (v) => v.sourceId === source.id && v.id === source.currentVersionId,
      )
    )
      throw new Error('Source current version is missing.');
  for (const v of state.harvest.versions)
    if (!sourceIds.has(v.sourceId)) throw new Error('Orphan source version.');
  const topicIds = new Set(state.integration.topics.map((t) => t.id));
  const narrativeVersions = new Set(
    state.integration.narratives.flatMap((n) =>
      n.versions.map((v) => v.versionId),
    ),
  );
  for (const n of state.integration.narratives) {
    if (
      !topicIds.has(n.topicId) ||
      !n.versions.some((v) => v.versionId === n.currentVersionId)
    )
      throw new Error('Narrative topic or current version is missing.');
    for (const v of n.versions)
      if (
        !v.sourceVersionIds.length ||
        v.sourceVersionIds.some((id) => !versions.has(id))
      )
        throw new Error('Narrative original is missing.');
  }
  for (const d of state.integration.documents)
    for (const v of d.versions) {
      if (
        !topicIds.has(d.topicId) ||
        v.citedNarrativeVersionIds.some((id) => !narrativeVersions.has(id)) ||
        v.citedSourceVersionIds.some((id) => !versions.has(id))
      )
        throw new Error('Document evidence is missing.');
      if ((await sha256(v.text)) !== v.approval.acceptedTextHash)
        throw new Error('Accepted document text hash does not match.');
    }
  for (const asset of state.assets)
    if (asset.rightsState !== 'cleared' || typeof asset.text !== 'string')
      throw new Error('Only cleared retained text assets are supported.');
  return clone(state);
}

export async function restoreWorkflowPackage(pkg, collectionId) {
  const state = await validateWorkflowPackage(pkg);
  state.restoreOrigin = {
    packageId: pkg.packageId,
    collectionId: state.collectionId,
  };
  state.collectionId = collectionId;
  state.topics.collectionId = collectionId;
  state.integration.collectionId = collectionId;
  for (const entity of state.topics.entities)
    entity.collectionId = collectionId;
  for (const document of state.integration.documents)
    document.collectionId = collectionId;
  state.pendingIntake = null;
  return synchronizeWorkflow(state);
}

export function workflowCounts(state) {
  return {
    sources: state.harvest.sources.length,
    sourceVersions: state.harvest.versions.length,
    topics: state.integration.topics.length,
    narratives: state.integration.narratives.length,
    documents: state.integration.documents.length,
    archived: state.integration.narratives.filter((n) => n.stage === 'archived')
      .length,
    assets: state.assets.length,
  };
}
