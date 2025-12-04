#!/usr/bin/env node
/**
 * Risk Scorer - Automates risk assessment for features/modules
 *
 * Purpose: Automate risk-based testing by:
 * 1. Calculating risk scores for features (Business, Complexity, Change Freq, Compliance, Security)
 * 2. Assigning risk levels (Critical/High/Medium/Low)
 * 3. Recommending coverage targets
 * 4. Generating risk matrix reports
 *
 * Usage:
 *   npm install -g @forge/risk-scorer
 *   risk-scorer assess --feature auth
 *   risk-scorer matrix
 *   risk-scorer recommend --feature cart
 *
 * Integration:
 * - Sprint planning: Generate risk matrix for all features
 * - Test strategy: Determine coverage targets by risk
 * - CI/CD: Enforce coverage targets in quality gates
 */

import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

// Types
interface RiskFactors {
  businessCriticality: number  // 1-5 (5 = critical)
  technicalComplexity: number  // 1-5 (5 = very complex)
  changeFrequency: number      // 1-5 (5 = changes multiple times per sprint)
  compliance: number           // 1-5 (5 = CMMC/HIPAA/PCI-DSS audit required)
  security: number             // 1-5 (5 = authentication/authorization/encryption)
}

interface RiskAssessment {
  feature: string
  filePath?: string
  factors: RiskFactors
  riskScore: number  // 1.0-5.0 (weighted average)
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Very Low'
  coverageTarget: string  // e.g., "90-100%"
  testTypes: string[]  // e.g., ["Unit", "Integration", "E2E", "Security"]
  justification?: Record<string, string>  // Why each score was assigned
}

interface RiskMatrix {
  features: RiskAssessment[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    veryLow: number
  }
  testEffortAllocation: Record<string, number>  // Risk level → hours
}

// Risk scoring formula (weighted average)
function calculateRiskScore(factors: RiskFactors): number {
  const {
    businessCriticality,
    technicalComplexity,
    changeFrequency,
    compliance,
    security,
  } = factors

  // Weighted formula (normalized to 1-5 scale)
  const score =
    (businessCriticality * 3 +
      technicalComplexity * 2 +
      changeFrequency * 1.5 +
      compliance * 2 +
      security * 2) /
    10.5

  return Math.round(score * 100) / 100  // Round to 2 decimal places
}

// Map risk score to risk level
function getRiskLevel(score: number): RiskAssessment['riskLevel'] {
  if (score >= 4.5) return 'Critical'
  if (score >= 3.5) return 'High'
  if (score >= 2.5) return 'Medium'
  if (score >= 1.5) return 'Low'
  return 'Very Low'
}

// Get coverage target for risk level
function getCoverageTarget(riskLevel: RiskAssessment['riskLevel']): string {
  const targets = {
    Critical: '90-100%',
    High: '80-90%',
    Medium: '70-80%',
    Low: '50-70%',
    'Very Low': '30-50%',
  }
  return targets[riskLevel]
}

// Get recommended test types for risk level
function getTestTypes(riskLevel: RiskAssessment['riskLevel']): string[] {
  const testTypesByRisk = {
    Critical: ['Unit', 'Integration', 'E2E', 'Security', 'Performance', 'Penetration'],
    High: ['Unit', 'Integration', 'E2E', 'Security'],
    Medium: ['Unit', 'Integration', 'E2E'],
    Low: ['Unit', 'Integration'],
    'Very Low': ['Unit'],
  }
  return testTypesByRisk[riskLevel]
}

// Assess a single feature
function assessFeature(
  feature: string,
  factors: RiskFactors,
  justification?: Record<string, string>
): RiskAssessment {
  const riskScore = calculateRiskScore(factors)
  const riskLevel = getRiskLevel(riskScore)
  const coverageTarget = getCoverageTarget(riskLevel)
  const testTypes = getTestTypes(riskLevel)

  return {
    feature,
    factors,
    riskScore,
    riskLevel,
    coverageTarget,
    testTypes,
    justification,
  }
}

// Load risk assessments from JSON file
function loadRiskAssessments(filePath: string): RiskAssessment[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    console.log('   Create a risk-assessments.json file with your features.')
    console.log('   Example: risk-scorer init')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  if (!data.features || !Array.isArray(data.features)) {
    console.error('❌ Invalid format: Expected { "features": [ ... ] }')
    process.exit(1)
  }

  return data.features.map((f: any) => assessFeature(f.feature, f.factors, f.justification))
}

