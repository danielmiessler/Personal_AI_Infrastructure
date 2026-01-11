---
name: PAI OSINT Skill
pack-id: pai-osint-skill-v1.1.0
version: 1.1.0
author: pai
description: AI-powered Open Source Intelligence collection and analysis with knowledge graph integration
type: skill
purpose-type: [intelligence, reconnaissance, investigation, analysis]
platform: claude-code
dependencies: [pai-browser-skill, pai-knowledge-system]
keywords: [osint, intelligence, reconnaissance, investigation, social-media, domain-analysis, geolocation, company-research, due-diligence, corporate-intelligence, competitor-analysis]
---

<p align="center">
  <img src="../icons/pai-osint-skill.png" alt="PAI OSINT Skill" width="256">
</p>

# PAI OSINT Skill v1.1.0

> AI-powered Open Source Intelligence collection and analysis with knowledge graph integration

---

## Quick Navigation

**Getting Started:**
- [Installation Guide](INSTALL.md) - Step-by-step installation wizard
- [Verification Checklist](VERIFY.md) - Post-installation validation

**Documentation:**
- [User Guide](docs/USER_GUIDE.md) - Complete usage documentation
- [Quick Reference](docs/QUICK_REFERENCE.md) - Command cheat sheet
- [Company Research Guide](docs/COMPANY_RESEARCH.md) - Business intelligence workflows

**Advanced:**
- [Image Analysis Tools](docs/IMAGE_ANALYSIS_TOOLS.md) - Tool requirements and setup
- [Enrichment Roadmap](docs/ENRICHMENT_ROADMAP.md) - API integration guide

**By Workflow Type:**
- **Person Investigation:** Username enumeration, social media, entity linking
- **Domain Intelligence:** DNS, WHOIS, subdomains, infrastructure mapping
- **Company Research:** Corporate profiles, ownership, financials, risk assessment
- **Digital Artifacts:** Email, phone, and image analysis

---

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack transforms your AI into an intelligence-gathering platform. The PAI OSINT Skill provides comprehensive workflows for:

- **Person Investigation** - Username enumeration, social media capture, entity linking
- **Domain Intelligence** - DNS, WHOIS, certificate transparency, subdomain discovery
- **Company Research** - Corporate profiles, ownership tracing, financial analysis, risk assessment
- **Knowledge Persistence** - All findings stored to knowledge graph via the **knowledge** skill

**Core principle:** Systematic collection, intelligent analysis, persistent storage.

No more scattered notes across sessions. Your investigations build on each other through the knowledge graph.

Please follow the installation instructions in `INSTALL.md` to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| OSINT Skill Definition | `skills/osint/SKILL.md` | Intent routing and workflow dispatch |
| Username Reconnaissance | `Workflows/UsernameRecon.md` | Enumerate usernames across 400+ platforms |
| Domain Reconnaissance | `Workflows/DomainRecon.md` | DNS, WHOIS, CT logs, subdomains |
| Social Media Capture | `Workflows/SocialCapture.md` | Profile capture to knowledge graph |
| Infrastructure Mapping | `Workflows/InfraMapping.md` | Port scanning, service fingerprinting |
| Entity Linking | `Workflows/EntityLinking.md` | Cross-source identity resolution |
| Timeline Analysis | `Workflows/TimelineAnalysis.md` | Temporal pattern detection |
| Target Profile | `Workflows/TargetProfile.md` | Comprehensive target investigation |
| Intel Report | `Workflows/IntelReport.md` | Structured intelligence reports |
| Company Profile | `Workflows/CompanyProfile.md` | Comprehensive company investigation |
| Corporate Structure | `Workflows/CorporateStructure.md` | Ownership, subsidiaries, directors |
| Financial Recon | `Workflows/FinancialRecon.md` | SEC filings, funding, investors |
| Competitor Analysis | `Workflows/CompetitorAnalysis.md` | Market position, SWOT analysis |
| Risk Assessment | `Workflows/RiskAssessment.md` | Litigation, sanctions, due diligence |
| Email Reconnaissance | `Workflows/EmailRecon.md` | Email investigation, breach checking |
| Phone Reconnaissance | `Workflows/PhoneRecon.md` | Phone number lookup, validation |
| Image Reconnaissance | `Workflows/ImageRecon.md` | Image metadata, forensics, reverse search |

