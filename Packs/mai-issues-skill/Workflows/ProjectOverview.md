# ProjectOverview Workflow

**Purpose:** Generate a high-level summary of project or sprint status including issue counts, progress metrics, and blockers.

**Triggers:** "project status", "sprint progress", "how's the project going", "status report", "project summary", "what's the state of"

---

## Steps

1. **Identify project scope:**
   - Specific project/notebook
   - All projects (dashboard view)
   - Current sprint (if supported)

2. **Gather metrics:**
```bash
bun run Tools/list.ts --project <id> --format json
```

3. **Calculate statistics:**
   - Total issues by status
   - Completion percentage
   - Priority breakdown
   - Recently completed/created

4. **Identify concerns:**
   - Overdue items
   - Blocked issues
   - High priority backlog

5. **Present formatted summary**

---

## Examples

**Example 1: Single project overview**
```
User: "What's the status of the infrastructure project?"

Process:
1. Run: bun run Tools/list.ts --project infrastructure --format json
2. Calculate: totals by status, priority distribution
3. Return:

   Infrastructure Project Status
   ==============================

   Progress: 65% complete (13/20 issues)

   | Status       | Count |
   |--------------|-------|
   | Done         | 13    |
   | In Progress  | 3     |
   | Open         | 4     |

   Priority Breakdown:
   - Urgent: 0
   - High: 2 (1 in progress, 1 open)
   - Medium: 12
   - Low: 6

   Current Focus:
   - [IN PROGRESS] ISS-42: Update firewall rules
   - [IN PROGRESS] ISS-45: Migrate DNS to new provider
   - [IN PROGRESS] ISS-48: Configure monitoring alerts

   Attention Needed:
   - 1 high-priority item in backlog: ISS-50 "Security audit"
```

**Example 2: Sprint status**
```
User: "How's the current sprint going?"

Process:
1. Identify current sprint (from context or config)
2. Run: bun run Tools/list.ts --project <sprint-id> --format json
3. Return:

   Sprint 23 Status (ends in 5 days)
   ==================================

   Velocity: 8/12 points completed (67%)

   Burndown:
   - Day 1-5: On track
   - Day 6-8: Slight delay
   - Current: 4 points remaining, 5 days left

   Done (8):
   - ISS-101: User authentication flow
   - ISS-102: Password reset feature
   - ...

   In Progress (2):
   - ISS-105: Payment integration (2 pts)
   - ISS-106: Email notifications (1 pt)

   At Risk:
   - ISS-107: Admin dashboard (3 pts) - not started
```

**Example 3: All projects dashboard**
```
User: "Give me a project overview"

Process:
1. Get all projects
2. For each, gather summary metrics
3. Return:

   Projects Dashboard
   ==================

   | Project        | Open | In Progress | Done | Health |
   |----------------|------|-------------|------|--------|
   | Infrastructure | 4    | 3           | 13   | Good   |
   | Backend API    | 12   | 2           | 8    | Warning|
   | Mobile App     | 6    | 4           | 22   | Good   |
   | Documentation  | 15   | 0           | 3    | Stale  |

   Needs Attention:
   - Backend API: 12 open issues, only 2 in progress
   - Documentation: No active work, 15 items waiting
```

**Example 4: Workshop-specific status**
```
User: "workshop: infrastructure - what's my status?"

Process:
1. Load infrastructure workshop context
2. Run: bun run Tools/list.ts --project infrastructure --format json
3. Include context from workshop (current focus, blockers)
4. Return:

   Infrastructure Workshop Status
   ==============================

   Active Tasks: 3
   Backlog: 4 items

   Currently Working On:
   - Firewall rules update (high priority)
   - DNS migration planning

   Quick Wins Available:
   - ISS-55: Update documentation (low, 15min)
   - ISS-57: Archive old configs (low, 10min)

   Blocked:
   - ISS-52: Waiting on vendor response for license key
```

**Example 5: Type-specific overview**
```
User: "What bugs do we have outstanding?"

Process:
1. Run: bun run Tools/list.ts --type bug --status open --format json
2. Also get in_progress bugs
3. Return:

   Bug Status Report
   =================

   Total Open Bugs: 7
   In Progress: 2

   By Priority:
   - Urgent: 0
   - High: 3
   - Medium: 4
   - Low: 2

   Oldest Bugs (needs attention):
   - BUG-12: Created 30 days ago - Mobile auth failure
   - BUG-15: Created 25 days ago - Report export issue

   Recently Fixed (last 7 days):
   - BUG-45: Database timeout (fixed yesterday)
   - BUG-43: CSS layout issue (fixed 3 days ago)
```

---

## CLI Reference

```bash
# Get all issues for analysis
bun run Tools/list.ts --project <id> --format json

# Get by status for counts
bun run Tools/list.ts --status open --project <id> --format json
bun run Tools/list.ts --status in_progress --project <id> --format json
bun run Tools/list.ts --status done --project <id> --format json

# Health check for connectivity
bun run Tools/health.ts
```

---

## Metrics Calculated

| Metric | Calculation |
|--------|-------------|
| Completion % | done / (open + in_progress + done) * 100 |
| Health | Based on in_progress ratio and priority balance |
| Velocity | Points completed per time period (if supported) |
| Age | Days since creation for oldest open items |

---

## Health Indicators

| Status | Criteria |
|--------|----------|
| Good | Active work, balanced priority, no urgent items stuck |
| Warning | High priority items not in progress, low velocity |
| Stale | No in_progress items, no recent completions |
| Critical | Urgent items open, nothing moving |

---

## Error Handling

- Project not found -> "Project '<id>' not found. Available projects: [list]"
- No issues in project -> "Project '<name>' has no issues. Create one with the CreateIssue workflow."
- Backend unavailable -> "Cannot connect to issue tracker. Run `bun run Tools/health.ts` to diagnose."

---

## Presentation Options

### Summary View (default)
Quick stats with top concerns.

### Detailed View
Full breakdown with all issues listed.

### Comparison View
Compare two time periods or sprints.

```
User: "Compare this sprint to last sprint"

Sprint 23 vs Sprint 22:
- Velocity: 12 pts vs 10 pts (+20%)
- Bugs fixed: 5 vs 3
- Completion: 85% vs 90%
```

---

## Notes

- For Joplin backend, "project" maps to notebook
- Sprint tracking requires backend support (Linear, Jira) or manual sprint tagging
- Health status is heuristic-based and should be refined based on team patterns
- Combine with workshop context for personalized status reports
- Use `--format json` output for custom analysis or dashboards
