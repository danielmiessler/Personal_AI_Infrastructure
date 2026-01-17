# Analyze Workflow

**Analyze reports for trends and insights across vendors and categories.**

---

## Trigger Words

- "analyze annual reports"
- "analyze security reports"
- "analyze [topic] reports"
- "what do reports say about [topic]"
- "trends in security reports"

---

## Steps

### Step 1: Identify Analysis Scope

Ask user what they want to analyze:
- Specific topic (ransomware, cloud security, etc.)
- Specific vendor (CrowdStrike, Microsoft, etc.)
- Specific category (threat intelligence, surveys, etc.)
- Cross-vendor comparison

### Step 2: Gather Relevant Reports

Use ListSources tool to find relevant reports:

```bash
# Search by topic
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --search [topic]

# Search by vendor
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --vendor [vendor]

# List category
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts [category]
```

### Step 3: Fetch Report Summaries

For each relevant report, fetch landing page:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts [vendor] [report]
```

### Step 4: Synthesize Findings

Analyze fetched content and synthesize findings:

1. **Common themes** - What do multiple vendors agree on?
2. **Key statistics** - Notable numbers across reports
3. **Divergent views** - Where do vendors disagree?
4. **Emerging trends** - New topics appearing this year
5. **Recommendations** - Common advice across reports

### Step 5: Generate Analysis Report

Create analysis document with:

```markdown
# [Topic] Analysis - Annual Security Reports [Year]

## Executive Summary
[Key findings in 3-5 bullet points]

## Vendor Consensus
[What most vendors agree on]

## Key Statistics
| Statistic | Source | Value |
|-----------|--------|-------|
| [stat] | [vendor] | [value] |

## Emerging Trends
[New themes appearing across reports]

## Divergent Views
[Where vendors disagree]

## Recommendations
[Common advice from reports]

## Sources
- [Report 1 - Vendor]
- [Report 2 - Vendor]
```

---

## Analysis Templates

### Topic Analysis
```
User: "Analyze ransomware trends from annual reports"
1. Search for ransomware-related reports
2. Identify analysis and survey reports separately
3. Extract statistics, trends, recommendations
4. Synthesize cross-vendor findings
```

### Vendor Comparison
```
User: "Compare what CrowdStrike and Microsoft say about threats"
1. Fetch both vendors' threat reports
2. Compare threat actor rankings
3. Compare attack vector assessments
4. Note agreements and disagreements
```

### Industry Assessment
```
User: "What do reports say about healthcare security?"
1. Search sector-specific intelligence category
2. Find healthcare-focused reports
3. Analyze healthcare threat landscape
4. Compile compliance and recommendation themes
```

---

## Output Format

Report to user with structured analysis:

```
📊 Annual Reports Analysis: [Topic]

**Reports Analyzed:** [count] from [vendor count] vendors

**Key Findings:**
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

**Statistics Snapshot:**
- [Stat 1]: [value]
- [Stat 2]: [value]

**Vendor Consensus:**
[What vendors agree on]

**Notable Divergence:**
[Where vendors disagree]

**Sources:**
- [Report 1]
- [Report 2]
```
