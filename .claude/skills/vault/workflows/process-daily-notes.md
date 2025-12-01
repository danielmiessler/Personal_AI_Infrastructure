# Process Daily Notes Workflow

**Purpose:** MIGRATION TOOL - Extract existing scratchpad dumps and process through the enrichment pipeline. This workflow processes legacy unstructured content and will be retired once Telegram ingestion is the primary input method.

**Note:** For ongoing capture, use Telegram → `ingest` pipeline instead of daily note scratchpad.

## Trigger Phrases
- "process daily notes"
- "extract from scratch pad"
- "clean up today's notes"
- "process my daily note"

## Real Daily Note Structure

Daily notes use Obsidian Tasks plugin and have this structure:

```markdown
---
tags:
  - incoming
---
[[_Tasks (Northpower)]]
# Tasks
## Overdue
```tasks
not done
due on or before today
```
## Due today
```tasks
not done
due on today
```
# Scratchpad

https://x.com/DanielMiessler/status/1992435933707395365

Nano banana skill Claude Code Daniel Miessler

Boktips Chris Poplar
Pillars of the earth
Agincort Bernard Cornwell

**MIT giveth and MIT taketh away...** [MIT ICEBERG INDEX](link) | [ARTICLE](link)
A new labor simulation tool... [summary content]

[**WormGPT 4 and KawaiiGPT: New Dark LLMs (3 minute read)**](link)
WormGPT 4 and KawaiiGPT are new "dark LLMs"... [summary]

## Topic

# Journal

# Done today
```tasks
done on today
```
```

## Content Types in Scratchpad

| Content | Pattern | Action | Tags |
|---------|---------|--------|------|
| Twitter/X links | `https://x.com/...` | Extract, fetch context | `#source/twitter` |
| Quick notes | Plain text lines | Extract to idea note | `#type/idea` |
| Book recommendations | "Boktips", book names | Extract to reading list | `#type/recommendation,#category/books` |
| Newsletter items | `**Title (X minute read)**` with summary | Extract to research note | `#source/newsletter,#type/research` |
| Bare URLs | `https://...` | Fetch, summarize, save | `#type/link` |

## Prerequisites
```

## Workflow Steps

### 1. Locate Daily Note
```bash
# Today's note
obs read "$(date +%Y-%m-%d)"

# Or specific date
obs read "2024-12-01"
```

### 2. Extract Scratch Pad Items
Parse the scratch pad section and identify each item.

### 3. Classify Each Item
Use LLM to classify item type:
- **task** → Stays in daily note, gets task tag
- **idea** → Extract to idea note
- **meeting** → Extract to meeting note
- **voice-memo** → Already processed, link exists
- **research** → Extract to research note

### 4. Generate Tags
For extractable items, generate appropriate tags:
```
"Discussed PAI architecture with team"
→ #projects/pai, #type/meeting, #status/raw
```

### 5. Create Notes
For each extracted item:
```bash
obs write "PAI Architecture Discussion" \
  --tags "projects/pai,type/meeting" \
  --content "..."
```

### 6. Update Daily Note
Replace extracted items with links:
```markdown
## Scratch Pad
- [ ] Remember to check kubernetes docs
- [ ] Idea: Build CLI for JIRA context → [[2024-12-01-JIRA-CLI-Idea]]
- Meeting note: [[2024-12-01-PAI-Architecture-Discussion]]
```

## Example

**Input (daily note scratchpad from 2025-11-27):**
```markdown
# Scratchpad

https://x.com/DanielMiessler/status/1992435933707395365

Nano banana skill Claude Code Daniel Miessler

Boktips Chris Poplar
Pillars of the earth
Agincort Bernard Cornwell

**MIT giveth and MIT taketh away...** [MIT ICEBERG INDEX](link)
A new labor simulation tool called the Iceberg Index shows...

[**WormGPT 4 and KawaiiGPT: New Dark LLMs (3 minute read)**](link)
WormGPT 4 and KawaiiGPT are new "dark LLMs" that empower...
```

**Processing:**
1. Twitter URL → Fetch tweet context, create link note
2. "Nano banana skill..." → Quick idea note about Claude Code
3. "Boktips..." → Book recommendations list
4. "MIT giveth..." → Newsletter research note (AI/labor)
5. "WormGPT..." → Newsletter research note (security)

**Output (new notes created):**
- `2025-11-27-Daniel-Miessler-Tweet.md` (#source/twitter)
- `2025-11-27-Claude-Code-Nano-Banana-Skill.md` (#type/idea #projects/pai)
- `2025-11-27-Book-Recommendations-Bernard-Cornwell.md` (#type/recommendation #category/books)
- `2025-11-27-MIT-AI-Labor-Displacement-Study.md` (#source/newsletter #type/research #topic/ai)
- `2025-11-27-Dark-LLMs-WormGPT-KawaiiGPT.md` (#source/newsletter #type/research #topic/security)

**Updated daily note:**
```markdown
# Scratchpad

→ [[2025-11-27-Daniel-Miessler-Tweet]]
→ [[2025-11-27-Claude-Code-Nano-Banana-Skill]]
→ [[2025-11-27-Book-Recommendations-Bernard-Cornwell]]
→ [[2025-11-27-MIT-AI-Labor-Displacement-Study]]
→ [[2025-11-27-Dark-LLMs-WormGPT-KawaiiGPT]]
```

## Configuration

Configurable settings (in skill config):
- Scratch pad section header (default: "## Scratch Pad")
- Item type classification prompt
- Default tags per type
- Whether to keep originals or replace with links

## Notes

- Preserve checkbox items as tasks in daily note
- Create bidirectional links between daily note and extracted notes
- Add `#source/daily-note` tag to extracted items
- Run incrementally - don't re-process already-linked items
