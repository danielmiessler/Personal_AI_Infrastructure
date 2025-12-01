---
name: vault
description: |
  Manage and maintain the Obsidian knowledge vault. Process daily notes,
  tag untagged content, refactor notes, and capture Claude sessions. USE WHEN
  user says "process daily notes", "tag my notes", "clean up vault", "organize
  notes", "save this conversation", or needs vault maintenance.
---

# Vault Management Skill

**Purpose:** Maintain and organize the Obsidian knowledge vault.

## Required Configuration

Add these to `~/.claude/.env` or `~/.config/fabric/.env`:

```bash
# Required
OBSIDIAN_VAULT_PATH=~/Documents/my_vault    # Your Obsidian vault location
OPENAI_API_KEY=sk-...                        # For tag suggestions and embeddings

# Optional
DAILY_NOTE_FORMAT=%Y-%m-%d                   # Daily note date format
SCRATCH_PAD_HEADER="## Scratch Pad"          # Header for scratch pad section
FABRIC_FRONTMATTER_TAGS=incoming             # Default tags for new notes
```

## Quick Reference

```bash
# Process daily notes
obs daily --extract

# Suggest tags for untagged notes
obs tag suggest "note-name"

# List untagged notes
obs search --untagged

# Rebuild vector index
obs embed --incremental

# Write new note
obs write "Title" --tags "project/my-app,idea"
```

## Routing

### Process Daily Notes
**Triggers:** "process daily notes", "extract from scratch pad", "clean up today's notes"
**Workflow:** `workflows/process-daily-notes.md`
**Action:** Extract scratch pad items, create proper notes with tags

### Tag Untagged Notes
**Triggers:** "tag untagged notes", "suggest tags", "organize my notes"
**Workflow:** `workflows/tag-untagged.md`
**Action:** AI-assisted tagging of notes without proper tags

### Capture Session
**Triggers:** "save this conversation", "capture this session", "document this discussion"
**Workflow:** `workflows/capture-session.md`
**Action:** Save Claude conversation as Obsidian note

### Refactor Notes
**Triggers:** "break up this note", "split into smaller notes", "refactor notes"
**Workflow:** `workflows/refactor-notes.md`
**Action:** Split large notes into linked smaller notes

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `OPENAI_API_KEY` | Yes | For tag suggestions and embeddings |
| `DAILY_NOTE_FORMAT` | No | Date format for daily notes (default: %Y-%m-%d) |
| `SCRATCH_PAD_HEADER` | No | Header for scratch pad section |

## Daily Note Structure

Daily notes typically have a scratch pad section:

```markdown
# 2024-12-01

## Scratch Pad
- [ ] Remember to check kubernetes docs
- [ ] Idea: Build CLI for JIRA context
- [ ] Meeting note: Discussed architecture

## Tasks
...

## Notes
...
```

The `process-daily-notes` workflow extracts scratch pad items and creates proper notes.

## Tag Taxonomy

See `skills/context/tag-taxonomy.md` for complete reference.

**Key categories:**
- Processing status: `incoming`, `fabric-extraction`, `wisdom`, `raw`, `main`
- People: `firstname_lastname` format (snake_case)
- Projects: `project/project-name` format
- Content types: `meeting-notes`, `transcript`, `bibliography`, `1on1`
- Topics: `ai`, `genai`, free-form tags

## Automatic Embedding Updates

Embeddings can be auto-updated via launchd (macOS) or systemd (Linux).

**macOS:**
```bash
# Install launchd plist (from bin/obs/)
cd ${PAI_DIR}/bin/obs
./install.sh

# Check status
launchctl list | grep obs-embed

# Manual trigger
launchctl start com.pai.obs-embed

# View logs
tail -f /tmp/obs-embed.log
```

**Linux:**
See `docs/architecture/context-system.md` for systemd setup.

## Integration

This skill uses:
- `obs` CLI for vault operations
- `save` (existing) for writing notes
- `fabric` patterns for content processing
- LLM for tag suggestions and content extraction

## Related Skills

- `context/` - Context loading and search
- `fabric/` - Content processing patterns

## Examples

**Process daily notes:**
```
User: "Process today's daily notes"
→ Read today's daily note
→ Extract scratch pad items
→ For each item:
  → Classify type (idea, task, note)
  → Generate appropriate tags via LLM
  → Create proper note with frontmatter
→ Update daily note with links to created notes
```

**Tag suggestions:**
```
User: "Suggest tags for my recent untagged notes"
→ obs search --untagged --recent 10
→ For each note:
  → Read content
  → Use LLM to suggest appropriate tags based on taxonomy
  → Present suggestions for approval
```

**Capture session:**
```
User: "Save this conversation to my vault"
→ Summarize conversation
→ Generate title and tags
→ obs write "Design Discussion" --tags "project/my-app,idea"
```
