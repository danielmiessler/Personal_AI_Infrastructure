---
name: PAI System Skill
pack-id: danielmiessler-system-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: System maintenance with integrity checks, session documentation, security scanning, and private repo management
type: skill
purpose-type: [productivity, automation, security, development]
platform: claude-code
dependencies: [pai-core-install]
keywords: [system, maintenance, integrity, documentation, security, secrets, privacy, audit, memory, updates, git, validation]
---

<p align="center">
  <img src="../../icons/system-skill.png" alt="PAI System Skill" width="256">
</p>

# PAI System Skill

> System maintenance with four core operations - integrity check, document session, document recent, git push - plus security workflows for secret scanning, cross-repo validation, and privacy checks.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds comprehensive system maintenance capabilities to your PAI installation. The System skill provides structured workflows for keeping your AI infrastructure healthy, documented, and secure:

- **Integrity Checks**: Find and fix broken references across your entire system
- **Session Documentation**: Automatically capture what was done and why
- **Catch-up Documentation**: Generate docs for changes that were missed
- **Git Push to Private Repo**: Safe commit and push workflow with verification
- **Secret Scanning**: Find API keys and credentials before they leak
- **Cross-Repo Validation**: Ensure private content stays private
- **Privacy Checks**: Validate data isolation between sensitive directories
- **Work Context Recall**: Search past work when Daniel asks "didn't we already fix that?"

**Core principle:** Maintain system health with minimal overhead.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill Definition | `src/skills/System/SKILL.md` | Workflow routing and skill metadata |
| IntegrityCheck | `src/skills/System/Workflows/IntegrityCheck.md` | Find and fix broken references |
| DocumentSession | `src/skills/System/Workflows/DocumentSession.md` | Document current session |
| DocumentRecent | `src/skills/System/Workflows/DocumentRecent.md` | Catch-up documentation |
| GitPush | `src/skills/System/Workflows/GitPush.md` | Git commit + push to private repo |
| SecretScanning | `src/skills/System/Workflows/SecretScanning.md` | Scan for credentials |
| CrossRepoValidation | `src/skills/System/Workflows/CrossRepoValidation.md` | Private/public separation |
| PrivacyCheck | `src/skills/System/Workflows/PrivacyCheck.md` | Data isolation validation |
| WorkContextRecall | `src/skills/System/Workflows/WorkContextRecall.md` | Search past work |
| CreateUpdate Tool | `src/skills/System/Tools/CreateUpdate.ts` | Create documentation entries |
| UpdateIndex Tool | `src/skills/System/Tools/UpdateIndex.ts` | Regenerate index and changelog |
| UpdateSearch Tool | `src/skills/System/Tools/UpdateSearch.ts` | Search documentation history |
| ExtractArchitectureUpdates | `src/skills/System/Tools/ExtractArchitectureUpdates.ts` | Historical migration tool |
| Update Template | `src/skills/System/Templates/Update.md` | Template for update entries |

**Summary:**
- **Workflow files:** 8
- **Tool files:** 4
- **Template files:** 1
- **Dependencies:** pai-core-install (required), TruffleHog (optional, for SecretScanning)

---

## The Concept and/or Problem

AI systems accumulate technical debt just like traditional software. Without regular maintenance:

- **References break**: Files get moved, renamed, or deleted but references remain
- **Documentation drifts**: Changes happen faster than docs can be updated
- **Secrets leak**: API keys accidentally committed to git history
- **Privacy erodes**: Sensitive data migrates to wrong directories
- **Context is lost**: Past work becomes unfindable

This creates a downward spiral:

**For System Integrity:**
- Broken references cause workflow failures
- Outdated documentation misleads users
- Technical debt compounds silently

**For Security:**
- Credentials in code repositories create breach risk
- Private content in public repos causes exposure
- Personal data outside protected directories violates privacy

**For Continuity:**
- Past decisions become untraceable
- Bug fixes get repeated when context is lost
- Multi-session work requires manual context transfer

