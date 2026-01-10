# Risk Assessment Workflow

Evaluate company risks including litigation, adverse media, regulatory issues, and sanctions.

## Trigger Phrases
- "risk assessment"
- "due diligence"
- "litigation history"
- "adverse media"
- "company risks"
- "sanctions check"
- "regulatory issues"
- "compliance check"

## Input
- `company`: Company name or identifier
- `jurisdiction` (optional): Primary jurisdiction for legal research
- `depth` (optional): basic, standard, enhanced (default: standard)
- `categories` (optional): specific risk categories to focus on

## Process

### Step 1: Litigation Research
```
Search for legal proceedings:

Civil Litigation:
- PACER (US federal courts)
- State court databases
- Class action databases
- Arbitration records

Criminal Proceedings:
- DOJ press releases
- State AG actions
- Criminal court records

Bankruptcy:
- Chapter 11/7 filings
- Creditor proceedings
```

### Step 2: Regulatory Actions
```
Check regulatory compliance:

Financial:
- SEC enforcement actions
- FINRA actions
- State securities regulators

Industry-Specific:
- FDA warnings/recalls
- FTC enforcement
- EPA violations
- OSHA citations

International:
- EU regulatory actions
- UK FCA
- Other relevant regulators
```

### Step 3: Sanctions & Watchlists
```
Screen against sanctions lists:

US Lists:
- OFAC SDN List
- Entity List (BIS)
- Denied Persons List
- Debarred Parties

International:
- EU Consolidated List
- UN Sanctions List
- FATF Watchlists
- Country-specific lists

Other Watchlists:
- PEP databases
- Adverse media lists
- AML watchlists
```

### Step 4: Adverse Media Screening
```
Search news for negative coverage:

Categories:
- Fraud/misconduct allegations
- Executive scandals
- Product failures/recalls
- Environmental incidents
- Labor disputes
- Data breaches
- Financial difficulties

Sources:
- Major news outlets
- Industry publications
- Local news
- Investigative journalism
```

### Step 5: Corporate Governance
```
Assess governance risks:
- Board independence
- Related party transactions
- Executive turnover
- Audit qualifications
- Internal control weaknesses
- Shareholder lawsuits
```

### Step 6: Financial Red Flags
```
Identify financial risks:
- Going concern warnings
- Delayed filings
- Restatements
- Auditor changes
- Debt covenant issues
- Cash flow problems
```

### Step 7: ESG Risks
```
Environmental, Social, Governance:
- Environmental violations
- Labor practices
- Diversity issues
- Supply chain concerns
- Carbon footprint
- Community relations
```

### Step 8: Risk Scoring
```
Calculate overall risk score:
- Weight factors by severity
- Consider recency
- Factor in remediation
- Compare to industry benchmarks
```

### Step 9: Store to Knowledge Graph

Use the **knowledge** skill to persist the risk assessment:

```
Store the following as structured episodes:

1. Risk Profile:
   - Name: "Risk: {company_name}"
   - Data: Overall risk score, category breakdown, assessment level
   - Group: "osint-risk"

2. Litigation Record:
   - Name: "Litigation: {company_name}"
   - Data: Active cases, historical cases with outcomes, materiality
   - Relationships: defendant_in, plaintiff_in

3. Regulatory Status:
   - Name: "Regulatory: {company_name}"
   - Data: Compliance certifications, regulatory actions, enforcement history
   - Temporal metadata for each action

4. Sanctions Screening:
   - Name: "Sanctions: {company_name}"
   - Data: Screening results for each watchlist (OFAC, EU, UN, etc.)
   - PEP connections, country risk assessment
   - Screening date for temporal validity

5. Adverse Media:
   - Name: "Media: {company_name}"
   - Data: Negative coverage items with severity, source, remediation status
   - Search period and article count

6. ESG Assessment:
   - Name: "ESG: {company_name}"
   - Data: Environmental, social, governance scores and findings
   - Disclosure level assessment
```

## Output Format

