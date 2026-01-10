# Competitor Analysis Workflow

Analyze company's market position, competitive landscape, and industry context.

## Trigger Phrases
- "competitor analysis"
- "competitive landscape"
- "market position"
- "industry analysis"
- "who competes with"
- "market share"
- "SWOT analysis"

## Input
- `company`: Target company name
- `industry` (optional): Industry/sector (auto-detect if not specified)
- `depth` (optional): basic, detailed, comprehensive (default: detailed)

## Process

### Step 1: Industry Identification
```
Determine market context:
- Primary industry/sector
- Sub-segments served
- Geographic markets
- Target customer segments
- Business model type
```

### Step 2: Competitor Discovery
```
Identify competitors through:

Direct Signals:
- Company "About" pages mentioning alternatives
- G2/Capterra/TrustRadius comparisons
- Industry analyst reports
- Press articles comparing solutions

Indirect Signals:
- Similar job postings
- Shared customers
- Conference attendance
- Patent filings in same areas
- Similar investors
```

### Step 3: Competitor Profiling
```
For each competitor, gather:
- Company overview
- Founded date, HQ location
- Employee count
- Funding/revenue
- Key products/services
- Target market
- Pricing model
- Strengths/weaknesses
```

### Step 4: Market Positioning
```
Analyze positioning:
- Value proposition comparison
- Pricing tiers
- Feature matrix
- Customer segments
- Go-to-market approach
- Brand positioning
```

### Step 5: Competitive Intelligence
```
Gather recent intel:
- Product launches
- Feature updates
- Pricing changes
- Key hires/departures
- Customer wins/losses
- Strategic partnerships
- Acquisition activity
```

### Step 6: SWOT Analysis
```
Synthesize findings:
- Strengths (vs competitors)
- Weaknesses (vs competitors)
- Opportunities (market gaps)
- Threats (competitive risks)
```

### Step 7: Store to Knowledge Graph

Use the **knowledge** skill to persist the competitive intelligence:

```
Store the following as structured episodes:

1. Market Context:
   - Name: "Market: {industry}"
   - Data: Market size, growth rate, key trends, segments
   - Group: "osint-markets"

2. Competitive Landscape:
   - Name: "Competitors: {company_name}"
   - Data: List of competitors with profiles (funding, employees, market share)
   - Relationships: competes_with, larger_than, smaller_than

3. For Each Competitor:
   - Name: "Competitor: {competitor_name}"
   - Data: Founded, HQ, employees, funding, revenue, strengths, weaknesses
   - Relationships: competes_with {company_name}, operates_in {industry}

4. SWOT Analysis:
   - Name: "SWOT: {company_name}"
   - Data: Strengths, weaknesses, opportunities, threats
   - Context: Competitive positioning as of {date}

5. Feature Comparison:
   - Name: "Features: {company_name} vs Competitors"
   - Data: Feature matrix with capability ratings
```

## Output Format

