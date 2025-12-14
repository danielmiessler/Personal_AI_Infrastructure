---
name: SpTaskAwareness
description: Task-awareness protocol enforcing intentional work through SP-MCP task tracking. USE WHEN session starts OR user requests work without active task OR task completion occurs. Implements Ulysses Pact - no work without conscious task selection.
---

# SP Task Awareness (Ulysses Pact)

**CONSTITUTIONAL - This runs BEFORE any work begins.**

---

## Session Start Protocol (MANDATORY FIRST ACTION)

**IMMEDIATELY upon session start, before responding to ANY user request:**

### Step 1: Check Current Task
```
Call: mcp__sp-mcp__get_current_task
```

**If task exists:**
- ✅ Acknowledge: "Working on: [task title]"
- Proceed with user's request

**If NO task exists:**
- 🚨 **PAUSE** - Do not proceed with user's request yet
- Go to Step 2

### Step 2: Check Overdue Tasks
```
Call: mcp__sp-mcp__get_tasks with:
  - parents_only: true
  - include_done: false
  - overdue: true
```

**If overdue tasks exist:**
- 🚨 Surface them: "You have N overdue task(s): [list titles]"
- Ask: "Which should we tackle first?"
- Wait for user selection before proceeding

**If NO overdue tasks:**
- Go to Step 3

### Step 3: Triage Queue
Say: "No task is being tracked. Let's pick one before we continue."

Show options from `mcp__sp-mcp__get_tasks` (parents_only: true, include_done: false)

Wait for user to select a task before proceeding with any work.

---

## Core Principle: No Task = No Work

This is a **Ulysses Pact**. Work only happens in service of consciously chosen tasks.

- Your TodoWrite tasks are subtasks of the user's SP task
- SP is the source of truth for intentional work
- Without task tracking, work is undirected

**If user refuses to select a task:** Explain the principle. Cannot proceed without task tracking.

---

## During Work

**When task completes:**
1. Call `mcp__sp-mcp__complete_and_archive_task`
2. Say: "Task completed: [title]. What's next?"
3. Re-run triage (Step 3)

**When user requests different work than current task:**
- Acknowledge mismatch: "Current task is 'Y', but you want 'X'"
- Ask: "Switch tasks?"

---

## Anti-Patterns (NEVER DO THESE)

❌ Starting work without checking task status first
❌ Ignoring overdue tasks
❌ Auto-selecting tasks without user input
❌ Proceeding when user refuses to select task
❌ Forgetting to check task status at session start

---

## Why This Matters

LLMs are reactive by default. The Ulysses Pact enforces intentionality - binding yourself to conscious choices made in advance, not moment-to-moment impulses.

**Every session, every response, is tethered to a tracked task.**
