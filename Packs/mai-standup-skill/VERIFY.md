# Standup Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `mai-standup-skill/` pack exists
- [ ] `SKILL.md` exists
- [ ] `Config/standup.yaml` exists
- [ ] `Workflows/` contains 3 workflow files

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Config:"
ls "$PACK_DIR/Config/"
echo ""
echo "Workflows:"
ls "$PACK_DIR/Workflows/"
```

**Expected Workflows:**
- `RunStandup.md` - Main multi-agent standup workflow
- `QuickReview.md` - Lightweight 2-agent review
- `SecurityReview.md` - Security-focused standup with veto power

---

## Dependency Check

- [ ] `mai-council-framework` pack is installed
- [ ] `mai-devsecops-agents` pack is installed

```bash
PAI_DIR="${PAI_DIR:-$HOME/PAI}"

echo "Checking dependencies..."
ls -d "$PAI_DIR/Packs/mai-council-framework" 2>/dev/null && echo "mai-council-framework found" || echo "MISSING: mai-council-framework"
ls -d "$PAI_DIR/Packs/mai-devsecops-agents" 2>/dev/null && echo "mai-devsecops-agents found" || echo "MISSING: mai-devsecops-agents"
```

---

## Workflow Files Verification

### RunStandup.md
- [ ] Contains workflow metadata block
- [ ] Defines triggers: `standup`, `standup about *`, `standup on *`, `council on *`, `team review *`
- [ ] Implements request parsing, domain detection, roster selection

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"
grep -q "workflow: RunStandup" "$PACK_DIR/Workflows/RunStandup.md" && echo "RunStandup metadata OK" || echo "MISSING: RunStandup metadata"
```

### QuickReview.md
- [ ] Contains workflow metadata block
- [ ] Defines triggers: `quick review *`, `fast review *`, `quick check *`
- [ ] Uses fixed 2-agent roster (Clay, Hefley)
- [ ] Implements escalation detection

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"
grep -q "workflow: QuickReview" "$PACK_DIR/Workflows/QuickReview.md" && echo "QuickReview metadata OK" || echo "MISSING: QuickReview metadata"
```

### SecurityReview.md
- [ ] Contains workflow metadata block
- [ ] Defines triggers: `security review *`, `security standup *`, `security council *`, `sec review *`
- [ ] Implements veto power for Daniel
- [ ] Includes compliance check round

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"
grep -q "workflow: SecurityReview" "$PACK_DIR/Workflows/SecurityReview.md" && echo "SecurityReview metadata OK" || echo "MISSING: SecurityReview metadata"
```

---

## Configuration Verification

- [ ] `Config/standup.yaml` contains valid YAML
- [ ] Default visibility mode is set
- [ ] Output destinations are configured
- [ ] Roster presets are defined
- [ ] Domain keywords for auto-selection are present

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"

echo "Checking configuration..."
grep -q "visibility:" "$PACK_DIR/Config/standup.yaml" && echo "visibility config OK" || echo "MISSING: visibility config"
grep -q "outputDestinations:" "$PACK_DIR/Config/standup.yaml" && echo "outputDestinations config OK" || echo "MISSING: outputDestinations config"
grep -q "rosterPresets:" "$PACK_DIR/Config/standup.yaml" && echo "rosterPresets config OK" || echo "MISSING: rosterPresets config"
grep -q "domainKeywords:" "$PACK_DIR/Config/standup.yaml" && echo "domainKeywords config OK" || echo "MISSING: domainKeywords config"
```

---

## SKILL.md Verification

- [ ] Skill metadata (name, version, type) present
- [ ] Dependencies declared (`mai-council-framework`, `mai-devsecops-agents`)
- [ ] Trigger patterns documented
- [ ] Workflow routing defined

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"

echo "Checking SKILL.md..."
grep -q "name: standup" "$PACK_DIR/SKILL.md" && echo "skill name OK" || echo "MISSING: skill name"
grep -q "mai-council-framework" "$PACK_DIR/SKILL.md" && echo "council-framework dependency OK" || echo "MISSING: council-framework dependency"
grep -q "mai-devsecops-agents" "$PACK_DIR/SKILL.md" && echo "devsecops-agents dependency OK" || echo "MISSING: devsecops-agents dependency"
```

