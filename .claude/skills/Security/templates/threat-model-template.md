# Threat Model: [System/Feature Name]

**Date**: YYYY-MM-DD
**Owner**: [Security Engineer Name]
**Status**: Draft | In Review | Approved
**Review Frequency**: Quarterly

---

## Executive Summary

[1-2 paragraphs summarizing:
- What system/feature is being threat modeled
- Key security findings (number of threats by severity)
- Critical risks that must be addressed before deployment
- Overall security posture (good/needs work/high-risk)]

**Example**:
This threat model analyzes the User Authentication Service, which handles login, session management, and password reset for 50,000+ users. We identified 15 threats: 2 critical, 4 high, 6 medium, and 3 low. The critical threats (SQL injection in login API, weak password hashing) must be mitigated before production deployment. Overall security posture requires improvement, particularly in input validation and audit logging.

---

## System Overview

### Components

**External Entities**:
- [User types: end users, admins, API consumers]
- [External systems: payment gateways, OAuth providers]

**Processes**:
- [Services: web app, API gateway, auth service]
- [Functions: login, password reset, session management]

**Data Stores**:
- [Databases: user DB, session store]
- [File systems: uploaded files, logs]
- [Caches: Redis, Memcached]

### Data Flows

```
[User]
  ↓ [Username/Password via HTTPS]
[Web App]
  ↓ [Auth Request]
[API Gateway]
  ↓ [Validated Request]
[Auth Service]
  ↓ [Query User]
[Database]
  ↑ [User Record]
[Auth Service]
  ↓ [Session Token]
[User]
```

### Trust Boundaries

- **Boundary 1**: Internet → Web App (untrusted → DMZ)
- **Boundary 2**: Web App → API Gateway (DMZ → internal network)
- **Boundary 3**: API Gateway → Auth Service (internal → sensitive services)
- **Boundary 4**: Auth Service → Database (sensitive → critical data)

### Sensitive Assets

| Asset | Sensitivity | Location | Protection Required |
|-------|-------------|----------|---------------------|
| User passwords | Critical | Database (hashed) | bcrypt hashing, HTTPS, encryption at rest |
| Session tokens | High | Redis, cookies | Secure cookies, HTTPS, encryption in transit |
| User emails | Medium | Database | Encryption at rest, HTTPS |
| API keys | High | Database, env vars | Secrets manager, never logged |

---

## Identified Threats

### Threat 1: [Threat Name] (Critical)

**Component**: [Where threat occurs - e.g., Login API]
**STRIDE Category**: [S/T/R/I/D/E]
**Risk Rating**: Critical

**Risk Scoring**:
- **Impact**: 10/10 (Complete database compromise)
- **Likelihood**: 8/10 (Common vulnerability, easy to exploit)

**Description**:
[Detailed description of how the attack works]

**Example**:
An attacker can inject SQL code through the username field in the login API. The application concatenates user input directly into SQL queries without parameterization. This allows arbitrary SQL execution, potentially exposing all user data.

**Attack Scenario**:
```
POST /api/login
{
  "username": "admin' OR '1'='1",
  "password": "anything"
}
```

**Mitigations**:

**Immediate (Required before deployment)**:
- [ ] Use parameterized queries for all database interactions
- [ ] Add input validation: username must be alphanumeric + underscore only
- [ ] Implement prepared statements (eliminate SQL injection vector)

**Short-term (Next sprint)**:
- [ ] Deploy Web Application Firewall (WAF) with SQL injection rules
- [ ] Add database query monitoring (alert on suspicious patterns)
- [ ] Security code review: audit all database queries

**Long-term (Ongoing)**:
- [ ] Automated security testing: SQLMap in CI/CD pipeline
- [ ] Developer training: secure coding practices
- [ ] Quarterly penetration testing

**CMMC Practices Addressed**:
- SI.L2-3.14.2: Protect information systems from malicious code
- SI.L2-3.14.3: Monitor information system security alerts
- SI.L2-3.14.7: Employ the principle of least functionality

