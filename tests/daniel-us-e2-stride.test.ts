/**
 * Acceptance Tests: US-E2 - Daniel Performs STRIDE Threat Modeling
 *
 * User Story:
 * As a developer designing an API or feature
 * I want Daniel to analyze threats using STRIDE framework
 * So that I understand attack vectors and implement mitigations
 */

import { describe, test, expect } from '@jest/globals'
import { runStandup } from '../src/standup/orchestrator'
import { performSTRIDE } from '../src/daniel/stride'
import { StandupContext, StandupResult, ThreatModel } from '../src/types'

describe('US-E2: Daniel Performs STRIDE Threat Modeling (8 points)', () => {

  /**
   * Scenario 5: Daniel performs complete STRIDE analysis
   *
   * Given: Developer designs payment processing API
   * When: Daniel performs threat model
   * Then: Daniel analyzes all 6 STRIDE categories:
   *   - Spoofing: Attacker impersonates payment processor
   *   - Tampering: Attacker modifies payment amount
   *   - Repudiation: User denies making payment
   *   - Information Disclosure: Credit card data leaked
   *   - Denial of Service: Payment API overloaded
   *   - Elevation of Privilege: Attacker processes unauthorized payments
   * And: Daniel provides mitigation for each threat
   * And: Daniel prioritizes threats (Critical/High/Medium/Low)
   */
  test('Scenario 5: Daniel performs complete STRIDE analysis', async () => {
    const feature = {
      name: 'Payment Processing API',
      type: 'API',
      dataFlow: ['User', 'API', 'Stripe', 'Database'],
      handlesData: ['credit cards', 'payment amounts', 'user PII']
    }

    const threatModel: ThreatModel = await performSTRIDE(feature)

    // All 6 STRIDE categories analyzed
    expect(threatModel.spoofing).toBeDefined()
    expect(threatModel.tampering).toBeDefined()
    expect(threatModel.repudiation).toBeDefined()
    expect(threatModel.informationDisclosure).toBeDefined()
    expect(threatModel.denialOfService).toBeDefined()
    expect(threatModel.elevationOfPrivilege).toBeDefined()

    // Each threat has mitigation
    const categories = [
      threatModel.spoofing,
      threatModel.tampering,
      threatModel.repudiation,
      threatModel.informationDisclosure,
      threatModel.denialOfService,
      threatModel.elevationOfPrivilege
    ]

    categories.forEach(threat => {
      expect(threat.mitigation).toBeDefined()
      expect(threat.mitigation.length).toBeGreaterThan(10)  // Non-trivial mitigation
      expect(threat.priority).toMatch(/Critical|High|Medium|Low/)
    })

    // Payment processing should have Critical threats
    const hasCriticalThreats = categories.some(t => t.priority === 'Critical')
    expect(hasCriticalThreats).toBe(true)
  })

  /**
   * Scenario 6: Daniel identifies SQL injection (Tampering)
   *
   * Given: Developer proposes user search API
   * And: API uses string concatenation:
   *      query = "SELECT * FROM users WHERE email = '" + userEmail + "'"
   * When: Daniel reviews API
   * Then: Daniel identifies SQL injection (STRIDE: Tampering)
   * And: Daniel classifies as Critical (OWASP A03, CMMC IA.L2-3.5.10)
   * And: Daniel recommends parameterized queries
   * And: Daniel provides code example:
   *      query = "SELECT * FROM users WHERE email = ?"
   *      db.execute(query, [userEmail])
   */
  test('Scenario 6: Daniel identifies SQL injection vulnerability', async () => {
    const apiCode = `
      // Vulnerable code
      const email = req.body.email
      const query = "SELECT * FROM users WHERE email = '" + email + "'"
      const result = await db.execute(query)
    `

    const context: StandupContext = {
      feature: 'User search API',
      codeSnippet: apiCode,
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const result: StandupResult = await runStandup(context)

    // Daniel should identify SQL injection
    const threatsText = result.Daniel.threats.join(' ').toLowerCase()
    expect(threatsText).toMatch(/sql injection|sql|injection/)

    // Daniel should classify as Tampering (STRIDE category)
    expect(result.Daniel.strideCategories).toContain('Tampering')

    // Daniel should classify as Critical severity
    expect(result.Daniel.severity).toBe('Critical')

    // Daniel should reference OWASP A03
    expect(result.Daniel.owaspReference).toBe('A03')

    // Daniel should reference CMMC practice
    expect(result.Daniel.cmmcReferences).toContain('SI.L2-3.14.6')  // Input validation

    // Daniel should recommend parameterized queries
    const recsText = result.Daniel.recommendations.join(' ').toLowerCase()
    expect(recsText).toMatch(/parameterized|prepared statement|placeholder/)

    // Daniel should provide code example (actionable)
    const hasCodeExample = result.Daniel.codeExamples && result.Daniel.codeExamples.length > 0
    expect(hasCodeExample).toBe(true)

    if (hasCodeExample) {
      const codeExample = result.Daniel.codeExamples[0].toLowerCase()
      expect(codeExample).toMatch(/\?|prepare|bind/)  // Parameterized query syntax
    }
  })

  /**
   * Scenario 7: Daniel prioritizes threats by risk
   *
   * Given: Daniel identifies 10 threats in payment API
   * When: Daniel prioritizes threats
   * Then: Daniel assigns risk levels:
   *   - Critical: SQL injection, hardcoded secrets (immediate fix)
   *   - High: Missing rate limiting, weak password policy (fix in sprint)
   *   - Medium: No CSRF token, verbose error messages (fix in 30 days)
   *   - Low: Missing security headers, verbose logs (backlog)
   * And: Daniel recommends fixing Critical/High in current sprint
   */
  test('Scenario 7: Daniel prioritizes threats by risk level', async () => {
    const feature = {
      name: 'Payment API',
      endpoints: [
        { path: '/api/payment', method: 'POST', vulnerabilities: ['sql_injection', 'no_rate_limiting'] },
        { path: '/api/refund', method: 'POST', vulnerabilities: ['hardcoded_secret', 'no_csrf'] }
      ]
    }

    const context: StandupContext = {
      feature: 'Payment API security review',
      designDoc: feature,
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const result: StandupResult = await runStandup(context)

    // Daniel should identify multiple threats
    expect(result.Daniel.threats.length).toBeGreaterThan(3)

    // Daniel should categorize by risk level
    const critical = result.Daniel.threats.filter(t => t.priority === 'Critical')
    const high = result.Daniel.threats.filter(t => t.priority === 'High')
    const medium = result.Daniel.threats.filter(t => t.priority === 'Medium')

    expect(critical.length).toBeGreaterThan(0)  // Should have Critical threats
    expect(high.length + medium.length).toBeGreaterThan(0)  // Should have High/Medium threats

    // Critical threats should have immediate timeline
    critical.forEach(threat => {
      expect(threat.timeline).toMatch(/immediate|same day|now|block/)
    })

    // High threats should be fixed in current sprint
    high.forEach(threat => {
      expect(threat.timeline).toMatch(/sprint|week|1-7 days/)
    })

    // Daniel should recommend fixing Critical/High first
    const priorityRec = result.Daniel.recommendations.find(rec =>
      rec.toLowerCase().match(/critical|high|priority|first/)
    )
    expect(priorityRec).toBeDefined()
  })

  /**
   * Scenario 8: Daniel documents threat model
   *
   * Given: Daniel completes STRIDE analysis for payment API
   * When: Threat model is documented
   * Then: docs/threat-models/payment-api-stride.md is created
   * And: Document includes:
   *   - Data flow diagram (User → API → Stripe → DB)
   *   - All 6 STRIDE categories with threats
   *   - Mitigations for each threat
   *   - Risk prioritization (Critical/High/Medium/Low)
   *   - CMMC practice references
   *   - Date, participants, status
   */
  test('Scenario 8: Daniel creates threat model document', async () => {
    const feature = {
      name: 'Payment Processing API',
      dataFlow: ['User', 'API', 'Stripe', 'Database']
    }

    const threatModel: ThreatModel = await performSTRIDE(feature)

    // Document threat model
    await threatModel.saveToFile('docs/threat-models/payment-api-stride.md')

    // Read threat model document
    const fs = require('fs').promises
    const threatModelDoc = await fs.readFile(
      'docs/threat-models/payment-api-stride.md',
      'utf-8'
    )

    // Verify content
    expect(threatModelDoc).toContain('Data Flow')
    expect(threatModelDoc).toContain('User')
    expect(threatModelDoc).toContain('API')
    expect(threatModelDoc).toContain('Stripe')

    // All 6 STRIDE categories documented
    expect(threatModelDoc).toContain('Spoofing')
    expect(threatModelDoc).toContain('Tampering')
    expect(threatModelDoc).toContain('Repudiation')
    expect(threatModelDoc).toContain('Information Disclosure')
    expect(threatModelDoc).toContain('Denial of Service')
    expect(threatModelDoc).toContain('Elevation of Privilege')

    // Mitigations documented
    expect(threatModelDoc).toContain('Mitigation')

    // CMMC practices referenced
    expect(threatModelDoc).toMatch(/CMMC|IA\.L2|AC\.L2|SC\.L2/)

    // Metadata included
    expect(threatModelDoc).toMatch(/\d{4}-\d{2}-\d{2}/)  // Date
    expect(threatModelDoc).toMatch(/Critical|High|Medium|Low/)  // Risk levels
  })

  /**
   * Integration Test: Daniel collaborates with other agents
   *
   * Given: Standup with Mary, Clay, Hefley, Daniel reviewing payment API
   * When: Each agent provides perspective
   * Then: Daniel's security analysis complements other perspectives
   * And: No agent contradicts another (synthesis, not conflict)
   */
  test('Integration: Daniel collaborates with Mary/Clay/Hefley', async () => {
    const context: StandupContext = {
      feature: 'Payment processing API',
      description: 'Process credit card payments via Stripe',
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const result: StandupResult = await runStandup(context)

    // All 4 agents should participate
    expect(result.participants).toEqual(['Mary', 'Clay', 'Hefley', 'Daniel'])

    // Each agent should have provided perspective
    expect(result.Mary.recommendation).toBeDefined()
    expect(result.Clay.recommendation).toBeDefined()
    expect(result.Hefley.recommendation).toBeDefined()
    expect(result.Daniel.recommendation).toBeDefined()

    // Daniel's security perspective should complement others
    // Mary focuses on user value
    expect(result.Mary.focus).toBe('user_value')
    // Clay focuses on capacity/timeline
    expect(result.Clay.focus).toBe('capacity')
    // Hefley focuses on testing
    expect(result.Hefley.focus).toBe('testing')
    // Daniel focuses on security
    expect(result.Daniel.focus).toBe('security')

    // Synthesis: Combined recommendation
    expect(result.synthesis).toBeDefined()
    expect(result.synthesis.decision).toBeDefined()

    // No conflicts (agents should complement, not contradict)
    expect(result.conflicts).toHaveLength(0)
  })

})
