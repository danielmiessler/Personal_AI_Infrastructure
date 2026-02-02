---
name: BudgetMonitor
description: Resource consciousness system for AI cost tracking and budget management. USE WHEN user asks about budget, usage, costs, spending, or resource consumption.
---

# BudgetMonitor Skill

Resource consciousness system for PAI. Tracks AI service usage and costs to enable financial awareness and intelligent resource management.

**Domain**: Resource management, cost tracking, financial planning
**Triggers**: "budget", "usage", "costs", "spending", "how much", "resource"

---

## Philosophy

> "A cat that doesn't know how much it eats can never hunt for itself."

BudgetMonitor implements resource consciousness - the foundation for intelligent AI usage. It's not just about tracking costs; it's about building awareness that enables better decisions.

**The Journey:**
1. **Visibility** (Now): See what we consume
2. **Intelligence** (Next): Understand cost vs value
3. **Consciousness** (Future): Make resource-aware decisions
4. **Optimization** (Goal): Maximize value per dollar spent

---

## Quick Reference

### Check Current Status
```
"What's my budget status?"
"How much have I spent this month?"
"Show usage"
```

### Generate Dashboard
```
"Show budget dashboard"
"Generate usage dashboard"
```

### Track Session
```
"Log this session usage"
"Record session costs"
```

---

## Data Architecture

```
~/.claude/BUDGET/
├── config.yaml      # Budget limits, alert thresholds
├── TRACKER.md       # Human-readable current state
├── usage.jsonl      # Session-by-session usage log
└── history/         # Monthly archives
    └── 2026-01.jsonl
```

### Usage Record Schema

```json
{
  "timestamp": "2026-01-30T14:30:00Z",
  "session_id": "abc123",
  "duration_minutes": 45,
  "messages": 23,
  "tokens_estimated": {
    "input": 46000,
    "output": 92000
  },
  "cost_estimated": 8.55,
  "rating": 9,
  "tasks_completed": 3,
  "skills_used": ["Research", "BeCreative", "BudgetMonitor"]
}
```

### Config Schema (config.yaml)

```yaml
budget:
  monthly_limit: 100.00  # USD
  currency: "USD"

alerts:
  caution: 70    # 70% of budget
  warning: 85    # 85% of budget
  critical: 95   # 95% of budget

services:
  claude:
    sonnet-4:
      input_per_million: 3.00
      output_per_million: 15.00
    opus-4:
      input_per_million: 15.00
      output_per_million: 75.00
    haiku:
      input_per_million: 0.80
      output_per_million: 4.00

  # Add other AI services as needed
  chatgpt:
    gpt-4:
      input_per_million: 30.00
      output_per_million: 60.00
```

---

## Alert Levels

| Level | Threshold | Indicator | Action |
|-------|-----------|-----------|--------|
| 🟢 Normal | < 70% | All good | Continue normally |
| 🟡 Caution | 70-85% | Budget awareness | Monitor usage |
| 🟠 Warning | 85-95% | Active concern | Consider optimization |
| 🔴 Critical | > 95% | Budget exhausted | Restrict non-essential |

---

## Workflow Routing

| Workflow | Triggers | Description |
|----------|----------|-------------|
| `Workflows/Status.md` | "budget status", "usage", "how much spent" | Current budget state |
| `Workflows/Dashboard.md` | "budget dashboard", "show dashboard" | Generate visual HTML dashboard |
| `Workflows/TrackSession.md` | "track session", "log usage" | Record session usage |
| `Workflows/DailyReport.md` | "daily budget", "usage report" | Daily summary |

---

## Tools

| Tool | Purpose |
|------|---------|
| `Tools/Dashboard.ts` | Generate HTML dashboard |
| `Tools/TrackSession.ts` | Record session usage |
| `Tools/CalculateBudget.ts` | Compute budget metrics |

---

## Examples

