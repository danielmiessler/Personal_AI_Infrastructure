# GenerateAudit Workflow

**Purpose**: Generate CMMC Level 2 compliance audit trail for security reviews

**Input**: Security analysis results, code review findings, or STRIDE threat analysis

**Output**: CMMC-compliant audit trail document formatted for compliance assessors

---

## What is GenerateAudit?

**GenerateAudit** creates audit trail documentation that maps security findings to CMMC Level 2 practices, providing evidence for compliance assessments.

**Use Cases**:
- CMMC assessment preparation (provide evidence to assessors)
- Security audit documentation (demonstrate security controls)
- Compliance reporting (track CMMC practice coverage)
- Executive reporting (summarize security posture)

**CMMC Coverage**: 17 domains, 25+ practices
- Access Control (AC)
- Audit & Accountability (AU)
- Configuration Management (CM)
- Contingency Planning (CP)
- Identification & Authentication (IA)
- Incident Response (IR)
- System & Information Integrity (SI)
- System & Communications Protection (SC)
- And 9 more domains

**Audit Trail Format**: Assessor-ready markdown document with:
- Executive summary
- Findings by CMMC domain
- Practice-to-vulnerability mapping
- Remediation status
- Evidence of security controls

---

## When to Use GenerateAudit

### ✅ Use GenerateAudit For:

**Compliance Assessments**:
- CMMC Level 2 assessment preparation
- Third-party security audit
- SOC 2 compliance evidence
- ISO 27001 certification

**Security Reviews**:
- Pre-production security audit
- Quarterly security reviews
- Post-incident analysis
- Vulnerability disclosure response

**Reporting**:
- Executive security dashboard
- Board reporting
- Customer security questionnaires
- Vendor security assessments

**Examples**:
- "Generate CMMC audit trail for this security review"
- "Create compliance report for Q4 security audit"
- "Document security findings for CMMC assessor"

---

### ❌ Don't Use GenerateAudit For:

**Non-Compliance Documentation**:
- Project status reports → Use AgilePm skill
- Code documentation → Use inline comments
- API documentation → Use OpenAPI/Swagger

**Automated Compliance**:
- This is documentation, not automatic compliance
- Still need to implement security controls
- Still need to fix vulnerabilities

---

## Workflow Steps

### Step 1: Perform Security Analysis

**Action**: Run security scans to gather findings

**Analysis Options**:
- **ScanCode**: Scan code for vulnerabilities
- **PerformSTRIDE**: Comprehensive threat modeling
- **RunStandup**: Multi-agent security review
- **Manual Review**: Document existing findings

**Example**:
```bash
# Scan codebase for vulnerabilities
emma-scan src/

# Perform STRIDE analysis
emma-scan --stride src/auth/
```

**Collect**:
- All vulnerabilities found
- Severity ratings
- CMMC practice violations
- Remediation recommendations

---

### Step 2: Daniel Generates Audit Trail

**Daniel's Audit Trail Generation**:

**Section 1: Executive Summary**
```markdown
# CMMC Level 2 Security Review Audit Trail
**Date**: 2025-12-03
**Scope**: User authentication system
**Reviewer**: Daniel Security Engineer

## Summary
- Files Scanned: 24
- Vulnerabilities Found: 12
  - Critical: 2
  - High: 5
  - Medium: 4
  - Low: 1
- CMMC Domains Affected: 6
- CMMC Practices Violated: 8
- Remediation Status: 8 fixed, 4 in progress
```

**Section 2: Findings by CMMC Domain**
```markdown
## Findings by CMMC Domain

### AC - Access Control (3 violations)

**AC.L2-3.1.1**: Limit system access to authorized users
- **Critical**: Missing authentication check in `/api/admin` endpoint
  - File: `src/api/admin.ts:45`
  - Impact: Unauthorized users can access admin functions
  - Status: ✅ Fixed (2025-12-03)
  - Remediation: Added authentication middleware

- **High**: IDOR vulnerability in user profile endpoint
  - File: `src/api/users.ts:120`
  - Impact: User can access other users' profiles
  - Status: ⏳ In Progress
  - Remediation: Add authorization check for user ID

**AC.L2-3.1.2**: Limit system access to authorized transactions
- **Medium**: Missing transaction authorization in payment API
  - File: `src/api/payments.ts:67`
  - Impact: User can modify other users' payment methods
  - Status: ⏳ In Progress
  - Remediation: Validate user owns payment method before update

### SI - System and Information Integrity (5 violations)

**SI.L2-3.14.6**: Monitor, control, and protect communications
- **Critical**: SQL Injection in login endpoint
  - File: `src/auth/login.ts:34`
  - Impact: Attacker can dump database, bypass authentication
  - Status: ✅ Fixed (2025-12-03)
  - Remediation: Used parameterized queries

- **High**: XSS vulnerability in comment rendering
  - File: `src/components/Comment.tsx:89`
  - Impact: Attacker can inject malicious scripts
  - Status: ✅ Fixed (2025-12-03)
  - Remediation: Used DOMPurify to sanitize HTML

[... continues for all domains ...]
```

