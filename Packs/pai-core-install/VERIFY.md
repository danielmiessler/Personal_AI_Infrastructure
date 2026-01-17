# PAI Core Install - Verification Checklist

Run each verification step and confirm pass/fail status.

---

## Quick Verification

```bash
# All-in-one verification script
echo "=== PAI CORE Verification ===" && \
test -f ~/.claude/skills/CORE/SKILL.md && echo "SKILL.md: PASS" || echo "SKILL.md: FAIL" && \
test -d ~/.claude/skills/CORE/SYSTEM && echo "SYSTEM/: PASS" || echo "SYSTEM/: FAIL" && \
test -d ~/.claude/skills/CORE/USER && echo "USER/: PASS" || echo "USER/: FAIL" && \
test -d ~/.claude/skills/CORE/WORK && echo "WORK/: PASS" || echo "WORK/: FAIL" && \
test -d ~/.claude/skills/CORE/Workflows && echo "Workflows/: PASS" || echo "Workflows/: FAIL" && \
test -d ~/.claude/skills/CORE/Tools && echo "Tools/: PASS" || echo "Tools/: FAIL" && \
echo "=== Verification Complete ==="
```

---

## Detailed Verification Steps

### 1. SKILL.md Exists

```bash
ls -la ~/.claude/skills/CORE/SKILL.md
```

**Expected:** File exists with size ~20KB
**Pass Criteria:** File present and readable

- [ ] PASS
- [ ] FAIL

---

### 2. SYSTEM Directory Complete

```bash
ls ~/.claude/skills/CORE/SYSTEM/ | wc -l
```

**Expected:** 19 or more files
**Key files that MUST exist:**

```bash
test -f ~/.claude/skills/CORE/SYSTEM/PAISYSTEMARCHITECTURE.md && echo "PAISYSTEMARCHITECTURE.md: OK"
test -f ~/.claude/skills/CORE/SYSTEM/SKILLSYSTEM.md && echo "SKILLSYSTEM.md: OK"
test -f ~/.claude/skills/CORE/SYSTEM/MEMORYSYSTEM.md && echo "MEMORYSYSTEM.md: OK"
test -f ~/.claude/skills/CORE/SYSTEM/THEHOOKSYSTEM.md && echo "THEHOOKSYSTEM.md: OK"
test -f ~/.claude/skills/CORE/SYSTEM/RESPONSEFORMAT.md && echo "RESPONSEFORMAT.md: OK"
```

- [ ] PASS (all 5 files exist)
- [ ] FAIL

---

### 3. USER Directory Structure

```bash
ls -la ~/.claude/skills/CORE/USER/
```

**Expected directories:**
- PAISECURITYSYSTEM/
- SKILLCUSTOMIZATIONS/
- BANNER/
- TERMINAL/

```bash
test -d ~/.claude/skills/CORE/USER/PAISECURITYSYSTEM && echo "PAISECURITYSYSTEM/: OK"
test -d ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS && echo "SKILLCUSTOMIZATIONS/: OK"
test -d ~/.claude/skills/CORE/USER/BANNER && echo "BANNER/: OK"
test -d ~/.claude/skills/CORE/USER/TERMINAL && echo "TERMINAL/: OK"
```

- [ ] PASS (all 4 directories exist)
- [ ] FAIL

---

### 4. WORK Directory Exists

```bash
test -d ~/.claude/skills/CORE/WORK && echo "WORK directory: OK"
test -f ~/.claude/skills/CORE/WORK/README.md && echo "WORK/README.md: OK"
```

- [ ] PASS
- [ ] FAIL

---

### 5. Workflows Installed

```bash
ls ~/.claude/skills/CORE/Workflows/
```

**Expected files:**
- Delegation.md
- SessionContinuity.md
- ImageProcessing.md
- Transcription.md

```bash
test -f ~/.claude/skills/CORE/Workflows/Delegation.md && echo "Delegation.md: OK"
test -f ~/.claude/skills/CORE/Workflows/SessionContinuity.md && echo "SessionContinuity.md: OK"
```

