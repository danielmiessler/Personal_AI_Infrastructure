# Dashboard Workflow

**Purpose:** Generate a visual HTML dashboard showing budget status, trends, and projections.

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Generating budget dashboard"}' \
  > /dev/null 2>&1 &
```

---

## Steps

### Step 1: Gather Data

1. Read `~/.claude/BUDGET/config.yaml`
2. Read `~/.claude/BUDGET/usage.jsonl` (all records)
3. Calculate all metrics from Status workflow
4. Aggregate daily/weekly/monthly trends

### Step 2: Generate Dashboard

Run the dashboard tool:
```bash
bun run ~/.claude/skills/BudgetMonitor/Tools/Dashboard.ts
```

### Step 3: Open Dashboard

```bash
# Open in default browser
xdg-open ~/.claude/BUDGET/dashboard.html 2>/dev/null || \
open ~/.claude/BUDGET/dashboard.html 2>/dev/null || \
echo "Dashboard generated at ~/.claude/BUDGET/dashboard.html"
```

---

## Dashboard Sections

### 1. Header
- Current month/year
- Plan name
- Overall status indicator (🟢/🟡/🟠/🔴)

### 2. Budget Gauge
- Visual progress bar/gauge
- Current spend vs limit
- Projected end-of-month

### 3. Daily Spending Chart
- Bar chart of daily costs
- 7-day moving average line
- Budget pace line (ideal daily spend)

### 4. Usage Breakdown
- By skill (which skills cost most)
- By time of day (when do we use most)
- By rating (cost vs quality correlation)

### 5. Projections
- Current trajectory vs budget
- Days of runway remaining
- Recommendations

### 6. Historical Comparison
- This month vs last month
- Trend direction

### 7. Phase 2 Preview (if enabled)
- Cost per high rating
- Value metrics
- ROI estimates

---

## Dashboard Design

```html
<!-- Color scheme aligned with PAI branding -->
:root {
  --pai-blue: #3B82F6;
  --pai-dark: #1E3A5F;
  --pai-light: #93C5FD;
  --status-green: #22C55E;
  --status-yellow: #EAB308;
  --status-orange: #F97316;
  --status-red: #EF4444;
}
```

---

## Output

- **File:** `~/.claude/BUDGET/dashboard.html`
- **Auto-refresh:** Dashboard includes meta refresh every 5 minutes
- **Mobile-friendly:** Responsive design for phone viewing
