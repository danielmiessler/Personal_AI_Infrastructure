# PrivacyCheck Workflow

**Purpose:** Validate that sensitive data from USER/ and WORK/ directories has not leaked into regular skills, system files, or public-facing content.

**Triggers:** "privacy check", "check for sensitive data", "verify data isolation", "audit for leaks"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running privacy check for sensitive data leakage"}' \
  > /dev/null 2>&1 &
```

Running the **PrivacyCheck** workflow from the **System** skill...

---

## Protected Directories

| Directory | Contains | Protection Level |
|-----------|----------|------------------|
| `skills/CORE/USER/` | Personal data, finances, health, contacts | RESTRICTED |
| `skills/CORE/WORK/` | Customer data, consulting, client deliverables | RESTRICTED |

**Rule:** Content from these directories must NEVER appear outside of them.

---

## Execution

### Step 1: Identify Sensitive Patterns

Build a list of sensitive patterns to search for:

```bash
# Extract potentially sensitive identifiers from USER/
cd ~/.claude/skills/CORE/USER

# Customer names (if any)
CUSTOMERS=$(ls ../WORK/Customers/ 2>/dev/null | head -10)

# Email patterns
EMAILS=$(grep -roh '[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*\.[a-zA-Z]{2,}' . 2>/dev/null | sort -u | head -20)

# Phone patterns
PHONES=$(grep -roh '[0-9]\{3\}[-. ][0-9]\{3\}[-. ][0-9]\{4\}' . 2>/dev/null | sort -u | head -10)
```

### Step 2: Scan Non-Protected Areas

Check that sensitive patterns don't appear in regular skill directories:

```bash
cd ~/.claude/skills

echo "=== Scanning skills for USER/WORK content leakage ==="

# Directories to scan (everything except CORE/USER and CORE/WORK)
SCAN_DIRS=$(find . -type d -name "Workflows" -o -type d -name "Tools" 2>/dev/null | grep -v "CORE/USER" | grep -v "CORE/WORK")

# Check for personal email
for dir in $SCAN_DIRS; do
  grep -r "@danielmiessler.com" "$dir" 2>/dev/null && echo "FOUND in $dir"
done

# Check for private paths referenced
grep -r "CORE/USER" . --exclude-dir="CORE/USER" --exclude-dir="CORE/WORK" --exclude-dir=".git" 2>/dev/null | grep -v README | grep -v "See also"
grep -r "CORE/WORK" . --exclude-dir="CORE/USER" --exclude-dir="CORE/WORK" --exclude-dir=".git" 2>/dev/null | grep -v README | grep -v "See also"
```

### Step 3: Check for Customer Data Leakage

```bash
cd ~/.claude

echo "=== Checking for customer data outside WORK/ ==="

# If we have customer directories, check their names don't appear elsewhere
if [ -d "skills/CORE/WORK/Customers" ]; then
  for customer in skills/CORE/WORK/Customers/*/; do
    CUST_NAME=$(basename "$customer")
    # Search outside of WORK for this customer name
    grep -ri "$CUST_NAME" skills/ --exclude-dir="CORE/WORK" --exclude-dir=".git" 2>/dev/null && echo "LEAKED: $CUST_NAME"
  done
fi
```

### Step 4: Validate No PII in Skills

```bash
cd ~/.claude/skills

echo "=== Checking for PII patterns in skills ==="

# Skip USER and WORK directories
EXCLUDE="--exclude-dir=CORE/USER --exclude-dir=CORE/WORK --exclude-dir=.git --exclude-dir=node_modules"

# SSN pattern (XXX-XX-XXXX)
grep -rE '[0-9]{3}-[0-9]{2}-[0-9]{4}' . $EXCLUDE 2>/dev/null && echo "FOUND: SSN pattern"

# Credit card pattern (basic)
grep -rE '[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}' . $EXCLUDE 2>/dev/null && echo "FOUND: CC pattern"

# EIN pattern
grep -rE '[0-9]{2}-[0-9]{7}' . $EXCLUDE 2>/dev/null | grep -v example && echo "FOUND: EIN pattern"
```

### Step 5: Check MEMORY/ for Sensitive Content

```bash
cd ~/.claude/MEMORY

echo "=== Checking MEMORY for sensitive content ==="

# MEMORY may contain work items - that's OK
# But check that raw session logs don't contain PII that should be scrubbed

# Check for credit cards in raw logs
grep -rE '[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}' RAW/ 2>/dev/null | head -5

# Check for SSNs
grep -rE '[0-9]{3}-[0-9]{2}-[0-9]{4}' RAW/ 2>/dev/null | head -5
```

### Step 6: Cross-Repo Validation

Invoke the CrossRepoValidation workflow to ensure nothing leaked to public repo:

```
→ Execute CrossRepoValidation.md
```

---

## Report Format

```markdown
# Privacy Check Report

**Date:** [DATE]
**Scope:** ~/.claude/skills/ (excluding USER/, WORK/)

## Protected Content Validation

| Check | Status | Details |
|-------|--------|---------|
| USER content isolation | [PASS/FAIL] | [Details] |
| WORK content isolation | [PASS/FAIL] | [Details] |
| Customer data isolation | [PASS/FAIL] | [Details] |
| PII patterns | [PASS/FAIL] | [Patterns found] |
| Cross-repo validation | [PASS/FAIL] | [Details] |

## Leaks Found

### Critical (Immediate Action Required)
- [List any critical leaks]

### Warnings (Review Required)
- [List any warnings]

## Recommendations
- [Suggestions for remediation]

## Overall Status: [CLEAN | NEEDS REMEDIATION | CRITICAL]
```

---

## When This Workflow Fails

If ANY sensitive data is found outside protected directories:

1. **Immediately remove** the leaked content
2. **Check git history** - if committed, use BFG to remove
3. **Audit** - determine how the leak occurred
4. **Prevent** - add patterns to pre-commit hooks if needed
5. **Re-run** until all checks pass

---

## Completion Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Privacy check complete. [STATUS]"}' \
  > /dev/null 2>&1 &
```

---

## Related Workflows

- `CrossRepoValidation.md` - Validates private/public repo separation
- `SecretScanning.md` - Detects API keys and credentials
- `PrivateSystemAudit.md` - Comprehensive system integrity check
