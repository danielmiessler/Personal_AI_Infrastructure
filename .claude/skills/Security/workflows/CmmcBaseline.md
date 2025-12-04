# CmmcBaseline Workflow

**Purpose**: Generate CMMC Level 2 compliance baseline for your project

**Input**: Project description, system architecture, or PRD

**Output**: CMMC baseline document mapping features to practices with implementation guidance

---

## What is CMMC?

**Cybersecurity Maturity Model Certification (CMMC)** is a framework required for Department of Defense (DoD) contractors to protect Controlled Unclassified Information (CUI).

**CMMC Levels**:
- **Level 1** (Foundational): Basic cyber hygiene (17 practices)
- **Level 2** (Advanced): Intermediate cyber hygiene (110 practices) ← Most contractors need this
- **Level 3** (Expert): Advanced/progressive (130 practices) ← For sensitive programs

**Why CMMC Matters**:
- Required for DoD contracts starting 2025
- Protects CUI from nation-state threats
- Industry best practice (even for non-DoD projects)

---

## CMMC Level 2 Domains (MVP: 5 Core Domains)

### 1. AC - Access Control (22 practices)
**Goal**: Limit system access to authorized users, processes, and devices

**Key Practices**:
- **AC.L2-3.1.1**: Limit information system access to authorized users
- **AC.L2-3.1.2**: Limit information system access to authorized functions
- **AC.L2-3.1.3**: Control flow of CUI per approved authorizations
- **AC.L2-3.1.5**: Employ principle of least privilege

**Example**: Role-based access control (RBAC) ensures admins can delete users, but regular users cannot.

---

### 2. IA - Identification & Authentication (9 practices)
**Goal**: Verify the identity of users, processes, and devices

**Key Practices**:
- **IA.L2-3.5.1**: Identify information system users
- **IA.L2-3.5.2**: Authenticate (or verify) users
- **IA.L2-3.5.3**: Use multi-factor authentication (MFA)
- **IA.L2-3.5.7**: Enforce minimum password complexity

**Example**: Users must provide username + password + MFA token to access admin panel.

---

### 3. SC - System & Communications Protection (19 practices)
**Goal**: Protect information in transit and at rest

**Key Practices**:
- **SC.L2-3.13.1**: Monitor, control, and protect communications at system boundaries
- **SC.L2-3.13.8**: Implement cryptographic mechanisms to prevent unauthorized disclosure
- **SC.L2-3.13.11**: Employ FIPS-validated cryptography to protect CUI
- **SC.L2-3.13.16**: Protect confidentiality of CUI at rest

**Example**: All API traffic uses HTTPS (TLS 1.3), database encrypts CUI at rest with AES-256.

---

### 4. CM - Configuration Management (9 practices)
**Goal**: Establish and maintain secure baseline configurations

**Key Practices**:
- **CM.L2-3.4.1**: Establish and maintain baseline configurations
- **CM.L2-3.4.2**: Establish and enforce security configuration settings
- **CM.L2-3.4.6**: Employ least functionality principle
- **CM.L2-3.4.7**: Restrict, disable, or prevent use of unnecessary programs

**Example**: Production servers use hardened OS images, unused services disabled, configuration managed via Infrastructure as Code (Terraform).

---

### 5. SI - System & Information Integrity (12 practices)
**Goal**: Identify, report, and correct information system flaws timely

**Key Practices**:
- **SI.L2-3.14.1**: Identify, report, and correct information system flaws
- **SI.L2-3.14.2**: Provide protection from malicious code
- **SI.L2-3.14.3**: Monitor information system security alerts
- **SI.L2-3.14.7**: Employ the principle of least functionality

**Example**: Automated vulnerability scanning (Dependabot), malware scanning on file uploads, security alerts routed to SOC.

---

## Workflow Steps

### Step 1: Understand Project Scope

**Action**: Identify what CUI your project handles

**Questions to Ask**:
- Does your project handle CUI? (government data, export-controlled, FOUO)
- What sensitive data does your system process? (PII, credentials, contracts)
- Is this project for DoD or government contractors?
- What CMMC level is required by contract?

**CUI Examples**:
- DoD contract data
- Export-controlled technical data (ITAR)
- For Official Use Only (FOUO) documents
- Privacy Act data (SSNs, medical records)

**If No CUI**:
CMMC may not be required, but these practices are still security best practices. Consider using CMMC as a voluntary framework.

**If CUI Exists**:
You must implement CMMC Level 2 practices (110 total).

---

### Step 2: Identify Applicable Domains

**Action**: Determine which of the 5 core domains apply to your project

