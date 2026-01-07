# CI/CD Integration

This directory contains ready-to-use CI/CD templates for integrating security scanning into your pipelines.

## GitHub Actions

### Quick Start

1. Copy the workflows to your repository:
   ```bash
   mkdir -p .github/workflows
   cp CI/github/*.yml .github/workflows/
   ```

2. Copy the security tools to your repository (or reference them from a shared location):
   ```bash
   mkdir -p .github/security-tools
   cp -r Tools/ .github/security-tools/
   cp package.json tsconfig.json .github/security-tools/
   ```

3. Update the workflow files to reference the correct path:
   - Edit `.github/workflows/dependency-audit.yml`
   - Edit `.github/workflows/secrets-scan.yml`
   - Change the `checkout security tools` step to match your setup

### Available Workflows

#### security-scan.yml (Full Pipeline)

The main security scanning workflow that orchestrates all security checks.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Weekly schedule (Monday 6am UTC)
- Manual workflow dispatch

**Jobs:**
1. **Dependency Audit** - Calls the reusable dependency-audit workflow
2. **Secrets Scan** - Calls the reusable secrets-scan workflow
3. **SBOM** - Generates both CycloneDX and SPDX SBOMs
4. **Security Summary** - Aggregates results and fails if issues found

**Usage:**
```yaml
# In your repository, just copy the file - it's self-contained
# Customize the fail-on threshold if needed
```

#### dependency-audit.yml (Reusable Workflow)

Scans dependencies for known vulnerabilities.

**Inputs:**
| Input | Description | Default |
|-------|-------------|---------|
| `fail-on` | Minimum severity to fail (critical/high/medium/low) | `high` |
| `working-directory` | Directory to scan | `.` |

**Usage in another workflow:**
```yaml
jobs:
  security:
    uses: ./.github/workflows/dependency-audit.yml
    with:
      fail-on: high
```

**Direct usage (standalone):**
```yaml
name: Security Check
on: [push, pull_request]

jobs:
  audit:
    uses: your-org/kai-security-tools/.github/workflows/dependency-audit.yml@main
    with:
      fail-on: high
```

#### secrets-scan.yml (Reusable Workflow)

Scans code for leaked secrets and credentials.

**Inputs:**
| Input | Description | Default |
|-------|-------------|---------|
| `baseline-file` | Path to ignore file for false positives | `.secretsignore` |
| `working-directory` | Directory to scan | `.` |

**Usage in another workflow:**
```yaml
jobs:
  security:
    uses: ./.github/workflows/secrets-scan.yml
    with:
      baseline-file: .secretsignore
```

### SARIF Integration

All security tools output results in SARIF format, which integrates with GitHub's Security tab.

**What is SARIF?**

SARIF (Static Analysis Results Interchange Format) is a standard format for security tool output. GitHub understands SARIF and displays results in:
- Security > Code scanning alerts
- Pull request checks with inline annotations
- Repository security overview

**Viewing Results:**

1. Go to your repository on GitHub
2. Click on "Security" tab
3. Click on "Code scanning alerts"
4. Filter by tool: `DependencyAudit` or `SecretsScan`

**Benefits:**
- Results persist across workflow runs
- Track security posture over time
- Set up alert notifications
- Integrate with GitHub's security overview

### Customization

#### Fail Thresholds

Adjust when the CI pipeline should fail:

```yaml
# In security-scan.yml or workflow_dispatch
with:
  fail-on: critical  # Only fail on critical vulnerabilities
```

Options:
- `critical` - Only critical severity
- `high` - High and critical
- `medium` - Medium and above
- `low` - Any vulnerability

#### Ignoring False Positives

Create a `.secretsignore` file in your repository root:

```
# Ignore test fixtures
tests/fixtures/*

# Ignore example configs with placeholder values
*.example.*
config.sample.ts

# Ignore specific false positive
src/auth/constants.ts:42

# Ignore pattern in test files
*.test.ts:mock_api_key
```

#### Adding to Existing Workflows

Add security scanning to your existing CI:

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    # ... your build job

  test:
    # ... your test job

  security:
    needs: [build]  # Optional: run after build
    uses: ./.github/workflows/security-scan.yml
    with:
      fail-on: high
```

### Private Repository Setup

If using security tools from a private repository:

1. Create a GitHub token with `repo` access
2. Add it as a secret: `SECURITY_TOOLS_TOKEN`
3. Update workflow to use the token:

```yaml
- name: Checkout security tools
  uses: actions/checkout@v4
  with:
    repository: your-org/kai-security-tools
    path: .github/security-tools
    token: ${{ secrets.SECURITY_TOOLS_TOKEN }}
```

### Monorepo Support

For monorepos, scan specific directories:

```yaml
jobs:
  audit-frontend:
    uses: ./.github/workflows/dependency-audit.yml
    with:
      working-directory: packages/frontend
      fail-on: high

  audit-backend:
    uses: ./.github/workflows/dependency-audit.yml
    with:
      working-directory: packages/backend
      fail-on: high
```

## GitLab CI (Coming Soon)

GitLab CI templates are planned for a future release. The tools work the same way - only the workflow syntax differs.

**Preview of planned structure:**
```yaml
# .gitlab-ci.yml
include:
  - local: 'CI/gitlab/security-scan.yml'

stages:
  - test
  - security

security-scan:
  stage: security
  extends: .security-scan
```

## Other CI Systems

The security tools are standalone CLI tools that work with any CI system:

```bash
# Install Bun (if not available)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run scans
bun run Tools/DependencyAudit.ts --fail-on=high
bun run Tools/SecretsScan.ts --baseline=.secretsignore
bun run Tools/SbomGenerator.ts --output=sbom.json
```

### Jenkins Example

```groovy
pipeline {
    agent any

    stages {
        stage('Security Scan') {
            steps {
                sh 'curl -fsSL https://bun.sh/install | bash'
                sh 'bun install'
                sh 'bun run Tools/DependencyAudit.ts --fail-on=high'
                sh 'bun run Tools/SecretsScan.ts'
            }
        }
    }
}
```

### CircleCI Example

```yaml
version: 2.1

jobs:
  security:
    docker:
      - image: oven/bun:latest
    steps:
      - checkout
      - run: bun install
      - run: bun run Tools/DependencyAudit.ts --fail-on=high
      - run: bun run Tools/SecretsScan.ts
```

### Azure DevOps Example

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: curl -fsSL https://bun.sh/install | bash
    displayName: 'Install Bun'

  - script: bun install
    displayName: 'Install dependencies'

  - script: bun run Tools/DependencyAudit.ts --fail-on=high
    displayName: 'Dependency Audit'

  - script: bun run Tools/SecretsScan.ts
    displayName: 'Secrets Scan'
```

## Best Practices

1. **Run on every PR** - Catch issues before they merge
2. **Use appropriate thresholds** - Start with `high`, tighten over time
3. **Maintain baselines** - Keep `.secretsignore` up to date
4. **Schedule regular scans** - New CVEs are published daily
5. **Archive SBOMs** - Required for compliance and incident response
6. **Review alerts promptly** - Stale alerts become noise
