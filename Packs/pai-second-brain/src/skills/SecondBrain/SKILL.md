---
name: SecondBrain
description: Cognitive philosophy with delegation patterns and debate orchestration. USE WHEN making decisions, strategic planning, complex analysis, or when user asks "should I". AUTO-DETECTS pai-multi-llm for enhanced cognitive diversity.
load_tier: 1
---

# SecondBrain - Cognitive Philosophy

Second Brain transforms Claude from an assistant into a **director** that orchestrates multi-perspective analysis through delegation and debate.

## Core Principle

```
NEVER EXECUTE DIRECTLY. ALWAYS DELEGATE.
```

Even simple tasks benefit from delegation - it preserves context and enables validation.

## Quick Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Assess | `bun run Tools/ComplexityAssessor.ts -p "prompt"` | Determine complexity level |
| Route | `bun run Tools/DelegationRouter.ts -p "prompt"` | Get delegation plan |
| Debate | `bun run Tools/DebateOrchestrator.ts -t "topic"` | Run multi-perspective debate |
| Vault | `bun run Tools/VaultReader.ts --search "query"` | Search PARA knowledge vault |

## Complexity Levels

| Level | Agents | Triggers |
|-------|--------|----------|
| Simple | 1 | "what is", "show me", lookups |
| Medium | 2 | "analyze", "research", "implement" |
| Complex | 3+ | "should I", "strategy", "pros/cons" |

## Examples

**Assess a task:**
```bash
bun run assess -p "Should we migrate to microservices?"
# → COMPLEX (3+ agents, debate pattern)
```

**Get delegation plan:**
```bash
bun run delegate -p "Compare React vs Vue for our project"
# → Strategy: debate_synthesis
# → Agents: optimist, pessimist, pragmatist, synthesizer
```

**Run a debate:**
```bash
bun run debate -t "Should we raise prices?" --perspectives optimist,pessimist,contrarian
```

## Perspectives

Built-in perspectives for debates:

- **Optimist** - Focus on opportunities and benefits
- **Pessimist** - Focus on risks and problems
- **Pragmatist** - Balance idealism with practicality
- **Contrarian** - Challenge assumptions
- **Analyst** - Data and evidence focused
- **Synthesizer** - Combine perspectives (auto-added)

## Integration with pai-multi-llm

When `pai-multi-llm` is installed, Second Brain:
- Routes debates to different LLM providers
- Achieves true cognitive diversity (not just role-playing)
- Uses session management for context efficiency

Without `pai-multi-llm`, Second Brain uses Claude subagents.

## Philosophy Files

| File | Purpose |
|------|---------|
| `Philosophy/DELEGATION.md` | Why and how to delegate |
| `Philosophy/SPARRING.md` | Challenge mode, friction |
| `Philosophy/AUTHORIZATION.md` | Full freedom protocol |

## PARA Vault Integration

Configure your PARA-structured knowledge folder:

```bash
# Option 1: Environment variable
export PARA_VAULT="/path/to/your/notes"

# Option 2: Config file
# Add to ~/.claude/config/para-mapping.yaml:
vault_root: "/path/to/your/notes"
```

**VaultReader commands:**
```bash
bun run Tools/VaultReader.ts --stats                    # Vault overview
bun run Tools/VaultReader.ts --search "query"           # Search all notes
bun run Tools/VaultReader.ts --list archives            # List category
bun run Tools/VaultReader.ts --find-related "topic"     # Find related notes
bun run Tools/VaultReader.ts --read "path/to/note.md"   # Read specific note
```

## Vault Tools

| Tool | Command | Purpose |
|------|---------|---------|
| VaultReader | `bun run Tools/VaultReader.ts --search "query"` | Foundation: search, list, read vault |
| ArchiveSynthesis | `bun run Tools/ArchiveSynthesis.ts -c "topic"` | Find breakthrough patterns from archives |
| ContextLoader | `bun run Tools/ContextLoader.ts -t "topic"` | Load relevant project/area context |
| InboxProcessor | `bun run Tools/InboxProcessor.ts` | Process and categorize inbox items |

**Archive Synthesis:**
```bash
bun run Tools/ArchiveSynthesis.ts --catalyst "current problem"
# → Finds dormant patterns, generates synthesis prompts
```

**Context Loading:**
```bash
bun run Tools/ContextLoader.ts --topic "pricing strategy"
bun run Tools/ContextLoader.ts --project "ClientX" --topic "invoice"
# → Loads relevant notes from Projects and Areas
```

**Inbox Processing:**
```bash
bun run Tools/InboxProcessor.ts --summary
bun run Tools/InboxProcessor.ts --limit 20
# → Suggests PARA categorization for each inbox item
```

## Files

- `Tools/ComplexityAssessor.ts` - Pattern-based complexity detection
- `Tools/DelegationRouter.ts` - Route to delegation strategy
- `Tools/DebateOrchestrator.ts` - Multi-perspective debate management
- `Tools/VaultReader.ts` - PARA vault foundation: search, list, read
- `Tools/ArchiveSynthesis.ts` - Archive pattern synthesis for breakthroughs
- `Tools/ContextLoader.ts` - Load project/area context for informed responses
- `Tools/InboxProcessor.ts` - Process inbox items with PARA suggestions
