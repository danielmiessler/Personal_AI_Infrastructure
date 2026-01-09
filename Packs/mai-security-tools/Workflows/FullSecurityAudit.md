# FullSecurityAudit Workflow

**Purpose:** Execute a comprehensive security audit combining dependency scanning, secrets detection, and SBOM generation to provide complete visibility into project security posture.

**Triggers:** full security audit, complete security scan, run all security checks, security review, comprehensive audit, security posture assessment, pre-release security check

---

## Steps

1. Identify the target directory (defaults to current working directory if not specified)
2. Run dependency audit for CVE/vulnerability detection:
```bash
bun run Tools/DependencyAudit.ts [path] --fail-on=high
```
3. Run secrets scan to detect leaked credentials:
```bash
bun run Tools/SecretsScan.ts [path] --baseline=.secretsignore
```
4. Generate SBOM for supply chain documentation:
```bash
bun run Tools/SbomGenerator.ts [path] --format=cyclonedx --output=sbom.json
```
5. Aggregate results and calculate overall security score
6. Present consolidated findings with prioritized remediation steps
7. Optionally generate SARIF reports for CI/CD integration

---

## Examples

**Example 1: Standard full audit**
```
User: "Run a full security audit on this project"

Process:
1. Parse: path = current directory (.)
2. Run sequentially:
   - bun run Tools/DependencyAudit.ts .
   - bun run Tools/SecretsScan.ts . --baseline=.secretsignore
   - bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom.json
3. Return: Consolidated report with findings from all three scans
```

**Example 2: Pre-release audit**
```
User: "Security check before we release v2.0"

Process:
1. Parse: path = ., context = pre-release (strict mode)
2. Run:
   - bun run Tools/DependencyAudit.ts . --fail-on=medium
   - bun run Tools/SecretsScan.ts .
   - bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=release-sbom.json
3. Return: Pass/fail status with blocking issues highlighted, SBOM ready for release
```

**Example 3: CI/CD audit with SARIF**
```
User: "Run security audit for GitHub Security integration"

Process:
1. Parse: path = ., output = sarif
2. Run:
   - bun run Tools/DependencyAudit.ts . --sarif > dependency-results.sarif
   - bun run Tools/SecretsScan.ts . --sarif > secrets-results.sarif
   - bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom.json
3. Return: SARIF files for upload, SBOM for artifact storage
```

**Example 4: Quick pre-commit check**
```
User: "Quick security check before I commit"

Process:
1. Parse: context = pre-commit (fast mode)
2. Run:
   - bun run Tools/DependencyAudit.ts . --fail-on=critical
   - bun run Tools/SecretsScan.ts . --baseline=.secretsignore
3. Return: Pass/fail with only blocking issues (skip SBOM for speed)
```

**Example 5: Audit specific project**
```
User: "Full security audit on ~/src/payment-service"

Process:
1. Parse: path = ~/src/payment-service
2. Run all three scans against specified path
3. Return: Complete audit report for payment-service
```

---

## Interpreting Results

### Overall Security Score

The audit calculates an aggregate score based on findings:

| Score | Rating | Criteria |
|-------|--------|----------|
| A (90-100) | Excellent | No critical/high CVEs, no secrets, SBOM clean |
| B (80-89) | Good | No critical CVEs, max 2 high, no secrets |
| C (70-79) | Fair | No critical CVEs, some high/medium findings |
| D (60-69) | Poor | Critical findings present, needs attention |
| F (0-59) | Failing | Multiple critical issues, secrets detected |

### Finding Categories

**Blocking (must fix before release):**
- Critical/High severity CVEs in production dependencies
- Any detected secrets (API keys, passwords, tokens)
- Known malicious packages

**Warning (should fix soon):**
- Medium severity CVEs
- High severity CVEs in dev-only dependencies
- Deprecated packages with known issues

**Informational:**
- Low severity CVEs
- License compliance notes
- Outdated (but not vulnerable) packages

### Consolidated Report Format

```
=== FULL SECURITY AUDIT REPORT ===
Project: /path/to/project
Date: 2025-01-08T10:30:00Z
Overall Score: B (84/100)

--- DEPENDENCY AUDIT ---
Status: WARNING
Critical: 0 | High: 2 | Medium: 5 | Low: 12

High Severity Findings:
1. lodash@4.17.20 - CVE-2021-23337 (Prototype Pollution)
   Fix: Upgrade to lodash@4.17.21
2. axios@0.21.1 - CVE-2021-3749 (ReDoS)
   Fix: Upgrade to axios@0.21.2+

--- SECRETS SCAN ---
Status: PASS
Findings: 0 (3 baseline exclusions applied)

--- SBOM GENERATED ---
Status: COMPLETE
File: sbom.json
Components: 247 (42 direct, 205 transitive)
Licenses: MIT (180), Apache-2.0 (45), ISC (12), BSD-3-Clause (10)

--- RECOMMENDATIONS ---
Priority 1: Upgrade lodash and axios (2 commands)
Priority 2: Review 5 medium-severity findings
Priority 3: Consider updating 12 low-severity packages

=== END REPORT ===
```

---

## CI/CD Integration

### GitHub Actions (Complete)

