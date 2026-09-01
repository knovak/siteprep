export class CustodyError extends Error {
  constructor(findings, message = 'Custody validation failed') {
    super(message);
    this.name = 'CustodyError';
    this.findings = findings;
  }
}

export function finding(code, path, message, severity = 'error') {
  return {code, path, message, severity};
}

export function assertNoErrors(findings) {
  if (findings.some(({severity}) => severity === 'error')) {
    throw new CustodyError(findings);
  }
}
