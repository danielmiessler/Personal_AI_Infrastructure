# Universal Output Capture System (UOCS) - History System Documentation

**Location:** `${PAI_DIR}/history/`
**Purpose:** Automated documentation of ALL work performed by Kai and specialized agents
**Status:** ✅ FULLY OPERATIONAL

---

## Overview

The Universal Output Capture System (UOCS) is Kai's automatic memory - capturing every feature, bug fix, decision, learning, research, and session through hooks with **zero manual effort**.

**Core Principle:** Work normally, documentation handles itself.

---

## Quick Reference

### Canonical Documentation

**Primary Source:** `${PAI_DIR}/history/CLAUDE.md` (584 lines)
- Complete system specification
- Directory structure and purpose
- File naming conventions
- Metadata schema
- Hook integration details
- Custom slash commands
- Usage patterns and examples

**This file (CORE skill reference):** High-level overview and routing to canonical docs

---

## Directory Structure

```
${PAI_DIR}/history/
├── sessions/YYYY-MM/          # Session summaries (SessionEnd hook)
├── learnings/YYYY-MM/         # Problem-solving narratives (Stop hook + manual)
├── research/YYYY-MM/          # Investigation reports (Researcher agents)
├── decisions/YYYY-MM/         # Architectural decisions (Architect agent)
├── execution/
│   ├── features/YYYY-MM/      # Feature implementations (Engineer/Designer)
│   ├── bugs/YYYY-MM/          # Bug fixes (Engineer)
│   └── refactors/YYYY-MM/     # Code improvements (Engineer)
└── raw-outputs/YYYY-MM/       # JSONL logs (PostToolUse hook)
```

**Quick Decision Guide:**
- "What happened this session?" → `sessions/`
- "What did we learn?" → `learnings/`
- "What features were built?" → `execution/features/`
- "What broke and when?" → `execution/bugs/`
- "What was improved?" → `execution/refactors/`
- "Why this approach?" → `decisions/`
- "What did we investigate?" → `research/`
- "Raw execution logs?" → `raw-outputs/`

---

## File Naming Convention

**Unified format:**
```
YYYY-MM-DD-HHMMSS_[PROJECT]_[TYPE]_[HIERARCHY]_[DESCRIPTION].md
```

**Components:**
- **Timestamp:** `YYYY-MM-DD-HHMMSS` (PST) - Enables chronological sorting
- **Project:** Optional identifier (e.g., `dashboard`, `website`, `PAI`)
- **Type:** Mandatory classification
  - `FEATURE` - New functionality
  - `BUG` - Bug fix
  - `REFACTOR` - Code improvement
  - `RESEARCH` - Investigation
  - `DECISION` - Architectural decision
  - `LEARNING` - Problem-solving narrative
  - `SESSION` - Session summary
- **Hierarchy:** Optional Spec-Kit task number (e.g., `T1.2.3`)
- **Description:** Kebab-case, max 60 chars

**Examples:**
```
2025-10-13-140000_dashboard_FEATURE_T1.1_database-schema-setup.md
2025-10-13-153000_dashboard_BUG_T1.2_jwt-expiry-validation.md
2025-10-13-092000_PAI_DECISION_unified-capture-architecture.md
2025-10-13-083000_LEARNING_kitty-remote-control-api.md
2025-10-13-180000_SESSION_feature-implementation-day-1.md
```

---

## Hook Integration

