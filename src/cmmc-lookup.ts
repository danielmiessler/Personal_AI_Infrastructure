/**
 * CMMC Level 2 Practice Lookup
 *
 * Quick lookup for CMMC practices referenced in security analysis
 */

import type { CMMCPractice, CMMCDomain } from '../types'

/**
 * CMMC Domain Names
 * Maps domain codes to full domain names
 */
export const cmmcDomainNames: Record<string, string> = {
  'AC': 'Access Control',
  'AT': 'Awareness and Training',
  'AU': 'Audit and Accountability',
  'CA': 'Security Assessment',
  'CM': 'Configuration Management',
  'CP': 'Contingency Planning',
  'IA': 'Identification and Authentication',
  'IR': 'Incident Response',
  'MA': 'Maintenance',
  'MP': 'Media Protection',
  'PE': 'Physical Protection',
  'PS': 'Personnel Security',
  'RA': 'Risk Assessment',
  'RE': 'Recovery',
  'SA': 'System and Services Acquisition',
  'SC': 'System and Communications Protection',
  'SI': 'System and Information Integrity'
}

/**
 * CMMC Level 2 Practices (subset - most commonly referenced)
 */
export const cmmcPractices: Record<string, CMMCPractice> = {
  // Access Control (AC)
  'AC.L2-3.1.1': {
    id: 'AC.L2-3.1.1',
    domain: 'Access Control',
    domainCode: 'AC',
    level: 2,
    name: 'Authorized Access',
    description: 'limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).',
    requirement: 'limit information system access to authorized users',
    implementation: 'Implement authentication middleware on all protected routes. Use role-based access control (RBAC) to enforce authorization. Verify user identity before granting access to system resources.',
    evidence: ['Authentication logs showing user login attempts', 'Access control lists (ACLs) or RBAC configuration', 'Code review showing authentication checks on protected endpoints'],
    nistControls: ['AC-3']
  },
  'AC.L2-3.1.2': {
    id: 'AC.L2-3.1.2',
    domain: 'AC',
    name: 'Transaction Access Control',
    description: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute.',
    nistControls: ['AC-3']
  },
  'AC.L2-3.1.7': {
    id: 'AC.L2-3.1.7',
    domain: 'AC',
    name: 'Rate Limiting',
    description: 'Prevent non-privileged users from executing privileged functions and audit the execution of such functions.',
    nistControls: ['AC-6']
  },
  'AC.L2-3.1.11': {
    id: 'AC.L2-3.1.11',
    domain: 'AC',
    name: 'Session Lock',
    description: 'Terminate (automatically) a user session after a defined condition.',
    nistControls: ['AC-11']
  },

  // Identification & Authentication (IA)
  'IA.L2-3.5.1': {
    id: 'IA.L2-3.5.1',
    domain: 'IA',
    name: 'Multi-Factor Authentication',
    description: 'Use multi-factor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.',
    nistControls: ['IA-2(1)', 'IA-2(2)']
  },
  'IA.L2-3.5.7': {
    id: 'IA.L2-3.5.7',
    domain: 'IA',
    name: 'Password Complexity',
    description: 'Enforce a minimum password complexity and change of characters when new passwords are created.',
    nistControls: ['IA-5(1)']
  },
  'IA.L2-3.5.10': {
    id: 'IA.L2-3.5.10',
    domain: 'Identification and Authentication',
    domainCode: 'IA',
    level: 2,
    name: 'Protected Passwords',
    description: 'Store and transmit only cryptographically-protected passwords.',
    requirement: 'Protect authentication passwords during storage and transmission',
    implementation: 'Use bcrypt, Argon2, or PBKDF2 for password hashing with appropriate cost factors (bcrypt cost 12+). Never store plaintext passwords. Transmit credentials only over HTTPS/TLS. Use salted hashes to prevent rainbow table attacks.',
    evidence: ['Code review showing bcrypt/Argon2 usage for password hashing', 'Configuration showing HTTPS enforcement', 'Security scan results showing no plaintext passwords in database'],
    nistControls: ['IA-5(1)']
  },

  // System Communications (SC)
  'SC.L2-3.13.8': {
    id: 'SC.L2-3.13.8',
    domain: 'System and Communications Protection',
    domainCode: 'SC',
    level: 2,
    name: 'Transmission Confidentiality',
    description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission unless otherwise protected by alternative physical safeguards.',
    requirement: 'Ensure transmission confidentiality and protect data in transit',
    implementation: 'Use HTTPS/TLS 1.2+ for all external communications. Configure TLS with strong cipher suites (AES-256-GCM). Enable HSTS headers to enforce HTTPS. Use VPN or encrypted channels for internal sensitive data transmission.',
    evidence: ['TLS certificate configuration and renewal process', 'Network traffic analysis showing encrypted communications', 'HSTS header configuration in web server'],
    nistControls: ['SC-8']
  },
  'SC.L2-3.13.10': {
    id: 'SC.L2-3.13.10',
    domain: 'SC',
    name: 'Session Authenticity',
    description: 'Establish and manage cryptographic keys for cryptography employed in organizational systems.',
    nistControls: ['SC-12']
  },
  'SC.L2-3.13.11': {
    id: 'SC.L2-3.13.11',
    domain: 'SC',
    name: 'Cryptographic Mechanisms',
    description: 'Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.',
    nistControls: ['SC-13']
  },
  'SC.L2-3.13.15': {
    id: 'SC.L2-3.13.15',
    domain: 'SC',
    name: 'Security Headers',
    description: 'Protect the authenticity of communications sessions.',
    nistControls: ['SC-23']
  },
  'SC.L2-3.13.6': {
    id: 'SC.L2-3.13.6',
    domain: 'SC',
    name: 'Network Communications',
    description: 'Deny network communications traffic by default and allow network communications traffic by exception (i.e., deny all, permit by exception).',
    nistControls: ['SC-7']
  },

  // System Integrity (SI)
  'SI.L2-3.14.3': {
    id: 'SI.L2-3.14.3',
    domain: 'SI',
    name: 'Error Handling',
    description: 'Monitor organizational systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.',
    nistControls: ['SI-4']
  },
  'SI.L2-3.14.6': {
    id: 'SI.L2-3.14.6',
    domain: 'System and Information Integrity',
    domainCode: 'SI',
    level: 2,
    name: 'Input Validation',
    description: 'Monitor organizational systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.',
    requirement: 'Check the validity of all input and reject malicious input',
    implementation: 'Validate all user inputs using allowlists/denylists. Use parameterized queries for database operations. Sanitize inputs before processing. Implement input length limits. Reject special characters in contexts where not expected (e.g., SQL, JavaScript).',
    evidence: ['Code review showing parameterized queries instead of string concatenation', 'Input validation middleware implementation', 'Penetration test results showing SQL injection prevention'],
    nistControls: ['SI-10']
  },
  'SI.L2-3.14.7': {
    id: 'SI.L2-3.14.7',
    domain: 'SI',
    name: 'CSRF Protection',
    description: 'Identify unauthorized use of organizational systems.',
    nistControls: ['SI-7']
  },

  // Audit & Accountability (AU)
  'AU.L2-3.3.1': {
    id: 'AU.L2-3.3.1',
    domain: 'AU',
    name: 'Audit Events',
    description: 'Create, protect, and retain information system audit records to the extent needed to enable monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate information system activity.',
    nistControls: ['AU-2', 'AU-3', 'AU-11']
  },

  // Configuration Management (CM)
  'CM.L2-3.4.2': {
    id: 'CM.L2-3.4.2',
    domain: 'CM',
    name: 'Baseline Configuration',
    description: 'Establish and maintain baseline configurations and inventories of organizational systems (including hardware, software, firmware, and documentation) throughout the respective system development life cycles.',
    nistControls: ['CM-2']
  },
  'CM.L2-3.4.3': {
    id: 'CM.L2-3.4.3',
    domain: 'CM',
    name: 'Change Control',
    description: 'Track, review, approve/disapprove, and audit changes to organizational systems.',
    nistControls: ['CM-3']
  },

  // Contingency Planning (CP)
  'CP.L2-3.6.1': {
    id: 'CP.L2-3.6.1',
    domain: 'CP',
    name: 'Backup',
    description: 'Establish and maintain baseline configurations and inventories of organizational systems.',
    nistControls: ['CP-9']
  },

  // Incident Response (IR)
  'IR.L2-3.6.1': {
    id: 'IR.L2-3.6.1',
    domain: 'IR',
    name: 'Incident Response',
    description: 'Establish an operational incident-handling capability for organizational systems that includes adequate preparation, detection, analysis, containment, recovery, and user response activities.',
    nistControls: ['IR-4', 'IR-5', 'IR-6']
  },

  // Media Protection (MP)
  'MP.L2-3.8.3': {
    id: 'MP.L2-3.8.3',
    domain: 'MP',
    name: 'Data at Rest Encryption',
    description: 'Control the use of removable media on organizational systems.',
    nistControls: ['MP-7']
  },

  // Risk Assessment (RA)
  'RA.L2-3.11.2': {
    id: 'RA.L2-3.11.2',
    domain: 'RA',
    name: 'Vulnerability Scanning',
    description: 'Scan for vulnerabilities in organizational systems and applications periodically and when new vulnerabilities affecting the systems are identified.',
    nistControls: ['RA-5']
  },

  // System Acquisition (SA)
  'SA.L2-3.13.3': {
    id: 'SA.L2-3.13.3',
    domain: 'SA',
    name: 'Supply Chain',
    description: 'Review and update policies and procedures that address purpose, scope, roles, responsibilities, management commitment, coordination among organizational entities, and compliance.',
    nistControls: ['SA-12']
  },

  // Awareness Training (AT)
  'AT.L2-3.2.1': {
    id: 'AT.L2-3.2.1',
    domain: 'AT',
    name: 'Security Awareness',
    description: 'Ensure that managers, systems administrators, and users of organizational systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures related to the security of those systems.',
    nistControls: ['AT-2']
  }
}

/**
 * Lookup CMMC practice by ID
 */
export function lookupCMMCPractice(practiceId: string): CMMCPractice | undefined {
  return cmmcPractices[practiceId]
}

/**
 * Get all practices for a domain
 */
export function getCMMCDomainPractices(domain: CMMCDomain): CMMCPractice[] {
  return Object.values(cmmcPractices).filter(practice => practice.domain === domain)
}

/**
 * Check if practice ID is valid
 */
export function isValidCMMCPractice(practiceId: string): boolean {
  return practiceId in cmmcPractices
}
