# Worked Example: Developing a JIRA Skill

This walkthrough shows exactly what to expect when using SpecFirst to develop a new PAI skill.

**Scenario:** User wants to develop a JIRA integration skill.

---

## The 4-Phase Workflow (Iterative)

```
┌────────────────────┐
│ 1. PROPOSE         │  /openspec-proposal
│ Draft change       │  Create openspec/changes/[feature]/
└────────┬───────────┘
         ▼
┌────────────────────┐
│ 2. REVIEW & ALIGN  │  Human reviews spec
│ Edit specs/tasks   │◀──┐ feedback loop
└────────┬───────────┘   │
         │               │
         ▼               │
┌────────────────────┐   │
│ 3. IMPLEMENT       │   │  /openspec-apply
│ AI writes code     │───┘  May reveal spec gaps → back to 2
└────────┬───────────┘
         │
         │  Only when ALL satisfied:
         ▼
┌────────────────────┐
│ 4. ARCHIVE         │  /openspec-archive
│ Update specs       │  Merge approved changes to specs/
└────────────────────┘
```

**Key:** Phases 1-3 are **iterative**. You may cycle through them multiple times before archiving.

---

## How the Skill Guides You

The skill actively guides you through the process:

| Phase | Claude Says | User Action |
|-------|-------------|-------------|
| 1. PROPOSE | "Here's my proposal. Does this match your intent?" | Review, request changes |
| 2. REVIEW | "I've updated the spec. Anything else?" | Approve or request more changes |
| 3. IMPLEMENT | "Implementation complete. Tests pass. Ready to archive?" | Yes → archive, No → refine |
| 4. ARCHIVE | "Archived. CHANGELOG updated." | Done (or start new feature) |

**The skill waits for your approval at each phase.** It won't proceed automatically.

---

## Phase 1: PROPOSE

### User Says:
```
"I want to develop a JIRA skill that can create issues and sync with my vault"
```

### Claude Recognizes SpecFirst Trigger:
```
I'll help you develop a JIRA skill. Let me start with a spec proposal.

/openspec-proposal
```

### Claude Asks:
```
What feature or change are you proposing?
> jira-skill

Which skill/project should contain the openspec directory?
> .claude/skills/Jira
```

### Claude Creates Structure:
```
Created:
.claude/skills/Jira/openspec/
├── changes/
│   └── jira-skill/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/
│           └── jira-skill.md
├── specs/          (empty - first spec)
└── archive/        (empty)
```

### Claude Shows proposal.md:
```markdown
# Proposal: JIRA Skill

## Summary
Create a JIRA integration skill that can create issues and sync with Obsidian vault.

## Impact
- **Scope:** New skill at .claude/skills/Jira/
- **Breaking changes:** No
- **Files affected:** SKILL.md, workflows/, CLI tool

## Rationale
Enable seamless issue tracking from Claude Code sessions, with bidirectional
sync between JIRA and personal knowledge vault.
```

### Claude Shows specs/jira-skill.md:
```markdown
# JIRA Skill Specification

## Purpose
Define requirements for the JIRA integration skill.

## Requirements

### Requirement: Create Issue
The system SHALL allow users to create JIRA issues from Claude Code.

#### Scenario: Create issue from conversation
- **WHEN** user says "create a JIRA issue for this bug"
- **THEN** skill SHALL extract issue details from context
- **AND** skill SHALL create issue via JIRA API
- **AND** skill SHALL return issue key (e.g., PROJ-123)

### Requirement: Sync to Vault
The system SHALL sync JIRA issues to Obsidian vault.

#### Scenario: Sync issue to vault
- **WHEN** user says "sync this issue to my vault"
- **THEN** skill SHALL fetch issue details from JIRA
- **AND** skill SHALL create/update note in vault
- **AND** note SHALL include status, assignee, description
```

### Claude Shows tasks.md:
```markdown
# Tasks: JIRA Skill

## Implementation Checklist

### 1. Skill Structure
- [ ] 1.1 Create SKILL.md with workflow routing
- [ ] 1.2 Create workflows/CreateIssue.md
- [ ] 1.3 Create workflows/SyncVault.md

### 2. CLI Tool
- [ ] 2.1 Create tools/jira.ts
- [ ] 2.2 Implement create-issue command
- [ ] 2.3 Implement sync command

### 3. Configuration
- [ ] 3.1 Add JIRA_API_TOKEN to .env.example
- [ ] 3.2 Add JIRA_BASE_URL to .env.example

### 4. Testing
- [ ] 4.1 Write tests for create-issue
- [ ] 4.2 Write tests for sync
```

### Claude Waits:
```
Here's my proposal for the JIRA skill. Please review:

- proposal.md - Summary and rationale
- specs/jira-skill.md - Requirements (SHALL/MUST)
- tasks.md - Implementation checklist

Does this match your intent? Any requirements to add or modify?
```

---

## Phase 2: REVIEW & ALIGN

### User Reviews and Requests Changes:
```
"Add a requirement for listing issues assigned to me"
```

### Claude Updates Spec:
```
I'll add that requirement to the spec.

[Updates specs/jira-skill.md]

### Requirement: List My Issues
The system SHALL list JIRA issues assigned to current user.

#### Scenario: List assigned issues
- **WHEN** user says "show my JIRA issues"
- **THEN** skill SHALL fetch issues where assignee = current user
- **AND** skill SHALL display as table (key, summary, status)

[Updates tasks.md]

### 2. CLI Tool
- [ ] 2.4 Implement list-mine command

Updated. Ready to implement?
```

### User Approves:
```
"Looks good, let's implement"
```

---

## Iteration Example: Spec Refinement Loop

