---
name: Security
description: Proactive security engineering for PAI projects. USE WHEN user needs threat modeling, CMMC compliance baseline, security requirements, vulnerability analysis, or security-first design. Prevents security issues during design, not after deployment.
---

# Security

Shift-left security: identify and mitigate threats before code is written.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| ThreatModel | Designing new feature or system | Threat model document with STRIDE threats and mitigations |
| CmmcBaseline | Starting DoD/government project | CMMC Level 2 compliance baseline (all 17 domains, 110 practices) |
| SecurityReview | Reviewing code for vulnerabilities | Security review report with OWASP Top 10 findings and fixes |
| InfrastructureSecurity | Auditing cloud/infrastructure config | Infrastructure security audit with hardening recommendations |
| GenerateAudit | Creating CMMC compliance audit trail | Assessor-ready audit trail with findings, CMMC mapping, remediation status |

## Examples

### Example 1: Threat model a new feature
```
User: "Threat model the user login feature"
Skill loads: Security → ThreatModel workflow
Output: STRIDE threats identified (spoofing, tampering, etc.) with mitigations
```

### Example 2: Generate CMMC baseline
```
User: "Create CMMC baseline for our e-commerce app"
Skill loads: Security → CmmcBaseline workflow
Output: CMMC practices mapped to features, gap analysis, compliance roadmap
```

### Example 3: Code security review
```
User: "Review this authentication code for security vulnerabilities"
Skill loads: Security → SecurityReview workflow
Output: OWASP Top 10 analysis, vulnerability findings (SQL injection, weak passwords), remediation guidance
```

### Example 4: Infrastructure security audit
```
User: "Audit our AWS configuration for security issues"
Skill loads: Security → InfrastructureSecurity workflow
Output: Infrastructure security findings (open S3 buckets, weak IAM policies), CIS Benchmark gaps
```

### Example 5: Generate CMMC audit trail
```
User: "Generate CMMC audit trail for our security review"
Skill loads: Security → GenerateAudit workflow
Output: Assessor-ready document with all findings mapped to CMMC practices, remediation timeline, evidence of controls
```

## Integration

- Works with AgilePm skill (adds security reqs to user stories)
- Works with TestArchitect skill (security test scenarios from threat model)
- Works with Standup skill (Daniel agent uses Security workflows for multi-agent reviews)
- Generates threat-model.md for project documentation
- Maps to CMMC practices for compliance

## Methodology

This skill follows security-first principles:
- Threat model during design (not after deployment)
- STRIDE methodology (Microsoft's threat modeling framework)
- CMMC Level 2 baseline (110 practices for DoD contractors)
- Risk-based prioritization (fix critical threats first)

Based on industry standards: STRIDE, OWASP Top 10, CMMC Model v2.0.
