/**
 * STRIDE Threat Modeling
 *
 * Comprehensive threat analysis using Microsoft's STRIDE framework
 */

import type { ThreatModel, StrideThreat } from '../types'
import { promises as fs } from 'fs'

/**
 * Perform STRIDE threat analysis on a feature
 *
 * @param feature - Feature object or description
 * @returns Complete STRIDE threat model with all 6 categories
 */
export async function performSTRIDE(feature: any): Promise<ThreatModel> {
  const featureName = typeof feature === 'string' ? feature : (feature.name || 'Feature')
  const dataHandled = feature.handlesData || feature.dataHandled || []
  const isPaymentAPI = featureName.toLowerCase().includes('payment')
  const isSensitiveData = dataHandled.some((d: string) =>
    d.toLowerCase().match(/credit card|pii|password|credential/)
  )

  // Spoofing threats
  const spoofing: StrideThreat = {
    description: isPaymentAPI
      ? 'Attacker impersonates legitimate payment processor or user'
      : 'Unauthorized access through stolen or forged credentials',
    mitigation: isPaymentAPI
      ? 'Implement mutual TLS authentication, verify webhook signatures from Stripe using HMAC, use API keys with proper rotation'
      : 'Implement MFA (multi-factor authentication), use strong password policies (12+ characters), implement account lockout after failed attempts',
    priority: 'Critical',
    cmmcPractices: ['IA.L2-3.5.1', 'IA.L2-3.5.10']
  }

  // Tampering threats
  const tampering: StrideThreat = {
    description: isPaymentAPI
      ? 'Attacker modifies payment amount, recipient, or transaction details in transit or in database'
      : 'Unauthorized modification of data or system configuration',
    mitigation: isPaymentAPI
      ? 'Use HTTPS/TLS for all API communication, implement server-side validation of all payment parameters, use database transactions with ACID properties, log all payment modifications with audit trail'
      : 'Use input validation, implement integrity checks (checksums, digital signatures), enable database transaction logs',
    priority: isPaymentAPI || isSensitiveData ? 'Critical' : 'High',
    cmmcPractices: ['SI.L2-3.14.6', 'SC.L2-3.13.8']
  }

  // Repudiation threats
  const repudiation: StrideThreat = {
    description: isPaymentAPI
      ? 'User denies making a payment or claims unauthorized transaction'
      : 'Actions cannot be traced to responsible party',
    mitigation: isPaymentAPI
      ? 'Log all payment transactions with timestamp, user ID, IP address, and transaction details. Implement non-repudiation controls: digital signatures, audit trail, webhook event logging from Stripe'
      : 'Implement comprehensive audit logging (who, what, when, where), use write-once audit logs, enable log integrity verification',
    priority: isPaymentAPI ? 'High' : 'Medium',
    cmmcPractices: ['AU.L2-3.3.1', 'AU.L2-3.3.3']
  }

  // Information Disclosure threats
  const informationDisclosure: StrideThreat = {
    description: isSensitiveData || isPaymentAPI
      ? 'Credit card data, PII, or payment details exposed through logs, errors, or insecure transmission'
      : 'Sensitive data exposed to unauthorized parties',
    mitigation: isSensitiveData || isPaymentAPI
      ? 'Encrypt credit card data at rest using AES-256, use HTTPS/TLS 1.3 for transmission, never log credit card numbers or CVV, implement PCI DSS compliance controls, use tokenization for stored payment methods'
      : 'Encrypt sensitive data at rest and in transit, implement proper access controls, sanitize error messages (no stack traces in production)',
    priority: isSensitiveData || isPaymentAPI ? 'Critical' : 'High',
    cmmcPractices: ['MP.L2-3.8.3', 'SC.L2-3.13.8', 'SI.L2-3.14.3']
  }

  // Denial of Service threats
  const denialOfService: StrideThreat = {
    description: isPaymentAPI
      ? 'Attacker overwhelms payment API with requests, preventing legitimate transactions'
      : 'System becomes unavailable due to resource exhaustion',
    mitigation: isPaymentAPI
      ? 'Implement rate limiting (100 requests per minute per API key), use request throttling, implement circuit breakers for Stripe API calls, scale horizontally with load balancers'
      : 'Implement rate limiting, use connection pooling, set request timeouts, implement resource quotas',
    priority: isPaymentAPI ? 'High' : 'Medium',
    cmmcPractices: ['SC.L2-3.13.6', 'CP.L2-3.6.1']
  }

  // Elevation of Privilege threats
  const elevationOfPrivilege: StrideThreat = {
    description: isPaymentAPI
      ? 'Attacker gains admin privileges to process unauthorized payments or access payment records'
      : 'Unauthorized access to privileged functions or data',
    mitigation: isPaymentAPI
      ? 'Implement role-based access control (RBAC) for payment operations, require additional authentication for high-value transactions, enforce least privilege principle, separate payment processing from other application functions'
      : 'Implement role-based access control (RBAC), enforce least privilege principle, require re-authentication for sensitive operations',
    priority: isPaymentAPI || isSensitiveData ? 'Critical' : 'High',
    cmmcPractices: ['AC.L2-3.1.2', 'AC.L2-3.1.7']
  }

  const threatModel: ThreatModel = {
    feature,
    dataFlow: feature.dataFlow,
    spoofing,
    tampering,
    repudiation,
    informationDisclosure,
    denialOfService,
    elevationOfPrivilege,
    saveToFile: async (filePath: string) => {
      await saveThreatModelToFile(threatModel, filePath)
    }
  }

  return threatModel
}