// Generate risk matrix
function generateRiskMatrix(assessments: RiskAssessment[], totalHours?: number): RiskMatrix {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    veryLow: 0,
  }

  for (const assessment of assessments) {
    const level = assessment.riskLevel.toLowerCase().replace(' ', '')
    if (level in summary) {
      summary[level as keyof typeof summary]++
    }
  }

  // Allocate test hours by risk level (if total hours provided)
  const testEffortAllocation: Record<string, number> = {}
  if (totalHours) {
    // Allocation percentages: Critical (50%), High (25%), Medium (15%), Low (8%), Very Low (2%)
    testEffortAllocation.Critical = (totalHours * 0.5) / Math.max(summary.critical, 1)
    testEffortAllocation.High = (totalHours * 0.25) / Math.max(summary.high, 1)
    testEffortAllocation.Medium = (totalHours * 0.15) / Math.max(summary.medium, 1)
    testEffortAllocation.Low = (totalHours * 0.08) / Math.max(summary.low, 1)
    testEffortAllocation['Very Low'] = (totalHours * 0.02) / Math.max(summary.veryLow, 1)
  }

  return {
    features: assessments,
    summary,
    testEffortAllocation,
  }
}

// Print risk matrix
function printRiskMatrix(matrix: RiskMatrix, totalHours?: number): void {
  console.log('\n' + '='.repeat(80))
  console.log('📊 RISK MATRIX')
  console.log('='.repeat(80) + '\n')

  // Group by risk level
  const byRiskLevel: Record<string, RiskAssessment[]> = {
    Critical: [],
    High: [],
    Medium: [],
    Low: [],
    'Very Low': [],
  }

  for (const assessment of matrix.features) {
    byRiskLevel[assessment.riskLevel].push(assessment)
  }

  // Print table header
  console.log(
    `| ${'Feature'.padEnd(25)} | ${'Bus'.padEnd(3)} | ${'Cplx'.padEnd(4)} | ${'Chg'.padEnd(3)} | ${'Cmpl'.padEnd(4)} | ${'Sec'.padEnd(3)} | ${'Risk'.padEnd(4)} | ${'Level'.padEnd(8)} | ${'Coverage'.padEnd(10)} |`
  )
  console.log('|' + '-'.repeat(27) + '|' + '-'.repeat(5) + '|' + '-'.repeat(6) + '|' + '-'.repeat(5) + '|' + '-'.repeat(6) + '|' + '-'.repeat(5) + '|' + '-'.repeat(6) + '|' + '-'.repeat(10) + '|' + '-'.repeat(12) + '|')

  for (const [level, assessments] of Object.entries(byRiskLevel)) {
    if (assessments.length === 0) continue

    for (const assessment of assessments) {
      const { feature, factors, riskScore, riskLevel, coverageTarget } = assessment
      console.log(
        `| ${feature.padEnd(25)} | ${factors.businessCriticality}   | ${factors.technicalComplexity}    | ${factors.changeFrequency}   | ${factors.compliance}    | ${factors.security}   | ${riskScore.toFixed(2)}  | ${riskLevel.padEnd(8)} | ${coverageTarget.padEnd(10)} |`
      )
    }
  }

  console.log()

  // Summary
  console.log('📈 Summary:')
  console.log(`   Critical: ${matrix.summary.critical} features (90-100% coverage)`)
  console.log(`   High: ${matrix.summary.high} features (80-90% coverage)`)
  console.log(`   Medium: ${matrix.summary.medium} features (70-80% coverage)`)
  console.log(`   Low: ${matrix.summary.low} features (50-70% coverage)`)
  console.log(`   Very Low: ${matrix.summary.veryLow} features (30-50% coverage)`)
  console.log()

  if (totalHours) {
    console.log(`⏱️  Test Effort Allocation (${totalHours} hours total):`)
    console.log(`   Critical: ${(totalHours * 0.5).toFixed(1)} hours (50%)`)
    console.log(`   High: ${(totalHours * 0.25).toFixed(1)} hours (25%)`)
    console.log(`   Medium: ${(totalHours * 0.15).toFixed(1)} hours (15%)`)
    console.log(`   Low: ${(totalHours * 0.08).toFixed(1)} hours (8%)`)
    console.log(`   Very Low: ${(totalHours * 0.02).toFixed(1)} hours (2%)`)
    console.log()
  }
}

