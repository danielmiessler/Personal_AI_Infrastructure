# CMMC Baseline Workflow

Map project to CMMC Level 2 requirements and identify compliance gaps.

## Overview

| Attribute | Value |
|-----------|-------|
| **Purpose** | Assess CMMC Level 2 compliance and create remediation roadmap |
| **Input** | Project scope, architecture documentation, current security controls |
| **Output** | CMMC baseline document with gap analysis and remediation plan |
| **Duration** | 2-4 hours for initial assessment, ongoing for tracking |

## Background

### What is CMMC?

Cybersecurity Maturity Model Certification (CMMC) 2.0 is the Department of Defense's framework for protecting Controlled Unclassified Information (CUI) in the Defense Industrial Base (DIB).

| Level | Name | Practices | Assessment |
|-------|------|-----------|------------|
| Level 1 | Foundational | 17 (FCI protection) | Self-assessment |
| Level 2 | Advanced | 110 (NIST 800-171) | Third-party or self |
| Level 3 | Expert | 110+ additional | Government-led |

This workflow focuses on **Level 2** - the most common requirement for DoD contractors handling CUI.

### When to Use

- Pursuing DoD contracts requiring CMMC
- Handling Controlled Unclassified Information (CUI)
- Subcontracting to prime contractors with CMMC requirements
- Preparing for CMMC assessment
- General security posture improvement using a recognized framework

## Workflow Steps

### Step 1: Define Scope

Identify what systems and data are in scope:

**CUI Boundary Questions:**
1. What CUI does the project handle?
2. Where is CUI stored, processed, and transmitted?
3. What systems touch CUI directly or indirectly?
4. Who has access to CUI?
5. What third parties receive or process CUI?

**Document:**
- System boundary diagram
- CUI flow map
- Personnel with CUI access
- Third-party dependencies

### Step 2: Identify Applicable Domains

Reference [Knowledge/CMMC-INDEX.md](../Knowledge/CMMC-INDEX.md) to identify relevant domains.

**Domain Selection Guide:**

| If the project... | Primary Domains |
|-------------------|-----------------|
| Has user accounts | AC, IA |
| Stores sensitive data | SC, MP |
| Processes data | SI, CM |
| Has logging requirements | AU |
| Uses cloud services | SC, AC, SA |
| Has remote access | AC, IA, SC |
| Trains users | AT |
| Handles incidents | IR |
| Has physical presence | PE |
| Uses contractors | PS, SA |

For most software projects, these domains are essential:
- **AC** - Access Control
- **AU** - Audit & Accountability
- **CM** - Configuration Management
- **IA** - Identification & Authentication
- **SC** - System & Communications Protection
- **SI** - System & Information Integrity

### Step 3: Load Domain Details

For each applicable domain, load specific practice requirements:

```
Request: "Load CMMC domain AC"
```

This loads `Knowledge/cmmc/AC.md` with detailed practices.

Document current implementation status for each practice:

| Status | Meaning |
|--------|---------|
| **Implemented** | Fully meets requirement with evidence |
| **Partial** | Some controls in place, gaps exist |
| **Planned** | Not implemented but scheduled |
| **Not Applicable** | Justified exclusion from scope |
| **Gap** | Not implemented, needs remediation |

### Step 4: Map Current State

For each practice, document:

1. **Practice ID and Name** - e.g., AC.L2-3.1.1 Authorized Access
2. **Requirement Summary** - What the practice requires
3. **Current Implementation** - How (or if) you meet it today
4. **Evidence** - Documentation proving implementation
5. **Status** - Implemented / Partial / Gap / N/A
6. **Gap Description** - What's missing (if applicable)

**Example Mapping:**

| Practice | Requirement | Current State | Status | Gap |
|----------|-------------|---------------|--------|-----|
| AC.L2-3.1.1 | Limit access to authorized users | RBAC in application | Partial | No periodic access review |
| AC.L2-3.1.2 | Limit access to authorized functions | Function-level authz | Implemented | - |
| AC.L2-3.1.3 | Control CUI flow | No flow controls | Gap | Need network segmentation |

### Step 5: Gap Analysis

Compile gaps by priority:

**Priority Factors:**
- Risk if exploited (high/medium/low)
- Effort to remediate (low/medium/high)
- Dependencies on other gaps
- Assessment timeline

