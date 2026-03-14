# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**PAI (Personal AI Infrastructure)** is a modular framework for transforming generic AI assistants into personalized AI systems with memory, skills, and automation. The repository is organized around **Packs** (self-contained capabilities) and **Bundles** (curated collections of packs).

## Key Architecture Concepts

### Pack Structure (v2.0 - Directory-Based)

Every pack follows this structure:
```
Packs/pack-name/
├── README.md           # Overview, architecture, problem/solution
├── INSTALL.md          # Wizard-style installation with AskUserQuestion
├── VERIFY.md           # Mandatory verification checklist
└── src/                # Actual source code files
    ├── hooks/          # Event-driven automation (TypeScript)
    ├── skills/         # Skill definitions (Markdown + YAML)
    ├── tools/          # CLI utilities (TypeScript)
    └── config/         # Configuration files
```

### Pack Types

**Skill Packs** (🎯):
- Must have `SKILL.md` with workflow references
- Invoked BY the AI when it detects triggers
- Examples: pai-art-skill, pai-agents-skill, pai-prompting-skill

**System Packs** (⚙️):
- Infrastructure that runs in background
- No SKILL.md required (this is intentional)
- Examples: pai-hook-system, pai-history-system, pai-voice-system

### The Universal Algorithm

PAI implements a 7-phase algorithm (Current → Ideal via verifiable iteration):
1. **OBSERVE** - Gather context
2. **THINK** - Generate ideas
3. **PLAN** - Pick approach
4. **BUILD** - Define success criteria
5. **EXECUTE** - Do the work
6. **VERIFY** - Test against criteria
7. **LEARN** - Harvest insights

This pattern appears throughout the codebase, especially in `pai-algorithm-skill`.

### Memory System Architecture

Three-tier memory at `$PAI_DIR/MEMORY/`:
- **CAPTURE** (Hot) - `Work/` - Active tasks with real-time traces
- **SYNTHESIS** (Warm) - `Learning/` - Organized by algorithm phase
- **APPLICATION** (Cold) - `History/` - Immutable historical archive

### Hook System

Event-driven automation via TypeScript hooks:
- `SessionStart` - Loads CORE skill context
- `PreToolUse` / `PostToolUse` - Security validation, logging
- `Stop` / `SubagentStop` - Captures completions, triggers voice
- `UserPromptSubmit` - Updates terminal tabs

Hooks are registered in `~/.claude/settings.json` and gracefully fail (always exit 0).

### Security Model

Multi-layer defense:
- Command validation blocks dangerous operations (`rm -rf`, `sudo`)
- All API keys in `$PAI_DIR/.env` (never in code)
- Repository separation (private vs public)
- Prompt injection defense (external content read-only)

## Common Development Commands

### Pack Validation

```bash
# Validate all packs (checks SKILL.md workflows, required files)
bun run Tools/validate-pack.ts

# Validate specific pack
bun run Tools/validate-pack.ts pai-agents-skill

# Validate changed packs (CI mode)
bun run Tools/validate-pack.ts --changed-only
```

### Bundle Installation

```bash
# Install complete PAI bundle with wizard
cd Bundles/Official
bun run install.ts

# Update existing installation (preserves config)
bun run install.ts --update
```

### Voice Server

```bash
# Start voice server (pai-voice-system)
cd ~/.claude/voice
./manage.sh start

# Check status
./manage.sh status

# Stop
./manage.sh stop
```

### Observability Server

```bash
# Start monitoring dashboard (pai-observability-server)
cd Packs/pai-observability-server/src/observability
./manage.sh start

# View at http://localhost:3999
```

### Browser Automation

```bash
# Run browser automation example
cd Packs/pai-browser-skill
bun run examples/comprehensive-test.ts
```

## Critical Implementation Rules

### For AI Agents Installing Packs

**NEVER simplify implementations.** When installing packs:

1. **Copy COMPLETE files from `src/`** - No shortcuts, no "equivalents"
2. **If INSTALL.md says 8 files, create 8 files** - Count them
3. **If code is 500 lines, copy all 500 lines** - Don't summarize
4. **Complete VERIFY.md checklist** - Installation not done until all checks pass

Simplified implementations break inter-pack integration and waste user time with correction cycles.

### Wizard-Style Installation Pattern

