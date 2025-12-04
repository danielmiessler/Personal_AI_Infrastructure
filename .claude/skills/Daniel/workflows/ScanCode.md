# ScanCode Workflow

**Purpose**: Scan application code for security vulnerabilities with CMMC Level 2 compliance mapping

**Input**: Code files, code snippets, or file paths

**Output**: Security analysis report with vulnerabilities, CMMC mapping, severity ratings, and remediation guidance

---

## What is ScanCode?

**ScanCode** analyzes code for security vulnerabilities using 50+ detection patterns covering OWASP Top 10 and CMMC Level 2 requirements.

**Use Cases**:
- Pre-commit security review (catch vulnerabilities before merge)
- Code audit (identify security debt in existing codebase)
- Compliance verification (map vulnerabilities to CMMC practices)
- Security training (learn secure coding through examples)

**Detection Coverage**:
- SQL Injection (10 patterns)
- Cross-Site Scripting (10 patterns)
- Authentication & Authorization (20 patterns)
- CMMC Infrastructure (10 patterns)

**Not a Replacement For**: Automated SAST tools, manual penetration testing, runtime security testing

**Complements**: STRIDE threat modeling (design) + ScanCode (implementation) = comprehensive security

---

## When to Use ScanCode

### ✅ Use ScanCode For:

**High-Risk Code**:
- Authentication and authorization logic
- Payment processing
- Database query construction
- User input handling
- File upload/download
- API endpoints
- Session management
- Cryptographic operations

**Security-Sensitive Changes**:
- New authentication methods
- Permission model changes
- Data validation updates
- Security header configuration
- CORS policy changes

**Compliance Requirements**:
- CMMC SI.L2-3.14.6 (security function verification)
- CMMC SI.L2-3.14.7 (security flaw remediation)
- PCI-DSS 6.3.2 (secure code review)
- OWASP ASVS verification

**Examples**:
- "Scan this login code for security vulnerabilities"
- "Check this API endpoint for SQL injection"
- "Review this authentication middleware for security issues"

---

### ❌ Don't Use ScanCode For:

**Non-Security Issues**:
- Performance optimization → Use profiling tools
- Code style/formatting → Use linters (ESLint, Pylint)
- Logic bugs → Use unit tests
- Type safety → Use TypeScript strict mode

**Automated Scanning**:
- Dependency vulnerabilities → Use SCA tools (npm audit, Snyk)
- Known CVEs → Use vulnerability scanners
- License compliance → Use license checkers

**Infrastructure Security**:
- Cloud configuration → Use CmmcBaseline workflow
- Network architecture → Use ThreatModel workflow
- Container security → Use container scanning tools

---

## Workflow Steps

### Step 1: Provide Code to Scan

**Action**: Share the code you want to analyze

**Input Options**:
- **Code snippet**: Paste code directly
- **File path**: Provide file location (e.g., `src/auth/login.ts`)
- **Multiple files**: List multiple file paths
- **Directory**: Scan entire directory (e.g., `src/`)

**Context Needed** (optional but helpful):
- What does this code do?
- What framework/language?
- Any specific security concerns?

**Example**:
```typescript
app.get('/api/user/:id', async (req, res) => {
  const userId = req.params.id
  const query = "SELECT * FROM users WHERE id = " + userId
  const user = await db.query(query)
  res.json(user)
})
```

---

### Step 2: Daniel Analyzes Code

**Daniel's Analysis Process**:
1. **Pattern Matching**: Check code against 50+ vulnerability patterns
2. **Severity Assessment**: Rate vulnerability (Critical/High/Medium/Low)
3. **CMMC Mapping**: Map vulnerability to CMMC practice
4. **OWASP Classification**: Categorize by OWASP Top 10
5. **STRIDE Category**: Identify threat type
6. **Remediation Guidance**: Provide fix recommendations
7. **Secure Code Example**: Show corrected code

**Daniel's Output**:
```
❌ Vulnerability Detected!

   Name: SQL Injection - String Concatenation
   Severity: Critical
   STRIDE: Tampering
   OWASP: A03:2021 - Injection
   CMMC: SI.L2-3.14.6 (System and Information Integrity)

   Mitigation:
   Use parameterized queries or ORM to prevent SQL injection.
   Never concatenate user input into SQL queries.

   Secure Code Example:
   const query = "SELECT * FROM users WHERE id = ?"
   const user = await db.query(query, [userId])
```

---

### Step 3: Review Findings

**Action**: Review each vulnerability finding

**What to Check**:
- **Is this a real vulnerability?** (not false positive)
- **What's the severity?** (Critical/High/Medium/Low)
- **What CMMC practice does it violate?** (compliance impact)
- **How do I fix it?** (remediation guidance)
- **Do I have a secure code example?** (implementation reference)

**False Positive Handling**:
- Daniel aims for high accuracy but may occasionally flag false positives
- Review context to determine if vulnerability is real
- If false positive, document why and suppress warning

---

### Step 4: Remediate Vulnerabilities

**Action**: Fix vulnerabilities using Daniel's guidance

**Remediation Priority** (fix in this order):
1. **Critical**: Fix immediately (SQL injection, XSS, auth bypass)
2. **High**: Fix within 7 days (hardcoded credentials, weak passwords)
3. **Medium**: Fix within 30 days (missing security headers, weak config)
4. **Low**: Fix when convenient (missing logs, documentation gaps)

