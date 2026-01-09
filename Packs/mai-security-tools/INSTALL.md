# mai-security-tools Installation

CLI security scanning tools for dependencies, secrets, and SBOM generation. Designed for both local development and CI/CD integration.

## Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- Git (for cloning)

### Optional External Tools (for non-JavaScript projects)

| Package Manager | Required Tool | Install Command |
|----------------|---------------|-----------------|
| pip / poetry | pip-audit | `pip install pip-audit` |
| cargo (Rust) | cargo-audit | `cargo install cargo-audit` |
| go | govulncheck | `go install golang.org/x/vuln/cmd/govulncheck@latest` |

npm, pnpm, and yarn auditing is built-in and requires no additional tools.

---

## Step 1: Clone or Copy the Pack

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Option A: If part of PAI repository
cd ~/PAI/Packs/mai-security-tools

# Option B: Copy to PAI tools directory
cp -r mai-security-tools "$PAI_DIR/tools/security-tools"
cd "$PAI_DIR/tools/security-tools"
```

---

## Step 2: Install Dependencies

```bash
bun install
```

This installs TypeScript and type definitions needed for the tools.

---

## Step 3: Verify Tool Installation

Test each tool responds to `--help`:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/tools/security-tools/Tools"

# Test DependencyAudit
bun run "$TOOLS/DependencyAudit.ts" --help

# Test SecretsScan
bun run "$TOOLS/SecretsScan.ts" --help

# Test SbomGenerator
bun run "$TOOLS/SbomGenerator.ts" --help
```

---

## Step 4: Install External Audit Tools (Optional)

If you need to scan non-JavaScript projects:

### Python (pip/poetry)
```bash
pip install pip-audit
pip-audit --version
```

### Rust (cargo)
```bash
cargo install cargo-audit
cargo-audit --version
```

### Go
```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck -version
```

---

## Step 5: Verify Installation

Reference the full verification checklist in [VERIFY.md](VERIFY.md) or run the quick verification:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/tools/security-tools/Tools"

echo "=== Security Tools Verification ==="

echo "1. Checking structure..."
[ -f "$TOOLS/DependencyAudit.ts" ] && \
[ -f "$TOOLS/SecretsScan.ts" ] && \
[ -f "$TOOLS/SbomGenerator.ts" ] && \
echo "OK: All tools present" || echo "FAIL: Missing tools"

echo "2. DependencyAudit..."
bun run "$TOOLS/DependencyAudit.ts" "$PAI_DIR/tools/security-tools" > /dev/null 2>&1
[ $? -ne 2 ] && echo "OK" || echo "FAIL (exit code 2 = execution error)"

echo "3. SecretsScan..."
bun run "$TOOLS/SecretsScan.ts" "$PAI_DIR/tools/security-tools" > /dev/null 2>&1
[ $? -eq 0 ] && echo "OK" || echo "FAIL"

echo "4. SbomGenerator (CycloneDX)..."
bun run "$TOOLS/SbomGenerator.ts" "$PAI_DIR/tools/security-tools" 2>/dev/null | grep -q "CycloneDX" && \
echo "OK" || echo "FAIL"

echo "5. SARIF output..."
bun run "$TOOLS/SecretsScan.ts" --sarif "$PAI_DIR/tools/security-tools" 2>/dev/null | grep -q '"runs"' && \
echo "OK" || echo "FAIL"

echo "=== Verification Complete ==="
```

---

## CI/CD Integration

### GitHub Actions

Copy the included GitHub Actions workflows to your project:

```bash
# In your project repository
mkdir -p .github/workflows

# Copy workflows from the pack
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cp "$PAI_DIR/tools/security-tools/CI/github/"*.yml .github/workflows/
```

Available workflows:
- `security-scan.yml` - Full security pipeline (all scans)
- `dependency-audit.yml` - Reusable dependency audit workflow
- `secrets-scan.yml` - Reusable secrets scan workflow

### Reusable Workflow Example

```yaml
# .github/workflows/security.yml
name: Security
on: [push, pull_request]

