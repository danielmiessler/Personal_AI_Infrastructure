# LEARN Phase

**Purpose:** OUTPUT results for user to evaluate. User rates outputs for the memory system.

**ISC Mutation:** ARCHIVE completed ISC, output results

**Gate Question:** Have I provided everything the user needs to evaluate the work?

**CRITICAL:** NO SELF-RATING. The assistant does NOT rate its own work. User rates outputs for the memory system.

## What Happens

1. **Output final ISC** - Show completed state with all capabilities and statuses
2. **Present deliverables** - Show what was produced
3. **Document capability usage** - What capabilities were used and how they performed
4. **Archive or iterate** - Complete if successful, iterate if blocked

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
- Let user evaluate and rate for memory

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

## For Memory System

User: Please rate this work for the memory system.
```

## Learning Categories

| Category | What to Document | For |
|----------|------------------|-----|
| **Capability Usage** | Which capabilities were effective? | Future task planning |
| **Process** | What phases were hard? Easy? | Algorithm improvement |
| **Estimation** | Was effort level accurate? | Calibration |

## Review the Evolution

```bash
# View the full evolution log
bun run ISCManager.ts log

# View final ISC state
bun run ISCManager.ts show -o markdown

# Get summary statistics
bun run ISCManager.ts summary
```

## Document Capability Usage

For each capability used, note:
- **What capability:** e.g., `research.perplexity`, `execution.engineer`
- **What it did:** Brief description of how it was used
- **Effectiveness:** Did it work well for this task?

This helps improve future capability selection.

## Iteration Decision

| Outcome | Action |
|---------|--------|
| All rows PASS/ADJUSTED | Archive ISC, output for user |
| Some rows BLOCKED | Iterate - return to appropriate phase |
| Scope fundamentally wrong | Iterate from OBSERVE |

**Iteration flow:**
```
BLOCKED in verification
    ↓
Analyze blockers
    ↓
If implementation issue → Return to EXECUTE
If plan issue → Return to PLAN
If requirements issue → Return to THINK
If scope issue → Return to OBSERVE
    ↓
Increment iteration counter
    ↓
Re-run from that phase
```

## Archive Completed Work

```bash
# Archive the ISC (saves to archive, clears current)
bun run ISCManager.ts clear

# This creates: $PAI_DIR/MEMORY/Work/archive-{timestamp}.json
```

## Example Output

**Request:** "Add logout button to navbar"
**Effort:** STANDARD | **Iterations:** 1

**ISC Final State:**
- 7 rows total
- 6 PASS, 1 ADJUSTED
- 2 parallel execution groups

**Capabilities Used:**
| Capability | Result | Notes |
|------------|--------|-------|
| execution.engineer×2 | Success | Parallel UI tasks |
| execution.qa_tester | Success | Caught mobile issue |
| verification.browser | Success | Visual verification |

**Deliverables:**
- Logout button component in `components/LogoutButton.tsx`
- Updated navbar with logout integration
- Tests passing, browser-verified

**For Memory System:**
User: Please rate this work for the memory system.

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p LEARN

# Start new iteration (if needed)
bun run ISCManager.ts iterate

# Archive completed ISC
bun run ISCManager.ts clear
```

## Exit Criteria

**If successful:**
- Final ISC displayed with capabilities
- Deliverables presented
- Capability usage documented
- Ready for user's evaluation

**If iterating:**
- Blockers analyzed
- Return phase identified
- Iteration counter incremented
- Ready to re-enter earlier phase