**Remediation Workflow**:
1. Understand the vulnerability (read Daniel's explanation)
2. Review the secure code example (see how to fix it)
3. Apply the fix to your code
4. Re-scan to verify fix (Daniel should report clean)
5. Add tests to prevent regression

**Example Fix**:
```typescript
// BEFORE (SQL Injection - Critical)
const query = "SELECT * FROM users WHERE id = " + userId

// AFTER (Parameterized Query - Secure)
const query = "SELECT * FROM users WHERE id = ?"
const user = await db.query(query, [userId])
```

---

### Step 5: Generate CMMC Audit Trail (Optional)

**Action**: Document security review for compliance

**Use Cases**:
- CMMC assessment evidence
- Security audit documentation
- Compliance reporting
- Security metrics tracking

**Output**: `cmmc-audit-trail.md` with:
- All vulnerabilities found
- CMMC practices mapped
- Remediation status
- Assessor-ready format

**Example**:
```
# CMMC Level 2 Security Review Audit Trail

## Summary
- Files Scanned: 15
- Vulnerabilities Found: 8
- Critical: 2
- High: 3
- Medium: 3
- CMMC Practices Violated: 5

## Findings by CMMC Domain

### SI - System and Information Integrity
**SI.L2-3.14.6**: Protect information system inputs
- SQL Injection in src/auth/login.ts (Critical)
- XSS in src/api/comments.ts (High)
```

---

## CLI Usage

Daniel can also be invoked from command-line:

```bash
# Scan single file
emma-scan src/auth/login.ts

# Scan directory
emma-scan src/

# JSON output for automation
emma-scan --json src/api/users.ts > report.json

# Verbose output
emma-scan --verbose src/
```

**Exit Codes**:
- `0`: No vulnerabilities found ✅
- `1`: Vulnerabilities detected ❌

**Integration with CI/CD**:
```yaml
# GitHub Actions example
- name: Daniel Security Scan
  run: |
    npm install
    npm run emma:scan src/
```

---

## API Usage

For programmatic usage:

```typescript
import { reviewCode } from './src/emma/security-review'

const code = `
  app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const query = "SELECT * FROM users WHERE username = '" + username + "'"
    const user = await db.query(query)
    // ...
  })
`

const analysis = await reviewCode(code)

if (analysis.detected) {
  console.log(`Vulnerability: ${analysis.vulnerability}`)
  console.log(`Severity: ${analysis.severity}`)
  console.log(`CMMC: ${analysis.cmmc}`)
  console.log(`Mitigation: ${analysis.mitigation}`)

  if (analysis.codeExample) {
    console.log(`Secure Code:\n${analysis.codeExample}`)
  }
}
```

---

## CMMC Compliance Mapping

Daniel maps vulnerabilities to CMMC Level 2 practices across 17 domains:

**Access Control (AC)**:
- AC.L2-3.1.1: Limit system access to authorized users
- AC.L2-3.1.2: Limit system access to authorized transactions

**Identification & Authentication (IA)**:
- IA.L2-3.5.1: Identify users, processes acting on behalf of users
- IA.L2-3.5.2: Authenticate users, processes
- IA.L2-3.5.7: Enforce minimum password complexity
- IA.L2-3.5.10: Store/transmit only cryptographically-protected passwords

**System & Information Integrity (SI)**:
- SI.L2-3.14.6: Monitor, control, and protect communications (protect inputs)
- SI.L2-3.14.7: Identify, report, and correct information system flaws

**System & Communications Protection (SC)**:
- SC.L2-3.13.6: Deny network communications traffic by default
- SC.L2-3.13.8: Implement cryptographic mechanisms

**Audit & Accountability (AU)**:
- AU.L2-3.3.1: Create, protect, and retain system audit logs

See `docs/CMMC-MAPPING.md` for complete practice-to-pattern reference.

---

## Best Practices

**Before Scanning**:
- Focus on high-risk code (auth, payments, data handling)
- Provide context about what code does
- Scan early and often (shift-left security)

**During Review**:
- Understand each vulnerability (don't just copy/paste fixes)
- Verify fixes work (re-scan after remediation)
- Document false positives (prevent duplicate reports)

**After Remediation**:
- Add tests to prevent regression
- Update security documentation
- Generate audit trail for compliance
- Share learnings with team

**Security First Mindset**:
- Threat model before coding (design security in)
- Scan during development (catch issues early)
- Review before merging (prevent vulnerabilities in production)
- Audit periodically (find security debt)

---

## Related Workflows

- **PerformSTRIDE**: Comprehensive threat modeling (use for architecture/design)
- **GenerateAudit**: Create CMMC compliance audit trail
- **RunStandup**: Multi-agent security review (Daniel + Mary + Bob + Murat)
- **ThreatModel** (Security skill): STRIDE threat modeling for new features
- **CmmcBaseline** (Security skill): CMMC Level 2 compliance baseline

---

## Test Coverage

**Production Ready**: 100% test coverage (78/78 tests passing)

- Acceptance Tests: 13/13 (100%)
- Critical Security: 31/31 (100%)
- Authorization: 11/11 (100%)
- CMMC Compliance: 23/23 (100%)

Daniel has been rigorously tested against OWASP Top 10 and CMMC Level 2 requirements.

---

## Support

For detailed documentation:
- `src/emma/README.md` - API reference
- `docs/CMMC-MAPPING.md` - CMMC practice mapping
- `docs/ARCHITECTURE.md` - System architecture
- `examples/` - Usage examples
