# SecurityReview Workflow

**Purpose**: Perform security code review to identify vulnerabilities before deployment

**Input**: Code files, repository path, or pull request

**Output**: Security review report with findings, severity ratings, and remediation guidance

---

## What is Security Review?

**SecurityReview** analyzes code for security vulnerabilities using OWASP Top 10 framework and secure coding best practices.

**Use Cases**:
- Pre-commit code review (prevent vulnerabilities before merge)
- Legacy code audit (find vulnerabilities in existing codebase)
- Third-party library review (assess dependency security)
- Pull request security gate (block insecure code)

**Not a Replacement For**: Automated tools (SAST/DAST), manual penetration testing

**Complements**: ThreatModel (architecture review) + SecurityReview (code review) = comprehensive security

---

## When to Use Security Review

### ✅ Use SecurityReview For:

**High-Risk Code**:
- Authentication and authorization logic
- Payment processing
- Data encryption/decryption
- File upload handling
- SQL query construction
- API endpoint implementation

**Security-Sensitive Changes**:
- New authentication methods
- Permission changes
- Cryptography updates
- Input validation changes

**Compliance Requirements**:
- CMMC SI.L2-3.14.13 (security function verification)
- PCI-DSS requirement 6.3.2 (code reviews)
- OWASP ASVS verification

**Examples**:
- "Review this authentication code for security issues"
- "Analyze this API endpoint for OWASP Top 10 vulnerabilities"
- "Check this SQL query function for injection flaws"

---

### ❌ Don't Use SecurityReview For:

**Non-Security Code Quality**:
- Performance optimization → Use code profiling tools
- Code style/formatting → Use linters (ESLint, Pylint)
- Logic bugs → Use unit tests

**Automated Scanning**:
- Dependency vulnerabilities → Use SCA tools (Snyk, Dependabot)
- Known CVEs → Use vulnerability scanners

**Infrastructure Security**:
- Cloud configuration → Use InfrastructureSecurity workflow
- Network architecture → Use ThreatModel workflow

---

## Workflow Steps

### Step 1: Identify Code Scope

**Action**: Determine what code to review

**Scope Options**:
- **Single file**: Review one file (e.g., `auth.js`)
- **Pull request**: Review all changed files in PR
- **Module**: Review entire module (e.g., `src/auth/`)
- **Repository**: Full codebase review (expensive, use sparingly)

**Input Needed**:
- File paths or repository URL
- Programming language(s)
- Code context (what does this code do?)

**Example**:
```
Scope: src/auth/login.ts
Language: TypeScript
Context: User login endpoint with email/password authentication
```

---

### Step 2: Apply OWASP Top 10 Framework

**Action**: Analyze code for OWASP Top 10 vulnerabilities

#### A01: Broken Access Control

**Look for**:
- Missing authorization checks
- Insecure direct object references (IDOR)
- Privilege escalation vulnerabilities
- CORS misconfiguration

**Code Patterns to Flag**:
```javascript
// ❌ BAD: No authorization check
app.get('/api/user/:id', (req, res) => {
  const user = db.getUser(req.params.id)  // Any user can access any ID
  res.json(user)
})

// ✅ GOOD: Authorization check
app.get('/api/user/:id', (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({error: 'Forbidden'})
  }
  const user = db.getUser(req.params.id)
  res.json(user)
})
```

---

#### A02: Cryptographic Failures

**Look for**:
- Weak encryption algorithms (DES, RC4, MD5, SHA1)
- Hardcoded encryption keys
- Passwords transmitted in cleartext
- Sensitive data not encrypted at rest

**Code Patterns to Flag**:
```python
# ❌ BAD: MD5 for password hashing
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()

# ✅ GOOD: bcrypt for password hashing
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

**CMMC Practices**:
- IA.L2-3.5.10: Store passwords cryptographically-protected
- SC.L2-3.13.8: Employ FIPS-validated cryptography

---

#### A03: Injection

**Look for**:
- SQL injection (string concatenation in queries)
- Command injection (unsanitized input to shell)
- LDAP injection
- NoSQL injection

**Code Patterns to Flag**:
```javascript
// ❌ BAD: SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${req.params.id}`
db.query(query)

// ✅ GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE id = ?'
db.query(query, [req.params.id])
```

**CMMC Practices**:
- SI.L2-3.14.14: Protect system inputs from malicious code

---

#### A04: Insecure Design

**Look for**:
- Missing security requirements
- No threat modeling
- Insufficient rate limiting
- No input validation strategy

**Code Patterns to Flag**:
```javascript
// ❌ BAD: No rate limiting on login
app.post('/login', (req, res) => {
  // Attacker can brute force passwords
  if (checkPassword(req.body.username, req.body.password)) {
    res.json({token: generateToken()})
  }
})

