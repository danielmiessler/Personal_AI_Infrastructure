# Financial Modeling with Gemini 3 Pro

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the FinancialModelingGemini3 workflow in the Hormozi skill to build financial models"}' \
  > /dev/null 2>&1 &
```

Running the **FinancialModelingGemini3** workflow in the **Hormozi** skill to build financial models...

**Purpose**: Create sophisticated financial models using Gemini 3 Pro's 95-100% math accuracy for precise business calculations, valuations, ROI analysis, and financial projections.

**When to use**: When user needs financial modeling, business valuation, pricing strategy, cash flow forecasting, ROI calculations, consulting proposal pricing, or benefits optimization analysis.

## Why Gemini 3 Pro for Financial Modeling

### Mathematical Excellence
- **95-100% AIME 2025 Math Accuracy**: Exceptional precision for complex calculations
- **Deep Reasoning**: Extended thinking for multi-variable financial models
- **Large Context Window**: Analyze multiple scenarios and datasets simultaneously
- **Quantitative Analysis**: Superior performance on financial formulas and projections

### Key Advantages Over Other Models
- **Calculation Precision**: Virtually error-free mathematical operations
- **Formula Transparency**: Shows all formulas and calculation steps
- **Scenario Analysis**: Handles multiple scenarios (optimistic/pessimistic/realistic) simultaneously
- **Sensitivity Analysis**: Identifies key financial drivers and risk factors

## Financial Modeling Use Cases

### 1. Business Valuation & Projections
- 5-year revenue and expense forecasting
- Company valuation (DCF, multiples-based)
- Growth trajectory modeling
- Market opportunity sizing

### 2. ROI & NPV Analysis
- Net Present Value calculations
- Internal Rate of Return (IRR)
- Payback period analysis
- Risk-adjusted returns

### 3. Pricing Strategy Optimization
- Consulting proposal pricing (Hormozi value equation integration)
- Product/service pricing models
- Tiered pricing optimization
- Price elasticity analysis

### 4. Cash Flow Forecasting
- Monthly/quarterly cash flow projections
- Working capital requirements
- Burn rate and runway calculations
- Seasonal cash flow patterns

### 5. Consulting Proposal Pricing
- Value-based pricing frameworks
- ROI justification for clients
- Alex Hormozi value equation application
- Competitive pricing analysis

### 6. Benefits Maximization
- Amex Platinum benefits optimization ($2000+ annually)
- Subscription benefits analysis
- Tax optimization strategies
- Expense reduction opportunities

## Workflow Process

### Step 1: Requirements Gathering

**Define Model Parameters:**
- Business context and objectives
- Historical financial data available
- Time horizon (monthly, quarterly, annual)
- Key assumptions and constraints
- Required outputs and decision criteria

**Example Prompts:**
```
"I need to model consulting pricing for a 6-month AI transition advisory engagement"
"Create a 5-year revenue forecast for newsletter growth"
"Analyze ROI for hiring a new team member vs. contractor work"
```

### Step 2: Data Collection

**Gather Historical Data:**
- Revenue data (from analytics dashboard, bank statements)
- Expense data (categorized from financial tracking)
- Growth metrics (subscriber growth, revenue trends)
- Market data (industry benchmarks, competitor pricing)

**Integration Points:**
- `Workflows/finances/get-state.md` - Current financial state
- Analytics dashboard - Revenue and subscriber data
- Bank statements from `~/.claude/PAI/USER/FINANCES/Data/`
- Benefits tracking data

### Step 3: Model Design with Gemini 3 Pro

**Command Pattern:**
```bash
llm -m gemini-3-pro-preview "Create a detailed financial model with the following parameters:

BUSINESS CONTEXT:
[Describe the business situation, decision, or opportunity]

HISTORICAL DATA:
[Provide relevant financial data - revenue, expenses, growth rates, etc.]

ASSUMPTIONS:
[List key assumptions - growth rates, cost structures, market conditions]

REQUIRED OUTPUTS:
1. Multi-year financial projections (revenue, expenses, profit)
2. NPV and IRR calculations for investment scenarios
3. Break-even analysis with timeline
4. Sensitivity analysis identifying key variables
5. Risk assessment with mitigation strategies
6. Actionable recommendations with confidence levels

CONSTRAINTS:
[Any budget limits, timeline constraints, or business rules]

