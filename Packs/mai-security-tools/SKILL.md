# Security Tools

CLI security scanning tools for dependencies, secrets, and SBOM generation.

## Description

**USE WHEN:** security scan, vulnerability check, secrets detection, SBOM, CVE, compliance, CI/CD pipeline, dependency audit, secret leak prevention, software bill of materials.

This pack provides three security scanning tools designed for both local development and CI/CD integration:

1. **DependencyAudit** - Scans dependencies for known vulnerabilities (CVEs)
2. **SecretsScan** - Detects leaked secrets and credentials in source code
3. **SbomGenerator** - Generates Software Bill of Materials (CycloneDX/SPDX)

## Workflow Routing

| Workflow | When to Use | Reference |
|----------|-------------|-----------|
| DependencyScan | "scan dependencies", "check CVEs", "audit vulnerabilities" | `Workflows/DependencyScan.md` |
| SecretsScan | "find secrets", "detect leaked credentials", "scan for keys" | `Workflows/SecretsScan.md` |
| GenerateSBOM | "create SBOM", "software bill of materials", "compliance report" | `Workflows/GenerateSBOM.md` |
| FullSecurityAudit | "full security scan", "run all checks", "security audit" | `Workflows/FullSecurityAudit.md` |

## Tools

### DependencyAudit.ts

Scans project dependencies for known vulnerabilities across multiple package managers.

**Supported Package Managers:**
- npm (package-lock.json)
- pnpm (pnpm-lock.yaml)
- yarn (yarn.lock)
- pip (requirements.txt)
- poetry (poetry.lock)
- cargo (Cargo.lock)
- go (go.sum)

**Usage:**
```bash
# Basic scan (auto-detects package manager)
bun run Tools/DependencyAudit.ts

# Scan specific directory
bun run Tools/DependencyAudit.ts /path/to/project

# Fail on specific severity (for CI)
bun run Tools/DependencyAudit.ts --fail-on=high

# Output SARIF for GitHub Security tab
bun run Tools/DependencyAudit.ts --sarif > results.sarif

# Combined options
bun run Tools/DependencyAudit.ts --fail-on=critical --sarif /path/to/project
```

**Exit Codes:**
- `0` - No vulnerabilities at or above threshold
- `1` - Vulnerabilities found at or above threshold
- `2` - Audit tool not installed or execution error

---

### SecretsScan.ts

Scans source code for leaked secrets, API keys, and credentials.

**Detected Secrets:**
- AWS Access Keys & Secret Keys
- GitHub/GitLab Tokens
- Anthropic API Keys
- OpenAI API Keys
- Google API Keys
- Stripe Keys (live & publishable)
- Twilio Auth Tokens
- SendGrid API Keys
- Discord Tokens
- NPM Tokens
- PyPI Tokens
- Docker Hub Tokens
- Heroku API Keys
- JWT Tokens
- SSH Private Keys
- Generic Private Keys
- High Entropy Strings (base64)

**Usage:**
```bash
# Scan current directory
bun run Tools/SecretsScan.ts

# Scan specific directory
bun run Tools/SecretsScan.ts /path/to/project

# Output SARIF for GitHub Security tab
bun run Tools/SecretsScan.ts --sarif > results.sarif

# Use baseline to ignore known false positives
bun run Tools/SecretsScan.ts --baseline=.secretsignore

# Scan with all options
bun run Tools/SecretsScan.ts --sarif --baseline=.secretsignore /path/to/project
```

**Baseline File (.secretsignore):**
```
# Lines starting with # are comments
# Format: filepath:line_number or filepath:pattern
src/config.example.ts:15
tests/fixtures/*
*.test.ts:mock_api_key
```

**Exit Codes:**
- `0` - No secrets detected
- `1` - Secrets found
- `2` - Execution error

---

### SbomGenerator.ts

Generates Software Bill of Materials in CycloneDX or SPDX format.

**Supported Package Managers:**
- npm/pnpm/yarn (package.json)
- pip (requirements.txt)
- poetry (pyproject.toml)
- cargo (Cargo.toml)
- go (go.mod)

**Usage:**
```bash
# Generate CycloneDX SBOM (default)
bun run Tools/SbomGenerator.ts

# Generate SPDX format
bun run Tools/SbomGenerator.ts --format=spdx

# Include dev dependencies
bun run Tools/SbomGenerator.ts --include-dev

# Output to file
bun run Tools/SbomGenerator.ts --output=sbom.json

# Scan specific directory with all options
bun run Tools/SbomGenerator.ts --format=cyclonedx --include-dev --output=sbom.json /path/to/project
```

**Exit Codes:**
- `0` - SBOM generated successfully
- `1` - Error generating SBOM

---

## CI/CD Integration

This pack includes ready-to-use GitHub Actions workflows in the `CI/github/` directory.

### Quick Start

Copy the workflows to your project:
```bash
cp CI/github/*.yml .github/workflows/
```

### Available Workflows

1. **security-scan.yml** - Full security pipeline (runs all scans)
2. **dependency-audit.yml** - Reusable dependency audit workflow
3. **secrets-scan.yml** - Reusable secrets scan workflow

### SARIF Integration

All tools support SARIF output format, which integrates with GitHub's Security tab:
- Vulnerabilities appear in Security > Code scanning alerts
- PR checks show security findings inline
- Track security posture over time

See `CI/README.md` for detailed integration instructions.

## Configuration

### Ignoring False Positives

Create a `.secretsignore` file in your project root:
```
# Ignore test fixtures
tests/fixtures/*

# Ignore example configs
*.example.*

# Ignore specific line
src/config.ts:42
```

### Severity Thresholds

Use `--fail-on` to set CI failure thresholds:
- `critical` - Only fail on critical vulnerabilities
- `high` - Fail on high and critical (recommended for CI)
- `medium` - Fail on medium and above
- `low` - Fail on any vulnerability

## Requirements

- Bun runtime
- Package manager audit tools (for DependencyAudit):
  - npm: built-in
  - pnpm: built-in
  - cargo: `cargo install cargo-audit`
  - pip: `pip install pip-audit`
  - poetry: `pip install pip-audit`
