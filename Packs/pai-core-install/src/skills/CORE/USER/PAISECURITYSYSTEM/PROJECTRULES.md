<!--
================================================================================
PAI CORE - USER/PAISECURITYSYSTEM/PROJECTRULES.md
================================================================================

PURPOSE:
Template for defining project-specific security rules. Some projects have unique
requirements (deployment methods, access restrictions) that need explicit rules.

LOCATION:
- Private Installation: ${PAI_DIR}/skills/CORE/USER/PAISECURITYSYSTEM/PROJECTRULES.md
- PAI Pack: Packs/kai-core-install/src/skills/CORE/USER/PAISECURITYSYSTEM/PROJECTRULES.md

CUSTOMIZATION:
- [ ] Add sections for your projects with special rules
- [ ] Document incidents that led to each rule
- [ ] Update patterns.yaml with corresponding patterns

RELATED FILES:
- patterns.yaml - Security rules (projects section)
- REPOSITORIES.md - Repository separation
- ARCHITECTURE.md - Security layers

LAST UPDATED: 2026-01-08
VERSION: 1.2.0
================================================================================
-->

# Project-Specific Rules

**Special security rules for specific projects**

---

## When to Add Project Rules

Add a project rule when:
- A project has a non-standard deployment method
- Source code should never be pushed to a public repo
- Certain operations need confirmation or blocking
- An incident occurred that requires a safeguard

---

## Rule Template

For each project with special requirements, create a section like this:

```markdown
## [Project Name] - [Brief Description]

### DEPLOYMENT RULES

| Property | Value |
|----------|-------|
| **Location** | `~/Projects/[project-name]/` |
| **Repository** | github.com/[username]/[repo] ([PUBLIC/PRIVATE]) |
| **Deployment** | [Deployment method - e.g., CI/CD, Wrangler, etc.] |
| **Source Code** | [Where it lives - LOCAL ONLY, pushed to repo, etc.] |

### WHY

[Explain the business/security reason for these rules]

### CORRECT WORKFLOW

```bash
# Show the CORRECT way to deploy/work with this project
cd ~/Projects/[project-name]
[correct command]
```

### BLOCKED ACTIONS

List what should NOT be done:
- [Action 1] - [Reason]
- [Action 2] - [Reason]

### INCIDENT HISTORY (if applicable)

**Date:** [When incident occurred]
**What happened:** [Brief description]
**Impact:** [What went wrong]
**Resolution:** [How it was fixed]
**Prevention:** [This rule]
```

---

## Example: Private App with CI/CD Deployment

```markdown
## my-private-app - Internal Tool

### DEPLOYMENT RULES

| Property | Value |
|----------|-------|
| **Location** | `~/Projects/my-private-app/` |
| **Repository** | github.com/myorg/my-private-app (PRIVATE) |
| **Deployment** | GitHub Actions CI/CD ONLY |
| **Source Code** | Pushed to private repo, deployed via CI |

### WHY

Production deployments require CI/CD pipeline to ensure:
- Tests pass before deployment
- Proper environment configuration
- Audit trail of deployments

### CORRECT WORKFLOW

```bash
# Commit and push - CI handles deployment
git add .
git commit -m "feat: new feature"
git push origin main
# CI/CD automatically deploys to production
```

### BLOCKED ACTIONS

- `ssh prod && git pull` - Never deploy manually to production
- Direct file uploads to production server
- Skipping CI with `[skip ci]` commit messages

### INCIDENT HISTORY

**Date:** 2025-06-15
**What happened:** Manual deployment introduced bug that broke production
**Impact:** 4 hours of downtime
**Resolution:** Rolled back via CI/CD
**Prevention:** Added hook to block direct ssh deployments
```

---

## Example: Public Repo with Private Source

```markdown
## my-oss-project - Open Source with Staged Releases

### DEPLOYMENT RULES

| Property | Value |
|----------|-------|
| **Location** | `~/Projects/my-oss-project/` |
| **Repository** | github.com/myuser/my-oss-project (PUBLIC) |
| **Deployment** | npm publish + GitHub releases |
| **Source Code** | Pushed to public repo AFTER review |

### WHY

Public releases need careful review:
- Security audit before publishing
- Version bump and changelog
- No accidental secrets in commits

### CORRECT WORKFLOW

```bash
# 1. Review changes
git diff HEAD~5..HEAD

# 2. Run security scan
npm audit

# 3. Bump version
npm version patch

# 4. Push and publish
git push origin main --tags
npm publish
```

### BLOCKED ACTIONS

- `npm publish` without `npm audit` first
- Force push to main branch
- Publishing without version bump
```

---

## Configuring in patterns.yaml

Add project rules to `patterns.yaml`:

```yaml
projects:
  my-private-app:
    path: "~/Projects/my-private-app"
    rules:
      - action: "confirm"
        pattern: "ssh.*prod"
        reason: "Use CI/CD for production deployments"

  my-oss-project:
    path: "~/Projects/my-oss-project"
    rules:
      - action: "confirm"
        pattern: "npm publish"
        reason: "Run npm audit first"
      - action: "block"
        pattern: "git push --force.*main"
        reason: "Never force push to main on public repo"
```

---

## Adding New Project Rules

When a project needs special security rules:

1. **Document the rule** in this file (use template above)
2. **Explain WHY** the rule exists
3. **Provide the CORRECT way** to do things
4. **Note any incidents** that led to the rule
5. **Update patterns.yaml** with enforcement rules
6. **Test the rule** to ensure it works

---

## Your Projects

<!-- Add your project-specific rules below -->

<!--
## [Your Project] - [Description]

### DEPLOYMENT RULES
...
-->
