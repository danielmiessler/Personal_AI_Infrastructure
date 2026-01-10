# Company Profile Workflow

Comprehensive company/business investigation combining all company-focused OSINT workflows.

## Trigger Phrases
- "company profile"
- "business investigation"
- "company research"
- "corporate intelligence"
- "company due diligence"
- "investigate company"

## Input
- `company`: Company name or identifier (e.g., "Acme Corporation", "acme.com")
- `jurisdiction` (optional): Country/state for registry lookup
- `scope` (optional): light, standard, comprehensive

## Process

### Step 1: Initial Company Identification
```
Identify and disambiguate the company:
- Search OpenCorporates for exact match
- Query SEC EDGAR for public filings
- Check domain WHOIS for company association
- Identify jurisdiction and registration number
- Note any DBA (Doing Business As) names
```

### Step 2: Execute Sub-Workflows

Run workflows in order:

1. **Corporate Structure** (CorporateStructure.md)
   - Ownership hierarchy
   - Subsidiaries and affiliates
   - Key personnel and directors

2. **Financial Reconnaissance** (FinancialRecon.md)
   - SEC filings (if public)
   - Financial health indicators
   - Investor information

3. **Domain Reconnaissance** (DomainRecon.md)
   - Company web infrastructure
   - Technology stack
   - Related domains

4. **Risk Assessment** (RiskAssessment.md)
   - Litigation history
   - Adverse media
   - Regulatory issues

5. **Competitor Analysis** (CompetitorAnalysis.md)
   - Market position
   - Industry context
   - Competitive landscape

### Step 3: Social & Digital Footprint
```
Analyze digital presence:
- Official social media accounts
- Company blog/news
- Employee LinkedIn profiles
- Press releases
- Job postings (indicate growth/contraction)
```

### Step 4: Consolidate Findings
```
Merge all workflow outputs:
- Deduplicate entities
- Resolve conflicting information
- Calculate confidence scores
- Generate unified company graph
```

### Step 5: Generate Comprehensive Report
```
Compile IntelReport with all findings
```

### Step 6: Store to Knowledge Graph

Use the **knowledge** skill to persist the investigation:

```
Store the following as structured episodes:

1. Company Entity:
   - Name: "Company: {company_name}"
   - Data: Legal name, registration, jurisdiction, status, founded date
   - Group: "osint-companies"

2. Corporate Structure:
   - Name: "Structure: {company_name}"
   - Data: Parent company, subsidiaries, ownership percentages
   - Relationships: owns, subsidiary_of, controls

3. Key Personnel:
   - Name: "Executives: {company_name}"
   - Data: Directors, officers, board members with titles and tenure
   - Relationships: works_at, directs, founded

4. Financial Profile:
   - Name: "Financials: {company_name}"
   - Data: Funding rounds, investors, valuation, revenue estimates
   - Relationships: invested_in, funded_by

5. Risk Assessment:
   - Name: "Risk: {company_name}"
   - Data: Litigation, regulatory status, sanctions screening, adverse media
   - Risk score and category breakdown

6. Competitive Position:
   - Name: "Competitors: {company_name}"
   - Data: Market position, key competitors, differentiators
   - Relationships: competes_with, operates_in
```

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    COMPREHENSIVE COMPANY PROFILE
                       CORPORATE INTELLIGENCE DOSSIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFICATION: UNCLASSIFIED
REPORT DATE: 2026-01-10
REPORT ID: OSINT-COMPANY-2026-001
ANALYST: PAI OSINT Skill

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Company Name: Acme Corporation
Legal Entity Type: Delaware C-Corp
Investigation Scope: Comprehensive

Key Findings:
• Founded 2015, 250+ employees
• Series C funded ($50M), valued at $500M
• 3 subsidiaries, 2 international offices
• Clean litigation history
• Moderate growth trajectory

Overall Risk Level: LOW
Confidence: HIGH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2: COMPANY OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Basic Information
┌────────────────────┬─────────────────────────────┬────────────┐
│ Attribute          │ Value                       │ Confidence │
├────────────────────┼─────────────────────────────┼────────────┤
│ Legal Name         │ Acme Corporation Inc.       │ Confirmed  │
│ DBA                │ Acme, AcmeTech              │ High       │
│ Registration #     │ DE-12345678                 │ Confirmed  │
│ Jurisdiction       │ Delaware, USA               │ Confirmed  │
│ Status             │ Active                      │ Confirmed  │
│ Founded            │ 2015-03-15                  │ High       │
│ Industry           │ Enterprise Software         │ High       │
│ Employees          │ 250-500                     │ Medium     │
│ Annual Revenue     │ $25M-50M (est.)             │ Medium     │
└────────────────────┴─────────────────────────────┴────────────┘

2.2 Contact Information
• Headquarters: 123 Main St, San Francisco, CA 94105
• Website: acme.com
• Phone: +1 (415) 555-0100
• Email: info@acme.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: CORPORATE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 Ownership Hierarchy

                ┌─────────────────────┐
                │   Holding Co LLC    │
                │   (Parent Entity)   │
                └──────────┬──────────┘
                           │ 100%
                           ▼
                ┌─────────────────────┐
                │  ACME CORPORATION   │
                │     (Target)        │
                └──────────┬──────────┘
           ┌───────────────┼───────────────┐
           │ 100%          │ 100%          │ 100%
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Acme UK    │  │ Acme EU    │  │ Acme Labs  │
    │ Ltd        │  │ GmbH       │  │ Inc        │
    └────────────┘  └────────────┘  └────────────┘

