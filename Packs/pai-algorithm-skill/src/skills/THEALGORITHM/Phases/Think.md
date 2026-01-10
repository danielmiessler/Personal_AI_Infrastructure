# THINK Phase

**Purpose:** COMPLETE ISC rows - ensure nothing is missing.

**ISC Mutation:** COMPLETE rows (add missing, refine existing)

**Gate Question:** All rows clear and testable? Missing anything from user preferences?

## What Happens

1. **Review all rows** - Are they complete?
2. **Check for gaps** - What's missing?
3. **Add missing rows** - INFERRED and IMPLICIT
4. **Refine descriptions** - Make them clearer
5. **Consider edge cases** - What could go wrong?

## For THOROUGH+ Effort

Consider using additional resources:

- **BeCreative skill** - UltraThink for deep analysis
- **Council skill** - Multiple perspectives on requirements
- **AgentFactory** - Spawn a "thinking" agent with `analytical,exploratory` traits

```bash
# Compose a thinking agent
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --task "What requirements might be missing for: [request]" \
  --traits "analytical,exploratory,thorough"
```

## Completeness Checklist

- [ ] All explicit requirements captured?
- [ ] Tech stack preferences applied?
- [ ] Security considerations included?
- [ ] Error handling considered?
- [ ] Edge cases identified?
- [ ] Testing requirements clear?
- [ ] Performance expectations stated?
- [ ] Deployment/verification needs?

## Example

**After OBSERVE:**
| # | What Ideal Looks Like | Source |
|---|------------------------|--------|
| 1 | Logout button in navbar | EXPLICIT |
| 2 | Uses TypeScript | INFERRED |

**After THINK (gaps identified):**
| # | What Ideal Looks Like | Source |
|---|------------------------|--------|
| 1 | Logout button in navbar | EXPLICIT |
| 2 | Clicking logs user out and redirects to login | EXPLICIT (refined) |
| 3 | Uses TypeScript | INFERRED |
| 4 | Handles logout failure gracefully | INFERRED |
| 5 | No security issues (CSRF protection) | IMPLICIT |
| 6 | Existing tests pass | IMPLICIT |
| 7 | Browser-verified working | IMPLICIT |

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p THINK

# Add missing rows
bun run ISCManager.ts add -d "Handles logout failure gracefully" -s INFERRED
bun run ISCManager.ts add -d "Browser-verified working" -s IMPLICIT
```

## Exit Criteria

- All rows are clear and specific
- No obvious gaps remain
- Edge cases considered
- Ready for PLAN phase
