# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Personal AI Infrastructure (PAI)** installation - a modular system for building personalized AI assistants. The system uses Claude Code as its foundation with custom hooks, skills, and services.

## Key Environment Variables

All configuration flows through these environment variables (defined in `settings.json`):

- `PAI_DIR=/root/.claude` - Root directory for all PAI configuration
- `DA=Skish` - Digital Assistant name (the AI's identity)
- `TIME_ZONE=new york` - Timezone for timestamps
- `PAI_SOURCE_APP=Skish` - Source application identifier

API keys are stored in `$PAI_DIR/.env` - never commit this file.

## Development Commands

### Voice Services

```bash
# Manage voice server and Telegram bot
~/.claude/voice/manage.sh start           # Start voice server (port 8888)
~/.claude/voice/manage.sh stop            # Stop voice server
~/.claude/voice/manage.sh status          # Check server status
~/.claude/voice/manage.sh logs            # Tail server logs

# Telegram bot
~/.claude/voice/manage.sh telegram-start  # Start Telegram bot
~/.claude/voice/manage.sh telegram-stop   # Stop Telegram bot
~/.claude/voice/manage.sh telegram-status # Check bot status

# Both services
~/.claude/voice/manage.sh all-start       # Start all services
~/.claude/voice/manage.sh all-restart     # Restart all services
~/.claude/voice/manage.sh all-status      # Status of all services
```

### Syncing Configuration

```bash
/sync                                     # Skill command to sync from GitHub
~/.claude/sync-kai.sh                     # Manual sync script
```

### Running Hooks

Hooks are TypeScript files run with Bun:
```bash
bun run $PAI_DIR/hooks/<hook-name>.ts
```

## Architecture

### Directory Structure

```
~/.claude/
├── hooks/                 # Event hooks (TypeScript, run with Bun)
│   ├── lib/               # Shared hook utilities
│   ├── capture-all-events.ts
│   ├── initialize-session.ts
│   ├── load-core-context.ts
│   ├── security-validator.ts
│   └── ...
├── skills/                # Skill definitions
│   ├── CORE/              # Core identity and config (always loaded)
│   ├── CreateSkill/       # Skill creation utilities
│   ├── AskDaniel/         # Feature review workflow
│   ├── VoiceInterface/    # Voice interaction skill
│   └── skill-index.json   # Skill registry
├── voice/                 # Voice server (ElevenLabs TTS)
│   ├── server.ts          # HTTP voice server
│   ├── telegram-bot.ts    # Telegram integration
│   └── manage.sh          # Service management
├── history/               # Session and learning history
│   ├── sessions/          # Session summaries
│   ├── learnings/         # Captured learnings
│   └── raw-outputs/       # Raw tool outputs
├── Packs/                 # Available PAI packs for installation
├── commands/              # Slash command definitions
├── scripts/               # Git workflow scripts
├── settings.json          # Hook configuration and env vars
├── settings.local.json    # Auto-permissions
└── .env                   # API keys (gitignored)
```

### Hook System

Hooks are configured in `settings.json` and trigger on Claude Code events:

| Event | Purpose |
|-------|---------|
| `SessionStart` | Initialize session, load CORE context, voice greeting |
| `PreToolUse` | Security validation (Bash), event capture |
| `PostToolUse` | Event capture |
| `UserPromptSubmit` | **Methodology enforcement**, tab titles, event capture |
| `Stop` | Session summary, voice farewell |
| `SubagentStop` | Subagent completion handling |
| `SessionEnd` | Capture session summary, event logging |

### Skill System

Skills follow TitleCase naming convention and have this structure:
```
SkillName/
├── SKILL.md              # Main skill file with YAML frontmatter
├── Tools/                # CLI tools (TypeScript)
└── Workflows/            # Workflow definitions
```

SKILL.md frontmatter must include:
- `name:` in TitleCase
- `description:` single line with `USE WHEN` clause

### Skill Tiers

- **always** - Loaded at session start (e.g., CORE)
- **deferred** - Loaded on demand based on triggers

## Bun Runtime (MANDATORY)

Use Bun instead of Node.js, npm, pnpm, or vite for all TypeScript/JavaScript work.

### Commands

- `bun <file>` instead of `node <file>` or `ts-node <file>`
- `bun test` instead of `jest` or `vitest`
- `bun build <file>` instead of `webpack` or `esbuild`
- `bun install` instead of `npm install`
- `bun run <script>` instead of `npm run <script>`

Bun automatically loads `.env` - don't use dotenv.

### Bun APIs (prefer over npm packages)

| Use | Instead of |
|-----|------------|
| `Bun.serve()` | express |
| `bun:sqlite` | better-sqlite3 |
| `Bun.redis` | ioredis |
| `Bun.sql` | pg, postgres.js |
| `WebSocket` (built-in) | ws |
| `Bun.file()` | node:fs readFile/writeFile |
| `Bun.$\`cmd\`` | execa |

### Testing

```ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(1).toBe(1);
});
```

Run with `bun test`.

### Frontend with Bun.serve()

Use HTML imports with `Bun.serve()` instead of Vite:

```ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => Response.json({ id: req.params.id }),
    },
  },
  websocket: {
    open: (ws) => ws.send("Hello"),
    message: (ws, msg) => ws.send(msg),
  },
  development: { hmr: true, console: true }
})
```

HTML can import `.tsx`/`.jsx` directly - Bun bundles automatically.

## Development Methodology

**Enforced via hook:** The `skill-suggester.ts` hook automatically routes to correct skills based on intent detection.

### Entry Points (Hook-Enforced)

| Intent Detected | Skill Invoked | Workflow |
|-----------------|---------------|----------|
| Bug/error/fix | SystematicDebugging | `Workflows/RootCauseAnalysis.md` |
| PAI feature (skill/hook) | AskDaniel | `Workflows/ReviewFeature.md` |
| New feature | Brainstorming | `Workflows/ExploreDesign.md` |

### Main Workflow Chain

```
Brainstorming → WritingPlans → ExecutingPlans → FinishingBranch
     │               │               │               │
     ▼               ▼               ▼               ▼
ExploreDesign   CreatePlan    ExecutePlan    CompleteBranch
```

Each skill has detailed workflows in `skills/[SkillName]/Workflows/`.

### Internal Disciplines

These are called BY other skills, not triggered directly:

| Discipline | Workflow | Called By |
|------------|----------|-----------|
| TestDrivenDevelopment | `RedGreenRefactor.md`, `BugFix.md` | WritingPlans, ExecutingPlans, SystematicDebugging |
| VerificationBeforeCompletion | `VerifyBeforeClaim.md` | ExecutingPlans, FinishingBranch, code review |
| SystematicDebugging | `RootCauseAnalysis.md` | Hook (auto), ExecutingPlans on failure |

### Code Review

| Skill | Workflow | When to Use |
|-------|----------|-------------|
| RequestingCodeReview | `RequestReview.md` | After tasks, before merge |
| ReceivingCodeReview | `EvaluateFeedback.md` | When receiving feedback |

### Skill Invocation Patterns

| Pattern | Example | How It Works |
|---------|---------|--------------|
| Hook-enforced | Bug → SystematicDebugging | `skill-suggester.ts` detects intent |
| Handoff | Brainstorming → WritingPlans | Explicit "use WritingPlans skill" |
| Per-task | ExecutingPlans → TDD | Embedded in each task execution |
| On-failure | ExecutingPlans → SystematicDebugging | When tests fail unexpectedly |

All skills live in `$PAI_DIR/skills/`. Each has a SKILL.md with routing table and Workflows/ directory.

## Stack Preferences

- **Runtime:** Bun (NEVER npm/yarn/pnpm/node)
- **Language:** TypeScript preferred over Python
- **Markup:** Markdown (NEVER HTML for basic content)

## Important Files

- `settings.json` - Hook configuration and environment variables
- `settings.local.json` - Auto-approved permissions
- `skills/skill-index.json` - Skill registry with trigger keywords
- `skills/CORE/SKILL.md` - AI identity and core configuration
- `.env` - API keys (ELEVENLABS_API_KEY, TELEGRAM_BOT_TOKEN, etc.)

## Code Conventions

1. All paths should use `$PAI_DIR` or `${PAI_DIR}` for portability
2. Hooks are TypeScript files executable with `bun run`
3. First-person voice: the AI speaks as "I" not "Skish" or "the system"
4. TitleCase for all skill directories, workflow files, and tool files
