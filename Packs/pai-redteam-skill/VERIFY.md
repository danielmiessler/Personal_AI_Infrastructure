# Verification Checklist - PAI RedTeam Skill v2.3.0

## Mandatory Checks

All items must pass before installation is complete.

### Directory Structure

```bash
ls $PAI_DIR/skills/RedTeam/
# Expected: SKILL.md Philosophy.md Integration.md Workflows/

ls $PAI_DIR/skills/RedTeam/Workflows/
# Expected: ParallelAnalysis.md AdversarialValidation.md
```

- [ ] `$PAI_DIR/skills/RedTeam/` directory exists
- [ ] `SKILL.md` present
- [ ] `Philosophy.md` present
- [ ] `Integration.md` present
- [ ] `Workflows/` directory exists
- [ ] `Workflows/ParallelAnalysis.md` present
- [ ] `Workflows/AdversarialValidation.md` present

### Content Verification

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check SKILL.md has routing table
grep -c "Workflow Routing" "$PAI_DIR/skills/RedTeam/SKILL.md"
# Expected: 1

# Check Philosophy.md has agent roster
grep -c "32 Agent Types" "$PAI_DIR/skills/RedTeam/Philosophy.md"
# Expected: 1

# Check ParallelAnalysis has five phases
grep -c "PHASE" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: 5 or more

# Check AdversarialValidation has three rounds
grep -c "Round" "$PAI_DIR/skills/RedTeam/Workflows/AdversarialValidation.md"
# Expected: 3 or more
```

- [ ] SKILL.md contains workflow routing table
- [ ] Philosophy.md contains 32 agent types
- [ ] ParallelAnalysis.md contains 5 phases
- [ ] AdversarialValidation.md contains 3 rounds

### Agent Roster Verification

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check for all agent types in ParallelAnalysis
grep -c "EN-" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: 8 (Engineers)

grep -c "AR-" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: 8 (Architects)

grep -c "PT-" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: 8 (Pentesters)

grep -c "IN-" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: 8 (Interns)
```

- [ ] 8 Engineer agents (EN-1 through EN-8)
- [ ] 8 Architect agents (AR-1 through AR-8)
- [ ] 8 Pentester agents (PT-1 through PT-8)
- [ ] 8 Intern agents (IN-1 through IN-8)

### Integration Points

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check for FirstPrinciples integration
grep -c "FirstPrinciples" "$PAI_DIR/skills/RedTeam/Integration.md"
# Expected: 1 or more

# Check for output format specification
grep -c "12-16 words" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md"
# Expected: Multiple occurrences
```

- [ ] FirstPrinciples integration documented
- [ ] Output format (12-16 words per point) specified

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| SKILL.md present | |
| Philosophy.md present | |
| Integration.md present | |
| ParallelAnalysis.md present | |
| AdversarialValidation.md present | |
| 32 agents defined | |
| Five phases in ParallelAnalysis | |
| Three rounds in AdversarialValidation | |

## Quick Functional Test

Test the skill by asking:

```
"Red team this statement: 'We should delay the product launch by 6 months to add more features.'"
```

**Expected behavior:**
1. Routes to ParallelAnalysis workflow
2. Decomposes into 24 atomic claims
3. Runs 32-agent parallel analysis
4. Produces 8-point Steelman
5. Produces 8-point Counter-Argument

## Troubleshooting

### Workflow Not Found

1. Verify Workflows/ directory exists
2. Check filename spelling (case-sensitive)
3. Ensure .md extension is present

### Agent Roster Incomplete

1. Check ParallelAnalysis.md was fully copied
2. Verify file size is appropriate (~15KB expected)
3. Re-copy from pack if truncated

### Integration Errors

If FirstPrinciples integration fails:
1. RedTeam will run in basic mode (still functional)
2. Install pai-firstprinciples-skill for enhanced analysis
3. Check Integration.md for manual usage instructions
