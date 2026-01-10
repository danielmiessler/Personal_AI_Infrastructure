# PAI Core Install - Verification Checklist

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/skills/` directory exists
- [ ] `$PAI_DIR/skills/CORE/` directory exists
- [ ] `$PAI_DIR/skills/CORE/USER/` directory exists (v1.1.0)
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/` directory exists (v1.1.0)
- [ ] `$PAI_DIR/skills/CORE/Workflows/` directory exists
- [ ] `$PAI_DIR/skills/CreateSkill/` directory exists
- [ ] `$PAI_DIR/Tools/` directory exists
- [ ] `$PAI_DIR/MEMORY/` directory exists (v1.2.0)

### MEMORY/ Structure (v1.2.0)

- [ ] `$PAI_DIR/MEMORY/README.md` exists
- [ ] `$PAI_DIR/MEMORY/research/` directory exists
- [ ] `$PAI_DIR/MEMORY/sessions/` directory exists
- [ ] `$PAI_DIR/MEMORY/learnings/` directory exists
- [ ] `$PAI_DIR/MEMORY/decisions/` directory exists
- [ ] `$PAI_DIR/MEMORY/execution/` directory exists
- [ ] `$PAI_DIR/MEMORY/security/` directory exists
- [ ] `$PAI_DIR/MEMORY/recovery/` directory exists
- [ ] `$PAI_DIR/MEMORY/raw-outputs/` directory exists
- [ ] `$PAI_DIR/MEMORY/backups/` directory exists
- [ ] `$PAI_DIR/MEMORY/State/` directory exists

### Settings Configuration (v1.2.0)

- [ ] `$PAI_DIR/settings.json` OR `$PAI_DIR/settings.json.template` exists

### Core Files

- [ ] `$PAI_DIR/skills/CORE/SKILL.md` exists
- [ ] `$PAI_DIR/skills/CORE/Workflows/UpdateDocumentation.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/SKILL.md` exists

### USER/ Files (v1.1.0, updated v1.4.0)

- [ ] `$PAI_DIR/skills/CORE/USER/README.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/BASICINFO.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/CONTACTS.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/DAIDENTITY.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/TECHSTACKPREFERENCES.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/ASSETMANAGEMENT.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/DEFINITIONS.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/CORECONTENT.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/RESUME.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/REMINDERS.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/ALGOPREFS.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/ART.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/ABOUTME.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/TELOS.md` exists

### PAISECURITYSYSTEM/ Files (v1.3.0)

- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/` directory exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/README.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/ARCHITECTURE.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/patterns.yaml` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/PROMPTINJECTION.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/COMMANDINJECTION.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/PROJECTRULES.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/REPOSITORIES.md` exists
- [ ] `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/QUICKREF.md` exists

### SYSTEM/ Files (v1.1.0)

- [ ] `$PAI_DIR/skills/CORE/SYSTEM/README.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/PAISYSTEMARCHITECTURE.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/SKILLSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/MEMORYSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/THEHOOKSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/THEDELEGATIONSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/AGENTS.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/ACTIONS.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/PIPELINES.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/TOOLS.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/CLIFIRSTARCHITECTURE.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/THEFABRICSYSTEM.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/SCRAPINGREFERENCE.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/TERMINALTABS.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/DOCUMENTATIONINDEX.md` exists
- [ ] `$PAI_DIR/skills/CORE/SYSTEM/BACKUPS.md` exists

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

ls -la $PAI_DIR/skills/CORE/
# Expected: SKILL.md USER/ SYSTEM/ Workflows/

ls -la $PAI_DIR/Tools/
# Expected: SkillSearch.ts GenerateSkillIndex.ts PaiArchitecture.ts
```

### Test 2: Verify USER/ Directory

```bash
ls $PAI_DIR/skills/CORE/USER/ | wc -l
# Expected: 15 (14 files + 1 directory: PAISECURITYSYSTEM/)

ls $PAI_DIR/skills/CORE/USER/
# Expected: README.md BASICINFO.md CONTACTS.md DAIDENTITY.md TECHSTACKPREFERENCES.md
#           ASSETMANAGEMENT.md DEFINITIONS.md CORECONTENT.md PAISECURITYSYSTEM/
#           RESUME.md REMINDERS.md ALGOPREFS.md ART.md ABOUTME.md TELOS.md
```