**What happens when implementation reveals a gap:**

### During Implementation:
```
Claude: Working on create-issue command...

I notice the spec doesn't define what happens when JIRA API fails.
Should I add error handling requirements to the spec?
```

### User Says:
```
"Yes, add error handling requirement"
```

### Claude Updates Spec (Back to Phase 2):
```
I'll update the spec before continuing implementation.

[Updates specs/jira-skill.md]

### Requirement: Error Handling
The system SHALL handle JIRA API failures gracefully.

#### Scenario: API unavailable
- **WHEN** JIRA API returns error or timeout
- **THEN** skill SHALL display clear error message
- **AND** skill SHALL NOT crash
- **AND** skill SHALL suggest retry

[Updates tasks.md]

### 5. Error Handling
- [ ] 5.1 Implement API error handling
- [ ] 5.2 Add retry logic
- [ ] 5.3 Test error scenarios

Spec updated. Continuing implementation...
```

**This iteration is normal and expected.** The skill guides you through it.

---

## Iteration Example: Multiple Review Cycles

**Phase 2 may loop multiple times:**

```
Cycle 1:
User: "Add a requirement for listing issues assigned to me"
Claude: [Updates spec] "Done. Anything else?"

Cycle 2:
User: "Also add ability to filter by status"
Claude: [Updates spec] "Done. Anything else?"

Cycle 3:
User: "That's all, let's implement"
Claude: "Great, proceeding with /openspec-apply"
```

**The skill stays in Phase 2 until you say "implement" or "proceed".**

---

## Phase 3: IMPLEMENT

### Claude Invokes:
```
/openspec-apply
```

### Claude Confirms Requirements:
```
I'll implement the JIRA skill based on these requirements:

**From specs/jira-skill.md:**
1. Create Issue - Create JIRA issues from Claude Code
2. Sync to Vault - Sync issues to Obsidian
3. List My Issues - Show assigned issues

**From tasks.md:**
- 1.1 Create SKILL.md
- 1.2 Create workflows/
- 2.1-2.4 CLI implementation
- 3.1-3.2 Configuration
- 4.1-4.2 Tests

Proceeding with implementation...
```

### Claude Works Through tasks.md:

```
✓ 1.1 Created SKILL.md with workflow routing
✓ 1.2 Created workflows/CreateIssue.md
✓ 1.3 Created workflows/SyncVault.md

Working on CLI tool...
✓ 2.1 Created tools/jira.ts
✓ 2.2 Implemented create-issue command
✓ 2.3 Implemented sync command
✓ 2.4 Implemented list-mine command

✓ 3.1 Added JIRA_API_TOKEN to .env.example
✓ 3.2 Added JIRA_BASE_URL to .env.example

Writing tests...
✓ 4.1 Tests for create-issue (3 tests)
✓ 4.2 Tests for sync (2 tests)

Running tests...
All 5 tests passed.

Implementation complete. All tasks checked off.
```

### Claude Shows Updated tasks.md:
```markdown
### 1. Skill Structure
- [x] 1.1 Create SKILL.md with workflow routing
- [x] 1.2 Create workflows/CreateIssue.md
- [x] 1.3 Create workflows/SyncVault.md

### 2. CLI Tool
- [x] 2.1 Create tools/jira.ts
- [x] 2.2 Implement create-issue command
- [x] 2.3 Implement sync command
- [x] 2.4 Implement list-mine command

### 3. Configuration
- [x] 3.1 Add JIRA_API_TOKEN to .env.example
- [x] 3.2 Add JIRA_BASE_URL to .env.example

### 4. Testing
- [x] 4.1 Write tests for create-issue
- [x] 4.2 Write tests for sync
```

---

## Phase 4: ARCHIVE

### User Says:
```
"Great, archive this"
```

### Claude Invokes:
```
/openspec-archive
```

### Claude Processes:
```
Archiving jira-skill...

1. Verifying completion:
   ✓ All 10 tasks complete
   ✓ All tests pass

2. Merging specs:
   ✓ specs/jira-skill.md → openspec/specs/jira-skill.md

3. Updating CHANGELOG.md:
   Added entry for [Unreleased]:

   ### Added
   - JIRA skill for creating issues and syncing with vault
   - Commands: create-issue, sync, list-mine
   - Vault integration for issue notes

4. Moving to archive:
   ✓ openspec/changes/jira-skill/ → openspec/archive/2025-12-12-jira-skill/

Done! Spec archived, CHANGELOG updated.
```

### Final Directory Structure:
```
.claude/skills/Jira/
├── SKILL.md
├── CHANGELOG.md
├── workflows/
│   ├── CreateIssue.md
│   └── SyncVault.md
├── tools/
│   └── jira.ts
└── openspec/
    ├── specs/
    │   └── jira-skill.md     ← Merged from changes
    ├── changes/              ← Empty (archived)
    └── archive/
        └── 2025-12-12-jira-skill/
            ├── proposal.md   ← Preserved for audit
            ├── tasks.md
            └── specs/
```

---

## What Happens Next?

### If Ready to Release:
```
/specfirst-release
```
Creates RELEASE-v1.0.0.md with file inventory for PAI contribution.

### If Adding More Features:
```
"Add ability to comment on issues"

/openspec-proposal
→ Creates openspec/changes/add-comments/
→ Cycle repeats
```

---

## Key Takeaways

1. **Specs come first** - Requirements defined before any code written
2. **Human reviews** - Approval required between phases
3. **Tasks track progress** - Checklist updated as work completes
4. **Archive preserves audit trail** - Can trace decisions later
5. **CHANGELOG auto-updated** - From proposal summary
