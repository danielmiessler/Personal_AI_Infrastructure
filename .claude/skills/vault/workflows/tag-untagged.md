# Tag Untagged Notes Workflow

**Purpose:** AI-assisted tagging of notes without proper tags.

## Trigger Phrases
- "tag untagged notes"
- "suggest tags for notes"
- "organize my notes"
- "clean up vault tags"

## Workflow Steps

### 1. Find Untagged Notes
```bash
obs search --untagged --recent 20
```

Returns notes without tags or with only minimal tags (e.g., just `incoming`).

### 2. For Each Note, Analyze Content
```bash
obs read "note-name"
```

### 3. Generate Tag Suggestions
Use LLM to suggest appropriate tags based on content:

**Prompt template:**
```
Based on this note content, suggest appropriate tags from the taxonomy:

Projects: #projects/pai, #projects/...
Types: #type/voice-memo, #type/research, #type/meeting, #type/idea, #type/design
Source: #source/telegram, #source/manual, #source/fabric
Status: #status/raw, #status/processed, #status/reviewed

Content:
---
{note_content}
---

Suggest 2-5 relevant tags, prioritizing project and type tags.
```

### 4. Present Suggestions
Show suggestions for user approval:

```
Note: 2024-11-28-Kubernetes-Deployment-Notes.md
Current tags: (none)
Suggested tags:
  - #projects/infrastructure
  - #type/research
  - #status/raw

[a]ccept / [e]dit / [s]kip / [q]uit?
```

### 5. Apply Tags
For approved suggestions:
```bash
obs tag add "note-name" "projects/infrastructure" "type/research" "status/raw"
```

## Batch Processing

For multiple notes:
```bash
obs search --untagged --recent 50 | while read note; do
  obs tag suggest "$note" --interactive
done
```

## Tag Taxonomy Reference

### Project Tags
- `#projects/pai` - Personal AI Infrastructure
- `#projects/work` - Work-related
- `#projects/personal` - Personal projects

### Type Tags
- `#type/voice-memo` - Transcribed voice memos
- `#type/research` - Research and learning
- `#type/meeting` - Meeting notes
- `#type/idea` - Ideas and brainstorms
- `#type/design` - Design decisions
- `#type/reference` - Reference material

### Source Tags
- `#source/telegram` - Ingested via Telegram
- `#source/manual` - Manually created
- `#source/fabric` - Processed by fabric
- `#source/daily-note` - Extracted from daily notes

### Status Tags
- `#status/raw` - Unprocessed
- `#status/processed` - AI-processed
- `#status/reviewed` - Manually reviewed
- `#status/archived` - No longer active

## Notes

- Prioritize project and type tags
- Don't over-tag - 3-5 tags is usually sufficient
- Use hierarchical tags where appropriate (e.g., `#projects/pai/context`)
- Consider content age when suggesting status tags