**Owner**: Backend Team
**Due Date**: [YYYY-MM-DD] (before production deployment)
**Status**: Pending | In Progress | Mitigated | Accepted
**Verification**: [How we'll verify the mitigation works]

---

### Threat 2: [Threat Name] (High)

[Repeat same structure for each threat]

---

### Threat 3: [Threat Name] (Medium)

[Same structure]

---

### Threat 4: [Threat Name] (Low)

[Same structure]

---

## STRIDE Coverage Matrix

| Component | S | T | R | I | D | E | Total Threats |
|-----------|---|---|---|---|---|---|---------------|
| Login API | 1 | 2 | 0 | 1 | 1 | 1 | 6 |
| Password Reset | 1 | 0 | 1 | 1 | 0 | 0 | 3 |
| Session Mgmt | 2 | 1 | 0 | 1 | 0 | 1 | 5 |
| Database | 0 | 1 | 0 | 1 | 0 | 0 | 2 |
| **TOTAL** | **4** | **4** | **1** | **4** | **1** | **2** | **16** |

**Key**: S=Spoofing, T=Tampering, R=Repudiation, I=Info Disclosure, D=DoS, E=Elevation

**Analysis**:
- Most threats: Information Disclosure (4) and Tampering (4)
- Least threats: Denial of Service (1) and Repudiation (1)
- Focus mitigation efforts on: Input validation, data protection, access control

---

## Risk Summary

| Risk Level | Count | % of Total | Mitigated | Pending |
|------------|-------|------------|-----------|---------|
| **Critical** | 2 | 12.5% | 0 (0%) | 2 (100%) |
| **High** | 4 | 25% | 1 (25%) | 3 (75%) |
| **Medium** | 6 | 37.5% | 4 (67%) | 2 (33%) |
| **Low** | 4 | 25% | 4 (100%) | 0 (0%) |
| **TOTAL** | **16** | **100%** | **9 (56%)** | **7 (44%)** |

**Deployment Readiness**: ❌ NOT READY (2 critical, 3 high threats pending)

**Criteria for Production**:
- ✅ All critical threats mitigated
- ✅ All high threats mitigated or accepted with documented justification
- ⚠️ Medium threats: mitigation plan in next sprint
- ✅ Low threats: tracked in backlog

---

## CMMC Compliance Mapping

| CMMC Practice | Threats Addressed | Mitigation Status |
|---------------|-------------------|-------------------|
| **AC.L2-3.1.1** (Limit access) | Threat 6 (Elevation) | ⏳ Pending |
| **AC.L2-3.1.2** (Limit to authorized users) | Threat 7 (Elevation) | ⏳ Pending |
| **IA.L2-3.5.1** (Identify users) | Threat 1 (Spoofing) | ⏳ Pending |
| **IA.L2-3.5.3** (Multi-factor auth) | Threat 2 (Spoofing) | ⏳ Pending |
| **AU.L2-3.3.1** (Audit events) | Threat 3 (Repudiation) | ✅ Mitigated |
| **SC.L2-3.13.11** (Encrypt CUI) | Threat 4, 5 (Info Disclosure) | ✅ Mitigated |
| **SI.L2-3.14.2** (Malicious code) | Threat 8 (Tampering) | ⏳ Pending |
| **SI.L2-3.14.7** (Integrity protection) | Threat 9 (Tampering) | ⏳ Pending |

**CMMC Coverage**: 8 practices addressed, 3 mitigated (37.5%)

---

## Assumptions & Limitations

### Assumptions
- [ ] Users access system over HTTPS only (no HTTP allowed)
- [ ] Database is hosted in secure environment (no public access)
- [ ] Secrets are managed via secrets manager (not hardcoded)
- [ ] Rate limiting handled by API gateway (not application layer)

### Out of Scope
- Physical security of data center (managed by cloud provider)
- Social engineering attacks (addressed by security awareness training)
- Insider threats (addressed by access control policies)

### Known Limitations
- [Limitation 1: e.g., Threat model does not cover mobile app attack surface]
- [Limitation 2: e.g., Third-party dependencies not analyzed]

---

## Next Steps

### Immediate (Before Deployment)
1. [ ] Implement all critical mitigations (Threats 1-2)
2. [ ] Code review: verify mitigations are effective
3. [ ] Security testing: validate threats are eliminated

### Short-term (Next Sprint)
1. [ ] Implement high-risk mitigations (Threats 3-6)
2. [ ] Quarterly security review scheduled
3. [ ] Update threat model with new findings

### Long-term (Ongoing)
1. [ ] Automated security testing in CI/CD
2. [ ] Annual penetration testing
3. [ ] Security training for developers
4. [ ] Track emerging threats (CVEs, OWASP Top 10 updates)

---

## Review History

| Date | Reviewer | Changes | Version |
|------|----------|---------|---------|
| YYYY-MM-DD | [Name] | Initial threat model | 1.0 |
| YYYY-MM-DD | [Name] | Added 3 new threats post code review | 1.1 |
| YYYY-MM-DD | [Name] | Quarterly review, updated mitigations | 1.2 |

---

## Appendix

### References
- STRIDE Methodology: [Microsoft Threat Modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- OWASP Top 10: [https://owasp.org/Top10/](https://owasp.org/Top10/)
- CMMC Level 2 Practices: [CMMC Model](https://dodcio.defense.gov/CMMC/)

### Tools Used
- Threat modeling tool: [Name, if applicable]
- Security testing: OWASP ZAP, SQLMap, Burp Suite
- Code analysis: SonarQube, Semgrep

---

**Threat Model Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (3 months from last update)
**Approval**: [Security Lead Name, Date]
