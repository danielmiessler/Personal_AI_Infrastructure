/**
 * Acceptance Tests: US-E1 - Daniel Participates in Security Standups
 *
 * User Story:
 * As a developer designing a security-sensitive feature
 * I want Daniel to participate in standup and provide security perspective
 * So that I catch security issues early (before coding)
 */

import { describe, test, expect } from '@jest/globals'
import { runStandup } from '../src/standup/orchestrator'
import { StandupContext, StandupResult } from '../src/types'
import { promises as fs } from 'fs'

describe('US-E1: Daniel Participates in Security Standups (5 points)', () => {

  /**
   * Scenario 1: Daniel joins standup on authentication feature
   *
   * Given: User runs standup to design authentication feature
   * And: Roster includes Mary, Clay, Hefley, Daniel
   * When: RunStandup workflow executes
   * Then: Daniel provides security perspective
   * And: Daniel identifies authentication threats
   * And: Daniel recommends security controls (MFA, password hashing, etc.)
   * And: Daniel references CMMC practices (IA domain)
   */
  test('Scenario 1: Daniel joins standup on authentication feature', async () => {
    const context: StandupContext = {
      feature: 'User authentication API',
      description: 'POST /api/login endpoint with email/password',
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const result: StandupResult = await runStandup(context)

    // Deterministic checks
    expect(result.participants).toContain('Daniel')
    expect(result.Daniel.strideCategories).toContain('Spoofing')  // Auth is primarily Spoofing threat
    expect(result.Daniel.cmmcReferences).toContain('IA.L2-3.5.10')  // Password protection

    // Flexible keyword matching (not exact strings - LLM outputs vary)
    const threatsText = result.Daniel.threats.join(' ').toLowerCase()
    expect(threatsText).toMatch(/credential|authentication|spoofing|password/)

    const recsText = result.Daniel.recommendations.join(' ').toLowerCase()
    expect(recsText).toMatch(/mfa|multi-factor|two-factor|2fa|bcrypt|hash/)

    // Daniel should provide actionable recommendations (not vague)
    expect(result.Daniel.recommendations.some(rec =>
      rec.length > 20  // Non-trivial recommendations
    )).toBe(true)
  })

  /**
   * Scenario 2: Daniel defers to Mary on UX questions
   *
   * Given: Standup discusses 2FA user experience
   * And: Question is about UX (not security)
   * When: Daniel is asked "Should we require 2FA on every login?"
   * Then: Daniel defers to Mary (Business Analyst)
   * And: Daniel says "From a security perspective, more frequent 2FA is better, but Mary can advise on user friction."
   */
  test('Scenario 2: Daniel defers to Mary on UX questions', async () => {
    const context: StandupContext = {
      feature: 'Two-factor authentication UX',
      question: 'Should we require 2FA on every login or just once per 30 days?',
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel'],
      questionFor: 'Daniel'  // Specifically asking Daniel
    }

    const result: StandupResult = await runStandup(context)

    // Daniel should acknowledge this is UX question (outside her domain)
    const emmaResponse = result.Daniel.response.toLowerCase()
    expect(emmaResponse).toMatch(/mary|business|ux|user experience|defer/)

    // Daniel should still provide security perspective
    expect(emmaResponse).toMatch(/security perspective|from a security/)

    // Daniel should not make final UX decision (that's Mary's domain)
    expect(result.Daniel.deferTo).toBe('Mary')
  })

  /**
   * Scenario 3: Daniel provides actionable recommendations
   *
   * Given: Developer proposes login API
   * And: Login uses HTTP (not HTTPS)
   * When: Daniel reviews the API design
   * Then: Daniel identifies "credentials in transit" threat
   * And: Daniel recommends HTTPS with TLS 1.3
   * And: Daniel provides implementation guidance (certificate setup, HSTS header)
   * And: Daniel does NOT say vague "this is insecure" (must be actionable)
   */
  test('Scenario 3: Daniel provides actionable recommendations', async () => {
    const apiDesign = {
      endpoint: '/api/login',
      method: 'POST',
      protocol: 'HTTP',  // Insecure!
      auth: 'email+password'
    }

    const context: StandupContext = {
      feature: 'Login API design',
      designDoc: apiDesign,
      roster: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const result: StandupResult = await runStandup(context)

    // Daniel should identify the HTTP threat
    const threatsText = result.Daniel.threats.join(' ').toLowerCase()
    expect(threatsText).toMatch(/http|plaintext|transit|intercept|man-in-the-middle/)

    // Daniel should recommend HTTPS/TLS
    const recsText = result.Daniel.recommendations.join(' ').toLowerCase()
    expect(recsText).toMatch(/https|tls|ssl|encrypt/)

    // Daniel should provide implementation guidance (actionable)
    const hasImplementationGuidance = result.Daniel.recommendations.some(rec =>
      rec.toLowerCase().match(/certificate|hsts|tls 1\.3|configure/)
    )
    expect(hasImplementationGuidance).toBe(true)

    // Daniel should reference CMMC practice
    expect(result.Daniel.cmmcReferences).toContain('SC.L2-3.13.8')  // Transmission confidentiality

    // Daniel should NOT be vague (no "this is insecure" without explanation)
    const isVague = result.Daniel.recommendations.some(rec =>
      rec.toLowerCase() === 'this is insecure' || rec.toLowerCase() === 'fix this'
    )
    expect(isVague).toBe(false)
  })

  /**
   * Scenario 4: Daniel logs decisions in project-context.md
   *
   * Given: Daniel recommends bcrypt for password hashing
   * And: Team agrees to use bcrypt (cost factor 12)
   * When: Decision is recorded
   * Then: project-context.md is updated
   * And: Decision includes Daniel's rationale
   * And: Decision references CMMC practice (IA.L2-3.5.10)
   * And: Decision includes date, participants, status
   */
  test('Scenario 4: Daniel decisions logged in project-context.md', async () => {
    const decision = {
      title: 'Use bcrypt for password hashing',
      emmaRecommendation: 'bcrypt with cost factor 12',
      cmmcPractice: 'IA.L2-3.5.10',
      participants: ['Mary', 'Clay', 'Hefley', 'Daniel']
    }

    const context: StandupContext = {
      feature: 'Password hashing implementation',
      decision: decision,
      roster: decision.participants
    }

    const result: StandupResult = await runStandup(context)

    // Record decision in project-context.md
    await result.recordDecision('docs/project-context.md')

    // Read project-context.md and verify decision is logged
    const projectContext = await fs.readFile('docs/project-context.md', 'utf-8')

    expect(projectContext).toContain('bcrypt')
    expect(projectContext).toContain('cost factor 12')
    expect(projectContext).toContain('IA.L2-3.5.10')
    expect(projectContext).toContain('Daniel')
    expect(projectContext).toMatch(/\d{4}-\d{2}-\d{2}/)  // Date (YYYY-MM-DD)
    expect(projectContext).toMatch(/Status.*Approved|Complete|In Progress/i)
  })

})
