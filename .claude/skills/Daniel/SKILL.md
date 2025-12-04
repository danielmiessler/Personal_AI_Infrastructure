---
name: Daniel
description: Production-ready security analysis with CMMC Level 2 compliance. USE WHEN user needs vulnerability scanning, STRIDE threat modeling, security code review, CMMC compliance mapping, or multi-agent security analysis. Detects 50+ vulnerability patterns with remediation guidance.
---

# Daniel

Comprehensive security analysis for application code and infrastructure with CMMC Level 2 compliance mapping.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| ScanCode | Analyzing code for security vulnerabilities | Security analysis with vulnerability findings, CMMC mapping, remediation guidance |
| PerformSTRIDE | Comprehensive threat modeling of feature | STRIDE threat analysis (all 6 categories) with priority rankings |
| GenerateAudit | Creating CMMC compliance audit trail | Audit trail document with all vulnerabilities mapped to CMMC practices |
| RunStandup | Multi-agent security review | Coordinated analysis from Daniel, Mary, Bob, and Murat |

## Examples

### Example 1: Scan code for vulnerabilities
```
User: "Scan this authentication code for security issues"
Skill loads: Daniel → ScanCode workflow
Output: Security analysis identifying SQL injection, weak passwords, missing MFA
  - Vulnerability: SQL Injection - String Concatenation
  - Severity: Critical
  - CMMC: SI.L2-3.14.6 (System and Information Integrity)
  - Mitigation: Use parameterized queries
  - Secure code example provided
```

### Example 2: STRIDE threat modeling
```
User: "Perform STRIDE analysis on payment processing"
Skill loads: Daniel → PerformSTRIDE workflow
Output: Comprehensive threat model across 6 categories
  - Spoofing: 2 threats found
  - Tampering: 1 threat found
  - Repudiation: 1 threat found
  - Information Disclosure: 3 threats found
  - Denial of Service: 1 threat found
  - Elevation of Privilege: 0 threats
  - Priority ranking and timeline recommendations
```

### Example 3: Generate CMMC audit trail
```
User: "Generate CMMC audit trail for security review"
Skill loads: Daniel → GenerateAudit workflow
Output: CMMC-compliant audit document
  - All vulnerabilities found
  - Mapped to CMMC practices (17 domains)
  - Assessor-ready format
  - Evidence of security analysis performed
```

### Example 4: Multi-agent security standup
```
User: "Review authentication system with full team"
Skill loads: Daniel → RunStandup workflow
Output: Multi-perspective analysis
  - Daniel: Security threats (STRIDE + CMMC violations)
  - Mary: Business impact and user value
  - Bob: Timeline and capacity estimates
  - Murat: Test coverage and quality assurance
  - Synthesized decision with all perspectives
```

## Capabilities

### Vulnerability Detection (50+ Patterns)

**SQL Injection (10 patterns)**
- String concatenation, template literals, ORDER BY, UNION, LIMIT
- Stored procedures, second-order, blind, time-based, NoSQL

**Cross-Site Scripting (10 patterns)**
- Reflected, stored, DOM-based, event handlers
- CSS, SVG, Markdown, JSON, meta refresh, JSONP

**Authentication & Authorization (20 patterns)**
- Missing authentication, hardcoded credentials, weak passwords
- Rate limiting, MFA enforcement, IDOR, privilege escalation
- Mass assignment, path traversal, file upload, JWT issues

**CMMC Infrastructure (10 patterns)**
- HTTP usage, missing security headers, CORS misconfig
- Missing audit logs, backup, incident response, change control
- Baseline configuration, vulnerability scanning, dependencies

### CMMC Level 2 Coverage (17 Domains)

- **AC**: Access Control
- **AT**: Awareness and Training
- **AU**: Audit and Accountability
- **CA**: Security Assessment
- **CM**: Configuration Management
- **CP**: Contingency Planning
- **IA**: Identification and Authentication
- **IR**: Incident Response
- **MA**: Maintenance
- **MP**: Media Protection
- **PE**: Physical Protection
- **PS**: Personnel Security
- **RA**: Risk Assessment
- **RE**: Recovery
- **SA**: System and Services Acquisition
- **SC**: System and Communications Protection
- **SI**: System and Information Integrity

### STRIDE Threat Modeling

- **S**poofing: Identity authentication attacks
- **T**ampering: Data integrity attacks
- **R**epudiation: Non-repudiation attacks
- **I**nformation Disclosure: Confidentiality attacks
- **D**enial of Service: Availability attacks
- **E**levation of Privilege: Authorization attacks

## CLI Usage

Daniel can also be invoked via command-line for CI/CD integration:

```bash
# Scan single file
daniel-scan src/auth/login.ts

# Scan entire directory
daniel-scan src/

# STRIDE threat modeling
daniel-scan --stride src/payment.ts

# JSON output for automation
daniel-scan --json src/api.ts

# Stdin support for pipes
cat suspicious.js | daniel-scan --stdin
```

Exit codes:
- `0`: No vulnerabilities found
- `1`: Vulnerabilities detected

## Integration

- Works with AgilePm skill (adds security requirements to user stories)
- Works with TestArchitect skill (security test scenarios from findings)
- Works with Security skill (STRIDE threat models, CMMC baselines)
- Generates audit trails for CMMC assessors
- Multi-agent coordination with Mary, Bob, Murat

## Test Coverage

**Production Ready**: 100% test coverage (78/78 tests passing)

- Acceptance: 13/13 (100%)
- Critical Security: 31/31 (100%)
- Authorization: 11/11 (100%)
- CMMC Compliance: 23/23 (100%)

## Methodology

Daniel follows security industry standards:

- **STRIDE**: Microsoft's threat modeling framework
- **OWASP Top 10**: Web application security risks
- **CMMC Model v2.0**: DoD contractor compliance (110 practices)
- **NIST 800-171**: Protecting Controlled Unclassified Information
- **ATDD**: Acceptance Test-Driven Development for quality assurance

## Implementation

Daniel is implemented in TypeScript with:
- `src/daniel/security-review.ts` - Core vulnerability detection
- `src/daniel/vulnerability-patterns.ts` - 50+ detection patterns
- `src/daniel/cmmc-lookup.ts` - CMMC practice mapping
- `src/daniel/stride.ts` - STRIDE threat modeling
- `src/standup/orchestrator.ts` - Multi-agent coordination
- `bin/daniel-scan.ts` - Command-line interface

See `src/daniel/README.md` for detailed API documentation and usage examples.
