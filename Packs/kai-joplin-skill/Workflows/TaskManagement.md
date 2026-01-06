# TaskManagement Workflow

**Purpose:** Working with Joplin todos (tasks).

**Triggers:** "tasks", "todos", "task list", "complete task", "open tasks"

---

## List Open Tasks

### In Specific Notebook
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts find_in_notebook "Notebook Name" --task --completed false
```

### All Notebooks
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "*" --task --completed false
```

### By Tag
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes_with_tag "priority" --task --completed false
```

---

## Create Task

1. Get notebook name from user (or use context default)
2. Run:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts create "Task title" --notebook "Notebook" --is-todo --body "Details here"
```
3. Optionally tag:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts tag <note_id> "priority"
```

---

## Complete Task

1. Get task ID (search if needed)
2. Run:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts update <task_id> --todo-completed
```
3. Confirm completion

---

## Task Review Pattern

When user asks for task review:

1. List open tasks by notebook or globally
2. Present summary: "You have X open tasks across Y notebooks"
3. For each task, offer: complete, defer (no action), or delete
4. Execute user decisions

---

## Examples

**List tasks:**
```
User: "Show my open tasks"
→ bun run Search.ts find_notes "*" --task --completed false --limit 50
→ Present grouped by notebook
```

**Complete task:**
```
User: "Mark the alertmanager task as done"
→ Search for "alertmanager" in tasks
→ bun run Notes.ts update <id> --todo-completed
→ "Completed: Fix alertmanager config"
```
