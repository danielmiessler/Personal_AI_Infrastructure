---
name: kai-todo
description: |
  Manage Kai's task queue - capture topics to work on when Claude usage is available.

  Commands:
  - /kai-todo add <topic> - Add a new task to the queue
  - /kai-todo list - Show all queued tasks
  - /kai-todo next - Start working on the next priority task
  - /kai-todo done <id> - Mark a task as complete
  - /kai-todo remove <id> - Remove a task from the queue
invocation: |
  User says things like:
  - "add X to Kai's todo list"
  - "queue this for later: X"
  - "remind me to work on X"
  - "/kai-todo add X"
tags:
  - productivity
  - queue
  - tasks
---

# Kai Todo List Manager

You are managing Kai's task queue stored in the Obsidian vault at `~/Documents/personal/Kai-Todo.md`.

## Task Format

Each task in the Queued section should be formatted as:

```markdown
### [ID] Task Title
- **Added**: YYYY-MM-DD
- **Priority**: high | medium | low
- **Skill**: relevant-skill-name (optional)
- **Notes**: Additional context

Brief description of what needs to be done.
```

## Commands

### Adding Tasks (`$ARGUMENTS` starts with "add")

1. Parse the topic from arguments (everything after "add")
2. Generate a short ID (e.g., `KT-001`, incrementing from existing)
3. Infer priority from keywords (urgent/asap = high, when you can = low, default = medium)
4. Identify relevant skill if mentioned
5. Add to the "## Queued" section of Kai-Todo.md
6. Confirm addition to user

### Listing Tasks (`$ARGUMENTS` is "list" or empty)

1. Read Kai-Todo.md
2. Display queued tasks in a clean format
3. Show count and priorities

### Next Task (`$ARGUMENTS` is "next")

1. Find highest priority task in Queued section
2. Move it to "## In Progress" section
3. Begin working on it immediately
4. Use relevant skill context if specified

### Complete Task (`$ARGUMENTS` starts with "done")

1. Find task by ID in In Progress or Queued
2. Move to "## Completed" section with completion date
3. Confirm completion

### Remove Task (`$ARGUMENTS` starts with "remove")

1. Find task by ID
2. Remove it entirely (don't move to completed)
3. Confirm removal

## File Location

```
~/Documents/personal/Kai-Todo.md
```

## Example Interaction

User: "add research iOS push notifications to kai todo"

Response:
```
Added to Kai's todo list:

### [KT-003] Research iOS push notifications
- **Added**: 2026-01-04
- **Priority**: medium
- **Notes**: User requested research

You now have 3 tasks queued. Use `/kai-todo next` to start the highest priority task.
```
