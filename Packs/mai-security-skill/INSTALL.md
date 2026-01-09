# mai-security-skill Installation

Security workflows and knowledge for shift-left security practices, including threat modeling, OWASP-based code review, CMMC compliance mapping, and infrastructure security auditing.

## Prerequisites

- Personal AI Infrastructure (PAI) system installed
- Bun runtime (for dependent tools)
- **mai-security-tools** pack (required for automated scanning)

---

## Step 1: Install Dependencies

This skill requires **mai-security-tools** for automated scanning capabilities. Install it first:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Install mai-security-tools (if not already installed)
cd "$PAI_DIR/../Packs/mai-security-tools"
bun install
```

Without mai-security-tools, the following capabilities will be unavailable:
- `DependencyAudit` - Dependency vulnerability scanning
- `SecretsScan` - Secrets detection
- `SastScan` - Static analysis security testing
- `ContainerScan` - Container image scanning

---

## Step 2: Install the Skill Pack

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Copy skill to PAI skills directory
cp -r mai-security-skill "$PAI_DIR/skills/Security"
```

Or using the PAI install script (if available):

```bash
./scripts/install-pack.sh mai-security-skill
```

---

## Step 3: Verify Directory Structure

Ensure all files are in place:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILL="$PAI_DIR/skills/Security"

ls -la "$SKILL/"
ls "$SKILL/Workflows/"
ls "$SKILL/Knowledge/"
ls "$SKILL/Knowledge/cmmc/"
ls "$SKILL/Templates/"
```

Expected structure:
```
Security/
├── SKILL.md
├── README.md
├── METHODOLOGY.md
├── package.json
├── Workflows/
│   ├── ThreatModel.md
│   ├── SecurityReview.md
│   ├── CmmcBaseline.md
│   ├── GenerateAudit.md
│   └── InfrastructureSecurity.md
├── Knowledge/
│   ├── CMMC-INDEX.md
│   ├── owasp-patterns.md
│   └── cmmc/           # 17 domain files (AC.md, AT.md, AU.md, etc.)
└── Templates/
    ├── threat-model.md
    └── security-report.md
```

---

## Step 4: Verify Installation

Reference the full verification checklist in [VERIFY.md](VERIFY.md) or run the quick verification:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILL="$PAI_DIR/skills/Security"

echo "=== Security Skill Verification ==="

echo "1. Directory Structure..."
[ -d "$SKILL" ] && [ -f "$SKILL/SKILL.md" ] && echo "OK" || echo "FAIL"

echo "2. Workflows (expecting 5)..."
ls "$SKILL/Workflows/"*.md 2>/dev/null | wc -l

echo "3. Knowledge Base..."
[ -f "$SKILL/Knowledge/owasp-patterns.md" ] && [ -f "$SKILL/Knowledge/CMMC-INDEX.md" ] && echo "OK" || echo "FAIL"

echo "4. CMMC Domains (expecting 17)..."
ls "$SKILL/Knowledge/cmmc/"*.md 2>/dev/null | wc -l

echo "5. Templates (expecting 2)..."
ls "$SKILL/Templates/"*.md 2>/dev/null | wc -l

echo "6. Dependency: mai-security-tools..."
[ -d "$PAI_DIR/tools/security-tools" ] || [ -f "$PAI_DIR/tools/DependencyAudit.ts" ] && echo "OK" || echo "WARN: Not found"

echo "=== Verification Complete ==="
```

---

## Step 5: Test Workflow Triggers

Test that the skill responds to trigger phrases:

```
# Threat modeling
> Create a threat model for user authentication

# Security review
> Run a security review on src/api/

# CMMC compliance
> What CMMC practices apply to our data pipeline?
```

---

## Troubleshooting

### Skill not loading

**Symptom:** Security workflows don't trigger on relevant prompts.

**Solution:**
1. Verify SKILL.md exists and contains correct routing table
2. Check that skill is registered in PAI skill index
3. Restart Claude Code session

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cat "$PAI_DIR/skills/Security/SKILL.md" | head -20
```

### mai-security-tools not found

**Symptom:** Warning about scanning capabilities being unavailable.

**Solution:**
```bash
# Install mai-security-tools
cd ~/PAI/Packs/mai-security-tools
bun install

# Or copy to expected location
cp -r mai-security-tools "$PAI_DIR/tools/security-tools"
```

### CMMC domain files missing

**Symptom:** CmmcBaseline workflow fails to load domain details.

**Solution:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# List expected domains
EXPECTED="AC AT AU CA CM CP IA IR MA MP PE PS RA RE SA SC SI"
for d in $EXPECTED; do
  [ -f "$PAI_DIR/skills/Security/Knowledge/cmmc/${d}.md" ] || echo "Missing: ${d}.md"
done
```

### Templates not generating correctly

**Symptom:** Generated threat models or security reports are missing sections.

**Solution:**
1. Check template files exist in Templates/
2. Verify template structure matches expected format
3. Re-copy templates from source pack

---

## File Locations

After successful installation:

```
$PAI_DIR/
└── skills/
    └── Security/
        ├── SKILL.md              # Skill definition and routing
        ├── README.md             # Documentation
        ├── METHODOLOGY.md        # Security principles
        ├── VERIFY.md             # Verification checklist
        ├── INSTALL.md            # This file
        ├── package.json          # Pack metadata
        ├── Workflows/
        │   ├── ThreatModel.md
        │   ├── SecurityReview.md
        │   ├── CmmcBaseline.md
        │   ├── GenerateAudit.md
        │   └── InfrastructureSecurity.md
        ├── Knowledge/
        │   ├── CMMC-INDEX.md
        │   ├── owasp-patterns.md
        │   └── cmmc/             # 17 domain detail files
        └── Templates/
            ├── threat-model.md
            └── security-report.md
```

Where `PAI_DIR` defaults to `$HOME/.config/pai` if not set.
