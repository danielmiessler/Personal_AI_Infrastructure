---
name: Kai Todo Skill
version: 1.0.0
type: skill
platform: claude-code
description: Task queue manager for capturing work topics when Claude usage is limited or for deferred execution
author: Rob Taylor
license: MIT
---

# Kai Todo Skill

A lightweight task queue management system integrated with Obsidian vault storage for tracking work topics, priorities, and completion status.

## What's Included

| Component | Description |
|-----------|-------------|
| `src/SKILL.md` | Skill routing, command documentation, and task format specification |
| `src/background-processor.ts` | Automated background task processor with configurable intervals |

## The Problem

**Usage Limits Create Context Gaps**: When working with Claude Code, several scenarios create friction in task management:

1. **Usage Rate Limits** - Hit message/token limits mid-session, can't start new tasks immediately
2. **Session Interruptions** - Need to step away but want to capture ideas for later
3. **Priority Management** - Multiple pending tasks need queuing with priority levels
4. **Context Loss** - Switching conversations loses track of what needed to be done
5. **Asynchronous Thinking** - Think of tasks while doing unrelated work, need quick capture

Traditional todo apps require context switching, lack AI integration, and don't persist within your PAI knowledge base.

## The Solution

The Kai Todo Skill provides a **queue-based task system** stored directly in your Obsidian vault:

```
User: "add research iOS push notifications to kai todo"
       ↓
Claude Code (Kai Todo Skill)
       ↓
~/Documents/personal/Kai-Todo.md
       ↓
## Queued
### [KT-003] Research iOS push notifications
- **Added**: 2026-01-13
- **Priority**: medium
- **Skill**: MobileApp
- **Notes**: User requested research

Brief description of task scope.
```

### Key Innovations

1. **Markdown-Based Storage** - Tasks stored in plain Obsidian markdown, human-readable and editable
2. **Automatic ID Assignment** - Sequential IDs (KT-001, KT-002) for easy reference
3. **Priority Inference** - Parse user language to detect urgency ("asap" → high, "when you can" → low)
4. **Skill Association** - Link tasks to relevant PAI skills for context loading
5. **Background Processor** - Optional automated processing of queued tasks

## Architecture

### Storage Format

**File Location**: `~/Documents/personal/Kai-Todo.md`

**Sections**:
- `## Queued` - Tasks waiting to be worked on
- `## In Progress` - Currently active task
- `## Completed` - Finished tasks with completion dates

**Task Template**:
```markdown
### [KT-XXX] Task Title
- **Added**: YYYY-MM-DD
- **Priority**: high | medium | low
- **Skill**: relevant-skill-name (optional)
- **Notes**: Additional context

Brief description of what needs to be done.
```

### Command Routing

The skill responds to these patterns:
- `/kai-todo add <topic>` - Add new task
- `/kai-todo list` - Show all queued tasks
- `/kai-todo next` - Start highest priority task
- `/kai-todo done <id>` - Mark task complete
- `/kai-todo remove <id>` - Remove task from queue

Natural language also works:
- "add X to Kai's todo list"
- "queue this for later: X"
- "remind me to work on X"

## Features

### 📝 Task Addition

**Priority Detection**:
- Keywords like "urgent", "asap", "critical" → high priority
- Keywords like "later", "when you can", "eventually" → low priority
- Default → medium priority

**Skill Association**:
- Detects skill names in task description
- Associates task with relevant skill for context loading
- Example: "research browser automation" → associated with Browser skill

**Automatic ID Generation**:
- Scans existing tasks for highest ID
- Increments and assigns next ID (KT-001, KT-002, etc.)
- Prevents ID conflicts

### 📋 Task Listing

**Formatted Output**:
```
📋 Kai's Todo List (3 tasks queued)

🔴 HIGH PRIORITY:
  [KT-001] Fix authentication bug in mobile app
    Added: 2026-01-10 | Skill: MobileApp

🟡 MEDIUM PRIORITY:
  [KT-003] Research iOS push notifications
    Added: 2026-01-13 | Skill: MobileApp

🟢 LOW PRIORITY:
  [KT-002] Update documentation for context skill
    Added: 2026-01-11 | Skill: Context
```

### ⚡ Next Task Processing

**Priority-Based Selection**:
1. Scans Queued section for tasks
2. Sorts by priority (high → medium → low)
3. Moves highest priority task to In Progress
4. Begins working on task immediately
5. Loads relevant skill context if specified