Please show all formulas, calculation steps, and create scenario analysis (best case, worst case, expected case). Use precise mathematical calculations and provide results in markdown tables for easy visualization."
```

### Step 4: Scenario Analysis

**Three-Scenario Framework:**

**Optimistic Scenario:**
- Best-case assumptions (high growth, low costs)
- Market conditions favor the business
- All initiatives succeed as planned

**Realistic Scenario:**
- Most likely assumptions based on historical data
- Expected market conditions
- Normal execution with some headwinds

**Pessimistic Scenario:**
- Conservative assumptions (low growth, high costs)
- Challenging market conditions
- Delays and setbacks factored in

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Analyze these three scenarios for [BUSINESS SITUATION]:

OPTIMISTIC: [assumptions]
REALISTIC: [assumptions]
PESSIMISTIC: [assumptions]

For each scenario, calculate:
- Revenue projections (5 years)
- Expense projections (5 years)
- Net profit/cash flow
- NPV and IRR
- Probability of achieving goals

Create comparison table showing all three scenarios side-by-side."
```

### Step 5: Sensitivity Analysis

**Identify Key Drivers:**
- Which variables have the biggest impact on outcomes?
- What's the range of uncertainty for each variable?
- What happens if assumptions change by ±10%, ±25%, ±50%?

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Perform sensitivity analysis on this financial model:

BASE CASE: [provide base assumptions and results]

VARIABLES TO TEST:
1. Revenue growth rate (±10%, ±25%, ±50%)
2. Customer acquisition cost (±10%, ±25%, ±50%)
3. Churn rate (±10%, ±25%, ±50%)
4. Operating expenses (±10%, ±25%, ±50%)

For each variable:
- Show impact on NPV, IRR, and profitability
- Identify break-even points
- Rank variables by sensitivity
- Highlight critical thresholds

Present results in tornado diagram format (text-based) and sensitivity table."
```

### Step 6: Recommendation Generation

**Actionable Insights:**
- Financial feasibility assessment
- Risk/reward analysis
- Strategic recommendations
- Decision framework with confidence levels

**Output Format:**
```markdown
## Executive Summary
[2-3 sentence high-level recommendation]

## Financial Analysis Results

### Scenario Comparison
| Metric | Pessimistic | Realistic | Optimistic |
|--------|------------|-----------|------------|
| 5-Year Revenue | $XXX | $XXX | $XXX |
| 5-Year Expenses | $XXX | $XXX | $XXX |
| NPV (10% discount) | $XXX | $XXX | $XXX |
| IRR | XX% | XX% | XX% |
| Payback Period | XX months | XX months | XX months |

### Key Financial Drivers
1. **[Variable 1]**: Impact on NPV = ±$XXX per 10% change
2. **[Variable 2]**: Impact on NPV = ±$XXX per 10% change
3. **[Variable 3]**: Impact on NPV = ±$XXX per 10% change

### Risk Assessment
- **Low Risk**: [aspects with high confidence]
- **Medium Risk**: [aspects with moderate uncertainty]
- **High Risk**: [aspects requiring careful monitoring]

### Recommendations
1. **[Primary Recommendation]**: [rationale with financial backing]
2. **[Secondary Recommendation]**: [rationale with financial backing]
3. **[Risk Mitigation]**: [strategies to reduce downside]

### Decision Framework
- **Green Light If**: [conditions that justify proceeding]
- **Yellow Light If**: [conditions requiring more analysis]
- **Red Light If**: [conditions that suggest waiting/avoiding]
```

## Common Financial Modeling Scenarios

### Scenario 1: Consulting Proposal Pricing

**Context**: Pricing a 6-month AI Transition Advisory engagement

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Create a value-based pricing model for consulting services:

SERVICE: AI Transition Advisory (6-month engagement)

DELIVERABLES:
- Current state assessment (4 weeks)
- AI strategy and roadmap (4 weeks)
- Implementation planning (8 weeks)
- Transition support (8 weeks)

TIME INVESTMENT:
- Lead consultant: 120 hours
- Senior advisor: 60 hours
- Research and prep: 40 hours

CLIENT VALUE CREATION (estimated):
- Cost savings from AI automation: $500K/year
- Revenue increase from AI capabilities: $200K/year
- Risk reduction (avoided missteps): $300K

COST BASIS:
- Hourly rate (market): $350/hour (lead), $250/hour (senior)
- Cost-plus target margin: 50%

Using the Hormozi Value Equation:
Value = (Dream Outcome × Likelihood of Achievement) / (Time Delay × Effort & Sacrifice)

Calculate:
1. Cost-based pricing (hourly × hours × margin)
2. Value-based pricing (% of value created)
3. Market-based pricing (industry benchmarks)
4. Recommended pricing with justification
5. ROI for client at each price point
6. Pricing tiers (basic/standard/premium)

Show all formulas and provide pricing recommendation."
```

