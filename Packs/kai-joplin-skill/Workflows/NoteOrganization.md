# NoteOrganization Workflow

**Purpose:** Reorganize notes and notebooks.

**Triggers:** "move note", "rename", "organize", "archive", "restructure"

---

## Move Note to Different Notebook

1. Get note ID (search if needed)
2. List notebooks to find target:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts list
```
3. Move the note:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts move <note_id> <notebook_id>
```

---

## Rename Note

1. Get note ID
2. Rename:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts rename <note_id> "New Title"
```

---

## Rename Notebook

1. List notebooks to get ID:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts list
```
2. Rename:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts rename <notebook_id> "New Name"
```

---

## Move Notebook

Move a notebook to be a child of another:

```bash
# Move under another notebook
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts move <notebook_id> <parent_id>

# Move to root level
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts move <notebook_id> ""
```

---

## Create Notebook Structure

```bash
# Create parent
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts create "Projects"

# Create children (use parent ID from above)
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts create "Active" --parent <parent_id>
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts create "Archive" --parent <parent_id>
```

---

## Archive Pattern

To archive old notes:

1. Create or find "Archive" notebook:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts list | grep -i archive
# Or create:
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts create "Archive"
```

2. Move notes to archive:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts move <note_id> <archive_notebook_id>
```

---

## Bulk Organization

When reorganizing multiple notes:

1. List notes in source notebook:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts find_in_notebook "Source Notebook"
```

2. For each note to move, run the move command

3. Verify by listing target notebook

---

## Examples

**Move note:**
```
User: "Move the meeting notes to the archive"
→ bun run Search.ts find_notes "meeting notes" --limit 5
→ Found: "Q4 Meeting Notes" (id: abc123)
→ bun run Notebooks.ts list  # Find archive ID
→ bun run Notes.ts move abc123 <archive_id>
→ "Moved 'Q4 Meeting Notes' to Archive"
```

**Rename notebook:**
```
User: "Rename 'Old Projects' to 'Completed Projects'"
→ bun run Notebooks.ts list  # Find ID
→ bun run Notebooks.ts rename <id> "Completed Projects"
→ "Renamed notebook to 'Completed Projects'"
```
