# DependencyScan Workflow

**Purpose:** Audit project dependencies for known CVEs and security vulnerabilities across supported package managers.

**Triggers:** dependency scan, check dependencies, audit packages, find CVEs, vulnerability scan, check for vulnerable packages

---

## Steps

1. Identify the target directory (defaults to current working directory if not specified)
2. Run the dependency audit tool against the project:
```bash
bun run Tools/DependencyAudit.ts [path]
```
3. Parse the results and categorize by severity (critical, high, medium, low)
4. Present findings with remediation guidance
5. If requested, output SARIF format for CI/CD integration

---

## Examples

**Example 1: Basic dependency scan**
```
User: "Scan this project for vulnerable dependencies"

Process:
1. Parse: path = current directory (.)
2. Run: bun run Tools/DependencyAudit.ts .
3. Return: Categorized vulnerability list with package names, CVE IDs, and fix versions
```

**Example 2: Scan with severity threshold**
```
User: "Check ~/src/my-api for critical vulnerabilities only"

Process:
1. Parse: path = ~/src/my-api, severity = critical
2. Run: bun run Tools/DependencyAudit.ts ~/src/my-api --fail-on=critical
3. Return: Only critical severity findings, exit code indicates pass/fail
```

**Example 3: CI/CD integration scan**
```
User: "Run a dependency audit and output SARIF for GitHub"

Process:
1. Parse: path = ., format = sarif
2. Run: bun run Tools/DependencyAudit.ts . --sarif > dependency-results.sarif
3. Return: SARIF file path for upload to GitHub Security tab
```

**Example 4: Pre-commit verification**
```
User: "Are my dependencies safe to commit?"

Process:
1. Parse: path = ., context = pre-commit check
2. Run: bun run Tools/DependencyAudit.ts . --fail-on=high
3. Return: Pass/fail status with summary of any blocking vulnerabilities
```

---

## Interpreting Results

### Severity Levels

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| Critical | Actively exploited or trivially exploitable RCE/data breach | Immediate fix required, block deployment |
| High | Significant security impact, exploit likely available | Fix before next release |
| Medium | Requires specific conditions to exploit | Schedule fix within sprint |
| Low | Minimal impact or theoretical risk | Track and fix opportunistically |

### Output Format

The tool reports each vulnerability with:
- **Package name** and **installed version**
- **CVE ID** (linked to NVD when available)
- **CVSS score** and severity rating
- **Fixed version** (if available)
- **Dependency path** showing how it entered your project (direct vs transitive)

### Remediation Priority

1. Direct dependencies with critical/high findings - update immediately
2. Transitive dependencies - update the parent package or use resolutions/overrides
3. No fix available - evaluate workarounds, consider alternative packages

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Dependency Audit

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday scan

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Run Dependency Audit
        run: bun run Tools/DependencyAudit.ts . --sarif > dependency-results.sarif
        continue-on-error: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: dependency-results.sarif
          category: dependency-audit
```

### GitLab CI

```yaml
dependency-audit:
  stage: security
  script:
    - bun run Tools/DependencyAudit.ts . --fail-on=high
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  allow_failure: false
```

---

## Supported Package Managers

| Manager | Lock File | Notes |
|---------|-----------|-------|
| npm | package-lock.json | Full CVE database via npm audit |
| pnpm | pnpm-lock.yaml | Uses npm advisory database |
| yarn | yarn.lock | v1 and v2+ supported |
| pip | requirements.txt | Uses PyPI advisory database |
| poetry | poetry.lock | Full dependency tree analysis |
| cargo | Cargo.lock | Uses RustSec advisory database |
| go | go.sum | Uses Go vulnerability database |

---

## Error Handling

| Exit Code | Meaning | Response |
|-----------|---------|----------|
| 0 | No vulnerabilities found | Report clean status |
| 1 | Vulnerabilities found at or above threshold | Report findings, recommend fixes |
| 2 | Tool error (missing lock file, network issue) | Diagnose and report error details |

### Common Errors

- **No lock file found** - Ensure dependencies are installed (`bun install`, `npm install`, etc.)
- **Network timeout** - Advisory databases require internet; retry or check connectivity
- **Unsupported package manager** - Check if lock file format is in supported list
- **Parse error** - Lock file may be corrupted; regenerate with fresh install
