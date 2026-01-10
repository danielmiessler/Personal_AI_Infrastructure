# osint skill - User Guide

AI-powered Open Source Intelligence collection and analysis.

## Overview

The osint skill provides structured workflows for gathering and analyzing publicly available information. All findings are stored to the knowledge graph for future reference and cross-investigation linking.

## Getting Started

### Prerequisites

- **browser** skill - Required for web scraping and page rendering
- **knowledge** skill - Required for persistent intelligence storage

### Basic Usage

Simply describe what you want to investigate:

```
Investigate username johndoe123
```

```
Research company Acme Corporation
```

```
Analyze domain example.com
```

The skill will automatically route to the appropriate workflow.

## Workflow Categories

### Individual/Person Research

| Workflow | Use When | Example |
|----------|----------|---------|
| UsernameRecon | Finding accounts across platforms | "Find all accounts for username hackerman" |
| SocialCapture | Capturing social media profiles | "Capture Twitter profile @elonmusk" |
| TargetProfile | Comprehensive individual dossier | "Full profile on John Smith" |
| TimelineAnalysis | Analyzing activity patterns | "When is this user most active?" |

### Domain/Infrastructure

| Workflow | Use When | Example |
|----------|----------|---------|
| DomainRecon | Investigating websites/domains | "Investigate example.com" |
| InfraMapping | Mapping network infrastructure | "Map infrastructure for 10.0.0.0/24" |

### Company/Business Research

| Workflow | Use When | Example |
|----------|----------|---------|
| CompanyProfile | Full company investigation | "Research Acme Corporation" |
| CorporateStructure | Ownership and hierarchy | "Who owns XYZ Inc?" |
| FinancialRecon | Funding, investors, financials | "What's the financial status of TechCorp?" |
| CompetitorAnalysis | Market position, competitors | "Analyze competitors for Acme" |
| RiskAssessment | Due diligence, litigation, sanctions | "Run risk check on vendor ABC" |

### Analysis & Reporting

| Workflow | Use When | Example |
|----------|----------|---------|
| EntityLinking | Connecting identities/accounts | "Link these accounts together" |
| IntelReport | Generating final reports | "Generate report for investigation Alpha" |

## Quick Commands

```bash
/osint username <username>      # Username enumeration
/osint domain <domain>          # Domain reconnaissance
/osint social <@handle>         # Social media capture
/osint infra <IP/range>         # Infrastructure mapping
/osint company <name>           # Full company profile
/osint structure <name>         # Corporate ownership
/osint financials <name>        # Financial reconnaissance
/osint competitors <name>       # Competitive analysis
/osint risk <name>              # Risk/due diligence
/osint profile <target>         # Full target profile
/osint report <investigation>   # Generate report
```

## Output

All investigations produce:

1. **Structured Report** - Formatted findings displayed in the conversation
2. **Knowledge Graph** - Entities and relationships stored for querying
3. **Saved Report** - Markdown file in `~/.claude/history/research/osint/`

### Querying Past Investigations

Use the knowledge skill to search previous findings:

```
Search knowledge for "Acme Corporation"
```

```
What do I know about johndoe123?
```

## Scope Levels

Many workflows support scope levels:

| Level | Description | Time |
|-------|-------------|------|
| light | Basic identification, key facts only | ~10 min |
| standard | Core analysis, moderate depth | ~25 min |
| comprehensive | Full investigation, all sub-workflows | ~45+ min |

Example:
```
Run a comprehensive company profile on Acme Corporation
```

## Ethical Guidelines

Before any OSINT operation:

1. **Verify Authorization** - Ensure you have legitimate purpose
2. **Check Legal Boundaries** - Respect privacy laws and platform ToS
3. **Maintain OPSEC** - Use appropriate anonymization if needed
4. **Document Everything** - Maintain audit trail of collection methods
5. **Store Securely** - Protect collected intelligence appropriately

## Confidence Levels

All findings include confidence ratings:

| Level | Meaning |
|-------|---------|
| Confirmed | Verified from official/authoritative source |
| High | Multiple corroborating sources |
| Medium | Single reliable source or inference |
| Low | Unverified, requires confirmation |

## Next Steps

- See [COMPANY_RESEARCH.md](COMPANY_RESEARCH.md) for detailed company investigation guide
- See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for command cheat sheet
