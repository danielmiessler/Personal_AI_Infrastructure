# DocumentSession Workflow

**Purpose:** Document the current session's work by analyzing the session transcript. Creates a verbose narrative entry in MEMORY/PAISYSTEMUPDATES/ capturing what was done and why.

**Triggers:** "document session", "document today", "document this session", "log session", "document what we did"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Documenting current session"}' \
  > /dev/null 2>&1 &
```

Running the **DocumentSession** workflow from the **System** skill...

---

## When to Use

- End of significant work sessions
- After creating new skills/workflows/tools
- When architectural decisions are made
- After IntegrityCheck if fixes were made

---

## Execution

### Step 1: Gather Context

Review the current session to identify:
- **Files changed** (from tool calls in transcript)
- **Purpose** (what problem was being solved)
- **Approach** (how it was solved)
- **Outcome** (what's different now)

### Step 2: Analyze Session Transcript

Use AI inference to extract the narrative:

```bash
# The session context is already available in memory
# Extract key changes, decisions, and outcomes
```

**Key questions to answer:**
1. What was the problem or goal?
2. What was the previous state?
3. What is the new state?
4. What are the implications going forward?

### Step 3: Generate Documentation

Create the update entry using CreateUpdate.ts:

```bash
echo '{
  "title": "Your 4-8 Word Title Here",
  "significance": "moderate",
  "change_type": "skill_update",
  "files": ["path/to/changed/file1", "path/to/changed/file2"],
  "purpose": "Why this change was made",
  "expected_improvement": "What should be better now",
  "verbose_narrative": {
    "story_background": "Context and situation before this change.",
    "story_problem": "What was broken, limited, or needed improvement.",
    "story_resolution": "How we addressed it and the approach taken.",
    "how_it_was": "Previously, the system worked this way...",
    "how_it_was_bullets": ["Previous characteristic 1", "Previous characteristic 2"],
    "how_it_is": "The system now works this way...",
    "how_it_is_bullets": ["Improvement 1", "Improvement 2"],
    "future_impact": "Going forward, this means...",
    "future_bullets": ["Future implication 1", "Future implication 2"],
    "verification_steps": ["How we verified the change works"],
    "confidence": "high"
  }
}' | bun ~/.claude/skills/System/Tools/CreateUpdate.ts --stdin
```

### Step 4: Significance Levels

| Level | When to Use |
|-------|-------------|
| **critical** | Breaking changes, major restructuring |
| **major** | New skills/workflows, architectural decisions |
| **moderate** | Multi-file updates, feature enhancements |
| **minor** | Single file updates, small fixes |
| **trivial** | Documentation typos, minor cleanups |

### Step 5: Change Types

| Type | Description |
|------|-------------|
| `skill_update` | Skill definition or behavior changes |
| `structure_change` | Architectural/structural modifications |
| `doc_update` | Documentation changes |
| `hook_update` | Lifecycle hook modifications |
| `workflow_update` | Workflow routing changes |
| `config_update` | Configuration changes |
| `tool_update` | Tool/utility modifications |
| `multi_area` | Changes spanning 3+ categories |

### Step 6: Git Push

After documentation is created, automatically invoke GitPush:

```
DocumentSession (this) → GitPush
```

---

## Documentation Format

**Verbose Narrative Structure:**
- **The Story** (1-3 paragraphs): Background, Problem, Resolution
- **How It Used To Work**: Previous state with bullet points
- **How It Works Now**: New state with improvements
- **Going Forward**: Future implications
- **Verification**: How we know it works

---

## Output Locations

| Output | Location |
|--------|----------|
| Update Entry | `MEMORY/PAISYSTEMUPDATES/YYYY/MM/*.md` |
| Index | `MEMORY/PAISYSTEMUPDATES/index.json` |
| Changelog | `MEMORY/PAISYSTEMUPDATES/CHANGELOG.md` |

---

## Related Workflows

- `IntegrityCheck.md` - Often precedes this
- `DocumentRecent.md` - For catch-up documentation
- `GitPush.md` - Always follows this
