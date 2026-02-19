# Recovery Workflow

Resume an interrupted Council session or rerun with partial prior results.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Recovery workflow in the Council skill to resume interrupted session"}' \
  > /dev/null 2>&1 &
```

Running the **Recovery** workflow in the **Council** skill to resume interrupted session...

## When to Use

- Session was interrupted by rate limit, timeout, or context compaction
- Partial round outputs were saved before interruption
- You want to continue without re-running completed work

## Prerequisites

- Session ID or session directory path
- Prior round outputs (partial or complete)
- Knowledge of which agents completed / which didn't

## Recovery Modes

### Full Rerun

Re-run all agents for all remaining rounds. Ignores prior partial outputs.

**Use when:**
- Only 1-2 agents completed before interruption
- Significant time has passed (context may have drifted)
- User explicitly prefers fresh run

**Invoke:** `"Council recovery (full rerun): {topic}"`

### Partial Rerun

Keep completed agent outputs, only rerun missing agents.

**Use when:**
- 3+ agents completed Round 1
- Interruption happened mid-round
- Time-sensitive and want to preserve progress

**Invoke:** `"Council recovery (partial): Resume session {session-id}"`

## Execution

### Step 1: Load Session State

**Session ID validation:** Before using a session ID in file paths, validate it matches the expected format `YYYYMMDD-HHMMSS-[hex]` (e.g., `20260202-235539-a1b2c3d4`). Reject IDs containing path traversal characters (`/`, `\`, `..`).

Read the session directory:
```
~/.claude/MEMORY/STATE/council-sessions/{session-id}/
├── metadata.json     # Topic, members, timing
├── round-1.md        # Partial or complete
├── round-2.md        # Partial or complete (if exists)
└── round-3.md        # (if exists)
```

Parse `metadata.json` to determine:
- Which round was interrupted
- Which agents completed that round
- Which agents need to be re-run

### Step 2: Announce Recovery

```markdown
## Council Recovery: [Topic]

**Session ID:** {session-id}
**Mode:** [Full Rerun | Partial Rerun]
**Prior Progress:**
- Round 1: [Complete | Partial - {N}/4 agents]
- Round 2: [Complete | Partial | Not started]
- Round 3: [Complete | Partial | Not started]

**Recovery Plan:**
- [List of agents to rerun]
- [Rounds to complete]
```

### Step 3a: Full Rerun

If full rerun mode:

1. Archive prior session state to `~/.claude/MEMORY/RESEARCH/` with `_INTERRUPTED` suffix
2. Start fresh session with new session ID
3. Follow standard Debate workflow from Round 1

### Step 3b: Partial Rerun

If partial rerun mode:

1. Load completed agent outputs from prior round
2. Launch only the missing agents with this context:

```
You are [Agent Name], [brief role description].

COUNCIL RECOVERY - ROUND {N}: [PHASE NAME]

Topic: [The topic being debated]

Context: This is a recovery from an interrupted session. The following agents already completed Round {N}:

[Prior agent outputs from this round]

Your task:
- Provide your Round {N} response
- You may reference the prior agents' points
- Stay consistent with the established discussion
- [Standard round instructions]
```

3. Merge recovered outputs with new outputs
4. Continue to next round

### Step 4: Resume Normal Flow

After recovery round completes:
- Update session state files
- Continue with next round (or synthesis if Round 3 complete)
- Follow standard Debate workflow steps

### Step 5: Mark Recovery Complete

After synthesis:
```markdown
**Recovery Complete:** Session resumed from Round {N}. Full transcript archived.
```

Archive final output to:
```
~/.claude/MEMORY/RESEARCH/YYYY-MM/YYYY-MM-DD-HHMMSS_COUNCIL_{topic-slug}_RECOVERED.md
```

## Diff-Only Mode (Partial Rerun Optimization)

For partial reruns where 3+ agents completed, instruct recovered agents:

```
You are joining a council session in progress. The following perspectives have already been shared:

[Prior agent outputs]

Your task is to add NET-NEW insights only:
- Do not repeat points already made
- Focus on what the prior agents missed
- State your unique perspective
- If you agree with prior points, briefly acknowledge and move on
```

This reduces token usage while preserving the intellectual friction value.

## Error Handling

| Scenario | Action |
|----------|--------|
| Session directory not found | Ask user for session ID or start fresh |
| metadata.json corrupted | Start fresh, note what was lost |
| Round files missing | Treat as partial, rerun missing rounds |
| All agents completed but synthesis missing | Skip to synthesis step |

---

**Last Updated:** 2026-02-18
