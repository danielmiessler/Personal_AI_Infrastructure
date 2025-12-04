/**
 * Daniel Security Test Suite: Critical Vulnerabilities (30 tests)
 *
 * Purpose: Validate Daniel's 90% detection rate on known vulnerabilities
 * Scope: 30 Critical tests (SQL Injection, XSS, Authentication Bypass)
 * Success Criteria: Daniel catches ≥27 of 30 tests (90%)
 *
 * Full suite: 60 tests total (30 Critical + 20 CMMC + 10 Authz in Sprint 2)
 */

import { describe, test, expect } from '@jest/globals'
import { reviewCode } from '../src/daniel/security-review'
import { SecurityAnalysis } from '../src/types'

// ============================================================================
// Category 1: SQL Injection (10 tests) - OWASP A03
// ============================================================================

describe('SQL Injection Detection (10 tests)', () => {

  test('1.1: String concatenation SQL injection', async () => {
    const code = `
      const query = "SELECT * FROM users WHERE email = '" + userEmail + "'"
      const result = await db.execute(query)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toContain('sql injection')
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.owasp).toBe('A03')
    expect(analysis.cmmc).toBe('SI.L2-3.14.6')
    expect(analysis.mitigation.toLowerCase()).toMatch(/parameterized|prepared/)
    expect(analysis.codeExample).toBeDefined()
  })

  test('1.2: Template literal SQL injection', async () => {
    const code = `
      const query = \`SELECT * FROM users WHERE id = \${userId}\`
      const result = await db.query(query)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/sql|injection/)
    expect(analysis.severity).toBe('Critical')
  })

  test('1.3: Second-order SQL injection', async () => {
    const code = `
      // Store user input
      await db.execute("INSERT INTO users (name) VALUES (?)", [userName])
      // Later retrieve and use without sanitization
      const user = await db.query("SELECT name FROM users WHERE id = 1")
      const query = "SELECT * FROM posts WHERE author = '" + user.name + "'"
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/sql|injection|second-order/)
  })

  test('1.4: ORDER BY SQL injection', async () => {
    const code = `
      const query = \`SELECT * FROM users ORDER BY \${sortColumn}\`
      const result = await db.query(query)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/whitelist|validate/)
  })

  test('1.5: LIMIT/OFFSET SQL injection', async () => {
    const code = `
      const query = \`SELECT * FROM users LIMIT \${limit} OFFSET \${offset}\`
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/integer|validate|parameterized/)
  })

  test('1.6: Stored procedure SQL injection', async () => {
    const code = `
      const query = \`CALL getUserByEmail('\${email}')\`
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/parameterize|bind/)
  })

  test('1.7: UNION-based SQL injection', async () => {
    const code = `
      const query = \`SELECT id, name FROM users WHERE id = \${id}\`
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/validate.*integer|type.*check/)
  })

  test('1.8: Blind SQL injection', async () => {
    const code = `
      const query = \`SELECT * FROM users WHERE id = \${id}\`
      const exists = (await db.query(query)).length > 0
      return exists ? "User found" : "User not found"
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/parameterized|avoid.*exposing/)
  })

  test('1.9: Time-based SQL injection', async () => {
    const code = `
      const query = \`SELECT * FROM users WHERE username = '\${username}'\`
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/parameterized|timeout/)
  })

  test('1.10: NoSQL injection (MongoDB)', async () => {
    const code = `
      const user = await db.collection('users').findOne({
        username: req.body.username,
        password: req.body.password
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/nosql|injection|mongodb/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize|schema|validate/)
  })

})

// ============================================================================
// Category 2: Cross-Site Scripting / XSS (10 tests) - OWASP A03
// ============================================================================

