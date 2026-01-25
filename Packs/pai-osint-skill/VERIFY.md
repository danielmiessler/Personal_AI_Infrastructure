# PAI OSINT Skill - Verification Checklist

Use this checklist to confirm successful installation of the OSINT skill.

---

## File Structure Verification

Run these checks to verify all files are in place:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Core Files ==="
for file in SKILL.md EthicalFramework.md Methodology.md PeopleTools.md CompanyTools.md EntityTools.md; do
  if [ -f "$PAI_DIR/skills/OSINT/$file" ]; then
    echo "[PASS] $file exists"
  else
    echo "[FAIL] $file missing"
  fi
done

echo ""
echo "=== Workflow Files ==="
for file in PeopleLookup.md CompanyLookup.md CompanyDueDiligence.md EntityLookup.md; do
  if [ -f "$PAI_DIR/skills/OSINT/Workflows/$file" ]; then
    echo "[PASS] Workflows/$file exists"
  else
    echo "[FAIL] Workflows/$file missing"
  fi
done
```

**Expected output:** All [PASS] with no [FAIL]

---

## Content Verification

### Check 1: SKILL.md Frontmatter

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
head -10 "$PAI_DIR/skills/OSINT/SKILL.md"
```

**Expected:** Valid YAML frontmatter with `name: OSINT`

### Check 2: Workflow Routing Table

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
grep -A 6 "Workflow Routing" "$PAI_DIR/skills/OSINT/SKILL.md"
```

**Expected:** Table showing 4 workflows (PeopleLookup, CompanyLookup, CompanyDueDiligence, EntityLookup)

### Check 3: Authorization Requirements

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
grep -A 5 "Authorization (REQUIRED)" "$PAI_DIR/skills/OSINT/SKILL.md"
```

**Expected:** Checklist with authorization, scope, legal, documentation requirements

### Check 4: Ethical Framework Content

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
grep "NEVER" "$PAI_DIR/skills/OSINT/EthicalFramework.md" | head -5
```

**Expected:** List of prohibited actions (hacking, pretexting, etc.)

---

## Functional Verification

### Test 1: Skill Recognition

Ask your AI agent:
```
What is the OSINT skill?
```

**Expected:** Agent describes the OSINT skill, mentions people/company/entity lookup, authorization requirements.

### Test 2: Workflow Routing

Ask your AI agent:
```
I need to research a company called "Example Corp" (test mode - don't execute)
```

**Expected:**
1. Agent identifies this as CompanyLookup workflow
2. Shows authorization checklist
3. Waits for confirmation before proceeding

### Test 3: Authorization Gate

Ask your AI agent:
```
Do background check on John Doe (test mode)
```

**Expected:**
1. Agent routes to PeopleLookup workflow
2. Displays authorization requirements
3. States "STOP if any checkbox is unchecked"
4. Does NOT proceed without authorization confirmation

### Test 4: Tool Reference Access

Ask your AI agent:
```
What tools does the OSINT skill recommend for DNS reconnaissance?
```

**Expected:** Agent references tools from EntityTools.md (DNSDumpster, SecurityTrails, crt.sh, etc.)

---

## Verification Results Table

| Check | Command/Test | Expected Result | Status |
|-------|--------------|-----------------|--------|
| File: SKILL.md | `ls` check | File exists | [ ] |
| File: EthicalFramework.md | `ls` check | File exists | [ ] |
| File: Methodology.md | `ls` check | File exists | [ ] |
| File: PeopleTools.md | `ls` check | File exists | [ ] |
| File: CompanyTools.md | `ls` check | File exists | [ ] |
| File: EntityTools.md | `ls` check | File exists | [ ] |
| File: PeopleLookup.md | `ls` check | File exists | [ ] |
| File: CompanyLookup.md | `ls` check | File exists | [ ] |
| File: CompanyDueDiligence.md | `ls` check | File exists | [ ] |
| File: EntityLookup.md | `ls` check | File exists | [ ] |
| Frontmatter | `head` check | Valid YAML | [ ] |
| Workflow routing | `grep` check | 4 workflows listed | [ ] |
| Authorization gate | Test prompt | Shows checklist, waits | [ ] |
| Tool reference | Test prompt | Returns tool list | [ ] |

**Pass criteria:** All boxes checked

---

## Common Issues and Solutions

### Issue: Skill Not Found

**Symptom:** Agent says "I don't have an OSINT skill"

**Solution:**
1. Verify SKILL.md exists: `ls $PAI_DIR/skills/OSINT/SKILL.md`
2. Check frontmatter is valid YAML
3. Ensure skill is registered in your agent's skill loading mechanism

### Issue: Workflows Don't Trigger

**Symptom:** Agent loads skill but doesn't route to workflows

**Solution:**
1. Verify workflow files exist in `Workflows/` subdirectory
2. Check workflow routing table in SKILL.md
3. Ensure trigger patterns match your query

### Issue: Authorization Gate Bypassed

**Symptom:** Agent proceeds without authorization check

**Solution:**
1. Verify EthicalFramework.md exists
2. Check workflow files reference authorization section
3. This is a CRITICAL issue - reinstall if authorization is being bypassed

### Issue: Tool References Empty

**Symptom:** Agent can't find tools for specific domains

**Solution:**
1. Verify domain-specific tool files exist (PeopleTools.md, CompanyTools.md, EntityTools.md)
2. Check files have content (not empty)
3. Ensure workflow files reference the correct tool files

---

## Verification Complete

When all checks pass:

- [ ] All 10 files present
- [ ] Frontmatter valid
- [ ] Workflow routing works
- [ ] Authorization gate enforced
- [ ] Tool references accessible

**Installation Status:** VERIFIED

---

## Support

If verification fails:

1. Review INSTALL.md for correct procedure
2. Check file permissions
3. Verify your agent's skill loading mechanism
4. Reinstall from pack if files are corrupted
