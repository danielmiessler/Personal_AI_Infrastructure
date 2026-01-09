# Threat Model: [System/Feature Name]

**Version:** 1.0
**Date:** YYYY-MM-DD
**Author:** [Name]
**Status:** Draft | In Review | Approved

---

## 1. Executive Summary

[2-3 sentence summary of the system and key security concerns identified]

**Overall Risk Level:** Critical | High | Medium | Low

**Key Findings:**
- [Finding 1]
- [Finding 2]
- [Finding 3]

---

## 2. System Overview

### 2.1 Description

[Describe the system, its purpose, and business context]

### 2.2 Scope

**In Scope:**
- [Component 1]
- [Component 2]

**Out of Scope:**
- [Component X]

### 2.3 Data Classification

| Data Type | Classification | Description |
|-----------|---------------|-------------|
| [e.g., User credentials] | Confidential | [Passwords, tokens] |
| [e.g., Transaction data] | Sensitive | [Payment information] |
| [e.g., Public content] | Public | [Marketing pages] |

### 2.4 Technologies

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | [e.g., React] | [18.x] |
| Backend | [e.g., Node.js] | [20.x] |
| Database | [e.g., PostgreSQL] | [15.x] |
| Infrastructure | [e.g., AWS] | [N/A] |

---

## 3. Architecture Diagram

```
[ASCII diagram or reference to external diagram]

┌─────────────┐     HTTPS      ┌─────────────┐     Internal     ┌─────────────┐
│   Client    │───────────────▶│   API GW    │────────────────▶│  Services   │
│  (Browser)  │                │  (Public)   │                  │ (Internal)  │
└─────────────┘                └─────────────┘                  └─────────────┘
                                     │                                │
                                     │                                │
                                     ▼                                ▼
                              ┌─────────────┐                  ┌─────────────┐
                              │   Auth      │                  │  Database   │
                              │  Service    │                  │             │
                              └─────────────┘                  └─────────────┘
```

**Diagram Location:** [Link to detailed diagram if external]

---

## 4. Trust Boundaries

### 4.1 Boundary Identification

| ID | Boundary | From | To | Data Crossing |
|----|----------|------|----|---------------|
| TB1 | Internet to DMZ | Client | API Gateway | User requests, responses |
| TB2 | DMZ to Internal | API Gateway | Services | Authenticated requests |
| TB3 | Services to Data | Services | Database | Queries, CUI |
| TB4 | User to Admin | Standard user | Admin functions | Elevated permissions |

### 4.2 Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ EXTERNAL (Untrusted)                                                     │
│  ┌──────────┐                                                           │
│  │  Client  │                                                           │
│  └──────────┘                                                           │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ TB1: Internet/DMZ
┌──────────────────────────────────┼──────────────────────────────────────┐
│ DMZ (Semi-trusted)               │                                       │
│  ┌──────────┐                    │                                       │
│  │ API GW   │◀───────────────────┘                                       │
│  └──────────┘                                                           │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ TB2: DMZ/Internal
┌──────────────────────────────────┼──────────────────────────────────────┐
│ INTERNAL (Trusted)               │                                       │
│  ┌──────────┐  ┌──────────┐     │                                       │
│  │ Services │◀─┤ Database │◀────┘ TB3: Services/Data                     │
│  └──────────┘  └──────────┘                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. STRIDE Analysis

### 5.1 Threat Table

| ID | Boundary | Threat | STRIDE | Description | DREAD | Risk | Mitigation |
|----|----------|--------|--------|-------------|-------|------|------------|
| T01 | TB1 | Credential theft | S | Attacker steals user session | 7.2 | High | MFA, secure cookies |
| T02 | TB1 | Request tampering | T | Modified API requests | 5.4 | Medium | Input validation, HMAC |
| T03 | TB2 | Service impersonation | S | Rogue service in network | 4.8 | Medium | mTLS, service mesh |
| T04 | TB3 | SQL injection | T | Malicious query execution | 8.0 | High | Parameterized queries |
| T05 | TB3 | Data exposure | I | Unauthorized data access | 7.6 | High | RBAC, encryption |
| T06 | TB1 | DDoS | D | Service unavailability | 5.2 | Medium | Rate limiting, CDN |
| T07 | TB4 | Privilege escalation | E | User gains admin | 8.4 | High | Authorization checks |
| T08 | All | Audit bypass | R | Actions without logging | 4.0 | Medium | Comprehensive logging |

### 5.2 Detailed Threat Analysis

#### T01: Credential Theft (Spoofing)

**Description:** Attacker obtains valid user credentials through phishing, session hijacking, or credential stuffing.

**Attack Vector:**
1. User receives phishing email
2. User enters credentials on fake site
3. Attacker uses stolen credentials

**Existing Controls:**
- Password complexity requirements
- Session timeout

**Recommended Mitigations:**
- [ ] Implement MFA (IA.L2-3.5.3)
- [ ] Add phishing-resistant authentication
- [ ] Monitor for credential stuffing

**DREAD Scoring:**
| Factor | Score | Justification |
|--------|-------|---------------|
| Damage | 8 | Full account access |
| Reproducibility | 7 | Phishing is reliable |
| Exploitability | 8 | Low skill required |
| Affected Users | 6 | Individual users |
| Discoverability | 7 | Common knowledge |
| **Average** | **7.2** | **High Risk** |

