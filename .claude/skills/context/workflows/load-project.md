# Load Project Context Workflow

**Purpose:** Load relevant context for a specific project from the Obsidian vault.

## Trigger Phrases
- "load context for [project]"
- "get context for [project]"
- "what's the context for [project]"
- "background on [project]"

## Workflow Steps

### 1. Identify Project
Extract project name from user request.

Common projects:
- `pai` - Personal AI Infrastructure
- Other projects as tagged in vault

### 2. Search by Tag
```bash
obs search --tag "projects/${PROJECT}" --recent 20
```

This returns recent notes tagged with the project.

### 3. Rank by Relevance
If user provided additional context (e.g., "load context for PAI, specifically the context system"), combine with text search:
```bash
obs search --tag "projects/${PROJECT}" --text "${TOPIC}"
```

### 4. Load Top Notes
Read the most relevant notes:
```bash
obs read "note-name-1"
obs read "note-name-2"
# ... up to 5-10 notes depending on relevance
```

### 5. Summarize Context
Present a brief summary of loaded context:
- Key themes found
- Recent activity
- Relevant decisions/notes

## Example

**User:** "Load context for the PAI project, specifically around the context system design"

**Execution:**
```bash
# Search for PAI notes about context
obs search --tag "projects/pai" --text "context system"

# Results:
# - 2024-12-01-Context-System-Design.md
# - 2024-11-28-UFC-Migration-Notes.md
# - 2024-11-25-Obsidian-Integration.md

# Load top results
obs read "2024-12-01-Context-System-Design"
obs read "2024-11-28-UFC-Migration-Notes"
```

**Response:**
"Loaded 3 notes about PAI context system:
- Context System Design (today) - Architecture for Obsidian-based context
- UFC Migration Notes - Plans to migrate from UFC to Obsidian
- Obsidian Integration - Technical integration details

Key themes: CLI-first approach, Telegram ingestion, semantic search"

## Notes

- Default to recent notes (last 20) unless user specifies otherwise
- Combine tag + text search for better precision
- Don't overwhelm context window - load 5-10 most relevant notes
- Always summarize what was loaded
