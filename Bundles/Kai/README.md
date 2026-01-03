<p align="center">
  <img src="kai.png" alt="The Official PAI (Kai) Bundle" width="256">
</p>

# The Official PAI (Kai) Bundle v2.0.0

> **FOR AI AGENTS:** You are about to install the complete Kai bundle. Run the wizard, then install each pack in order.

---

## 🚨 CRITICAL: Full Implementation Required (For AI Agents)

> **MANDATORY: Read this section before installing ANY pack in this bundle.**

### The Problem

AI agents systematically create "simplified" versions of pack implementations. Instead of the full 268-line specification, they create 50-line "equivalents." **This breaks the system and wastes the user's time.**

### The Rules for This Bundle

1. **EVERY PACK = FULL IMPLEMENTATION** - No shortcuts, no simplification
2. **EVERY FILE SPECIFIED = EVERY FILE CREATED** - Count them
3. **EVERY LINE OF CODE = EVERY LINE OF CODE** - Don't summarize
4. **IF YOU CAN'T DO IT FULLY, STOP AND SAY SO** - Don't create partial implementations

### Per-Pack Installation Checklist

**For EACH pack you install, confirm:**

```markdown
## Pack: [pack-name] Installation Verification

- [ ] All directories created as specified
- [ ] All files created (counted: X of Y)
- [ ] Code files contain COMPLETE implementations
- [ ] YAML/JSON files contain ALL entries
- [ ] Verification commands passed
- [ ] No "simplified" or "equivalent" versions created
```

### Full Bundle Completion Checklist

**After ALL packs are installed, confirm:**

```markdown
## Kai Bundle Installation Complete

### Pack Status
- [ ] kai-hook-system - FULLY installed, verified
- [ ] kai-history-system - FULLY installed, verified
- [ ] kai-core-install - FULLY installed, verified
- [ ] kai-voice-system - FULLY installed, verified (if applicable)

### Integration Status
- [ ] ~/.claude directory structure correct
- [ ] settings.json contains all hook registrations
- [ ] Startup hook fires on new session
- [ ] Claude Code restarted to activate hooks

### Quality Confirmation
- [ ] NO simplified implementations
- [ ] NO missing files
- [ ] NO summarized configurations
- [ ] User informed of required customizations
```

**Present this completed checklist to the user. If ANY item fails, you are NOT done.**

---

## Quick Start

```bash
# Fresh install (with backup)
bun run install.ts

# Update existing installation (preserves config)
bun run install.ts --update
```

### Fresh Install

The wizard will:
1. **Detect existing AI systems** - Scans for Claude Code, Gemini CLI, Cursor, Windsurf, Cline, Aider, Continue
2. **Show you what it found** and explain what will be backed up
3. **Ask for your confirmation** before making any changes
4. **Create a safety backup** of your existing `~/.claude` directory to `~/.claude-BACKUP`
5. **Ask a few questions** (your name, AI name, timezone, voice preference)
6. **Install directly to `~/.claude`** - the standard Claude Code location
7. **Configure environment variables** automatically

**Safety First:** The installer will not modify anything until you explicitly confirm. Your original files are always preserved in the backup.

### Update Mode

After pulling new changes from the repo, use `--update` to apply them without losing your configuration:

```bash
git pull
bun run install.ts --update
```

Update mode will:
- **Skip backup** - Your files stay in place
- **Read existing config** - Uses your .env values as defaults
- **Preserve customizations** - Hooks, history, and personal settings untouched
- **Update infrastructure** - Only refreshes core skill files

---

## What This Bundle Provides

When fully installed, the Kai bundle gives you:

- A custom **History system** - Automatically captures sessions, decisions, learnings, and research
- A custom set of **Hooks** - Event-driven automation that triggers on session start, tool use, and task completion
- A custom **Skill system** - Modular capabilities that route based on intent
- A custom **Voice notification system** - Spoken updates via ElevenLabs when tasks complete (optional)
- A custom **Agent swarm creation system** - Spawn parallel agents with personality templates
- A custom **Security control system** - Protection against prompt injection and dangerous operations

---

## Installation Order (CRITICAL)

**After running the wizard, install these packs IN ORDER:**

| # | Pack | Purpose | Dependencies |
|---|------|---------|--------------|
| 1 | [kai-hook-system](../../Packs/kai-hook-system/) | Event-driven automation | None |
| 2 | [kai-history-system](../../Packs/kai-history-system/) | Memory and capture | Hooks |
| 3 | [kai-core-install](../../Packs/kai-core-install/) | Skills + Identity + Architecture | Hooks, History |
| 4 | [kai-prompting-skill](../../Packs/kai-prompting-skill/) | Meta-prompting & templates | Core |
| 5 | [kai-voice-system](../../Packs/kai-voice-system/) | Voice notifications (optional) | Hooks, Core |
| 6 | [kai-agents-skill](../../Packs/kai-agents-skill/) | Dynamic agent composition (optional) | Core, Voice (optional) |
| 7 | [kai-art-skill](../../Packs/kai-art-skill/) | Visual content generation (optional) | Core |
| 8 | [kai-observability-server](../../Packs/kai-observability-server/) | Multi-agent monitoring (optional) | Hooks |