### Test 2b: Verify PAISECURITYSYSTEM/ Directory (v1.3.0)

```bash
ls $PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/ | wc -l
# Expected: 8 (files)

ls $PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/
# Expected: README.md ARCHITECTURE.md patterns.yaml PROMPTINJECTION.md
#           COMMANDINJECTION.md PROJECTRULES.md REPOSITORIES.md QUICKREF.md
```

### Test 3: Verify SYSTEM/ Directory

```bash
ls $PAI_DIR/skills/CORE/SYSTEM/ | wc -l
# Expected: 17 (files)

ls $PAI_DIR/skills/CORE/SYSTEM/
# Expected: README.md PAISYSTEMARCHITECTURE.md SKILLSYSTEM.md MEMORYSYSTEM.md
#           THEHOOKSYSTEM.md THEDELEGATIONSYSTEM.md THENOTIFICATIONSYSTEM.md
#           AGENTS.md ACTIONS.md PIPELINES.md TOOLS.md CLIFIRSTARCHITECTURE.md
#           THEFABRICSYSTEM.md SCRAPINGREFERENCE.md TERMINALTABS.md
#           DOCUMENTATIONINDEX.md BACKUPS.md
```

### Test 4: Verify MEMORY/ Structure (v1.2.0)

```bash
ls $PAI_DIR/MEMORY/ | wc -l
# Expected: 11 (10 directories + README.md)

ls $PAI_DIR/MEMORY/
# Expected: README.md backups decisions execution learnings
#           raw-outputs recovery research security sessions State
```

### Test 5: Verify Settings Template (v1.2.0)

```bash
ls $PAI_DIR/settings.json* 2>/dev/null
# Expected: settings.json and/or settings.json.template

# Check hooks structure in settings
cat $PAI_DIR/settings.json | grep -c "hooks" 2>/dev/null || cat $PAI_DIR/settings.json.template | grep -c "hooks"
# Expected: Multiple matches (hook configuration present)
```

### Test 6: Test Skill Search

```bash
bun run $PAI_DIR/Tools/SkillSearch.ts --list
# Expected: Lists all indexed skills with icons
```

### Test 7: Search for Specific Skill

```bash
bun run $PAI_DIR/Tools/SkillSearch.ts "create skill"
# Expected: Returns CreateSkill in results
```

### Test 8: Check Architecture Status

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts status
# Expected: Shows installed packs, bundles, system health
```

### Test 9: Verify System Health

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts check
# Expected: All systems show healthy status
```

### Test 10: Verify CORE Skill Content

```bash
cat $PAI_DIR/skills/CORE/SKILL.md | head -20
# Expected: Shows YAML frontmatter with name: CORE
```

### Test 11: Verify Documentation Headers

```bash
head -30 $PAI_DIR/skills/CORE/USER/DAIDENTITY.md
# Expected: Shows documentation header with PURPOSE, LOCATION, CUSTOMIZATION

head -30 $PAI_DIR/skills/CORE/SYSTEM/SKILLSYSTEM.md
# Expected: Shows documentation header with PURPOSE, LOCATION, CUSTOMIZATION
```

### Test 12: Verify Skill Index Format

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

### Test D: USER/ Configuration Access

In a Claude Code session:
1. Say "what are my tech preferences?"
2. AI should read USER/TECHSTACKPREFERENCES.md
3. Should show your configured preferences

### Test E: SYSTEM/ Documentation Access

In a Claude Code session:
1. Say "how does the skill system work?"
2. AI should read SYSTEM/SKILLSYSTEM.md
3. Should explain skill configuration

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== PAI Core Install v1.2.0 Verification ==="
echo ""

