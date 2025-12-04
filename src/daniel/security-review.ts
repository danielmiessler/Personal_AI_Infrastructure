/**
 * Daniel's Security Review Logic
 *
 * Core reviewCode() function that detects vulnerabilities using pattern matching
 */

import type { SecurityAnalysis } from '../types'
import { allVulnerabilityPatterns } from './vulnerability-patterns'
import { lookupCMMCPractice, cmmcDomainNames } from './cmmc-lookup'

/**
 * Review code for security vulnerabilities
 *
 * @param code - Code snippet to analyze
 * @returns Security analysis with vulnerability details
 */
export async function reviewCode(code: string): Promise<SecurityAnalysis> {
  // Try to match against all vulnerability patterns
  for (const pattern of allVulnerabilityPatterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(code)) {
        // Found a match! Look up CMMC practice details
        const cmmcDetails = lookupCMMCPractice(pattern.cmmc)

        // Return security analysis
        return {
          detected: true,
          vulnerability: pattern.name,
          strideCategory: pattern.strideCategory,
          severity: pattern.severity,
          owasp: pattern.owasp,
          cmmc: pattern.cmmc,
          cmmcDomain: cmmcDetails?.domain || (cmmcDetails?.domainCode ? cmmcDomainNames[cmmcDetails.domainCode] : undefined),
          cmmcPractice: cmmcDetails?.description,
          mitigation: pattern.mitigation,
          codeExample: pattern.codeExample
        }
      }
    }
  }

  // No vulnerabilities detected
  return {
    detected: false,
    vulnerability: 'No vulnerabilities detected',
    strideCategory: 'Information Disclosure', // Default (unused)
    severity: 'Low',
    owasp: 'N/A',
    cmmc: 'N/A',
    mitigation: 'Code appears secure. Continue following security best practices.',
    codeExample: undefined
  }
}

/**
 * Perform STRIDE threat analysis on code
 *
 * Returns all threats found across all STRIDE categories
 */
export async function performSTRIDE(code: string): Promise<SecurityAnalysis> {
  const threats = []

  // Scan for all matching patterns
  for (const pattern of allVulnerabilityPatterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(code)) {
        threats.push({
          category: pattern.strideCategory,
          description: pattern.name,
          severity: pattern.severity,
          mitigation: pattern.mitigation,
          cmmcPractice: pattern.cmmc
        })
        break // Only add each pattern once
      }
    }
  }

  if (threats.length === 0) {
    return {
      detected: false,
      vulnerability: 'No threats detected',
      strideCategory: 'Information Disclosure',
      severity: 'Low',
      owasp: 'N/A',
      cmmc: 'N/A',
      mitigation: 'Code appears secure.',
      threats: []
    }
  }

  // Return first threat as primary, others in threats array
  const primary = threats[0]
  const pattern = allVulnerabilityPatterns.find(p => p.name === primary.description)
  const cmmcDetails = lookupCMMCPractice(primary.cmmcPractice || '')

  return {
    detected: true,
    vulnerability: primary.description,
    strideCategory: primary.category,
    severity: primary.severity,
    owasp: pattern?.owasp || 'N/A',
    cmmc: primary.cmmcPractice || 'N/A',
    cmmcDomain: cmmcDetails?.domain || (cmmcDetails?.domainCode ? cmmcDomainNames[cmmcDetails.domainCode] : undefined),
    cmmcPractice: cmmcDetails?.description,
    mitigation: primary.mitigation,
    codeExample: pattern?.codeExample,
    threats
  }
}
