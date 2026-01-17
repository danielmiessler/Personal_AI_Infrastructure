# Verification Checklist - PAI CreateSkill Skill

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/CreateSkill/SKILL.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/Workflows/CreateSkill.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/Workflows/ValidateSkill.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/Workflows/CanonicalizeSkill.md` exists
- [ ] `$PAI_DIR/skills/CreateSkill/Workflows/UpdateSkill.md` exists

### SKILL.md Validation

- [ ] `name: CreateSkill` in YAML frontmatter
- [ ] `description:` contains `USE WHEN` triggers
- [ ] `## Workflow Routing` section present
- [ ] `## Examples` section present
- [ ] All workflow files listed in routing table

### Functional Tests

#### Test 1: Skill File Exists
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cat "$PAI_DIR/skills/CreateSkill/SKILL.md" | head -20
```
**Expected**: Shows YAML frontmatter with `name: CreateSkill`

#### Test 2: All Workflows Present
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
ls -la "$PAI_DIR/skills/CreateSkill/Workflows/"
```
**Expected**: Shows 4 workflow files (CreateSkill.md, ValidateSkill.md, CanonicalizeSkill.md, UpdateSkill.md)

#### Test 3: TitleCase Naming
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
ls "$PAI_DIR/skills/CreateSkill/Workflows/" | grep -E "^[A-Z]"
```
**Expected**: All files start with uppercase (TitleCase)

#### Test 4: Workflow Routing
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
grep -A 10 "## Workflow Routing" "$PAI_DIR/skills/CreateSkill/SKILL.md"
```
**Expected**: Shows routing table with all 4 workflows

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== CreateSkill Skill Verification ==="
echo ""

PASS=0
FAIL=0

check() {
  if [ "$1" = "0" ]; then
    echo "[PASS] $2"
    ((PASS++))
  else
    echo "[FAIL] $2"
    ((FAIL++))
  fi
}

# File checks
[ -f "$PAI_DIR/skills/CreateSkill/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/CreateSkill/Workflows/CreateSkill.md" ]
check $? "CreateSkill.md workflow exists"

[ -f "$PAI_DIR/skills/CreateSkill/Workflows/ValidateSkill.md" ]
check $? "ValidateSkill.md workflow exists"

[ -f "$PAI_DIR/skills/CreateSkill/Workflows/CanonicalizeSkill.md" ]
check $? "CanonicalizeSkill.md workflow exists"

[ -f "$PAI_DIR/skills/CreateSkill/Workflows/UpdateSkill.md" ]
check $? "UpdateSkill.md workflow exists"

# Content checks
grep -q "^name: CreateSkill" "$PAI_DIR/skills/CreateSkill/SKILL.md"
check $? "name field is 'CreateSkill'"

grep -q "USE WHEN" "$PAI_DIR/skills/CreateSkill/SKILL.md"
check $? "USE WHEN triggers present"

grep -q "## Workflow Routing" "$PAI_DIR/skills/CreateSkill/SKILL.md"
check $? "Workflow Routing section present"

grep -q "## Examples" "$PAI_DIR/skills/CreateSkill/SKILL.md"
check $? "Examples section present"

# TitleCase check
LOWERCASE_FILES=$(ls "$PAI_DIR/skills/CreateSkill/Workflows/" 2>/dev/null | grep -E "^[a-z]" | wc -l)
[ "$LOWERCASE_FILES" -eq 0 ]
check $? "All workflow files use TitleCase"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "CreateSkill Skill installation verified successfully!"
  exit 0
else
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SKILL.md not found | Check `$PAI_DIR` is set correctly |
| Workflow files missing | Re-run installation from INSTALL.md |
| USE WHEN missing | Edit SKILL.md to add triggers to description |
| Routing table incomplete | Add missing workflow entries to routing section |
| TitleCase violations | Rename files to use proper TitleCase naming |
