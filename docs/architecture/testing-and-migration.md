# Testing and Migration Strategy

**Document Type:** Testing & Migration Plan
**Version:** 1.0.0
**Date:** 2024-12-01

---

## Testing Strategy

### Test Environment

Create a test vault separate from production:

```bash
# Test vault location
TEST_VAULT=~/Documents/andreas_brain_test

# Create test vault structure
mkdir -p $TEST_VAULT/_meta
mkdir -p $TEST_VAULT/attachments

# Copy sample notes for testing (not entire vault)
cp ~/Documents/andreas_brain/2024-06-10*.md $TEST_VAULT/
cp ~/Documents/andreas_brain/2024-06-11*.md $TEST_VAULT/
cp ~/Documents/andreas_brain/2025-11-27.md $TEST_VAULT/
```

### Test Configuration

```bash
# Test environment variables
export OBSIDIAN_VAULT_PATH=$TEST_VAULT
export CONTEXT_EMBEDDINGS_DB=$TEST_VAULT/_meta/embeddings.db
```

---

## Skills Test Cases

### Context Skill Tests

#### TC-CTX-001: Load Project Context
```bash
# Setup: Ensure notes with project/eea24 tag exist
obs search --tag "project/eea24"

# Expected: Returns list of EEA24-related notes
# Verify: At least 5 notes returned
```

#### TC-CTX-002: Semantic Search
```bash
# Prerequisite: Build embeddings
obs embed

# Test query
obs semantic "data analytics meeting with Rob"

# Expected: Returns notes related to data analytics meetings
# Verify: Meeting notes with rob_meadows appear in top results
```

#### TC-CTX-003: Tag Search
```bash
# Search by person tag
obs search --tag "ed_overy"

# Expected: All Ed Overy-related notes
# Verify: Count matches grep -l "ed_overy" vault/*.md
```

#### TC-CTX-004: Combined Search
```bash
# Multiple tags
obs search --tag "meeting-notes" --tag "ed_overy"

# Expected: Only meeting notes with Ed Overy
```

### Vault Skill Tests

#### TC-VLT-001: Process Daily Note Scratchpad
```bash
# Input: Daily note with unprocessed scratchpad
# 2025-11-27.md with URLs, ideas, newsletter items

# Execute
vault process-daily-notes --date 2025-11-27 --dry-run

# Expected output:
# - Identifies 5+ extractable items
# - Shows proposed tags for each
# - Shows proposed file names
```

#### TC-VLT-002: Tag Suggestions
```bash
# Find untagged notes
obs search --untagged

# Get suggestions for one
obs tag suggest "2024-06-11-Test Voice Memo Recording Options - Wisdom"

# Expected: Suggests relevant tags based on content
```

#### TC-VLT-003: Refactor Large Note
```bash
# Find a large note
obs search --min-lines 200

# Analyze structure
obs refactor analyze "large-note-name"

# Expected: Shows section breakdown and split recommendations
```

### Ingestion Pipeline Tests

#### TC-ING-001: Voice Memo Processing
```bash
# Test with sample audio file
ingest process-file ~/test-audio.m4a --dry-run

# Expected output:
# - Transcription preview
# - Suggested title
# - Suggested tags
# - Output path
```

#### TC-ING-002: URL Processing
```bash
# Test with sample URL
ingest process-url "https://example.com/article" --dry-run

# Expected:
# - Fetched content preview
# - Summary
# - Suggested tags
# - Output path
```

#### TC-ING-003: Newsletter Item Processing
```bash
# Test with newsletter-style content
echo "**MIT AI Study (3 min read)** https://..." | ingest process-text --dry-run

# Expected:
# - Classified as: interesting-reads
# - Tags: genai, ai, incoming
```

#### TC-ING-004: People Detection
```bash
# Test content with names
echo "Meeting with Ed Overy and Paige Bradley about LV data" | ingest process-text --dry-run

# Expected tags include: ed_overy, paige_bradley, lv-data
```

#### TC-ING-005: Telegram Integration (E2E)
```bash
# Prerequisites: Telegram bot configured
ingest poll --dry-run

# Expected: Lists pending messages without processing
```

---

## Migration Strategy

### Option A: Fresh Vault with Full Migration

Create a new vault and migrate all content through the new pipeline.

**Pros:**
- Clean slate, consistent formatting
- All notes processed with current pipeline
- No legacy inconsistencies

**Cons:**
- Time-consuming
- Risk of losing manual edits
- Links may break

#### Migration Steps

```bash
# 1. Create new vault
NEW_VAULT=~/Documents/brain_v2
mkdir -p $NEW_VAULT/_meta

# 2. Export existing notes for reprocessing
# Skip daily notes (will be processed differently)
find ~/Documents/andreas_brain -name "*.md" \
  ! -name "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].md" \
  > notes_to_migrate.txt

# 3. Categorize by type
grep -l "transcript" ~/Documents/andreas_brain/*.md > transcripts.txt
grep -l "Wisdom" ~/Documents/andreas_brain/*.md > wisdom_notes.txt
grep -l "meeting-notes" ~/Documents/andreas_brain/*.md > meetings.txt

# 4. Process each category through pipeline
# (Run in batches to verify)
```

