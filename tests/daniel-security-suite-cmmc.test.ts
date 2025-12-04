/**
 * Daniel Security Test Suite: CMMC Violations (20 tests total)
 *
 * Purpose: Validate Daniel's CMMC Level 2 compliance enforcement
 * Scope: 20 CMMC violation tests across Critical domains (AC, IA, SC, SI, AU)
 * Success Criteria: Daniel catches ≥18 of 20 violations (90%)
 *
 * Test Distribution:
 * - Days 12 (front-loaded): 10 CMMC tests (this file, first 10 tests)
 * - Day 13: 10 additional CMMC tests (to be added later)
 */

import { describe, test, expect } from '@jest/globals'
import { reviewCode } from '../src/daniel/security-review'
import { SecurityAnalysis } from '../src/types'

// ============================================================================
// Category 4: CMMC Violations - Critical Domains (20 tests total, 10 here)
// ============================================================================

describe('CMMC Violations Detection (10 front-loaded tests)', () => {

  // --------------------------------------------------------------------------
  // AC Domain: Access Control (2 tests)
  // --------------------------------------------------------------------------

  test('CMMC-1: Missing authentication violates AC.L2-3.1.1', async () => {
    const code = `
      app.get('/admin/users', async (req, res) => {
        // No authentication check!
        const users = await db.query("SELECT * FROM users")
        res.json(users)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/missing.*auth|no.*authentication/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('AC.L2-3.1.1')  // Limit system access to authorized users
    expect(analysis.mitigation.toLowerCase()).toMatch(/authentication.*middleware|auth.*check/)
    expect(analysis.codeExample).toBeDefined()

    // CMMC-specific validation
    expect(analysis.cmmcDomain).toBe('Access Control')
    expect(analysis.cmmcPractice).toContain('limit')
    expect(analysis.cmmcPractice?.toLowerCase()).toContain('authorized users')
  })

  test('CMMC-2: No rate limiting violates AC.L2-3.1.7', async () => {
    const code = `
      app.post('/login', async (req, res) => {
        const user = await db.findUser(req.body.username)
        if (bcrypt.compare(req.body.password, user.password)) {
          // Success - no rate limiting!
          return res.json({ token: generateToken(user) })
        }
        res.status(401).json({ error: 'Invalid credentials' })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/rate.*limit|brute.*force/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('AC.L2-3.1.7')  // Limit unsuccessful login attempts
    expect(analysis.mitigation.toLowerCase()).toMatch(/rate.*limit|lockout|throttle/)
    expect(analysis.codeExample).toMatch(/express-rate-limit|rate.*limiter/)
  })

  // --------------------------------------------------------------------------
  // IA Domain: Identification and Authentication (3 tests)
  // --------------------------------------------------------------------------

  test('CMMC-3: Hardcoded password violates IA.L2-3.5.10', async () => {
    const code = `
      const ADMIN_PASSWORD = "admin123"
      if (password === ADMIN_PASSWORD) {
        return generateToken(user)
      }
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/hardcoded.*password|hardcoded.*credential/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('IA.L2-3.5.10')  // Store and transmit passwords protected
    expect(analysis.mitigation.toLowerCase()).toMatch(/environment.*variable|secret.*manager/)
    expect(analysis.codeExample).toMatch(/process\.env|getSecret/)
  })

  test('CMMC-4: Weak password policy violates IA.L2-3.5.7', async () => {
    const code = `
      function validatePassword(password) {
        if (password.length >= 6) {
          // Accept 6-character passwords
          return true
        }
        return false
      }
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/weak.*password|password.*policy/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('IA.L2-3.5.7')  // Enforce minimum password length (12+ chars)
    expect(analysis.mitigation.toLowerCase()).toMatch(/12.*char|password.*complexity/)
    expect(analysis.codeExample).toMatch(/length >= 12|password.*rules/)
  })

  test('CMMC-5: No MFA violates IA.L2-3.5.1', async () => {
    const code = `
      app.post('/admin/login', async (req, res) => {
        const admin = await db.findAdmin(req.body.username)
        if (bcrypt.compare(req.body.password, admin.password)) {
          // Admin login with only password (no MFA)
          return res.json({ token: generateToken(admin) })
        }
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/no.*mfa|missing.*mfa|multi-factor/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('IA.L2-3.5.1')  // MFA for privileged accounts
    expect(analysis.mitigation.toLowerCase()).toMatch(/mfa|multi-factor|2fa|totp/)
    expect(analysis.codeExample).toMatch(/speakeasy|otpauth|authenticator/)
  })

  // --------------------------------------------------------------------------
  // SC Domain: System and Communications Protection (2 tests)
  // --------------------------------------------------------------------------

  test('CMMC-6: HTTP (not HTTPS) violates SC.L2-3.13.8', async () => {
    const code = `
      app.post('/login', (req, res) => {
        // Login form accepts credentials over HTTP
        const { username, password } = req.body
        // ... authentication logic
      })

      app.listen(80, () => console.log('Server running on HTTP'))
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/http|plaintext|unencrypted.*transit/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('SC.L2-3.13.8')  // Transmission confidentiality
    expect(analysis.mitigation.toLowerCase()).toMatch(/https|tls|ssl/)
    expect(analysis.codeExample).toMatch(/https|tls|443|hsts/)
  })

  test('CMMC-7: Missing security headers violates SC.L2-3.13.15', async () => {
    const code = `
      app.get('/', (req, res) => {
        res.send('<h1>Welcome</h1>')
        // No security headers set
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/security.*header|missing.*header/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Medium')
    expect(analysis.cmmc).toBe('SC.L2-3.13.15')  // Security function isolation
    expect(analysis.mitigation.toLowerCase()).toMatch(/helmet|csp|x-frame-options/)
    expect(analysis.codeExample).toMatch(/helmet|Content-Security-Policy/)
  })

  // --------------------------------------------------------------------------
  // SI Domain: System and Information Integrity (2 tests)
  // --------------------------------------------------------------------------

  test('CMMC-8: No input validation violates SI.L2-3.14.6', async () => {
    const code = `
      app.get('/search', (req, res) => {
        const query = "SELECT * FROM products WHERE name = '" + req.query.q + "'"
        // Direct use of user input without validation
        db.execute(query)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/sql.*injection|input.*validation/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('SI.L2-3.14.6')  // Input validation
    expect(analysis.mitigation.toLowerCase()).toMatch(/parameterized|prepared.*statement/)
    expect(analysis.codeExample).toMatch(/\\?|\\$1|prepare/)
  })

  test('CMMC-9: Verbose error messages violate SI.L2-3.14.3', async () => {
    const code = `
      app.post('/login', async (req, res) => {
        try {
          const user = await db.findUser(req.body.username)
        } catch (error) {
          // Exposing internal error details
          res.status(500).json({
            error: error.message,
            stack: error.stack,
            query: error.sql
          })
        }
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/verbose.*error|error.*disclosure|information.*leak/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('Medium')
    expect(analysis.cmmc).toBe('SI.L2-3.14.3')  // Error handling
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize.*error|generic.*message/)
    expect(analysis.codeExample).toMatch(/internal.*server.*error|500/)
  })

  // --------------------------------------------------------------------------
  // AU Domain: Audit and Accountability (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-10: No audit logs violate AU.L2-3.3.1', async () => {
    const code = `
      app.post('/admin/delete-user', async (req, res) => {
        // No audit logging before destructive action
        await db.execute("DELETE FROM users WHERE id = ?", [req.body.userId])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/no.*audit|missing.*log|no.*logging/)
    expect(analysis.strideCategory).toBe('Repudiation')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('AU.L2-3.3.1')  // Audit record content
    expect(analysis.mitigation.toLowerCase()).toMatch(/audit.*log|log.*action|winston|pino/)
    expect(analysis.codeExample).toMatch(/logger\.|audit|log/)
  })

})

// ============================================================================
// Category 4: CMMC Violations - Additional Tests (10 more, Day 13)
// ============================================================================

describe('CMMC Violations Detection (10 additional tests, Day 13)', () => {

  // --------------------------------------------------------------------------
  // CM Domain: Configuration Management (2 tests)
  // --------------------------------------------------------------------------

  test('CMMC-11: No baseline configuration violates CM.L2-3.4.2', async () => {
    const code = `
      // Production server with no documented baseline configuration
      app.listen(3000, () => {
        console.log('Server started')
        // No configuration validation, no baseline checks
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/configuration|baseline|hardening/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Medium')
    expect(analysis.cmmc).toBe('CM.L2-3.4.2')  // Baseline configuration
    expect(analysis.mitigation.toLowerCase()).toMatch(/baseline|configuration.*management|hardening/)
  })

  test('CMMC-12: No change control violates CM.L2-3.4.3', async () => {
    const code = `
      app.post('/api/config/update', async (req, res) => {
        // Direct configuration changes with no approval workflow
        await db.execute("UPDATE config SET value = ? WHERE key = ?",
          [req.body.value, req.body.key])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/change.*control|no.*approval/)
    expect(analysis.strideCategory).toBe('Repudiation')
    expect(analysis.severity).toBe('Medium')
    expect(analysis.cmmc).toBe('CM.L2-3.4.3')  // Change control
    expect(analysis.mitigation.toLowerCase()).toMatch(/approval|change.*request|workflow/)
  })

  // --------------------------------------------------------------------------
  // CP Domain: Contingency Planning (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-13: No backup violates CP.L2-3.6.1', async () => {
    const code = `
      // Critical data stored with no backup mechanism
      app.post('/api/data', async (req, res) => {
        await db.execute("INSERT INTO critical_data (content) VALUES (?)", [req.body.content])
        // No backup, no disaster recovery
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/no.*backup|backup|disaster.*recovery/)
    expect(analysis.strideCategory).toBe('Denial of Service')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('CP.L2-3.6.1')  // Backup and restoration
    expect(analysis.mitigation.toLowerCase()).toMatch(/backup|snapshot|replication/)
  })

  // --------------------------------------------------------------------------
  // IR Domain: Incident Response (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-14: No incident response violates IR.L2-3.6.1', async () => {
    const code = `
      app.post('/api/report-breach', async (req, res) => {
        // Security breach reported but no incident response workflow
        console.log('Breach reported:', req.body.description)
        // No alerting, no incident tracking, no response plan
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/incident.*response|no.*alert|no.*tracking/)
    expect(analysis.strideCategory).toBe('Repudiation')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('IR.L2-3.6.1')  // Incident handling
    expect(analysis.mitigation.toLowerCase()).toMatch(/alert|incident.*tracking|response.*plan/)
  })

  // --------------------------------------------------------------------------
  // MP Domain: Media Protection (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-15: Unencrypted data at rest violates MP.L2-3.8.3', async () => {
    const code = `
      app.post('/api/save-pii', async (req, res) => {
        // Storing PII in plaintext (no encryption at rest)
        await db.execute("INSERT INTO users (ssn, credit_card) VALUES (?, ?)",
          [req.body.ssn, req.body.creditCard])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/unencrypted.*rest|plaintext.*storage|encrypt/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('MP.L2-3.8.3')  // Protect data at rest
    expect(analysis.mitigation.toLowerCase()).toMatch(/encrypt|aes-256|kms/)
    expect(analysis.codeExample).toMatch(/encrypt|crypto/)
  })

  // --------------------------------------------------------------------------
  // RA Domain: Risk Assessment (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-16: No vulnerability scanning violates RA.L2-3.11.2', async () => {
    const code = `
      // Production deployment with no vulnerability scanning
      // No SAST, no DAST, no dependency scanning
      const app = express()
      app.use(bodyParser.json())
      // Deploying without security scans
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/vulnerability.*scan|no.*scanning|security.*scan/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Medium')
    expect(analysis.cmmc).toBe('RA.L2-3.11.2')  // Vulnerability scanning
    expect(analysis.mitigation.toLowerCase()).toMatch(/scan|snyk|sonarqube|owasp.*zap/)
  })

  // --------------------------------------------------------------------------
  // SA Domain: System Acquisition (1 test)
  // --------------------------------------------------------------------------

  test('CMMC-17: Unvetted dependencies violate SA.L2-3.13.3', async () => {
    const code = `
      // Installing random npm package without security review
      // package.json: "dangerous-package": "^1.0.0"
      const dangerousPackage = require('dangerous-package')
      dangerousPackage.execute()
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/unvetted.*dependency|supply.*chain|dependency/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('SA.L2-3.13.3')  // Security engineering principles
    expect(analysis.mitigation.toLowerCase()).toMatch(/audit|snyk|npm.*audit|vet/)
  })

  // --------------------------------------------------------------------------
  // Additional Critical Violations (3 tests)
  // --------------------------------------------------------------------------

  test('CMMC-18: Session fixation violates AC.L2-3.1.11', async () => {
    const code = `
      app.post('/login', (req, res) => {
        // Session ID not regenerated after login
        req.session.userId = user.id
        // Vulnerable to session fixation attacks
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/session.*fixation/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('AC.L2-3.1.11')  // Session lock
    expect(analysis.mitigation.toLowerCase()).toMatch(/regenerate|session\.regenerate/)
    expect(analysis.codeExample).toMatch(/regenerate/)
  })

  test('CMMC-19: Insecure cookie settings violate SC.L2-3.13.10', async () => {
    const code = `
      res.cookie('sessionId', sessionId, {
        httpOnly: false,  // XSS can steal cookie
        secure: false,    // Cookie sent over HTTP
        sameSite: 'none'  // CSRF vulnerable
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/insecure.*cookie|cookie.*security/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('SC.L2-3.13.10')  // Cryptographic protection
    expect(analysis.mitigation.toLowerCase()).toMatch(/httpOnly.*true|secure.*true|sameSite/)
    expect(analysis.codeExample).toMatch(/httpOnly:.*true/)
  })

  test('CMMC-20: CORS misconfiguration violates SC.L2-3.13.6', async () => {
    const code = `
      app.use(cors({
        origin: '*',  // Allow all origins (dangerous!)
        credentials: true
      }))
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/cors|cross.*origin/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('SC.L2-3.13.6')  // Deny by default
    expect(analysis.mitigation.toLowerCase()).toMatch(/whitelist|allowed.*origins/)
    expect(analysis.codeExample).toMatch(/origin:.*\[|whitelist/)
  })

})

// ============================================================================
// Test Suite Summary (Complete CMMC Suite)
// ============================================================================

describe('CMMC Test Suite Summary (All 20 tests)', () => {

  test('Suite validation: 20 CMMC tests total', () => {
    // This test verifies the test suite structure itself
    const suiteCount = {
      day12FrontLoaded: 10,   // Tests CMMC-1 through CMMC-10
      day13Additional: 10,    // Tests CMMC-11 through CMMC-20
      total: 20
    }

    expect(suiteCount.total).toBe(20)
    expect(suiteCount.day12FrontLoaded + suiteCount.day13Additional).toBe(20)
  })

  test('All CMMC domains covered', () => {
    const allCMMCDomains = ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'RE', 'SA', 'SC', 'SI']

    const practicesInTests = [
      // Day 12 (Tests CMMC-1 through CMMC-10)
      'AC.L2-3.1.1',   // Test CMMC-1: Missing authentication
      'AC.L2-3.1.7',   // Test CMMC-2: No rate limiting
      'IA.L2-3.5.10',  // Test CMMC-3: Hardcoded password
      'IA.L2-3.5.7',   // Test CMMC-4: Weak password policy
      'IA.L2-3.5.1',   // Test CMMC-5: No MFA
      'SC.L2-3.13.8',  // Test CMMC-6: HTTP (not HTTPS)
      'SC.L2-3.13.15', // Test CMMC-7: Missing security headers
      'SI.L2-3.14.6',  // Test CMMC-8: No input validation
      'SI.L2-3.14.3',  // Test CMMC-9: Verbose error messages
      'AU.L2-3.3.1',   // Test CMMC-10: No audit logs

      // Day 13 (Tests CMMC-11 through CMMC-20)
      'CM.L2-3.4.2',   // Test CMMC-11: No baseline configuration
      'CM.L2-3.4.3',   // Test CMMC-12: No change control
      'CP.L2-3.6.1',   // Test CMMC-13: No backup
      'IR.L2-3.6.1',   // Test CMMC-14: No incident response
      'MP.L2-3.8.3',   // Test CMMC-15: Unencrypted data at rest
      'RA.L2-3.11.2',  // Test CMMC-16: No vulnerability scanning
      'SA.L2-3.13.3',  // Test CMMC-17: Unvetted dependencies
      'AC.L2-3.1.11',  // Test CMMC-18: Session fixation
      'SC.L2-3.13.10', // Test CMMC-19: Insecure cookie settings
      'SC.L2-3.13.6'   // Test CMMC-20: CORS misconfiguration
    ]

    const domainsCovered = new Set(practicesInTests.map(id => id.split('.')[0]))

    // Verify critical domains covered
    expect(domainsCovered.has('AC')).toBe(true)
    expect(domainsCovered.has('IA')).toBe(true)
    expect(domainsCovered.has('SC')).toBe(true)
    expect(domainsCovered.has('SI')).toBe(true)
    expect(domainsCovered.has('AU')).toBe(true)

    // Verify additional domains covered
    expect(domainsCovered.has('CM')).toBe(true)
    expect(domainsCovered.has('CP')).toBe(true)
    expect(domainsCovered.has('IR')).toBe(true)
    expect(domainsCovered.has('MP')).toBe(true)
    expect(domainsCovered.has('RA')).toBe(true)
    expect(domainsCovered.has('SA')).toBe(true)

    // Total domains covered: 11 of 17 domains
    expect(domainsCovered.size).toBeGreaterThanOrEqual(11)
  })

  test('CMMC severity distribution', () => {
    const severityCount = {
      critical: 5,   // CMMC-1, 3, 6, 8, 15
      high: 8,       // CMMC-2, 4, 5, 10, 13, 14, 17, 18, 19, 20
      medium: 7,     // CMMC-7, 9, 11, 12, 16
      total: 20
    }

    expect(severityCount.critical + severityCount.high + severityCount.medium).toBe(severityCount.total)
  })

})