**Summary:**
- **Files created:** 17 (1 skill + 16 workflows)
- **Directories created:** 2 (`skills/osint/Workflows/`, `history/research/osint/`)
- **Dependencies:** pai-browser-skill (recommended), pai-knowledge-system (required)

---

## The Concept and/or Problem

Open Source Intelligence (OSINT) investigations suffer from fragmentation:

**For Individual Targets:**
- Usernames scattered across 400+ platforms with no systematic enumeration
- Social media profiles captured ad-hoc, never correlated
- Timeline patterns invisible without structured analysis
- Identity links between accounts discovered by accident, not method

**For Company Research:**
- Corporate structures buried in registries across jurisdictions
- Beneficial ownership hidden behind shell companies
- Financial data scattered across SEC filings, funding databases, news
- Risk signals (litigation, sanctions, adverse media) require multiple searches

**For Intelligence Operations:**
- Each investigation starts from scratch with no institutional memory
- Findings stored in notes that can't be queried
- Relationships between entities discovered once, then forgotten
- No systematic methodology leads to inconsistent results

**The Fundamental Problem:**

Traditional OSINT is manual, fragmented, and ephemeral. Investigators repeat work, miss connections, and lose findings between sessions. There's no accumulation of intelligence over time.

---

## The Solution

The PAI OSINT Skill provides **structured, persistent, knowledge-graph-backed intelligence collection**.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAI OSINT Skill                              │
│            AI-Powered Open Source Intelligence Collection            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  osint skill    │    │  browser skill  │    │ knowledge skill │
│                 │    │  (Dependency)   │    │  (Dependency)   │
│ • Intent Router │    │                 │    │                 │
│ • 16 Workflows  │    │ • Playwright    │    │ • Entity Store  │
│ • Agents        │    │ • Session Mgmt  │    │ • Relationships │
│                 │    │ • Screenshots   │    │ • Graph Queries │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │   Dual Storage System   │
                    │                         │
                    │ • Knowledge Graph       │
                    │   (queryable, linked)   │
                    │                         │
                    │ • File Reports          │
                    │   (human-readable)      │
                    └─────────────────────────┘
```

**The Intelligence Cycle:**

Each workflow follows a consistent 5-step pattern:

1. **Planning** - Define scope, legal/ethical boundaries, OPSEC
2. **Collection** - Systematic acquisition from public sources
3. **Processing** - Normalizing, enriching, correlating data
4. **Analysis** - Identifying patterns, relationships, risk
5. **Storage** - Persist to knowledge graph AND file reports

**Design Principles:**

1. **Workflow-Driven**: 16 specialized workflows for different intelligence tasks
2. **Knowledge-First**: Every workflow stores to knowledge graph via the **knowledge** skill
3. **Dual Storage**: Both queryable graph AND human-readable file reports
4. **Ethical by Design**: Legal considerations built into every workflow
5. **Progressive Enhancement**: Works without dependencies, better with them

---

## What Makes This Different

The OSINT System has 3 architectural layers:

1. **Intent Routing (SKILL.md)** - Triggers map natural language to workflows
2. **Workflow Execution (Workflows/)** - Structured steps with knowledge persistence
3. **Knowledge Storage (knowledge skill)** - Entities and relationships in graph

```
User: "investigate company Acme Corp"
         │
         ▼
