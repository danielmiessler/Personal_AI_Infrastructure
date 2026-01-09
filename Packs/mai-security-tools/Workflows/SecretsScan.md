# SecretsScan Workflow

**Purpose:** Detect leaked secrets, API keys, credentials, and sensitive tokens in source code before they reach version control.

**Triggers:** scan for secrets, find leaked credentials, check for API keys, secrets detection, credential scan, find hardcoded passwords, pre-commit secrets check

---

## Steps

1. Identify the target directory (defaults to current working directory if not specified)
2. Check for existing baseline file (.secretsignore) to filter known false positives
3. Run the secrets scanner:
```bash
bun run Tools/SecretsScan.ts [path]
```
4. Categorize findings by type (API keys, passwords, tokens, certificates)
5. Present findings with file locations and recommended actions
6. Guide user on creating baseline entries for false positives

---

## Examples

**Example 1: Basic secrets scan**
```
User: "Scan this repo for leaked secrets"

Process:
1. Parse: path = current directory (.)
2. Run: bun run Tools/SecretsScan.ts .
3. Return: List of detected secrets with file paths, line numbers, and secret types
```

**Example 2: Scan with existing baseline**
```
User: "Check for secrets but ignore the ones we've already reviewed"

Process:
1. Parse: path = ., baseline = .secretsignore
2. Run: bun run Tools/SecretsScan.ts . --baseline=.secretsignore
3. Return: Only new findings not in baseline
```

**Example 3: Pre-commit scan**
```
User: "Are there any secrets in my staged changes?"

Process:
1. Parse: context = pre-commit, scope = staged files
2. Run: git diff --cached --name-only | xargs bun run Tools/SecretsScan.ts
3. Return: Pass/fail with any secrets found in staged files
```

**Example 4: CI scan with SARIF output**
```
User: "Run secrets scan for GitHub Security tab"

Process:
1. Parse: path = ., format = sarif
2. Run: bun run Tools/SecretsScan.ts . --sarif > secrets-results.sarif
3. Return: SARIF file path for GitHub upload
```

**Example 5: Scan specific directory**
```
User: "Check the config folder for any hardcoded credentials"

Process:
1. Parse: path = ./config
2. Run: bun run Tools/SecretsScan.ts ./config
3. Return: Findings scoped to config directory only
```

---

## Interpreting Results

### Secret Types Detected

| Type | Pattern Examples | Risk Level |
|------|------------------|------------|
| AWS Keys | AKIA..., aws_secret_access_key | Critical |
| GitHub Tokens | ghp_..., github_pat_... | Critical |
| Private Keys | -----BEGIN RSA PRIVATE KEY----- | Critical |
| Database URLs | postgres://user:pass@host | High |
| API Keys | Generic api_key, apikey patterns | High |
| JWT Tokens | eyJ... (base64 encoded) | Medium-High |
| Basic Auth | Authorization: Basic ... | Medium |
| Generic Passwords | password=, passwd=, pwd= | Medium |

### Severity Assessment

- **Critical:** Cloud provider credentials, private keys, database connection strings with passwords
- **High:** Third-party API keys, service tokens, webhook secrets
- **Medium:** Generic password patterns, potentially sensitive configuration values
- **Low:** Test credentials clearly marked as such, example placeholders

### False Positive Indicators

Common false positives to consider for baseline:
- Example/placeholder values in documentation
- Test fixtures with fake credentials
- Hash values that match secret patterns
- Encoded but non-sensitive data

---

## Creating a Baseline File

When you encounter false positives, create a `.secretsignore` file in your project root:

```bash
# .secretsignore - Known false positives for secrets scanning

# Test fixtures with fake credentials
tests/fixtures/fake-config.json:3  # AWS_ACCESS_KEY placeholder
tests/fixtures/fake-config.json:4  # AWS_SECRET_KEY placeholder

# Documentation examples
docs/authentication.md:45  # Example API key format
README.md:112  # Sample configuration

# Hash values that match patterns
src/constants.ts:23  # SHA256 hash, not a secret

# Ignore entire test directories for specific patterns
tests/**/*:generic-api-key
```

### Baseline Format

Each line specifies: `filepath:line_number` or `filepath:line_number  # comment`

To generate initial baseline from current findings:
```bash
bun run Tools/SecretsScan.ts . 2>&1 | grep "Finding:" | awk '{print $2}' > .secretsignore
```

Then review and annotate each entry before committing.

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Secrets Scan

on:
  push:
    branches: [main]
  pull_request:

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for comprehensive scan

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Run Secrets Scan
        run: |
          bun run Tools/SecretsScan.ts . \
            --baseline=.secretsignore \
            --sarif > secrets-results.sarif
        continue-on-error: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: secrets-results.sarif
          category: secrets-scan

      - name: Fail on secrets found
        run: |
          if [ -s secrets-results.sarif ]; then
            echo "::error::Secrets detected in codebase"
            exit 1
          fi
```

### GitLab CI

```yaml
secrets-scan:
  stage: security
  script:
    - bun run Tools/SecretsScan.ts . --baseline=.secretsignore
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  allow_failure: false
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: secrets-scan
        name: Secrets Scan
        entry: bun run Tools/SecretsScan.ts
        language: system
        pass_filenames: true
        types: [text]
```

Or add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
echo "Scanning for secrets..."
bun run Tools/SecretsScan.ts . --baseline=.secretsignore
if [ $? -ne 0 ]; then
    echo "Secrets detected! Commit blocked."
    exit 1
fi
```

---

## Remediation Steps

### If Secrets Are Found

1. **Do NOT commit** - If pre-commit, stop immediately
2. **Rotate the credential** - Consider it compromised
3. **Remove from code** - Use environment variables or secret management
4. **Clean git history** - If already committed:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. **Add to .gitignore** - Prevent future commits of sensitive files

### Proper Secret Management

| Instead of... | Use... |
|---------------|--------|
| Hardcoded API keys | Environment variables |
| Config files with passwords | Secret management (Vault, AWS Secrets Manager) |
| .env files in repo | .env.example with placeholders |
| Inline connection strings | Injected at runtime |

---

## Error Handling

| Exit Code | Meaning | Response |
|-----------|---------|----------|
| 0 | No secrets found | Report clean status |
| 1 | Secrets detected | Report findings with locations and types |
| 2 | Tool error (path not found, permission denied) | Diagnose and report error |

### Common Errors

- **Path not found** - Verify target directory exists
- **Permission denied** - Check file read permissions
- **Baseline parse error** - Verify .secretsignore format (filepath:line per line)
- **Binary file skipped** - Normal behavior; secrets scan targets text files
- **Large file skipped** - Files over 1MB skipped by default; use --no-size-limit if needed