3.2 Key Personnel
┌──────────────────┬─────────────────────┬────────────────┐
│ Name             │ Position            │ Since          │
├──────────────────┼─────────────────────┼────────────────┤
│ Jane Smith       │ CEO                 │ 2015           │
│ John Doe         │ CTO                 │ 2016           │
│ Sarah Johnson    │ CFO                 │ 2020           │
│ Michael Chen     │ Board Chair         │ 2018           │
└──────────────────┴─────────────────────┴────────────────┘

3.3 Board of Directors
• Michael Chen (Chair) - Partner, VC Fund
• Jane Smith (CEO)
• Robert Williams - Independent Director
• Lisa Park - Investor Representative

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: FINANCIAL OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 Funding History
┌────────────┬─────────────┬───────────────────────┐
│ Round      │ Amount      │ Lead Investor         │
├────────────┼─────────────┼───────────────────────┤
│ Seed       │ $2M         │ Angel Syndicate       │
│ Series A   │ $10M        │ First VC Partners     │
│ Series B   │ $25M        │ Growth Capital Fund   │
│ Series C   │ $50M        │ Global Ventures       │
└────────────┴─────────────┴───────────────────────┘

Total Raised: $87M
Valuation: ~$500M (Series C)

4.2 Financial Health Indicators
• Revenue Trend: Growing (15% YoY)
• Burn Rate: Moderate
• Runway: 24+ months (estimated)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: DIGITAL FOOTPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 Domains
• acme.com (Primary, registered 2015)
• acme.io (Redirect)
• getacme.com (Marketing)
• acme.dev (Developer portal)

5.2 Social Media
┌──────────────┬─────────────────┬────────────┐
│ Platform     │ Handle          │ Followers  │
├──────────────┼─────────────────┼────────────┤
│ LinkedIn     │ /company/acme   │ 15,000     │
│ Twitter/X    │ @acmehq         │ 8,500      │
│ GitHub       │ /acme           │ 2,300      │
└──────────────┴─────────────────┴────────────┘

5.3 Technology Stack
• Frontend: React, TypeScript
• Backend: Node.js, Python
• Cloud: AWS
• Database: PostgreSQL, Redis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 6: RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1 Litigation History
• Active Cases: 0
• Settled (5 years): 1 (Employment dispute, 2023)
• Risk Level: LOW

6.2 Regulatory Compliance
• SOC 2 Type II: Certified
• GDPR: Compliant
• No regulatory actions found

6.3 Adverse Media
• No significant negative coverage found
• Recent press: Product launch (positive)

6.4 Sanctions/Watchlists
• OFAC: Clear
• EU Sanctions: Clear
• PEP Connections: None identified

Overall Risk Score: 2/10 (Low)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 7: COMPETITIVE LANDSCAPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7.1 Market Position
• Industry: Enterprise Software
• Segment: Project Management
• Market Share: ~5% (estimated)

7.2 Key Competitors
• Competitor A - Market leader (40% share)
• Competitor B - Close competitor
• Competitor C - Emerging challenger

7.3 Competitive Advantages
• Strong engineering team
• Proprietary AI features
• Growing customer base

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 8: APPENDICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. Sources Used
• OpenCorporates registry data
• SEC EDGAR filings
• Crunchbase funding data
• LinkedIn company profiles
• Domain WHOIS records
• News and press releases

B. Methodology
• Collection period: 2026-01-10
• Passive OSINT techniques only
• Public sources exclusively

C. Confidence Matrix
┌────────────────────┬────────────┬─────────┐
│ Finding            │ Confidence │ Sources │
├────────────────────┼────────────┼─────────┤
│ Corporate identity │ 98%        │ 5       │
│ Ownership          │ 90%        │ 3       │
│ Financials         │ 75%        │ 2       │
│ Risk assessment    │ 85%        │ 4       │
└────────────────────┴────────────┴─────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                         END OF REPORT

Generated by PAI OSINT Skill v1.0.0
Investigation Duration: 25 minutes
Entities Discovered: 35
Relationships Mapped: 52

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
📁 Report saved: $PAI_DIR/history/research/osint/company_acme_2026-01-10.md
```

## Scope Levels

### Light
- Basic company identification
- Key personnel only
- ~10 minute investigation

### Standard (Default)
- Corporate structure
- Financial overview
- Digital footprint
- Basic risk check
- ~25 minute investigation

### Comprehensive
- All workflows
- Deep competitor analysis
- Full network mapping
- Historical analysis
- ~45+ minute investigation

## Data Sources

### Corporate Registries
- OpenCorporates (140+ jurisdictions)
- SEC EDGAR (US public companies)
- Companies House (UK)
- State business registries

### Financial Data
- Crunchbase (funding/investors)
- PitchBook
- SEC filings (10-K, 10-Q, 8-K)
- Annual reports

### News & Media
- Google News
- LexisNexis
- Industry publications
- Press release wires

## Tools & APIs Used
- OpenCorporates API
- SEC EDGAR search
- Crunchbase API
- LinkedIn Sales Navigator
- Web scraping (Browser Pack)

## Ethical Notes
- Only use publicly available information
- Respect data protection regulations (GDPR, CCPA)
- Do not access private financial systems
- Maintain audit trail of all sources
- Verify critical findings through multiple sources
