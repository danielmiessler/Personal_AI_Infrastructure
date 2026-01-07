# kai-devsecops-agents

DevSecOps Agent Pack for the Council Framework - a collection of specialized AI agents for software development team simulation.

## Metadata

```yaml
name: kai-devsecops-agents
version: 1.0.0
type: agent-pack
requires: kai-council-framework >= 1.0.0
author: PAI Community
license: MIT
```

## Overview

This pack provides 9 specialized agents that simulate a complete DevSecOps team. Each agent has a distinct role, expertise, personality, and decision-making framework. When orchestrated by the Council Framework, these agents provide multi-perspective analysis for technical decisions, code reviews, architecture discussions, and project planning.

## What's Included

### Agents (9)

| Agent | Role | Expertise | Veto Power |
|-------|------|-----------|------------|
| **Daniel** | Security Engineer | STRIDE, CMMC, OWASP Top 10, secure architecture | Yes (Critical vulns, CMMC blockers) |
| **Mary** | Business Analyst | Requirements, user research, business value, stakeholder management | No |
| **Clay** | Scrum Master | Sprint planning, velocity, impediment removal, agile ceremonies | No |
| **Hefley** | Test Architect | ATDD, risk-based testing, test automation, quality strategy | No |
| **Amy** | QA Lead | Test automation, Playwright/Cypress, testability, regression | Yes (Untestable designs, missing quality gates) |
| **Geoff** | Network Specialist | VLANs, firewalls, routing, UniFi, OpnSense, DNS | No |
| **Justin** | SRE | Monitoring, alerting, incident response, Prometheus, Grafana | No |
| **Rekha** | Project Manager | Agile methodology, backlog management, sprint planning, risk management | No |
| **Roger** | Platform Engineer | k3s, containers, CI/CD, ArgoCD, GitOps, Docker | No |

### Rosters (5)

Pre-configured team compositions for common scenarios:

| Roster | Agents | Use Case |
|--------|--------|----------|
| `full-team` | All 9 agents | Comprehensive review |
| `security-review` | Daniel, Clay, Amy, Geoff | Security-focused analysis |
| `architecture-review` | Clay, Daniel, Amy, Roger | System design review |
| `planning-estimation` | Clay, Hefley, Amy, Rekha | Timeline and capacity planning |
| `quick-review` | Clay, Hefley | Low-risk decisions, fast turnaround |

### Domain Mapping

Intelligent agent selection based on question context:

- **Security**: auth, vulnerability, CMMC, encryption, etc.
- **UX**: user experience, accessibility, user research
- **Planning**: timeline, estimate, sprint, velocity
- **Prioritization**: MVP, MoSCoW, scope, backlog
- **Testing**: coverage, E2E, ATDD, testability
- **Architecture**: design, API, microservice, scalability
- **Database**: schema, migration, SQL, data model
- **Compliance**: CMMC, GDPR, HIPAA, audit

## Installation

See [INSTALL.md](./INSTALL.md) for detailed installation instructions.

### Quick Start

```bash
# Copy to your PAI skills directory
cp -r kai-devsecops-agents/* $PAI_DIR/skills/Council/agents/

# Or symlink for development
ln -s $(pwd)/kai-devsecops-agents/Agents $PAI_DIR/skills/Council/agents
```

## Usage

### With Council Framework

```bash
# Use a specific roster
council summon --roster=security-review "Review this authentication implementation"

# Use automatic agent selection
council ask "How should we implement rate limiting on the API?"

# Full team review
council summon --roster=full-team "Review the Q1 roadmap"
```

### Agent Selection

The domain mapping automatically selects relevant agents based on question content:

- Security questions engage Daniel, Amy
- UX questions engage Mary, Amy
- Architecture questions engage Clay, Hefley, Daniel, Amy
- Planning questions engage Clay, Hefley, Amy

## Agent Capabilities

### Veto Power

Some agents have veto authority for their domain:

- **Daniel** can veto on CRITICAL vulnerabilities (CVSS >= 9.0) or CMMC blockers
- **Amy** can veto on untestable designs or missing quality gates

