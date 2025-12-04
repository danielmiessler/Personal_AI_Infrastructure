# ThreatModel Workflow

**Purpose**: Identify security threats using STRIDE methodology before implementation

**Input**: System architecture, feature description, or user story

**Output**: Threat model document with identified threats, risk ratings, and mitigations

---

## Workflow Steps

### Step 1: Understand the System

**Action**: Gather context about what you're threat modeling

**Questions to Ask**:
- What is this system/feature?
- What assets does it protect? (data, credentials, user accounts, etc.)
- Who are the users? (end users, admins, API consumers)
- What are the trust boundaries? (internet → web server → database)
- What sensitive data is involved? (PII, credentials, financial data)

**Inputs**:
- System architecture diagram
- PRD or feature description
- Data flow diagrams
- Authentication/authorization design

**Example**:
```
System: User Authentication Service
Assets: User credentials, session tokens, PII
Users: End users, admins
Trust Boundaries: Internet → API Gateway → Auth Service → Database
Sensitive Data: Passwords (hashed), emails, session tokens
```

---

### Step 2: Decompose the System

**Action**: Break the system into components, data flows, and trust boundaries

**Components to Identify**:
1. **External Entities**: Users, external systems, APIs
2. **Processes**: Services, functions, workflows
3. **Data Stores**: Databases, file systems, caches
4. **Data Flows**: How data moves between components

**Data Flow Diagram** (DFD):
```
User (External Entity)
  ↓ [Username/Password]
Web App (Process)
  ↓ [Auth Request]
API Gateway (Process)
  ↓ [Validated Request]
Auth Service (Process)
  ↓ [Query User]
Database (Data Store)
  ↑ [User Record]
Auth Service
  ↓ [Session Token]
User
```

**Trust Boundaries**:
- **Boundary 1**: Internet → Web App (untrusted → DMZ)
- **Boundary 2**: Web App → API Gateway (DMZ → internal)
- **Boundary 3**: API Gateway → Auth Service (internal → sensitive)
- **Boundary 4**: Auth Service → Database (sensitive → critical data)

**Rule**: Threats often occur at trust boundary crossings

---

### Step 3: Apply STRIDE Methodology

**Action**: For each component/data flow, identify threats using STRIDE

**STRIDE Framework**:

#### S - Spoofing (Identity Theft)
**Question**: Can an attacker pretend to be someone else?

**Examples**:
- Attacker forges session tokens
- Man-in-the-middle attack intercepts authentication
- Stolen credentials used to impersonate user

**Mitigations**:
- Use strong authentication (passwords + MFA)
- Sign/encrypt tokens (JWT with signing key)
- Use HTTPS for all communications
- Implement CMMC Practice IA.L2-3.5.1 (Identify users)

---

#### T - Tampering (Data Modification)
**Question**: Can an attacker modify data in transit or at rest?

**Examples**:
- Attacker modifies API request to escalate privileges
- Database records altered by SQL injection
- Configuration files modified to bypass security

**Mitigations**:
- Input validation (whitelist, not blacklist)
- Use parameterized queries (prevent SQL injection)
- Sign data in transit (integrity checks)
- Implement CMMC Practice SI.L2-3.14.7 (Protect integrity)

---

#### R - Repudiation (Deny Actions)
**Question**: Can a user deny performing an action?

**Examples**:
- User claims "I didn't delete that file" (no audit logs)
- Admin denies privilege escalation (no access logs)
- Transaction dispute (no transaction history)

**Mitigations**:
- Audit logging (who, what, when, where, why)
- Immutable logs (append-only, tamper-evident)
- Digital signatures for critical actions
- Implement CMMC Practice AU.L2-3.3.1 (Audit events)

---

#### I - Information Disclosure (Data Leakage)
**Question**: Can an attacker access sensitive information?

**Examples**:
- SQL injection reveals database contents
- Error messages expose internal system details
- Logs contain passwords or tokens
- API returns more data than needed

**Mitigations**:
- Encrypt sensitive data at rest and in transit
- Use least privilege (only return necessary data)
- Sanitize error messages (no stack traces in production)
- Implement CMMC Practice SC.L2-3.13.11 (Encrypt CUI)

---

#### D - Denial of Service (Availability Attack)
**Question**: Can an attacker make the system unavailable?

**Examples**:
- Flood attack overwhelms server
- Resource exhaustion (infinite loops, memory leaks)
- Database query bombs (slow queries)

**Mitigations**:
- Rate limiting (max requests per IP/user)
- Input size limits (prevent large payloads)
- Query timeouts and resource limits
- Implement CMMC Practice SC.L2-3.13.6 (Deny by default)

---