// Print single feature recommendation
function printRecommendation(assessment: RiskAssessment): void {
  console.log(`\n📋 Feature: ${assessment.feature}`)
  console.log(`Risk Score: ${assessment.riskScore} (${assessment.riskLevel})`)
  console.log(`Coverage Target: ${assessment.coverageTarget}`)
  console.log()

  console.log('Risk Factors (1-5 scale):')
  console.log(`  Business Criticality: ${assessment.factors.businessCriticality} (3x weight)`)
  console.log(`  Technical Complexity: ${assessment.factors.technicalComplexity} (2x weight)`)
  console.log(`  Change Frequency: ${assessment.factors.changeFrequency} (1.5x weight)`)
  console.log(`  Compliance: ${assessment.factors.compliance} (2x weight)`)
  console.log(`  Security: ${assessment.factors.security} (2x weight)`)
  console.log()

  if (assessment.justification) {
    console.log('Justification:')
    for (const [factor, reason] of Object.entries(assessment.justification)) {
      console.log(`  ${factor}: ${reason}`)
    }
    console.log()
  }

  console.log('Recommended Test Types:')
  for (const testType of assessment.testTypes) {
    console.log(`  ✓ ${testType}`)
  }
  console.log()

  console.log('Coverage Targets:')
  const coverageByTestType = {
    Critical: { Unit: '90%', Integration: '100%', E2E: '100%', Security: '100%' },
    High: { Unit: '80%', Integration: '90%', E2E: '90%', Security: '100%' },
    Medium: { Unit: '70%', Integration: '80%', E2E: '80%' },
    Low: { Unit: '50%', Integration: '70%' },
    'Very Low': { Unit: '30%' },
  }

  const targets = coverageByTestType[assessment.riskLevel]
  for (const [testType, coverage] of Object.entries(targets)) {
    console.log(`  ${testType}: ${coverage}`)
  }
  console.log()
}

// Interactive CLI for assessing a feature
function interactiveAssess(): RiskAssessment {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => resolve(answer))
    })
  }

  console.log('\n📋 Risk Assessment (Interactive Mode)\n')

  const feature = await question('Feature name: ')

  console.log('\nRate each risk factor (1-5):\n')
  console.log('Business Criticality (1=No impact, 5=Revenue loss/Legal liability):')
  const businessCriticality = parseInt(await question('  Score: '))

  console.log('Technical Complexity (1=Trivial, 5=>500 LOC, >10 dependencies):')
  const technicalComplexity = parseInt(await question('  Score: '))

  console.log('Change Frequency (1=Rarely, 5=Multiple times per sprint):')
  const changeFrequency = parseInt(await question('  Score: '))

  console.log('Compliance (1=None, 5=CMMC/HIPAA/PCI-DSS audit):')
  const compliance = parseInt(await question('  Score: '))

  console.log('Security (1=None, 5=Authentication/Encryption):')
  const security = parseInt(await question('  Score: '))

  rl.close()

  const factors: RiskFactors = {
    businessCriticality,
    technicalComplexity,
    changeFrequency,
    compliance,
    security,
  }

  return assessFeature(feature, factors)
}

// Initialize risk-assessments.json template
function initRiskAssessments(): void {
  const templatePath = path.join(process.cwd(), 'risk-assessments.json')

  if (fs.existsSync(templatePath)) {
    console.log('⚠️  risk-assessments.json already exists')
    process.exit(1)
  }

  const template = {
    features: [
      {
        feature: 'User Authentication',
        factors: {
          businessCriticality: 5,
          technicalComplexity: 4,
          changeFrequency: 3,
          compliance: 5,
          security: 5,
        },
        justification: {
          businessCriticality: 'Without auth, users cannot access accounts (critical)',
          technicalComplexity: 'OAuth integration, session management, JWT tokens',
          changeFrequency: 'Occasional updates (once per release)',
          compliance: 'CMMC IA.L2-3.5.10 requires password encryption (audited)',
          security: 'Authentication is critical security boundary',
        },
      },
      {
        feature: 'Payment Processing',
        factors: {
          businessCriticality: 5,
          technicalComplexity: 5,
          changeFrequency: 4,
          compliance: 5,
          security: 4,
        },
        justification: {
          businessCriticality: 'Payment failure causes revenue loss',
          technicalComplexity: 'Stripe integration, PCI compliance, idempotent transactions',
          changeFrequency: 'Frequent updates (payment methods, currencies)',
          compliance: 'PCI-DSS audit required',
          security: 'Payment data encryption, fraud detection',
        },
      },
      {
        feature: 'Footer',
        factors: {
          businessCriticality: 1,
          technicalComplexity: 1,
          changeFrequency: 1,
          compliance: 1,
          security: 1,
        },
        justification: {
          businessCriticality: 'Cosmetic only, no business impact',
          technicalComplexity: 'Static HTML, <50 LOC',
          changeFrequency: 'Rarely changed',
          compliance: 'No compliance requirements',
          security: 'No security impact',
        },
      },
    ],
  }

  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2))

  console.log('✅ Created risk-assessments.json')
  console.log('   Edit this file to add your features and risk factors.')
  console.log()
  console.log('   Then run: risk-scorer matrix')
}