**Expected Output:**
- Cost-based price: $68,250 ($350×120 + $250×60 + prep costs, 50% margin)
- Value-based price: $100,000-150,000 (10-15% of Year 1 value creation)
- Market benchmark: $90,000-120,000 (typical 6-month engagement)
- **Recommended Price**: $125,000 (strong ROI for client, fair value capture)
- Client ROI: 560% in Year 1 ($700K value vs $125K investment)

### Scenario 2: Newsletter Revenue Forecasting

**Context**: 5-year revenue projection for {YOUR_BUSINESS_NAME}

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Create 5-year revenue forecast for subscription newsletter:

CURRENT STATE (from analytics dashboard):
- Paid subscribers: 1,600
- Monthly subscription: $10/month ($120/year if annual)
- Annual subscribers: 70% of base
- Monthly subscribers: 30% of base
- Current MRR: ~$16,000
- Annual growth rate (historical): 25%
- Churn rate: 5% annually

GROWTH ASSUMPTIONS:
Realistic Scenario:
- Year 1-2: 20% annual growth (momentum continues)
- Year 3-4: 15% annual growth (market saturation begins)
- Year 5: 10% annual growth (mature product)
- Churn: 5% annually
- Pricing: No increase Years 1-2, +10% Year 3, +5% Years 4-5

Optimistic Scenario:
- Year 1-2: 30% annual growth (viral growth)
- Year 3-4: 25% annual growth (strong word of mouth)
- Year 5: 20% annual growth (sustained momentum)
- Churn: 3% annually (improved retention)
- Pricing: +10% Year 2, +10% Year 4

Pessimistic Scenario:
- Year 1-2: 10% annual growth (competitive pressure)
- Year 3-4: 5% annual growth (market challenges)
- Year 5: 0% growth (plateau)
- Churn: 8% annually (increased competition)
- Pricing: No increases (maintain competitiveness)

Calculate for each scenario:
1. Subscriber count by year
2. MRR and ARR by year
3. Lifetime Value (LTV) of subscriber
4. Customer Acquisition Cost sensitivity
5. 5-year cumulative revenue
6. NPV of revenue stream (10% discount rate)

Show all formulas and present in comparison table."
```

**Expected Output:**
```markdown
### 5-Year Newsletter Revenue Forecast

#### Subscriber Growth
| Year | Pessimistic | Realistic | Optimistic |
|------|-------------|-----------|------------|
| 2025 | 1,600 | 1,600 | 1,600 |
| 2026 | 1,728 | 1,920 | 2,080 |
| 2027 | 1,805 | 2,208 | 2,600 |
| 2028 | 1,884 | 2,539 | 3,250 |
| 2029 | 1,968 | 2,920 | 3,900 |
| 2030 | 1,968 | 3,212 | 4,680 |

#### Annual Revenue
| Year | Pessimistic | Realistic | Optimistic |
|------|-------------|-----------|------------|
| 2025 | $192,000 | $192,000 | $192,000 |
| 2026 | $207,360 | $230,400 | $249,600 |
| 2027 | $216,600 | $290,304 | $341,600 |
| 2028 | $226,080 | $363,581 | $475,800 |
| 2029 | $236,160 | $430,752 | $640,640 |
| 2030 | $236,160 | $510,515 | $872,640 |