#### E - Elevation of Privilege (Authorization Bypass)
**Question**: Can an attacker gain unauthorized access?

**Examples**:
- Vertical escalation: regular user → admin
- Horizontal escalation: access another user's data
- Path traversal: access files outside intended directory

**Mitigations**:
- Role-based access control (RBAC)
- Authorization checks on every request
- Principle of least privilege
- Implement CMMC Practice AC.L2-3.1.2 (Limit access to authorized users)

---

### Step 4: Rate and Prioritize Threats

**Action**: Assign risk ratings to each threat using DREAD or simplified scoring

**DREAD Scoring** (0-10 each, total 0-50):
- **D**amage potential: How bad if exploited?
- **R**eproducibility: How easy to reproduce?
- **E**xploitability: How easy to exploit?
- **A**ffected users: How many users impacted?
- **D**iscoverability: How easy to discover?

**Simplified Risk Rating**:

| Risk | Impact | Likelihood | Example |
|------|--------|------------|---------|
| **Critical** | High | High | Unauthenticated SQL injection exposing all user data |
| **High** | High | Medium | XSS allowing session hijacking |
| **Medium** | Medium | Medium | Lack of rate limiting allows brute force |
| **Low** | Low | Low | Verbose error messages leak minor system info |

**Prioritization**:
1. **Critical** - Fix immediately, block release
2. **High** - Fix before production deployment
3. **Medium** - Fix in next sprint
4. **Low** - Track in backlog, fix when convenient

---

### Step 5: Define Mitigations

**Action**: For each high/critical threat, specify concrete mitigations

**Mitigation Categories**:

1. **Eliminate**: Remove the vulnerable feature/component
2. **Mitigate**: Reduce likelihood or impact
3. **Transfer**: Use third-party service (OAuth vs custom auth)
4. **Accept**: Document and accept the risk (with justification)

**Example Mitigation Plan**:

```markdown
### Threat 1: SQL Injection (Critical)
**Component**: User search API
**STRIDE**: Tampering
**Risk**: Critical (Impact: 10, Likelihood: 8)

**Mitigation**:
- [ ] Use parameterized queries (eliminate)
- [ ] Input validation: allow only alphanumeric + space (mitigate)
- [ ] Principle of least privilege: DB user has SELECT only (mitigate)
- [ ] Web Application Firewall (WAF) with SQL injection rules (mitigate)
- [ ] Automated security testing: SQLMap in CI/CD (detect)

**CMMC Practices**:
- SI.L2-3.14.2: Protect against malicious code
- SI.L2-3.14.3: Monitor for security alerts

**Owner**: Backend team
**Due Date**: Before production deployment
**Status**: Pending
```

---

### Step 6: Map to CMMC Practices

**Action**: Document which CMMC practices each mitigation addresses

**CMMC Level 2 Domains** (5 core domains in MVP):

1. **AC (Access Control)**: Who can access what?
2. **IA (Identification & Authentication)**: Who are you?
3. **SC (System & Communications Protection)**: Is data protected?
4. **CM (Configuration Management)**: Are systems configured securely?
5. **SI (System & Information Integrity)**: Is the system trustworthy?

**Mapping Example**:

| Threat | Mitigation | CMMC Practice |
|--------|------------|---------------|
| Spoofing | Multi-factor authentication | IA.L2-3.5.3 (MFA) |
| Tampering | Input validation | SI.L2-3.14.2 (Malicious code protection) |
| Repudiation | Audit logging | AU.L2-3.3.1 (Audit events) |
| Info Disclosure | Encryption at rest | SC.L2-3.13.11 (Encrypt CUI) |
| DoS | Rate limiting | SC.L2-3.13.6 (Deny by default) |
| Elevation | RBAC enforcement | AC.L2-3.1.2 (Limit access) |

---

### Step 7: Generate Threat Model Document

**Action**: Create comprehensive threat model document

**Document Structure**:

```markdown
# Threat Model: [System/Feature Name]

**Date**: YYYY-MM-DD
**Owner**: [Security Engineer]
**Status**: Draft | In Review | Approved

---

## Executive Summary

[1-2 paragraphs: What we're threat modeling, key findings, critical risks]

---

## System Overview

### Components
- [List of components]

### Data Flows
- [DFD or description]

### Trust Boundaries
- [Boundary descriptions]

### Sensitive Assets
- [What needs protection]

---

## Identified Threats

### Threat 1: [Threat Name] (Critical)
**Component**: [Where threat occurs]
**STRIDE Category**: [S/T/R/I/D/E]
**Risk Rating**: Critical (Impact: X, Likelihood: Y)

**Description**: [How attack works]

**Mitigations**:
- [ ] Mitigation 1
- [ ] Mitigation 2

**CMMC Practices**: [Practice IDs]
**Owner**: [Team]
**Due Date**: [Date]
**Status**: Pending | In Progress | Mitigated

---

### Threat 2: [Threat Name] (High)
[Same structure]

---

## Summary

| Risk Level | Count | % Mitigated |
|------------|-------|-------------|
| Critical | 2 | 0% |
| High | 5 | 40% |
| Medium | 8 | 75% |
| Low | 12 | 100% |

**Total Threats**: 27
**Mitigated**: 15 (56%)
**Pending**: 12 (44%)

---

## Next Steps

1. Implement critical mitigations (Threats 1-2)
2. Review high-risk mitigations with architect
3. Schedule security review before production
4. Update threat model quarterly

---

**Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (quarterly)
```

---

## Common Threat Patterns

### Pattern 1: Web Application Threats

**Typical STRIDE Threats**:
- **S**: Session hijacking, credential stuffing
- **T**: SQL injection, XSS, CSRF
- **R**: No audit logs for admin actions
- **I**: Sensitive data in URLs, unencrypted storage
- **D**: Lack of rate limiting, resource exhaustion
- **E**: Broken access control, IDOR vulnerabilities

**Standard Mitigations**:
- HTTPS everywhere
- Parameterized queries
- Output encoding (prevent XSS)
- CSRF tokens
- Rate limiting
- RBAC with authorization checks

---

### Pattern 2: API Threats

**Typical STRIDE Threats**:
- **S**: API key theft, token forgery
- **T**: Parameter tampering, mass assignment
- **R**: No API audit logs
- **I**: Excessive data exposure, verbose errors
- **D**: API flooding, slowloris attacks
- **E**: Broken function-level authorization

**Standard Mitigations**:
- OAuth 2.0 or JWT authentication
- Input validation (JSON schema)
- Rate limiting per API key
- Least privilege (return minimal data)
- API gateway with throttling
- Function-level authorization checks

---

### Pattern 3: Cloud Infrastructure Threats

**Typical STRIDE Threats**:
- **S**: Stolen cloud credentials (AWS keys)
- **T**: S3 bucket misconfiguration (public write)
- **R**: No CloudTrail logs
- **I**: Unencrypted S3 buckets, public snapshots
- **D**: Resource exhaustion (runaway instances)
- **E**: Overly permissive IAM roles

**Standard Mitigations**:
- IAM roles (not access keys)
- S3 bucket policies (private by default)
- CloudTrail + centralized logging
- Encryption at rest (KMS)
- Resource quotas and alerts
- Least privilege IAM policies

---

## Tips for Effective Threat Modeling

### DO:
✅ Involve security engineer early (design phase, not code review)
✅ Focus on high-value assets first (user data, credentials, financial)
✅ Use visual diagrams (DFD, architecture) for clarity
✅ Be specific in mitigations (not "improve security")
✅ Map to compliance frameworks (CMMC, OWASP Top 10)
✅ Review threat models quarterly or after major changes
✅ Track mitigation progress (don't just document and forget)

### DON'T:
❌ Threat model too late (after code is written)
❌ Skip "obvious" threats (they're still real)
❌ Use vague risk ratings ("medium-ish")
❌ Forget to assign owners and due dates
❌ Ignore low-risk threats (track in backlog)
❌ Threat model once and never update
❌ Overcomplicate (STRIDE is enough for most systems)

---

## Integration with Other Skills

### AgilePm Skill Integration
When creating user stories, invoke Security skill for threat modeling:

```
/skill Security
Threat model this user story:
"As a user, I want to upload profile pictures so I can personalize my account."
```

Security skill returns threats (file upload vulnerabilities, XXE, malicious files) and mitigations.

### TestArchitect Skill Integration
When defining test strategy, include security test scenarios from threat model:

```
/skill TestArchitect
Create security test requirements for:
- Threat 1: SQL injection in user search
- Threat 2: XSS in comment system
```

TestArchitect skill returns test cases (positive + negative tests, fuzzing, OWASP ZAP scans).

---

## Validation Checklist

Before finalizing threat model:

- [ ] All components identified and documented
- [ ] Data flows mapped (including trust boundaries)
- [ ] STRIDE applied to each component/flow
- [ ] Threats rated by risk (Critical/High/Medium/Low)
- [ ] Mitigations defined for Critical + High threats
- [ ] CMMC practices mapped to each mitigation
- [ ] Owners and due dates assigned
- [ ] Threat model document created
- [ ] Security review scheduled (before production)
- [ ] Quarterly review date set

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Based on**: STRIDE methodology (Microsoft), OWASP Threat Modeling
