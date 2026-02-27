# Project Context Query

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Context workflow in the Hormozi skill to query project context"}' \
  > /dev/null 2>&1 &
```

Running the **Context** workflow in the **Hormozi** skill to query project context...

**Purpose:** Dynamically generate a comprehensive context overview for a specific project by querying the PAI memory system.

**Usage:** `/project-context [project-name]`

**Example:** `/project-context dashboard` or `/project-context website`

---

## What This Command Does

Searches across the PAI memory system and project files to provide a complete snapshot:

1. **Project Governance**
   - Read `.sdd/memory/constitution.md` if exists
   - Show project principles and constraints

2. **Recent Work**
   - Last 5 sessions from `~/.claude/History/sessions/*_[PROJECT]_*`
   - Recent features from `~/.claude/History/execution/features/*_[PROJECT]_*`

3. **Key Learnings**
   - Recent learnings from `~/.claude/History/learnings/*_[PROJECT]_*`
   - Problem-solving narratives specific to this project

4. **Architecture Decisions**
   - Recent decisions from `~/.claude/History/decisions/*_[PROJECT]_*`
   - Why we chose specific approaches

5. **Active Planning**
   - List active specs from `.sdd/specs/` if exists
   - Show current work in progress

---

## Implementation Instructions

When this command is run:

1. **Extract project name from arguments**
   - If no argument, ask user to specify project

2. **Check for .sdd/ directory**
   ```bash
   ls -la .sdd/memory/constitution.md 2>/dev/null
   ```
   - If exists, read and display constitution

3. **Query history for project**
   ```bash
   # Get recent sessions (last 5)
   find ~/.claude/History/sessions/ -name "*_${PROJECT}_*" | sort -r | head -5

   # Get recent features
   find ~/.claude/History/execution/features/ -name "*_${PROJECT}_*" | sort -r | head -10

   # Get recent learnings
   find ~/.claude/History/learnings/ -name "*_${PROJECT}_*" | sort -r | head -5

   # Get decisions
   find ~/.claude/History/decisions/ -name "*_${PROJECT}_*" | sort -r | head -5
   ```

4. **List active specs**
   ```bash
   ls -la .sdd/specs/ 2>/dev/null
   ```

5. **Format output**
   Present in structured format:

   ```
   # Project Context: [PROJECT NAME]

   ## Governance
   [Constitution summary if exists]

   ## Recent Work
   - [Date] [Session/Feature summary]

   ## Key Learnings
   - [Date] [Learning summary]

   ## Architecture Decisions
   - [Date] [Decision summary]

   ## Active Specs
   - [Spec number] [Spec name]
   ```

---

## Notes

- This is a **read-only query** - does not create or modify files
- Dynamically generated from existing PAI memory system
- No duplication of information
- Fast project context loading