#### 5-Year Metrics
| Metric | Pessimistic | Realistic | Optimistic |
|--------|-------------|-----------|------------|
| Cumulative Revenue | $1.31M | $2.02M | $2.78M |
| NPV (10% discount) | $1.05M | $1.62M | $2.23M |
| Average Subscriber | 1,859 | 2,480 | 3,222 |
| Revenue CAGR | 4.2% | 21.6% | 35.3% |
```

### Scenario 3: Hire vs. Contract Analysis

**Context**: Evaluating cost/benefit of hiring full-time vs. continuing contractor relationships

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Compare financial impact of hiring full-time employee vs. contractor:

ROLE: Senior Content Strategist

CONTRACTOR MODEL (Current):
- Hourly rate: $150/hour
- Hours per month: 40 hours
- Monthly cost: $6,000
- Annual cost: $72,000
- Benefits: None (contractor provides)
- Flexibility: High (can scale up/down)
- Onboarding: Minimal
- Institutional knowledge: Lower

FULL-TIME EMPLOYEE MODEL:
- Base salary: $120,000/year
- Benefits (health, 401k, etc.): 25% of salary = $30,000
- Payroll taxes: 10% of salary = $12,000
- Equipment/software: $5,000/year
- Recruiting costs: $15,000 (one-time)
- Onboarding time: 3 months (reduced productivity)
- Total Year 1 cost: $182,000
- Total ongoing annual cost: $167,000

VALUE CONSIDERATIONS:
- Full-time dedication and availability
- Deeper institutional knowledge
- Better long-term planning alignment
- Potential for higher quality output
- Cultural fit and team cohesion

RISK FACTORS:
- Commitment (harder to scale down)
- Fixed cost vs. variable cost
- Wrong hire risk
- Market salary changes

Calculate:
1. 3-year total cost comparison (with recruiting amortized)
2. Break-even analysis (at what utilization does FTE make sense?)
3. Productivity assumptions (how much more valuable is FTE?)
4. Risk-adjusted NPV for both scenarios
5. Sensitivity to utilization changes
6. Recommendation with decision criteria

Use 10% discount rate for NPV calculations."
```

**Expected Output:**
- **3-Year Contractor Cost**: $216,000 (straight $72K/year)
- **3-Year FTE Cost**: $516,000 ($182K + $167K + $167K)
- **Break-even Point**: FTE needs to deliver 2.4x contractor value to justify cost
- **Recommendation**: Depends on utilization and strategic value

### Scenario 4: Benefits Optimization Analysis

**Context**: Maximizing value from Amex Platinum Card benefits

**Gemini 3 Pro Prompt:**
```bash
llm -m gemini-3-pro-preview "Optimize usage of Amex Platinum Card benefits to maximize value:

ANNUAL BENEFITS AVAILABLE:
- Hotel Credit: $600 (semi-annual, $300 × 2)
- Airline Fee Credit: $200
- Uber Cash: $200 ($15/month + $20 in December)
- Digital Entertainment: $240 ($20/month)
- Equinox Credit: $300 ($25/month)
- CLEAR Credit: $189 (annual)
- Saks Fifth Avenue: $100 (semi-annual, $50 × 2)
- Total Annual Benefits: $1,829

ANNUAL FEE:
- $695/year

CURRENT USAGE ESTIMATE:
- Hotel Credit: 80% utilized ($480)
- Airline Fee: 50% utilized ($100)
- Uber Cash: 60% utilized ($120)
- Digital Entertainment: 40% utilized ($96)
- Equinox: 0% utilized ($0)
- CLEAR: 100% utilized ($189)
- Saks: 20% utilized ($20)
- Current Total Value: $1,005
- Current Net Value: $310 ($1,005 - $695 fee)

OPTIMIZATION SCENARIOS:

Scenario 1 - Current (Low Effort):
[current usage as above]

Scenario 2 - Moderate Optimization:
- Hotel: 100% ($600) - plan travel around benefit
- Airline: 100% ($200) - use for seat upgrades, bags
- Uber: 80% ($160) - more Uber Eats usage
- Digital Entertainment: 100% ($240) - optimize subscriptions
- Equinox: 0% ($0) - not aligned with lifestyle
- CLEAR: 100% ($189)
- Saks: 50% ($50) - intentional purchases
- Total: $1,439

Scenario 3 - Maximum Optimization:
- Hotel: 100% ($600)
- Airline: 100% ($200)
- Uber: 100% ($200)
- Digital Entertainment: 100% ($240)
- Equinox: 50% ($150) - occasional guest passes for Bunny
- CLEAR: 100% ($189)
- Saks: 100% ($100)
- Total: $1,679

Calculate:
1. Net value for each scenario (benefits minus $695 fee)
2. Effort required for each optimization level
3. Lifestyle alignment score
4. Recommendations for benefit stacking
5. Comparison to alternative credit cards
6. Decision framework: Keep vs. Downgrade vs. Switch

Present as cost-benefit analysis with clear recommendation."
```

