# PerformSTRIDE Workflow

**Purpose**: Comprehensive threat modeling using Microsoft's STRIDE framework

**Input**: Code, architecture diagram, or feature description

**Output**: STRIDE threat analysis with all threats found across 6 categories, priority rankings, and mitigation recommendations

---

## What is PerformSTRIDE?

**PerformSTRIDE** performs comprehensive threat modeling using STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

**Use Cases**:
- Architecture review (identify threats in system design)
- Feature security review (find all threats before implementation)
- Security compliance (threat modeling for CMMC SA.L2-3.12.4)
- Risk assessment (prioritize threats by severity)

**STRIDE Categories**:
- **S**poofing: Identity authentication attacks
- **T**ampering: Data integrity attacks
- **R**epudiation: Non-repudiation attacks (denying actions)
- **I**nformation Disclosure: Confidentiality attacks
- **D**enial of Service: Availability attacks
- **E**levation of Privilege: Authorization attacks

**Difference from ScanCode**:
- **ScanCode**: Scans code for known vulnerability patterns (focused)
- **PerformSTRIDE**: Finds ALL threats across 6 categories (comprehensive)

---

## When to Use PerformSTRIDE

### ✅ Use PerformSTRIDE For:

**Design Phase**:
- New feature design (identify threats before coding)
- Architecture review (assess system-level threats)
- Risk assessment (understand threat landscape)
- Security requirements gathering

**High-Risk Features**:
- Authentication and authorization systems
- Payment processing
- Data encryption/decryption
- Multi-tenant systems
- API gateways
- Admin panels
- File upload/download

**Compliance Requirements**:
- CMMC SA.L2-3.12.4 (develop security plan addressing risks)
- CMMC RA.L2-3.11.1 (periodically assess risk)
- ISO 27001 threat modeling
- PCI-DSS threat and risk assessments

**Examples**:
- "Perform STRIDE analysis on payment processing feature"
- "Threat model the user authentication system"
- "Find all security threats in this API endpoint"

---

### ❌ Don't Use PerformSTRIDE For:

**Known Vulnerability Scanning**:
- SQL injection detection → Use ScanCode workflow
- XSS detection → Use ScanCode workflow
- Code-level vulnerabilities → Use ScanCode workflow

**Non-Security Analysis**:
- Performance bottlenecks → Use profiling tools
- Code quality → Use linters
- Logic bugs → Use unit tests

---

## Workflow Steps

### Step 1: Provide Feature Context

**Action**: Describe the feature to threat model

**Input Options**:
- **Code snippet**: Provide implementation code
- **Architecture diagram**: Describe system components
- **Feature description**: Explain what feature does
- **User flow**: Describe user interactions

**Context Needed**:
- What does this feature do?
- Who are the users?
- What data is involved?
- What are the trust boundaries?
- What are the critical assets?

**Example**:
```
Feature: User Authentication System

Components:
- Login form (React frontend)
- Auth API (Node.js backend)
- JWT token generation
- User database (PostgreSQL)
- Session storage (Redis)

User Flow:
1. User enters email/password
2. Backend validates credentials
3. JWT token issued
4. Token stored in localStorage
5. Token used for authenticated requests

Critical Assets:
- User passwords
- JWT secret key
- User sessions
- User personal data
```

---

### Step 2: Daniel Performs STRIDE Analysis

**Daniel's STRIDE Process**:

**S - Spoofing** (Identity Attacks):
- Can attacker impersonate another user?
- Is authentication mechanism strong enough?
- Are credentials protected in transit?
- Is MFA enforced for privileged accounts?

**T - Tampering** (Integrity Attacks):
- Can attacker modify data in transit?
- Can attacker modify data at rest?
- Is input validation sufficient?
- Are cryptographic signatures used?

**R - Repudiation** (Non-repudiation Attacks):
- Can user deny performing an action?
- Are audit logs comprehensive?
- Are logs tamper-proof?
- Is log retention sufficient?

**I - Information Disclosure** (Confidentiality Attacks):
- Can attacker access sensitive data?
- Is encryption used for sensitive data?
- Are error messages leaking information?
- Is data access properly authorized?

**D - Denial of Service** (Availability Attacks):
- Can attacker crash the system?
- Is rate limiting implemented?
- Are resource limits enforced?
- Is system resilient to malformed input?

