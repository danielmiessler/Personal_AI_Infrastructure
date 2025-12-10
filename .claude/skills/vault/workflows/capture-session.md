# Capture Session Workflow

**Purpose:** Save Claude conversations as Obsidian notes for future reference.

## Trigger Phrases
- "save this conversation"
- "capture this session"
- "document this discussion"
- "save to vault"

## Use Cases

- Design discussions (like this context system design)
- Problem-solving sessions
- Research and exploration
- Decision-making conversations

## Workflow Steps

### 1. Identify Scope
Determine what to capture:
- Entire conversation
- Specific section/topic
- Key decisions only

### 2. Summarize Content
Generate a structured summary:

```markdown
# [Topic] Discussion

## Summary
[Brief overview of what was discussed]

## Key Decisions
- Decision 1
- Decision 2

## Action Items
- [ ] Action 1
- [ ] Action 2

## Details
[Relevant excerpts or expanded notes]

## References
- Related notes: [[note1]], [[note2]]
- External links: [link](url)
```

### 3. Generate Title and Tags
Based on content:
- Title: Descriptive, action-oriented
- Tags: `#type/design`, `#projects/X`, `#source/claude-session`

### 4. Save to Vault
```bash
obs write "PAI Context System Design Discussion" \
  --tags "projects/pai,type/design,source/claude-session"
```

Or using existing `save`:
```bash
echo "$CONTENT" | save "PAI Context System Design Discussion" \
  -t type/design -t projects/pai -t source/claude-session
```

## Example

**User:** "Save this conversation about the context system design"

**Generated note:**

```markdown
---
generation_date: 2024-12-01 14:30
tags: projects/pai type/design source/claude-session
---

# PAI Context System Design Discussion

## Summary
Designed a CLI-first context management system for PAI, replacing UFC with
Obsidian-based storage. Key components: `obs` CLI, `ingest` CLI, semantic search.

## Key Decisions
- Use Obsidian vault as primary context store (replaces UFC)
- CLI-first architecture, integrate with existing tools (ts, save, fabric)
- Telegram as immutable ingestion log
- Tag-based organization with semantic search overlay

## Components Designed
1. **skills/context/** - Context loading
2. **skills/vault/** - Vault maintenance
3. **obs CLI** - Vault operations (search, read, write, semantic)
4. **ingest CLI** - Telegram pipeline

## Action Items
- [ ] Build obs CLI
- [ ] Build ingest CLI
- [ ] Set up Telegram bot
- [ ] Add semantic search (sqlite-vec)

## Architecture
[Link to full design doc: [[context-system-architecture]]]
```

## Configuration

- Default tags for session captures
- Summary format template
- Whether to include full transcript or summary only
- Auto-link to related notes

## Notes

- Focus on decisions and outcomes, not full transcript
- Include action items for follow-up
- Link to any notes created during the session
- Use `#source/claude-session` for easy filtering
