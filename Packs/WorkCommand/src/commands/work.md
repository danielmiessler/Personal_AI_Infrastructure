---
name: work
description: Search all prior work by topic to recall context and resume sessions. Use when wanting to find, recall, or continue previous work on any topic.
argument-hint: [topic]
---

# Work Recall

Search all prior work for: **$ARGUMENTS**

## Your Task

You are recalling prior work on the topic "$ARGUMENTS". Search across ALL available sources, synthesize what you find, and present an actionable summary so the user can immediately resume or start fresh work on this topic.

## Search Instructions

Execute these searches in parallel:

### 1. Session Registry (work.json)
Read `~/.claude/MEMORY/STATE/work.json` and find all sessions where the `task` field, slug key, or `sessionName` field matches "$ARGUMENTS" (case-insensitive, partial match). Extract: task, phase, progress, effort, started, criteria summary.

### 2. Work Directories
Search `~/.claude/MEMORY/WORK/` for matching directory names (case-insensitive, partial match). For each match, read the PRD.md frontmatter and `## Context` section to get the full picture.

### 3. Git History
Run: `git -C ~/.claude log --oneline --all --grep="$ARGUMENTS" -i -20` to find recent commits mentioning this topic.

### 4. Session Names
Read `~/.claude/MEMORY/STATE/session-names.json` and find entries where the session name matches "$ARGUMENTS" (case-insensitive, partial match).

### 5. Project Files
Search for "$ARGUMENTS" across PRD files in `~/.claude/MEMORY/WORK/` (limit to `**/PRD.md` glob) for deeper context matches beyond just directory names.

## Output Format

Present your findings as:

```
═══ WORK RECALL: $ARGUMENTS ══════════════════

📋 MATCHING SESSIONS (sorted by most recent first):

  For each match:
  • [session slug] — [task description]
    Phase: [phase] | Progress: [progress] | Effort: [effort]
    Started: [date] | Last updated: [date]
    Key context: [1-2 sentence summary from PRD Context section]
    Criteria status: [X passed / Y total]

🔗 RELATED COMMITS (last 20):
  • [commit hash] [message] ([date])

📂 WORK DIRECTORIES:
  • [list of matching directory names]

───────────────────────────────────────────────
```

## After Presenting Results

After showing the summary:

1. **If matches found:** Read the most recent matching PRD.md in full (the `## Context`, `## Criteria`, `## Decisions` sections). Then tell the user: "I've caught up on [topic]. The most recent session was [X]. Ready to continue — what would you like to work on?"

2. **If no matches found:** Tell the user: "No prior work found on [topic]. Ready to start fresh — what would you like to build?"

## Important

- Sort everything by recency (newest first)
- Read actual PRD files for the top 3 matches — don't just show metadata
- Be concise but thorough — the goal is to get the user back up to speed instantly
- If there are more than 10 matches, show the 10 most recent and mention the total count
