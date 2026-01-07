---
name: Security
description: Shift-left security with threat modeling, OWASP analysis, and CMMC compliance. USE WHEN threat model, security review, CMMC, compliance, OWASP, vulnerability analysis. Depends on kai-security-tools for scanning.
depends_on:
  - kai-security-tools
---

# Security Skill

Enterprise-grade security workflows for shift-left development. Provides threat modeling, code security review, CMMC compliance mapping, and infrastructure security auditing.

## Workflow Routing

| Trigger | Workflow | Description |
|---------|----------|-------------|
| `threat model`, `stride`, `dread`, `security architecture` | [ThreatModel](Workflows/ThreatModel.md) | Generate STRIDE threat model with DREAD ratings |
| `security review`, `code review security`, `owasp`, `vulnerability` | [SecurityReview](Workflows/SecurityReview.md) | OWASP Top 10 security code review |
| `cmmc`, `compliance`, `nist 800-171`, `cui` | [CmmcBaseline](Workflows/CmmcBaseline.md) | CMMC Level 2 baseline and gap analysis |
| `audit`, `evidence`, `soc 2`, `assessment` | [GenerateAudit](Workflows/GenerateAudit.md) | Generate compliance audit documentation |
| `infrastructure security`, `cloud security`, `iac review` | [InfrastructureSecurity](Workflows/InfrastructureSecurity.md) | Cloud and infrastructure security audit |

## Tool Dependencies

This skill depends on **kai-security-tools** for automated scanning:

| Tool | Purpose | Used By |
|------|---------|---------|
| `DependencyAudit` | Scan dependencies for CVEs | SecurityReview |
| `SecretsScan` | Detect hardcoded secrets | SecurityReview, InfrastructureSecurity |
| `SastScan` | Static analysis security testing | SecurityReview |
| `ContainerScan` | Container image vulnerability scan | InfrastructureSecurity |

## Knowledge Base

- [CMMC-INDEX](Knowledge/CMMC-INDEX.md) - CMMC 2.0 Level 2 domain index with lazy loading
- [OWASP Patterns](Knowledge/owasp-patterns.md) - OWASP Top 10 2021 quick reference

## Templates

- [Threat Model Template](Templates/threat-model.md) - STRIDE/DREAD threat model document
- [Security Report Template](Templates/security-report.md) - Security review findings report

## Examples

### Threat Model a New Feature
```
User: Create a threat model for our new payment processing API
Assistant: [Loads ThreatModel workflow]
1. Analyzes system architecture
2. Identifies trust boundaries (client, API, payment processor, database)
3. Applies STRIDE to each component
4. Rates risks using DREAD
5. Maps mitigations to CMMC practices
6. Outputs threat-model.md
```

### Security Review a Pull Request
```
User: Security review PR #142
Assistant: [Loads SecurityReview workflow]
1. Runs kai-security-tools DependencyAudit
2. Runs kai-security-tools SecretsScan
3. Applies OWASP Top 10 checklist
4. Identifies A03 (Injection) risk in user input handling
5. Generates remediation recommendations
6. Outputs security-report.md
```

### CMMC Baseline for a Project
```
User: What CMMC Level 2 practices apply to our CUI-handling service?
Assistant: [Loads CmmcBaseline workflow]
1. Identifies applicable domains (AC, AU, IA, SC, SI)
2. Loads specific domain details from Knowledge/cmmc/
3. Maps current implementation to practices
4. Identifies gaps (e.g., AC.L2-3.1.3 Flow Enforcement missing)
5. Creates prioritized remediation roadmap
```

### Infrastructure Security Audit
```
User: Review security of our Kubernetes Helm charts
Assistant: [Loads InfrastructureSecurity workflow]
1. Analyzes Helm templates for security misconfigurations
2. Checks against CIS Kubernetes Benchmark
3. Reviews network policies and RBAC
4. Runs SecretsScan on manifests
5. Generates infrastructure security report
```

## Integration Points

### With Development Workflow
- Run SecurityReview on PRs before merge
- Generate ThreatModel during design phase
- Include CmmcBaseline in architecture decisions

### With CI/CD
- kai-security-tools integrates with GitHub Actions
- Dependency and secrets scanning in pipeline
- Block deployments on critical findings

### With Documentation
- ThreatModel outputs link to METHODOLOGY.md principles
- Security reports reference OWASP patterns
- CMMC gaps link to specific practice requirements

## Quick Start

1. **New project?** Start with ThreatModel to identify risks early
2. **Code changes?** Run SecurityReview before merge
3. **Government contract?** Run CmmcBaseline for compliance mapping
4. **Deploying infrastructure?** Run InfrastructureSecurity audit
5. **Preparing for assessment?** Use GenerateAudit to compile evidence
