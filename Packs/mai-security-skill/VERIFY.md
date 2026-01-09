# Security Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `$PAI_DIR/skills/Security/` exists
- [ ] `$PAI_DIR/skills/Security/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Security/Workflows/` contains 5 .md files
- [ ] `$PAI_DIR/skills/Security/Knowledge/` contains CMMC-INDEX.md and owasp-patterns.md
- [ ] `$PAI_DIR/skills/Security/Knowledge/cmmc/` contains 17 domain .md files
- [ ] `$PAI_DIR/skills/Security/Templates/` contains 2 .md files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking directories..."
ls -la "$PAI_DIR/skills/Security/"
echo ""
echo "Workflows:"
ls "$PAI_DIR/skills/Security/Workflows/"
echo ""
echo "Knowledge:"
ls "$PAI_DIR/skills/Security/Knowledge/"
echo ""
echo "CMMC Domains:"
ls "$PAI_DIR/skills/Security/Knowledge/cmmc/"
echo ""
echo "Templates:"
ls "$PAI_DIR/skills/Security/Templates/"
```

---

## Dependency Check

This skill depends on **mai-security-tools** for automated scanning capabilities.

- [ ] mai-security-tools is installed

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking for mai-security-tools..."
if [ -d "$PAI_DIR/tools/security-tools" ] || [ -f "$PAI_DIR/tools/DependencyAudit.ts" ]; then
  echo "OK: mai-security-tools found"
else
  echo "WARN: mai-security-tools not found - scanning capabilities will be unavailable"
  echo "Install with: ./scripts/install-pack.sh mai-security-tools"
fi
```

---

## Workflow Verification

### Workflows Present
- [ ] ThreatModel.md exists
- [ ] SecurityReview.md exists
- [ ] CmmcBaseline.md exists
- [ ] GenerateAudit.md exists
- [ ] InfrastructureSecurity.md exists

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
WORKFLOWS="$PAI_DIR/skills/Security/Workflows"

echo "Checking workflows..."
for wf in ThreatModel SecurityReview CmmcBaseline GenerateAudit InfrastructureSecurity; do
  if [ -f "$WORKFLOWS/${wf}.md" ]; then
    echo "OK: ${wf}.md"
  else
    echo "MISSING: ${wf}.md"
  fi
done
```

---

## Knowledge Base Verification

### OWASP Patterns
- [ ] owasp-patterns.md exists and contains OWASP Top 10 categories

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
OWASP="$PAI_DIR/skills/Security/Knowledge/owasp-patterns.md"

if [ -f "$OWASP" ]; then
  echo "OK: owasp-patterns.md exists"
  grep -c "^## A0" "$OWASP" && echo "categories found"
else
  echo "MISSING: owasp-patterns.md"
fi
```

### CMMC Index
- [ ] CMMC-INDEX.md exists
- [ ] All 17 CMMC domain files exist in Knowledge/cmmc/

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
CMMC="$PAI_DIR/skills/Security/Knowledge/cmmc"

echo "Checking CMMC domains..."
EXPECTED_DOMAINS="AC AT AU CA CM CP IA IR MA MP PE PS RA RE SA SC SI"
for domain in $EXPECTED_DOMAINS; do
  if [ -f "$CMMC/${domain}.md" ]; then
    echo "OK: ${domain}.md"
  else
    echo "MISSING: ${domain}.md"
  fi
done
```

---

## Template Verification

- [ ] threat-model.md template exists
- [ ] security-report.md template exists

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TEMPLATES="$PAI_DIR/skills/Security/Templates"

echo "Checking templates..."
for tmpl in threat-model security-report; do
  if [ -f "$TEMPLATES/${tmpl}.md" ]; then
    echo "OK: ${tmpl}.md"
  else
    echo "MISSING: ${tmpl}.md"
  fi
done
```

---

## Functional Tests

### Workflow Routing Test
- [ ] Skill triggers are recognized

Test by asking Claude Code:
```
> Create a threat model for user authentication
```
**Expected:** Loads ThreatModel workflow

```
> Run a security review on src/api/
```
**Expected:** Loads SecurityReview workflow

```
> What CMMC practices apply to our data pipeline?
```
**Expected:** Loads CmmcBaseline workflow

### Template Generation Test
- [ ] Templates can be used to generate output

Test by asking Claude Code to generate a threat model for a simple system. The output should follow the structure in Templates/threat-model.md.

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | Pass/Fail |
| mai-security-tools dependency | Pass/Warn |
| Workflows present (5) | Pass/Fail |
| Knowledge base present | Pass/Fail |
| CMMC domains (17) | Pass/Fail |
| Templates present (2) | Pass/Fail |
| Workflow routing | Pass/Fail |

**All checks except dependency warnings must pass for installation to be complete.**

Note: Without mai-security-tools, automated scanning (DependencyAudit, SecretsScan, SastScan, ContainerScan) will be unavailable. The skill will still function for manual reviews and documentation.

---

## Quick Full Test

Run all verifications at once:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILL="$PAI_DIR/skills/Security"

echo "=== Security Skill Verification ==="
echo ""

echo "1. Directory Structure..."
if [ -d "$SKILL" ] && [ -f "$SKILL/SKILL.md" ]; then
  echo "OK: Skill directory exists"
else
  echo "FAIL: Skill directory or SKILL.md missing"
fi
echo ""

echo "2. Workflows (expecting 5)..."
WF_COUNT=$(ls "$SKILL/Workflows/"*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$WF_COUNT" -eq 5 ]; then
  echo "OK: $WF_COUNT workflows found"
else
  echo "FAIL: Found $WF_COUNT workflows, expected 5"
fi
echo ""

echo "3. Knowledge Base..."
if [ -f "$SKILL/Knowledge/owasp-patterns.md" ] && [ -f "$SKILL/Knowledge/CMMC-INDEX.md" ]; then
  echo "OK: Core knowledge files present"
else
  echo "FAIL: Missing knowledge files"
fi
echo ""

echo "4. CMMC Domains (expecting 17)..."
CMMC_COUNT=$(ls "$SKILL/Knowledge/cmmc/"*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$CMMC_COUNT" -eq 17 ]; then
  echo "OK: $CMMC_COUNT CMMC domain files found"
else
  echo "FAIL: Found $CMMC_COUNT domain files, expected 17"
fi
echo ""

echo "5. Templates (expecting 2)..."
TMPL_COUNT=$(ls "$SKILL/Templates/"*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$TMPL_COUNT" -eq 2 ]; then
  echo "OK: $TMPL_COUNT templates found"
else
  echo "FAIL: Found $TMPL_COUNT templates, expected 2"
fi
echo ""

echo "6. Dependency: mai-security-tools..."
if [ -d "$PAI_DIR/tools/security-tools" ] || [ -f "$PAI_DIR/tools/DependencyAudit.ts" ]; then
  echo "OK: mai-security-tools found"
else
  echo "WARN: mai-security-tools not installed (scanning unavailable)"
fi
echo ""

echo "=== Verification Complete ==="
```
