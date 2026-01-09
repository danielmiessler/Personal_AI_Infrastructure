/**
 * Security Checklist Types
 *
 * Types for security review checklists throughout development phases.
 */

export type SecurityPhase = 'spec' | 'design' | 'build' | 'test' | 'ship';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';
export type SecurityCheckStatus = 'pending' | 'pass' | 'fail' | 'na';

export interface SecurityCheckItem {
  id: string;
  description: string;
  severity: SecuritySeverity;
  automated: boolean;
  tool?: string;
  status: SecurityCheckStatus;
  notes?: string;
  remediation?: string;
}

export interface SecurityChecklist {
  phase: SecurityPhase;
  items: SecurityCheckItem[];
}

export interface SecurityReport {
  timestamp: string;
  projectName: string;
  phase: SecurityPhase;
  checklist: SecurityChecklist;
  summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    notApplicable: number;
  };
  criticalIssues: SecurityCheckItem[];
}

/**
 * Default security checks by phase
 */
export const DEFAULT_SECURITY_CHECKS: Record<SecurityPhase, Omit<SecurityCheckItem, 'status' | 'notes'>[]> = {
  spec: [
    { id: 'spec-1', description: 'Identify sensitive data that will be handled', severity: 'high', automated: false },
    { id: 'spec-2', description: 'Document authentication requirements', severity: 'critical', automated: false },
    { id: 'spec-3', description: 'Document authorization requirements', severity: 'critical', automated: false },
    { id: 'spec-4', description: 'Identify external dependencies and their trust levels', severity: 'medium', automated: false },
    { id: 'spec-5', description: 'Document compliance requirements (GDPR, HIPAA, etc)', severity: 'high', automated: false },
  ],
  design: [
    { id: 'design-1', description: 'Validate input at system boundaries', severity: 'critical', automated: false },
    { id: 'design-2', description: 'Define encryption for data at rest', severity: 'high', automated: false },
    { id: 'design-3', description: 'Define encryption for data in transit', severity: 'high', automated: false },
    { id: 'design-4', description: 'Design rate limiting for public endpoints', severity: 'medium', automated: false },
    { id: 'design-5', description: 'Plan for audit logging', severity: 'medium', automated: false },
  ],
  build: [
    { id: 'build-1', description: 'Run dependency vulnerability scan', severity: 'critical', automated: true, tool: 'npm audit / bun audit' },
    { id: 'build-2', description: 'Check for hardcoded secrets', severity: 'critical', automated: true, tool: 'gitleaks / trufflehog' },
    { id: 'build-3', description: 'Run static analysis for security issues', severity: 'high', automated: true, tool: 'semgrep / eslint-plugin-security' },
    { id: 'build-4', description: 'Validate all inputs are sanitized', severity: 'high', automated: false },
    { id: 'build-5', description: 'Review error handling for info leakage', severity: 'medium', automated: false },
  ],
  test: [
    { id: 'test-1', description: 'Test authentication bypass scenarios', severity: 'critical', automated: false },
    { id: 'test-2', description: 'Test authorization boundary conditions', severity: 'critical', automated: false },
    { id: 'test-3', description: 'Test injection vulnerabilities', severity: 'critical', automated: true, tool: 'sqlmap / zap' },
    { id: 'test-4', description: 'Test XSS vulnerabilities', severity: 'high', automated: true, tool: 'zap / burp' },
    { id: 'test-5', description: 'Verify error messages are safe', severity: 'medium', automated: false },
  ],
  ship: [
    { id: 'ship-1', description: 'Remove debug code and comments', severity: 'medium', automated: false },
    { id: 'ship-2', description: 'Verify production environment variables', severity: 'critical', automated: false },
    { id: 'ship-3', description: 'Enable security headers', severity: 'high', automated: true, tool: 'securityheaders.com' },
    { id: 'ship-4', description: 'Configure WAF rules if applicable', severity: 'high', automated: false },
    { id: 'ship-5', description: 'Set up security monitoring and alerting', severity: 'high', automated: false },
  ],
};

/**
 * Create a security checklist for a phase
 */
export function createSecurityChecklist(phase: SecurityPhase): SecurityChecklist {
  const defaultItems = DEFAULT_SECURITY_CHECKS[phase];
  return {
    phase,
    items: defaultItems.map(item => ({
      ...item,
      status: 'pending' as SecurityCheckStatus,
    })),
  };
}

/**
 * Update a security check item status
 */
export function updateSecurityCheck(
  checklist: SecurityChecklist,
  itemId: string,
  status: SecurityCheckStatus,
  notes?: string
): SecurityChecklist {
  return {
    ...checklist,
    items: checklist.items.map(item =>
      item.id === itemId
        ? { ...item, status, notes }
        : item
    ),
  };
}

/**
 * Create a security report from a checklist
 */
export function createSecurityReport(
  projectName: string,
  checklist: SecurityChecklist
): SecurityReport {
  const passed = checklist.items.filter(i => i.status === 'pass').length;
  const failed = checklist.items.filter(i => i.status === 'fail').length;
  const pending = checklist.items.filter(i => i.status === 'pending').length;
  const notApplicable = checklist.items.filter(i => i.status === 'na').length;
  const criticalIssues = checklist.items.filter(i => i.status === 'fail' && i.severity === 'critical');

  return {
    timestamp: new Date().toISOString(),
    projectName,
    phase: checklist.phase,
    checklist,
    summary: {
      total: checklist.items.length,
      passed,
      failed,
      pending,
      notApplicable,
    },
    criticalIssues,
  };
}

/**
 * Check if a phase is ready to proceed (no critical failures)
 */
export function phaseSecurityPassed(report: SecurityReport): boolean {
  return report.criticalIssues.length === 0 &&
    report.summary.failed === 0;
}

/**
 * Get all failing items sorted by severity
 */
export function getSecurityFailures(checklist: SecurityChecklist): SecurityCheckItem[] {
  const severityOrder: Record<SecuritySeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return checklist.items
    .filter(item => item.status === 'fail')
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
