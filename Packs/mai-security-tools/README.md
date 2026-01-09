# mai-security-tools

CLI security scanning tools for dependencies, secrets, and SBOM generation. Designed for both local development and CI/CD integration.

## Features

- **Multi-Package Manager Support** - npm, pnpm, yarn, pip, poetry, cargo, go
- **SARIF Output** - Native integration with GitHub Security tab
- **CI/CD Ready** - Reusable GitHub Actions workflows included
- **Baseline Support** - Ignore known false positives
- **SBOM Generation** - CycloneDX and SPDX formats

## Quick Start

```bash
# Install dependencies
bun install

# Scan for dependency vulnerabilities
bun run audit

# Scan for leaked secrets
bun run secrets

# Generate SBOM
bun run sbom
```

## Tools

### DependencyAudit

Scans project dependencies for known vulnerabilities (CVEs).

```bash
# Basic scan
bun run audit

# Fail on high severity (for CI)
bun run audit -- --fail-on=high

# Output SARIF for GitHub
bun run audit -- --sarif > results.sarif
```

**Supported Package Managers:**
| Manager | Lock File | Audit Tool |
|---------|-----------|------------|
| npm | package-lock.json | Built-in |
| pnpm | pnpm-lock.yaml | Built-in |
| yarn | yarn.lock | Built-in |
| pip | requirements.txt | pip-audit |
| poetry | poetry.lock | pip-audit |
| cargo | Cargo.lock | cargo-audit |
| go | go.sum | govulncheck |

### SecretsScan

Detects leaked secrets and credentials in source code.

```bash
# Basic scan
bun run secrets

# Use baseline file
bun run secrets -- --baseline=.secretsignore

# Output SARIF
bun run secrets -- --sarif > results.sarif
```

**Detected Secret Types:**
- AWS Access Keys & Secret Keys
- GitHub/GitLab Tokens
- Anthropic/OpenAI API Keys
- Google API Keys
- Stripe Keys (live & test)
- Twilio, SendGrid, Discord tokens
- NPM, PyPI, Docker Hub tokens
- Heroku API Keys
- JWT Tokens
- SSH & Private Keys
- Database URLs with credentials
- High entropy strings

### SbomGenerator

Generates Software Bill of Materials.

```bash
# Generate CycloneDX (default)
bun run sbom

# Generate SPDX
bun run sbom -- --format=spdx

# Include dev dependencies
bun run sbom -- --include-dev

# Write to file
bun run sbom -- --output=sbom.json
```

## CI/CD Integration

Copy the GitHub Actions workflows to your repository:

```bash
mkdir -p .github/workflows
cp CI/github/*.yml .github/workflows/
```

See [CI/README.md](CI/README.md) for detailed integration instructions.

### GitHub Security Tab

All tools support SARIF output, which integrates with GitHub's Security tab:

1. Run scans with `--sarif` flag
2. Upload results using `github/codeql-action/upload-sarif@v3`
3. View results in Security > Code scanning alerts

## Configuration

### Ignoring False Positives

Create a `.secretsignore` file:

```
# Ignore test fixtures
tests/fixtures/*

# Ignore specific line
src/config.ts:42

# Ignore pattern in test files
*.test.ts:mock_api_key
```

### Severity Thresholds

Use `--fail-on` to control CI failure:

| Threshold | Fails On |
|-----------|----------|
| `critical` | Critical only |
| `high` | High + Critical |
| `medium` | Medium + High + Critical |
| `low` | Any vulnerability |

## Requirements

- [Bun](https://bun.sh/) runtime
- For DependencyAudit (optional, based on project type):
  - npm/pnpm/yarn: Built-in
  - pip/poetry: `pip install pip-audit`
  - cargo: `cargo install cargo-audit`
  - go: `go install golang.org/x/vuln/cmd/govulncheck@latest`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success / No issues found |
| 1 | Issues found / Threshold exceeded |
| 2 | Execution error / Tool not installed |

## Development

```bash
# Type check
bun run typecheck

# Run a tool directly
bun run Tools/DependencyAudit.ts --help
bun run Tools/SecretsScan.ts --help
bun run Tools/SbomGenerator.ts --help
```

## License

MIT
