# mai-security-skill

Security workflows and knowledge for the KAI (Knowledge AI) framework. This pack provides threat modeling, OWASP-based code review, CMMC compliance mapping, and infrastructure security auditing.

## Overview

This skill implements **shift-left security** - integrating security practices early in the development lifecycle rather than treating security as a final gate. By identifying risks during design and catching vulnerabilities during development, teams can address security issues when they're cheapest to fix.

## Installation

This pack is part of the Personal AI Infrastructure (PAI) system. Install via:

```bash
# From PAI root
./scripts/install-pack.sh mai-security-skill
```

## Dependencies

This skill requires **mai-security-tools** for automated scanning capabilities:

```yaml
depends_on:
  - mai-security-tools
```

The tools pack provides:
- Dependency vulnerability scanning
- Secrets detection
- Static analysis (SAST)
- Container image scanning

## Workflows

| Workflow | Purpose | Key Output |
|----------|---------|------------|
| ThreatModel | STRIDE threat modeling with DREAD ratings | threat-model.md |
| SecurityReview | OWASP Top 10 code security review | security-report.md |
| CmmcBaseline | CMMC Level 2 compliance mapping | Gap analysis + roadmap |
| GenerateAudit | Compile audit evidence packages | Audit documentation |
| InfrastructureSecurity | Cloud/IaC security review | Infrastructure findings |

## Knowledge Base

- **CMMC-INDEX.md** - Table of contents for CMMC 2.0 Level 2 (110 practices, 17 domains)
- **owasp-patterns.md** - OWASP Top 10 2021 with detection patterns and remediation
- **cmmc/** - Individual domain detail files (lazy-loaded)

## Recommended Workflow Sequence

```
PRD/Design → ThreatModel → CmmcBaseline → Implementation → SecurityReview → GenerateAudit
     │            │             │               │                │              │
     ▼            ▼             ▼               ▼                ▼              ▼
  Define       Identify      Map to         Secure           Validate       Document
  scope        risks       compliance       coding           security       evidence
```

## Usage Examples

### Threat Model a System
```
> Create a threat model for the user authentication service

[Loads Workflows/ThreatModel.md]
- Decomposes system into components
- Identifies trust boundaries
- Applies STRIDE methodology
- Rates risks with DREAD
- Outputs completed threat model
```

### Security Review Code
```
> Run a security review on src/api/

[Loads Workflows/SecurityReview.md]
- Runs automated scans (dependencies, secrets)
- Applies OWASP Top 10 checklist
- Identifies vulnerabilities by category
- Generates remediation plan
```

### CMMC Compliance Check
```
> What CMMC practices apply to our data processing pipeline?

[Loads Workflows/CmmcBaseline.md]
- Identifies applicable domains
- Maps current state to practices
- Highlights gaps
- Creates remediation roadmap
```

## File Structure

```
mai-security-skill/
├── SKILL.md              # Skill definition and routing
├── README.md             # This file
├── METHODOLOGY.md        # Security principles and approach
├── package.json          # Pack metadata
├── Workflows/
│   ├── ThreatModel.md
│   ├── SecurityReview.md
│   ├── CmmcBaseline.md
│   ├── GenerateAudit.md
│   └── InfrastructureSecurity.md
├── Knowledge/
│   ├── CMMC-INDEX.md     # CMMC domain table of contents
│   ├── owasp-patterns.md # OWASP Top 10 reference
│   └── cmmc/             # Individual domain details
└── Templates/
    ├── threat-model.md   # Threat model document template
    └── security-report.md # Security review report template
```

## Contributing

When adding new security content:

1. **Workflows** should follow the standard format with Input, Output, Steps sections
2. **Knowledge** files should support lazy loading (index + detail files)
3. **Templates** should be production-ready with all necessary sections
4. Update SKILL.md routing table for new workflows

## License

Part of Personal AI Infrastructure (PAI). See repository root for license.
