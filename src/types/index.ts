/**
 * FORGE Type Definitions
 *
 * Core types for multi-agent security analysis
 */

// ============================================================================
// Security Analysis Types
// ============================================================================

/**
 * Security analysis result from Daniel's reviewCode() function
 */
export interface SecurityAnalysis {
  /** Whether a vulnerability was detected */
  detected: boolean

  /** Vulnerability name (e.g., "SQL Injection", "XSS") */
  vulnerability: string

  /** STRIDE threat category */
  strideCategory: StrideCategory

  /** Severity level */
  severity: SeverityLevel

  /** OWASP Top 10 reference (e.g., "A03") */
  owasp: string

  /** CMMC Level 2 practice reference (e.g., "SI.L2-3.14.6") */
  cmmc: string

  /** CMMC domain name (e.g., "Access Control", "System Integrity") */
  cmmcDomain?: string

  /** CMMC practice description (human-readable text) */
  cmmcPractice?: string

  /** Mitigation recommendation (what to do to fix) */
  mitigation: string

  /** Code example showing secure implementation (optional) */
  codeExample?: string

  /** Additional threats found (for multi-threat scenarios) */
  threats?: SecurityThreat[]
}

/**
 * Individual security threat (for STRIDE analysis)
 */
export interface SecurityThreat {
  category: StrideCategory
  description: string
  severity: SeverityLevel
  mitigation: string
  cmmcPractice?: string
}

/**
 * STRIDE threat categories
 */
export type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'Information Disclosure'
  | 'Denial of Service'
  | 'Elevation of Privilege'

/**
 * Severity levels for vulnerabilities
 */
export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low'

// ============================================================================
// CMMC Types
// ============================================================================

/**
 * CMMC Level 2 practice
 */
export interface CMMCPractice {
  /** Practice ID (e.g., "SI.L2-3.14.6") */
  id: string

  /** Domain (e.g., "SI" = System Integrity) */
  domain: string | CMMCDomain

  /** Domain code (e.g., "SI") */
  domainCode?: string

  /** CMMC level (1, 2, or 3) */
  level?: number

  /** Practice name */
  name: string

  /** Practice description */
  description: string

  /** Practice requirement (what must be done) */
  requirement?: string

  /** Implementation guidance */
  implementation?: string

  /** Evidence requirements */
  evidence?: string | string[]

  /** Related NIST controls */
  nistControls?: string[]
}

/**
 * CMMC Level 2 domains
 */
export type CMMCDomain =
  | 'AC'  // Access Control
  | 'AT'  // Awareness Training
  | 'AU'  // Audit & Accountability
  | 'CA'  // Security Assessment
  | 'CM'  // Configuration Management
  | 'CP'  // Contingency Planning
  | 'IA'  // Identification & Authentication
  | 'IR'  // Incident Response
  | 'MA'  // Maintenance
  | 'MP'  // Media Protection
  | 'PE'  // Physical Protection
  | 'PS'  // Personnel Security
  | 'RA'  // Risk Assessment
  | 'RE'  // Recovery
  | 'SA'  // System Acquisition
  | 'SC'  // System Communications
  | 'SI'  // System Integrity

// ============================================================================
// Vulnerability Pattern Types
// ============================================================================

/**
 * Vulnerability detection pattern
 */
export interface VulnerabilityPattern {
  /** Pattern name */
  name: string

  /** Regex patterns to detect this vulnerability */
  patterns: RegExp[]

  /** STRIDE category */
  strideCategory: StrideCategory

  /** Severity level */
  severity: SeverityLevel

  /** OWASP reference */
  owasp: string

  /** CMMC practice */
  cmmc: string

  /** Mitigation template */
  mitigation: string

  /** Code example template */
  codeExample?: string
}

// ============================================================================
// Standup Types
// ============================================================================

/**
 * Standup context for multi-agent conversations
 */
export interface StandupContext {
  /** Feature or decision being discussed */
  feature: string

  /** Agent roster (e.g., ['Mary', 'Clay', 'Hefley', 'Daniel']). If not provided, smart defaults will be suggested based on feature. */
  roster?: string[]