### 1. PostToolUse Hook
**Triggers:** Every tool execution (Bash, Edit, Write, Read, Task, etc.)
**Implementation:** `${PAI_DIR}/hooks/capture-all-events.ts --event-type PostToolUse`
**Output:** Daily JSONL logs in `raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
**Purpose:** Raw execution data for forensics and analytics

**Key Feature:** Completely generic - captures ENTIRE payload automatically
- **Future-proof**: New fields added to hooks (like `agent_id`, `agent_transcript_path` in v2.0.42) are automatically captured
- No code updates needed when Claude Code adds new fields

### 2. Stop Hook
**Triggers:** Main agent (Kai) task completion
**Implementation:** `${PAI_DIR}/hooks/stop-hook.ts`
**Output:** Auto-captured files in `learnings/` or `sessions/` based on content
**Purpose:** Lightweight capture of work summaries and learning moments

**How it works:**
1. Extracts structured response format sections
2. Analyzes for learning indicators (problem, solved, discovered, fixed)
3. Categorizes as LEARNING (2+ indicators) or WORK (general session)
4. Generates appropriate filename and saves to history

### 3. SubagentStop Hook
**Triggers:** Specialized agent task completion
**Implementation:** `${PAI_DIR}/hooks/subagent-stop-hook.ts`
**Output:** Categorized documents in appropriate directories
**Purpose:** Organized work documentation by agent type

**Categorization Logic:**
- Architect → `decisions/` (DECISION)
- Engineer/Principal-Engineer → `execution/features|bugs|refactors/`
- Designer → `execution/features/` (FEATURE)
- Researchers (all types) → `research/` (RESEARCH)
- Pentester → `research/` (RESEARCH)
- Intern → `research/` (mixed - defaults to RESEARCH)

**⚠️ Upgrade Note (v2.0.42):**
New fields available in SubagentStop hooks:
- `agent_id` - Unique agent instance identifier
- `agent_transcript_path` - Path to agent transcript

**Status:**
- ✅ `capture-all-events.ts` - Already capturing automatically (generic payload storage)
- ⚠️ `subagent-stop-hook.ts` - Should be updated to explicitly use new fields for better agent tracking

### 4. SessionEnd Hook
**Triggers:** Session exit (when you quit Claude Code)
**Implementation:** `${PAI_DIR}/hooks/capture-session-summary.ts`
**Output:** Session summary in `sessions/YYYY-MM/`
**Purpose:** High-level session documentation

### 5. SessionStart Hook
**Triggers:** Session initialization (when you start Claude Code)
**Implementation:** `${PAI_DIR}/hooks/initialize-kai-session.ts`
**Purpose:** Load core context and prepare session environment

---

## Custom Slash Commands

### /search-history [query]
**Purpose:** Full-text search across all history
**Example:** `/search-history authentication bug`
**Implementation:** Uses ripgrep with context lines

### /show-project-history [project]
**Purpose:** Chronological timeline for project
**Example:** `/show-project-history dashboard`
**Output:** Most recent 30 files for project

### /trace-feature [task-number]
**Purpose:** Complete implementation history for task
**Example:** `/trace-feature T1.2`
**Output:** Features, bugs, refactors related to task

### /bug-timeline [feature]
**Purpose:** Bug introduction and fix timeline
**Example:** `/bug-timeline authentication`
**Output:** Chronological list of related bugs

---

## Integration with Spec-Kit

**Spec-Kit** (`.specify/`) = PLAN (what to do)
**UOCS** (`history/`) = REALITY (what was done)

### Bidirectional Traceability

**From Spec to History:**
```
.specify/specs/001-auth/tasks.md
└─ T005 [US1] Implement login endpoint

history/execution/features/2025-10/
└─ 2025-10-13-140000_myapp_FEATURE_T005_login-endpoint.md
```

**From Bug to Feature:**
```
history/execution/features/2025-10/
└─ 2025-10-13-140000_myapp_FEATURE_T1.2_user-model.md
    ↓ (bug introduced here)
history/execution/bugs/2025-10/
└─ 2025-10-13-153000_myapp_BUG_T1.2_unique-constraint.md
    (metadata: bug_introduced_by: T1.2)
```

---

## Metadata Schema

Every capture file includes YAML frontmatter:

```yaml
---
# Core classification
capture_type: FEATURE|BUG|REFACTOR|RESEARCH|DECISION|LEARNING|SESSION
timestamp: 2025-10-13T14:30:22-07:00
duration_minutes: 45

# Context
project: dashboard
executor: kai|architect|engineer|designer|researcher
session_id: uuid

# Development tracking (when applicable)
hierarchy: T1.2.3
spec_kit_feature: 001-user-authentication
spec_kit_task: T005
user_story: US1
phase: 2

# Technical details
files_changed:
  - path/to/file.ts
technologies:
  - TypeScript
  - Vitest

# Outcomes
status: completed|blocked|partial
tests_added: 12
tests_passing: 12
coverage_change: +5.2%

# Bug tracking (for bugs only)
bug_severity: critical|high|medium|low
bug_introduced_by: T1.1

