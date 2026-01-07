# PAI Infrastructure Pack System

## Session Resume

**IMPORTANT**: At the start of any session in this project, read `SESSION-CONTEXT.md` in this directory for full context on:
- What has been built (Phases 1-2 complete)
- Current test status (280 tests passing)
- Remaining work (Phases 3-7 need specs)
- Architecture decisions
- File locations

## Project Overview

Building a portable infrastructure pack system with three-layer architecture:
- **Core Layer**: Interfaces + shared utilities
- **Adapter Layer**: Vendor-specific implementations
- **Skill Layer**: User-facing workflows

## Working Preferences

- **Runtime**: Bun (NEVER npm/yarn/pnpm)
- **Language**: TypeScript
- **Testing**: bun:test
- **Task Tracking**: Joplin with markdown checkboxes
- **Auth Storage**: macOS Keychain preferred

## Joplin Tracking

Status tracked in Joplin note: `📍 Current - PAI Pack System` (id: bf2f51c493c644be9626654fb6a6f826)

```bash
# Quick status check
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/kai-joplin-skill/Tools
bun run Notes.ts get "bf2f51c493c644be9626654fb6a6f826"
```

## Autonomous Work

Proceed through implementation without prompting unless clarification is genuinely needed on requirements or design decisions not covered in specs.

## Key Directories

- **Specs**: `Packs/specs/`
- **Packages**: `Packs/kai-*`
- **Context**: `SESSION-CONTEXT.md`

## Commits

Use conventional commits with:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
