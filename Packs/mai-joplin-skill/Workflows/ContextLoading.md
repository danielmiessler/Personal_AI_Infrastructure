# ContextLoading Workflow

**Purpose:** Efficiently load note content for context (e.g., workshop switching).

**Triggers:** "load context", "get note", "read note", "workshop: [domain]"

---

## Load by ID (Preferred - Fastest)

When you have the note ID:

```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id>
```

If note is long (TOC returned):
1. Identify relevant section(s) from TOC
2. Request specific section:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id> --section "section-slug"
# OR by number:
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id> --section 2
```

---

## Load by Name (Requires Search)

When you only have the note title:

1. Search for the note:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "Note Title" --limit 5
```

2. Identify correct note from results (by title match, notebook, etc.)

3. Load by ID using the flow above

---

## Workshop Context Pattern

For workshop domain switching (e.g., "workshop: infrastructure"):

1. Read domain → note ID mapping:
```bash
cat ~/workshop/.workshop-cache.json
```

2. Extract the note ID for the domain

3. Load note by ID:
```bash
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <note_id>
```

4. If TOC returned, load relevant section (usually the current priorities)

5. Acknowledge switch with role + context summary

---

## Pagination for Very Long Sections

If a section is still too long:

```bash
# First 50 lines
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <id> --start-line 1 --line-count 50

# Next 50 lines
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <id> --start-line 51 --line-count 50
```

---

## Smart Display Options

| Option | Effect |
|--------|--------|
| (none) | Auto: full if <100 lines, TOC if longer |
| `--toc-only` | Force TOC display |
| `--force-full` | Force full content (use carefully!) |
| `--section N` | Get section by number |
| `--section "slug"` | Get section by heading slug |
| `--start-line N` | Start at line N |
| `--line-count N` | Return N lines (default 50) |

---

## Examples

**Workshop switch:**
```
User: "workshop: finances"
→ Read ~/.workshop-cache.json → finances = <note_id>
→ bun run Notes.ts get <note_id>
→ TOC returned, 200+ lines
→ bun run Notes.ts get <note_id> --section "current-focus"
→ "Workshop: Finances loaded. Role: 2nd Financial Advisor. Current focus: Q1 tax prep..."
```

**Load specific note:**
```
User: "Show me the infrastructure backlog"
→ bun run Search.ts find_notes "infrastructure backlog" --limit 3
→ Found: "BF Infrastructure Backlog" (id: abc123...)
→ bun run Notes.ts get abc123... --section "priority-1"
```
