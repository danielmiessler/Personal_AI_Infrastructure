# SearchDiscovery Workflow

**Purpose:** Find information in Joplin.

**Triggers:** "find notes", "search joplin", "where is", "backlinks", "related notes"

---

## Text Search

Search all notes for a query:

```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "query" --limit 10
```

Results include:
- Note ID, title
- Preview (first 200 chars)
- Is todo? Completed?
- Created/updated timestamps

---

## Task-Filtered Search

Find only todos:

```bash
# All todos
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "*" --task

# Open todos only
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "*" --task --completed false

# Completed todos
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "*" --task --completed true
```

---

## Tag-Based Search

Find notes with a specific tag:

```bash
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes_with_tag "tag-name"

# With task filter
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes_with_tag "priority" --task --completed false
```

---

## Find Related Notes (Backlinks)

Discover what links to a note:

```bash
bun run $PAI_DIR/skills/Joplin/Tools/Links.ts get_links <note_id>
```

Returns:
- **Outgoing links:** Notes this note links to
- **Backlinks:** Notes that link to this note

---

## Regex Search Within Note

Find specific patterns in a known note:

```bash
# Find all TODOs
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_in_note <note_id> "TODO:.*"

# Find dates
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_in_note <note_id> "\d{4}-\d{2}-\d{2}"

# Case-sensitive search
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_in_note <note_id> "ERROR" --case-sensitive
```

---

## Discovery Pattern

When user asks "what do I have about X?":

1. **Text search:**
```bash
bun run Search.ts find_notes "X" --limit 10
```

2. **Tag search** (if X might be a tag):
```bash
bun run Search.ts find_notes_with_tag "X"
```

3. **Backlinks** (from known related notes):
```bash
bun run Links.ts get_links <related_note_id>
```

4. Synthesize findings for user

---

## Pagination

For large result sets:

```bash
# First page
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "query" --limit 20 --offset 0

# Second page
bun run $PAI_DIR/skills/Joplin/Tools/Search.ts find_notes "query" --limit 20 --offset 20
```

---

## Examples

**Find notes:**
```
User: "Find everything about kubernetes"
→ bun run Search.ts find_notes "kubernetes" --limit 15
→ "Found 8 notes about kubernetes:
   1. K3s Cluster Setup (infrastructure)
   2. Helm Chart Guide (docs)
   ..."
```

**Find open tasks:**
```
User: "What tasks are still open?"
→ bun run Search.ts find_notes "*" --task --completed false --limit 50
→ "You have 12 open tasks:
   - Fix alertmanager (infrastructure)
   - Review Q4 budget (finances)
   ..."
```

**Find related:**
```
User: "What's related to the infrastructure backlog?"
→ bun run Links.ts get_links <backlog_note_id>
→ "The infrastructure backlog has:
   - 3 outgoing links to: K3s docs, Ansible playbooks, Network diagram
   - 5 backlinks from: Meeting notes, Sprint planning, ..."
```