**The Fundamental Problem:**

Manual maintenance doesn't scale. As your PAI system grows, the overhead of keeping it healthy grows faster. You need automated workflows that can audit, document, and protect your system with minimal effort.

---

## The Solution

The System skill solves this through **structured workflows with voice notifications**. Each maintenance operation is codified as a workflow that can be triggered by natural language and executed consistently.

**Four Core Operations:**

1. **IntegrityCheck** - Parallel agent audit of all system components
2. **DocumentSession** - AI-assisted extraction of what changed and why
3. **DocumentRecent** - Gap analysis to find undocumented changes
4. **GitPush** - Safe git workflow with mandatory verification

**Three Security Workflows:**

1. **SecretScanning** - TruffleHog integration for 700+ credential types
2. **CrossRepoValidation** - Diff analysis between private and public repos
3. **PrivacyCheck** - Pattern matching for PII in wrong locations

**One Utility Workflow:**

1. **WorkContextRecall** - Comprehensive search across all memory locations

**Design Principles:**

1. **Voice Notifications**: Every workflow announces itself so Daniel knows what's happening
2. **Fail-Safe**: Security checks block dangerous actions
3. **Composable**: Workflows chain together (IntegrityCheck -> DocumentSession -> GitPush)
4. **Automated Where Possible**: Tools regenerate indexes and create entries
5. **Manual Where Necessary**: Human confirms before pushing to git

---

## What Makes This Different

```
System Maintenance Flow:

                     +-----------------+
                     |  Trigger Word   |
                     | "integrity",    |
                     | "document",     |
                     | "push to kai",  |
                     | "secrets", etc. |
                     +--------+--------+
                              |
                              v
                     +-----------------+
                     |  SKILL.md       |
                     |  Route to       |
                     |  Workflow       |
                     +--------+--------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
     +--------+------+ +------+------+ +------+------+
     | Core Ops      | | Security    | | Utility     |
     | IntegrityCheck| | SecretScan  | | WorkContext |
     | DocumentSession| | CrossRepo   | | Recall      |
     | DocumentRecent| | PrivacyCheck|                |
     | GitPush     |                                |
     +---------------+ +-------------+ +--------------+
              |               |
              v               v
     +--------+------+ +------+------+
     | MEMORY/       | | Reports/    |
     | PAISYSTEMUPDATES | Blocks    |
     +---------------+ +-------------+
```

**Five Explicit Layers:**

