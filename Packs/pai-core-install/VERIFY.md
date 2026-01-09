# Kai Core Install - Verification Checklist

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/skills/` directory exists
- [ ] `$PAI_DIR/skills/CORE/` directory exists
- [ ] `$PAI_DIR/skills/CORE/Workflows/` directory exists
- [ ] `$PAI_DIR/skills/CreateSkill/` directory exists
- [ ] `$PAI_DIR/Tools/` directory exists

### Core Files

- [ ] `$PAI_DIR/skills/CORE/SKILL.md` exists
- [ ] `$PAI_DIR/skills/CORE/SkillSystem.md` exists
- [ ] `$PAI_DIR/skills/CORE/Workflows/UpdateDocumentation.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/SKILL.md` exists

### Tools

- [ ] `$PAI_DIR/Tools/SkillSearch.ts` exists
- [ ] `$PAI_DIR/Tools/GenerateSkillIndex.ts` exists
- [ ] `$PAI_DIR/Tools/PaiArchitecture.ts` exists

### Generated Files

- [ ] `$PAI_DIR/skills/skill-index.json` exists (run GenerateSkillIndex.ts)
- [ ] `$PAI_DIR/skills/CORE/PaiArchitecture.md` exists (run PaiArchitecture.ts generate)

---

## Functional Tests

### Test 1: Verify Directory Structure

```bash
ls -la $PAI_DIR/skills/
# Expected: CORE/ CreateSkill/ skill-index.json

ls -la $PAI_DIR/Tools/
# Expected: SkillSearch.ts GenerateSkillIndex.ts PaiArchitecture.ts
```

### Test 2: Test Skill Search

```bash
bun run $PAI_DIR/Tools/SkillSearch.ts --list
# Expected: Lists all indexed skills with icons
```

### Test 3: Search for Specific Skill

```bash
bun run $PAI_DIR/Tools/SkillSearch.ts "create skill"
# Expected: Returns CreateSkill in results
```

### Test 4: Check Architecture Status

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts status
# Expected: Shows installed packs, bundles, system health
```

### Test 5: Verify System Health

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts check
# Expected: All systems show healthy status
```

### Test 6: Verify CORE Skill Content

```bash
cat $PAI_DIR/skills/CORE/SKILL.md | head -20
# Expected: Shows YAML frontmatter with name: CORE
```

### Test 7: Verify Skill Index Format

```bash
cat $PAI_DIR/skills/skill-index.json | head -30
# Expected: JSON with generated timestamp, totalSkills count, skills object
```

---

## Integration Tests

### Test A: Skill Routing

In a Claude Code session:
1. Say "search for a skill"
2. AI should use SkillSearch tool
3. Results should be returned

### Test B: Architecture Tracking

In a Claude Code session:
1. Say "what's installed in my PAI system?"
2. AI should read Architecture.md or run PaiArchitecture.ts
3. Should show installed packs

### Test C: Response Format (if configured)

In a Claude Code session:
1. Ask AI to complete a task
2. Response should include structured sections (📋 SUMMARY, 🎯 COMPLETED, etc.)

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Kai Core Install Verification ==="
echo ""

# Check directories
for dir in "skills" "skills/CORE" "skills/CORE/Workflows" "skills/CreateSkill" "Tools"; do
  if [ -d "$PAI_CHECK/$dir" ]; then
    echo "✓ $dir/"
  else
    echo "❌ $dir/ MISSING"
  fi
done

echo ""

# Check files
for file in "skills/CORE/SKILL.md" "skills/CORE/SkillSystem.md" "skills/CreateSkill/SKILL.md" "Tools/SkillSearch.ts" "Tools/GenerateSkillIndex.ts" "Tools/PaiArchitecture.ts"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "✓ $file"
  else
    echo "❌ $file MISSING"
  fi
done

echo ""

# Check generated files
if [ -f "$PAI_CHECK/skills/skill-index.json" ]; then
  echo "✓ skill-index.json (generated)"
else
  echo "⚠️  skill-index.json not generated - run: bun run $PAI_CHECK/Tools/GenerateSkillIndex.ts"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. All directory structure items are checked
2. All core files are present
3. All tools are installed
4. `bun run $PAI_DIR/Tools/SkillSearch.ts --list` returns skill list
5. `bun run $PAI_DIR/Tools/PaiArchitecture.ts check` shows healthy status
