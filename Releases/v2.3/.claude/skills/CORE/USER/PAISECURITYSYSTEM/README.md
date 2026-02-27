# PAI Security System (User Customizations)

**Your personal security patterns and policies.**

This directory contains your custom security rules that extend or override the default PAI security system. All content here is private and takes precedence over system defaults.

---

## How It Works

PAI security uses a two-tier system:

| Tier | Location | Purpose |
|------|----------|---------|
| **SYSTEM** | `PAISECURITYSYSTEM/` (in CORE) | Default patterns, base security |
| **USER** | `USER/PAISECURITYSYSTEM/` (here) | Your custom patterns, overrides |

When PAI performs security checks, it:
1. Loads default patterns from SYSTEM
2. Loads your custom patterns from USER
3. USER patterns override SYSTEM patterns with the same name
4. Runs combined checks

---

## Recommended Files

| File | Purpose |
|------|---------|
| `patterns.yaml` | Custom regex patterns for sensitive data detection |
| `allowlist.yaml` | Patterns to explicitly allow (override false positives) |
| `policies.md` | Your security policies and decisions |

---

## File Templates

### patterns.yaml
```yaml
# Custom Sensitive Data Patterns
# These patterns are checked BEFORE commits and in security scans

patterns:
  # Add patterns for your specific sensitive data
  - name: my-internal-api-key
    pattern: "MYCOMPANY_[A-Z0-9]{32}"
    description: "Internal API keys for MyCompany services"
    severity: high

  - name: internal-hostname
    pattern: "internal\\.mycompany\\.com"
    description: "Internal hostnames that shouldn't be public"
    severity: medium

  - name: employee-id
    pattern: "EMP[0-9]{6}"
    description: "Employee ID numbers"
    severity: medium

# Directories that should never be committed publicly
protected_directories:
  - "BUSINESS/"
  - "FINANCES/"
  - "HEALTH/"
  - "TELOS/"
  - "path/to/custom/sensitive/dir"

# File patterns to always exclude
protected_files:
  - "*.pem"
  - "*.key"
  - ".env*"
  - "*credentials*"
  - "*secret*"
```

### allowlist.yaml
```yaml
# Allowlist Patterns
# Patterns here are explicitly allowed even if they match sensitive patterns
# Use sparingly and document why

allowlist:
  - pattern: "example\\.com"
    reason: "Example domain used in documentation"
    added: "2025-01-15"

  - pattern: "TEST_API_KEY_[A-Z0-9]+"
    reason: "Test keys used in unit tests, not real credentials"
    added: "2025-01-15"

  - pattern: "127\\.0\\.0\\.1"
    reason: "Localhost IP address, safe for public code"
    added: "2025-01-15"
```

### policies.md
```markdown
# Security Policies

## Repository Separation

### Private Repository (this PAI instance)
- Contains: Personal data, credentials, business information
- Never pushed to: Public GitHub, shared drives
- Backup: Encrypted local backup only

### Public Repository (PAI template)
- Contains: Only sanitized, example content
- All USER directories: Empty templates only
- All credentials: Replaced with placeholders

## Credential Management
- API keys stored in: [Password manager name]
- Environment variables in: `.env` files (gitignored)
- Never in: Code, markdown files, comments

## Data Classification

| Classification | Examples | Handling |
|---------------|----------|----------|
| **Public** | Open source code, docs | Can be shared |
| **Internal** | Business processes | Private repo only |
| **Confidential** | Customer data, financials | Encrypted, limited access |
| **Restricted** | Credentials, PII | Password manager only |

## Incident Response
If sensitive data is accidentally committed:
1. Immediately revoke any exposed credentials
2. Remove from git history (force push if needed)
3. Document incident in this file
4. Update patterns to prevent recurrence
```

---

## Adding Custom Patterns

To add a new sensitive pattern:

1. Identify the pattern you want to catch
2. Write a regex that matches it
3. Add to `patterns.yaml` with:
   - Descriptive name
   - The regex pattern
   - Description of what it catches
   - Severity level (high/medium/low)
4. Test the pattern against known examples
5. Commit to your private repo

### Pattern Examples

| Data Type | Pattern | Example Match |
|-----------|---------|---------------|
| AWS Key | `AKIA[0-9A-Z]{16}` | AKIAIOSFODNN7EXAMPLE |
| GitHub Token | `ghp_[a-zA-Z0-9]{36}` | ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| Slack Token | `xox[baprs]-[0-9a-zA-Z-]+` | xoxb-123456789-abcdefgh |
| Generic API Key | `[aA][pP][iI][-_]?[kK][eE][yY].*['\"][a-zA-Z0-9]{20,}['\"]` | api_key="abc123..." |

---

## How PAI Uses This

PAI security runs at multiple checkpoints:

1. **Pre-commit hook**: Scans staged files for patterns
2. **Manual scans**: `System` skill integrity check
3. **Cross-repo validation**: Ensures private/public separation
4. **Content creation**: Checks generated content

Your custom patterns are included in all checks.

---

## Privacy Note

Ironically, this security configuration itself is sensitive:
- It reveals what you consider sensitive
- Pattern names hint at your systems/tools
- Keep this in your private repo only

---

*Start with patterns.yaml to add your custom sensitive data patterns.*
