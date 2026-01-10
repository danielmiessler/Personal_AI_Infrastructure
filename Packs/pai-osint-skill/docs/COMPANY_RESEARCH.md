# Company Research Guide

Comprehensive guide to business and corporate intelligence workflows.

## Overview

The osint skill includes five specialized workflows for company research:

| Workflow | Focus | Best For |
|----------|-------|----------|
| CompanyProfile | Full dossier | Complete company investigation |
| CorporateStructure | Ownership, hierarchy | Understanding who owns/controls |
| FinancialRecon | Funding, investors | Investment due diligence |
| CompetitorAnalysis | Market position | Competitive intelligence |
| RiskAssessment | Litigation, sanctions | Vendor/partner vetting |

## CompanyProfile

The master workflow that orchestrates all company research.

### Usage

```
Company profile on Acme Corporation
```

```
/osint company "Acme Corporation"
```

### What It Does

1. Identifies and disambiguates the company
2. Runs CorporateStructure workflow
3. Runs FinancialRecon workflow
4. Runs DomainRecon workflow
5. Runs RiskAssessment workflow
6. Runs CompetitorAnalysis workflow
7. Analyzes digital footprint
8. Consolidates and stores findings

### Scope Levels

| Scope | Includes | Duration |
|-------|----------|----------|
| light | Basic ID, key personnel | ~10 min |
| standard | Structure, financials, digital, risk | ~25 min |
| comprehensive | All workflows, deep analysis | ~45+ min |

```
Run a comprehensive company profile on Acme Corporation
```

### Output

- Executive summary with key findings
- Company overview (legal name, registration, status)
- Corporate structure diagram
- Financial overview
- Digital footprint analysis
- Risk assessment
- Competitive landscape
- Confidence matrix

## CorporateStructure

Maps ownership hierarchy and key personnel.

### Usage

```
Who owns Acme Corporation?
```

```
/osint structure "Acme Inc"
```

### What It Discovers

- **Ownership Hierarchy**
  - Immediate parent company
  - Ultimate beneficial owner (UBO)
  - Ownership percentages
  - Circular ownership detection

- **Subsidiaries**
  - All subsidiary entities
  - Jurisdiction per entity
  - Active vs dormant status

- **Key Personnel**
  - Directors and officers
  - Appointment dates
  - Other directorships
  - Potential conflicts

- **Corporate History**
  - Name changes
  - Ownership transfers
  - Mergers/acquisitions

### Data Sources

- OpenCorporates (140+ jurisdictions)
- SEC EDGAR (US public companies)
- Companies House (UK)
- State business registries
- LinkedIn (executive verification)

## FinancialRecon

Investigates company financial health and investor landscape.

### Usage

```
What's the financial status of TechCorp?
```

```
/osint financials "TechCorp"
```

### Public vs Private Companies

**Public Companies:**
- Full SEC filings (10-K, 10-Q, 8-K)
- Audited financials
- Insider transactions
- Analyst reports

**Private Companies:**
- Funding rounds from Crunchbase/PitchBook
- Estimated revenue from signals
- Investor information
- Growth indicators

### What It Discovers

- Funding history (rounds, amounts, valuations)
- Investor breakdown (lead, participating)
- Revenue estimates with evidence
- Financial health indicators
- Red flags (going concern, audit issues)

### Estimation Techniques

For private companies, revenue is estimated from:
- Job postings mentioning revenue
- Press releases
- Employee count to revenue ratios
- Industry benchmarks
- Funding efficiency analysis

All estimates include confidence levels.

## CompetitorAnalysis

Analyzes market position and competitive landscape.

### Usage

```
Analyze competitors for Acme Corp
```

```
/osint competitors "Acme"
```

### What It Discovers

- **Market Context**
  - Industry/sector classification
  - Market size and growth rate
  - Key trends

- **Competitor Identification**
  - Direct competitors
  - Indirect competitors
  - Emerging challengers

- **Competitor Profiles**
  - Company overview
  - Funding/revenue
  - Market share estimates
  - Strengths/weaknesses

- **Comparative Analysis**
  - Feature matrix
  - Pricing comparison
  - Market position map

- **SWOT Analysis**
  - Strengths vs competitors
  - Weaknesses vs competitors
  - Market opportunities
  - Competitive threats

### Data Sources

- G2 Crowd / Capterra / TrustRadius
- Crunchbase / PitchBook
- SimilarWeb (traffic data)
- BuiltWith (tech stack)
- Industry analyst reports

## RiskAssessment

Evaluates company risks for due diligence.

### Usage

```
Run a risk check on potential vendor ABC
```

```
/osint risk "ABC Corp"
```

### Risk Categories

| Category | What's Checked |
|----------|----------------|
| Litigation | Active cases, historical lawsuits, outcomes |
| Regulatory | SEC actions, FTC, FDA, industry regulators |
| Sanctions | OFAC, EU, UN, BIS watchlists |
| Adverse Media | Negative news, scandals, incidents |
| Financial | Going concern, audit issues, restatements |
| ESG | Environmental, social, governance risks |
| Governance | Board independence, conflicts, turnover |

### Assessment Levels

| Level | Depth |
|-------|-------|
| basic | Key watchlists, recent litigation |
| standard | All categories, 5-year history |
| enhanced | Deep dive, PEP screening, supply chain |

```
Run enhanced due diligence on ABC Corp
```

### Output

- Overall risk score (1-10)
- Category breakdown with individual scores
- Detailed findings per category
- Mitigating factors
- Recommendations

### Data Sources

- PACER (US federal courts)
- State court databases
- OFAC Sanctions Lists
- SEC EDGAR (enforcement)
- OpenSanctions database
- Google News / LexisNexis

## Knowledge Integration

All company research is automatically stored to the knowledge graph.

### What Gets Stored

Each workflow stores structured entities:

| Workflow | Entities Stored |
|----------|-----------------|
| CompanyProfile | Company, Structure, Executives, Financials, Risk, Competitors |
| CorporateStructure | Company, Ownership, Subsidiaries, Directors, Timeline |
| FinancialRecon | Funding, Investors, Metrics, SEC Filings, Health Score |
| CompetitorAnalysis | Market, Landscape, Competitors, SWOT, Features |
| RiskAssessment | Risk Profile, Litigation, Regulatory, Sanctions, Media, ESG |

### Querying Past Research

```
Search knowledge for "Acme Corporation executives"
```

```
What investors are connected to TechCorp?
```

```
Show me all companies with high risk scores
```

### Cross-Investigation Linking

The knowledge graph automatically links:
- People across companies (e.g., shared directors)
- Investors across portfolio companies
- Competitors within industries
- Historical relationships

## Best Practices

1. **Start Broad, Go Deep**
   - Begin with CompanyProfile (standard scope)
   - Run specific workflows for deeper analysis

2. **Verify Critical Findings**
   - Cross-reference with multiple sources
   - Note confidence levels in reports

3. **Document Sources**
   - All workflows track source provenance
   - Maintain for audit trail

4. **Respect Rate Limits**
   - Some APIs have request limits
   - Space out large investigations

5. **Update Periodically**
   - Company data changes over time
   - Re-run assessments for ongoing relationships
