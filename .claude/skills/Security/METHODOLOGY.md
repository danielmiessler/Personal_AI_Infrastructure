# Security Skill Methodology

**Purpose**: Document security-first principles and workflow sequence

---

## Core Principles

### 1. Shift-Left Security
**Principle**: Find and fix security issues during design, not after deployment

**Traditional Approach** (Shift-Right):
```
Design → Code → Deploy → Security Review → FIND ISSUES → Rewrite → Deploy again
                                          ↑
                                    Expensive, late
```

**Shift-Left Approach**:
```
Design → Threat Model → Code with Security → Security Tests → Deploy
         ↑
    Find issues early, cheap to fix
```

**Benefits**:
- 100x cheaper to fix in design vs production
- Prevents security debt
- Security requirements clear from Day 1

---

### 2. Defense in Depth
**Principle**: Multiple layers of security (don't rely on one control)

**Example**: User Authentication
- Layer 1: Network firewall (external → DMZ)
- Layer 2: API gateway (rate limiting, IP whitelist)
- Layer 3: Application auth (username + password + MFA)
- Layer 4: Session management (secure tokens, expiry)
- Layer 5: Database access control (least privilege)
- Layer 6: Audit logging (detect breaches)

**If one layer fails**, others still protect the system.

---

### 3. Principle of Least Privilege
**Principle**: Grant minimum permissions required for the task

**Examples**:
- User can read their own data (not all users' data)
- Database user has SELECT only (not DELETE, DROP)
- API key has specific scope (not "admin" access)

**Implementation**: Role-Based Access Control (RBAC)

---

### 4. Fail Secure (Fail Closed)
**Principle**: When errors occur, deny access (don't grant by default)

**Bad Example** (Fail Open):
```typescript
function checkPermissions(user: User): boolean {
  try {
    return hasAdminRole(user);
  } catch (error) {
    return true; // DANGEROUS: grants access on error
  }
}
```

**Good Example** (Fail Secure):
```typescript
function checkPermissions(user: User): boolean {
  try {
    return hasAdminRole(user);
  } catch (error) {
    console.error('Permission check failed', error);
    return false; // SAFE: denies access on error
  }
}
```

---

### 5. Don't Trust User Input
**Principle**: All user input is potentially malicious until validated

**Validation Required**:
- Input validation (whitelist, not blacklist)
- Output encoding (prevent XSS)
- Parameterized queries (prevent SQL injection)
- File type validation (prevent malware upload)

**Example**:
```typescript
// Bad: Trust user input
const query = `SELECT * FROM users WHERE id = ${userId}`;
// SQL injection possible: userId = "1 OR 1=1"

// Good: Validate and parameterize
const userId = parseInt(request.params.id); // Validate: must be number
const query = 'SELECT * FROM users WHERE id = ?'; // Parameterize
db.execute(query, [userId]);
```

---

## Workflow Sequence

### Typical Security Workflow

```
1. PRD Created (AgilePm skill)
   ↓
2. Threat Model (Security skill: ThreatModel workflow)
   - Identify STRIDE threats
   - Rate risks (Critical/High/Medium/Low)
   - Define mitigations
   ↓
3. CMMC Baseline (Security skill: CmmcBaseline workflow)
   - Map features to CMMC practices
   - Identify compliance gaps
   - Create remediation roadmap
   ↓
4. User Stories Created (AgilePm skill)
   - Security requirements from threat model added
   - CMMC practices mapped to stories
   ↓
5. Test Strategy (TestArchitect skill)
   - Security test scenarios from threat model
   - Penetration testing plan
   ↓
6. Implementation (Engineer agent)
   - Code with security mitigations
   - Security tests pass
   ↓
7. Security Review (Before deployment)
   - Verify all critical threats mitigated
   - Run OWASP ZAP, SQLMap
   - Review CMMC compliance
   ↓
8. Production Deployment
   - Monitor for security alerts
   - Incident response plan ready
```

---

## STRIDE Methodology

**STRIDE** is Microsoft's threat modeling framework (6 threat categories):

| Category | What It Is | Example | Mitigation |
|----------|------------|---------|------------|
| **S** - Spoofing | Impersonating someone else | Stolen session token | Strong auth (MFA) |
| **T** - Tampering | Modifying data | SQL injection | Input validation |
| **R** - Repudiation | Denying actions | "I didn't delete that" | Audit logging |
| **I** - Info Disclosure | Exposing data | XSS leaks tokens | Output encoding, encryption |
| **D** - Denial of Service | Making system unavailable | API flooding | Rate limiting |
| **E** - Elevation of Privilege | Gaining unauthorized access | Broken access control | RBAC, least privilege |

**How to Apply**:
1. For each component/data flow, ask: "What STRIDE threats apply?"
2. Rate each threat by risk (Impact × Likelihood)
3. Define mitigations for Critical + High threats
4. Document in threat model

---

## CMMC Framework

**CMMC** (Cybersecurity Maturity Model Certification) is required for DoD contractors.

**Levels**:
- **Level 1**: Basic cyber hygiene (17 practices)
- **Level 2**: Intermediate (110 practices) ← Most contractors
- **Level 3**: Advanced (130 practices) ← Sensitive programs

**5 Core Domains** (MVP):

1. **AC** - Access Control: Who can access what?
2. **IA** - Identification & Authentication: Who are you?
3. **SC** - System & Communications Protection: Is data protected?
4. **CM** - Configuration Management: Are systems configured securely?
5. **SI** - System & Information Integrity: Is the system trustworthy?

**12 Additional Domains** (Release 0.2):
- AU (Audit & Accountability)
- AT (Awareness & Training)
- CA (Security Assessment)
- CP (Contingency Planning)
- IR (Incident Response)
- MA (Maintenance)
- MP (Media Protection)
- PE (Physical Protection)
- PS (Personnel Security)
- RA (Risk Assessment)
- RE (Recovery)
- SA (System & Services Acquisition)

---

## Common Security Patterns

### Pattern 1: Web Application Security

**Threats**:
- SQL injection, XSS, CSRF
- Broken authentication, session hijacking
- Insecure direct object references (IDOR)

**Mitigations**:
- Input validation (whitelist)
- Parameterized queries
- Output encoding
- CSRF tokens
- Secure session management (httpOnly, secure cookies)
- HTTPS everywhere

---

### Pattern 2: API Security

**Threats**:
- API key theft
- Lack of rate limiting → DoS
- Excessive data exposure
- Broken function-level authorization

**Mitigations**:
- OAuth 2.0 or JWT authentication
- Rate limiting per API key
- Least privilege (return minimal data)
- Function-level authorization checks
- API gateway with throttling

---

### Pattern 3: Data Protection

**Threats**:
- Data breaches (unencrypted storage)
- Man-in-the-middle attacks (unencrypted transit)
- Insider threats (excessive access)

**Mitigations**:
- Encryption at rest (AES-256, FIPS-validated)
- Encryption in transit (HTTPS, TLS 1.3)
- Access control (RBAC, least privilege)
- Audit logging (detect suspicious access)
- Data classification (CUI, PII, public)

---

## Security Testing

### Test Types

1. **Static Analysis** (SAST):
   - Tool: SonarQube, Semgrep
   - When: On every commit (CI/CD)
   - Finds: Hardcoded secrets, SQL injection patterns

2. **Dynamic Analysis** (DAST):
   - Tool: OWASP ZAP, Burp Suite
   - When: On staging environment (before production)
   - Finds: XSS, CSRF, authentication bypass

3. **Dependency Scanning**:
   - Tool: Dependabot, Snyk, npm audit
   - When: Daily (automated)
   - Finds: Vulnerable dependencies (CVEs)

4. **Penetration Testing**:
   - Tool: Manual testing by security expert
   - When: Quarterly or before major releases
   - Finds: Business logic flaws, chained exploits

---

## Security Metrics

### Key Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Time to Fix Critical Vulnerabilities** | <24 hours | Track from discovery to deployment |
| **% of Code with Security Review** | 100% | Code review checklist |
| **CMMC Compliance** | 100% (110/110 practices) | CMMC baseline audit |
| **Vulnerabilities in Production** | 0 critical, <5 high | Security scanning tools |
| **Security Test Coverage** | ≥80% | OWASP ZAP scan results |

---

## Best Practices

### DO:
✅ Threat model during design (not after deployment)
✅ Use STRIDE for systematic threat identification
✅ Encrypt CUI at rest and in transit
✅ Implement multi-factor authentication (MFA)
✅ Use parameterized queries (prevent SQL injection)
✅ Rate limit APIs (prevent DoS)
✅ Audit log all privileged actions
✅ Review OWASP Top 10 annually

### DON'T:
❌ Skip threat modeling (expensive to fix later)
❌ Store passwords in plaintext
❌ Trust user input (always validate)
❌ Use weak crypto (MD5, SHA1 are broken)
❌ Hardcode secrets in code
❌ Grant excessive permissions
❌ Ignore security scan findings

---

## Resources

- **STRIDE**: [Microsoft Threat Modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- **OWASP Top 10**: [https://owasp.org/Top10/](https://owasp.org/Top10/)
- **CMMC**: [CMMC Model v2.0](https://dodcio.defense.gov/CMMC/)
- **NIST**: [Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Methodology Version**: 1.0
**Last Updated**: 2025-12-02