1. **SKILL.md Frontmatter** - Loaded into system prompt for routing
2. **SKILL.md Body** - Workflow routing table with trigger words
3. **Workflows/** - HOW to execute each operation
4. **Tools/** - CLI programs for automation
5. **MEMORY/** - Output location for documentation

**What Makes This Architecture Valuable:**

- **Deterministic routing** - Trigger words map to specific workflows
- **Audit trail** - All documentation goes to MEMORY/PAISYSTEMUPDATES/
- **Safety gates** - GitPush ALWAYS verifies remote before pushing
- **Composition** - Workflows can call other workflows in sequence

---

## Why This Is Different

This sounds similar to git hooks which also do pre-commit checks. What makes this approach different?

Git hooks are passive gatekeepers that run on specific git events. The System skill is an active maintenance framework that can be invoked any time, provides AI-assisted documentation extraction, and includes comprehensive security scanning beyond just the git staging area.

- Active maintenance invoked by natural language commands
- AI-assisted documentation extracts what plus why reasoning
- Security scanning covers entire directories not just staging
- Composable workflows chain together for complete operations

---

## Configuration

**Environment variables:**

**Option 1: `.env` file** (recommended):
```bash
# $PAI_DIR/.env
PAI_DIR="$HOME/.claude"
```

**Option 2: Shell profile** (for manual installation):
```bash
# Add to ~/.zshrc or ~/.bashrc
export PAI_DIR="$HOME/.claude"
```

**Required for SecretScanning:**
```bash
# Install TruffleHog (macOS)
brew install trufflehog

# Install TruffleHog (Linux)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
```

---

## Example Usage

### Example 1: Run Integrity Check

```
User: "Run an integrity check"
System: Invokes IntegrityCheck workflow
        -> Spawns parallel agents to audit ~/.claude
        -> Finds broken references, missing files
        -> Returns list of issues found/fixed
```

### Example 2: Document Current Session

```
User: "Document this session"
System: Invokes DocumentSession workflow
        -> Reads current session transcript
        -> Uses AI to extract what changed and why
        -> Creates entry in MEMORY/PAISYSTEMUPDATES/
        -> Automatically calls GitPush
```

### Example 3: Security Scan Before Push

```
User: "Check for secrets before I push to PAI"
System: Invokes SecretScanning workflow
        -> Runs TruffleHog on ~/Projects/PAI
        -> Reports any API keys, credentials found
        -> Returns pass/fail status
```

### Example 4: Recall Past Work

```
User: "We just worked on the status line - why is it broken again?"
System: Invokes WorkContextRecall workflow
        -> Searches MEMORY/, git history for "status line"
        -> Presents timeline of changes and possible regression
```

---

## Invocation Scenarios

| Trigger | Workflow | Output |
|---------|----------|--------|
| "integrity check", "audit system" | IntegrityCheck | Issues found/fixed |
| "document session", "document today" | DocumentSession | PAISYSTEMUPDATES entry |
| "document recent", "catch up docs" | DocumentRecent | Multiple entries |
| "git push", "commit and push" | GitPush | git commit + push |
| "check for secrets", "security scan" | SecretScanning | Pass/fail report |
| "cross-repo validation", "check for leaks" | CrossRepoValidation | Separation report |
| "privacy check", "check for sensitive" | PrivacyCheck | Isolation report |
| "we just worked on", "remember when" | WorkContextRecall | Timeline of changes |

---

## Customization

### Recommended Customization

**What to Customize:** Documentation style and significance thresholds

**Why:** Different teams have different documentation needs. Some want verbose narratives for every change, others want minimal entries only for major changes.

**Process:**
1. Edit `Tools/CreateUpdate.ts` to adjust significance labels
2. Modify `Templates/Update.md` to match your documentation style
3. Update `SKILL.md` workflow routing if you add custom workflows

**Expected Outcome:** Documentation entries match your team's conventions and verbosity preferences.

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Add new workflows | `Workflows/YourWorkflow.md` | Extend maintenance capabilities |
| Change significance badges | `Tools/CreateUpdate.ts` | Customize visual indicators |
| Modify index format | `Tools/UpdateIndex.ts` | Change changelog structure |
| Add custom patterns | `Workflows/PrivacyCheck.md` | Catch more sensitive data |

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of PAI (Personal AI Infrastructure)
- **Inspired by**: Git hooks, CI/CD pipelines, infrastructure-as-code patterns

---

## Related Work

- **pai-core-install** - Required foundation with skill routing
- **TruffleHog** - Secret scanning engine (external dependency)

---

## Works Well With

- **pai-hook-system** - Event-driven automation
- **pai-core-install** - Skill system foundation
- **pai-voice-system** - Voice notifications for workflow progress

---

## Recommended

Install as part of the PAI core bundle for complete system maintenance capabilities.

---

## Relationships

### Parent Of
*None*

### Child Of
**pai-core-install** - Requires skill system for routing

### Sibling Of
**pai-upgrade-skill** - Both are maintenance-focused skills

### Part Of Collection
**PAI Official Packs**

---

## Changelog

### 2.3.0 - 2026-01-14
- System skill for PAI v2.3 release
- Four core operations: IntegrityCheck, DocumentSession, DocumentRecent, GitPush
- Three security workflows: SecretScanning, CrossRepoValidation, PrivacyCheck
- One utility workflow: WorkContextRecall
- Four TypeScript tools for automation
- Full documentation templates and index generation
