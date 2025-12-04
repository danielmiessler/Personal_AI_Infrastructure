# Project Context: [Project Name]

**Last Updated**: [Date]
**Owner**: [Name/Team]
**Data Classification**: [Public | Internal | CUI | Classified]

---

## Data Classification

**Classification Level**: [Select one]
- **Public**: No sensitive information, can be shared publicly
- **Internal**: Internal use only, not publicly shareable
- **CUI (Controlled Unclassified Information)**: DoD contractor data, CMMC compliance required
- **Classified**: Government classified information (requires clearance)

**Classification Rationale**:
[Why is this project classified at this level? What sensitive data does it handle?]

**Data Handling Rules**:
- [Rule 1: e.g., "CUI data must not be shared with Public projects"]
- [Rule 2: e.g., "All standup decisions must be stored in encrypted project-context.md"]
- [Rule 3: e.g., "Cross-project references allowed only at same or lower classification level"]

**CMMC Practices** (if CUI):
- AC.L2-3.1.20: Control CUI posted on publicly accessible systems
- MP.L2-3.8.4: Mark media with necessary CUI markings

---

## Project Overview

**Project Name**: [Name]
**Purpose**: [What problem does this solve?]
**Target Users**: [Who will use this?]
**Success Metrics**: [How do we measure success?]

---

## System Architecture

**Components**:
- [Component 1]: [Description]
- [Component 2]: [Description]

**Data Classification by Component**:
| Component | Data Handled | Classification | Notes |
|-----------|--------------|----------------|-------|
| [Component 1] | [Data type] | [Public/Internal/CUI] | [Security notes] |
| [Component 2] | [Data type] | [Public/Internal/CUI] | [Security notes] |

**Data Flows**:
```
[User] → [Component 1] → [Component 2]
         (CUI data)      (CUI data stored)
```

**Trust Boundaries**:
- Boundary 1: [External → DMZ] (Public → Internal)
- Boundary 2: [DMZ → Internal] (Internal → CUI)

---

## Technology Stack

**Languages**: [List]
**Frameworks**: [List]
**Infrastructure**: [AWS/Azure/GCP/On-prem]
**Data Storage**: [Database type, encryption at rest]

**Security Controls**:
- Authentication: [Method - e.g., OAuth2, SAML]
- Authorization: [RBAC, ABAC]
- Encryption in Transit: [TLS 1.2+]
- Encryption at Rest: [AES-256, KMS]

---

## Key Decisions & Rationale

### Decision: [Title] (YYYY-MM-DD)
**Decision**: [One-line summary]
**Classification Impact**: [Does this decision affect data classification?]
**Rationale**: [Why this choice?]
**Participants**: [Agents or people who made decision]
**Trade-offs**: [What we gained vs what we deferred]
**Owner**: [Who owns implementation]
**Status**: [Approved | In Progress | Complete]

---

## Success Metrics

**Quantitative**:
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

**Qualitative**:
- [Goal 1]
- [Goal 2]

---

## Constraints

**Timeline**: [Deadline]
**Budget**: [If applicable]
**Technical**: [Technology limitations]
**Regulatory**: [CMMC, HIPAA, PCI-DSS, etc.]
**Data Classification**: [What classification constraints exist?]

---

## Current Epics (Backlog)

**Epic 1**: [Title]
- Status: [Not Started | In Progress | Complete]
- Story Points: [Total]
- Priority: [Must Have | Should Have | Could Have | Won't Have]
- Classification: [Does this epic handle CUI?]

---

## Cross-Project References

**Projects Referenced**:
| Project Name | Classification | Reference Type | Allowed? |
|--------------|----------------|----------------|----------|
| [Project A] | Public | Architecture pattern | ✅ Yes (lower classification) |
| [Project B] | CUI | Shared library | ✅ Yes (same classification) |
| [Project C] | Internal | Lessons learned | ✅ Yes (lower classification) |

**Reference Rules**:
- ✅ Can reference projects at **same or lower** classification level
- ❌ Cannot reference projects at **higher** classification level
- ✅ Architectural patterns and lessons learned are shareable (sanitize CUI details)
- ❌ CUI data (architecture details, decisions, code) cannot be shared with Public/Internal projects

**Audit Trail**:
- All cross-project references logged in standup-audit.log
- Quarterly review of cross-project references for classification violations

---

## CUI Marking (if applicable)

**CUI Category**: [Select if applicable]
- CUI//SP-CTI: Controlled Technical Information (export-controlled technical data)
- CUI//SP-PRVCY: Privacy Information
- CUI//SP-PROPIN: Proprietary Business Information

**CUI Dissemination Controls**: [e.g., "FED ONLY", "NO FORN"]

**CUI Marking Example**:
```
CUI//SP-CTI

[This section contains Controlled Technical Information]

CUI//SP-CTI
```

---

## Audit Log

**Data Access Events**:
| Date | User/Agent | Action | Classification | Notes |
|------|------------|--------|----------------|-------|
| [Date] | [Agent] | Read project-context.md | CUI | Standup session |
| [Date] | [Agent] | Referenced Project B | CUI | Cross-project reference (allowed) |

**Classification Changes**:
| Date | From | To | Rationale | Approver |
|------|------|-----|-----------|----------|
| [Date] | Internal | CUI | Project now handles DoD data | [Name] |

---

## Compliance Checklist (for CUI projects)

**CMMC AC.L2-3.1.20**: Control CUI posted on publicly accessible systems
- [ ] Project-context.md not committed to public GitHub repo
- [ ] CUI data marked with classification banners
- [ ] Access restricted to authorized personnel only

**CMMC MP.L2-3.8.4**: Mark media with necessary CUI markings
- [ ] All CUI sections marked with CUI banners
- [ ] Distribution limitations documented
- [ ] CUI category specified (SP-CTI, SP-PRVCY, etc.)

**CMMC AU.L2-3.3.1**: Create and retain audit records
- [ ] Data access logged in audit trail
- [ ] Cross-project references audited
- [ ] Classification changes documented

---

**Project Classification**: [Public | Internal | CUI | Classified]
**Last Classification Review**: [Date]
**Next Review**: [Date] (Quarterly)
**Approved By**: [Name/Role]

---

## Classification Legend

| Level | Description | Examples | Cross-Project Sharing |
|-------|-------------|----------|----------------------|
| **Public** | No sensitive data | Open source projects, marketing sites | ✅ Shareable with all projects |
| **Internal** | Company confidential | Internal tools, employee data | ✅ Shareable with Internal/Public projects |
| **CUI** | DoD contractor data | Defense projects, export-controlled tech | ⚠️ Shareable only with CUI projects |
| **Classified** | Government classified | Secret/Top Secret projects | ❌ No cross-project sharing |

---

**Template Version**: 1.0 (Classification-Aware)
**Last Updated**: 2025-12-02
**CMMC Practices**: AC.L2-3.1.20, MP.L2-3.8.4, AU.L2-3.3.1