- [ ] PASS (at least 2 workflows present)
- [ ] FAIL

---

### 6. Tools Installed

```bash
ls ~/.claude/skills/CORE/Tools/
```

**Expected files:**
- Inference.ts
- SessionProgress.ts
- FeatureRegistry.ts
- SkillSearch.ts

```bash
test -f ~/.claude/skills/CORE/Tools/Inference.ts && echo "Inference.ts: OK"
test -f ~/.claude/skills/CORE/Tools/SessionProgress.ts && echo "SessionProgress.ts: OK"
```

- [ ] PASS (at least 2 tools present)
- [ ] FAIL

---

### 7. Tools Execute Successfully

```bash
# Test Inference tool help
bun run ~/.claude/skills/CORE/Tools/Inference.ts --help 2>/dev/null && echo "Inference.ts: EXECUTABLE" || echo "Inference.ts: ERROR"

# Test SkillSearch tool
bun run ~/.claude/skills/CORE/Tools/SkillSearch.ts --help 2>/dev/null && echo "SkillSearch.ts: EXECUTABLE" || echo "SkillSearch.ts: ERROR"
```

- [ ] PASS (tools execute without error)
- [ ] FAIL

---

### 8. Settings.json Configured

```bash
cat ~/.claude/settings.json 2>/dev/null | head -20
```

**Expected:** JSON with `daidentity` and `principal` sections

- [ ] PASS (settings.json exists and has required sections)
- [ ] FAIL
- [ ] SKIPPED (optional - can configure later)

---

### 9. Environment Variables Set

```bash
echo "PAI_DIR: ${PAI_DIR:-NOT SET}"
echo "DA: ${DA:-NOT SET}"
echo "TIME_ZONE: ${TIME_ZONE:-NOT SET}"
```

**Expected:** At least PAI_DIR is set

- [ ] PASS (PAI_DIR is set)
- [ ] FAIL
- [ ] SKIPPED (optional - can configure later)

---

## Functional Tests

### Test 1: CORE Skill Loads

Start a new Claude Code session and verify:

1. CORE skill appears in available skills
2. Response format guidance is active
3. Workflow routing table is accessible

- [ ] PASS
- [ ] FAIL

### Test 2: SessionProgress Tool Works

```bash
# Create test progress entry
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts create test-verification "Test objective"

# List to verify
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts list

# Clean up
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts complete test-verification
```

- [ ] PASS (all commands execute successfully)
- [ ] FAIL

---

## Verification Summary

| Component | Status |
|-----------|--------|
| SKILL.md | [ ] |
| SYSTEM/ (19 files) | [ ] |
| USER/ (4 subdirs) | [ ] |
| WORK/ | [ ] |
| Workflows/ | [ ] |
| Tools/ | [ ] |
| Tools Execute | [ ] |
| settings.json | [ ] |
| Environment Variables | [ ] |
| Functional: Skill Loads | [ ] |
| Functional: Tools Work | [ ] |

**Installation Status:**
- [ ] **COMPLETE** - All required checks pass
- [ ] **PARTIAL** - Core files present, optional config pending
- [ ] **FAILED** - Required components missing

---

## Troubleshooting

### SKILL.md Not Found
```bash
# Re-copy from pack
cp src/skills/CORE/SKILL.md ~/.claude/skills/CORE/
```

### SYSTEM Files Missing
```bash
# Re-copy entire SYSTEM directory
cp -r src/skills/CORE/SYSTEM/* ~/.claude/skills/CORE/SYSTEM/
```

### Tools Not Executing
```bash
# Check Bun installation
bun --version

# Reinstall Bun if needed
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
```

### Settings Not Loading
Ensure `~/.claude/settings.json` is valid JSON:
```bash
cat ~/.claude/settings.json | jq . 2>/dev/null && echo "Valid JSON" || echo "Invalid JSON"
```