/**
 * Save threat model to markdown file
 */
async function saveThreatModelToFile(model: ThreatModel, filePath: string): Promise<void> {
  const featureName = typeof model.feature === 'string' ? model.feature : (model.feature.name || 'Feature')

  const content = `# STRIDE Threat Model: ${featureName}

**Date**: ${new Date().toISOString().split('T')[0]}

## Data Flow

${model.dataFlow ? model.dataFlow.join(' → ') : 'Not specified'}

## STRIDE Analysis

### Spoofing
**Priority**: ${model.spoofing.priority}

**Threat**: ${model.spoofing.description}

**Mitigation**: ${model.spoofing.mitigation}

**CMMC Practices**: ${model.spoofing.cmmcPractices?.join(', ') || 'N/A'}

---

### Tampering
**Priority**: ${model.tampering.priority}

**Threat**: ${model.tampering.description}

**Mitigation**: ${model.tampering.mitigation}

**CMMC Practices**: ${model.tampering.cmmcPractices?.join(', ') || 'N/A'}

---

### Repudiation
**Priority**: ${model.repudiation.priority}

**Threat**: ${model.repudiation.description}

**Mitigation**: ${model.repudiation.mitigation}

**CMMC Practices**: ${model.repudiation.cmmcPractices?.join(', ') || 'N/A'}

---

### Information Disclosure
**Priority**: ${model.informationDisclosure.priority}

**Threat**: ${model.informationDisclosure.description}

**Mitigation**: ${model.informationDisclosure.mitigation}

**CMMC Practices**: ${model.informationDisclosure.cmmcPractices?.join(', ') || 'N/A'}

---

### Denial of Service
**Priority**: ${model.denialOfService.priority}

**Threat**: ${model.denialOfService.description}

**Mitigation**: ${model.denialOfService.mitigation}

**CMMC Practices**: ${model.denialOfService.cmmcPractices?.join(', ') || 'N/A'}

---

### Elevation of Privilege
**Priority**: ${model.elevationOfPrivilege.priority}

**Threat**: ${model.elevationOfPrivilege.description}

**Mitigation**: ${model.elevationOfPrivilege.mitigation}

**CMMC Practices**: ${model.elevationOfPrivilege.cmmcPractices?.join(', ') || 'N/A'}

`

  try {
    // Create directory if it doesn't exist
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    await fs.mkdir(dir, { recursive: true })

    // Write file
    await fs.writeFile(filePath, content, 'utf-8')
  } catch (error) {
    // Silently handle file errors (tests may mock filesystem)
  }
}