┌─────────────────────────┐
│ SKILL.md Intent Router  │
│ Match: "company" trigger│
│ Route: CompanyProfile   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ CompanyProfile.md       │
│ Step 1: Registry search │
│ Step 2: Ownership trace │
│ Step 3: Financial data  │
│ Step 4: Risk assessment │
│ Step 5: Store to graph  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ knowledge skill         │
│ Episode: Company Acme   │
│ Group: osint-companies  │
│ Relationships mapped    │
└─────────────────────────┘
```

**Why This Architecture Matters:**

- **Explicit Routing**: Intent → Workflow → Storage, not fuzzy matching
- **Persistent Memory**: Every investigation adds to the knowledge graph
- **Cross-Investigation Linking**: Entity discovered in one workflow appears in future searches
- **Audit Trail**: Full methodology documented for each collection

---

## Why This Is Different

This sounds similar to using search engines manually which also finds public information. What makes this approach different?

The OSINT System transforms ad-hoc searching into systematic intelligence collection. Each workflow follows a repeatable methodology, stores findings to a queryable knowledge graph, and builds institutional memory across investigations. Future queries automatically surface past findings.

- Structured workflows replace random searching with methodology
- Knowledge graph stores entities and relationships permanently
- Cross-investigation linking surfaces connections automatically
- Dual storage provides both queryable and human-readable outputs

---

## Installation

See `INSTALL.md` for step-by-step wizard-style installation.

**Quick Install:**
1. Run the analysis commands to check prerequisites
2. Answer questions about your OSINT needs
3. Copy skill files to `$PAI_DIR/skills/osint/`
4. Verify with `VERIFY.md` checklist

---

## Invocation Scenarios

The OSINT system triggers on natural language or `/osint` commands:

| Trigger | Workflow | Description |
|---------|----------|-------------|
| "find accounts for username X" | UsernameRecon | Enumerate across platforms |
| "investigate domain X" | DomainRecon | DNS, WHOIS, CT logs |
| "capture social profile for @X" | SocialCapture | Store profile to graph |
| "map infrastructure for X" | InfraMapping | Port scan, fingerprint |
| "link entities X and Y" | EntityLinking | Cross-reference identities |
| "analyze timeline for X" | TimelineAnalysis | Temporal patterns |
| "full profile for X" | TargetProfile | Comprehensive investigation |
| "generate report for X" | IntelReport | Structured output |
| "company profile X" | CompanyProfile | Business investigation |
| "corporate structure X" | CorporateStructure | Ownership tracing |
| "financials for X" | FinancialRecon | SEC filings, funding |
| "competitors of X" | CompetitorAnalysis | Market landscape |
| "risk assessment X" | RiskAssessment | Due diligence |
| "email lookup X" | EmailRecon | Email investigation, breach check |
| "phone lookup X" | PhoneRecon | Phone number validation |
| "analyze image X" | ImageRecon | Image metadata, forensics |

---

## Example Usage

### Example 1: Username Reconnaissance

```
User: "Find all accounts for username johndoe"

System executes UsernameRecon workflow:
1. Searches 400+ platforms for "johndoe"
2. Validates discovered accounts
3. Extracts profile metadata
4. Stores to knowledge graph (group: osint-usernames)
5. Saves report to $PAI_DIR/history/research/osint/

Output: Found 15 accounts, stored to knowledge graph
```

### Example 2: Company Due Diligence

```
User: "Do a risk assessment on Vendor LLC"

System executes RiskAssessment workflow:
1. Searches litigation databases (PACER, state courts)
2. Checks sanctions lists (OFAC, EU, UK)
3. Scans adverse media
4. Reviews regulatory filings
5. Stores findings to knowledge graph (group: osint-risk)

Output: Risk profile generated with 3 litigation cases identified
```

### Example 3: Full Target Investigation

```
User: "Full profile for target johndoe scope comprehensive"

System executes TargetProfile workflow:
1. Runs UsernameRecon
2. Runs DomainRecon (if domains found)
3. Runs SocialCapture
4. Runs EntityLinking
5. Runs TimelineAnalysis
6. Generates consolidated report
7. Stores complete profile to knowledge graph