**Domain Applicability**:

| Domain | Applies If... |
|--------|---------------|
| **AC** | System has user accounts, roles, permissions |
| **IA** | System authenticates users or devices |
| **SC** | System transmits or stores sensitive data |
| **CM** | System has infrastructure (servers, cloud, containers) |
| **SI** | System has code dependencies, file uploads, or external integrations |

**Example Project**: E-commerce web application
- ✅ **AC**: Yes (user accounts, admin roles)
- ✅ **IA**: Yes (login system, passwords)
- ✅ **SC**: Yes (payment data, HTTPS)
- ✅ **CM**: Yes (AWS infrastructure, EC2, RDS)
- ✅ **SI**: Yes (npm dependencies, image uploads)

**Result**: All 5 domains apply

---

### Step 3: Map Features to CMMC Practices

**Action**: For each feature, identify which CMMC practices it must implement

**Feature-to-Practice Mapping**:

**Feature**: User Registration & Login
- **AC.L2-3.1.1**: Limit system access to authorized users ✅
- **IA.L2-3.5.1**: Identify information system users ✅
- **IA.L2-3.5.2**: Authenticate users ✅
- **IA.L2-3.5.3**: Use MFA for privileged accounts ✅
- **IA.L2-3.5.7**: Enforce password complexity (min 12 chars, special chars) ✅
- **SC.L2-3.13.8**: Encrypt passwords (bcrypt hashing) ✅

**Feature**: API for Mobile App
- **AC.L2-3.1.2**: Limit access to authorized functions (API keys, OAuth) ✅
- **SC.L2-3.13.1**: Monitor and control communications (API gateway) ✅
- **SC.L2-3.13.8**: Use HTTPS/TLS 1.3 for all API traffic ✅
- **SI.L2-3.14.2**: Validate API input (prevent injection attacks) ✅

**Feature**: File Upload (Profile Pictures)
- **AC.L2-3.1.20**: Control CUI posted or processed on publicly accessible systems ✅
- **SI.L2-3.14.2**: Scan uploads for malware (ClamAV) ✅
- **SI.L2-3.14.4**: Update malware protection when new signatures available ✅
- **SC.L2-3.13.16**: Encrypt files at rest (S3 server-side encryption) ✅

---

### Step 4: Document Implementation for Each Practice

**Action**: For each applicable practice, document HOW you comply

**Implementation Documentation Template**:

```markdown
### AC.L2-3.1.1: Limit information system access to authorized users

**Requirement**: Ensure only authorized users can access the system

**Implementation**:
- **Authentication**: Username + password required for login
- **Session Management**: JWT tokens with 24-hour expiration
- **Authorization**: RBAC with roles: User, Admin, Super Admin
- **Access Revocation**: Admins can disable user accounts immediately

**Evidence**:
- Code: `src/auth/middleware.ts` (authentication middleware)
- Config: `config/roles.json` (RBAC definition)
- Policy: `docs/access-control-policy.md`

**Test Plan**:
- [ ] Unit test: Unauthenticated requests return 401
- [ ] Integration test: Users cannot access admin endpoints
- [ ] E2E test: Disabled users cannot log in

**Status**: ✅ Implemented
**Owner**: Backend Team
**Last Reviewed**: 2025-12-02
```

---

### Step 5: Identify Gaps

**Action**: Find CMMC practices you don't currently implement

**Gap Analysis**:

| Practice | Required? | Implemented? | Gap? | Priority |
|----------|-----------|--------------|------|----------|
| AC.L2-3.1.1 | ✅ Yes | ✅ Yes | ❌ No | - |
| IA.L2-3.5.3 (MFA) | ✅ Yes | ❌ No | ✅ Yes | High |
| AU.L2-3.3.1 (Audit logs) | ✅ Yes | ⚠️ Partial | ✅ Yes | Medium |
| SC.L2-3.13.11 (FIPS crypto) | ✅ Yes | ❌ No | ✅ Yes | Medium |

**Gap Example**: Multi-Factor Authentication (MFA)

```markdown
### Gap: IA.L2-3.5.3 - Multi-Factor Authentication

**Current State**: Users log in with username + password only

**Required State**: Privileged users (admins) must use MFA

**Impact**: High (unauthorized admin access is critical risk)

**Mitigation Plan**:
- [ ] Implement TOTP-based MFA (Google Authenticator, Authy)
- [ ] Require MFA enrollment for all admin accounts
- [ ] Provide backup codes in case of device loss
- [ ] Add "Trust this device for 30 days" option

**Effort**: 8 story points (1-2 weeks)
**Owner**: Backend Team
**Target Date**: End of Sprint 3
**Status**: ⏳ Pending
```

