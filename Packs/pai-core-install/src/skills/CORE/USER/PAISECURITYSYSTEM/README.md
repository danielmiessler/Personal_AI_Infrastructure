# PAISECURITYSYSTEM

**Your Personal Security Configuration**

This directory contains your personal security patterns and rules that override or extend the default PAISECURITYSYSTEM.

---

## Purpose

Define security rules specific to your environment:

- Custom paths to protect
- Personal API key patterns to detect
- Project-specific sensitive data patterns
- Your own validation rules

---

## Files to Create

### patterns.yaml

Your personal security patterns:

```yaml
# Example patterns.yaml
sensitive_patterns:
  - pattern: "my-company-api-key-.*"
    description: "Company API keys"
  - pattern: "/Users/yourname/private/.*"
    description: "Personal private directory"

protected_paths:
  - "~/private-projects/"
  - "~/client-work/"

never_commit:
  - "*.pem"
  - "*.key"
  - ".env.local"
```

---

## How It Works

1. PAI checks USER/PAISECURITYSYSTEM/ first
2. If patterns.yaml exists, it's used for security validation
3. If not, falls back to default PAISECURITYSYSTEM patterns
4. Your patterns can ADD to or OVERRIDE defaults
