---
name: context
description: |
  Knowledge Management - Capture and retrieve from Obsidian vault.

  USE WHEN: "what context do we have on X", "what do I know about Y", "find notes about Z",
  "load context for project", "search vault", "save note", "capture this", "ingest".

  Two-phase retrieval: SEARCH (discovery) → LOAD (injection)
---

# Context Skill (Knowledge Layer)

**Purpose:** Capture, store, and retrieve knowledge from Obsidian vault.

## Workflow Routing (SYSTEM PROMPT)

**CRITICAL: READ the appropriate workflow file FIRST before executing commands.**

**When user asks about context on a topic or project:**
Examples: "what context do we have on X", "what do I know about Y", "background on project Z", "find notes about X", "search for X"
→ **READ:** `${PAI_DIR}/.claude/skills/context/workflows/semantic-search.md`
→ **EXECUTE:** **TWO-TURN WORKFLOW:**
   1. Run search with `--format json`, present results as table
   2. **STOP and ASK** user which items to load
   3. **WAIT** for user response before loading

**When user wants to load project context:**
Examples: "load context for project X", "get context for PAI", "load project context", "background on project"
→ **READ:** `${PAI_DIR}/.claude/skills/context/workflows/load-project.md`
→ **EXECUTE:** **TWO-TURN WORKFLOW:** Show index first, wait for selection

**When user wants to save/capture content:**
Examples: "save this to vault", "capture this", "ingest this", "save note"
→ **EXECUTE:** Use `ingest direct` command (no workflow file needed)

**When user selects items to load (after a search):**
Examples: "load 1,2,5", "load all", "load transcripts", "1,2,5", "all"
→ **EXECUTE:** `obs load <selection>` command - this is Turn 2 of the workflow

**When user asks follow-up questions about already-loaded context:**
Examples: "what did X say about Y", "summarize the meeting", "any follow-up tasks", "who mentioned Z"
→ **DO NOT** re-query vault with `obs` commands
→ **EXECUTE:** Answer directly from conversation context - notes are already loaded
→ **RULE:** Once `obs load` has injected content, that content lives in the conversation window. Use it directly for all follow-up questions about that content.
→ **CITATIONS:** Use IEEE notation to reference sources. Every claim must cite the specific note(s) it came from.

**IEEE Citation Format for Loaded Context:**
- Number sources in order of first reference: [1], [2], [3]
- Include source list at end of response
- Format: `[N] "Note Title", date, path`
- **Path source:** The `path` field is in the JSON output from `obs search --format json`. Retain this metadata from search phase for use in citations.
- Example JSON entry:
  ```json
  {
    "index": 1,
    "title": "Project Methodology Preferences for Technical Architecture",
    "date": "2025-10-21",
    "path": "/Users/andreas/Documents/andreas_brain/2025-10-21-Project-Methodology-Preferences.md"
  }
  ```
- **Convert path to vault link:** Extract filename from path, format as `[[filename]]`
- Example response with citations:
  ```
  Andreas preferred a hybrid agile/waterfall approach [1] and emphasized
  cost control as priority [1][2]. The team discussed Teams integration
  as an alternative to custom app development [2].

  **Sources:**
  [1] "Project Methodology Preferences", 2025-10-21, [[2025-10-21-Project-Methodology-Preferences.md]]
  [2] "Architecture Review Session", 2025-10-22, [[2025-10-22-Architecture-Review-Session.md]]
  ```
→ **WHY:** Eliminates hallucinations by forcing grounding in actual loaded content. If you can't cite it, don't claim it.

---

## When to Activate This Skill

Activate this skill when user:
- Asks "what context do we have on X" or "what do I know about Y"
- Wants to find, search, or discover notes in the vault
- Asks for "background on project X" or "context for X"
- Wants to load notes into conversation context
- Says "save this", "capture this", "ingest this"
- Mentions vault, notes, knowledge base, or Obsidian
- Asks about tags, projects, or incoming notes

**NOT for:** General conversation, code editing, file operations outside vault, **follow-up questions about already-loaded context** (answer those directly from conversation)

---

## Quick Reference

**CLI Paths** (run from PAI_DIR):
- `obs`: `cd ${PAI_DIR}/bin/obs && bun run obs.ts`
- `ingest`: `cd ${PAI_DIR}/bin/ingest && bun run ingest.ts`

| User Says | Command | Tool |
|-----------|---------|------|
| "Save this to vault" | `echo "content" \| ingest direct --tags "tag"` | ingest |
| "Capture this note" | `ingest direct --text "..." --tags "..."` | ingest |
| "What do I know about X?" | `obs semantic "X" --format index` | obs |
| "What context on project Z?" | `obs context Z --format index` | obs |
| "Find notes tagged Y" | `obs search --tag Y --format index` | obs |
| "Load 1,2,5" | `obs load 1,2,5` | obs |
| "Load all transcripts" | `obs load --type transcript` | obs |
| "What's incoming?" | `obs incoming` | obs |
| "Read that note" | `obs read "note-name"` | obs |
| "Notes from last week" | `obs search --since 1w --format index` | obs |