// Main CLI
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === 'assess' && args[1] === '--feature' && args[2]) {
    const feature = args[2]
    const assessments = loadRiskAssessments('risk-assessments.json')
    const assessment = assessments.find((a) => a.feature.toLowerCase() === feature.toLowerCase())

    if (!assessment) {
      console.error(`❌ Feature "${feature}" not found in risk-assessments.json`)
      process.exit(1)
    }

    printRecommendation(assessment)
  } else if (command === 'assess' && args[1] === '--interactive') {
    const assessment = await interactiveAssess()
    printRecommendation(assessment)
  } else if (command === 'matrix') {
    const assessments = loadRiskAssessments('risk-assessments.json')
    const totalHours = args[1] === '--hours' ? parseInt(args[2]) : undefined
    const matrix = generateRiskMatrix(assessments, totalHours)
    printRiskMatrix(matrix, totalHours)
  } else if (command === 'recommend' && args[1] === '--feature' && args[2]) {
    const feature = args[2]
    const assessments = loadRiskAssessments('risk-assessments.json')
    const assessment = assessments.find((a) => a.feature.toLowerCase() === feature.toLowerCase())

    if (!assessment) {
      console.error(`❌ Feature "${feature}" not found in risk-assessments.json`)
      process.exit(1)
    }

    printRecommendation(assessment)
  } else if (command === 'init') {
    initRiskAssessments()
  } else {
    console.log(`
Risk Scorer - Automate risk-based testing prioritization

Usage:
  risk-scorer init                             Create risk-assessments.json template
  risk-scorer assess --feature auth            Assess specific feature
  risk-scorer assess --interactive             Interactive assessment (prompts for scores)
  risk-scorer matrix                           Generate risk matrix for all features
  risk-scorer matrix --hours 40                Generate risk matrix with test hour allocation
  risk-scorer recommend --feature cart         Get coverage recommendations for feature

Configuration:
  Create risk-assessments.json in project root:
  {
    "features": [
      {
        "feature": "User Authentication",
        "factors": {
          "businessCriticality": 5,
          "technicalComplexity": 4,
          "changeFrequency": 3,
          "compliance": 5,
          "security": 5
        },
        "justification": {
          "businessCriticality": "Without auth, users cannot access accounts",
          ...
        }
      }
    ]
  }

Risk Factors (1-5 scale):
  businessCriticality:  1=No impact, 5=Revenue loss/Legal liability
  technicalComplexity:  1=Trivial (<50 LOC), 5=Very complex (>500 LOC, >10 deps)
  changeFrequency:      1=Rarely, 5=Multiple times per sprint
  compliance:           1=None, 5=CMMC/HIPAA/PCI-DSS audit
  security:             1=None, 5=Authentication/Encryption

Risk Levels:
  Critical (4.5-5.0):   90-100% coverage (Unit, Integration, E2E, Security, Performance, Penetration)
  High (3.5-4.4):       80-90% coverage (Unit, Integration, E2E, Security)
  Medium (2.5-3.4):     70-80% coverage (Unit, Integration, E2E)
  Low (1.5-2.4):        50-70% coverage (Unit, Integration)
  Very Low (1.0-1.4):   30-50% coverage (Unit)

Integration with CI/CD:
  # Set coverage thresholds in jest.config.js based on risk matrix
  coverageThreshold: {
    './src/auth/': { lines: 90 },      // Critical risk
    './src/cart/': { lines: 70 },      // Medium risk
    './src/footer/': { lines: 30 }     // Very low risk
  }
    `)
  }
}

main()