### How to Install Packs

Give each pack directory to your AI and ask it to install:

```
"Install the kai-hook-system pack from PAI/Packs/kai-hook-system/"
```

The AI will:
1. Read the pack's `README.md` for context
2. Follow `INSTALL.md` step by step
3. Copy files from `src/` to your system
4. Complete `VERIFY.md` checklist to confirm success

**Note:** Each pack is now a directory (v2.0 format) containing README.md, INSTALL.md, VERIFY.md, and a `src/` folder with actual code files.

### Why Order Matters

- **Hooks** are the foundation - they enable all event-driven automation
- **History** uses hooks to capture events and context
- **Core Install** provides skill routing and identity framework
- **Voice** uses hooks for completion events (requires ElevenLabs API key)

---

## Prerequisites

- [Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash`
- [Claude Code](https://claude.com/claude-code) or compatible AI coding assistant

---

## Verification

After installing all packs:

```bash
# Check directory structure
ls -la ~/.claude/

# Expected directories:
# hooks/       - Event-driven automation
# history/     - Sessions, Learnings, Research, Decisions
# skills/      - CORE and other skills
# tools/       - CLI utilities
# voice/       - Voice server files (if installed)

# Check hooks are registered
cat ~/.claude/settings.json | grep -A 5 "hooks"

# Restart Claude Code to activate all hooks
```

---

## Restoring from Backup

If something goes wrong:

```bash
# Remove the new installation
rm -rf ~/.claude

# Restore from backup
mv ~/.claude-BACKUP ~/.claude
```

---

## What Are Packs and Bundles?

**Packs** are complete subsystems organized around a single capability. Each pack is a directory containing:
- `README.md` - Overview, architecture, what it solves
- `INSTALL.md` - Step-by-step installation instructions
- `VERIFY.md` - Mandatory verification checklist
- `src/` - Actual source code files (TypeScript, YAML, etc.)

For example, `kai-hook-system` provides an entire event-driven automation framework with all code files ready to copy.

**Bundles** are curated combinations of packs designed to work together. The Kai Bundle is 8 packs that form a complete AI infrastructure (4 required + 4 optional).

---

## The 14 Founding Principles

The Kai system embeds these principles from [PAI](https://danielmiessler.com/blog/personal-ai-infrastructure):

1. **Clear Thinking + Prompting is King** - Good prompts come from clear thinking
2. **Scaffolding > Model** - Architecture matters more than which model
3. **As Deterministic as Possible** - Templates and consistent patterns
4. **Code Before Prompts** - Use AI only for what actually needs intelligence
5. **Spec / Test / Evals First** - Write specifications and tests before building
6. **UNIX Philosophy** - Do one thing well, make tools composable
7. **ENG / SRE Principles** - Treat AI infrastructure like production software
8. **CLI as Interface** - Command-line is faster and more reliable
9. **Goal → Code → CLI → Prompts → Agents** - The decision hierarchy
10. **Meta / Self Update System** - Encode learnings so you never forget
11. **Custom Skill Management** - Modular capabilities that route intelligently
12. **Custom History System** - Everything worth knowing gets captured
13. **Custom Agent Personalities** - Different work needs different approaches
14. **Science as Cognitive Loop** - Hypothesis → Experiment → Measure → Iterate

---

## Changelog

### 2.0.0 - 2025-12-31
- **Directory-based Packs:** All packs migrated from single markdown files to directory structure
- **New Pack Format:** Each pack now contains README.md, INSTALL.md, VERIFY.md, and src/ directory
- **Actual Code Files:** Source code now in real .ts, .yaml, .hbs files (not embedded in markdown)
- **Four New Packs:** Added kai-prompting-skill, kai-agents-skill, kai-art-skill, kai-observability-server
- **Improved Installation:** AI agents copy actual files instead of extracting from markdown blocks

### 1.2.0 - 2025-12-30
- **AI System Detection:** Scans for Claude Code, Cursor, Windsurf, Cline, Aider, Continue
- **Clear Communication:** Shows exactly what was detected and what will be backed up
- **Explicit Confirmation:** Asks permission before making any changes to your system
- **Safety-first approach:** No modifications until user confirms

### 1.1.0 - 2025-12-30
- Now installs directly to `~/.claude` instead of configurable `$PAI_DIR`
- Automatic backup to `~/.claude-BACKUP` before installation
- Environment variables set automatically (no manual shell sourcing needed)
- Simplified: Removed personality calibration questions - just name, timezone, voice
- Simplified: Removed technical preference questions - use sensible defaults
- Simplified: Removed "open another terminal" instructions

### 1.0.0 - 2025-12-29
- Initial release with full wizard

---

## Credits

**Author:** Daniel Miessler
**Origin:** Extracted from production Kai system (2024-2025)