**E - Elevation of Privilege** (Authorization Attacks):
- Can user access unauthorized resources?
- Are privilege boundaries enforced?
- Is RBAC implemented correctly?
- Are admin functions protected?

---

### Step 3: Daniel Reports All Threats

**Daniel's Output Format**:
```
🔍 STRIDE Threat Analysis

Total Threats Found: 8
- Critical: 1
- High: 3
- Medium: 3
- Low: 1

=== SPOOFING (2 threats) ===

1. [HIGH] Weak Password Policy
   Description: No password complexity enforcement allows weak passwords
   Impact: Attacker can brute force weak passwords
   CMMC: IA.L2-3.5.7 (Password Complexity)
   Mitigation: Enforce minimum 12 characters, uppercase, lowercase, numbers, symbols
   Timeline: Fix within 7 days

2. [MEDIUM] Missing MFA on Privileged Accounts
   Description: Admin accounts don't require multi-factor authentication
   Impact: Compromised admin password = full system access
   CMMC: IA.L2-3.5.1 (MFA for privileged accounts)
   Mitigation: Implement MFA for all admin accounts (TOTP or WebAuthn)
   Timeline: Fix within 30 days

=== TAMPERING (1 threat) ===

1. [CRITICAL] SQL Injection in Login
   Description: User input concatenated into SQL query
   Impact: Attacker can execute arbitrary SQL, dump database, bypass auth
   CMMC: SI.L2-3.14.6 (Protect system inputs)
   Mitigation: Use parameterized queries or ORM
   Timeline: Fix immediately
   Code Example:
   const query = "SELECT * FROM users WHERE email = ?"
   const user = await db.query(query, [email])

=== REPUDIATION (1 threat) ===

1. [MEDIUM] Missing Audit Logs for Auth Events
   Description: Failed login attempts not logged
   Impact: Cannot detect brute force attacks or investigate breaches
   CMMC: AU.L2-3.3.1 (Audit log creation)
   Mitigation: Log all authentication events (success, failure, lockout)
   Timeline: Fix within 30 days

=== INFORMATION DISCLOSURE (3 threats) ===

1. [HIGH] JWT Secret Hardcoded in Code
   Description: JWT secret stored in source code
   Impact: Attacker with code access can forge tokens
   CMMC: IA.L2-3.5.10 (Protected passwords)
   Mitigation: Store JWT secret in environment variable or secret manager
   Timeline: Fix within 7 days

2. [HIGH] Passwords Transmitted over HTTP
   Description: Login endpoint uses HTTP instead of HTTPS
   Impact: Passwords intercepted in plaintext via MITM attack
   CMMC: SC.L2-3.13.8 (Cryptographic mechanisms)
   Mitigation: Enforce HTTPS for all endpoints
   Timeline: Fix within 7 days

3. [MEDIUM] Verbose Error Messages Leak Info
   Description: Error messages reveal database structure
   Impact: Attacker learns schema details for targeted attacks
   CMMC: SI.L2-3.14.6 (Protect system inputs)
   Mitigation: Return generic error messages to client, log details server-side
   Timeline: Fix within 30 days

=== DENIAL OF SERVICE (1 threat) ===

1. [LOW] No Rate Limiting on Login Endpoint
   Description: Unlimited login attempts allowed
   Impact: Attacker can brute force passwords
   CMMC: AC.L2-3.1.17 (Limit unsuccessful login attempts)
   Mitigation: Implement rate limiting (5 attempts per minute per IP)
   Timeline: Fix when convenient

=== ELEVATION OF PRIVILEGE (0 threats) ===

No threats found in this category.
```

---

### Step 4: Prioritize Threats

**Action**: Review threats and prioritize fixes

**Priority Matrix**:
- **Critical**: Fix immediately (within 24 hours)
- **High**: Fix within 7 days
- **Medium**: Fix within 30 days
- **Low**: Fix when convenient

**Risk Scoring** (Severity = Likelihood × Impact):
- **Critical**: High likelihood + High impact (e.g., SQL injection in production)
- **High**: Medium likelihood + High impact OR High likelihood + Medium impact
- **Medium**: Low likelihood + High impact OR Medium likelihood + Medium impact
- **Low**: Low likelihood + Low impact

---

### Step 5: Remediate Threats

**Action**: Fix threats using Daniel's mitigation guidance

**Remediation Workflow**:
1. Fix Critical threats immediately
2. Create tickets for High/Medium threats
3. Schedule Low threats for backlog
4. Re-scan after fixes to verify
5. Document decisions in threat model