// ✅ GOOD: Rate limiting applied
const rateLimiter = rateLimit({max: 5, windowMs: 15 * 60 * 1000})
app.post('/login', rateLimiter, (req, res) => {
  if (checkPassword(req.body.username, req.body.password)) {
    res.json({token: generateToken()})
  }
})
```

---

#### A05: Security Misconfiguration

**Look for**:
- Debug mode enabled in production
- Default credentials
- Verbose error messages (information disclosure)
- Unnecessary services enabled

**Code Patterns to Flag**:
```python
# ❌ BAD: Debug mode in production
DEBUG = True  # Leaks stack traces, secret keys

# ✅ GOOD: Debug mode off in production
DEBUG = os.environ.get('ENV') != 'production'
```

**CMMC Practices**:
- CM.L2-3.4.2: Establish security configuration settings
- CM.L2-3.4.6: Employ least functionality

---

#### A06: Vulnerable and Outdated Components

**Look for**:
- Outdated dependencies (package.json, requirements.txt)
- Known CVEs in libraries
- Unsupported library versions

**Code Patterns to Flag**:
```json
// ❌ BAD: Outdated vulnerable library
{
  "dependencies": {
    "express": "3.0.0"  // Ancient version with known CVEs
  }
}

// ✅ GOOD: Up-to-date libraries
{
  "dependencies": {
    "express": "^4.18.0"  // Current major version
  }
}
```

**CMMC Practices**:
- RA.L2-3.11.2: Scan for vulnerabilities
- SI.L2-3.14.1: Identify and correct flaws timely

---

#### A07: Identification and Authentication Failures

**Look for**:
- Weak password policies
- No MFA
- Session fixation vulnerabilities
- Predictable session IDs

**Code Patterns to Flag**:
```javascript
// ❌ BAD: Weak password policy
if (password.length < 6) {
  return res.status(400).json({error: 'Password too short'})
}

// ✅ GOOD: Strong password policy
if (password.length < 14 || !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
  return res.status(400).json({error: 'Password does not meet complexity requirements'})
}
```

**CMMC Practices**:
- IA.L2-3.5.7: Enforce minimum password complexity
- IA.L2-3.5.3: Use multifactor authentication

---

#### A08: Software and Data Integrity Failures

**Look for**:
- Unsigned software updates
- Deserialization of untrusted data
- No integrity checks on critical data

**Code Patterns to Flag**:
```python
# ❌ BAD: Pickle deserialization of untrusted data
import pickle
user_data = pickle.loads(request.body)  # Code execution vulnerability

# ✅ GOOD: JSON deserialization (safe)
import json
user_data = json.loads(request.body)
```

**CMMC Practices**:
- SI.L2-3.14.7: Employ integrity checks

---

#### A09: Security Logging and Monitoring Failures

**Look for**:
- No logging of security events
- Sensitive data in logs
- No alerting on suspicious activity

**Code Patterns to Flag**:
```javascript
// ❌ BAD: No logging of failed login attempts
app.post('/login', (req, res) => {
  if (!checkPassword(req.body.username, req.body.password)) {
    return res.status(401).json({error: 'Invalid credentials'})
    // Attacker can brute force silently
  }
})

// ✅ GOOD: Log failed login attempts
app.post('/login', (req, res) => {
  if (!checkPassword(req.body.username, req.body.password)) {
    logger.warn('Failed login attempt', {
      username: req.body.username,
      ip: req.ip,
      timestamp: new Date()
    })
    return res.status(401).json({error: 'Invalid credentials'})
  }
})
```

**CMMC Practices**:
- AU.L2-3.3.1: Create and retain audit records

---

#### A10: Server-Side Request Forgery (SSRF)

**Look for**:
- User-controlled URLs in server requests
- No URL validation
- Access to internal/localhost URLs

**Code Patterns to Flag**:
```javascript
// ❌ BAD: SSRF vulnerability
app.get('/fetch', (req, res) => {
  const url = req.query.url  // Attacker controls URL
  fetch(url).then(data => res.send(data))  // Can access internal services
})

// ✅ GOOD: URL allowlist
const ALLOWED_DOMAINS = ['api.trusted.com']
app.get('/fetch', (req, res) => {
  const url = new URL(req.query.url)
  if (!ALLOWED_DOMAINS.includes(url.hostname)) {
    return res.status(400).json({error: 'Invalid domain'})
  }
  fetch(url).then(data => res.send(data))
})
```

---

### Step 3: Check Secure Coding Practices

**Action**: Review code for general security anti-patterns beyond OWASP Top 10

#### Input Validation

**Check for**:
- All user inputs validated (allowlist, not blocklist)
- Type checking (string, number, email, etc.)
- Length limits enforced
- Special characters sanitized

**Code Patterns to Flag**:
```javascript
// ❌ BAD: Blocklist approach
if (input.includes('script')) {  // Easy to bypass
  return 'Invalid'
}