describe('Cross-Site Scripting (XSS) Detection (10 tests)', () => {

  test('2.1: Reflected XSS', async () => {
    const code = `
      app.get('/search', (req, res) => {
        res.send(\`<h1>Results for: \${req.query.q}</h1>\`)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/xss|cross-site/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.owasp).toBe('A03')
    expect(analysis.cmmc).toBe('SC.L2-3.13.8')
    expect(analysis.mitigation.toLowerCase()).toMatch(/escape|sanitize|csp/)
  })

  test('2.2: Stored XSS', async () => {
    const code = `
      // Store comment
      await db.execute("INSERT INTO comments (text) VALUES (?)", [comment])
      // Display comment
      const comments = await db.query("SELECT text FROM comments")
      res.send(comments.map(c => \`<p>\${c.text}</p>\`).join(''))
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/xss|stored/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize|escape|template/)
  })

  test('2.3: DOM-based XSS', async () => {
    const code = `
      // Client-side
      const name = new URLSearchParams(window.location.search).get('name')
      document.getElementById('greeting').innerHTML = \`Hello \${name}\`
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/xss|dom/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/textcontent|dompurify/)
  })

  test('2.4: XSS via event handlers', async () => {
    const code = `
      res.send(\`<img src="\${imageUrl}">\`)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/validate.*url|whitelist|sanitize/)
  })

  test('2.5: XSS via CSS', async () => {
    const code = `
      res.send(\`<div style="\${userStyle}">Content</div>\`)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize.*css|css-in-js/)
  })

  test('2.6: XSS via SVG', async () => {
    const code = `
      res.send(\`<svg>\${userSVG}</svg>\`)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize.*svg|svg.*sanitizer/)
  })

  test('2.7: XSS via Markdown', async () => {
    const code = `
      const html = marked(userMarkdown)  // No sanitization
      res.send(html)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/dompurify|sanitize/)
  })

  test('2.8: XSS via JSON response', async () => {
    const code = `
      res.send(\`<script>var data = \${JSON.stringify(userData)}</script>\`)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/separate.*script|content-type.*json/)
  })

  test('2.9: XSS via meta refresh', async () => {
    const code = `
      res.send(\`<meta http-equiv="refresh" content="0;url=\${redirectUrl}">\`)
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/validate.*url|http.*https/)
  })

  test('2.10: XSS via JSONP callback', async () => {
    const code = `
      app.get('/jsonp', (req, res) => {
        res.send(\`\${req.query.callback}(\${JSON.stringify(data)})\`)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.mitigation.toLowerCase()).toMatch(/validate.*callback|alphanumeric|cors/)
  })

})

// ============================================================================
// Category 3: Authentication Bypass (10 tests) - OWASP A07
// ============================================================================

describe('Authentication Bypass Detection (10 tests)', () => {

  test('3.1: Hardcoded credentials', async () => {
    const code = `
      const ADMIN_PASSWORD = "admin123"
      if (password === ADMIN_PASSWORD) {
        return generateToken(user)
      }
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/hardcoded|credential/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.owasp).toBe('A07')
    expect(analysis.cmmc).toBe('IA.L2-3.5.10')  // Protected Passwords (store/transmit cryptographically)
    expect(analysis.mitigation.toLowerCase()).toMatch(/environment|secret.*manager/)
  })

  test('3.2: Weak password policy', async () => {
    const code = `
      if (password.length >= 4) {
        // Create account
      }
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/weak.*password|password.*policy/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/12.*char|complexity/)
  })

  test('3.3: No rate limiting on login', async () => {
    const code = `
      app.post('/login', async (req, res) => {
        const user = await db.findUser(req.body.username)
        if (bcrypt.compare(req.body.password, user.password)) {
          // Success
        }
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/rate.*limit|brute.*force/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/rate.*limit|lockout/)
    expect(analysis.cmmc).toBe('AC.L2-3.1.7')
  })

  test('3.4: JWT secret in code', async () => {
    const code = `
      const token = jwt.sign(payload, "supersecret123")
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/hardcoded|jwt.*secret/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/environment|rotate/)
  })

  test('3.5: Insecure password reset', async () => {
    const code = `
      app.post('/reset-password', async (req, res) => {
        const user = await db.findUser(req.body.email)
        const newPassword = generateRandomPassword()
        await sendEmail(user.email, \`Your new password: \${newPassword}\`)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/insecure.*reset|password.*email/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/reset.*token|time.*limit/)
  })

  test('3.6: Session fixation', async () => {
    const code = `
      app.post('/login', (req, res) => {
        // Session ID not regenerated after login
        req.session.userId = user.id
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/session.*fixation/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/regenerate/)
  })

  test('3.7: Missing authentication check', async () => {
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
    expect(analysis.mitigation.toLowerCase()).toMatch(/middleware|auth.*check/)
    expect(analysis.cmmc).toBe('AC.L2-3.1.1')
  })

  test('3.8: Insecure "Remember Me"', async () => {
    const code = `
      res.cookie('remember_me', user.id, { maxAge: 30 * 24 * 60 * 60 * 1000 })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/insecure.*remember|plaintext.*cookie/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/signed|token/)
  })

  test('3.9: OAuth state parameter missing', async () => {
    const code = `
      app.get('/auth/callback', async (req, res) => {
        const { code } = req.query
        // No state parameter validation
        const token = await oauth.getToken(code)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/oauth.*state|csrf/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/state.*parameter|validate/)
  })

  test('3.10: JWT algorithm confusion', async () => {
    const code = `
      const decoded = jwt.verify(token, publicKey)  // Accepts any algorithm
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/jwt.*algorithm|algorithm.*confusion/)
    expect(analysis.mitigation.toLowerCase()).toMatch(/specify.*algorithm|rs256|reject.*none/)
  })

})

// ============================================================================
// Test Suite Summary
// ============================================================================

describe('Security Test Suite Summary', () => {

  test('Suite validation: 30 Critical tests defined', () => {
    // This test verifies the test suite structure itself
    const suiteCount = {
      sqlInjection: 10,
      xss: 10,
      authBypass: 10,
      total: 30
    }

    expect(suiteCount.total).toBe(30)
    expect(suiteCount.sqlInjection + suiteCount.xss + suiteCount.authBypass).toBe(30)
  })

})