**Example Flow**:
```
User: /kai-todo next

Kai: Moving highest priority task to In Progress:
     [KT-001] Fix authentication bug in mobile app

     Loading MobileApp skill context...
     Beginning work on authentication bug...
```

### ✅ Task Completion

**Completion Flow**:
1. Find task by ID in In Progress or Queued
2. Move to Completed section
3. Add completion date
4. Confirm to user

**Example**:
```
User: /kai-todo done KT-001

Kai: ✅ Task completed: [KT-001] Fix authentication bug in mobile app
     Moved to Completed section with date 2026-01-13

     2 tasks remaining in queue. Use /kai-todo next for next task.
```

### 🗑️ Task Removal

**Removal vs Completion**:
- `done` → Moves to Completed (preserves history)
- `remove` → Deletes entirely (no history)

Use `remove` for:
- Duplicate tasks
- Obsolete/irrelevant tasks
- Mistakes

### 🤖 Background Processor

**Automated Task Execution**:
- Runs as background process
- Configurable check interval (default: 30 minutes)
- Processes next task automatically when previous completes
- Logs all actions to processor.log

**Usage**:
```bash
# Start background processor
cd ~/.claude/skills/KaiTodo
bun run background-processor.ts

# Check logs
tail -f processor.log
```

## Example Usage

### Adding Tasks

```
User: add research iOS push notifications to kai todo

Kai: Added to Kai's todo list:

     ### [KT-003] Research iOS push notifications
     - **Added**: 2026-01-13
     - **Priority**: medium
     - **Notes**: User requested research

     You now have 3 tasks queued. Use /kai-todo next to start.
```

### Listing Tasks

```
User: /kai-todo list

Kai: 📋 Kai's Todo List (3 tasks queued)

     🔴 HIGH PRIORITY:
       [KT-001] Fix authentication bug
         Added: 2026-01-10

     🟡 MEDIUM PRIORITY:
       [KT-003] Research iOS push notifications
         Added: 2026-01-13

     🟢 LOW PRIORITY:
       [KT-002] Update documentation
         Added: 2026-01-11
```

### Processing Next Task

```
User: /kai-todo next

Kai: Starting highest priority task:
     [KT-001] Fix authentication bug in mobile app

     Loading relevant context...
     [Begins working on task]
```

### Completing Tasks

```
User: /kai-todo done KT-001

Kai: ✅ Completed: [KT-001] Fix authentication bug

     2 tasks remaining. Next up:
     [KT-003] Research iOS push notifications (medium priority)
```

## Invocation Scenarios

| User Input | Skill Action | Expected Output |
|------------|-------------|-----------------|
| "add upgrade obsidian MCP server to kai todo" | Parse topic, detect medium priority, assign ID, add to Queued | Task added confirmation with ID and metadata |
| "/kai-todo list" | Read Kai-Todo.md, format all queued tasks | Formatted list grouped by priority |
| "/kai-todo next" | Find highest priority, move to In Progress, begin work | Task started message with context loading |
| "queue this for later: research vector databases" | Add with low priority inferred from "later" | Task added with low priority flag |
| "/kai-todo done KT-005" | Move task to Completed with date | Completion confirmation |

## Requirements

- **Platform**: macOS or Linux (tested on macOS)
- **Runtime**: Bun 1.0+ (for background processor)
- **Obsidian Vault**: Must exist at `~/Documents/personal/`
- **Claude Code**: Installed and configured at `~/.claude/`
- **MCP Obsidian Server**: Optional, for advanced vault integration

## File Structure

```
~/.claude/skills/KaiTodo/
├── SKILL.md                    # Skill routing and command logic
└── background-processor.ts     # Automated task processor
```

**Data Storage**:
```
~/Documents/personal/
└── Kai-Todo.md                 # Task queue storage (auto-created)
```

## Integration Points

The Kai Todo Skill integrates with:

| Component | Integration | Purpose |
|-----------|-------------|---------|
| Obsidian Vault | File read/write | Task persistence |
| MCP Obsidian Server | Note manipulation | Advanced task operations |
| Other Skills | Context loading | Skill-specific task execution |
| Mobile App | Todo API | Mobile task management |

## Changelog

### v1.0.0 (2026-01-13)
- Initial release with add, list, next, done, remove commands
- Priority-based task queuing
- Automatic ID generation (KT-XXX format)
- Skill association detection
- Background processor for automated execution
- Natural language command parsing
- Obsidian markdown storage format

---

**📖 See INSTALL.md for detailed installation instructions**
**✅ See VERIFY.md for verification checklist**