// ✅ GOOD: Allowlist approach
if (!/^[a-zA-Z0-9_-]+$/.test(input)) {  // Only allow safe characters
  return 'Invalid'
}
```

---

#### Error Handling

**Check for**:
- Generic error messages (no stack traces in production)
- No sensitive data in errors
- Fail-secure (errors deny access, not grant)

**Code Patterns to Flag**:
```python
# ❌ BAD: Detailed error message
try:
    user = db.get_user(user_id)
except Exception as e:
    return f"Database error: {str(e)}"  # Leaks DB structure

# ✅ GOOD: Generic error message
try:
    user = db.get_user(user_id)
except Exception as e:
    logger.error(f"DB error: {str(e)}")  # Log internally
    return "An error occurred"  # Generic to user
```

**CMMC Practices**:
- SI.L2-3.14.17: Fail in a secure state

---

#### Secrets Management

**Check for**:
- No hardcoded secrets (API keys, passwords, tokens)
- Secrets loaded from environment variables
- No secrets in version control (check .gitignore)

**Code Patterns to Flag**:
```javascript
// ❌ BAD: Hardcoded API key
const API_KEY = 'sk-1234567890abcdef'  // Committed to git

// ✅ GOOD: Environment variable
const API_KEY = process.env.API_KEY  // Loaded from .env (gitignored)
```

---

#### Session Management

**Check for**:
- Secure session cookie flags (HttpOnly, Secure, SameSite)
- Session expiration enforced
- Session invalidation on logout

**Code Patterns to Flag**:
```javascript
// ❌ BAD: Insecure cookie
res.cookie('session', sessionId)  // No flags

// ✅ GOOD: Secure cookie
res.cookie('session', sessionId, {
  httpOnly: true,   // Not accessible via JavaScript
  secure: true,     // HTTPS only
  sameSite: 'strict'  // CSRF protection
})
```

**CMMC Practices**:
- AC.L2-3.1.10: Use session lock with pattern-hiding displays

---

### Step 4: Rate Findings by Severity

**Action**: Classify each finding by risk level

**Severity Levels**:

| Severity | Criteria | Example | Remediation SLA |
|----------|----------|---------|-----------------|
| **Critical** | Remote code execution, authentication bypass, SQL injection in production | SQL injection in login endpoint | Fix immediately (24 hours) |
| **High** | Data exposure, privilege escalation, cryptographic failures | Passwords stored in plaintext | Fix within 7 days |
| **Medium** | Missing security controls, weak configurations | No rate limiting on API | Fix within 30 days |
| **Low** | Information disclosure, minor misconfigurations | Verbose error messages | Fix within 90 days |
| **Informational** | Best practice violations, suggestions | Commented-out code | Fix as time permits |

**Risk Calculation**:
```
Risk = Impact × Likelihood

Impact:
- Critical: Data breach, system compromise
- High: User data exposure, privilege escalation
- Medium: Limited data exposure, DoS
- Low: Information disclosure

Likelihood:
- High: Easy to exploit, public exploit available
- Medium: Moderate skill required
- Low: Difficult to exploit, requires insider access
```

---

### Step 5: Generate Remediation Guidance

**Action**: Provide actionable fix recommendations for each finding

**Remediation Format**:

```markdown
### Finding 1: SQL Injection in User Search

**Severity**: Critical
**Location**: src/api/search.js:42
**OWASP Category**: A03: Injection
**CMMC Practice**: SI.L2-3.14.14 (Protect system inputs)

**Vulnerable Code**:
```javascript
const query = `SELECT * FROM users WHERE name LIKE '%${req.query.name}%'`
db.query(query)
```

**Impact**:
- Attacker can execute arbitrary SQL commands
- Full database compromise possible
- User data exfiltration

**Proof of Concept**:
```
GET /api/search?name='; DROP TABLE users; --
```

**Remediation**:
Use parameterized queries to prevent SQL injection:

```javascript
const query = 'SELECT * FROM users WHERE name LIKE ?'
db.query(query, [`%${req.query.name}%`])
```

**Additional Recommendations**:
- Implement input validation (allowlist for name characters)
- Add rate limiting to prevent brute force
- Log all search queries for audit trail

**References**:
- OWASP SQL Injection Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- CMMC SI.L2-3.14.14: https://dodcio.defense.gov/CMMC/