### Conflict Resolution

Each agent has a defined conflict stance that determines how they handle disagreements:

- **Collaborative**: Seeks consensus (Mary, Clay, Rekha)
- **Principled**: Holds firm on domain expertise (Daniel, Hefley, Amy)
- **Pragmatic**: Balances ideal with practical (Roger, Geoff, Justin)

## File Structure

```
kai-devsecops-agents/
├── README.md
├── INSTALL.md
├── DomainMapping.yaml
├── Agents/
│   ├── Daniel-SecurityEngineer.md
│   ├── Mary-BusinessAnalyst.md
│   ├── Clay-TechLead.md
│   ├── Hefley-ProductManager.md
│   ├── Amy-QaLead.md
│   ├── Geoff-NetworkSpecialist.md
│   ├── Justin-Sre.md
│   ├── Rekha-ProjectManager.md
│   └── Roger-PlatformEngineer.md
└── Rosters/
    ├── full-team.yaml
    ├── security-review.yaml
    ├── architecture-review.yaml
    ├── planning-estimation.yaml
    └── quick-review.yaml
```

## Integration with Other Packs

### kai-security-tools (Recommended)

When `kai-security-tools` is installed, Daniel (Security Engineer) can leverage automated scanning:

```bash
# Daniel can request these scans during security reviews:
bun run kai-security-tools/Tools/DependencyAudit.ts [path]  # CVE scanning
bun run kai-security-tools/Tools/SecretsScan.ts [path]      # Secrets detection
bun run kai-security-tools/Tools/SbomGenerator.ts [path]    # SBOM generation
```

**Benefits:**
- Concrete data informs Daniel's STRIDE analysis
- SBOM generation satisfies CMMC SA.L2-3.17.2 (supply chain)
- Critical/High findings trigger Daniel's veto power automatically

### kai-security-skill (Recommended)

When `kai-security-skill` is installed, Daniel can reference detailed CMMC knowledge:

```
Knowledge/cmmc/AC.md  → Access Control (22 practices)
Knowledge/cmmc/IA.md  → Identification & Auth (11 practices)
Knowledge/cmmc/SC.md  → System & Comms Protection (23 practices)
... and 14 more domains
```

**Benefits:**
- Daniel can cite specific CMMC practice IDs with full context
- Lazy loading keeps token usage efficient
- Complete 110-practice reference for compliance reviews

### Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Council Session                   │
├─────────────────────────────────────────────────────────────┤
│  1. kai-security-tools runs automated scans                  │
│     → DependencyAudit, SecretsScan, SbomGenerator           │
│                                                              │
│  2. Scan results fed to council context                      │
│     → Daniel receives CVEs, secrets findings, SBOM          │
│                                                              │
│  3. Daniel analyzes with kai-security-skill knowledge        │
│     → STRIDE threat modeling                                 │
│     → CMMC practice mapping (from Knowledge/cmmc/)          │
│                                                              │
│  4. Council synthesizes decision                             │
│     → Tool evidence + expert analysis = informed decision   │
└─────────────────────────────────────────────────────────────┘
```

---

## Customization

### Adding New Agents

1. Create a new file in `Agents/` following the naming convention: `{Name}-{Role}.md`
2. Include YAML frontmatter with required fields
3. Add the agent to relevant rosters
4. Update `DomainMapping.yaml` with expertise areas

### Modifying Rosters

Edit the roster YAML files to add/remove agents or create new presets.

### Adjusting Domain Mapping

Edit `DomainMapping.yaml` to:
- Add new keywords to existing domains
- Create new domains
- Adjust agent weights and selection rules

## Contributing

Contributions welcome! Please ensure:
- Agent personas are comprehensive and consistent
- No hardcoded personal data
- YAML frontmatter follows the established schema
- Documentation is updated

## License

MIT License - See LICENSE file for details.

---

**Pack Version**: 1.0.0
**Last Updated**: 2026-01-06
**Compatibility**: kai-council-framework >= 1.0.0
