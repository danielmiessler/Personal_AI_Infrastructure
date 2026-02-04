# LifeOS Architecture Changes — Briefing for All Claude Instances

**Date**: February 2026
**Context**: The LifeOS vault underwent a major architectural transformation (6 phases). If you previously worked in this vault, the structure has changed significantly. This document tells you what changed, what moved, and what you need to know.

---

## What Happened

The vault's AI system was restructured from a monolithic 58KB `CLAUDE.md` file into a modular architecture inspired by Daniel Messler's PAI (Personal AI Infrastructure). The transformation was executed across 6 phases over multiple sessions.

**Nothing outside `AI/` and `CLAUDE.md` changed.** The vault folder structure (Areas/, Projects/, Notes/, Content/, Tracking/, _System/, Tools/) is identical. All .base database files, frontmatter schemas, Obsidian plugins, eventkit-cli, mail-cli, afk-code, and MCP servers are untouched.

---

## CLAUDE.md — What Changed

**Before**: 58,119 bytes (~14,500 tokens). Contained everything: identity, 18 modes, all policies, tool docs, formatting rules, protocols.

**After**: ~1,700 tokens. Contains only:
1. Identity (who you are, who the user is)
2. Universal rules (memory loading, skill routing)
3. Skill routing instruction (read the matching skill file from `AI/skills/`)
4. Effort classification (route to The Algorithm for STANDARD+ tasks)
5. Condensed vault structure overview
6. Tool reference (eventkit-cli, mail-cli essentials)

**All mode content, policies, and protocols were extracted — not deleted.** They live in modular files now.

---

## New Directory Structure Under AI/

```
AI/
├── skills/                  # 28+ skill files (were the 18 modes + new skills)
│   ├── ai-equilibrium-editor.md
│   ├── translator.md
│   ├── business-advisor.md
│   ├── research.md          # NEW — multi-source research
│   ├── council.md           # NEW — multi-agent debate
│   ├── create-skill.md      # NEW — self-extending
│   ├── telos.md             # NEW — life OS / goals
│   ├── algorithm.md         # NEW — structured execution engine
│   ├── review-proposals.md  # NEW — improvement proposal review
│   └── ... (23 original + 5 new)
│
├── context/                 # Domain context maps (which vault files matter per domain)
│   ├── newsletter.md
│   ├── business.md
│   ├── health.md
│   ├── content.md
│   ├── investing.md
│   ├── network.md
│   ├── personal.md
│   ├── research.md
│   └── goals.md
│
├── policies/                # Extracted policy files (were inline in CLAUDE.md)
│   ├── provocation-protocol.md
│   ├── council-of-experts.md
│   ├── proactivity-protocol.md
│   ├── linking-rules.md
│   ├── security-boundaries.md
│   ├── emergency-protocols.md
│   ├── formatting-rules.md
│   ├── challenger-protocol.md
│   ├── effort-classification.md
│   ├── algorithm-protocol.md
│   └── security-patterns.yaml
│
├── telos/                   # Personal knowledge (beliefs, lessons, wisdom, predictions)
│   ├── beliefs.md
│   ├── lessons.md
│   ├── wisdom.md
│   └── predictions.md
│
├── memory/
│   ├── work/
│   │   ├── current.md       # WIP state (auto-updated by hooks)
│   │   ├── state.json       # Active session pointer
│   │   └── YYYY-MM-DD_slug/ # Per-session work directories
│   │       ├── META.yaml    # Status, effort, prompt count, timestamps
│   │       ├── ISC.md       # Algorithm ISC table (if used)
│   │       └── activity-report.md  # Session activity summary
│   ├── learnings/
│   │   ├── preferences.md   # Structured table with confidence scores
│   │   ├── mistakes.md      # Structured table with occurrence counts
│   │   ├── execution.md     # Task approach learnings
│   │   └── synthesis/       # Weekly synthesis reports (YYYY-WW.md)
│   ├── proposals/
│   │   ├── pending/         # Improvement proposals awaiting review
│   │   ├── approved/        # Applied proposals
│   │   └── rejected/        # Rejected proposals + blocklist.md
│   ├── signals/
│   │   └── ratings.jsonl    # Explicit + implicit quality ratings
│   ├── research/            # Research skill outputs
│   ├── security/            # Security validator audit trail
│   ├── events/              # Observability event logs (YYYY-MM-DD.jsonl)
│   └── context-log.md       # Was: AI/AI Context Log.md (MOVED here)
│
├── hooks/                   # TypeScript hooks (Bun runtime)
│   ├── on-session-start.ts  # Context injection (first prompt only)
│   ├── on-session-end.ts    # Work completion + activity report
│   ├── on-feedback.ts       # Explicit rating capture (1-10)
│   ├── security-validator.ts # PreToolUse security checks
│   ├── format-enforcer.ts   # Format reminder injection
│   ├── auto-work-creation.ts # Automatic session tracking
│   ├── implicit-sentiment.ts # Passive frustration/satisfaction detection
│   ├── event-capture.ts     # PostToolUse event logging
│   └── lib/
│       ├── paths.ts         # Shared vault path utilities
│       ├── event-logger.ts  # JSONL event logging utility
│       ├── preference-tracker.ts  # Preference recording with confidence
│       └── mistake-tracker.ts     # Mistake recording with occurrence counts
│
├── observability/           # Optional real-time dashboard
│   ├── server.ts
│   ├── dashboard.html
│   └── start.sh
│
├── scripts/                 # Enhanced launchd scripts (unchanged location)
│   ├── daily-brief.sh       # Now includes WIP + proposals reminder
│   ├── daily-close.sh       # Now updates memory
│   ├── weekly-review.sh     # Now includes AI System Health section
│   ├── learning-synthesis.sh # NEW — weekly signal analysis
│   ├── deep-work-block.sh   # Unchanged
│   └── vault-cleanup.sh     # Unchanged
│
├── My AgentOS/              # Unchanged
├── Prompts/                 # Unchanged
└── GPR to Reminders Mapping.md  # Unchanged
```