```yaml
name: Full Security Audit

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday scan
  release:
    types: [published]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Dependency Audit
        id: deps
        run: |
          bun run Tools/DependencyAudit.ts . --sarif > dependency-results.sarif
          echo "status=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Secrets Scan
        id: secrets
        run: |
          bun run Tools/SecretsScan.ts . --baseline=.secretsignore --sarif > secrets-results.sarif
          echo "status=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Generate SBOM
        run: |
          bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom.json

      - name: Upload Dependency SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: dependency-results.sarif
          category: dependency-audit

      - name: Upload Secrets SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: secrets-results.sarif
          category: secrets-scan

      - name: Upload SBOM Artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json

      - name: Attach SBOM to Release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v1
        with:
          files: sbom.json

      - name: Evaluate Results
        run: |
          if [ "${{ steps.secrets.outputs.status }}" != "0" ]; then
            echo "::error::Secrets detected - audit failed"
            exit 1
          fi
          if [ "${{ steps.deps.outputs.status }}" != "0" ]; then
            echo "::warning::Vulnerabilities detected - review required"
          fi
```

### GitLab CI (Complete)

```yaml
stages:
  - security

variables:
  SECURITY_REPORTS_DIR: security-reports

security-audit:
  stage: security
  before_script:
    - mkdir -p $SECURITY_REPORTS_DIR
  script:
    - |
      echo "=== Dependency Audit ==="
      bun run Tools/DependencyAudit.ts . --fail-on=critical || DEPS_FAILED=1
    - |
      echo "=== Secrets Scan ==="
      bun run Tools/SecretsScan.ts . --baseline=.secretsignore || SECRETS_FAILED=1
    - |
      echo "=== SBOM Generation ==="
      bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=$SECURITY_REPORTS_DIR/sbom.json
    - |
      if [ "$SECRETS_FAILED" = "1" ]; then
        echo "FATAL: Secrets detected"
        exit 1
      fi
      if [ "$DEPS_FAILED" = "1" ]; then
        echo "WARNING: Critical vulnerabilities found"
        exit 1
      fi
  artifacts:
    paths:
      - $SECURITY_REPORTS_DIR/
    reports:
      cyclonedx: $SECURITY_REPORTS_DIR/sbom.json
    expire_in: 1 year
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG
```

### Pre-commit Hook (Local)

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
set -e

echo "Running security audit..."

# Quick checks only (skip SBOM for speed)
echo "Checking for secrets..."
bun run Tools/SecretsScan.ts . --baseline=.secretsignore
if [ $? -ne 0 ]; then
    echo "BLOCKED: Secrets detected in staged files"
    exit 1
fi

echo "Checking for critical vulnerabilities..."
bun run Tools/DependencyAudit.ts . --fail-on=critical
if [ $? -ne 0 ]; then
    echo "BLOCKED: Critical vulnerabilities detected"
    exit 1
fi

echo "Security checks passed"
```

---

## Audit Modes

### Standard Mode (Default)
- Full dependency scan with all severities reported
- Secrets scan with baseline applied
- SBOM generation
- Detailed report with all findings

### Strict Mode (Pre-release)
```bash
# Fail on medium+ vulnerabilities
bun run Tools/DependencyAudit.ts . --fail-on=medium
bun run Tools/SecretsScan.ts .  # No baseline - catch everything
bun run Tools/SbomGenerator.ts . --format=spdx --output=release-sbom.spdx.json
```

### Quick Mode (Pre-commit)
```bash
# Critical only, baseline applied
bun run Tools/DependencyAudit.ts . --fail-on=critical
bun run Tools/SecretsScan.ts . --baseline=.secretsignore
# Skip SBOM for speed
```

### Compliance Mode (Regulated)
```bash
# Both formats, include dev deps
bun run Tools/DependencyAudit.ts . --sarif > deps.sarif
bun run Tools/SecretsScan.ts . --sarif > secrets.sarif
bun run Tools/SbomGenerator.ts . --format=cyclonedx --include-dev --output=sbom-cyclonedx.json
bun run Tools/SbomGenerator.ts . --format=spdx --include-dev --output=sbom-spdx.json
```

---

## Error Handling

### Exit Codes

| Scan | Exit 0 | Exit 1 | Exit 2 |
|------|--------|--------|--------|
| DependencyAudit | Clean | Findings at/above threshold | Tool error |
| SecretsScan | No secrets | Secrets found | Tool error |
| SbomGenerator | Generated | Partial (warnings) | Failed |

### Aggregate Exit Code Logic

```
If ANY scan returns 2 (error) → Report error, audit incomplete
If SecretsScan returns 1 → FAIL (secrets are always blocking)
If DependencyAudit returns 1 → FAIL or WARN based on mode
If all scans return 0 → PASS
```

### Common Errors

- **No package manager detected** - Ensure lock file exists; run install first
- **Network timeout** - Advisory lookups require internet; retry or use cached
- **Permission denied** - Check read permissions on target directory
- **Mixed results** - Some scans pass, others fail; report each separately

### Recovery Steps

1. **Audit interrupted:** Re-run full audit; results are not cached
2. **Partial SBOM:** Check which package manager failed; may need manual install
3. **False positive secrets:** Add to `.secretsignore` and re-run
4. **Disputed CVE:** Document exception in security policy, use baseline if supported

---

## Remediation Priority Matrix

| Finding Type | Severity | Timeline | Action |
|--------------|----------|----------|--------|
| Leaked secret | Critical | Immediate | Rotate credential, remove from code |
| CVE - Critical | Critical | 24 hours | Patch or mitigate |
| CVE - High | High | 1 week | Patch in next release |
| CVE - Medium | Medium | 1 sprint | Schedule remediation |
| CVE - Low | Low | Backlog | Track, fix opportunistically |
| License issue | Varies | Before release | Legal review |

---

## Scheduling Recommendations

| Trigger | Audit Mode | Purpose |
|---------|------------|---------|
| Every commit | Quick | Catch secrets immediately |
| Every PR | Standard | Full review before merge |
| Weekly (cron) | Standard | Catch new CVEs in existing deps |
| Pre-release | Strict | Gate releases on security |
| Quarterly | Compliance | Full documentation refresh |