Output: Comprehensive dossier with 23 entities, 45 relationships
```

---

## Configuration

**Environment Variables:**

**Option 1: `.env` file** (recommended):
```bash
# $PAI_DIR/.env
PAI_DIR="$HOME/.claude"

# Optional API keys for enhanced capabilities
SHODAN_API_KEY="your_key_here"
SECURITYTRAILS_API_KEY="your_key_here"
HUNTER_API_KEY="your_key_here"
```

**Option 2: Shell profile**:
```bash
# Add to ~/.zshrc or ~/.bashrc
export PAI_DIR="$HOME/.claude"
```

---

## Customization

### Recommended Customization

**What to Customize:** Create investigation templates for your common use cases

**Why:** Pre-configured investigation parameters speed up repeated tasks

**Process:**
1. Identify your most common OSINT tasks
2. Create custom workflow variations in `$PAI_DIR/skills/osint/Workflows/`
3. Add trigger phrases to SKILL.md

**Expected Outcome:** One-command investigations for your standard cases

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Add API keys | `$PAI_DIR/.env` | Enhanced data sources |
| Custom report templates | `Workflows/IntelReport.md` | Branded output format |
| Investigation categories | `history/research/osint/` | Organized by case type |

---

## Dependencies

- **browser skill** - Browser automation for web scraping (recommended)
  - Without this: Limited web scraping, some workflows will fail
- **knowledge skill** - Knowledge graph for entity storage (required)
  - Without this: Findings stored to files only, no cross-investigation linking

**Required:** pai-knowledge-system for knowledge graph persistence
**Recommended:** pai-browser-skill for JavaScript-heavy sites and authentication

---

## Documentation

See `docs/` directory for detailed user guides:

- `docs/USER_GUIDE.md` - Complete usage documentation
- `docs/COMPANY_RESEARCH.md` - Business intelligence workflows
- `docs/QUICK_REFERENCE.md` - Command cheat sheet

---

## Legal & Ethical Considerations

**IMPORTANT:** This system is designed for authorized investigations only.

- Only collect publicly available information
- Respect privacy laws and platform ToS
- Maintain operational security (OPSEC)
- Document collection methods for audit trails
- Never use for harassment or unauthorized surveillance

---

## Credits

- **Original concept**: Developed as part of PAI personal AI infrastructure
- **Methodology**: Based on standard OSINT intelligence cycle practices
- **Inspired by**: Sherlock, theHarvester, Maltego, and professional OSINT frameworks

---

## Works Well With

- **pai-browser-skill** - Required for JavaScript-heavy sites and authentication
- **pai-knowledge-system** - Required for knowledge graph persistence
- **pai-history-system** - Automatically captures investigation sessions

---

## Changelog

### v1.1.0 (January 2026)
- **NEW: Company & Business Research Module**
  - CompanyProfile: Comprehensive company investigation dossiers
  - CorporateStructure: Ownership hierarchy, subsidiaries, directors
  - FinancialRecon: SEC filings, funding history, investor analysis
  - CompetitorAnalysis: Market positioning, SWOT, competitive landscape
  - RiskAssessment: Litigation, sanctions, adverse media, due diligence
- **NEW: Digital Artifact Analysis Module**
  - EmailRecon: Email address investigation and breach checking
  - PhoneRecon: Phone number lookup and validation
  - ImageRecon: Image metadata, forensics, and reverse search
- Added explicit **knowledge** skill integration to all 16 workflows
- Changed skill name to lowercase `osint` per PAI conventions
- Added user documentation under `docs/`
- Updated VERIFY.md with comprehensive checks

### v1.0.0 (January 2026)
- Initial release
- 8 core workflows
- Browser skill integration
- Knowledge skill integration
- Username enumeration (400+ platforms)
- Domain reconnaissance
- Social media capture
- Intelligence reporting
