# PAI Council Skill Verification

> **MANDATORY:** All checks must pass before installation is complete.

---

## Quick Verification

```bash
# Run these commands to verify installation
ls ~/.claude/skills/Council/SKILL.md && \
ls ~/.claude/skills/Council/Workflows/Debate.md && \
ls ~/.claude/skills/Council/Workflows/Quick.md && \
echo "All core files present"
```

---

## Detailed Checklist

### 1. File Structure

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Council directory exists | `ls ~/.claude/skills/Council/` | Directory present | [ ] |
| 2 | SKILL.md present | `ls ~/.claude/skills/Council/SKILL.md` | File exists | [ ] |
| 3 | CouncilMembers.md present | `ls ~/.claude/skills/Council/CouncilMembers.md` | File exists | [ ] |
| 4 | RoundStructure.md present | `ls ~/.claude/skills/Council/RoundStructure.md` | File exists | [ ] |
| 5 | OutputFormat.md present | `ls ~/.claude/skills/Council/OutputFormat.md` | File exists | [ ] |
| 6 | Workflows directory exists | `ls ~/.claude/skills/Council/Workflows/` | Directory present | [ ] |
| 7 | Debate.md workflow present | `ls ~/.claude/skills/Council/Workflows/Debate.md` | File exists | [ ] |
| 8 | Quick.md workflow present | `ls ~/.claude/skills/Council/Workflows/Quick.md` | File exists | [ ] |

### 2. Content Validation

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | SKILL.md has frontmatter | `head -5 ~/.claude/skills/Council/SKILL.md` | Starts with `---` | [ ] |
| 2 | Has workflow routing table | `grep -c "Workflow" ~/.claude/skills/Council/SKILL.md` | Count > 0 | [ ] |
| 3 | Council members defined | `grep -c "Agent" ~/.claude/skills/Council/CouncilMembers.md` | Count >= 4 | [ ] |
| 4 | Three rounds defined | `grep -c "Round" ~/.claude/skills/Council/RoundStructure.md` | Count >= 3 | [ ] |

### 3. Configuration Check

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Skill discoverable | Ask Claude: "What skills do you have?" | Council listed | [ ] |

---

## Functionality Tests

### Test 1: Quick Council Check

Ask Claude Code:
```
Quick council check: Should I use TypeScript or JavaScript for a new CLI tool?
```

**Expected:**
- Quick Council header appears
- 4 agent perspectives shown (Architect, Designer, Engineer, Researcher)
- Quick Summary with Consensus, Concerns, Recommendation

### Test 2: Full Council Debate

Ask Claude Code:
```
Council: Should we implement caching at the API layer or database layer?
```

**Expected:**
- Council Debate header appears
- Round 1: Initial Positions (4 agents)
- Round 2: Responses & Challenges (agents reference each other)
- Round 3: Synthesis
- Final Council Synthesis with convergence and disagreements

### Test 3: Custom Council Composition

Ask Claude Code:
```
Council with security: Evaluate using JWTs for session management
```

**Expected:**
- Security agent (pentester) added to the council
- 5 agent perspectives in each round
- Security-specific concerns raised

---

## Troubleshooting

### Skill Not Detected

If Council doesn't appear in skill list:

1. Check settings.json includes skills directory:
```bash
cat ~/.claude/settings.json | grep -A 10 '"skills"'
```

2. Restart Claude Code session

3. Manually trigger skill load:
```
Read ~/.claude/skills/Council/SKILL.md
```

### Agents Not Responding

If debate doesn't produce agent responses:

1. Verify skill routing works:
```
What does the Council skill do?
```

2. Check for workflow file issues:
```bash
head -20 ~/.claude/skills/Council/Workflows/Debate.md
```

### Voice Not Working

Voice notifications are optional. If not working:
1. Verify pai-voice-system is installed
2. Check voice server is running: `curl http://localhost:8888/health`

---

## Verification Complete

When all checks pass:
- [ ] All file structure checks passed (8/8)
- [ ] All content validation checks passed (4/4)
- [ ] Configuration check passed (1/1)
- [ ] Quick Council test successful
- [ ] Full Debate test successful

**Installation verified. Pack is ready for use.**

---

## Usage Quick Reference

| Command | Result |
|---------|--------|
| `Council: [topic]` | Full 3-round debate |
| `Quick council: [topic]` | Fast perspective check |
| `Council with security: [topic]` | Add security agent |
| `Council with intern: [topic]` | Add fresh perspective |
| `Just architect and engineer: [topic]` | Limited council |