**Expected Output:**
```markdown
### Amex Platinum Benefits Optimization Analysis

#### Scenario Comparison
| Scenario | Benefits Used | Net Value | Effort Level | Recommendation |
|----------|---------------|-----------|--------------|----------------|
| Current | $1,005 | $310 | Low | Underutilized |
| Moderate | $1,439 | $744 | Medium | **Recommended** |
| Maximum | $1,679 | $984 | High | Diminishing returns |

#### Key Recommendations
1. **Digital Entertainment ($240)**: Switch to eligible subscriptions (NYT, Audible, etc.) - 100% achievable
2. **Hotel Credit ($600)**: Book refundable hotel stays every 6 months, even if plans change
3. **Uber Cash ($200)**: Use for Uber Eats regularly - easy to maximize
4. **Airline Fee ($200)**: Pre-pay baggage fees or use for seat upgrades
5. **Saks ($100)**: Schedule two $50 purchases semi-annually (June/December)

#### Decision Framework
- **Keep Card**: If achieving $1,200+ in annual benefits (net value $500+)
- **Current Moderate Path**: Achieves $1,439 in benefits (net value $744)
- **ROI**: 107% return on annual fee with moderate optimization
- **Verdict**: **KEEP and optimize to Moderate level**
```

## Integration with Business Skill Components

### Consulting Services
- **Use for**: Proposal pricing, ROI justification for clients
- **Integration**: `Workflows/consulting/create-document.md`
- **Value**: Back consulting proposals with solid financial models

### Hormozi Frameworks
- **Use for**: Value equation pricing, guarantee calculations
- **Integration**: `Workflows/hormozi/pitch-framework.md`
- **Value**: Quantify irresistible offers with financial backing

### Financial Management
- **Use for**: Revenue forecasting, expense optimization
- **Integration**: `Workflows/finances/get-state.md`
- **Value**: Strategic financial planning beyond transaction tracking

### Benefits Tracking
- **Use for**: Benefits optimization, ROI on subscriptions
- **Integration**: `Workflows/benefits/benefits-guide.md`
- **Value**: Maximize financial value from benefits and subscriptions

### Project Management
- **Use for**: Feature ROI analysis, build vs. buy decisions
- **Integration**: `Workflows/project-management/add-linear-ticket.md`
- **Value**: Prioritize features based on financial impact

## Best Practices

### 1. Always Show Formulas
Gemini 3 Pro excels at showing mathematical reasoning. Request:
```
"Show all formulas, calculation steps, and reasoning"
```

### 2. Use Markdown Tables
Financial data is easier to read in tables:
```
"Present results in markdown tables for easy visualization"
```

### 3. Three-Scenario Analysis
Always model optimistic, realistic, pessimistic scenarios

### 4. Sensitivity Analysis
Identify which variables matter most to outcomes

### 5. Document Assumptions
Make all assumptions explicit and testable

### 6. Validate with Historical Data
Compare projections to historical performance when available

### 7. Include Risk Assessment
Quantify risks and mitigation strategies

### 8. Decision Frameworks
Provide clear criteria for decision-making (go/no-go thresholds)

## Technical Details

### LLM Command Pattern
```bash
llm -m gemini-3-pro-preview "[detailed financial modeling prompt]"
```

### Model Advantages
- **Model ID**: `gemini-3-pro-preview` (via Simon Willison's LLM)
- **Math Accuracy**: 95-100% on AIME 2025 (competition-level math)
- **Reasoning**: Deep thinking for complex financial scenarios
- **Context**: Large window for comprehensive analysis

### Output Format
- Markdown tables for financial data
- Clear section headers
- Formula transparency
- Actionable recommendations

## Example Complete Workflow

**User Request**: "Help me decide if I should hire a full-time editor or keep using contractors"

**Step 1**: Gather context
- Current contractor costs and utilization
- Potential FTE salary and benefits
- Quality/productivity considerations

**Step 2**: Build financial model with Gemini 3 Pro
```bash
llm -m gemini-3-pro-preview "[complete hire vs contract analysis prompt]"
```

**Step 3**: Review output
- 3-year cost comparison
- Break-even analysis
- Sensitivity to utilization
- Risk factors

**Step 4**: Make decision
- Based on financial model + strategic considerations
- Document decision in `Workflows/project-management/decisions.md`

**Step 5**: Execute
- If hiring: Create job description, post role
- If contracting: Optimize contractor relationships

---

**Key Principle**: Financial decisions deserve mathematical precision. Gemini 3 Pro's 95-100% math accuracy ensures your financial models are reliable, comprehensive, and decision-ready.
