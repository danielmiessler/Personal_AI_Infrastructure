/**
 * Gate - Configurable checkpoint that blocks progress
 */

export type GateStatus = 'pending' | 'approved' | 'rejected';

export interface Gate {
  id: string;
  name: string;
  description: string;
  status: GateStatus;
  approver?: string;
  approvedAt?: string;       // ISO timestamp
  rejectedAt?: string;       // ISO timestamp
  comments?: string;
}

export type SoftwareGate =
  | 'SPEC_APPROVED'
  | 'DESIGN_APPROVED'
  | 'TESTS_EXIST'
  | 'TESTS_PASSING'
  | 'SECURITY_REVIEW'
  | 'QUALITY_CHECK';

export type PhysicalGate =
  | 'DESIGN_APPROVED'
  | 'BUDGET_APPROVED'
  | 'SAFETY_REVIEW'
  | 'PERMIT_CHECK';

export type DocumentationGate =
  | 'OUTLINE_APPROVED'
  | 'DRAFT_REVIEW'
  | 'FINAL_REVIEW';

export type InfrastructureGate =
  | 'DESIGN_APPROVED'
  | 'SECURITY_REVIEW'
  | 'ROLLBACK_PLAN';

/**
 * Gate configurations by project type
 */
export const GATE_CONFIGS: Record<string, string[]> = {
  software: ['SPEC_APPROVED', 'DESIGN_APPROVED', 'TESTS_EXIST', 'TESTS_PASSING', 'SECURITY_REVIEW', 'QUALITY_CHECK'],
  physical: ['DESIGN_APPROVED', 'BUDGET_APPROVED', 'SAFETY_REVIEW', 'PERMIT_CHECK'],
  documentation: ['OUTLINE_APPROVED', 'DRAFT_REVIEW', 'FINAL_REVIEW'],
  infrastructure: ['DESIGN_APPROVED', 'SECURITY_REVIEW', 'ROLLBACK_PLAN'],
};

/**
 * Get description for a gate name
 */
function getGateDescription(gateName: string): string {
  const descriptions: Record<string, string> = {
    SPEC_APPROVED: 'Specification reviewed and approved by owner',
    DESIGN_APPROVED: 'Design document reviewed and approved',
    TESTS_EXIST: 'Test cases written for all requirements',
    TESTS_PASSING: 'All tests passing',
    SECURITY_REVIEW: 'Security review completed',
    QUALITY_CHECK: 'Linting, type checking, and formatting pass',
    BUDGET_APPROVED: 'Budget reviewed and approved',
    SAFETY_REVIEW: 'Safety considerations reviewed',
    PERMIT_CHECK: 'Required permits obtained',
    OUTLINE_APPROVED: 'Document outline approved',
    DRAFT_REVIEW: 'Draft reviewed',
    FINAL_REVIEW: 'Final review completed',
    ROLLBACK_PLAN: 'Rollback plan documented',
  };
  return descriptions[gateName] || gateName;
}

/**
 * Create gates for a project type
 */
export function createGatesForProject(projectType: string): Gate[] {
  const gateNames = GATE_CONFIGS[projectType] || GATE_CONFIGS.software;
  return gateNames.map(name => ({
    id: name.toLowerCase().replace(/_/g, '-'),
    name,
    description: getGateDescription(name),
    status: 'pending' as GateStatus,
  }));
}

/**
 * Approve a gate
 */
export function approveGate(gate: Gate, approver: string, comments?: string): Gate {
  return {
    ...gate,
    status: 'approved',
    approver,
    approvedAt: new Date().toISOString(),
    comments,
  };
}

/**
 * Reject a gate
 */
export function rejectGate(gate: Gate, approver: string, comments: string): Gate {
  return {
    ...gate,
    status: 'rejected',
    approver,
    rejectedAt: new Date().toISOString(),
    comments,
  };
}

/**
 * Check if all gates are approved
 */
export function allGatesApproved(gates: Gate[]): boolean {
  return gates.every(gate => gate.status === 'approved');
}

/**
 * Get the next pending gate
 */
export function getNextPendingGate(gates: Gate[]): Gate | undefined {
  return gates.find(gate => gate.status === 'pending');
}

/**
 * Get the current phase based on gate status
 */
export function getCurrentPhase(gates: Gate[]): string {
  const approved = gates.filter(g => g.status === 'approved').map(g => g.name);
  const pending = getNextPendingGate(gates);

  if (allGatesApproved(gates)) {
    return 'COMPLETE';
  }

  if (approved.includes('DESIGN_APPROVED') || approved.includes('OUTLINE_APPROVED')) {
    return 'BUILD';
  }

  if (approved.includes('SPEC_APPROVED')) {
    return 'DESIGN';
  }

  return 'SPEC';
}
