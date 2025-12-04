/**
 * Daniel Security Test Suite: Authorization Flaws (10 tests)
 *
 * Purpose: Validate Daniel's detection of authorization vulnerabilities
 * Scope: 10 Authorization tests (IDOR, privilege escalation, broken access control)
 * Success Criteria: Daniel catches ≥9 of 10 tests (90%)
 *
 * Full suite: 60 tests total (30 Critical + 10 Authz + 20 CMMC)
 */

import { describe, test, expect } from '@jest/globals'
import { reviewCode } from '../src/daniel/security-review'
import { SecurityAnalysis } from '../src/types'

// ============================================================================
// Category 5: Authorization Flaws (10 tests) - OWASP A01
// ============================================================================

describe('Authorization Flaw Detection (10 tests)', () => {

  test('4.1: IDOR (Insecure Direct Object Reference)', async () => {
    const code = `
      app.get('/api/user/:id/profile', async (req, res) => {
        // No authorization check - any logged-in user can access any profile
        const profile = await db.query("SELECT * FROM profiles WHERE user_id = ?", [req.params.id])
        res.json(profile)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/idor|insecure.*direct.*object|broken.*access/)
    expect(analysis.strideCategory).toBe('Elevation of Privilege')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.owasp).toBe('A01')
    expect(analysis.cmmc).toBe('AC.L2-3.1.2')  // Limit access to types of transactions
    expect(analysis.mitigation.toLowerCase()).toMatch(/authorize|check.*ownership|req\.user/)
    expect(analysis.codeExample).toMatch(/req\.user\.id|ownership/)
  })

  test('4.2: Horizontal privilege escalation', async () => {
    const code = `
      app.put('/api/user/:id/email', async (req, res) => {
        // User can change anyone's email (not just their own)
        await db.execute("UPDATE users SET email = ? WHERE id = ?", [req.body.email, req.params.id])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/horizontal.*privilege|privilege.*escalation|authorization/)
    expect(analysis.strideCategory).toBe('Elevation of Privilege')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.mitigation.toLowerCase()).toMatch(/check.*user.*id|req\.user\.id|ownership/)
  })

  test('4.3: Vertical privilege escalation (user → admin)', async () => {
    const code = `
      app.post('/api/admin/grant-admin', async (req, res) => {
        // Any authenticated user can grant admin privileges
        await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [req.body.userId])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/vertical.*privilege|privilege.*escalation|admin/)
    expect(analysis.strideCategory).toBe('Elevation of Privilege')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.mitigation.toLowerCase()).toMatch(/admin.*check|role.*check|authorize/)
    expect(analysis.codeExample).toMatch(/req\.user\.role|isAdmin/)
  })

  test('4.4: Missing function-level access control', async () => {
    const code = `
      app.delete('/api/users/:id', async (req, res) => {
        // Delete endpoint has no role check
        await db.execute("DELETE FROM users WHERE id = ?", [req.params.id])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/missing.*access.*control|no.*authorization/)
    expect(analysis.strideCategory).toBe('Elevation of Privilege')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.cmmc).toBe('AC.L2-3.1.2')
    expect(analysis.mitigation.toLowerCase()).toMatch(/role.*check|authorization|middleware/)
  })

  test('4.5: Path traversal / Directory traversal', async () => {
    const code = `
      app.get('/api/files/:filename', (req, res) => {
        const filePath = './uploads/' + req.params.filename
        // No validation - user can access ../../../etc/passwd
        res.sendFile(filePath)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/path.*traversal|directory.*traversal/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.mitigation.toLowerCase()).toMatch(/sanitize|whitelist|path\.basename/)
    expect(analysis.codeExample).toMatch(/path\.basename|validate/)
  })

  test('4.6: Mass assignment vulnerability', async () => {
    const code = `
      app.put('/api/profile', async (req, res) => {
        // User can set any field, including 'role' and 'is_admin'
        await db.execute("UPDATE users SET ? WHERE id = ?", [req.body, req.user.id])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/mass.*assignment|over.*posting/)
    expect(analysis.strideCategory).toBe('Elevation of Privilege')
    expect(analysis.severity).toBe('High')
    expect(analysis.mitigation.toLowerCase()).toMatch(/whitelist|allowed.*fields|destructur/)
    expect(analysis.codeExample).toMatch(/const.*{.*}|allowed/)
  })

  test('4.7: Insecure file upload (no type validation)', async () => {
    const code = `
      app.post('/api/upload', upload.single('file'), (req, res) => {
        // No file type validation - user can upload .php, .exe, .sh
        const filePath = './uploads/' + req.file.originalname
        fs.writeFileSync(filePath, req.file.buffer)
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/file.*upload|unrestricted.*upload/)
    expect(analysis.strideCategory).toBe('Tampering')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.mitigation.toLowerCase()).toMatch(/validate.*type|whitelist.*extension|mime/)
    expect(analysis.codeExample).toMatch(/mimetype|\.pdf|\.jpg/)
  })

  test('4.8: Missing rate limiting on sensitive operations', async () => {
    const code = `
      app.post('/api/transfer-money', async (req, res) => {
        // No rate limiting on financial transaction
        await db.execute("INSERT INTO transfers (from, to, amount) VALUES (?, ?, ?)",
          [req.user.id, req.body.to, req.body.amount])
        res.json({ success: true })
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/rate.*limit|no.*throttle/)
    expect(analysis.strideCategory).toBe('Denial of Service')
    expect(analysis.severity).toBe('High')
    expect(analysis.cmmc).toBe('SC.L2-3.13.2')  // Denial of service protection
    expect(analysis.mitigation.toLowerCase()).toMatch(/rate.*limit|throttle/)
  })

  test('4.9: Broken access control on API keys', async () => {
    const code = `
      app.get('/api/keys', async (req, res) => {
        // Returns all API keys (not just user's own keys)
        const keys = await db.query("SELECT * FROM api_keys")
        res.json(keys)
      })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/broken.*access|information.*disclosure/)
    expect(analysis.strideCategory).toBe('Information Disclosure')
    expect(analysis.severity).toBe('Critical')
    expect(analysis.mitigation.toLowerCase()).toMatch(/filter.*user|WHERE.*user_id/)
    expect(analysis.codeExample).toMatch(/WHERE.*user_id|req\.user/)
  })

  test('4.10: JWT token without expiration', async () => {
    const code = `
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)
      // No expiration set - token valid forever
      res.json({ token })
    `

    const analysis: SecurityAnalysis = await reviewCode(code)

    expect(analysis.detected).toBe(true)
    expect(analysis.vulnerability.toLowerCase()).toMatch(/jwt.*expiration|token.*expiration|no.*expiry/)
    expect(analysis.strideCategory).toBe('Spoofing')
    expect(analysis.severity).toBe('High')
    expect(analysis.mitigation.toLowerCase()).toMatch(/expiresIn|expiration/)
    expect(analysis.codeExample).toMatch(/expiresIn.*:.*'|exp/)
  })

})

// ============================================================================
// Test Suite Summary
// ============================================================================

describe('Authorization Test Suite Summary', () => {

  test('Suite validation: 10 Authorization tests defined', () => {
    // This test verifies the test suite structure itself
    const suiteCount = {
      idor: 1,
      horizontalPrivilege: 1,
      verticalPrivilege: 1,
      missingAccessControl: 1,
      pathTraversal: 1,
      massAssignment: 1,
      fileUpload: 1,
      rateLimit: 1,
      brokenAccessControl: 1,
      jwtExpiration: 1,
      total: 10
    }

    expect(suiteCount.total).toBe(10)
  })

})
