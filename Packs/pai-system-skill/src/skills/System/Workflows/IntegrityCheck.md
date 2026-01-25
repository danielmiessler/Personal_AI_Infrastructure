# IntegrityCheck Workflow

**Purpose:** Find and fix broken references across the PAI system. Launches parallel agents to audit all components for broken file references, outdated patterns, and configuration issues.

**Triggers:** "integrity check", "audit system", "check references", "system health"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running integrity check on the system"}' \
  > /dev/null 2>&1 &
```

Running the **IntegrityCheck** workflow from the **System** skill...

---

## When to Use

- After major refactoring
- Periodic system health checks
- Before releasing PAI updates
- When something "feels broken"
- At end of significant work sessions (before DocumentSession)

---

## Execution

### Step 1: Launch Parallel Audit Agents

Use the Task tool to launch agents in a SINGLE message (parallel execution). Each agent audits their assigned component.

**Agent Assignments:**

| # | Focus Area | Scope | Check For |
|---|------------|-------|-----------|
| 1 | CORE SKILL.md | `skills/CORE/SKILL.md` | Broken file references, outdated paths |
| 2 | Identity System | `hooks/lib/identity.ts`, `settings.json` | Config consistency |
| 3 | Hook Scripts | `hooks/*.hook.ts` | Imports, identity usage |
| 4 | System Docs | `skills/CORE/SYSTEM/*.md` | Cross-references, broken links |
| 5 | User Docs | `skills/CORE/USER/*.md` | Personal config references |
| 6 | Workflows | `skills/*/Workflows/*.md` | File paths, tool references |
| 7 | Tools | `skills/*/Tools/*.ts` | Imports, hardcoded paths |
| 8 | Settings | `settings.json` | Schema validity |
| 9 | Notifications | Notification-related files | Config consistency |
| 10 | Memory System | `MEMORY/` structure | Path references |
| 11 | Security | `USER/PAISECURITY/` | Policy consistency |
| 12 | Cross-References | All `*.md` files | Non-existent file refs |

### Step 2: Agent Prompt Template

```
You are auditing the PAI system for integrity issues.

**Your Focus Area:** [FOCUS_AREA]
**Files to Check:** [SEARCH_SCOPE]

## Instructions

1. Search the specified files for issues
2. Look for:
   - References to files/paths that don't exist
   - Outdated patterns
   - Inconsistencies between docs and code
   - Broken cross-references

3. Return a structured report:

## Findings

### Critical Issues
- [Breaks functionality]

### Warnings
- [Outdated but functional]

### Files Checked
- [List files examined]

Be thorough but concise.
```

### Step 3: Synthesize Results

After agents complete:
1. Collect all findings
2. Deduplicate issues found by multiple agents
3. Prioritize by severity
4. Optionally fix critical issues

### Step 4: Report Format

```markdown
# Integrity Check Report

**Date:** [DATE]
**Scope:** ~/.claude/

## Critical Issues
| Component | Issue | File |
|-----------|-------|------|

## Warnings
| Component | Issue | File |
|-----------|-------|------|

## Summary
- Critical: X
- Warnings: Y
- Clean components: N
```

### Step 5: Save Report (Optional)

```
~/.claude/MEMORY/STATE/integrity/YYYY-MM-DD.md
```

### Step 6: Completion

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Integrity check complete. [X] issues found."}' \
  > /dev/null 2>&1 &
```

---

## Next Steps After Integrity Check

If changes were made during the check:
```
IntegrityCheck (this) → DocumentSession → GitPush
```

---

## Related Workflows

- `DocumentSession.md` - Document what was done
- `SecretScanning.md` - Scan for credentials
- `CrossRepoValidation.md` - Check private/public separation