**Example 1: Quick status check**
```
User: "What's my budget looking like?"
→ Status workflow
→ Returns: "🟢 $45.20 spent of $100 (45.2%), 15 days remaining, on track"
```

**Example 2: Deep dive**
```
User: "Show me the budget dashboard"
→ Dashboard workflow
→ Generates HTML at ~/.claude/BUDGET/dashboard.html
→ Opens in browser with:
  - Daily usage trends
  - Service breakdown
  - Alert level visualization
  - Projection to month end
```

**Example 3: Session tracking**
```
User: "Log this session usage"
→ TrackSession workflow
→ Calculates tokens from session history
→ Appends to usage.jsonl
→ Updates TRACKER.md
```

---

## Integration Patterns

### Manual Tracking
After each significant session:
```bash
# Track current session
cd ~/.claude/skills/BudgetMonitor
bun run Tools/TrackSession.ts
```

### Automatic Tracking (Recommended)
Add to your session-end workflow/hook:
```bash
# In hooks or session-end processing
bun run ~/.claude/skills/BudgetMonitor/Tools/TrackSession.ts
```

### Morning Brief Integration
Include budget status in daily summaries:
```markdown
### Budget Status
Read ~/.claude/BUDGET/TRACKER.md for current state
Include alert level if > 70%
```

---

## Implementation Roadmap

### Phase 1: Visibility (Current)
- [x] Budget configuration schema
- [x] Usage tracking schema
- [x] Human-readable tracker (TRACKER.md)
- [ ] Dashboard generation (HTML/charts)
- [ ] Workflow implementations
- [ ] Tool implementations

### Phase 2: Intelligence (Future)
- [ ] Track user ratings per session
- [ ] Calculate cost-per-high-rating
- [ ] Identify high-ROI patterns
- [ ] Value-based reporting

### Phase 3: Consciousness (Future)
- [ ] Resource state awareness in responses
- [ ] Resource-aware decision making
- [ ] Automatic usage optimization
- [ ] Smart model selection (Haiku vs Sonnet vs Opus)

### Phase 4: Optimization (Future)
- [ ] Predictive budget management
- [ ] Cost-benefit analysis per task type
- [ ] Automatic throttling recommendations
- [ ] Multi-month trend analysis

---

## File Organization

| Path | Purpose |
|------|---------|
| `SKILL.md` | Skill documentation (this file) |
| `Workflows/Status.md` | Budget status workflow |
| `Workflows/Dashboard.md` | Dashboard generation workflow |
| `Workflows/TrackSession.md` | Session tracking workflow |
| `Workflows/DailyReport.md` | Daily summary workflow |
| `Tools/Dashboard.ts` | Dashboard generator |
| `Tools/TrackSession.ts` | Session logger |
| `Tools/CalculateBudget.ts` | Budget calculator |

---

## Benefits

**Visibility:**
- Know exactly how much you're spending
- Track trends over time
- Identify expensive patterns

**Control:**
- Set budget limits
- Get alerts before overspending
- Make informed decisions about model selection

**Intelligence:**
- Understand which tasks cost most
- Optimize for value vs cost
- Plan resource usage effectively

**Foundation:**
- Builds awareness needed for autonomous AI
- Enables resource-conscious decision making
- Prepares for future value generation capabilities

---

## Design Principles

**Simplicity:**
- YAML configuration (easy to edit)
- JSONL logs (append-only, grep-friendly)
- Markdown tracker (human-readable)
- No database required

**Privacy:**
- All data stored locally
- No external services
- User controls all data

**Extensibility:**
- Easy to add new AI services
- Simple to customize alert thresholds
- Workflow-based architecture

**Integration:**
- Works with any PAI configuration
- Hooks-compatible
- Skill-routing compatible

---

## Changelog

### 2026-01-30 - v1.0.0
- Initial creation with core tracking architecture
- Budget configuration schema
- Usage logging schema
- Alert level system
- Workflow routing structure
- Tool specifications

---

*Part of PAI v2.5 resource consciousness initiative*
