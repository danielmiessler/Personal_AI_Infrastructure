# Generate Audit Workflow

Generate audit trail documentation and compliance evidence packages.

## Overview

| Attribute | Value |
|-----------|-------|
| **Purpose** | Compile security evidence for compliance assessments and audits |
| **Input** | Security analysis from other workflows, system documentation |
| **Output** | Audit-ready documentation package |
| **Duration** | 2-8 hours depending on scope |

## Use Cases

| Audit Type | Common Requestor | Key Evidence |
|------------|------------------|--------------|
| CMMC Assessment | DoD, Prime contractor | SSP, POA&M, practice evidence |
| Customer Security Review | Enterprise customers | Security questionnaire, policies |
| SOC 2 Type II | Investors, customers | Control evidence, audit logs |
| Internal Audit | Security team | All of the above |
| Incident Response | Legal, management | Timeline, logs, actions taken |

## Workflow Steps

### Step 1: Define Audit Scope

Clarify what's being audited:

1. **Audit Type** - CMMC, SOC 2, customer review, internal
2. **Time Period** - Point-in-time or period of time
3. **Systems in Scope** - Which systems, applications, infrastructure
4. **Control Areas** - Which domains/controls are relevant
5. **Requester Needs** - Specific questions or requirements

### Step 2: Gather Source Materials

Collect outputs from other security workflows:

| Workflow | Artifacts |
|----------|-----------|
| ThreatModel | Threat model documents, risk assessments |
| SecurityReview | Security review reports, scan results |
| CmmcBaseline | SSP, POA&M, practice mappings |
| InfrastructureSecurity | Infrastructure audit reports |

**Additional sources:**
- Architecture diagrams
- Policy documents
- Procedure documentation
- Training records
- Access control lists
- Configuration baselines
- Incident response records
- Change management logs

### Step 3: Map to Requirements

For each audit requirement, identify evidence:

**CMMC Example:**

| Practice | Requirement | Evidence |
|----------|-------------|----------|
| AC.L2-3.1.1 | Authorized access control | RBAC configuration, access review logs |
| AU.L2-3.3.1 | System auditing | Log configuration, sample logs |
| IA.L2-3.5.3 | Multi-factor auth | MFA configuration, user enrollment |

**SOC 2 Example:**

| Criteria | Requirement | Evidence |
|----------|-------------|----------|
| CC6.1 | Logical access controls | Access policy, RBAC config |
| CC6.6 | System boundaries | Network diagram, firewall rules |
| CC7.2 | Security event monitoring | SIEM config, alert samples |

### Step 4: Compile Evidence

For each requirement, gather and document:

1. **Policy** - Written policy addressing the requirement
2. **Procedure** - How the policy is implemented
3. **Evidence** - Proof of implementation
4. **Screenshots** - Visual confirmation (sanitized)
5. **Logs/Reports** - System-generated evidence

**Evidence Quality Criteria:**

| Criteria | Good Evidence | Poor Evidence |
|----------|---------------|---------------|
| Relevance | Directly shows control | Tangentially related |
| Completeness | Full picture | Partial view |
| Currency | Recent/current | Outdated |
| Authenticity | System-generated | Manually created |
| Objectivity | Unedited | Cherry-picked |

### Step 5: Create Audit Package

Organize documentation:

```
audit-package/
├── 00-index.md                    # Table of contents
├── 01-executive-summary.md        # Overview and findings
├── 02-scope-and-methodology.md    # What was audited and how
├── 03-system-overview/
│   ├── architecture-diagram.png
│   ├── data-flow-diagram.png
│   └── network-diagram.png
├── 04-policy-documents/
│   ├── access-control-policy.pdf
│   ├── incident-response-policy.pdf
│   └── security-awareness-policy.pdf
├── 05-control-evidence/
│   ├── AC-access-control/
│   ├── AU-audit/
│   ├── CM-configuration/
│   └── ...
├── 06-scan-reports/
│   ├── vulnerability-scan-YYYY-MM-DD.pdf
│   ├── dependency-audit-YYYY-MM-DD.json
│   └── secrets-scan-YYYY-MM-DD.txt
├── 07-gap-analysis/
│   ├── poa-m.xlsx
│   └── remediation-roadmap.md
└── 08-attestations/
    ├── management-assertion.pdf
    └── third-party-reports.pdf
```