**Example Remediation**:
```typescript
// BEFORE (Critical: SQL Injection)
const query = "SELECT * FROM users WHERE email = '" + email + "'"

// AFTER (Secure: Parameterized Query)
const query = "SELECT * FROM users WHERE email = ?"
const user = await db.query(query, [email])
```

---

### Step 6: Document Threat Model

**Action**: Create threat model document for compliance

**Output**: `threat-model-<feature>.md` with:
- All STRIDE threats identified
- Severity ratings
- Mitigation recommendations
- Remediation timeline
- CMMC practice mapping

**Use Cases**:
- CMMC assessment evidence (SA.L2-3.12.4)
- Security audit documentation
- Team security awareness
- Future reference for similar features

---

## API Usage

For programmatic usage:

```typescript
import { performSTRIDE } from './src/emma/security-review'

const code = `
  app.post('/login', async (req, res) => {
    const { email, password } = req.body
    const query = "SELECT * FROM users WHERE email = '" + email + "'"
    const user = await db.query(query)
    // ...
  })
`

const analysis = await performSTRIDE(code)

console.log(`Total Threats: ${analysis.threats?.length}`)

analysis.threats?.forEach(threat => {
  console.log(`[${threat.severity}] ${threat.category}: ${threat.description}`)
  console.log(`  Mitigation: ${threat.mitigation}`)
  console.log(`  CMMC: ${threat.cmmc}`)
})
```

---

## CLI Usage

```bash
# Perform STRIDE analysis on file
emma-scan --stride src/auth/login.ts

# STRIDE analysis with JSON output
emma-scan --stride --json src/payment.ts > threats.json

# Verbose STRIDE analysis
emma-scan --stride --verbose src/api/
```

---

## STRIDE + CMMC Mapping

Daniel maps STRIDE threats to CMMC practices:

**Spoofing** → Identification & Authentication (IA):
- IA.L2-3.5.1: MFA for privileged accounts
- IA.L2-3.5.2: Authenticate users and processes
- IA.L2-3.5.7: Enforce password complexity
- IA.L2-3.5.10: Store/transmit cryptographically-protected passwords

**Tampering** → System & Information Integrity (SI):
- SI.L2-3.14.6: Protect system inputs (SQL injection, XSS)
- SI.L2-3.14.7: Identify and correct system flaws

**Repudiation** → Audit & Accountability (AU):
- AU.L2-3.3.1: Create and retain audit logs
- AU.L2-3.3.2: Ensure audit log records support investigations

**Information Disclosure** → System & Communications Protection (SC):
- SC.L2-3.13.6: Deny network traffic by default
- SC.L2-3.13.8: Implement cryptographic mechanisms
- SC.L2-3.13.11: Employ FIPS-validated cryptography

**Denial of Service** → Access Control (AC):
- AC.L2-3.1.17: Limit unsuccessful login attempts
- AC.L2-3.1.7: Prevent non-privileged users from executing privileged functions

**Elevation of Privilege** → Access Control (AC):
- AC.L2-3.1.1: Limit system access to authorized users
- AC.L2-3.1.2: Limit system access to authorized transactions
- AC.L2-3.1.5: Employ least privilege principle

---

## Best Practices

**Before STRIDE Analysis**:
- Understand feature architecture
- Identify trust boundaries
- Define critical assets
- Map data flows

**During STRIDE Analysis**:
- Review each STRIDE category systematically
- Consider both design and implementation threats
- Think like an attacker
- Document all threats (even low severity)

**After STRIDE Analysis**:
- Prioritize threats by risk
- Create remediation plan
- Assign owners for fixes
- Set deadlines based on severity
- Document threat model

**Continuous Threat Modeling**:
- Threat model new features during design
- Update threat models when architecture changes
- Review threat models during security audits
- Share threat model with development team

---

## Related Workflows

- **ScanCode**: Scan code for known vulnerability patterns
- **GenerateAudit**: Create CMMC compliance audit trail
- **RunStandup**: Multi-agent threat review (Daniel + team)
- **ThreatModel** (Security skill): STRIDE threat modeling for architecture

---

## References

- **STRIDE**: Microsoft's threat modeling framework
- **CMMC Model v2.0**: DoD contractor compliance
- **OWASP Threat Modeling**: Best practices
- **NIST 800-30**: Risk assessment guide