# Check directories
echo "📁 Directory Structure:"
for dir in "skills" "skills/CORE" "skills/CORE/USER" "skills/CORE/SYSTEM" "skills/CORE/Workflows" "skills/CreateSkill" "Tools"; do
  if [ -d "$PAI_CHECK/$dir" ]; then
    echo "  ✓ $dir/"
  else
    echo "  ❌ $dir/ MISSING"
  fi
done

echo ""

# Check core files
echo "📄 Core Files:"
for file in "skills/CORE/SKILL.md" "skills/CreateSkill/SKILL.md"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ $file MISSING"
  fi
done

echo ""

# Check USER/ files
echo "👤 USER/ Files:"
USER_COUNT=$(ls "$PAI_CHECK/skills/CORE/USER/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$USER_COUNT" -ge 15 ]; then
  echo "  ✓ USER/ directory has $USER_COUNT items (expected: 15 = 14 files + 1 dir)"
else
  echo "  ⚠️  USER/ directory has $USER_COUNT items (expected: 15)"
fi

# Check PAISECURITYSYSTEM/ files (v1.3.0)
echo "🔒 PAISECURITYSYSTEM/ Files:"
SECURITY_COUNT=$(ls "$PAI_CHECK/skills/CORE/USER/PAISECURITYSYSTEM/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SECURITY_COUNT" -ge 8 ]; then
  echo "  ✓ PAISECURITYSYSTEM/ directory has $SECURITY_COUNT files (expected: 8)"
else
  echo "  ⚠️  PAISECURITYSYSTEM/ directory has $SECURITY_COUNT files (expected: 8)"
fi

# Check SYSTEM/ files
echo "⚙️  SYSTEM/ Files:"
SYSTEM_COUNT=$(ls "$PAI_CHECK/skills/CORE/SYSTEM/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SYSTEM_COUNT" -ge 17 ]; then
  echo "  ✓ SYSTEM/ directory has $SYSTEM_COUNT files (expected: 17)"
else
  echo "  ⚠️  SYSTEM/ directory has $SYSTEM_COUNT files (expected: 17)"
fi

echo ""

# Check MEMORY/ structure (v1.2.0)
echo "🧠 MEMORY/ Structure:"
MEMORY_COUNT=$(ls "$PAI_CHECK/MEMORY/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MEMORY_COUNT" -ge 11 ]; then
  echo "  ✓ MEMORY/ directory has $MEMORY_COUNT items (expected: 11)"
else
  echo "  ⚠️  MEMORY/ directory has $MEMORY_COUNT items (expected: 11)"
fi

echo ""

# Check settings (v1.2.0)
echo "⚙️  Settings:"
if [ -f "$PAI_CHECK/settings.json" ] || [ -f "$PAI_CHECK/settings.json.template" ]; then
  echo "  ✓ settings.json or template present"
else
  echo "  ⚠️  settings.json missing - copy from settings.json.template"
fi

echo ""

# Check tools
echo "🔧 Tools:"
for file in "Tools/SkillSearch.ts" "Tools/GenerateSkillIndex.ts" "Tools/PaiArchitecture.ts"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ $file MISSING"
  fi
done

echo ""

# Check generated files
echo "📋 Generated Files:"
if [ -f "$PAI_CHECK/skills/skill-index.json" ]; then
  echo "  ✓ skill-index.json"
else
  echo "  ⚠️  skill-index.json not generated - run: bun run $PAI_CHECK/Tools/GenerateSkillIndex.ts"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. ✅ All directory structure items are checked
2. ✅ All core files are present
3. ✅ All 14 USER/ files are present (+ 1 PAISECURITYSYSTEM/ directory)
4. ✅ All 8 PAISECURITYSYSTEM/ files are present
5. ✅ All 17 SYSTEM/ files are present
6. ✅ All 11 MEMORY/ items present (10 directories + README.md)
7. ✅ settings.json or settings.json.template exists
8. ✅ All tools are installed
9. ✅ `bun run $PAI_DIR/Tools/SkillSearch.ts --list` returns skill list
10. ✅ `bun run $PAI_DIR/Tools/PaiArchitecture.ts check` shows healthy status
11. ✅ Documentation headers are present in USER/, PAISECURITYSYSTEM/, and SYSTEM/ files
