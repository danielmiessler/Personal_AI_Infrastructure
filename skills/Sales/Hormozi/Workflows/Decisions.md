# Project Decisions Query

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Decisions workflow in the Hormozi skill to list decisions"}' \
  > /dev/null 2>&1 &
```

Running the **Decisions** workflow in the **Hormozi** skill to list decisions...

**Purpose:** List architecture and technical decisions for a specific project from PAI memory system.

**Usage:** `/project-decisions [project-name]`

**Example:** `/project-decisions dashboard` or `/project-decisions website`

---

## What This Command Does

Queries the PAI decisions system to show all architectural and technical decisions made for a project:

1. **Find Project Decisions**
   - Query `~/.claude/History/decisions/` for project-specific files
   - List all decisions chronologically

2. **Summarize Each Decision**
   - Extract decision title and date
   - Show key reasoning
   - Display outcome/impact

3. **Show Patterns**
   - Identify recurring decision themes
   - Highlight constitutional principles applied
   - Link related decisions

---

## Implementation Instructions

When this command is run:

1. **Extract project name from arguments**
   - If no argument, ask user to specify project
   - Can also work without argument to show all recent decisions

2. **Query decisions directory**
   ```bash
   # For specific project
   find ~/.claude/History/decisions/ -name "*_${PROJECT}_*" | sort -r

   # For all projects (if no project specified)
   find ~/.claude/History/decisions/ -name "*.md" | sort -r | head -20
   ```

3. **Read and summarize each decision file**
   - Extract key information:
     - Date (from filename)
     - Decision title
     - Context/problem
     - Decision made
     - Reasoning
     - Outcome

4. **Format output**
   Present in structured format:

   ```
   # Architecture Decisions: [PROJECT NAME]

   ## Timeline

   ### [Date] - [Decision Title]
   **Context:** [Problem that needed decision]
   **Decision:** [What was decided]
   **Reasoning:** [Why this was chosen]
   **Impact:** [Outcome/consequences]
   **File:** [Link to full decision file]

   ---

   ## Decision Patterns

   **Constitutional Principles Applied:**
   - [Principle]: Used in [N] decisions

   **Common Decision Types:**
   - Tech stack choices: [N]
   - Architecture patterns: [N]
   - Tool selections: [N]

   **Related Resources:**
   - Constitution: `.sdd/memory/constitution.md`
   - Global patterns: `~/.claude/skills/development/`
   ```

5. **If no results found**
   ```
   No decisions found for project "[PROJECT]".

   Decisions are automatically captured when:
   - Creating project constitution (/sdd-constitution)
   - Making architecture choices during planning
   - Solving complex problems requiring trade-offs
   ```

---

## Advanced Usage

**Filter by decision type:**
```bash
/project-decisions dashboard --type=tech-stack
/project-decisions dashboard --type=architecture
```

**Show decision evolution:**
```bash
/project-decisions dashboard --evolution
# Shows how decisions evolved over time
```

**Compare decisions across projects:**
```bash
/project-decisions --compare dashboard,website
# Shows similar decisions made differently
```

---

## Notes

- **Read-only query** - does not create or modify files
- Decisions captured automatically via PAI hooks
- Complements constitution (principles) with history (applications)
- Useful for understanding project evolution
- Helps avoid repeating past mistakes
- Shows decision-making patterns over time
