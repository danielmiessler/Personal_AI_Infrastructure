# DocumentRecent Workflow

**Purpose:** Catch-up documentation for changes since the last documented update. Finds the gap between the last PAISYSTEMUPDATES entry and current state, then generates documentation for everything that's missing.

**Triggers:** "document recent", "catch up docs", "what's undocumented", "document since last update"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running catch-up documentation"}' \
  > /dev/null 2>&1 &
```

Running the **DocumentRecent** workflow from the **System** skill...

---

## When to Use

- Periodic maintenance (e.g., weekly catch-up)
- Before releases to ensure all changes are documented
- When sessions ended without proper documentation
- After returning from a break

---

## Execution

### Step 1: Find Last Documented Update

```bash
# Get the most recent update timestamp from index
cat ~/.claude/MEMORY/PAISYSTEMUPDATES/index.json | jq '.updates[0].timestamp'
```

Or parse from the most recent file:
```bash
ls -t ~/.claude/MEMORY/PAISYSTEMUPDATES/*/\*/*.md | head -1
```

### Step 2: Find Changes Since Then

```bash
# Get git log since last documented update
git log --since="TIMESTAMP" --oneline

# Get actual file changes
git diff COMMIT_AT_LAST_UPDATE..HEAD --stat
```

### Step 3: Categorize Undocumented Changes

Group changes by type:
- Skills modified
- Workflows modified
- Hooks modified
- Tools modified
- Configuration changes
- Documentation changes

### Step 4: Generate Documentation for Each Group

For each significant group of changes, create a documentation entry:

```bash
echo '{
  "title": "Catch-up: [Area] Updates Since [Date]",
  "significance": "moderate",
  "change_type": "multi_area",
  "files": ["file1", "file2", ...],
  "purpose": "Documenting changes that occurred between [last_date] and [today]",
  "expected_improvement": "System documentation is now current",
  "verbose_narrative": {
    "story_background": "Several changes were made that were not immediately documented.",
    "story_problem": "Documentation fell behind actual system state.",
    "story_resolution": "This catch-up entry documents all changes since [last_date].",
    "how_it_was": "[Previous state]",
    "how_it_was_bullets": ["..."],
    "how_it_is": "[Current state]",
    "how_it_is_bullets": ["..."],
    "future_impact": "Documentation is now current.",
    "confidence": "medium"
  }
}' | bun ~/.claude/skills/System/Tools/CreateUpdate.ts --stdin
```

### Step 5: Multiple Entries for Large Gaps

If the gap includes multiple significant changes:
- Create separate entries for each major change
- Use logical groupings (all hook changes together, etc.)
- Maintain chronological order where possible

### Step 6: Git Push

After all catch-up documentation is created:

```
DocumentRecent (this) → GitPush
```

---

## Gap Analysis Logic

```
1. last_update_timestamp = PAISYSTEMUPDATES/index.json[0].timestamp
2. commits_since = git log --since=last_update_timestamp
3. files_changed = git diff <commit_at_last_update>..HEAD --name-only
4. categorize_changes(files_changed)
5. for each category with significant changes:
     generate_documentation_entry()
6. push_to_kai()
```

---

## What Counts as "Significant"

Document if ANY of these apply:
- New files created in skills/, hooks/, tools/
- Modifications to SKILL.md files
- Changes to settings.json
- Workflow modifications
- Hook modifications
- Architectural decisions

Skip documentation for:
- MEMORY/ changes (these are output, not source)
- Temporary files
- Auto-generated indexes

---

## Output

| Output | Location |
|--------|----------|
| Catch-up Entries | `MEMORY/PAISYSTEMUPDATES/YYYY/MM/*.md` |
| Updated Index | `MEMORY/PAISYSTEMUPDATES/index.json` |

---

## Related Workflows

- `DocumentSession.md` - For current session documentation
- `GitPush.md` - Always follows this
- `IntegrityCheck.md` - Consider running after catch-up
