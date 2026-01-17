---
name: System
description: System maintenance with four core operations - integrity check (find/fix broken references), document session (current transcript), document recent (catch-up since last update), git push (git commit + push). Plus security workflows. USE WHEN integrity check, audit system, document session, document this session, document today, document recent, catch up docs, what's undocumented, git push, commit and push, check for secrets, security scan, privacy check, cross-repo validation, OR asking about past work ("we just worked on", "remember when we").
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/System/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# System Skill

System validation, integrity audits, documentation tracking, and security scanning for the PAI system.

## Visibility

This skill runs in the foreground so you can see all output, progress, and hear voice notifications as work happens. Documentation updates, integrity checks, and other system operations should be visible to maintain transparency.

---

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME workflow from System skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **System** skill...
   ```

---

## Workflow Routing

### Core Operations (The Four)

| Workflow | Trigger | Purpose | File |
|----------|---------|---------|------|
| **IntegrityCheck** | "integrity check", "audit system", "check references", "system health" | Find and fix broken references across the system | `Workflows/IntegrityCheck.md` |
| **DocumentSession** | "document session", "document today", "document this session", "log session" | Document current session's work from transcript | `Workflows/DocumentSession.md` |
| **DocumentRecent** | "document recent", "catch up docs", "what's undocumented", "document since last update" | Catch-up documentation for changes since last documented update | `Workflows/DocumentRecent.md` |
| **GitPush** | "git push", "commit and push", "push changes", "push to repo" | Git commit + push to private PAI repo | `Workflows/GitPush.md` |

**Composition Rules:**
- Integrity Check → may produce fixes → Document Session → Git Push
- After any session → Document Session → Git Push
- Periodic catch-up → Document Recent → Git Push

### Security Workflows

| Workflow | Trigger | File |
|----------|---------|------|
| **SecretScanning** | "check for secrets", "scan for credentials", "security scan" | `Workflows/SecretScanning.md` |
| **CrossRepoValidation** | "cross-repo validation", "check for leaks" | `Workflows/CrossRepoValidation.md` |
| **PrivacyCheck** | "privacy check", "check for sensitive data", "data isolation" | `Workflows/PrivacyCheck.md` |

### Utility Workflows

| Workflow | Trigger | File |
|----------|---------|------|
| **WorkContextRecall** | "we just worked on", "what did we do with", "remember when we", "didn't we already" | `Workflows/WorkContextRecall.md` |

**Note:** For public PAI integrity ("check PAI integrity", "audit PAI packs"), use the PAI skill → `PAIIntegrityCheck.md`

---

## Examples

### Core Operations

**Example 1: Integrity Check**
```
User: "Run an integrity check"
→ Invokes IntegrityCheck workflow
→ Spawns parallel agents to audit ~/.claude
→ Finds broken references, missing files
→ Returns list of issues found/fixed
```

**Example 2: Document Current Session**
```
User: "Document this session"
→ Invokes DocumentSession workflow
→ Reads current session transcript
→ Uses AI to extract what changed and why
→ Creates entry in MEMORY/PAISYSTEMUPDATES/
→ Automatically calls GitPush
```

**Example 3: Catch-up Documentation**
```
User: "What's undocumented? Catch up the docs."
→ Invokes DocumentRecent workflow
→ Finds last documented update timestamp
→ Compares git history since then
→ Generates documentation for missed changes
→ Automatically calls GitPush
```

**Example 4: Git Push**
```
User: "Git Push"
→ Invokes GitPush workflow
→ Verifies we're in ~/.claude (PRIVATE repo)
→ git add + commit + push
```

### Security Workflows

**Example 5: Secret Scanning**
```
User: "Check for secrets before I push"
→ Invokes SecretScanning workflow
→ Runs TruffleHog on specified directory
→ Reports any API keys, credentials found
```

**Example 6: Cross-Repo Validation**
```
User: "Make sure nothing leaked to public"
→ Invokes CrossRepoValidation workflow
→ Compares ~/.claude with ~/Projects/PAI
→ Reports private content in wrong place
```

### Utility

**Example 7: Recall Past Work**
```
User: "We just worked on the status line - why broken again?"
→ Invokes WorkContextRecall workflow
→ Searches MEMORY/, git history for "status line"
→ Presents timeline of changes and possible regression
```

---

## Quick Reference

### The Four Core Operations

| Operation | Input | Output | Duration |
|-----------|-------|--------|----------|
| **IntegrityCheck** | Codebase scan | List of broken refs found/fixed | ~2-5 min |
| **DocumentSession** | Session transcript | PAISYSTEMUPDATES entry | ~30s |
| **DocumentRecent** | Git history since last update | Multiple PAISYSTEMUPDATES entries | ~1-2 min |
| **GitPush** | PAISYSTEMUPDATES directory | git commit + push | ~10s |

### Composition Patterns

```
End of Session:     DocumentSession → GitPush
After Refactoring:  IntegrityCheck → DocumentSession → GitPush
Catch-up:           DocumentRecent → GitPush
Quick Push:         GitPush (if docs already created)
```

### Security Audits

| Audit Type | Tool | Scope | Duration |
|------------|------|-------|----------|
| Secret Scan | TruffleHog | Any directory | ~30s-2min |
| Cross-Repo | Diff agents | Both repos | ~1 min |
| Privacy Check | grep/patterns | skills/ (excl USER/WORK) | ~30s |

### Documentation Format

**Verbose Narrative Structure:**
- **The Story** (1-3 paragraphs): Background, Problem, Resolution
- **How It Used To Work**: Previous state with bullet points
- **How It Works Now**: New state with improvements
- **Going Forward**: Future implications
- **Verification**: How we know it works

---

## When to Use

### Integrity Checks
- After major refactoring
- Before releasing updates
- Periodic system health checks
- When something "feels broken"
- Before pushing to public PAI repo

### Documentation
- End of significant work sessions
- After creating new skills/workflows/tools
- When architectural decisions are made
- To maintain system history

### Security Scanning
- Before any git commit to public repos
- When auditing for credential leaks
- Periodic security hygiene checks
- After receiving external code/content

### Privacy Validation
- After working with USER/ or WORK/ content
- Before any public commits
- When creating new skills that might reference personal data
- Periodic audit to ensure data isolation

### Work Context Recall
- When Daniel asks about past work ("we just fixed that")
- Questions about why decisions were made
- Finding artifacts from previous sessions
- Debugging something that was "already fixed"
- Resuming multi-session projects

---

## Tools

| Tool | Purpose | Location |
|------|---------|----------|
| **SecretScan.ts** | TruffleHog wrapper for credential detection | `CORE/Tools/SecretScan.ts` |
| **CreateUpdate.ts** | Create new system update entries | `Tools/CreateUpdate.ts` |
| **UpdateIndex.ts** | Regenerate index.json and CHANGELOG.md | `Tools/UpdateIndex.ts` |
| **UpdateSearch.ts** | Search and query system updates | `Tools/UpdateSearch.ts` |
| **ExtractArchitectureUpdates.ts** | Historical migration tool (one-time use) | `Tools/ExtractArchitectureUpdates.ts` |

## Templates

| Template | Purpose | Location |
|----------|---------|----------|
| **Update.md** | Template for system update entries | `Templates/Update.md` |

---

## Output Locations

| Output | Location |
|--------|----------|
| Integrity Reports | `MEMORY/STATE/integrity/YYYY-MM-DD.md` |
| System Updates | `MEMORY/PAISYSTEMUPDATES/YYYY/MM/*.md` |
| Update Index | `MEMORY/PAISYSTEMUPDATES/index.json` |
| Changelog | `MEMORY/PAISYSTEMUPDATES/CHANGELOG.md` |

---

## Related Skills

- **PAI** - Public PAI repository management (includes PAIIntegrityCheck)
- **CORE** - System architecture and memory documentation
- **Evals** - Regression testing and capability verification