# Relationships
related_to:
  - other-capture-file.md
depends_on:
  - prerequisite-file.md

# Searchability
tags:
  - authentication
keywords:
  - user model
---
```

---

## Common Usage Patterns

### Before Starting Work

```bash
# Has this been done before?
/search-history [feature-name]

# How did we build similar features?
/trace-feature T1

# What decisions were made about this?
ls ${PAI_DIR}/history/decisions/*/[project]_*

# What did we learn about this domain?
/search-history [domain-term]
```

### During Development

**No action required** - work normally, everything captured automatically.

### After Encountering Issues

```bash
# When did this break?
/bug-timeline [feature-name]

# Complete history of this feature
/trace-feature T1.2.3

# What similar bugs have we fixed?
/search-history "[bug description]"
```

### Periodic Review

```bash
# What did we accomplish this week?
ls -lt ${PAI_DIR}/history/sessions/2025-10/ | head -7

# All decisions made this month
ls ${PAI_DIR}/history/decisions/2025-10/

# Learnings from this quarter
ls ${PAI_DIR}/history/learnings/2025-{10,11,12}/
```

---

## Advanced Queries

### Find all features for project
```bash
find ${PAI_DIR}/history/execution/features -name "*_dashboard_*"
```

### Find bugs introduced in specific task
```bash
rg "bug_introduced_by: T1.2" ${PAI_DIR}/history/execution/bugs/
```

### Find all work from specific date
```bash
find ${PAI_DIR}/history -name "2025-10-13-*"
```

### Analyze tool usage patterns
```bash
cat ${PAI_DIR}/history/raw-outputs/2025-10/*.jsonl | \
  jq -r '.tool' | sort | uniq -c | sort -rn
```

### Extract all architectural decisions
```bash
find ${PAI_DIR}/history/decisions -name "*.md" | \
  xargs grep -l "Alternatives considered"
```

---

## Benefits

- ✅ **Root Cause Analysis** - "When did we break this?" instantly answerable
- ✅ **Decision Tracking** - Every architectural choice preserved with rationale
- ✅ **Learning Accumulation** - Problem-solving patterns captured and queryable
- ✅ **Process Improvement** - Complete history enables identifying bottlenecks
- ✅ **Knowledge Harvesting** - Past solutions easily found and reused
- ✅ **Zero Overhead** - Completely automated capture
- ✅ **Spec-Kit Integration** - Bidirectional traceability (plan ↔ execution)

---

## Maintenance

### Automated (No Action Required)
- Hooks capture all work automatically
- Files created with proper naming
- Metadata populated by hooks
- Categorization handled by hook logic

### Manual (Periodic)

**Monthly:**
- Review directory sizes
- Archive older months if getting large (>1000 files/month)
- Validate hook functionality

**Quarterly:**
- Extract common learnings into best practices
- Analyze bug patterns for process improvements
- Review categorization accuracy

---

## System Status

**Status:** ✅ FULLY OPERATIONAL
**Hooks Active:**
- ✅ PostToolUse (capture-all-events.ts)
- ✅ Stop (stop-hook.ts)
- ✅ SubagentStop (subagent-stop-hook.ts)
- ✅ SessionEnd (capture-session-summary.ts)
- ✅ SessionStart (initialize-kai-session.ts)

**Commands:** ✅ All 4 slash commands available
**Integration:** ✅ Spec-Kit, Agent workflows
**Files Captured:** 52 migrated + ongoing auto-captures

---

## Complete Documentation

**This file:** High-level reference and routing guide
**Canonical Source:** `${PAI_DIR}/history/CLAUDE.md` - Complete specification (584 lines)
**Implementation Log:** `${PAI_DIR}/history/IMPLEMENTATION-COMPLETE.md` - Build history

---

## Routing Triggers

**Load this documentation when Daniel says:**
- "history system" or "UOCS"
- "how does capture work" or "automatic documentation"
- "where are sessions saved" or "history directory"
- "how to search history" or "find past work"
- "SubagentStop hook" or "capture hooks"
- "learning capture" or "session summaries"
- Questions about file organization in history/

**For detailed information, always refer to:** `${PAI_DIR}/history/CLAUDE.md`

---

**This is the memory of your AI infrastructure - it remembers everything so you don't have to.**
