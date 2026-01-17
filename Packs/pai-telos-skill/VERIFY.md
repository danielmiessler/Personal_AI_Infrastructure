# TELOS Skill Verification

> **MANDATORY:** All checks must pass before installation is complete.

---

## Quick Verification

```bash
# Run these commands to verify installation
ls ~/.claude/skills/Telos/SKILL.md && echo "✅ SKILL.md present"
ls ~/.claude/skills/Telos/Workflows/Update.md && echo "✅ Update workflow present"
ls ~/.claude/skills/CORE/USER/TELOS/ && echo "✅ TELOS content directory exists"
```

---

## Detailed Checklist

### 1. Skill Structure

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Skill directory exists | `ls ~/.claude/skills/Telos/` | Directory present | [ ] |
| 2 | SKILL.md present | `ls ~/.claude/skills/Telos/SKILL.md` | File exists | [ ] |
| 3 | Workflows directory | `ls ~/.claude/skills/Telos/Workflows/` | Directory with files | [ ] |
| 4 | Update workflow | `ls ~/.claude/skills/Telos/Workflows/Update.md` | File exists | [ ] |

### 2. Content Directory

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | TELOS content directory | `ls ~/.claude/skills/CORE/USER/TELOS/` | Directory present | [ ] |
| 2 | At least one content file | `ls ~/.claude/skills/CORE/USER/TELOS/*.md` | Files present | [ ] |
| 3 | Backups directory | `ls ~/.claude/skills/CORE/USER/TELOS/Backups/` | Directory present | [ ] |

### 3. Functionality Tests

```bash
# Test 1: Skill file is readable
cat ~/.claude/skills/Telos/SKILL.md | head -5
# Expected: YAML frontmatter with "name: Telos"

# Test 2: Workflows are readable
cat ~/.claude/skills/Telos/Workflows/Update.md | head -5
# Expected: YAML frontmatter with description

# Test 3: Content path is correct in SKILL.md
grep "CORE/USER/TELOS" ~/.claude/skills/Telos/SKILL.md
# Expected: References to ~/.claude/skills/CORE/USER/TELOS/
```

---

## Common Issues

### Issue: SKILL.md references wrong path
**Symptom:** Skill tries to access `~/.claude/skills/life/telos/`
**Fix:** Update SKILL.md to reference `~/.claude/skills/CORE/USER/TELOS/`

### Issue: No content files
**Symptom:** Empty TELOS content directory
**Fix:** Create starter templates (see INSTALL.md Step 3)

### Issue: Backups not created
**Symptom:** Updates don't create backups
**Fix:** Ensure `~/.claude/skills/CORE/USER/TELOS/Backups/` directory exists

---

## Verification Complete

When all checks pass:
- [ ] All skill structure checks passed
- [ ] Content directory verified
- [ ] Functionality tests passed

**Installation verified. TELOS skill is ready for use.**

---

## Test the Skill

Try these commands to verify functionality:

1. **View your TELOS:** "Show me my TELOS goals"
2. **Add content:** "Add 'The Pragmatic Programmer' to my TELOS books"
3. **Check backup:** `ls ~/.claude/skills/CORE/USER/TELOS/Backups/`