### Option B: In-Place Enhancement

Enhance existing vault without moving notes.

**Pros:**
- Less risky
- Preserves all manual edits
- Incremental approach

**Cons:**
- Inconsistent formatting remains
- Harder to clean up legacy issues

#### Enhancement Steps

```bash
# 1. Build embeddings on existing vault
obs embed

# 2. Fix untagged notes
obs search --untagged | head -20 > untagged_batch1.txt
# Process batch, repeat

# 3. Normalize tags
# Find non-standard tags
grep -rh "^  - " ~/Documents/andreas_brain/*.md | sort | uniq -c | sort -rn

# 4. Process remaining scratchpad items
vault process-daily-notes --all --dry-run
```

### Option C: Parallel Vault (Recommended)

Run new vault alongside old, gradually migrate.

**Pros:**
- No risk to existing data
- Can compare systems
- Switch when ready

**Cons:**
- Duplicate storage temporarily
- Need to decide cutover date

#### Implementation

```bash
# 1. Create new vault
NEW_VAULT=~/Documents/brain_v2
mkdir -p $NEW_VAULT/_meta

# 2. Point Telegram ingestion to new vault
export OBSIDIAN_VAULT_PATH=$NEW_VAULT

# 3. New content goes to new vault via Telegram
# Old content stays in old vault

# 4. Gradually migrate old content
# Priority order:
#   a. Recent notes (last 6 months)
#   b. Project-tagged notes
#   c. Meeting notes with active contacts
#   d. Everything else

# 5. Cutover when satisfied
# Update OBSIDIAN_VAULT_PATH to new vault
# Archive old vault
```

---

## Migration Test Cases

### TC-MIG-001: Meeting Note Migration
```bash
# Source: Old meeting note with attendees in title
# 2024-06-10-LV Analytics Data Flow Meeting (Mick, Rob M, Paige, Andreas) MOM.md

# Migrate
migrate-note "$OLD_VAULT/2024-06-10-LV*.md" --to $NEW_VAULT --dry-run

# Expected:
# - Parses attendees from title → people tags
# - Preserves generation_date
# - Normalizes tags to current taxonomy
# - Maintains internal links
```

### TC-MIG-002: Wisdom/Raw Pair Migration
```bash
# Source: Pair of -Raw and -Wisdom notes
migrate-note "$OLD_VAULT/2024-06-11-*Wisdom.md" --with-raw --dry-run

# Expected:
# - Links Raw and Wisdom versions
# - Preserves relationship
# - Adds source-file reference
```

### TC-MIG-003: Daily Note Migration
```bash
# Source: Daily note with scratchpad
migrate-daily-note "$OLD_VAULT/2025-11-27.md" --dry-run

# Expected:
# - Extracts scratchpad items
# - Creates individual notes per item
# - Replaces scratchpad with links
# - Preserves tasks section
```

### TC-MIG-004: Tag Normalization
```bash
# Find non-standard tags
migrate-analyze-tags $OLD_VAULT

# Expected output:
# Standard tags: 85%
# Non-standard tags to normalize:
#   - "meeting_minutes" → "meeting-notes" (15 notes)
#   - "genAI" → "genai" (3 notes)
```

### TC-MIG-005: Link Preservation
```bash
# Check internal links before/after
migrate-verify-links $OLD_VAULT $NEW_VAULT

# Expected:
# - All [[links]] still resolve
# - Backlinks intact
# - No broken references
```

---

## Test Data

### Sample Daily Note (for testing)
```markdown
---
tags:
  - incoming
---
# Scratchpad

https://x.com/DanielMiessler/status/12345

Test idea about PAI context system

Book recommendation: Deep Work by Cal Newport

**Newsletter Item (5 min read)** [Link](https://example.com)
Summary of the article content here.
```

### Sample Voice Memo (for testing)
Use existing: `~/Documents/andreas_brain/2024-06-11-Test Voice Memo Recording Options - Wisdom.md`

### Sample Meeting Note (for testing)
Use existing: `~/Documents/andreas_brain/2024-06-10-LV Analytics Data Flow Meeting (Mick, Rob M, Paige, Andreas) MOM-1.md`

---

## Acceptance Criteria

### Skills Ready
- [ ] `obs search` works with tag and text queries
- [ ] `obs semantic` returns relevant results
- [ ] `obs read/write` preserves frontmatter
- [ ] `obs embed` builds index without errors

### Ingestion Ready
- [ ] Voice memos transcribe and tag correctly
- [ ] URLs fetch, summarize, and tag correctly
- [ ] People detection works for known contacts
- [ ] Telegram polling works (if configured)

### Migration Ready
- [ ] Meeting notes preserve attendee info
- [ ] Wisdom/Raw pairs stay linked
- [ ] Daily note scratchpads extract correctly
- [ ] All internal links preserved
- [ ] Tag taxonomy normalized

---

## Rollback Plan

If migration fails:

1. Old vault remains untouched (Option C)
2. Can delete new vault and restart
3. Keep backup of old vault before any in-place changes
4. Test with small batch before full migration

```bash
# Backup before any migration
cp -r ~/Documents/andreas_brain ~/Documents/andreas_brain_backup_$(date +%Y%m%d)
```
