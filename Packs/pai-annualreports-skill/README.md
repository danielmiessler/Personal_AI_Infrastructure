---
name: PAI Annual Reports Skill
pack-id: danielmiessler-pai-annualreports-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Annual security report aggregation and analysis with 570+ sources from the cybersecurity industry. Fetch, search, and analyze threat intelligence, surveys, and vendor reports from CrowdStrike, Microsoft, Verizon, IBM, Mandiant, and hundreds more.
type: skill
purpose-type: [security, research, intelligence, analysis]
platform: claude-code
dependencies:
  - pai-core-install (required) - Skill system for routing
keywords: [security, reports, threat-intelligence, research, analysis, annual-reports, vendor-reports, ransomware, data-breaches, cloud-security, vulnerability, DBIR, survey]
---

<p align="center">
  <img src="../icons/pai-annualreports-skill.png" alt="PAI Annual Reports Skill" width="256">
</p>

# PAI Annual Reports Skill (pai-annualreports-skill)

> Aggregate and analyze 570+ annual security reports from across the cybersecurity industry - threat intelligence, surveys, vulnerability research, and vendor reports in one searchable system.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`.

---

## What This Pack Provides

**Complete Security Report Aggregation:**
- **570+ Report Sources** - CrowdStrike, Microsoft, IBM, Mandiant, Verizon, and hundreds more
- **Analysis Reports** - Global threat intelligence, regional assessments, sector-specific intel
- **Survey Reports** - Industry trends, executive perspectives, workforce studies
- **Categorized Access** - 20+ categories across analysis and survey types

**Three Core Tools:**
- **ListSources.ts** - Browse and search all report sources by category or vendor
- **UpdateSources.ts** - Fetch latest sources from upstream GitHub repository
- **FetchReport.ts** - Download and summarize specific reports

**Workflow Integration:**
- UPDATE workflow - Sync with upstream source repository
- ANALYZE workflow - Cross-vendor trend analysis
- FETCH workflow - Download specific reports on demand

---

## Architecture Overview

```
                     ┌─────────────────────────────────────────┐
                     │        AnnualReports Skill               │
                     │                                          │
                     │  ┌─────────────────────────────────┐     │
                     │  │          SKILL.md               │     │
                     │  │   Intent routing + triggers     │     │
                     │  └───────────────┬─────────────────┘     │
                     │                  │                        │
                     │  ┌───────────────┼───────────────────┐   │
                     │  │               │                   │   │
                     │  ▼               ▼                   ▼   │
                     │ UPDATE        ANALYZE            FETCH   │
                     │ Workflow      Workflow          Workflow │
                     │  │               │                   │   │
                     │  │               │                   │   │
                     │  └───────┬───────┴───────┬───────────┘   │
                     │          │               │               │
                     │          ▼               ▼               │
                     │  ┌─────────────┐   ┌──────────────┐     │
                     │  │   Tools/    │   │    Data/     │     │
                     │  │             │   │              │     │
                     │  │ ListSources │   │ sources.json │     │
                     │  │ UpdateSrc   │   │ (570+ URLs)  │     │
                     │  │ FetchReport │   │              │     │
                     │  └─────────────┘   └──────────────┘     │
                     │                                          │
                     └─────────────────────────────────────────┘
                                        │
                                        ▼
                     ┌─────────────────────────────────────────┐
                     │    awesome-annual-security-reports      │
                     │         (GitHub upstream)               │
                     │     570+ curated report sources         │
                     └─────────────────────────────────────────┘
```

---

## Report Categories

### Analysis Reports (165+ reports)

| Category | Count | Major Vendors |
|----------|-------|---------------|
| Global Threat Intelligence | 56 | CrowdStrike, Microsoft, IBM, Mandiant |
| Regional Assessments | 11 | FBI, CISA, Europol, NCSC |
| Sector Specific Intelligence | 13 | Healthcare, Finance, Energy |
| Application Security | 21 | OWASP, Veracode, Snyk, GitGuardian |
| Cloud Security | 11 | Google Cloud, AWS, Wiz, Datadog |
| Vulnerabilities | 14 | Rapid7, VulnCheck, Edgescan |
| Ransomware | 9 | Veeam, Zscaler, Palo Alto |
| Data Breaches | 6 | Verizon DBIR, IBM Cost of Breach |
| Physical Security | 6 | Dragos, Nozomi, Waterfall |
| AI and Emerging Tech | 11 | Anthropic, Google, Zimperium |

### Survey Reports (151+ reports)

| Category | Count | Major Vendors |
|----------|-------|---------------|
| Industry Trends | 68 | WEF, ISACA, Splunk, Gartner |
| Executive Perspectives | 7 | CISO reports, Deloitte, Proofpoint |
| Workforce and Culture | 5 | ISC2, KnowBe4, CompTIA |
| Market and Investment | 5 | IT Harvest, Recorded Future |
| Identity Security | 19 | CyberArk, Okta, SailPoint |
| Penetration Testing | 5 | HackerOne, Cobalt, Bugcrowd |
| Privacy and Data Protection | 8 | Cisco, Proofpoint, Drata |

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill definition | `src/skills/AnnualReports/SKILL.md` | Intent routing and workflow triggers |
| List sources tool | `src/skills/AnnualReports/Tools/ListSources.ts` | Browse/search report sources |
| Update sources tool | `src/skills/AnnualReports/Tools/UpdateSources.ts` | Sync from upstream GitHub |
| Fetch report tool | `src/skills/AnnualReports/Tools/FetchReport.ts` | Download and summarize reports |
| Update workflow | `src/skills/AnnualReports/Workflows/Update.md` | Update sources workflow |
| Analyze workflow | `src/skills/AnnualReports/Workflows/Analyze.md` | Cross-vendor analysis workflow |
| Fetch workflow | `src/skills/AnnualReports/Workflows/Fetch.md` | Report fetch workflow |
| Sources data | `src/skills/AnnualReports/Data/sources.json` | All 570+ report URLs with metadata |

---

## Usage Examples

**List all categories:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts
```

**Search by vendor:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --vendor crowdstrike
```

**List reports in a category:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts "global threat intelligence"
```

**Search by keyword:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --search ransomware
```

**Update from upstream:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts
```

**Fetch a specific report:**
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts verizon dbir
```

---

## Credits

- **Author:** Daniel Miessler
- **Source:** [awesome-annual-security-reports](https://github.com/jacobdjwilson/awesome-annual-security-reports) by Jacob Wilson
- **Origin:** Extracted from production PAI system
- **License:** MIT

---

## Works Well With

- **pai-core-install** (required) - Skill routing system
- **pai-research-skill** - Deep research workflows
- **pai-osint-skill** - Open source intelligence gathering

---

## Changelog

### 2.3.0 - 2026-01-14
- Initial pack release
- 570+ report sources across 20+ categories
- Three CLI tools: ListSources, UpdateSources, FetchReport
- Three workflows: Update, Analyze, Fetch
- Upstream sync from awesome-annual-security-reports