---

#### T04: SQL Injection (Tampering)

**Description:** Attacker injects malicious SQL through application inputs to read, modify, or delete database contents.

**Attack Vector:**
1. Attacker identifies input field
2. Submits SQL payload
3. Application executes malicious query

**Existing Controls:**
- ORM usage (partial)

**Recommended Mitigations:**
- [ ] Use parameterized queries everywhere
- [ ] Input validation whitelist
- [ ] Database account least privilege
- [ ] WAF rules for SQL injection

**DREAD Scoring:**
| Factor | Score | Justification |
|--------|-------|---------------|
| Damage | 9 | Full database access |
| Reproducibility | 8 | Consistent behavior |
| Exploitability | 8 | Automated tools exist |
| Affected Users | 8 | All users' data |
| Discoverability | 7 | Common vulnerability |
| **Average** | **8.0** | **High Risk** |

---

[Continue detailed analysis for each threat...]

---

## 6. Risk Summary

### 6.1 Risk Matrix

|  | Low Impact | Medium Impact | High Impact | Critical Impact |
|--|------------|---------------|-------------|-----------------|
| **High Likelihood** | | T06 | T01, T04 | |
| **Medium Likelihood** | | T02, T03 | T05, T07 | |
| **Low Likelihood** | T08 | | | |

### 6.2 Risk by STRIDE Category

| Category | Count | Highest Risk | Status |
|----------|-------|--------------|--------|
| Spoofing | 2 | High (T01) | Mitigation required |
| Tampering | 2 | High (T04) | Mitigation required |
| Repudiation | 1 | Medium (T08) | Acceptable with logging |
| Information Disclosure | 1 | High (T05) | Mitigation required |
| Denial of Service | 1 | Medium (T06) | Mitigation planned |
| Elevation of Privilege | 1 | High (T07) | Mitigation required |

---

## 7. Mitigations

### 7.1 Mitigation Plan

| ID | Threat | Mitigation | Owner | Priority | Target Date | Status |
|----|--------|------------|-------|----------|-------------|--------|
| M01 | T01 | Implement MFA | Auth Team | P1 | YYYY-MM-DD | Planned |
| M02 | T04 | Parameterized queries audit | Dev Team | P1 | YYYY-MM-DD | In Progress |
| M03 | T05 | Encryption at rest | Ops Team | P1 | YYYY-MM-DD | Planned |
| M04 | T07 | Authorization middleware | Dev Team | P1 | YYYY-MM-DD | Planned |
| M05 | T06 | Rate limiting | Platform | P2 | YYYY-MM-DD | Planned |
| M06 | T02 | Input validation | Dev Team | P2 | YYYY-MM-DD | Planned |

### 7.2 Accepted Risks

| ID | Threat | Justification | Approver | Date |
|----|--------|---------------|----------|------|
| AR01 | T08 | Risk acceptable with current logging coverage | [Name] | YYYY-MM-DD |

---

## 8. CMMC Mapping

| Threat | Mitigation | CMMC Practice | Domain |
|--------|------------|---------------|--------|
| T01 | MFA | IA.L2-3.5.3 | Identification & Authentication |
| T04 | Input validation | SI.L2-3.14.4 | System & Information Integrity |
| T05 | Encryption | SC.L2-3.13.16 | System & Communications Protection |
| T05 | Access control | AC.L2-3.1.1 | Access Control |
| T07 | Authorization | AC.L2-3.1.5 | Access Control |
| T08 | Audit logging | AU.L2-3.3.1 | Audit & Accountability |

---

## 9. Review and Approval

### 9.1 Review History

| Version | Date | Reviewer | Comments |
|---------|------|----------|----------|
| 0.1 | YYYY-MM-DD | [Name] | Initial draft |
| 0.2 | YYYY-MM-DD | [Name] | Added mitigations |
| 1.0 | YYYY-MM-DD | [Name] | Approved |

### 9.2 Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

## 10. Appendix

### 10.1 STRIDE Reference

| Category | Definition | Question |
|----------|------------|----------|
| **S**poofing | Impersonating something/someone | Can identity be faked? |
| **T**ampering | Modifying data or code | Can data be changed? |
| **R**epudiation | Denying actions | Can actions be traced? |
| **I**nformation Disclosure | Exposing information | Can data leak? |
| **D**enial of Service | Causing unavailability | Can service be disrupted? |
| **E**levation of Privilege | Gaining higher access | Can access be escalated? |

### 10.2 DREAD Reference

| Factor | 1 (Low) | 5 (Medium) | 10 (High) |
|--------|---------|------------|-----------|
| **D**amage | Minor inconvenience | Financial loss | Full compromise |
| **R**eproducibility | Complex conditions | Specific setup | Always works |
| **E**xploitability | Requires expert | Technical skill | Script kiddie |
| **A**ffected Users | Single user | Subset | All users |
| **D**iscoverability | Source code access | Fuzzing needed | Obvious |

### 10.3 Related Documents

- Architecture Decision Record: [Link]
- Security Review Report: [Link]
- CMMC Baseline Assessment: [Link]
