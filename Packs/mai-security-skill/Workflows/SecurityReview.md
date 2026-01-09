# Security Review Workflow

OWASP Top 10 security code review with automated scanning and manual analysis.

## Overview

| Attribute | Value |
|-----------|-------|
| **Purpose** | Identify security vulnerabilities before code reaches production |
| **Input** | Code files, pull request, or repository path |
| **Output** | Security review report (Templates/security-report.md) |
| **Duration** | 15 min (quick), 1 hour (standard), 4+ hours (deep) |

## Review Depth Levels

| Level | When to Use | Coverage |
|-------|-------------|----------|
| **Quick** | Low-risk changes, documentation, tests | Automated scans + critical categories |
| **Standard** | Most PRs, feature additions | All OWASP categories + automated scans |
| **Deep** | Auth changes, payment, sensitive data | Full manual review + business logic |

## Workflow Steps

### Step 1: Run Automated Scans (mai-security-tools)

Execute these scans from the mai-security-tools pack:

```bash
# Dependency vulnerability scan
mai-security-tools DependencyAudit --path <repo_path>

# Secrets detection
mai-security-tools SecretsScan --path <repo_path>

# Static analysis (if available)
mai-security-tools SastScan --path <repo_path>
```

**Scan result actions:**
| Severity | Action |
|----------|--------|
| Critical | Block merge, fix immediately |
| High | Block merge, fix before review continues |
| Medium | Document, prioritize for remediation |
| Low | Note for future improvement |

### Step 2: Apply OWASP Top 10 Checklist

Review code against each OWASP category. See [Knowledge/owasp-patterns.md](../Knowledge/owasp-patterns.md) for detailed patterns.

#### A01: Broken Access Control

**Check for:**
- [ ] Authorization on all endpoints
- [ ] IDOR vulnerabilities (direct object references)
- [ ] Missing function-level access control
- [ ] CORS misconfiguration
- [ ] Path traversal vulnerabilities

**Code patterns to find:**
```
- Direct database ID in URLs/parameters
- User input in file paths
- Missing authorization middleware
- Permissive CORS headers
```

#### A02: Cryptographic Failures

**Check for:**
- [ ] Hardcoded secrets or keys
- [ ] Weak algorithms (MD5, SHA1, DES)
- [ ] Missing encryption for sensitive data
- [ ] Improper certificate validation
- [ ] Sensitive data in logs or errors

**Code patterns to find:**
```
- Hardcoded passwords, API keys, tokens
- crypto.createHash('md5') or similar
- HTTP URLs for sensitive operations
- verify: false, rejectUnauthorized: false
```

#### A03: Injection

**Check for:**
- [ ] SQL injection
- [ ] NoSQL injection
- [ ] Command injection
- [ ] LDAP injection
- [ ] XSS (cross-site scripting)

**Code patterns to find:**
```
- String concatenation in SQL queries
- User input in exec(), spawn(), eval()
- Unsanitized HTML output
- Dynamic query construction
```

#### A04: Insecure Design

**Check for:**
- [ ] Missing rate limiting
- [ ] No input validation
- [ ] Trust boundary violations
- [ ] Missing security controls
- [ ] Insecure defaults

**Code patterns to find:**
```
- No request throttling on sensitive endpoints
- Accepting unbounded input sizes
- Missing authentication on internal APIs
```

#### A05: Security Misconfiguration

**Check for:**
- [ ] Default credentials
- [ ] Unnecessary features enabled
- [ ] Verbose error messages
- [ ] Missing security headers
- [ ] Debug mode in production

**Code patterns to find:**
```
- DEBUG = True, NODE_ENV != production
- Stack traces in error responses
- Missing helmet(), security headers
- Default admin/admin credentials
```

#### A06: Vulnerable Components

**Check for:**
- [ ] Known CVEs in dependencies
- [ ] Outdated packages
- [ ] Unmaintained dependencies
- [ ] Typosquatting packages

**This is covered by DependencyAudit scan in Step 1**

#### A07: Authentication Failures

**Check for:**
- [ ] Weak password requirements
- [ ] Missing brute force protection
- [ ] Session fixation
- [ ] Insecure session management
- [ ] Credential exposure

