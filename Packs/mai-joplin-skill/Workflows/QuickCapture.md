# QuickCapture Workflow

**Purpose:** Quickly create notes and todos.

**Triggers:** "create note", "new note", "capture", "jot down", "add to joplin"

---

## Create Note

1. Gather required info:
   - **Title** (required)
   - **Notebook** (required - ask if not specified)
   - **Body content** (optional)

2. Create the note:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts create "Title" --notebook "Notebook Name" --body "Content here"
```

3. Optionally tag:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts tag <note_id> "tag-name"
```

---

## Create Todo

Same as note creation, but add `--is-todo` flag:

```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts create "Task title" --notebook "Tasks" --is-todo --body "Details"
```

---

## Quick Capture Defaults

When user says "capture this" without specifying notebook:

1. **If workshop context active:** Use that workshop's notebook
2. **If no context:** Ask user which notebook

Common notebook mappings:
- "task", "todo" → Look for "Tasks" or active workshop
- "meeting" → Look for "Meetings" or "Work"
- "idea" → Look for "Ideas" or "Inbox"

---

## Append to Existing Note

When user wants to add to an existing note:

1. Get the note:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id> --force-full
```

2. Append new content to the body

3. Update:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts update <note_id> --body "existing content\n\nnew content"
```

---

## Examples

**Create note:**
```
User: "Create a note about the client meeting"
→ "Which notebook should I use?"
→ User: "work"
→ bun run Notes.ts create "Client Meeting Notes" --notebook "work" --body "Date: 2026-01-05\n\nAttendees:\n- "
→ "Created 'Client Meeting Notes' in work notebook"
```

**Create todo:**
```
User: "Add a task to fix the login bug"
→ bun run Notes.ts create "Fix login bug" --notebook "Tasks" --is-todo --body "Users reporting 500 errors on login"
→ "Created todo: Fix login bug"
```

**Quick capture with context:**
```
User: (in infrastructure workshop) "Capture: need to check DNS records"
→ bun run Notes.ts create "Check DNS records" --notebook "infrastructure" --is-todo
→ "Created todo in infrastructure notebook"
```
