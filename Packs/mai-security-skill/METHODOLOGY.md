# Security Methodology

This document defines the security principles, approach, and workflow sequencing for the Security skill.

## Core Principles

### 1. Shift-Left Security

Security is most effective when integrated early in the development lifecycle. The cost of fixing a vulnerability increases exponentially as code moves through stages:

| Stage | Relative Cost | Example |
|-------|---------------|---------|
| Design | 1x | Threat model identifies auth bypass risk |
| Development | 6x | Code review catches SQL injection |
| Testing | 15x | Penetration test finds the same issue |
| Production | 100x | Incident response after breach |

**Practice:** Run ThreatModel during design, SecurityReview before merge, never skip security for speed.

### 2. Defense in Depth

No single control is sufficient. Layer defenses so that if one fails, others provide protection:

```
┌─────────────────────────────────────────────────────────────┐
│  Network Layer: Firewall, WAF, DDoS protection              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Transport Layer: TLS 1.3, certificate validation       ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │  Application Layer: Input validation, auth, authz   │││
│  │  │  ┌─────────────────────────────────────────────────┐│││
│  │  │  │  Data Layer: Encryption at rest, access control ││││
│  │  │  └─────────────────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Practice:** When mitigating a risk, identify controls at multiple layers.

### 3. Fail Secure / Fail Closed

When a system fails, it should fail to a secure state, not an open one:

| Scenario | Fail Open (Wrong) | Fail Closed (Right) |
|----------|-------------------|---------------------|
| Auth service down | Allow all requests | Deny all requests |
| Rate limiter error | Disable rate limiting | Block requests |
| Certificate expired | Accept anyway | Reject connection |
| Input validation crash | Accept input | Reject input |

**Practice:** Default deny. Explicit allow. Never assume failure means "proceed anyway."

### 4. Least Privilege

Grant minimum permissions necessary for a function to operate:

- Users get only the access they need for their role
- Services run with minimal permissions
- API tokens are scoped to specific operations
- Network rules default-deny with explicit allows

**Practice:** Start with zero permissions, add only what's required, document why.

### 5. Secure by Default

Systems should be secure out of the box. Insecure configurations require explicit opt-in:

| Configuration | Insecure Default | Secure Default |
|---------------|------------------|----------------|
| Password policy | No requirements | Min 12 chars, complexity |
| Session timeout | Never expires | 15 minute idle timeout |
| API authentication | Optional | Required |
| Logging | Disabled | Enabled with retention |
| Encryption | Optional | Required TLS 1.3+ |

**Practice:** Review defaults in all dependencies, frameworks, and infrastructure.

## Workflow Sequence

The Security skill workflows are designed to integrate with the development lifecycle:

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│     PRD      │────▶│ ThreatModel │────▶│ CmmcBaseline │────▶│ Implementation │────▶│ SecurityReview │────▶│ GenerateAudit │
│   (Design)   │     │  (Design)   │     │  (Planning)  │     │  (Coding)      │     │ (Pre-Merge)    │     │ (Compliance)  │
└──────────────┘     └─────────────┘     └──────────────┘     └────────────────┘     └────────────────┘     └───────────────┘
       │                   │                   │                     │                      │                      │
       ▼                   ▼                   ▼                     ▼                      ▼                      ▼
   Define scope       Identify risks      Map compliance       Apply secure          Validate security       Document
   and features       and mitigations     requirements         coding practices      and find issues         evidence
```

### When to Use Each Workflow

| Workflow | When | Why |
|----------|------|-----|
| **ThreatModel** | New feature design, architecture changes, third-party integrations | Identify risks before code is written |
| **CmmcBaseline** | Government contracts, CUI handling, compliance requirements | Map features to CMMC practices, identify gaps |
| **SecurityReview** | Before PR merge, periodic codebase audits, suspicious code | Catch vulnerabilities before production |
| **InfrastructureSecurity** | Infrastructure changes, cloud migrations, Kubernetes deployments | Validate IaC and cloud configurations |
| **GenerateAudit** | Pre-assessment preparation, customer security reviews, SOC 2 | Compile evidence packages for auditors |

## Threat Modeling Approach

### STRIDE Methodology

Categorize threats by type:

| Category | Description | Example |
|----------|-------------|---------|
| **S**poofing | Impersonating something or someone | Forged authentication token |
| **T**ampering | Modifying data or code | SQL injection modifying records |
| **R**epudiation | Denying an action | User claims they didn't make purchase |
| **I**nformation Disclosure | Exposing information | API returns other users' data |
| **D**enial of Service | Making system unavailable | Resource exhaustion attack |
| **E**levation of Privilege | Gaining higher access | User becomes admin via bug |

### DREAD Risk Rating

Score each threat (1-10 scale for each factor):

| Factor | 1 (Low) | 5 (Medium) | 10 (High) |
|--------|---------|------------|-----------|
| **D**amage | Minor inconvenience | Financial loss | Complete system compromise |
| **R**eproducibility | Complex conditions needed | Requires specific setup | Always reproducible |
| **E**xploitability | Requires insider access | Requires technical skill | Script kiddie can do it |
| **A**ffected Users | Single user | Subset of users | All users |
| **D**iscoverability | Requires source code access | Requires fuzzing | Obvious from UI |

**Risk Score = (D + R + E + A + D) / 5**

| Score | Risk Level | Response |
|-------|------------|----------|
| 1-3 | Low | Accept or mitigate in backlog |
| 4-6 | Medium | Mitigate before next release |
| 7-8 | High | Mitigate before merge |
| 9-10 | Critical | Stop and fix immediately |

## Security Review Approach

### OWASP Top 10 Coverage

Every security review should check for:

1. **A01: Broken Access Control** - Authorization bypass, IDOR, privilege escalation
2. **A02: Cryptographic Failures** - Weak algorithms, key exposure, plaintext transmission
3. **A03: Injection** - SQL, NoSQL, OS command, LDAP injection
4. **A04: Insecure Design** - Missing security controls, insecure patterns
5. **A05: Security Misconfiguration** - Default configs, verbose errors, missing headers
6. **A06: Vulnerable Components** - Outdated dependencies with known CVEs
7. **A07: Auth Failures** - Weak passwords, session issues, credential stuffing
8. **A08: Software Integrity** - Unsigned updates, CI/CD poisoning, dependency confusion
9. **A09: Logging Failures** - Missing logs, sensitive data in logs, no alerting
10. **A10: SSRF** - Server-side request forgery, internal service access

### Review Depth Levels

| Level | Time | Coverage | Use When |
|-------|------|----------|----------|
| Quick | 15 min | Automated scans + A01, A03, A06 | Low-risk changes |
| Standard | 1 hour | All OWASP categories, automated scans | Most PRs |
| Deep | 4+ hours | Full manual review, business logic, pentest-style | Auth changes, payment, sensitive data |

## Compliance Integration

### CMMC Mapping

Security workflows map to CMMC practices:

| Workflow | Primary CMMC Domains |
|----------|---------------------|
| ThreatModel | RA (Risk Assessment), SA (System Acquisition) |
| SecurityReview | SI (System Integrity), SA (Secure Development) |
| CmmcBaseline | All 17 domains |
| GenerateAudit | CA (Assessment), AU (Audit) |
| InfrastructureSecurity | SC (System/Comms), CM (Configuration), AC (Access) |

### Evidence Generation

Security activities generate compliance evidence:

| Activity | Evidence Type | CMMC Practice |
|----------|---------------|---------------|
| Threat model document | Risk assessment | RA.L2-3.11.1 |
| Dependency scan report | Vulnerability scan | RA.L2-3.11.2 |
| Code review findings | Security testing | SA.L2-3.13.3 |
| Secrets scan results | Credential protection | IA.L2-3.5.10 |

## Anti-Patterns to Avoid

### Security Theater
- Running scans but ignoring findings
- Checking boxes without understanding controls
- Security reviews without remediation follow-up

### Velocity Over Security
- Skipping security review for "urgent" features
- Accepting "we'll fix it later" for critical issues
- Disabling security controls for convenience

### Assumed Security
- "We're behind a firewall, so we're safe"
- "Only internal users access this"
- "The framework handles that"

### Single Point of Failure
- Relying solely on WAF for injection protection
- Authentication without authorization
- Perimeter security without internal controls

## Continuous Improvement

After each security incident or near-miss:

1. Conduct blameless post-mortem
2. Identify root cause and contributing factors
3. Update relevant workflows and checklists
4. Add detection patterns to knowledge base
5. Share learnings (sanitized) with team