**Code patterns to find:**
```
- Password min length < 12
- No account lockout logic
- Session ID in URL
- Credentials in query strings
```

#### A08: Software Integrity Failures

**Check for:**
- [ ] Unsigned updates
- [ ] Unverified dependencies
- [ ] CI/CD pipeline security
- [ ] Deserialization vulnerabilities

**Code patterns to find:**
```
- eval(), deserialize() on untrusted data
- npm install without lockfile
- Missing integrity checks on downloads
```

#### A09: Logging Failures

**Check for:**
- [ ] Missing security event logs
- [ ] Sensitive data in logs
- [ ] No log integrity protection
- [ ] Missing alerting

**Code patterns to find:**
```
- console.log with passwords, tokens
- No logging on auth failures
- Logs without timestamps or context
```

#### A10: Server-Side Request Forgery (SSRF)

**Check for:**
- [ ] User-controlled URLs
- [ ] Internal service access
- [ ] Cloud metadata access
- [ ] URL validation bypass

**Code patterns to find:**
```
- fetch(userInput), axios.get(userUrl)
- Redirects to internal addresses
- XML external entity processing
```

### Step 3: Rate Findings

Assign severity to each finding:

| Severity | Criteria | SLA |
|----------|----------|-----|
| **Critical** | RCE, auth bypass, data breach likely | Fix immediately, block deploy |
| **High** | Significant data exposure, privilege escalation | Fix before merge |
| **Medium** | Limited exposure, requires preconditions | Fix within sprint |
| **Low** | Hardening, best practice | Fix within quarter |
| **Info** | Improvement suggestions | Optional |

### Step 4: Generate Remediation Plan

For each finding:

1. **Describe the issue** - What is vulnerable and why
2. **Show the location** - File, line number, code snippet
3. **Explain the risk** - What could an attacker do
4. **Provide remediation** - Specific fix with code example
5. **Assign owner** - Who will fix it
6. **Set timeline** - When it should be fixed

### Step 5: Document Review

Generate report using [Templates/security-report.md](../Templates/security-report.md).

Include:
- Executive summary
- Scope of review
- Findings by severity
- Tool scan results
- Manual review findings
- Remediation timeline
- Sign-off requirements

## Quick Reference: Detection Patterns

### SQL Injection
```javascript
// Vulnerable
db.query("SELECT * FROM users WHERE id = " + userId);
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// Secure
db.query("SELECT * FROM users WHERE id = ?", [userId]);
db.query("SELECT * FROM users WHERE email = $1", [email]);
```

### Command Injection
```javascript
// Vulnerable
exec("ls " + userPath);
spawn("convert", userFilename);

// Secure
execFile("ls", [sanitizedPath]);
spawn("convert", [sanitizedFilename], { shell: false });
```

### XSS
```javascript
// Vulnerable
element.innerHTML = userInput;
document.write(data);

// Secure
element.textContent = userInput;
DOMPurify.sanitize(userInput);
```

### Path Traversal
```javascript
// Vulnerable
fs.readFile(basePath + userInput);
path.join(uploadDir, req.params.filename);

// Secure
const safePath = path.resolve(basePath, userInput);
if (!safePath.startsWith(basePath)) throw new Error('Invalid path');
```

### IDOR
```javascript
// Vulnerable
app.get('/api/users/:id', (req, res) => {
  return db.getUser(req.params.id);
});

// Secure
app.get('/api/users/:id', (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).send('Forbidden');
  }
  return db.getUser(req.params.id);
});
```

## Output

Generate completed security report using [Templates/security-report.md](../Templates/security-report.md).

## Example Summary

**Review:** PR #142 - Add user profile API

**Findings:**
| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | High | A01 | IDOR in /api/users/:id - no authorization check |
| 2 | Medium | A03 | Potential SQL injection in search endpoint |
| 3 | Low | A05 | Missing rate limiting on profile update |
| 4 | Info | A09 | Consider adding audit logging for profile changes |

**Tool Results:**
- DependencyAudit: 0 critical, 2 high (lodash, axios)
- SecretsScan: Clean

**Recommendation:** Block merge until #1 and #2 are fixed. High severity dependencies should be updated in this PR.