## CLI Overview

Two complementary tools:

| Tool | Purpose | Key Commands |
|------|---------|--------------|
| `ingest` | **Capture** content into vault | `direct`, `poll`, `watch` |
| `obs` | **Query** content from vault | `search`, `semantic`, `read`, `context` |

---

## 1. INGEST — Capture to Vault

### Telegram Ingestion (Automated)

The Telegram bot automatically captures voice memos, photos, documents, and text messages.

```bash
# Check Telegram ingestion status
ingest status

# Process pending Telegram items
ingest poll
ingest process

# Watch for new items continuously
ingest watch
```

**Auto-Tagging:** Transcribed content uses fuzzy matching (70% Levenshtein threshold + phonetic boost) to match spoken tags against existing vault tags.
- `"ProjectPie"` → `project/pai`
- `"edovry"` → `ed_overy`

Unmatched tags are kept and flagged for review.

### CLI Direct Ingestion

```bash
# Pipe content directly
pbpaste | ingest direct --tags "project/pai,meeting"
cat document.md | ingest direct --name "My Document"

# Inline text
ingest direct --text "Quick note about API design" --tags "ideas"

# Files (PDF, images, etc.)
ingest direct document.pdf --scope private
```

**Inline Hints:** Use markers in content for automatic tagging:
- `#tag` → adds tag
- `@person` → adds person tag
- `~scope` → sets scope (work/private)

---

## 2. SEARCH — Discovery Phase

Find notes matching criteria. Use `--format index` to get numbered results for loading.

### Basic Search

```bash
# Semantic search (AI-powered) with numbered index
obs semantic "deployment strategies" --format index

# Tag-based search with numbered index
obs search --tag project/pai --format index

# Project context shortcut
obs context pai --format index

# Tag filter (multiple = AND logic)
obs search --tag ai --tag nvidia --format index   # Must have BOTH
```

### Temporal Filters

Three date filters for different use cases:

| Flag | Meaning | Source |
|------|---------|--------|
| `--since` | Captured since | Frontmatter `generation_date` |
| `--modified` | Changed since | File modification time |
| `--created` | File created since | File creation time (birthtime) |

```bash
# Captured since (frontmatter date - when content was originally captured)
obs search --since 7d              # Last 7 days
obs search --since 2w              # Last 2 weeks
obs search --since 1m              # Last month (30 days)
obs search --since today           # Today only
obs search --since yesterday       # Since yesterday
obs search --since "this week"     # Current week (Mon-Sun)
obs search --since "this month"    # Current month
obs search --since 2025-12-01      # Since specific date

# Modified since (file system mtime - when file was last changed)
obs search --modified 7d           # Modified in last 7 days
obs search --modified today        # Modified today

# Created since (file system birthtime - when file appeared)
obs search --created 7d            # Created in last 7 days
```

### Scope Filters

```bash
obs search --scope work            # Default: only scope/work tagged
obs search --scope private         # Only private/untagged
obs search --scope all             # Everything
```

### Combined Examples

```bash
obs search "authentication" --tag project/api --since 1w
obs semantic "database optimization" --limit 5 --scope all
obs search --tag meeting --tag ed_overy --since "this month"
```

---

## 3. LOAD — Injection Phase

Load selected notes from last search results into context.

```bash
# Load by selection (from last search/semantic/context command)
obs load 1,2,5                     # Specific items
obs load 1-10                      # Range
obs load all                       # Everything from last search

# Filter options
obs load --type transcript         # Only transcripts
obs load --since 2025-12-01        # Only from date

# Read single note by name (bypass index)
obs read "2025-01-15-Planning"
```

**Two-Phase Workflow:**
1. `obs context pai --format index` → Shows numbered list
2. `obs load 1,2,5` → Loads selected notes

---

## 4. Convenience Commands

```bash
# Incoming notes (need processing)
obs incoming
obs incoming --recent 20

# List all tags
obs tags
obs tags --counts

# Build/update embeddings for semantic search
obs embed --verbose
obs embed --stats
```

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `OPENAI_API_KEY` | Yes | For semantic embeddings |

---

## Examples by Intent

**"I just had a meeting, save these notes"**
```bash
pbpaste | ingest direct --tags "meeting,project/pai"
```

**"What context do we have on Kubernetes?"**
```bash
obs semantic "kubernetes" --format index --since 2w
# Shows numbered list
obs load 1-5  # Load first 5 results
```

**"Load all meeting transcripts for PAI project"**
```bash
obs context pai --format index
obs load --type transcript
```

**"What do we have on project ai-tailgating?"**
```bash
obs search --tag project/ai-tailgating --format index --scope all
obs load 1,3,5  # Load specific items
```

**"What's waiting for me to process?"**
```bash
obs incoming
```

**"Find notes mentioning Ed from this week"**
```bash
obs search --tag ed_overy --since "this week" --format index
obs load all  # Load all matching
```

**"Quick capture an idea"**
```bash
ingest direct --text "Consider using Redis for caching layer #ideas #project/api" --scope work
```