All `INSTALL.md` files use this flow:
1. **System Analysis** - Detect state, check prerequisites, find conflicts
2. **User Questions** - Use `AskUserQuestion` tool for decisions
3. **Backup** - Create timestamped backups if replacing content
4. **Installation** - Use `TodoWrite` for progress tracking
5. **Verification** - Run all `VERIFY.md` checks

See `Tools/InstallTemplate.md` for the complete template.

## File Naming Conventions

- **Packs:** `pai-pack-name/` (lowercase, hyphenated)
- **Skills:** `SKILL.md` (uppercase, at skill root)
- **Workflows:** `TitleCase.md` in `Workflows/` directory
- **Tools:** `TitleCase.ts` for TypeScript CLIs
- **Hooks:** `kebab-case.ts` for hook files

## Environment Variables

All configuration via `$PAI_DIR/.env`:
```bash
DA="YourAIName"              # AI assistant name
TIME_ZONE="America/New_York" # Timezone for timestamps
ELEVENLABS_API_KEY="..."     # Voice system (optional)
REPLICATE_API_TOKEN="..."    # Art generation (optional)
```

Default `PAI_DIR` is `~/.claude` (Claude Code standard location).

## Pack Dependencies

Install in this order (dependencies listed):
1. `pai-hook-system` (foundation, no dependencies)
2. `pai-history-system` (requires hooks)
3. `pai-core-install` (requires hooks, history)
4. `pai-prompting-skill` (requires core)
5. `pai-voice-system` (requires hooks, core)
6. `pai-agents-skill` (requires core, optional voice)
7. Other skill packs (require core)

## The 15 PAI Principles

When working with this codebase, follow these principles:

1. **The Algorithm** - Current → Ideal via verifiable iteration
2. **Clear Thinking First** - Clarify before prompting
3. **Scaffolding > Model** - Architecture over model choice
4. **Deterministic Infrastructure** - Use templates, consistent patterns
5. **Code Before Prompts** - Bash scripts when possible
6. **Spec / Test / Evals First** - Measure if it works
7. **UNIX Philosophy** - Do one thing well, composable
8. **ENG / SRE Principles** - Version control, automation, monitoring
9. **CLI as Interface** - Command-line over GUI
10. **Goal → Code → CLI → Prompts → Agents** - Decision hierarchy
11. **Self-Updating System** - Encode learnings
12. **Skill Management** - Modular, intelligent routing
13. **History System** - Capture everything
14. **Agent Personalities** - Specialized voices
15. **Science as Meta-Loop** - Hypothesis → Experiment → Measure → Iterate

## Platform Compatibility

- **macOS:** ✅ Fully supported (primary development platform)
- **Linux:** ✅ Fully supported (Ubuntu/Debian tested)
- **Windows:** ❌ Not supported (community contributions welcome)

Platform detection pattern:
```typescript
if (process.platform === 'darwin') {
  // macOS-specific
} else if (process.platform === 'linux') {
  // Linux-specific
}
```

## Response Format (For AI Assistant Behavior)

When operating as the installed PAI system, use this format:
```
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
➡️ NEXT: [Recommended next steps]
🗣️ [AI_NAME]: [12 words max - triggers voice output]
```

The `🗣️` line is extracted by hooks and sent to the voice server if installed.

## Key Files to Understand

- `README.md` - Complete system overview
- `PACKS.md` - Pack system documentation
- `INSTALL.md` - AI-first installation guide
- `Bundles/Official/README.md` - Bundle structure and installation order
- `Tools/PAIPackTemplate.md` - Pack creation template
- `Tools/InstallTemplate.md` - Installation wizard template
- `Packs/pai-core-install/src/skills/CORE/SKILL.md` - Core identity and routing

## Testing Pack Installations

After creating or modifying a pack:
1. Validate structure: `bun run Tools/validate-pack.ts pack-name`
2. Test installation in clean environment
3. Complete VERIFY.md checklist
4. Confirm no simplified implementations

## Migration Notes (v1.0 → v2.0)

The repository transitioned from single-file packs (markdown with embedded code) to directory-based packs (actual source files). This solved:
- Token limit issues (files exceeded 25k tokens)
- AI simplification (agents would reduce code complexity)
- Code quality (files can now be linted and tested)

Old format: `Packs/pack-name.md`
New format: `Packs/pack-name/` with README.md, INSTALL.md, VERIFY.md, src/
