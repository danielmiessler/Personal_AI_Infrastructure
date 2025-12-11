---
name: context
description: |
  Knowledge Management - Capture and retrieve from Obsidian vault.

  🚫 NEVER AUTO-LOAD: After search, STOP and wait for user to select items. NEVER run `obs load` in same turn as search.

  USE WHEN: "what do we know about #project/X", "what do I know about project Y",
  "what context do we have on X", "find notes about Z", "load context for project",
  "search vault", "save note", "capture this", "ingest".

  Two-phase retrieval: SEARCH (show index, wait) → LOAD (only when user requests)
---

# Context Skill (Knowledge Layer)

**Purpose:** Capture, store, and retrieve knowledge from Obsidian vault.

## Workflow Routing (SYSTEM PROMPT)

**CRITICAL: READ the appropriate workflow file FIRST before executing commands.**

**When user asks about context on a topic or project:**
Examples: "what context do we have on X", "what do I know about Y", "background on project Z", "find notes about X", "search for X", "Context #project/X", "Context #tag"
→ **EXECUTE:** **TWO-TURN WORKFLOW:**
   1. Run `obs search` or `obs semantic` with `--format index`
   2. Present results as table
   3. **STOP AND WAIT FOR USER INPUT**
   4. **DO NOT RUN `obs load` UNTIL USER EXPLICITLY REQUESTS IT**

🚫 **NEVER AUTO-LOAD:**
- NEVER run `obs load` after search in the same turn
- NEVER load notes without explicit user selection
- User MUST say "load 1,2,3" or "load all" before you run `obs load`
- The search response is COMPLETE after showing the table and prompt

⚠️ **CRITICAL: STOP AFTER SHOWING RESULTS**
Your response after search should look like this and NOTHING MORE:
```
Found 18 documents for #project/X:

| #  | Date       | Type       | Title                              | Tags                    |
|----|------------|------------|------------------------------------|-------------------------|
| 1  | 2025-12-10 | wisdom     | Architecture Review Session        | architecture, security  |
| 2  | 2025-12-10 | transcript | Meeting with John Doe              | john_doe, planning      |
| 3  | 2025-12-09 | raw        | Notes on API Design                | api, implementation     |

Which to load? (all / 1-5 / 1,3,7 / --type wisdom / --tag architecture / --any-tag architecture research)
```
**TABLE MUST INCLUDE:** # (index), Date, Type, Title, Tags (top 3 meaningful tags)
**PROMPT MUST INCLUDE ALL OPTIONS:** Use real tag examples from results. --tag = AND (must have), --any-tag = OR (any of)
DO NOT add 📋 SUMMARY, 🔍 ANALYSIS, 📖 STORY, or other format sections after a search. The two-turn workflow requires a MINIMAL response that waits for user input.

**When user wants to load project context:**
Examples: "load context for project X", "get context for PAI", "load project context", "background on project"
→ **READ:** `${PAI_DIR}/skills/Context/workflows/load-project.md`
→ **EXECUTE:** **TWO-TURN WORKFLOW:** Show index first, wait for selection

**When user wants to save/capture content:**
Examples: "save this to vault", "capture this", "ingest this", "save note"
→ **EXECUTE:** Use `ingest direct` command (no workflow file needed)