---

## Package.json Verification

- [ ] Package name matches skill name
- [ ] Version is defined
- [ ] PAI metadata includes triggers and requirements

```bash
PACK_DIR="${PAI_DIR:-$HOME/PAI}/Packs/mai-standup-skill"

echo "Checking package.json..."
grep -q '"name": "mai-standup-skill"' "$PACK_DIR/package.json" && echo "package name OK" || echo "MISMATCH: package name"
grep -q '"version":' "$PACK_DIR/package.json" && echo "version OK" || echo "MISSING: version"
grep -q '"pai":' "$PACK_DIR/package.json" && echo "PAI metadata OK" || echo "MISSING: PAI metadata"
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | ☐ |
| SKILL.md valid | ☐ |
| Config/standup.yaml valid | ☐ |
| RunStandup.md workflow | ☐ |
| QuickReview.md workflow | ☐ |
| SecurityReview.md workflow | ☐ |
| mai-council-framework installed | ☐ |
| mai-devsecops-agents installed | ☐ |
| package.json valid | ☐ |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PAI_DIR="${PAI_DIR:-$HOME/PAI}"
PACK_DIR="$PAI_DIR/Packs/mai-standup-skill"

echo "=== Standup Skill Verification ==="
echo ""

echo "1. Directory Structure..."
[ -d "$PACK_DIR" ] && echo "Pack directory OK" || echo "MISSING: Pack directory"
[ -f "$PACK_DIR/SKILL.md" ] && echo "SKILL.md OK" || echo "MISSING: SKILL.md"
[ -f "$PACK_DIR/Config/standup.yaml" ] && echo "Config OK" || echo "MISSING: Config/standup.yaml"
echo ""

echo "2. Workflows..."
[ -f "$PACK_DIR/Workflows/RunStandup.md" ] && echo "RunStandup.md OK" || echo "MISSING: RunStandup.md"
[ -f "$PACK_DIR/Workflows/QuickReview.md" ] && echo "QuickReview.md OK" || echo "MISSING: QuickReview.md"
[ -f "$PACK_DIR/Workflows/SecurityReview.md" ] && echo "SecurityReview.md OK" || echo "MISSING: SecurityReview.md"
echo ""

echo "3. Dependencies..."
[ -d "$PAI_DIR/Packs/mai-council-framework" ] && echo "mai-council-framework OK" || echo "MISSING: mai-council-framework"
[ -d "$PAI_DIR/Packs/mai-devsecops-agents" ] && echo "mai-devsecops-agents OK" || echo "MISSING: mai-devsecops-agents"
echo ""

echo "4. Configuration Keys..."
grep -q "visibility:" "$PACK_DIR/Config/standup.yaml" && echo "visibility config OK" || echo "MISSING: visibility"
grep -q "rosterPresets:" "$PACK_DIR/Config/standup.yaml" && echo "rosterPresets OK" || echo "MISSING: rosterPresets"
grep -q "domainKeywords:" "$PACK_DIR/Config/standup.yaml" && echo "domainKeywords OK" || echo "MISSING: domainKeywords"
echo ""

echo "5. Package Metadata..."
grep -q '"mai-standup-skill"' "$PACK_DIR/package.json" && echo "package name OK" || echo "MISMATCH: package name"
grep -q '"pai":' "$PACK_DIR/package.json" && echo "PAI metadata OK" || echo "MISSING: PAI metadata"
echo ""

echo "=== Verification Complete ==="
```

---

## Trigger Test

Once verified, test the skill triggers:

```
# Main standup
standup about authentication design

# Quick review
quick review this caching approach

# Security review
security review the API authentication flow
```

**Expected behavior:**
- Main standup: Auto-selects roster based on topic, runs 3 rounds, presents synthesis
- Quick review: Uses Clay + Hefley, single round, streamlined output
- Security review: Uses security roster with Daniel lead, includes compliance check