jobs:
  security:
    uses: ./.github/workflows/security-scan.yml
    with:
      fail-on: high
```

### Direct CLI Usage (Any CI System)

```bash
# Install Bun if needed
curl -fsSL https://bun.sh/install | bash

# Install pack dependencies
bun install

# Run scans
bun run Tools/DependencyAudit.ts --fail-on=high
bun run Tools/SecretsScan.ts --baseline=.secretsignore
bun run Tools/SbomGenerator.ts --output=sbom.json

# Output SARIF for GitHub Security tab
bun run Tools/DependencyAudit.ts --sarif > dependency-results.sarif
bun run Tools/SecretsScan.ts --sarif > secrets-results.sarif
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                sh 'bun run Tools/DependencyAudit.ts --fail-on=high'
                sh 'bun run Tools/SecretsScan.ts'
            }
        }
    }
}
```

### GitLab CI

```yaml
security-scan:
  image: oven/bun:latest
  script:
    - bun install
    - bun run Tools/DependencyAudit.ts --fail-on=high
    - bun run Tools/SecretsScan.ts
```

---

## Troubleshooting

### "Bun not found"

**Solution:**
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### "Exit code 2" from DependencyAudit

**Symptom:** DependencyAudit exits with code 2.

**Cause:** External audit tool not installed for the detected package manager.

**Solution:** Install the required external tool:
```bash
# For Python projects
pip install pip-audit

# For Rust projects
cargo install cargo-audit

# For Go projects
go install golang.org/x/vuln/cmd/govulncheck@latest
```

### False positives in SecretsScan

**Solution:** Create a `.secretsignore` file:
```
# Ignore test fixtures
tests/fixtures/*

# Ignore example configs
*.example.*

# Ignore specific line
src/config.ts:42
```

### SARIF upload fails in GitHub Actions

**Solution:** Ensure you're using the CodeQL action:
```yaml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

---

## File Locations

After successful installation:

```
$PAI_DIR/
└── tools/
    └── security-tools/
        ├── SKILL.md              # Tool descriptions and routing
        ├── README.md             # Documentation
        ├── VERIFY.md             # Verification checklist
        ├── INSTALL.md            # This file
        ├── package.json          # Package manifest
        ├── tsconfig.json         # TypeScript config
        ├── bun.lock              # Lock file
        ├── Tools/
        │   ├── DependencyAudit.ts
        │   ├── SecretsScan.ts
        │   └── SbomGenerator.ts
        ├── Workflows/
        │   ├── DependencyScan.md
        │   ├── SecretsScan.md
        │   ├── GenerateSBOM.md
        │   └── FullSecurityAudit.md
        └── CI/
            ├── README.md         # CI integration guide
            └── github/
                ├── security-scan.yml
                ├── dependency-audit.yml
                └── secrets-scan.yml
```

Where `PAI_DIR` defaults to `$HOME/.config/pai` if not set.

---

## Quick Reference

| Tool | Command | Description |
|------|---------|-------------|
| Dependency Audit | `bun run audit` | Scan for CVEs in dependencies |
| Secrets Scan | `bun run secrets` | Detect leaked credentials |
| SBOM Generator | `bun run sbom` | Generate software bill of materials |

### Common Options

| Option | Description | Applies To |
|--------|-------------|------------|
| `--fail-on=SEVERITY` | CI failure threshold (critical/high/medium/low) | DependencyAudit |
| `--sarif` | Output in SARIF format for GitHub | All |
| `--baseline=FILE` | Ignore known false positives | SecretsScan |
| `--format=FORMAT` | SBOM format (cyclonedx/spdx) | SbomGenerator |
| `--output=FILE` | Write output to file | SbomGenerator |
| `--include-dev` | Include dev dependencies | SbomGenerator |
