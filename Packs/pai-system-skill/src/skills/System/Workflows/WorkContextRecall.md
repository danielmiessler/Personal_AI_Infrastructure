# WorkContextRecall Workflow

**Purpose:** When Daniel asks about past work ("we just worked on that", "what did we do with X", "remember when we fixed Y"), this workflow searches across all memory locations to reconstruct context and provide comprehensive recall.

**Triggers:**
- "we just worked on that"
- "what did we do with"
- "remember when we"
- "we fixed this before"
- "didn't we already"
- "what happened with"
- "why did we change"
- "when did we work on"
- Any question referencing past sessions or previous work

---

## When to Use

- Daniel expresses frustration about something previously worked on
- Questions about why a decision was made
- Trying to find artifacts from a past session
- Resuming work that was done across multiple sessions
- Debugging something that was "already fixed"

---

## Execution

### Step 1: Extract Search Keywords

Parse Daniel's question to identify:
- **Topic keywords**: The thing being asked about (feature name, file, bug, concept)
- **Time references**: "yesterday", "last week", "a few sessions ago"
- **Action references**: "fixed", "implemented", "changed", "broke"

Example:
```
"Hey, we just worked on the status line - why is it broken again?"
→ Keywords: status line, statusline, status-line
→ Time: recent (within last few sessions)
→ Action: fixed/worked on
```

### Step 2: Search All Memory Locations

Search these locations IN PARALLEL using Intern agents:

| Location | What to Search For | Example Command |
|----------|-------------------|-----------------|
| **MEMORY/WORK/** | Directory names, META.yaml files | `ls ~/.claude/MEMORY/WORK/ \| grep -i [keyword]` |
| **MEMORY/STATE/progress/** | Active multi-session projects | `cat ~/.claude/MEMORY/STATE/progress/*.json \| grep -i [keyword]` |
| **MEMORY/LEARNING/** | Related learnings and patterns | `grep -r [keyword] ~/.claude/MEMORY/LEARNING/` |
| **MEMORY/RESEARCH/** | Agent output captures | `grep -r [keyword] ~/.claude/MEMORY/RESEARCH/` |
| **projects/-Users-{username}--claude/** | Session transcripts (last 30 days) | `grep -l [keyword] ~/.claude/projects/-Users-{username}--claude/*.jsonl` |
| **Plans/** | Planning documents | `grep -r [keyword] ~/.claude/Plans/` |
| **WORK/** | Root work scratch files | `ls ~/.claude/WORK/` |

### Step 3: Prioritize Results by Recency

For each matching artifact, extract:
- **Timestamp** (from filename or file modification time)
- **Type** (work session, learning, research, transcript, plan)
- **Relevance snippet** (the matching context)

Sort by recency - most recent first.

### Step 4: Deep Read Top Results

For the top 3-5 most relevant matches:
1. Read the full file/artifact
2. Extract key context:
   - What was being done
   - What decisions were made
   - What was the outcome
   - Any open issues or TODOs

### Step 5: Synthesize Response

Present findings in this format:

```markdown
## Work Context Recall: [Topic]

### Recent Activity (Most Recent First)

#### [Date] - [Session/Work Type]
**Location:** `path/to/artifact`
**Summary:** [What was done]
**Decisions:** [Key choices made]
**Outcome:** [Result or current state]
**Relevant Quote:** > [Direct quote from the artifact]

[Repeat for each relevant finding...]

### Active Projects (if any)
- **[Project Name]**: [Current status from progress file]

### Related Learnings
- [Any relevant entries from LEARNING/]

### Possible Issues
- [If the question implies something is broken, note what might have gone wrong]

### Suggested Actions
- [Based on the context, what should be done next]
```

### Step 6: Offer Deep Dive

After presenting the synthesis:
- Offer to read specific artifacts in full
- Offer to search session transcripts for specific conversations
- Offer to check git history if code changes are involved

---

## Search Techniques

### For Work Directories
```bash
# Find work directories matching keyword
ls -lt ~/.claude/MEMORY/WORK/ | grep -i "[keyword]"

# Read META.yaml for context
cat ~/.claude/MEMORY/WORK/*/META.yaml | grep -A5 -B5 "[keyword]"
```

### For Session Transcripts
```bash
# Find sessions mentioning the topic (recent first)
# Replace {username} with your system username
ls -t ~/.claude/projects/-Users-{username}--claude/*.jsonl | head -20 | xargs -I{} sh -c 'grep -l "[keyword]" "{}" 2>/dev/null && echo {}'

# Read matching session content (use jq for parsing)
jq -r '.content // .text' session.jsonl | grep -i "[keyword]" -B2 -A2
```

### For Multi-Session Projects
```bash
# Check active progress tracking
cat ~/.claude/MEMORY/STATE/progress/*.json | jq '.name, .objectives, .lastHandoff'
```

### For Git History (if relevant)
```bash
# Find commits related to topic
git log --oneline --all --grep="[keyword]" | head -10

# Find files changed related to topic
git log --name-only --oneline | grep -i "[keyword]"
```

---

## Example Scenarios

### Scenario 1: "Why is the status line broken again?"

1. Search `MEMORY/WORK/` for "status" - find recent work directories
2. Search `projects/` for recent sessions with "statusline"
3. Check git log for statusline commits
4. Present: what was changed, when, by which session
5. Identify: what might have regressed

### Scenario 2: "Didn't we fix that auth bug already?"

1. Search `MEMORY/WORK/` for "auth" directories
2. Search `MEMORY/LEARNING/` for auth-related learnings
3. Check `Plans/` for auth architecture decisions
4. Present: previous fixes, why they were made
5. Compare: current state vs. what was fixed

### Scenario 3: "What did we decide about the security hooks?"

1. Search `MEMORY/STATE/progress/` - find security-redesign-progress.json
2. Read the progress file for current state
3. Search `Plans/` for security architecture documents
4. Search session transcripts for "security hook" discussions
5. Present: timeline of decisions, current direction

---

## Notes

- Always search multiple locations - artifacts may be fragmented
- Recency matters - prioritize recent over old
- Context matters - include WHY decisions were made, not just WHAT
- If Daniel is frustrated, acknowledge it and focus on actionable context
- Offer to create a learning entry if we discover a recurring issue

---

## Related Workflows

- `DocumentChanges.md` - Create new documentation from findings
- `PrivateSystemAudit.md` - If recall suggests system issues
