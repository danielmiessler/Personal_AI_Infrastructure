# PLAN Phase

**Purpose:** ORDER ISC rows for execution.

**ISC Mutation:** ORDER rows (sequence, mark parallel)

**Gate Question:** Dependencies mapped? Know the sequence?

## What Happens

1. **Identify dependencies** - What must happen before what?
2. **Mark parallel rows** - Which can run simultaneously?
3. **Determine sequence** - Order for execution
4. **Identify blockers** - What could block progress?

## Parallelization Rules

Mark rows with `[P]` if they:
- Don't depend on other rows' output
- Don't modify the same files
- Can be verified independently

**Example parallel groups:**
- Research tasks (different topics)
- Independent file changes
- Separate test suites

**Example sequential dependencies:**
- Implementation → Tests → Deployment
- Create file → Modify file → Verify file

## Example

**Before PLAN:**
| # | What Ideal Looks Like | Source | Parallel |
|---|------------------------|--------|----------|
| 1 | Logout button in navbar | EXPLICIT | ? |
| 2 | Clicking logs out and redirects | EXPLICIT | ? |
| 3 | Uses TypeScript | INFERRED | ? |
| 4 | Handles failure gracefully | INFERRED | ? |
| 5 | CSRF protection | IMPLICIT | ? |
| 6 | Tests pass | IMPLICIT | ? |
| 7 | Browser-verified | IMPLICIT | ? |

**After PLAN:**
| # | What Ideal Looks Like | Source | Parallel | Order |
|---|------------------------|--------|----------|-------|
| 3 | Uses TypeScript | INFERRED | ✓ | 1 |
| 5 | CSRF protection | IMPLICIT | ✓ | 1 |
| 1 | Logout button in navbar | EXPLICIT | ✓ | 2 |
| 4 | Handles failure gracefully | INFERRED | ✓ | 2 |
| 2 | Clicking logs out and redirects | EXPLICIT | - | 3 |
| 6 | Tests pass | IMPLICIT | - | 4 |
| 7 | Browser-verified | IMPLICIT | - | 5 |

**Execution groups:**
1. Setup (parallel): TypeScript config, CSRF setup
2. Implementation (parallel): Button component, error handling
3. Integration: Wire up logout action
4. Validation: Run tests
5. Verification: Browser check

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p PLAN

# View current ISC
bun run ISCManager.ts show -o markdown
```

## For THOROUGH+ Effort

Consider using Architect agent for complex sequencing:

```bash
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts \
  --task "Plan execution order for these requirements" \
  --traits "analytical,systematic,meticulous"
```

## Exit Criteria

- All dependencies identified
- Parallel rows marked
- Execution sequence clear
- Ready for BUILD phase
