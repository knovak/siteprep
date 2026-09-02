export function finding(code, path, message, severity = 'error') {
  return Object.freeze({code, path, message, severity});
}

export class SceneCoreError extends Error {
  constructor(findings, message = 'Educational Global Maps validation failed') {
    super(message);
    this.name = 'SceneCoreError';
    this.findings = findings;
  }
}

export function assertNoErrors(findings, message) {
  if (findings.some(({severity}) => severity === 'error')) {
    throw new SceneCoreError(findings, message);
  }
}