---

### Step 6: Create Compliance Roadmap

**Action**: Prioritize gap remediation and create implementation plan

**Prioritization Criteria**:
1. **Contractual**: Required by DoD contract (highest priority)
2. **Risk-Based**: Protects critical assets (high priority)
3. **Effort**: Quick wins first (low effort, high impact)

**Roadmap Example**:

**Sprint 1** (High Priority, Quick Wins):
- [ ] IA.L2-3.5.7: Enforce password complexity (2 pts)
- [ ] SC.L2-3.13.8: Enable HTTPS everywhere (3 pts)
- [ ] SI.L2-3.14.2: Add input validation (5 pts)

**Sprint 2** (High Priority, Medium Effort):
- [ ] IA.L2-3.5.3: Implement MFA for admins (8 pts)
- [ ] AU.L2-3.3.1: Comprehensive audit logging (8 pts)

**Sprint 3** (Medium Priority):
- [ ] SC.L2-3.13.11: Migrate to FIPS-validated crypto (5 pts)
- [ ] CM.L2-3.4.2: Harden server configurations (5 pts)

**Backlog** (Low Priority or Long-term):
- [ ] AC.L2-3.1.12: Monitor and control remote access (3 pts)
- [ ] SI.L2-3.14.6: Monitor organizational systems (8 pts)

---

### Step 7: Generate CMMC Baseline Document

**Action**: Create comprehensive CMMC baseline for the project

**Document Structure**:

```markdown
# CMMC Level 2 Baseline: [Project Name]

**Date**: YYYY-MM-DD
**Owner**: [Security Lead]
**CMMC Level**: Level 2 (110 practices)
**Scope**: [5 core domains: AC, IA, SC, CM, SI]

---

## Executive Summary

[Project Name] handles [CUI types] and requires CMMC Level 2 certification.

**Compliance Status**:
- **Implemented**: 45/71 applicable practices (63%)
- **Partial**: 12/71 practices (17%)
- **Not Implemented**: 14/71 practices (20%)

**Critical Gaps** (must address before audit):
1. Multi-factor authentication (IA.L2-3.5.3)
2. FIPS-validated cryptography (SC.L2-3.13.11)
3. Comprehensive audit logging (AU.L2-3.3.1)

**Target Compliance Date**: [3 months from now]

---

## Domain 1: Access Control (AC)

### Applicable Practices: 15 / 22

#### AC.L2-3.1.1: Limit system access to authorized users
**Status**: ✅ Implemented
**Implementation**: [Details]
**Evidence**: [Code, config, policy]
**Last Reviewed**: YYYY-MM-DD

#### AC.L2-3.1.2: Limit access to authorized functions
**Status**: ✅ Implemented
[Same structure]

#### AC.L2-3.1.3: Control flow of CUI
**Status**: ⚠️ Partial
**Gap**: [What's missing]
**Remediation Plan**: [How to fix]

---

[Repeat for all 5 domains]

---

## Compliance Roadmap

[Timeline for closing gaps - see Step 6]

---

## Evidence Repository

All CMMC evidence stored in:
- **Code**: GitHub repository (compliance branch)
- **Policies**: `docs/policies/` directory
- **Configurations**: Terraform, Ansible configs
- **Audit Logs**: CloudWatch, Splunk
- **Test Results**: CI/CD pipeline reports

---

## Maintenance Plan

- **Quarterly Reviews**: Update baseline every 3 months
- **Change Management**: Update baseline when architecture changes
- **Audit Preparation**: 2 months before CMMC audit
- **Continuous Monitoring**: Track new vulnerabilities (CVEs)

---

**Baseline Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (3 months)
```

---

## CMMC Quick Reference

### 5 Core Domains (MVP)

| Domain | Practices | Most Critical |
|--------|-----------|---------------|
| **AC** | 22 | AC.L2-3.1.1 (Limit access), AC.L2-3.1.5 (Least privilege) |
| **IA** | 9 | IA.L2-3.5.3 (MFA), IA.L2-3.5.7 (Password complexity) |
| **SC** | 19 | SC.L2-3.13.8 (Encryption in transit), SC.L2-3.13.11 (FIPS crypto) |
| **CM** | 9 | CM.L2-3.4.1 (Baseline configs), CM.L2-3.4.6 (Least functionality) |
| **SI** | 12 | SI.L2-3.14.1 (Patch flaws), SI.L2-3.14.2 (Malware protection) |
| **TOTAL** | **71** | **10 practices cover 80% of security** |

