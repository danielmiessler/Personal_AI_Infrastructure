# PAI Research Skill Verification

> **MANDATORY:** All checks must pass before installation is complete.

---

## Quick Verification

```bash
# Run these commands to verify installation
ls ~/.claude/skills/Research/SKILL.md && echo "✓ SKILL.md exists"
ls ~/.claude/skills/Research/Workflows/ && echo "✓ Workflows directory exists"
```

---

## Detailed Checklist

### 1. File Structure

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | SKILL.md exists | `ls ~/.claude/skills/Research/SKILL.md` | File present | [ ] |
| 2 | Workflows directory | `ls ~/.claude/skills/Research/Workflows/` | Directory with files | [ ] |
| 3 | QuickReference.md | `ls ~/.claude/skills/Research/QuickReference.md` | File present | [ ] |

### 2. Functionality Tests

```bash
# Test 1: Check skill triggers are documented
grep -l "research" ~/.claude/skills/Research/SKILL.md && echo "✓ Research triggers present"

# Test 2: Verify workflows exist
ls ~/.claude/skills/Research/Workflows/*.md | wc -l
# Expected: Multiple workflow files
```

### 3. Integration Test

Ask the AI: "What research modes are available?"

Expected response should mention:
- Quick research (1 agent)
- Standard research (3 agents)
- Extensive research (12 agents)

---

## Verification Complete

When all checks pass:
- [ ] All file structure checks passed
- [ ] All functionality tests passed
- [ ] Integration test successful

**Installation verified. Research skill is ready for use.**
