# Security Review Report

**Project:** [Project/Repository Name]
**Review Type:** Quick | Standard | Deep
**Date:** YYYY-MM-DD
**Reviewer:** [Name]
**Status:** Draft | Final

---

## Executive Summary

**Overall Risk Level:** Critical | High | Medium | Low | Pass

[2-3 sentence summary of review scope and key findings]

### Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| High | 0 | - |
| Medium | 0 | - |
| Low | 0 | - |
| Info | 0 | - |

### Recommendation

- [ ] **Approve** - No blocking issues
- [ ] **Approve with conditions** - Fix high/critical before merge
- [ ] **Request changes** - Significant issues require rework
- [ ] **Block** - Critical vulnerabilities, do not merge

---

## 1. Scope

### 1.1 Review Target

| Attribute | Value |
|-----------|-------|
| Repository | [repo-name] |
| Branch/PR | [branch or PR #] |
| Commit | [commit hash] |
| Files Reviewed | [count] |

### 1.2 Files in Scope

```
src/
├── api/
│   ├── auth.js          ✓ Reviewed
│   ├── users.js         ✓ Reviewed
│   └── payments.js      ✓ Reviewed
├── middleware/
│   └── validation.js    ✓ Reviewed
└── utils/
    └── crypto.js        ✓ Reviewed
```

### 1.3 Review Depth

| Area | Coverage |
|------|----------|
| OWASP Top 10 | Full |
| Automated Scans | DependencyAudit, SecretsScan |
| Manual Review | Authentication, Authorization, Input validation |
| Business Logic | [Yes/No] |

---

## 2. Tool Scan Results

### 2.1 Dependency Audit (mai-security-tools)

**Scan Date:** YYYY-MM-DD
**Tool Version:** X.X.X

| Severity | Count | Action Required |
|----------|-------|-----------------|
| Critical | 0 | Immediate fix |
| High | 2 | Fix before merge |
| Medium | 5 | Fix within sprint |
| Low | 12 | Track in backlog |

**Critical/High Findings:**

| Package | Version | CVE | Severity | Fix Version |
|---------|---------|-----|----------|-------------|
| lodash | 4.17.19 | CVE-2021-23337 | High | 4.17.21 |
| axios | 0.21.0 | CVE-2021-3749 | High | 0.21.2 |

**Remediation:**
```bash
npm update lodash axios
# or
npm audit fix
```

### 2.2 Secrets Scan (mai-security-tools)

**Scan Date:** YYYY-MM-DD
**Result:** Pass | Fail

| Finding | File | Line | Type | Status |
|---------|------|------|------|--------|
| [None found] | - | - | - | - |

### 2.3 SAST Scan (if applicable)

**Scan Date:** YYYY-MM-DD
**Tool:** [Tool name]

| Rule | Count | Files Affected |
|------|-------|----------------|
| [rule-id] | 0 | - |

---

## 3. Manual Review Findings

### Finding F01: [Title]

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical / High / Medium / Low / Info |
| **Category** | OWASP [A01-A10] |
| **File** | `src/api/users.js` |
| **Line** | 42-48 |
| **CWE** | CWE-XXX |

**Description:**
[Detailed description of the vulnerability]

**Vulnerable Code:**
```javascript
// src/api/users.js:42-48
app.get('/api/users/:id', (req, res) => {
  const user = db.getUser(req.params.id);  // No authorization check
  res.json(user);
});
```

**Risk:**
[What could an attacker do? What is the potential impact?]

**Remediation:**
```javascript
// Recommended fix
app.get('/api/users/:id', authorize, (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = db.getUser(req.params.id);
  res.json(user);
});
```

**References:**
- [OWASP A01 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [CWE-XXX](https://cwe.mitre.org/data/definitions/XXX.html)

---

### Finding F02: [Title]

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical / High / Medium / Low / Info |
| **Category** | OWASP [A01-A10] |
| **File** | `src/api/search.js` |
| **Line** | 15-20 |
| **CWE** | CWE-89 |

**Description:**
[Detailed description]

**Vulnerable Code:**
```javascript
// src/api/search.js:15-20
app.get('/api/search', (req, res) => {
  const query = `SELECT * FROM products WHERE name LIKE '%${req.query.q}%'`;
  db.query(query);  // SQL Injection
});
```

**Risk:**
Attacker can read, modify, or delete database contents.

**Remediation:**
```javascript
app.get('/api/search', (req, res) => {
  const query = 'SELECT * FROM products WHERE name LIKE ?';
  db.query(query, [`%${req.query.q}%`]);
});
```

**References:**
- [OWASP A03 - Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

[Continue for each finding...]

---

## 4. OWASP Top 10 Checklist

| Category | Status | Notes |
|----------|--------|-------|
| A01: Broken Access Control | FAIL | F01 - IDOR in user API |
| A02: Cryptographic Failures | PASS | Strong algorithms used |
| A03: Injection | FAIL | F02 - SQL injection |
| A04: Insecure Design | PASS | Rate limiting present |
| A05: Security Misconfiguration | PASS | Production config verified |
| A06: Vulnerable Components | WARN | 2 high severity dependencies |
| A07: Auth Failures | PASS | MFA implemented |
| A08: Software Integrity | PASS | Dependencies locked |
| A09: Logging Failures | WARN | Missing security event logs |
| A10: SSRF | PASS | No user-controlled URLs |

---

## 5. Recommendations

### 5.1 Critical/High Priority (Block Merge)

| # | Finding | Action | Owner | Deadline |
|---|---------|--------|-------|----------|
| 1 | F01 | Add authorization check to user API | [Dev] | Before merge |
| 2 | F02 | Use parameterized queries | [Dev] | Before merge |
| 3 | Deps | Update lodash and axios | [Dev] | Before merge |

### 5.2 Medium Priority (Fix in Sprint)

| # | Finding | Action | Owner | Deadline |
|---|---------|--------|-------|----------|
| 4 | A09 | Add security event logging | [Dev] | Sprint end |
| 5 | Deps | Update 5 medium severity packages | [Dev] | Sprint end |

### 5.3 Low Priority (Backlog)

| # | Finding | Action | Owner |
|---|---------|--------|-------|
| 6 | Deps | Address 12 low severity findings | [Dev] |

---

## 6. Remediation Verification

After fixes are implemented:

| Finding | Fix Commit | Verified By | Date | Status |
|---------|------------|-------------|------|--------|
| F01 | [commit] | [Name] | YYYY-MM-DD | Verified |
| F02 | [commit] | [Name] | YYYY-MM-DD | Verified |
| Deps | [commit] | [Name] | YYYY-MM-DD | Verified |

---

## 7. Sign-Off

### 7.1 Reviewer Attestation

I have reviewed the code changes against the OWASP Top 10 and conducted the automated scans documented in this report.

| Role | Name | Date |
|------|------|------|
| Security Reviewer | | |

### 7.2 Developer Acknowledgment

I acknowledge the findings in this report and commit to addressing them according to the timelines specified.

| Role | Name | Date |
|------|------|------|
| Developer | | |

### 7.3 Final Approval (Post-Remediation)

All critical and high findings have been addressed and verified.

| Role | Name | Date |
|------|------|------|
| Security Lead | | |

---

## Appendix A: Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| **Critical** | Actively exploitable, immediate risk of data breach or system compromise | Fix immediately, block all deployments |
| **High** | Significant risk, exploitation likely possible | Fix before merge/deploy |
| **Medium** | Moderate risk, exploitation requires specific conditions | Fix within current sprint |
| **Low** | Low risk, defense in depth improvement | Fix within quarter |
| **Info** | Best practice suggestion, no direct security impact | Optional improvement |

## Appendix B: Related Documents

- Threat Model: [Link]
- CMMC Baseline: [Link]
- Previous Security Reviews: [Link]

## Appendix C: Tool Versions

| Tool | Version |
|------|---------|
| mai-security-tools | X.X.X |
| npm audit | (npm X.X.X) |
| [other tools] | X.X.X |
