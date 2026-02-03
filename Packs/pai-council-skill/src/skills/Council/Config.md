# Council Configuration

Default configuration for Council debates. These values can be overridden per-session by specifying config inline with the council request.

## Debate Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `rounds` | 2-3 (adaptive) | Round 3 runs only if convergence is low after Round 2 |
| `agents` | 4 | Default: Architect, Designer, Engineer, Researcher |
| `output_mode` | `deliberative` | Options: `deliberative` (conversational), `patchlist` (structured changes) |
| `file_output` | `true` | Write each round to `~/.claude/MEMORY/` |

## Model Tiering

| Phase | Model | Rationale |
|-------|-------|-----------|
| Round 1 | sonnet | Initial positions need nuance |
| Round 2 | haiku | Responses are shorter, more constrained |
| Round 3 | sonnet | Synthesis needs quality |
| Final Synthesis | sonnet | Orchestrator synthesis |

To use a specific model, add `model: "haiku"` or `model: "sonnet"` to the Task call.

## Adaptive Round 3

Round 3 is **conditional**. After Round 2, the orchestrator evaluates:

**Run Round 3 if ANY of these are true:**
1. Agents express explicit disagreement in Round 2
2. Round 2 responses identify BLOCKING issues
3. The topic involves security, compliance, or irreversible decisions
4. User explicitly requested 3 rounds

**Skip Round 3 if ALL of these are true:**
1. High convergence detected (3+ agents agree on core recommendation)
2. No BLOCKING items identified
3. No unresolved contradictions
4. Topic is exploratory, not normative

When skipping Round 3, output:
```markdown
**Round 3 skipped:** High convergence detected. Proceeding to synthesis.
```

## Output Modes

### Deliberative (default)
Conversational format for architectural debates, design decisions, exploratory discussions.

```markdown
### Round N: [Phase Name]

**🏛️ Architect (Serena):**
[Prose response, 50-150 words]
```

### Patchlist
Structured format for TaskSpec reviews, document improvements, code changes.

```markdown
### Round N: [Phase Name]

**🏛️ Architect (Serena):**

**BLOCKING:**
- B1: [issue] → [proposed change] | Affects: [specs]

**HIGH:**
- H1: [issue] → [proposed change]

**MEDIUM/LOW:**
- M1: [issue]
```

To invoke patchlist mode: `"Council (patchlist): Review these TaskSpecs..."`

## File Output Location

When `file_output` is enabled (default), rounds are written to:

```
~/.claude/MEMORY/STATE/council-sessions/{session-id}/
├── metadata.json       # Topic, members, timing, config
├── round-1.md          # All Round 1 responses
├── round-2.md          # All Round 2 responses
├── round-3.md          # Round 3 (if run)
└── convergence.json    # Convergence assessment after Round 2
```

After synthesis, the final output is archived to:
```
~/.claude/MEMORY/RESEARCH/YYYY-MM/
└── YYYY-MM-DD-HHMMSS_COUNCIL_{topic-slug}.md
```

This enables:
- **Recovery** from interrupted sessions (partial round data preserved)
- **Cross-session context** (prior council findings available)
- **Resistance to context compaction** (durable external state)

## Scope Limits

To prevent token explosion and rate-limit issues:

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max items per council | 5 | TaskSpecs, documents, or topics |
| Max agents | 7 | Diminishing returns beyond this |
| Max words per response | 150 | Prevents verbose agents |

For larger reviews, run multiple councils with a shared context preamble.

## Recovery Mode

If a council session is interrupted (rate limit, timeout, crash), use the Recovery workflow:

```
"Council recovery: Resume session {session-id}"
```

See `Workflows/Recovery.md` for details.

---

**Last Updated:** 2026-02-02