---

## What You Need to Know When Working Here

### 1. Skill Routing

CLAUDE.md no longer contains mode instructions. When you need to act in a specific mode:
- Read the matching skill file from `AI/skills/`
- The skill's YAML frontmatter tells you which context maps and policies to load
- Follow the skill's instructions

Example: if the user asks about their newsletter, read `AI/skills/ai-equilibrium-editor.md`, then load `AI/context/newsletter.md` for relevant vault files, and `AI/policies/formatting-rules.md` for style rules.

### 2. Context Maps

Instead of loading the entire vault structure, read the relevant context map from `AI/context/`. Each map lists which vault files and folders matter for that domain. This keeps context loading efficient.

### 3. Memory System

**Read at session start:**
- `AI/memory/work/current.md` — what was being worked on last session
- `AI/memory/context-log.md` — current priorities and situation

**Update at session end:**
- `AI/memory/work/current.md` — what you worked on, where you left off

**Note:** If hooks are running (interactive sessions), this is handled automatically. For `claude -p` invocations in scripts, you may need to read/update manually.

### 4. Moved Files

| Old Location | New Location |
|---|---|
| `AI/AI Context Log.md` | `AI/memory/context-log.md` |
| Policies (inline in CLAUDE.md) | `AI/policies/*.md` |
| 18 modes (inline in CLAUDE.md) | `AI/skills/*.md` |

The old `AI/AI Context Log.md` may contain a redirect notice pointing to the new location.

### 5. Hooks

8 hooks are registered in `.claude/settings.json` (gitignored, lives only locally). They fire automatically during interactive sessions:
- **UserPromptSubmit**: context injection, feedback capture, format enforcer, work tracking, sentiment detection
- **PreToolUse**: security validator (blocks dangerous commands)
- **PostToolUse**: event logging
- **Stop**: session end processing

If you're modifying hook files or adding new hooks, register them in `.claude/settings.json`. Format:
```json
{
  "matcher": "",
  "hooks": [{"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/your-hook.ts"}]
}
```
`matcher` must be a string (empty string for all events, pipe-delimited tool names like `"Bash|Edit|Write|Read"` for PreToolUse).

### 6. The Algorithm

For STANDARD+ effort tasks, The Algorithm creates an ISC (Ideal State Criteria) table in Markdown. This is stored at `AI/memory/work/{session}/ISC.md`. If you see an ISC file in a work directory, that session used structured execution.

### 7. Security Validator

The PreToolUse security hook checks every Bash command, file edit, write, and read against patterns in `AI/policies/security-patterns.yaml`. If you're adding automation or scripts that run with `bypassPermissions`, be aware that the security validator still fires and may block certain operations. Check the patterns file if you hit unexpected blocks.

### 8. Ratings and Learning

If the user gives a numeric rating (1-10), the `on-feedback.ts` hook captures it to `AI/memory/signals/ratings.jsonl`. If the user expresses frustration or satisfaction without an explicit rating, `implicit-sentiment.ts` captures it. Both feed into the weekly synthesis that proposes skill improvements.

### 9. Scripts Changes

`daily-brief.sh`, `daily-close.sh`, and `weekly-review.sh` were enhanced to read from the memory system. If you modify these scripts, preserve the memory-reading sections. `learning-synthesis.sh` is new — runs Sunday 9:00 AM, analyses the week's signals.

### 10. Git Workflow

All AI/ changes are committed to git with descriptive messages. The `.claude/` directory is gitignored (hook registration is local-only). `CLAUDE-legacy.md` is a backup of the original monolithic file — safe to delete after the transition period.

---

## What NOT to Do

- **Don't recreate content in CLAUDE.md.** It's intentionally slim. Content lives in skills and policies.
- **Don't write to `AI/AI Context Log.md`** — it moved to `AI/memory/context-log.md`.
- **Don't hardcode mode instructions.** Read the skill file dynamically.
- **Don't ignore context maps.** They exist to prevent loading the entire vault into context.
- **Don't modify hooks without testing.** A broken hook (non-zero exit) can block Claude Code.
- **Don't delete `AI/memory/` contents.** Ratings, learnings, and work history are used by the weekly synthesis.

---

## Questions?

If something is unclear about the new architecture, the full design documents are in the PAI reference repo at `~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Plans/`:
- `ai-genius-system-design.md` — overall architecture
- `transformation-briefing.md` — Phase 1 detailed plan
- `phase-2-briefing.md` through `phase-6-briefing.md` — subsequent phases
- `user-manual.md` — user-facing guide