```
📋 COMPETITIVE ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 COMPANY: Acme Corporation
📅 REPORT DATE: 2026-01-10
🏭 INDUSTRY: Enterprise Project Management Software

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 MARKET OVERVIEW:

Industry: Enterprise Software - Project Management
Market Size: $8.5B (2025)
Growth Rate: 12% CAGR
Key Trends:
• AI/ML integration
• Remote work enablement
• Integration ecosystem expansion

Target Customer Profile:
• Mid-market to Enterprise (100-5000 employees)
• Technology, Professional Services, Manufacturing
• Distributed/hybrid teams

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 COMPETITIVE LANDSCAPE:

Market Position Map:
                    ENTERPRISE
                        ▲
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   Competitor A    │   Competitor B    │
    │   (Leader)        │   (Challenger)    │
    │                   │                   │
LOW ◄───────────────────┼───────────────────► HIGH
PRICE                   │                   PRICE
    │                   │                   │
    │      ACME         │   Competitor C    │
    │     (Target)      │   (Niche)         │
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                        ▼
                      SMB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 KEY COMPETITORS:

1. COMPETITOR A (Market Leader)
┌──────────────────┬─────────────────────────────┐
│ Founded          │ 2008                        │
│ HQ               │ San Francisco, CA           │
│ Employees        │ 3,500                       │
│ Funding          │ Public (NYSE: CMPA)         │
│ Revenue          │ $1.2B ARR                   │
│ Market Share     │ ~35%                        │
├──────────────────┼─────────────────────────────┤
│ Strengths        │ Brand recognition, ecosystem│
│ Weaknesses       │ Complex, expensive          │
│ Pricing          │ $25-65/user/month           │
└──────────────────┴─────────────────────────────┘

2. COMPETITOR B (Direct Competitor)
┌──────────────────┬─────────────────────────────┐
│ Founded          │ 2014                        │
│ HQ               │ Austin, TX                  │
│ Employees        │ 800                         │
│ Funding          │ $200M (Series D)            │
│ Revenue          │ $150M ARR (est.)            │
│ Market Share     │ ~12%                        │
├──────────────────┼─────────────────────────────┤
│ Strengths        │ Modern UX, fast growth      │
│ Weaknesses       │ Limited enterprise features │
│ Pricing          │ $15-45/user/month           │
└──────────────────┴─────────────────────────────┘

3. COMPETITOR C (Emerging)
┌──────────────────┬─────────────────────────────┐
│ Founded          │ 2019                        │
│ HQ               │ London, UK                  │
│ Employees        │ 200                         │
│ Funding          │ $50M (Series B)             │
│ Revenue          │ $20M ARR (est.)             │
│ Market Share     │ ~3%                         │
├──────────────────┼─────────────────────────────┤
│ Strengths        │ AI-native, innovative       │
│ Weaknesses       │ Small customer base         │
│ Pricing          │ $20-50/user/month           │
└──────────────────┴─────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 FEATURE COMPARISON:

┌────────────────────┬───────┬────────┬────────┬────────┐
│ Feature            │ ACME  │ Comp A │ Comp B │ Comp C │
├────────────────────┼───────┼────────┼────────┼────────┤
│ Task Management    │  ✅   │   ✅   │   ✅   │   ✅   │
│ Resource Planning  │  ✅   │   ✅   │   ⚠️   │   ❌   │
│ Time Tracking      │  ✅   │   ✅   │   ✅   │   ✅   │
│ Gantt Charts       │  ✅   │   ✅   │   ⚠️   │   ✅   │
│ AI Assistance      │  ✅   │   ⚠️   │   ⚠️   │   ✅   │
│ Custom Fields      │  ✅   │   ✅   │   ✅   │   ⚠️   │
│ Integrations       │  50+  │  200+  │   80+  │   30+  │
│ SSO/SAML           │  ✅   │   ✅   │   ✅   │   ✅   │
│ API Access         │  ✅   │   ✅   │   ✅   │   ⚠️   │
│ Mobile Apps        │  ✅   │   ✅   │   ✅   │   ⚠️   │
└────────────────────┴───────┴────────┴────────┴────────┘

✅ Full support  ⚠️ Partial/Basic  ❌ Not available

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 PRICING COMPARISON:

┌────────────────┬─────────┬─────────┬─────────┬─────────┐
│ Tier           │ ACME    │ Comp A  │ Comp B  │ Comp C  │
├────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Basic          │ $10     │ $25     │ $15     │ $20     │
│ Professional   │ $20     │ $45     │ $30     │ $35     │
│ Enterprise     │ Custom  │ $65+    │ $45     │ $50     │
└────────────────┴─────────┴─────────┴─────────┴─────────┘

(Per user/month, billed annually)

ACME Positioning: Mid-range pricing, enterprise features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📰 RECENT COMPETITIVE INTELLIGENCE:

Competitor A:
• [2026-01] Launched AI copilot feature
• [2025-11] Acquired workflow automation startup
• [2025-10] Price increase announced (10%)

Competitor B:
• [2026-01] Closed $75M Series E
• [2025-12] Expanded to APAC market
• [2025-09] Key CTO departure

Competitor C:
• [2025-12] Product Hunt launch (trending)
• [2025-11] Partnership with major cloud provider
• [2025-08] SOC 2 compliance achieved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SWOT ANALYSIS (ACME vs. Competition):

STRENGTHS:
• Competitive pricing with enterprise features
• Modern AI capabilities
• Strong growth trajectory
• Positive customer reviews (4.5/5)

WEAKNESSES:
• Smaller integration ecosystem
• Less brand recognition
• Limited global presence
• Newer market entrant

OPPORTUNITIES:
• Competitor A price increases
• AI differentiation
• Mid-market focus gap
• European expansion

THREATS:
• Competitor C innovation pace
• Big tech market entry
• Economic downturn impacts
• Consolidation pressure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 MARKET SHARE ESTIMATES:

┌─────────────────────┬───────────────┐
│ Company             │ Market Share  │
├─────────────────────┼───────────────┤
│ Competitor A        │ 35%           │
│ Competitor B        │ 12%           │
│ ACME (Target)       │ 5%            │
│ Competitor C        │ 3%            │
│ Others              │ 45%           │
└─────────────────────┴───────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 KEY DIFFERENTIATORS:

ACME vs. Competitor A:
• 60% lower pricing
• Faster implementation
• More intuitive UX
• Native AI features

ACME vs. Competitor B:
• Stronger enterprise features
• Better resource planning
• More security certifications

ACME vs. Competitor C:
• Larger customer base
• More integrations
• Proven scale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity IDs: comp_analysis_acme_2026, comp_a, comp_b, comp_c
```

## Data Sources

### Product Comparison
- G2 Crowd / Capterra / TrustRadius
- Product websites
- Documentation sites
- Pricing pages

### Company Data
- Crunchbase / PitchBook
- LinkedIn Company pages
- Press releases
- SEC filings (public companies)

### Market Intelligence
- Industry analyst reports (Gartner, Forrester)
- News aggregators
- Conference presentations
- Patent databases

### Customer Signals
- Review sites
- Case studies
- Social media mentions
- Job postings (customer mentions)

## Tools & APIs Used
- G2 Crowd data
- Crunchbase API
- SimilarWeb (traffic data)
- BuiltWith (tech stack)
- Google News API
- LinkedIn Sales Navigator

## Ethical Notes
- Use only publicly available competitive information
- Do not access competitor systems without authorization
- Avoid social engineering of competitor employees
- Clearly cite sources for all claims
- Note estimation methods for market share data
