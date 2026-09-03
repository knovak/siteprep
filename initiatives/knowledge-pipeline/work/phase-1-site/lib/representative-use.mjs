export const REQUIRED_WITNESSED_ACTIONS = Object.freeze([
  'import-direct',
  'import-browser-saved',
  'import-native-adapter',
  'correct-tags-and-assessments',
  'promote-and-defer',
  'assign-one-source-to-two-topics',
  'rewrite-narrative',
  'trace-retained-original',
  'review-documented-topic',
  'review-undocumented-topic',
  'rewrite-or-reject-document-change',
  'approve-standing-document',
  'archive-four-dispositions',
  'reopen-narrative',
]);

export const REQUIRED_MEASUREMENTS = Object.freeze([
  'sourceCount',
  'assetCount',
  'reviewMinutes',
  'correctionCount',
  'storageBytes',
  'exportMilliseconds',
  'restoreMilliseconds',
  'operatorMinutes',
]);

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

export function validateRepresentativeUseRecord(record) {
  const findings = [];
  if (record?.schema !== 'knowledge-pipeline/representative-use/v1')
    findings.push('representative.schema');
  if (record?.sourceSet?.rightsSafe !== true)
    findings.push('representative.source_set.rights');
  if (
    record?.independentWitness?.status !== 'witnessed' ||
    record?.independentWitness?.independentOfImplementation !== true ||
    !record?.independentWitness?.role
  )
    findings.push('representative.independent_witness.required');
  const actions = new Map(
    (record?.independentWitness?.actions ?? []).map((action) => [
      action.id,
      action,
    ]),
  );
  for (const id of REQUIRED_WITNESSED_ACTIONS)
    if (actions.get(id)?.status !== 'passed')
      findings.push(`representative.action.required:${id}`);
  for (const key of REQUIRED_MEASUREMENTS)
    if (!isNonNegativeNumber(record?.measurements?.[key]))
      findings.push(`representative.measurement.required:${key}`);
  if (record?.exports?.webAndAdminEquivalent !== true)
    findings.push('representative.exports.web_admin_equivalence');
  if (record?.recovery?.disposableRestore !== 'passed')
    findings.push('representative.recovery.disposable_restore');
  if (record?.offlineContinuity?.acceptedKnowledgeUsable !== true)
    findings.push('representative.offline.accepted_knowledge');
  if (record?.isolation?.crossCollectionLeakage !== false)
    findings.push('representative.isolation.cross_collection');
  if (!['passed', 'inactive-not-authorized'].includes(record?.schedule?.status))
    findings.push('representative.schedule.status');
  return findings;
}

export function representativeUseStatus(record) {
  const findings = validateRepresentativeUseRecord(record);
  return {
    status: findings.length ? 'pending' : 'complete',
    findings,
  };
}

export function compareDistributionTopologies(record) {
  const observations = record?.distributionObservations ?? {};
  const common = [];
  if (record?.recovery?.disposableRestore !== 'passed')
    common.push('repeatable disposable restore is not yet witnessed');
  if (record?.independentWitness?.status !== 'witnessed')
    common.push('representative operator burden is not yet witnessed');
  const topologies = [
    {
      id: 'one-multi-user-website',
      evidenceFor: observations.sharingRequested === true
        ? ['the representative user requested shared work']
        : [],
      evidenceMissing: [
        ...common,
        'workspace isolation, invitation, support, storage, and model-cost evidence',
      ],
    },
    {
      id: 'self-maintained-kit-per-user',
      evidenceFor: observations.selfHostingRequired === true
        ? ['the representative user required self-hosting']
        : [],
      evidenceMissing: [
        ...common,
        'a target user has not maintained installation, backup, upgrade, and recovery',
      ],
    },
    {
      id: 'maintainer-operated-single-user-sites',
      evidenceFor:
        record?.isolation?.crossCollectionLeakage === false
          ? ['single-space isolation held in the recorded exercise']
          : [],
      evidenceMissing: [
        ...common,
        'multi-instance migration, monitoring, secret, support, and cost evidence',
      ],
    },
    {
      id: 'skills-and-apps-over-portable-boundaries',
      evidenceFor:
        record?.offlineContinuity?.acceptedKnowledgeUsable === true
          ? ['accepted knowledge remained usable without model, skill, app, or remote body']
          : [],
      evidenceMissing: [
        ...common,
        'stable authenticated actions, understandable consent, and non-chat administration evidence',
      ],
    },
  ];
  return {
    schema: 'knowledge-pipeline/distribution-comparison/v1',
    topologies,
    recommendation: null,
    conclusion:
      'Keep all four topologies open; one bounded exercise is evidence, not a permanent distribution verdict.',
  };
}

export function createRepresentativeUseTemplate({createdAt}) {
  return {
    schema: 'knowledge-pipeline/representative-use/v1',
    createdAt,
    sourceSet: {
      name: 'Community heat resilience project-authored fixture',
      rightsSafe: true,
      intakePaths: [
        'direct',
        'browser-saved',
        'bookmark-sorter/v1',
        'newsletter-story-harvester/v1',
      ],
      publishesData: false,
    },
    independentWitness: {
      status: 'needed',
      role: null,
      independentOfImplementation: null,
      actions: REQUIRED_WITNESSED_ACTIONS.map((id) => ({id, status: 'pending'})),
      corrections: [],
      comprehensionProblems: [],
    },
    measurements: Object.fromEntries(
      REQUIRED_MEASUREMENTS.map((key) => [key, null]),
    ),
    exports: {webAndAdminEquivalent: true, packageHash: null},
    recovery: {
      disposableRestore: 'pending-live-test',
      originalSiteSecretRequired: false,
    },
    schedule: {status: 'inactive-not-authorized'},
    offlineContinuity: {
      modelAvailable: false,
      skillAvailable: false,
      appAvailable: false,
      remoteSourceBodiesAvailable: false,
      acceptedKnowledgeUsable: true,
    },
    isolation: {crossCollectionLeakage: false, findings: []},
    distributionObservations: {
      sharingRequested: null,
      selfHostingRequired: null,
      operatorNotes: null,
    },
  };
}