**When user wants to capture a URL to vault:**
Examples: "capture this URL", "save this page to vault", "ingest this link"
→ **EXECUTE:** `fabric -u "<URL>" | ingest direct --tags "<tags>" --pipeline "/extract-content" -`
→ **FLOW:** Fabric extracts URL (via Jina) → ingest sends to Telegram with `/extract-content` → pipeline applies `extract_page_content` pattern
→ **AUTO-TAG:** If <3 tags provided, ingest pipeline applies AI tags automatically

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
    "path": "${OBSIDIAN_VAULT_PATH}/2025-10-21-Project-Methodology-Preferences.md"
  }
  ```
- **Build vault path from env:** Use `${OBSIDIAN_VAULT_PATH}` + filename for portable, clickable links
- Example response with citations:
  ```
  The user preferred a hybrid agile/waterfall approach [1] and emphasized
  cost control as priority [1][2]. The team discussed Teams integration
  as an alternative to custom app development [2].

  **Sources:**
  [1] "Project Methodology Preferences", 2025-10-21, ${OBSIDIAN_VAULT_PATH}/2025-10-21-Project-Methodology-Preferences.md
  [2] "Architecture Review Session", 2025-10-22, ${OBSIDIAN_VAULT_PATH}/2025-10-22-Architecture-Review-Session.md
  ```
→ **WHY:** Eliminates hallucinations by forcing grounding in actual loaded content. If you can't cite it, don't claim it.

---

## When to Activate This Skill

Activate this skill when user:
- Asks "what context do we have on X" or "what do I know about Y"
- Wants to find, search, or discover notes in the vault
- Asks for "background on project X" or "context for X"
- **Types "Context #tag" or "Context #project/X"** ← immediate trigger
- Wants to load notes into conversation context
- Says "save this", "capture this", "ingest this"
- Mentions vault, notes, knowledge base, or Obsidian
- Asks about tags, projects, or incoming notes

**NOT for:** General conversation, code editing, file operations outside vault, **follow-up questions about already-loaded context** (answer those directly from conversation)

---

## Quick Reference

**CLI Commands** (wrapper scripts in PATH):
```bash
# obs and ingest are available as commands (wrapper scripts in ~/bin/)
obs <command> [options]
ingest <command> [options]
```

**Example - searching for project/pai:**
```bash
obs search --tag project/pai --format index
```

| User Says | Command | Tool |
|-----------|---------|------|
| "Save this to vault" | `echo "content" \| ingest direct --tags "tag"` | ingest |
| "Capture this note" | `ingest direct --text "..." --tags "..."` | ingest |
| "What do I know about X?" | `obs semantic "X" --format index` | obs |
| "What context on project Z?" | `obs context Z --format index` | obs |
| "Find notes tagged Y" | `obs search --tag Y --format index` | obs |
| "What did X say about Y in project Z?" | `obs semantic "X said about Y" --tag project/Z` | obs |
| "Search for X in doc Y" | `obs semantic "X" --doc "Y*"` | obs |
| "Load 1,2,5" | `obs load 1,2,5` | obs |
| "Load all transcripts" | `obs load --type transcript` | obs |
| "What's incoming?" | `obs incoming` | obs |
| "Read that note" | `obs read "note-name"` | obs |
| "Notes from last week" | `obs search --since 1w --format index` | obs |
| "Add tag to note #3" | `obs tag add 3 architecture` | obs |
| "Remove incoming tag from #5" | `obs tag remove 5 incoming` | obs |

## CLI Overview

Two complementary tools:

| Tool | Purpose | Key Commands |
|------|---------|--------------|
| `ingest` | **Capture** content into vault | `direct`, `poll`, `watch` |
| `obs` | **Query** content from vault | `search`, `semantic`, `read`, `context`, `tag` |

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

# Tag filter (multiple = OR logic)
obs search --any-tag project/pai --any-tag project/ai-tailgating  # Either matches

# Type filter (transcript, meeting, wisdom, note, raw, etc.)
obs search --tag project/pai --type wisdom --format index
```

### AND vs OR Tag Logic

**Use `--tag` (AND)** when user says:
- "with both X and Y", "that have X and Y", "must have"
- "notes tagged X AND Y", "intersection of"

**Use `--any-tag` (OR)** when user says:
- "from X or Y", "either X or Y", "in multiple projects"
- "across projects", "notes in X or Y", "union of"

```bash
# AND: notes with BOTH tags (intersection)
obs search --tag architecture --tag security        # Must have both

# OR: notes with ANY of the tags (union)
obs search --any-tag project/pai --any-tag project/ai-tailgating  # Either project
```

### Filtered Semantic Search

Semantic search can be filtered by tags or document name patterns:

```bash
# Search within a project's notes only
obs semantic "what did Lyndon say" --tag project/ai-tailgating

# Search within a specific document (glob pattern)
obs semantic "architecture concerns" --doc "2025-12-08-Architecture*"

# Combine multiple tag filters (AND logic)
obs semantic "compliance requirements" --tag project/ai-tailgating --tag compliance

# Search in documents from a specific date
obs semantic "meeting decisions" --doc "2025-12-07*"
```

**Flags:**
- `--tag, -t <tag>` - Filter to notes with this tag (can use multiple, AND logic)
- `--doc, -d <pattern>` - Filter by document name pattern (`*` = any chars, `?` = single char)

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

# Filter options (MUST include selection before filters)
obs load all --tag architecture    # All results filtered by tag
obs load all --type transcript     # All results filtered by type
obs load 1-10 --since 2025-12-01   # Range filtered by date
obs load all --any-tag arch impl   # All with architecture OR implementation
obs load all --tag architecture --type raw  # Combine filters: architecture AND raw type

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

# Tag management (add/remove tags from notes)
obs tag add 3 architecture              # Add tag to note #3 from last search
obs tag add "My Note" project/pai       # Add tag by note name
obs tag remove 5 incoming               # Remove tag from note
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

**"What did Lyndon say in the architecture meeting?"**
```bash
obs semantic "what did Lyndon say" --tag project/ai-tailgating --doc "*Architecture*"
obs load all
```

**"Find compliance discussions in the tailgating project"**
```bash
obs semantic "compliance requirements" --tag project/ai-tailgating --tag compliance
obs load 1-5
```

**"Find notes from either PAI or AI-Tailgating projects"**
```bash
obs search --any-tag project/pai --any-tag project/ai-tailgating --format index
obs load all
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