**Section 3: Practice-to-Vulnerability Matrix**
```markdown
## CMMC Practice Coverage Matrix

| Practice | Domain | Violations Found | Status |
|----------|--------|------------------|--------|
| AC.L2-3.1.1 | Access Control | 2 | 1 fixed, 1 in progress |
| AC.L2-3.1.2 | Access Control | 1 | In progress |
| IA.L2-3.5.7 | Identification & Authentication | 1 | Fixed |
| IA.L2-3.5.10 | Identification & Authentication | 1 | Fixed |
| SI.L2-3.14.6 | System & Information Integrity | 4 | 3 fixed, 1 in progress |
| SI.L2-3.14.7 | System & Information Integrity | 1 | In progress |
| AU.L2-3.3.1 | Audit & Accountability | 1 | Planned |
| SC.L2-3.13.8 | System & Communications Protection | 1 | Fixed |
```

**Section 4: Remediation Timeline**
```markdown
## Remediation Timeline

### Completed (8 vulnerabilities)
- ✅ SQL Injection in login (SI.L2-3.14.6) - Fixed 2025-12-03
- ✅ XSS in comments (SI.L2-3.14.6) - Fixed 2025-12-03
- ✅ Hardcoded JWT secret (IA.L2-3.5.10) - Fixed 2025-12-03
- ✅ Missing HTTPS (SC.L2-3.13.8) - Fixed 2025-12-03
- ✅ Weak password policy (IA.L2-3.5.7) - Fixed 2025-12-03
- ✅ Missing auth on admin endpoint (AC.L2-3.1.1) - Fixed 2025-12-03

### In Progress (4 vulnerabilities)
- ⏳ IDOR in user profiles (AC.L2-3.1.1) - Due 2025-12-10
- ⏳ Missing transaction auth (AC.L2-3.1.2) - Due 2025-12-10
- ⏳ Path traversal in file upload (SI.L2-3.14.6) - Due 2025-12-17
- ⏳ Missing security headers (SI.L2-3.14.7) - Due 2025-12-17

### Planned (0 vulnerabilities)
```

**Section 5: Evidence of Controls**
```markdown
## Evidence of Security Controls

### SI.L2-3.14.6: Protect System Inputs
**Control**: Input validation and sanitization implemented
**Evidence**:
- Parameterized queries for SQL (no string concatenation)
- DOMPurify library for HTML sanitization
- Joi schema validation for API inputs
- File type whitelist for uploads

**Test Results**:
- SQL Injection tests: 10/10 passing
- XSS tests: 10/10 passing
- Input validation tests: 15/15 passing

### IA.L2-3.5.7: Password Complexity
**Control**: Password complexity requirements enforced
**Evidence**:
- Minimum 12 characters required
- Must include uppercase, lowercase, number, symbol
- Validated server-side and client-side
- Uses validator.js library

**Test Results**:
- Password complexity tests: 8/8 passing
```

---

### Step 3: Review Audit Trail

**Action**: Verify audit trail completeness

**Checklist**:
- ✅ All vulnerabilities documented
- ✅ CMMC practices mapped correctly
- ✅ Remediation status accurate
- ✅ Evidence of controls provided
- ✅ Assessor-ready format
- ✅ No sensitive data leaked (sanitize)

---

### Step 4: Export for Assessor

**Action**: Save audit trail document

**Output Formats**:
- **Markdown** (`.md`): Default format, human-readable
- **PDF**: Export via Markdown → PDF converter
- **JSON**: Machine-readable for automation

**File Naming**:
- `cmmc-audit-trail-YYYY-MM-DD.md`
- `cmmc-audit-trail-<feature>-YYYY-MM-DD.md`

**Example**:
```bash
# Generate and save audit trail
emma-scan src/ > findings.json
# Daniel generates audit trail
# Save to: cmmc-audit-trail-2025-12-03.md
```

---

### Step 5: Present to Assessor

**Action**: Provide audit trail to CMMC assessor

**Assessor Presentation**:
1. Executive summary (high-level findings)
2. Domain-by-domain review (detailed findings)
3. Practice coverage matrix (completeness)
4. Remediation timeline (progress tracking)
5. Evidence of controls (proof of implementation)

