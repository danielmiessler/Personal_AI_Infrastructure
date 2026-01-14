# LEARN Phase

**Purpose:** OUTPUT results for user to evaluate AND capture learnings for the memory system.

**ISC Mutation:** ARCHIVE completed ISC, output results, capture learnings

**Gate Question:** Have I provided everything the user needs to evaluate the work AND captured learnings?

**CRITICAL:** NO SELF-RATING. The assistant does NOT rate its own work. User rates outputs for the memory system.

## What Happens

1. **Output final ISC** - Show completed state with all capabilities and statuses
2. **Present deliverables** - Show what was produced
3. **Capture learnings** - Extract and persist insights (AUTOMATED)
4. **Record signals** - Track patterns, failures, loopbacks (AUTOMATED)
5. **Archive or iterate** - Complete if successful, iterate if blocked

## Learning Capture (NEW - AUTOMATED)

The LEARN phase now automatically captures learnings using the new tools:

### Quick Commands

```bash
# Full learning capture (RECOMMENDED - does everything)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts learn

# Or individual tools:

# 1. Capture learnings from ISC
bun run $PAI_DIR/skills/THEALGORITHM/Tools/LearningCapture.ts capture

# 2. Record task completion
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts complete -w "task name" -i 1 --success

# 3. Analyze patterns
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts analyze

# 4. Complete work item
bun run $PAI_DIR/skills/THEALGORITHM/Tools/WorkItemManager.ts complete --success -s "summary"
```

### What Gets Captured

| Type | Location | Description |
|------|----------|-------------|
| **Capability Performance** | `MEMORY/Learning/EXECUTE/` | How well each capability performed |
| **Estimation Accuracy** | `MEMORY/Learning/PLAN/` | Was effort level appropriate? |
| **Patterns** | `MEMORY/Learning/ALGORITHM/` | Blocked/adjusted row patterns |
| **Session Summary** | `MEMORY/Learning/sessions/` | Markdown summary of the run |
| **Signals** | `MEMORY/Signals/patterns.jsonl` | Aggregated patterns for analysis |

### Signal Tracking

```bash
# Record a failure during VERIFY
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts failure \
  -w "Add auth" -c "tests pass" -e "all green" -o "3 failing"

# Record a loopback
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts loopback \
  -w "Add auth" --from VERIFY --to THINK -r "unclear requirements"

# Record user rating (after user feedback)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts rating \
  -w "Add auth" -s 4 -f "good work"
```

## NO Self-Rating

**DO NOT:**
- Rate your own work on a scale
- Assign "fidelity scores"
- Self-assess quality
- Grade your own performance

**DO:**
- Present the work clearly
- Show what was accomplished
- Document what capabilities were used
- Capture learnings automatically
- Let user evaluate and rate

## Output Format

Present results clearly for user to evaluate:

```markdown
## 🎯 FINAL ISC

**Request:** [original request]
**Effort:** [LEVEL] | **Iterations:** [count]

| # | What Ideal Looks Like | Source | Capability | Status |
|---|----------------------|--------|------------|--------|
| 1 | [row 1] | EXPLICIT | 🔬 perplexity | ✅ DONE |
| 2 | [row 2] | INFERRED | 🤖 engineer | ✅ DONE |
...

## Deliverables

[Present what was created/accomplished]

## Capability Performance

| Capability Used | Result | Notes |
|----------------|--------|-------|
| research.perplexity | Success | Found key patterns |
| execution.engineer | Success | Parallel tasks efficient |
...

## Learnings Captured

✅ [X] learnings automatically captured to MEMORY/Learning/
✅ [X] patterns analyzed and saved to MEMORY/Signals/
✅ [X] session summary created

## For Memory System

User: Please rate this work (1-5) for the memory system.
```

## Full LEARN Phase Workflow

```bash
# 1. Transition to LEARN phase
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase LEARN

# 2. Show final ISC
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts show -o markdown

# 3. Capture all learnings (AUTOMATED)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts learn

# 4. Present to user for rating

# 5. After user rates (if they do):
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts rating -w "task" -s [1-5] -f "feedback"

# 6. Archive ISC (also captures learnings if not done)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts clear
```

## Memory Locations

| Path | Purpose |
|------|---------|
| `$PAI_DIR/MEMORY/Learning/ALGORITHM/` | Algorithm-specific learnings |
| `$PAI_DIR/MEMORY/Learning/EXECUTE/` | Capability performance |
| `$PAI_DIR/MEMORY/Learning/PLAN/` | Estimation accuracy |
| `$PAI_DIR/MEMORY/Learning/sessions/` | Session summaries (markdown) |
| `$PAI_DIR/MEMORY/Signals/patterns.jsonl` | Aggregated patterns |
| `$PAI_DIR/MEMORY/Signals/failures.jsonl` | Failure records |
| `$PAI_DIR/MEMORY/Signals/loopbacks.jsonl` | Loopback records |
| `$PAI_DIR/MEMORY/Signals/ratings.jsonl` | User ratings |
| `$PAI_DIR/MEMORY/State/algorithm-stats.json` | Overall statistics |
| `$PAI_DIR/MEMORY/State/algorithm-streak.json` | Success streak |

## Viewing Learnings

```bash
# List recent learnings
bun run $PAI_DIR/skills/THEALGORITHM/Tools/LearningCapture.ts list -l 20

# Show learning statistics
bun run $PAI_DIR/skills/THEALGORITHM/Tools/LearningCapture.ts stats

# Show signal report
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts report

# Show algorithm stats
bun run $PAI_DIR/skills/THEALGORITHM/Tools/SignalCapture.ts stats
```

## Learning Categories

| Category | What to Document | For |
|----------|------------------|-----|
| **Capability Usage** | Which capabilities were effective? | Future task planning |
| **Process** | What phases were hard? Easy? | Algorithm improvement |
| **Estimation** | Was effort level accurate? | Calibration |
| **Patterns** | What patterns emerge? | Long-term optimization |

## Iteration Decision

| Outcome | Action |
|---------|--------|
| All rows PASS/ADJUSTED | Capture learnings, archive ISC, output for user |
| Some rows BLOCKED | Iterate - return to appropriate phase |
| Scope fundamentally wrong | Iterate from OBSERVE |

**Iteration flow:**
```
BLOCKED in verification
    ↓
Record failure signal
    ↓
Analyze blockers
    ↓
If implementation issue → Return to EXECUTE
If plan issue → Return to PLAN
If requirements issue → Return to THINK
If scope issue → Return to OBSERVE
    ↓
Record loopback signal
    ↓
Increment iteration counter
    ↓
Re-run from that phase
```

## Exit Criteria

**If successful:**
- Final ISC displayed with capabilities
- Deliverables presented
- ✅ Learnings captured to MEMORY/Learning/
- ✅ Signals recorded to MEMORY/Signals/
- ✅ Session summary created
- Ready for user's evaluation

**If iterating:**
- Blockers analyzed
- Failure signals recorded
- Loopback signals recorded
- Return phase identified
- Iteration counter incremented
- Ready to re-enter earlier phase