**Prioritization Matrix:**

|  | Low Effort | High Effort |
|--|------------|-------------|
| **High Risk** | Priority 1: Do Now | Priority 2: Plan Carefully |
| **Low Risk** | Priority 3: Quick Win | Priority 4: Backlog |

### Step 6: Create Remediation Roadmap

For each gap:

1. **Remediation Action** - Specific steps to close the gap
2. **Owner** - Person responsible
3. **Resources Needed** - Tools, budget, time
4. **Target Date** - When it should be complete
5. **Verification** - How to prove it's done
6. **Evidence Artifacts** - What documents to create

**Roadmap Format:**

| Gap | Action | Owner | Target | Verification |
|-----|--------|-------|--------|--------------|
| AC.L2-3.1.3 | Implement network segmentation | NetOps | Q2 2024 | Network diagram, firewall rules |
| AU.L2-3.3.1 | Deploy centralized logging | DevOps | Q1 2024 | Log aggregator config, sample logs |

### Step 7: Prepare for Assessment

**Self-Assessment (Level 2):**
1. Complete SSP (System Security Plan)
2. Document POA&M (Plan of Action & Milestones)
3. Gather evidence for each practice
4. Score using NIST 800-171 methodology
5. Submit score to SPRS

**Third-Party Assessment (Level 2 for critical CUI):**
1. All self-assessment items
2. Engage C3PAO (CMMC Third-Party Assessment Organization)
3. Pre-assessment readiness review
4. Formal assessment
5. Remediation of findings
6. Certification

## Domain Quick Reference

See [Knowledge/CMMC-INDEX.md](../Knowledge/CMMC-INDEX.md) for complete index.

**Most Common Gaps:**

| Domain | Common Gap | Typical Remediation |
|--------|------------|---------------------|
| AC | No access reviews | Implement quarterly reviews |
| AU | Incomplete logging | Deploy SIEM, define events |
| CM | No baseline configs | Create and enforce baselines |
| IA | Weak MFA | Deploy phishing-resistant MFA |
| SC | No encryption at rest | Enable storage encryption |
| SI | No vulnerability scanning | Implement regular scans |

## Output Artifacts

This workflow produces:

1. **Scope Document**
   - CUI boundary definition
   - System inventory in scope
   - Data flow diagrams

2. **Baseline Assessment**
   - Practice-by-practice status
   - Evidence inventory
   - Gap summary

3. **Remediation Roadmap**
   - Prioritized gap list
   - Action items with owners
   - Timeline and milestones

4. **POA&M (Plan of Action & Milestones)**
   - Formal tracking document
   - Required for assessment

## Integration with Other Workflows

| Workflow | Integration Point |
|----------|-------------------|
| ThreatModel | Map threats to CMMC practices |
| SecurityReview | Findings may indicate CMMC gaps |
| GenerateAudit | Compile CMMC evidence package |
| InfrastructureSecurity | Assess SC, CM, AC controls |

## Example

**Project:** Cloud-based document management handling DoD CUI

**Scope:**
- AWS infrastructure (3 VPCs)
- Web application and API
- PostgreSQL database
- 15 users with CUI access

**Applicable Domains:** AC, AT, AU, CA, CM, IA, IR, SC, SI

**Sample Gap Analysis:**

| Practice | Gap | Priority | Remediation |
|----------|-----|----------|-------------|
| AC.L2-3.1.3 | No VPC flow enforcement | P1 | Implement security groups, NACLs |
| AU.L2-3.3.1 | CloudTrail only, no app logs | P1 | Deploy CloudWatch with app logging |
| IA.L2-3.5.3 | MFA optional | P1 | Enforce MFA for all users |
| SC.L2-3.13.8 | TLS 1.0/1.1 still enabled | P2 | Enforce TLS 1.2+ only |
| SI.L2-3.14.1 | No automated vulnerability scans | P2 | Deploy AWS Inspector + Dependabot |

**Remediation Timeline:**
- Month 1: P1 gaps (AC.L2-3.1.3, AU.L2-3.3.1, IA.L2-3.5.3)
- Month 2: P2 gaps (SC.L2-3.13.8, SI.L2-3.14.1)
- Month 3: Evidence collection and documentation
- Month 4: Self-assessment and SPRS submission