```
📋 RISK ASSESSMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 COMPANY: Acme Corporation
📅 REPORT DATE: 2026-01-10
🔍 ASSESSMENT LEVEL: Enhanced Due Diligence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ OVERALL RISK SCORE: 3/10 (LOW)

Risk Category Breakdown:
┌─────────────────────┬───────┬─────────────────────┐
│ Category            │ Score │ Status              │
├─────────────────────┼───────┼─────────────────────┤
│ Litigation          │ 2/10  │ ✅ Low Risk         │
│ Regulatory          │ 1/10  │ ✅ Low Risk         │
│ Sanctions           │ 0/10  │ ✅ Clear            │
│ Adverse Media       │ 3/10  │ ✅ Low Risk         │
│ Financial           │ 2/10  │ ✅ Low Risk         │
│ ESG                 │ 4/10  │ ⚠️ Moderate Risk    │
│ Governance          │ 2/10  │ ✅ Low Risk         │
└─────────────────────┴───────┴─────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ LITIGATION HISTORY:

Active Cases: 1
Closed (5 years): 3

Active Litigation:
┌─────────────────────────────────────────────────────────────┐
│ Case: Acme Corp v. Former Employee                          │
│ Court: San Francisco Superior Court                         │
│ Filed: 2025-08-15                                          │
│ Type: Employment (Breach of Contract)                       │
│ Status: Discovery Phase                                     │
│ Materiality: LOW (individual dispute)                       │
└─────────────────────────────────────────────────────────────┘

Historical Cases:
┌────────────────────┬────────────┬────────────┬─────────────┐
│ Case               │ Type       │ Resolved   │ Outcome     │
├────────────────────┼────────────┼────────────┼─────────────┤
│ Smith v. Acme      │ Employment │ 2024-03    │ Settled     │
│ IP Dispute Co.     │ Patent     │ 2023-08    │ Dismissed   │
│ Customer LLC       │ Contract   │ 2022-11    │ Won         │
└────────────────────┴────────────┴────────────┴─────────────┘

Analysis: Normal litigation profile for company size. No pattern
of systemic issues. Employment disputes are industry-standard.

Risk Level: LOW ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️ REGULATORY STATUS:

SEC Status: Not applicable (private company)

Other Regulatory Actions: NONE FOUND

Compliance Certifications:
• SOC 2 Type II (2025)
• ISO 27001 (2024)
• GDPR compliant
• CCPA compliant

Risk Level: LOW ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 SANCTIONS & WATCHLIST SCREENING:

OFAC SDN List: ✅ CLEAR
OFAC Non-SDN Lists: ✅ CLEAR
EU Consolidated List: ✅ CLEAR
UN Sanctions: ✅ CLEAR
BIS Entity List: ✅ CLEAR

PEP Screening:
• No executives identified as PEPs
• No board members with PEP connections

Country Risk:
• Headquarters: USA (Low risk)
• Operations: UK, Germany (Low risk)
• No operations in high-risk jurisdictions

Risk Level: CLEAR ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📰 ADVERSE MEDIA SCREENING:

Search Period: 5 years
Articles Reviewed: 156
Negative Coverage: 3 items

Findings:
┌──────────────────────────────────────────────────────────────┐
│ [2024-06] "Tech Layoffs Continue: Acme Cuts 20 Positions"    │
│ Source: TechCrunch                                           │
│ Severity: LOW                                                │
│ Context: Industry-wide downturn, 8% workforce reduction      │
│ Impact: Minimal - normal business adjustment                 │
├──────────────────────────────────────────────────────────────┤
│ [2023-09] "Customer Data Exposed in Vendor Breach"           │
│ Source: SecurityWeek                                         │
│ Severity: MEDIUM                                             │
│ Context: Third-party vendor breach, not Acme systems         │
│ Impact: Properly disclosed, affected users notified          │
│ Remediation: Vendor replaced, security audit completed       │
├──────────────────────────────────────────────────────────────┤
│ [2022-04] "Glassdoor Reviews Cite Culture Concerns"          │
│ Source: Business Insider                                     │
│ Severity: LOW                                                │
│ Context: 3.2/5 rating, growth pains mentioned                │
│ Impact: HR improvements announced, rating now 4.1/5          │
└──────────────────────────────────────────────────────────────┘

Analysis: No significant negative coverage. Issues identified
were addressed appropriately with documented remediation.

Risk Level: LOW ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 FINANCIAL RISK INDICATORS:

Going Concern: None identified
Audit Issues: None
Filing Delays: None (private, N/A)
Restatements: None

Financial Health Signals:
✅ Recent successful funding ($50M Series C)
✅ Consistent revenue growth
✅ Healthy investor base
⚠️ Not yet profitable (typical for growth stage)

Bankruptcy Risk: VERY LOW
• Strong cash position
• Reputable investors
• Growing customer base

Risk Level: LOW ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌱 ESG RISK ASSESSMENT:

Environmental:
• Carbon footprint: Not reported
• Environmental certifications: None
• Industry impact: Low (software company)
Score: 4/10 (lack of reporting, not violations)

Social:
• Diversity data: Published
• Labor practices: No violations found
• Supply chain: N/A (services company)
• Community: Philanthropic program active
Score: 3/10 (generally positive)

Governance:
• Board independence: 50% (2/4)
• Executive compensation: Not disclosed (private)
• Related party transactions: None identified
Score: 3/10 (acceptable for private company)

ESG Summary:
⚠️ Limited ESG reporting (common for private companies)
✅ No ESG violations or controversies
✅ Positive workplace culture indicators

Risk Level: MODERATE ⚠️ (due to limited disclosure)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 CORPORATE GOVERNANCE:

Board Composition:
• 4 directors (50% independent)
• Investor representation appropriate
• No concerning patterns

Executive Stability:
• CEO: Founder (stable since 2015)
• CTO: 8 years tenure
• CFO: 4 years tenure
• No unusual turnover

Red Flags Checked:
✅ No undisclosed related party transactions
✅ No conflicts of interest identified
✅ No whistleblower complaints found
✅ No audit committee concerns

Risk Level: LOW ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 RISK SUMMARY:

Identified Risks:
1. [LOW] Active employment litigation (standard)
2. [LOW] 2023 vendor data breach (remediated)
3. [MODERATE] Limited ESG disclosure

Mitigating Factors:
• Strong compliance certifications
• Clean regulatory history
• Stable leadership
• Healthy financials
• Appropriate remediation of past issues

Recommendations:
• Standard monitoring sufficient
• No enhanced due diligence required
• Review ESG reporting at next assessment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL ASSESSMENT: LOW RISK ✅

This company presents an acceptable risk profile for
business engagement. No significant barriers identified.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: risk_assessment_acme_2026
📁 Report saved: $PAI_DIR/history/research/osint/risk_acme_2026-01-10.md
```

## Data Sources

### Legal/Litigation
- PACER (US Federal Courts)
- State court databases
- CourtListener
- Class Action databases
- Arbitration databases

### Regulatory
- SEC EDGAR
- DOJ Press Releases
- FTC Cases
- FDA Warning Letters
- EPA ECHO database
- State AG websites

### Sanctions
- OFAC Sanctions Lists
- EU Consolidated List
- UN Sanctions List
- BIS Lists
- World Bank Debarred Firms

### Media
- Google News
- LexisNexis
- Factiva
- Industry publications
- Local news sources

### ESG Data
- CDP (Carbon Disclosure Project)
- GRI Reports
- Company sustainability reports
- Glassdoor/Indeed reviews

## Tools & APIs Used
- PACER API
- OFAC Sanctions Search
- OpenSanctions database
- Google News API
- SEC EDGAR
- Web scraping (for public records)

## Ethical Notes
- Rely only on public records and verified sources
- Note confidence levels for all findings
- Distinguish between allegations and confirmed facts
- Consider statute of limitations context
- Respect individual privacy within legal bounds
- Document all sources for audit trail
- Note when records may be incomplete