### 12 Additional Domains (Release 0.2)

| Domain | Practices | Example |
|--------|-----------|---------|
| **AU** - Audit & Accountability | 9 | Log who did what, when |
| **AT** - Awareness & Training | 5 | Security training for developers |
| **CA** - Security Assessment | 8 | Vulnerability scanning |
| **CP** - Contingency Planning | 4 | Backup and disaster recovery |
| **IR** - Incident Response | 4 | Respond to security breaches |
| **MA** - Maintenance | 5 | Secure system maintenance |
| **MP** - Media Protection | 8 | Protect USB drives, backups |
| **PE** - Physical Protection | 6 | Data center physical security |
| **PS** - Personnel Security | 5 | Background checks |
| **RA** - Risk Assessment | 3 | Identify and assess risks |
| **RE** - Recovery | 5 | Recover from incidents |
| **SA** - System & Services Acquisition | 8 | Secure SDLC |

---

## Common CMMC Gaps

### Gap 1: Multi-Factor Authentication (MFA)
**Practice**: IA.L2-3.5.3
**Common Issue**: Only password-based login
**Fix**: Implement TOTP (Google Authenticator) for privileged users
**Effort**: 5-8 story points

### Gap 2: Audit Logging
**Practice**: AU.L2-3.3.1
**Common Issue**: Logs don't capture who, what, when, where
**Fix**: Centralized logging (Splunk, ELK), log all privileged actions
**Effort**: 8-13 story points

### Gap 3: Encryption at Rest
**Practice**: SC.L2-3.13.16
**Common Issue**: Database doesn't encrypt CUI
**Fix**: Enable database encryption (AWS RDS encryption, MongoDB encrypted storage)
**Effort**: 3-5 story points

### Gap 4: FIPS-Validated Cryptography
**Practice**: SC.L2-3.13.11
**Common Issue**: Using non-FIPS crypto libraries
**Fix**: Use FIPS 140-2 validated modules (OpenSSL FIPS, AWS KMS)
**Effort**: 5-8 story points

### Gap 5: Least Privilege
**Practice**: AC.L2-3.1.5
**Common Issue**: Users have more permissions than needed
**Fix**: Implement RBAC, quarterly access reviews
**Effort**: 8-13 story points

---

## Tips for CMMC Compliance

### DO:
✅ Start early (CMMC takes 3-6 months for first-time compliance)
✅ Document everything (code, configs, policies, evidence)
✅ Involve security engineer from Day 1 (not after code is written)
✅ Use automation (Infrastructure as Code, automated compliance checks)
✅ Test compliance regularly (quarterly self-assessments)
✅ Map features to CMMC practices (don't retrofit later)

### DON'T:
❌ Wait until audit deadline (last-minute compliance is expensive)
❌ Ignore "small" practices (all 110 must be implemented)
❌ Self-attest without evidence (auditors will ask for proof)
❌ Copy-paste policies without implementing (policies ≠ compliance)
❌ Assume cloud provider = compliant (shared responsibility model)
❌ Skip documentation (no documentation = no compliance)

---

## Integration with Other Skills

### AgilePm Skill Integration
When creating user stories, invoke Security skill for CMMC mapping:

```
/skill Security
Map this user story to CMMC practices:
"As an admin, I want to view audit logs so I can investigate security incidents."
```

Security skill returns applicable practices (AU.L2-3.3.1, AU.L2-3.3.2, AU.L2-3.3.8).

### ThreatModel Integration
When threat modeling, reference CMMC practices in mitigations:

```markdown
### Threat: Unauthorized admin access (Elevation of Privilege)
**Mitigation**: Implement MFA for admin accounts
**CMMC Practice**: IA.L2-3.5.3 (Multi-factor authentication)
```

---

## Validation Checklist

Before finalizing CMMC baseline:

- [ ] All 5 domains analyzed (AC, IA, SC, CM, SI)
- [ ] Applicable practices identified (not all 71 may apply)
- [ ] Implementation documented for each practice
- [ ] Evidence repository created (code, configs, policies)
- [ ] Gaps identified and prioritized
- [ ] Compliance roadmap created with sprint assignments
- [ ] Baseline document generated
- [ ] Quarterly review scheduled
- [ ] Audit preparation plan created

---

**Workflow Version**: 1.0 (MVP: 5 domains)
**Next Version**: 2.0 (Release 0.2: all 17 domains, 110 practices)
**Last Updated**: 2025-12-02
**Based on**: CMMC Level 2 Model v2.0
