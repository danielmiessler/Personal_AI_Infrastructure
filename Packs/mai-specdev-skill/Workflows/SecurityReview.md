# SecurityReview Workflow

## Purpose

Guide the user through a phase-appropriate security review using checklists.

## Trigger Phrases

- "security review"
- "security review for [phase]"
- "security check"

## Security Phases

Security is integrated at every phase, not a single gate:

| Phase | Focus |
|-------|-------|
| SPEC | Data sensitivity, auth requirements, compliance |
| DESIGN | Input validation, encryption, rate limiting |
| BUILD | Dependencies, secrets, static analysis |
| TEST | Penetration testing, vulnerability scanning |
| SHIP | Configuration, headers, monitoring |

## Steps

### 1. Determine Phase

Detect or ask for current project phase:
- Check `project-state.yaml` for phase
- Check `CLAUDE.md` for phase indicator
- Ask user if unclear

### 2. Load Checklist

Load phase-appropriate security checklist from `mai-specdev-core`.

### 3. Walk Through Items

For each checklist item:
1. Display description and severity
2. If automated, offer to run tool
3. Record status: pass, fail, n/a
4. Capture notes if needed

### 4. Generate Report

Create security report with:
- Phase
- Timestamp
- All items with status
- Summary (passed/failed/pending)
- Critical issues highlighted

### 5. Determine Readiness

A phase security review passes when:
- No critical failures
- No high severity failures
- All items addressed (pass, fail, or n/a)

## Checklist Items by Phase

### SPEC Phase
- Identify sensitive data that will be handled
- Document authentication requirements
- Document authorization requirements
- Identify external dependencies and trust levels
- Document compliance requirements (GDPR, HIPAA, etc.)

### DESIGN Phase
- Validate input at system boundaries
- Define encryption for data at rest
- Define encryption for data in transit
- Design rate limiting for public endpoints
- Plan for audit logging

### BUILD Phase
- Run dependency vulnerability scan
- Check for hardcoded secrets
- Run static analysis for security issues
- Validate all inputs are sanitized
- Review error handling for info leakage

### TEST Phase
- Test authentication bypass scenarios
- Test authorization boundary conditions
- Test injection vulnerabilities
- Test XSS vulnerabilities
- Verify error messages are safe

### SHIP Phase
- Remove debug code and comments
- Verify production environment variables
- Enable security headers
- Configure WAF rules if applicable
- Set up security monitoring and alerting

## Automated Tools

| Check | Tool |
|-------|------|
| Dependency scan | `bun audit`, `npm audit` |
| Secret detection | gitleaks, trufflehog |
| Static analysis | semgrep, eslint-plugin-security |
| Security headers | securityheaders.com |

## Output

Security review creates or updates:
- Console output with checklist status
- Optional: `security-report.json` for records
- Gate status update if all checks pass

## Integration

```bash
# Run security review for build phase
mai-security --phase build

# Check all phases
mai-security --all
```
