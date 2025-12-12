# Proposal: JIRA Skill for PAI

## Summary

Add a JIRA skill to PAI that enables Claude to interact with Jira Cloud/Server for issue management, following the deterministic-first architecture (CLI-first, Code Before Prompts).

## Rationale

**Why now?**
- Project management is a core workflow for PAI users
- Jira is the dominant issue tracker in enterprise
- Current options (mcp-atlassian) violate PAI principles: Python, MCP dependency, non-deterministic

**Why CLI-first?**
- PAI Principle #4: Code Before Prompts
- PAI Principle #8: CLI as Interface
- Enables scripting, testing, automation without AI
- Same input → Same output (Principle #3: Deterministic)

## Multi-Instance Architecture

**Use Case:** User manages multiple Jira instances:
- Personal instance (holistic workload management)
- Work instance (innovation projects)
- Potentially others (client projects, open source, etc.)

**Solution:** Profile-based configuration (same pattern as `ingest` profiles)

```
bin/jira/
├── profiles/
│   ├── personal.env      # JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN
│   ├── work.env          # Different instance credentials
│   └── default -> personal.env  # Symlink to default profile
```

**CLI Usage:**
```bash
jira --profile work search "innovation"     # Explicit profile
jira -p personal get PAI-123                # Short flag
jira search "bug"                           # Uses default profile
```

**SKILL.md Routing:**
The skill layer can auto-select profile based on:
1. Explicit user instruction ("in work Jira", "on personal board")
2. Project key prefix mapping (configurable)
3. Default fallback

## Two-Phase Retrieval (Token-Conscious)

Following the Context skill pattern (`obs search` → `obs load`), JIRA uses two-phase retrieval:

```
Phase 1: SEARCH (Discovery)
┌─────────────────────────────────────────────────────────────────┐
│ jira search "bug" -p all                                        │
│                                                                 │
│ | #  | Instance | Key      | Summary              | Status     │
│ |----|----------|----------|----------------------|------------|│
│ | 1  | work     | PROJ-123 | Login fails          | Open       │
│ | 2  | personal | PAI-456  | Track fitness data   | In Progress│
│                                                                 │
│ Load details: jira get PROJ-123                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User selects items
                              ↓
Phase 2: GET (Load Full Details)
┌─────────────────────────────────────────────────────────────────┐
│ jira get PROJ-123                                               │
│                                                                 │
│ Full issue: description, comments, history, attachments...      │
└─────────────────────────────────────────────────────────────────┘
```

**Why?**
- Search across all instances returns compact index (low tokens)
- User decides what to load
- Full details only for selected issues
- Same pattern as Context skill - proven token efficiency

## Impact Analysis

### Files to Create

| Path | Purpose |
|------|---------|
| `bin/jira/jira.ts` | CLI entrypoint |
| `bin/jira/lib/api.ts` | Jira REST API client |
| `bin/jira/lib/config.ts` | Configuration + profile management |
| `bin/jira/lib/format.ts` | Output formatters (table, json, markdown) |
| `bin/jira/profiles/` | Instance-specific .env files |
| `bin/jira/profiles.example/` | Example profiles for setup |
| `bin/jira/package.json` | Dependencies (bun + types only) |
| `.claude/skills/Jira/SKILL.md` | Skill definition with instance routing |
| `.claude/skills/Jira/ACCEPTANCE_TESTS.md` | Manual acceptance tests

### Files Modified

| Path | Change |
|------|--------|
| `.claude/.env.example` | Add JIRA_* variables |
| `.gitignore` | Add jira test fixtures |

### Dependencies

**Runtime:** None beyond Bun + native fetch
**Dev:** `bun-types` only

## Out of Scope

- Confluence integration (separate skill)
- MCP server implementation
- OAuth 2.0 (API token only for v1.0)
- Agile boards/sprints (future enhancement)
- Batch operations (future enhancement)

## Architecture

```
Goal: Jira integration for PAI
    │
    ▼
Code: bin/jira/*.ts (TypeScript, direct REST API)
    │
    ▼
CLI: jira <command> [options]
    │
    ▼
Prompts: SKILL.md routes "create issue" → jira create
    │
    ▼
Agents: Claude executes multi-step workflows
```

## Success Criteria

1. `jira search "text"` returns issues as table
2. `jira get PROJ-123` shows issue details
3. `jira create --project PROJ --type Bug --summary "..."` creates issue
4. `jira transition PROJ-123 "Done"` changes status
5. All commands work without AI (testable, deterministic)
6. SKILL.md routes natural language to CLI commands

## References

- [PAI 13 Founding Principles](../../../docs/images/principle-*.png)
- [mcp-atlassian README](../../../README-mcp-atlassian.md) - API reference only
- [Context Skill](../../../.claude/skills/Context/) - Architecture pattern