**Assessor Questions Daniel Can Answer**:
- "What CMMC practices are covered?"
- "How many vulnerabilities were found?"
- "What's the remediation status?"
- "What evidence exists for security controls?"
- "Are there any open critical vulnerabilities?"

---

## API Usage

For programmatic usage:

```typescript
import { runStandup } from './src/standup/orchestrator'

const result = await runStandup({
  feature: 'E-commerce checkout flow',
  roster: ['Daniel'],
  codeSnippet: checkoutCode,
  designDoc: {
    components: ['Payment API', 'Order Database', 'Email Service']
  }
})

// Generate audit trail
await result.recordAuditTrail('cmmc-audit-trail-checkout.md')
```

---

## CLI Usage

```bash
# Scan and generate audit trail
emma-scan src/ --json > findings.json

# Daniel automatically generates audit trail
# Output: cmmc-audit-trail-YYYY-MM-DD.md
```

---

## CMMC Practice Reference

Daniel maps vulnerabilities to these CMMC Level 2 practices:

**Access Control (AC) - 3.1.x**
- AC.L2-3.1.1: Limit system access to authorized users
- AC.L2-3.1.2: Limit system access to authorized transactions
- AC.L2-3.1.5: Employ least privilege principle
- AC.L2-3.1.17: Limit unsuccessful login attempts

**Identification & Authentication (IA) - 3.5.x**
- IA.L2-3.5.1: Identify users (MFA for privileged accounts)
- IA.L2-3.5.2: Authenticate users and processes
- IA.L2-3.5.7: Enforce minimum password complexity
- IA.L2-3.5.10: Store/transmit cryptographically-protected passwords

**System & Information Integrity (SI) - 3.14.x**
- SI.L2-3.14.6: Monitor, control, and protect communications
- SI.L2-3.14.7: Identify, report, and correct information system flaws

**Audit & Accountability (AU) - 3.3.x**
- AU.L2-3.3.1: Create, protect, and retain system audit logs

**System & Communications Protection (SC) - 3.13.x**
- SC.L2-3.13.6: Deny network communications traffic by default (CORS)
- SC.L2-3.13.8: Implement cryptographic mechanisms (HTTPS, encryption)

**Configuration Management (CM) - 3.4.x**
- CM.L2-3.4.2: Establish and maintain baseline configurations
- CM.L2-3.4.3: Track, review, approve configuration changes

**Contingency Planning (CP) - 3.6.x**
- CP.L2-3.6.1: Establish, maintain, and implement contingency plans

**Incident Response (IR) - 3.6.x**
- IR.L2-3.6.1: Establish operational incident-handling capability

See `docs/CMMC-MAPPING.md` for complete practice-to-pattern reference.

---

## Best Practices

**Before Generating Audit Trail**:
- Perform comprehensive security analysis (ScanCode + STRIDE)
- Fix critical vulnerabilities first
- Gather evidence of security controls
- Document remediation timeline

**During Audit Trail Creation**:
- Be honest about findings (don't hide vulnerabilities)
- Document both fixed and open issues
- Provide evidence for all claims
- Use assessor-friendly language

**After Audit Trail Delivery**:
- Respond promptly to assessor questions
- Provide additional evidence if requested
- Track remediation progress
- Update audit trail as vulnerabilities are fixed

**Continuous Compliance**:
- Generate audit trails quarterly
- Track CMMC practice coverage over time
- Maintain evidence repository
- Keep audit trails current

---

## Related Workflows

- **ScanCode**: Scan code for vulnerabilities (input for audit trail)
- **PerformSTRIDE**: STRIDE threat modeling (input for audit trail)
- **RunStandup**: Multi-agent security review (comprehensive analysis)
- **CmmcBaseline** (Security skill): CMMC Level 2 compliance baseline

---

## Assessor FAQs

**Q: What CMMC level does Daniel cover?**
A: CMMC Level 2 (110 practices across 17 domains)

**Q: How many vulnerability patterns does Daniel detect?**
A: 50+ patterns covering OWASP Top 10 and CMMC requirements

**Q: Is Daniel's analysis automated or manual?**
A: Hybrid - automated pattern detection + manual security review

**Q: Can Daniel generate evidence for all CMMC practices?**
A: Daniel covers 25+ practices with code-level evidence. Infrastructure practices (PE, PS, AT) require additional documentation.

**Q: How often should audit trails be generated?**
A: Quarterly at minimum, or before each CMMC assessment

**Q: What if vulnerabilities are found during assessment?**
A: Audit trail documents all findings with severity, remediation timeline, and status

---

## References

- **CMMC Model v2.0**: DoD contractor compliance framework
- **NIST 800-171**: Protecting CUI (basis for CMMC)
- **OWASP Top 10**: Web application security risks
- **STRIDE**: Microsoft threat modeling framework