  /** Feature description (optional) */
  description?: string

  /** Question to discuss (optional) */
  question?: string

  /** Which agent the question is for (optional) */
  questionFor?: string

  /** Design document or API design (optional) */
  designDoc?: any

  /** Decision object (optional) */
  decision?: any

  /** Project context file path (optional) */
  projectContext?: string

  /** Additional context (optional) */
  context?: Record<string, unknown>

  /** Code snippet to review (optional) */
  codeSnippet?: string
}

/**
 * Standup result with agent contributions
 */
export interface StandupResult {
  /** List of participants */
  participants: string[]

  /** Agent contributions */
  [agentName: string]: AgentContribution | any

  /** Synthesis/decision (optional) */
  synthesis?: {
    decision: string
    [key: string]: any
  }

  /** Conflicts between agents (optional) */
  conflicts?: any[]

  /** Record decision to file */
  recordDecision?: (filePath: string) => Promise<void>

  /** Record audit trail to file */
  recordAuditTrail?: (filePath: string) => Promise<void>
}

/**
 * Individual agent contribution to standup
 */
export interface AgentContribution {
  /** Agent's analysis */
  analysis?: string

  /** Agent's recommendation (single or array) */
  recommendation?: string
  recommendations?: string[]

  /** Agent's response (for questions) */
  response?: string

  /** Agent defers to another agent */
  deferTo?: string

  /** Agent's focus area */
  focus?: string

  /** Security-specific fields (Daniel) */
  strideCategory?: StrideCategory
  strideCategories?: StrideCategory[]
  threats?: string[] | Array<{ description: string; priority: SeverityLevel; timeline: string; mitigation: string }>
  severity?: SeverityLevel
  cmmc?: string
  cmmcReferences?: string[]
  vulnerability?: string
  mitigation?: string
  owaspReference?: string
  codeExamples?: string[]

  /** CMMC-specific fields */
  cmmcViolations?: Array<{
    practice: string
    domainCode?: string
    severity: SeverityLevel
    description?: string
    remediation: string
    status?: string
  }>
  cmmcPracticesChecked?: Array<{ id: string; domainCode: string }>
  auditTrail?: {
    date: string
    participants: string[]
    feature: string
    practicesChecked: string[]
    violationsFound: Array<{
      practice: string
      severity: SeverityLevel
      description: string
      remediation: string
      status: string
    }>
    decisions?: any[]
  }

  /** Clay (Tech Lead) specific fields */
  timeline?: string
  risk?: string

  /** Hefley (Product Manager) specific fields */
  priority?: string

  /** Amy (QA Lead) specific fields */
  testRequirements?: {
    unit?: number
    integration?: number
    e2e?: number
    security?: number
    total?: number
  }
  coverageTarget?: string
}

// ============================================================================
// Threat Modeling Types
// ============================================================================

/**
 * Individual STRIDE threat with mitigation
 */
export interface StrideThreat {
  /** Threat description */
  description?: string

  /** Mitigation strategy */
  mitigation: string

  /** Priority/severity level */
  priority: SeverityLevel

  /** Attack scenario (optional) */
  scenario?: string

  /** Related CMMC practices (optional) */
  cmmcPractices?: string[]
}

/**
 * Complete STRIDE threat model
 */
export interface ThreatModel {
  /** Feature/component being modeled */
  feature?: string | any

  /** Data flow (optional) */
  dataFlow?: string[]

  /** STRIDE categories */
  spoofing: StrideThreat
  tampering: StrideThreat
  repudiation: StrideThreat
  informationDisclosure: StrideThreat
  denialOfService: StrideThreat
  elevationOfPrivilege: StrideThreat

  /** Save threat model to file */
  saveToFile?: (filePath: string) => Promise<void>
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  SecurityAnalysis,
  SecurityThreat,
  StrideCategory,
  SeverityLevel,
  CMMCPractice,
  CMMCDomain,
  VulnerabilityPattern,
  StandupContext,
  StandupResult,
  AgentContribution,
  StrideThreat,
  ThreatModel
}