**Remediation SLA**: Fix within 24 hours (Critical)
```

---

### Step 6: Create Security Review Report

**Action**: Compile findings into comprehensive report

**Report Structure**:

```markdown
# Security Code Review Report

**Review Date**: YYYY-MM-DD
**Reviewer**: [Name or "FORGE SecurityReview"]
**Code Scope**: [Files/modules reviewed]
**Language**: [Programming language]

---

## Executive Summary

**Total Findings**: X
- Critical: X
- High: X
- Medium: X
- Low: X
- Informational: X

**Security Posture**: [Excellent / Good / Fair / Poor]

**Deployment Recommendation**: [Approve / Approve with Mitigations / Block]

**Key Risks**:
1. [Critical Risk 1]
2. [Critical Risk 2]

---

## Findings by Severity

### Critical Findings (X)

[List of critical findings with full details]

### High Findings (X)

[List of high findings with full details]

### Medium Findings (X)

[List of medium findings with full details]

### Low Findings (X)

[List of low findings with full details]

### Informational (X)

[List of informational findings]

---

## OWASP Top 10 Coverage

| OWASP Category | Findings | Status |
|----------------|----------|--------|
| A01: Broken Access Control | X | ✅ / ⚠️ / ❌ |
| A02: Cryptographic Failures | X | ✅ / ⚠️ / ❌ |
| A03: Injection | X | ✅ / ⚠️ / ❌ |
| A04: Insecure Design | X | ✅ / ⚠️ / ❌ |
| A05: Security Misconfiguration | X | ✅ / ⚠️ / ❌ |
| A06: Vulnerable Components | X | ✅ / ⚠️ / ❌ |
| A07: Auth Failures | X | ✅ / ⚠️ / ❌ |
| A08: Software Integrity Failures | X | ✅ / ⚠️ / ❌ |
| A09: Logging Failures | X | ✅ / ⚠️ / ❌ |
| A10: SSRF | X | ✅ / ⚠️ / ❌ |

**Legend**: ✅ No issues | ⚠️ Minor issues | ❌ Critical issues

---

## CMMC Compliance

**Practices Addressed**:
- SI.L2-3.14.14: Input validation [Status]
- IA.L2-3.5.10: Cryptographic password storage [Status]
- AU.L2-3.3.1: Security event logging [Status]

**Practices Not Addressed**:
- [List gaps]

---

## Remediation Plan

| Finding | Severity | Owner | Due Date | Status |
|---------|----------|-------|----------|--------|
| Finding 1 | Critical | [Name] | [Date] | ⏳ |
| Finding 2 | High | [Name] | [Date] | ⏳ |

---

## Recommendations

1. **Immediate Actions** (Critical/High):
   - [Action 1]
   - [Action 2]

2. **Short-term** (Medium):
   - [Action 1]
   - [Action 2]

3. **Long-term** (Low):
   - [Action 1]
   - [Action 2]

---

**Next Review**: [Recommended re-review date after fixes]
**Sign-off**: [Security engineer approval]
```

---

## Integration with Other Skills

### With AgilePm
- **Story Definition**: Add security acceptance criteria
- **Sprint Planning**: Allocate time for security remediation

### With Standup
- **Daniel's Role**: Daniel uses SecurityReview findings in standup
- **Discussion**: Prioritize which findings to fix in current sprint

### With TestArchitect
- **Security Tests**: Convert findings to security test cases
- **Coverage**: Ensure tests prevent regression

---

## Tips for Effective Security Review

### DO:
✅ Review high-risk code first (auth, payment, file upload)
✅ Provide specific code examples in findings
✅ Include remediation guidance, not just problems
✅ Link to OWASP cheat sheets and documentation
✅ Prioritize by risk (Critical > High > Medium > Low)
✅ Re-review after fixes to verify remediation

### DON'T:
❌ Review all code at once (focus on security-sensitive areas)
❌ Report non-security code quality issues
❌ Skip remediation guidance (findings without fixes aren't helpful)
❌ Ignore context (understand what the code is trying to do)
❌ Over-report (100 low-severity findings = noise)

---

## Automation Integration

**Pre-Commit Hook**:
```bash
# Run security review on changed files before commit
changed_files=$(git diff --cached --name-only)
security_review --files "$changed_files" --severity critical,high
```

**CI/CD Pipeline**:
```yaml
# GitHub Actions example
security-review:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Security Review
      run: |
        security_review --pr ${{ github.event.pull_request.number }}
        # Block merge if critical findings
```

**Pull Request Gate**:
- Block PR merge if Critical or High findings
- Require security review approval for auth/payment code

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Complements**: ThreatModel (architecture) + SecurityReview (code) = comprehensive security
