# CrossRepoValidation Workflow

**Purpose:** Validate separation between private PAI instance (~/.claude) and public PAI repository (~/Projects/PAI). Ensures no sensitive data leaks to public repo and references between systems are consistent.

**Triggers:** "cross-repo validation", "check for leaks", "validate repo separation", "verify nothing sensitive in public"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running cross-repo validation between private and public PAI"}' \
  > /dev/null 2>&1 &
```

Running the **CrossRepoValidation** workflow from the **System** skill...

---

## Critical Paths

| Repository | Path | Purpose |
|------------|------|---------|
| **Private** | `~/.claude/` | Personal PAI instance with sensitive config |
| **Public** | `~/Projects/PAI/` | Open source PAI template for community |

**RULE:** Content must NEVER flow from private to public without explicit sanitization.

---

## Execution

### Step 1: Verify Repository Locations

```bash
# Confirm both repos exist and are distinct
echo "=== Private PAI ==="
cd ~/.claude && pwd && git remote -v

echo ""
echo "=== Public PAI ==="
cd ~/Projects/PAI && pwd && git remote -v
```

**Expected:**
- Private: No public remote (or private GitHub)
- Public: `github.com/danielmiessler/PAI`

### Step 2: Secret Scan Public Repo

```bash
# CRITICAL: Scan public repo for any leaked secrets
bun ~/.claude/skills/CORE/Tools/SecretScan.ts ~/Projects/PAI --verbose
```

**Must return:** "No sensitive information found!"

### Step 3: Check for Private Path References

```bash
cd ~/Projects/PAI

echo "=== Checking for private paths ==="
# Look for ~/.claude references (should NOT exist in public)
grep -r "~/.claude" . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null && echo "FOUND" || echo "Clean"

# Look for absolute home path (replace YOUR_USERNAME with your system username)
grep -r "/Users/$USER" . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null && echo "FOUND" || echo "Clean"

# Look for private email (replace with your domain if applicable)
grep -r "@yourdomain.com" . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null && echo "FOUND" || echo "Clean"
```

**Expected:** All "Clean"

### Step 4: Check for Hardcoded Identities

```bash
cd ~/Projects/PAI

echo "=== Checking for hardcoded identities ==="
# Should use {daidentity.name} or {principal.name} placeholders
grep -r '"Kai"' . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | grep -v example
grep -r '"Daniel"' . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | grep -v example
```

**Expected:** Only in example contexts, not hardcoded

### Step 5: Validate Pack Structure Matches

```bash
# Compare pack structure between private skills and public packs
echo "=== Private Skills ==="
ls ~/.claude/skills/ | grep -v "^_" | grep -v "^\." | head -20

echo ""
echo "=== Public Packs ==="
ls ~/Projects/PAI/Packs/ 2>/dev/null | head -20
```

Note any packs that should exist in public but don't (or vice versa).

### Step 6: Check for Sensitive File Types

```bash
cd ~/Projects/PAI

echo "=== Checking for sensitive file types ==="
# These should NEVER exist in public repo
find . -name ".env" -not -path "./.git/*" 2>/dev/null && echo "FOUND .env" || echo "No .env"
find . -name "*.pem" -not -path "./.git/*" 2>/dev/null && echo "FOUND .pem" || echo "No .pem"
find . -name "credentials.json" -not -path "./.git/*" 2>/dev/null && echo "FOUND credentials" || echo "No credentials"
find . -name "*.key" -not -path "./.git/*" 2>/dev/null && echo "FOUND .key" || echo "No .key"
find . -name "settings.json" -not -path "./.git/*" 2>/dev/null && echo "FOUND settings.json" || echo "No settings.json"
```

**Expected:** All "No [type]"

### Step 7: Validate gitignore Coverage

```bash
cd ~/Projects/PAI

echo "=== Public .gitignore ==="
cat .gitignore 2>/dev/null | grep -E "\.env|\.pem|credentials|settings\.json" || echo "Missing critical entries!"
```

**Required entries:**
- `.env*`
- `*.pem`
- `credentials.json`
- `settings.json`

---

## Report Format

```markdown
# Cross-Repository Validation Report

**Date:** [DATE]
**Private Repo:** ~/.claude/
**Public Repo:** ~/Projects/PAI/

## Security Checks

| Check | Status | Details |
|-------|--------|---------|
| Secret Scan | [PASS/FAIL] | [Details] |
| Private Paths | [PASS/FAIL] | [Count found] |
| Hardcoded Identity | [PASS/FAIL] | [Count found] |
| Sensitive Files | [PASS/FAIL] | [Files found] |
| Gitignore | [PASS/FAIL] | [Missing entries] |

## Issues Found

### Critical (Block Push)
- [List any critical issues]

### Warnings (Review Before Push)
- [List any warnings]

## Recommendations
- [Suggestions for improvement]

## Overall Status: [SAFE TO PUSH | NEEDS ATTENTION | BLOCKED]
```

---

## When This Workflow Fails

If ANY critical check fails:

1. **DO NOT PUSH** to public repository
2. Identify the leaked/sensitive content
3. Remove from public repo
4. If already pushed, remove from git history using BFG
5. Re-run validation until all checks pass

---

## Completion Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Cross-repo validation complete. [STATUS]"}' \
  > /dev/null 2>&1 &
```

---

## Related Workflows

- `SecretScanning.md` - Detailed secret detection
- `PrivateSystemAudit.md` - Full private system audit
- PAI skill → `PAIIntegrityCheck.md` - Public pack validation