### Step 6: Quality Review

Before submission:

- [ ] All required evidence is present
- [ ] Evidence is properly labeled and organized
- [ ] Sensitive data is redacted appropriately
- [ ] Screenshots are legible and relevant
- [ ] Dates and versions are current
- [ ] Cross-references are accurate
- [ ] Gaps are documented in POA&M
- [ ] Executive summary is accurate

### Step 7: Prepare for Auditor Questions

Anticipate follow-up questions:

| Area | Common Questions |
|------|-----------------|
| Access Control | How often are access reviews performed? Who approves access? |
| Logging | How long are logs retained? Who reviews them? |
| Incidents | When was the last incident? How was it handled? |
| Changes | How are changes approved? What's the rollback process? |
| Training | How often is security training? How is completion tracked? |

Prepare responses and supporting evidence for likely questions.

## Evidence Templates

### Access Control Evidence

```markdown
## AC.L2-3.1.1 - Authorized Access Control

### Policy
- Document: Access Control Policy v2.3
- Location: policies/access-control.pdf
- Last Updated: 2024-01-15

### Implementation
- System: AWS IAM + Application RBAC
- Configuration: terraform/iam.tf, app/config/roles.yaml

### Evidence
1. IAM policy document (screenshot: evidence/ac-3.1.1-iam.png)
2. Application role definitions (evidence/ac-3.1.1-roles.json)
3. Access review log Q4 2023 (evidence/ac-3.1.1-review.xlsx)

### Status: Implemented
```

### Audit Log Evidence

```markdown
## AU.L2-3.3.1 - System Auditing

### Policy
- Document: Logging and Monitoring Policy v1.4
- Location: policies/logging.pdf

### Implementation
- System: CloudWatch Logs + Datadog SIEM
- Log Types: Application, System, Security, Audit
- Retention: 90 days hot, 1 year archive

### Evidence
1. CloudWatch configuration (evidence/au-3.3.1-cloudwatch.json)
2. Sample security logs (evidence/au-3.3.1-sample-logs.txt)
3. Log review procedure (evidence/au-3.3.1-procedure.pdf)

### Status: Implemented
```

## Output Artifacts

1. **Audit Package** - Complete evidence collection organized by control
2. **Executive Summary** - High-level overview for management
3. **Gap Summary** - Outstanding issues with remediation timeline
4. **POA&M** - Plan of Action & Milestones for gaps
5. **Attestation** - Management assertion of accuracy

## Integration with Other Workflows

| From Workflow | Evidence Generated |
|--------------|-------------------|
| ThreatModel | Risk assessment, threat analysis |
| SecurityReview | Vulnerability scans, code review findings |
| CmmcBaseline | SSP, practice mappings, gap analysis |
| InfrastructureSecurity | Infrastructure configuration evidence |

## Best Practices

### Evidence Collection
- Automate evidence collection where possible
- Use system-generated reports over manual documentation
- Include timestamps on all evidence
- Version control policy documents
- Take screenshots with date/time visible

### Documentation
- Use consistent naming conventions
- Cross-reference between documents
- Keep evidence atomic (one control per file when practical)
- Include context with screenshots (what system, what it shows)

### Maintenance
- Update evidence quarterly at minimum
- Refresh screenshots when systems change
- Track policy document versions
- Archive old evidence for historical reference

### Redaction
- Remove actual passwords and secrets
- Mask personal identifiable information (PII)
- Sanitize internal IP addresses if external audit
- Keep enough context for evidence to be meaningful
