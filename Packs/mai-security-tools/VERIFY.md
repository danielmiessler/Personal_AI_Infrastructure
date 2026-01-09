# Security Tools Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] Pack directory exists with required files
- [ ] `Tools/` contains 3 TypeScript files
- [ ] `CI/github/` contains 3 workflow files
- [ ] `package.json` and `bun.lock` present

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

echo "Checking directory structure..."
ls -la "$PACK_DIR/"
echo ""
echo "Tools:"
ls "$PACK_DIR/Tools/"
echo ""
echo "CI Workflows:"
ls "$PACK_DIR/CI/github/"
```

**Expected:**
- `Tools/`: DependencyAudit.ts, SecretsScan.ts, SbomGenerator.ts
- `CI/github/`: dependency-audit.yml, secrets-scan.yml, security-scan.yml

---

## Dependencies

- [ ] Bun runtime installed
- [ ] Node modules installed (bun.lock present)

```bash
bun --version && echo "Bun OK"
```

---

## Tool Help Tests

Verify each tool responds to `--help`:

### DependencyAudit
- [ ] Shows usage information

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"
bun run "$PACK_DIR/Tools/DependencyAudit.ts" --help
```

### SecretsScan
- [ ] Shows usage information

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"
bun run "$PACK_DIR/Tools/SecretsScan.ts" --help
```

### SbomGenerator
- [ ] Shows usage information

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"
bun run "$PACK_DIR/Tools/SbomGenerator.ts" --help
```

---

## Functional Tests

### DependencyAudit

- [ ] Can scan a directory with package.json

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

# Scan the pack itself (has package.json)
bun run "$PACK_DIR/Tools/DependencyAudit.ts" "$PACK_DIR"
```

**Expected:** Exit code 0 or 1 (not 2), vulnerability report output

### SecretsScan

- [ ] Can scan a directory for secrets

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

# Scan the pack itself (should find no secrets)
bun run "$PACK_DIR/Tools/SecretsScan.ts" "$PACK_DIR"
```

**Expected:** Exit code 0 (no secrets in pack source)

### SbomGenerator

- [ ] Can generate CycloneDX SBOM

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

# Generate SBOM for the pack
bun run "$PACK_DIR/Tools/SbomGenerator.ts" "$PACK_DIR"
```

**Expected:** JSON output with `"bomFormat": "CycloneDX"`

- [ ] Can generate SPDX SBOM

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

bun run "$PACK_DIR/Tools/SbomGenerator.ts" --format=spdx "$PACK_DIR"
```

**Expected:** JSON output with `"spdxVersion": "SPDX-2.3"`

---

## SARIF Output Tests

- [ ] DependencyAudit produces valid SARIF

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

bun run "$PACK_DIR/Tools/DependencyAudit.ts" --sarif "$PACK_DIR" | head -20
```

**Expected:** JSON with `"$schema"` and `"runs"` array

- [ ] SecretsScan produces valid SARIF

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

bun run "$PACK_DIR/Tools/SecretsScan.ts" --sarif "$PACK_DIR" | head -20
```

**Expected:** JSON with `"$schema"` and `"runs"` array

---

## Exit Code Tests

- [ ] Exit code 0 when no issues found

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

# SecretsScan on clean directory should exit 0
bun run "$PACK_DIR/Tools/SecretsScan.ts" "$PACK_DIR"
echo "Exit code: $?"
```

- [ ] Exit code behavior with --fail-on threshold

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"

bun run "$PACK_DIR/Tools/DependencyAudit.ts" --fail-on=critical "$PACK_DIR"
echo "Exit code: $?"
```

**Expected:** Exit code 0 if no critical vulnerabilities

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Bun installed | |
| DependencyAudit --help | |
| SecretsScan --help | |
| SbomGenerator --help | |
| DependencyAudit scan | |
| SecretsScan scan | |
| SBOM CycloneDX output | |
| SBOM SPDX output | |
| SARIF output format | |
| Exit codes correct | |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/security-tools"
TOOLS="$PACK_DIR/Tools"

echo "=== Security Tools Verification ==="
echo ""

echo "1. Checking structure..."
[ -f "$TOOLS/DependencyAudit.ts" ] && [ -f "$TOOLS/SecretsScan.ts" ] && [ -f "$TOOLS/SbomGenerator.ts" ] && echo "Structure OK" || echo "Structure FAILED"
echo ""

echo "2. DependencyAudit..."
bun run "$TOOLS/DependencyAudit.ts" "$PACK_DIR" > /dev/null 2>&1
[ $? -ne 2 ] && echo "DependencyAudit OK" || echo "DependencyAudit FAILED"
echo ""

echo "3. SecretsScan..."
bun run "$TOOLS/SecretsScan.ts" "$PACK_DIR" > /dev/null 2>&1
[ $? -eq 0 ] && echo "SecretsScan OK" || echo "SecretsScan FAILED (exit: $?)"
echo ""

echo "4. SbomGenerator (CycloneDX)..."
bun run "$TOOLS/SbomGenerator.ts" "$PACK_DIR" 2>/dev/null | grep -q "CycloneDX" && echo "SBOM CycloneDX OK" || echo "SBOM CycloneDX FAILED"
echo ""

echo "5. SbomGenerator (SPDX)..."
bun run "$TOOLS/SbomGenerator.ts" --format=spdx "$PACK_DIR" 2>/dev/null | grep -q "SPDX" && echo "SBOM SPDX OK" || echo "SBOM SPDX FAILED"
echo ""

echo "6. SARIF output..."
bun run "$TOOLS/SecretsScan.ts" --sarif "$PACK_DIR" 2>/dev/null | grep -q '"runs"' && echo "SARIF OK" || echo "SARIF FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## External Tool Dependencies

DependencyAudit requires external tools for non-JavaScript package managers:

| Package Manager | External Tool | Install Command |
|----------------|---------------|-----------------|
| npm/pnpm/yarn | Built-in | - |
| pip/poetry | pip-audit | `pip install pip-audit` |
| cargo | cargo-audit | `cargo install cargo-audit` |
| go | govulncheck | `go install golang.org/x/vuln/cmd/govulncheck@latest` |

If scanning a project using these package managers, install the corresponding tool first.
