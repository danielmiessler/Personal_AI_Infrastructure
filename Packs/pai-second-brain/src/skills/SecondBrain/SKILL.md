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
| Assess | `bun run assess -p "prompt"` | Determine complexity level |
| Route | `bun run delegate -p "prompt"` | Get delegation plan |
| Debate | `bun run debate -t "topic"` | Run multi-perspective debate |

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

## Files

- `Tools/ComplexityAssessor.ts` - Pattern-based complexity detection
- `Tools/DelegationRouter.ts` - Route to delegation strategy
- `Tools/DebateOrchestrator.ts` - Multi-perspective debate management
