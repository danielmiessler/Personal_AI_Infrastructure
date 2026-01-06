---
name: Joplin
description: Direct Joplin REST API for notes, notebooks, tags, tasks, search, links. USE WHEN joplin, notes, notebooks, tasks, todos, documentation, knowledge base, context loading. CLI-first, token-efficient with smart display, no MCP server.
---

# Joplin - Direct REST API Skill

**Joplin note-taking integration via direct REST API calls.**

This skill provides CLI tools for interacting with Joplin Desktop. It uses direct API calls instead of an MCP server for:
- Lower context usage (no MCP schema overhead)
- Higher reliability (deterministic execution)
- Token efficiency (smart display filters data before returning)

---

## Authentication

Token stored in macOS Keychain:
```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
```

Get your token from: Joplin Desktop → Tools → Options → Web Clipper → Advanced Options

---

## CLI Commands (Primary Interface)

**Location:** `$PAI_DIR/skills/Joplin/Tools/`

### Ping - Connection Test
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Ping.ts
```

### Notes - Note CRUD + Smart Display
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id> [--toc-only] [--section <num>]
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts create "Title" --notebook "Name" [--body "..."] [--is-todo]
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts update <note_id> [--title "..."] [--body "..."] [--todo-completed]
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts delete <note_id>
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts rename <note_id> "New Title"
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts move <note_id> <notebook_id>
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts find_in_notebook "Notebook" [--task] [--completed false]
```

### Notebooks - Folder Management
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts list
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts create "Name" [--parent <id>]
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts get <notebook_id>
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts rename <notebook_id> "New Name"
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts move <notebook_id> <parent_id>
bun run $PAI_DIR/skills/Joplin/Tools/Notebooks.ts delete <notebook_id>
```

### Tags - Tag Management
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts list
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts create "tag-name"
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts tag <note_id> "tag-name"
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts untag <note_id> "tag-name"
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts get_by_note <note_id>
bun run $PAI_DIR/skills/Joplin/Tools/Tags.ts delete <tag_id>
```

### Search - Find Notes
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "query" [--task] [--completed] [--limit 20]
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "*" --task --completed false  # Open todos
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes_with_tag "tag-name"
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_in_note <note_id> "regex-pattern"
```

### Links - Link Analysis
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Links.ts get_links <note_id>
```

---

## Smart Display (Token Efficiency)

Notes under 100 lines return full content. Longer notes return a Table of Contents:

```json
{
  "toc": [
    { "number": 1, "level": 1, "text": "Introduction", "slug": "introduction", "line": 1 },
    { "number": 2, "level": 2, "text": "Priority 1", "slug": "priority-1", "line": 15 }
  ],
  "content": "Note is 847 lines. Use --section 2 to read 'Priority 1'."
}
```

Then request specific sections: `--section 2` or `--section "priority-1"`

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **TaskManagement** | "tasks", "todos", "open tasks", "complete task" | `Workflows/TaskManagement.md` |
| **ContextLoading** | "load context", "get note", "workshop" | `Workflows/ContextLoading.md` |
| **QuickCapture** | "create note", "capture", "jot down" | `Workflows/QuickCapture.md` |
| **NoteOrganization** | "move note", "rename", "organize" | `Workflows/NoteOrganization.md` |
| **SearchDiscovery** | "find notes", "search joplin", "backlinks" | `Workflows/SearchDiscovery.md` |

---

## Examples

**Example 1: Load workshop context**
```
User: "workshop: infrastructure"

→ Read ~/.workshop-cache.json to get note ID
→ Run: bun run Notes.ts get <note_id>
→ If TOC returned, request relevant section
→ Acknowledge context loaded
```

**Example 2: List open tasks**
```
User: "What are my open tasks in finances?"

→ Run: bun run Notes.ts find_in_notebook "finances" --task --completed false
→ Present list of open todos
```

**Example 3: Create a note**
```
User: "Create a note about the meeting with Bob"

→ Ask: "Which notebook?"
→ Run: bun run Notes.ts create "Meeting with Bob" --notebook "work" --body "Notes..."
```

**Example 4: Search and discover**
```
User: "Find everything about Alertmanager"

→ Run: bun run Search.ts find_notes "Alertmanager" --limit 10
→ Present results with titles and previews
```
