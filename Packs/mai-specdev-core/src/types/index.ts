/**
 * Type exports for mai-specdev-core
 */

export type {
  SpecStatus,
  SpecMetadata,
  InterfaceDefinition,
  ApiContract,
  EventContract,
  SpecSections,
  SpecApproval,
  SpecDocument,
} from './spec.ts';

export {
  createSpecDocument,
  validateSpec,
  updateSpecStatus,
  approveSpec,
} from './spec.ts';

export type {
  DesignStatus,
  DesignMetadata,
  Component,
  DataFlowDiagram,
  DataFlowNode,
  DataFlowEdge,
  TestStrategy,
  SecurityControl,
  DesignSections,
  DesignApproval,
  DesignDocument,
} from './design.ts';

export {
  createDesignDocument,
  validateDesign,
  addComponent,
  approveDesign,
} from './design.ts';

export type {
  LintingConfig,
  TypeCheckConfig,
  FormattingConfig,
  CoverageConfig,
  QualityGateConfig,
  QualityCheckStatus,
  QualityCheckResult,
  QualityReport,
} from './quality.ts';

export {
  createDefaultQualityConfig,
  createBunQualityConfig,
  createQualityReport,
  allQualityGatesPassed,
  getFailedGates,
} from './quality.ts';

export type {
  SecurityPhase,
  SecuritySeverity,
  SecurityCheckStatus,
  SecurityCheckItem,
  SecurityChecklist,
  SecurityReport,
} from './security.ts';

export {
  DEFAULT_SECURITY_CHECKS,
  createSecurityChecklist,
  updateSecurityCheck,
  createSecurityReport,
  phaseSecurityPassed,
  getSecurityFailures,
} from './security.ts';
