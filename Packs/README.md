<p align="center">
  <img src="icons/packs-v2.png" alt="PAI Packs" width="256">
</p>

# PAI Packs

> The best AI in the world should be available to everyone

Right now the most powerful AI setups are being built inside companies for efficiency and profits. But the purpose of technology is to serve humans—not the other way around.

**PAI Packs** are how we make that happen. Each pack is a battle-tested capability extracted from a production AI system, packaged so anyone can install it. Think of them like learning kung-fu in The Matrix—complete, tested capabilities you can download directly into your system.

These aren't theoretical examples or proof-of-concepts. They're the actual tools and systems running in production every day, now available to you. A full platform for magnifying yourself and your impact on the world.

---

## Why Packs?

The old approach was "here's my whole system—clone it and customize." That created a Jenga tower of dependencies where changing one piece broke three others.

**Packs are different:**
- **Self-contained** - Works without understanding the rest of the system
- **Independently installable** - Add what you need, skip what you don't
- **Platform-agnostic** - Works with Claude Code, OpenCode, Cursor, or custom systems
- **AI-installable** - Give your AI the pack directory, it handles the rest

**The key insight:** Give your AI the complete context it needs, and it can integrate the pack into *your* system autonomously.

---

## Pack Structure (v2.0)

Each pack is now a **directory** containing:

```
pack-name/
├── README.md           # Pack overview, architecture, what it solves
├── INSTALL.md          # Step-by-step installation instructions
├── VERIFY.md           # Mandatory verification checklist
└── src/                # Actual source code files
    ├── hooks/          # Hook implementations (if applicable)
    ├── tools/          # CLI tools and utilities
    ├── skills/         # Skill definitions and workflows
    └── config/         # Configuration files
```

### Why Directory Structure?

The previous single-file approach had limitations:
- **Token limits** - Large packs exceeded 25k token limits
- **Code simplification** - AI agents would "helpfully" simplify code instead of copying verbatim
- **No linting/testing** - Code embedded in markdown couldn't be validated

The directory structure provides:
- **Real code files** - TypeScript, YAML, Handlebars files that can be linted and tested
- **Clear separation** - README for context, INSTALL for steps, VERIFY for validation
- **Verbatim copying** - AI agents copy actual files instead of extracting from markdown

### AI Installation Flow (Wizard-Style)

Packs use **wizard-style installation** that leverages Claude Code's native tools:

```
Phase 1: System Analysis
├── Run detection commands
├── Check prerequisites
├── Find conflicts
└── Present findings to user

Phase 2: User Questions (AskUserQuestion)
├── Q1: Handle missing prerequisites
├── Q2: Resolve conflicts (if any)
├── Q3: Optional features (if any)
└── Q4: Final confirmation

Phase 3: Backup (if needed)
└── Create timestamped backup

Phase 4: Installation (TodoWrite for progress)
├── Create directories
├── Copy files from src/
├── Install dependencies
└── Pack-specific steps

Phase 5: Verification
└── Run all VERIFY.md checks
```

**Key tools used:**
- **AskUserQuestion** - For user decisions at each decision point
- **TodoWrite** - For progress tracking (user sees what's happening)
- **VERIFY.md** - For validation (all checks must pass)

See `Tools/InstallTemplate.md` for the complete INSTALL.md template.

---

## 🚨 CRITICAL: Full Implementation Required (For AI Agents)

> **FOR AI AGENTS INSTALLING PACKS:** This section is MANDATORY. Read it before installing ANY pack.

### The Problem

AI agents often "helpfully" simplify pack implementations. Instead of copying the full 268-line documented specification, they create a 50-line "equivalent" version. **This is WRONG.**

### The Rule

**Copy the COMPLETE files from `src/`. No simplification. No shortcuts. No "equivalents."**

When a pack contains a 500-line TypeScript file, you copy all 500 lines. When it specifies 8 files, you copy all 8 files. When it includes detailed YAML with 100 entries, you include all 100 entries.

### Why This Matters

- Packs are **production-tested** - every line exists for a reason
- "Simplified" versions break integration with other packs
- Missing configuration causes silent failures
- Users shouldn't need multiple correction cycles

### Anti-Simplification Directives

1. **NEVER reduce code complexity** - If the pack has verbose implementations, keep them verbose
2. **NEVER skip optional sections** - "Optional" means optional for the user, not for you to omit
3. **NEVER create "equivalent" versions** - Copy the EXACT files from `src/`
4. **NEVER summarize YAML/JSON** - Include every field, every entry, every comment
5. **ALWAYS complete VERIFY.md** - If any check fails, installation is NOT complete

### Mandatory Completion Checklist

**After every pack installation, you MUST complete the VERIFY.md checklist:**

```markdown
## Installation Verification

- [ ] All directories from INSTALL.md created
- [ ] All files from `src/` copied to target locations
- [ ] Each code file contains COMPLETE implementation (diff check)
- [ ] YAML/JSON files contain ALL entries (not summarized)
- [ ] Dependencies installed (bun add, etc.)
- [ ] Verification commands from VERIFY.md run and passed
```

**If ANY checkbox fails, you have NOT completed the installation.**

---

## System Architecture

<p align="center">
  <img src="icons/pai-system-architecture-v3.png" alt="PAI System Architecture" width="100%">
</p>

**PAI organizes capabilities in a clear hierarchy:**

```
PAI System
    └── Bundles (curated collections for specific goals)
            └── Packs (individual capabilities)
                    └── Contents (code, hooks, tools, workflows, config)
```

- **Bundles** group related packs that work well together
- **Packs** are self-contained capabilities you can install independently
- **Contents** are the actual code, hooks, tools, and configuration inside each pack

---

## Available Packs

| Pack | Version | Category | Description |
|------|---------|----------|-------------|
| [**pai-hook-system**](pai-hook-system/) | 1.0.0 | Foundation | Event-driven automation framework - the foundation for all hook-based capabilities |
| [**pai-history-system**](pai-history-system/) | 1.0.0 | Infrastructure | Granular context-tracking that captures all work, decisions, and learnings automatically |
| [**pai-core-install**](pai-core-install/) | 1.2.0 | Core | Skills + Identity + Architecture - the complete foundation with routing, response format, and tracking |
| [**pai-voice-system**](pai-voice-system/) | 1.1.0 | Notifications | Voice notifications with ElevenLabs TTS and prosody enhancement for natural speech |
| [**pai-observability-server**](pai-observability-server/) | 1.0.0 | Observability | Real-time multi-agent monitoring dashboard with WebSocket streaming |
| [**pai-art-skill**](pai-art-skill/) | 1.0.0 | Creativity | Visual content generation with Excalidraw hand-drawn aesthetic - diagrams, comics, illustrations |
| [**pai-agents-skill**](pai-agents-skill/) | 1.0.0 | Delegation | Dynamic agent composition - create custom agents with unique personalities, voices, and trait combinations |
| [**pai-prompting-skill**](pai-prompting-skill/) | 1.0.0 | Methodology | Meta-prompting system with Handlebars templates, Claude 4.x best practices, and the Ultimate Prompt Template |
| [**pai-browser-skill**](pai-browser-skill/) | 1.2.0 | Automation | Debug-first browser automation with Playwright - always-on diagnostics, session auto-start, 99% token savings |
| [**pai-upgrades-skill**](pai-upgrades-skill/) | 1.0.0 | Maintenance | Track and manage PAI system upgrades - monitors for new features, tracks opportunities, maintains upgrade history |
| [**pai-knowledge-system**](pai-knowledge-system/) | 1.0.0 | Infrastructure | Persistent knowledge management with Graphiti + FalkorDB - automatic entity extraction, semantic search, relationship mapping |

---

## Installation Order

Packs have dependencies. Install in this order:

```
1. pai-hook-system            ← Foundation (no dependencies)
2. pai-history-system         ← Depends on hooks
3. pai-core-install           ← Depends on hooks, history
4. pai-prompting-skill        ← Depends on core-install
5. pai-voice-system           ← Depends on hooks, core-install
6. pai-agents-skill           ← Depends on core-install, optional voice-system
7. pai-art-skill              ← Depends on core-install
8. pai-browser-skill          ← Optional, standalone (only needs Bun + Playwright)
9. pai-observability-server   ← Optional, depends on hooks
10. pai-upgrades-skill        ← Optional, depends on core-install
11. pai-knowledge-system      ← Optional, depends on history (Docker + FalkorDB required)
```

**Or install the complete [PAI Bundle](../Bundles/Official/)** which handles ordering automatically.

---

## How to Install a Pack

### Option 1: AI-Assisted (Recommended)

Give the pack directory to your AI agent:

```
Install the pai-hook-system pack from PAI/Packs/pai-hook-system/.
Use PAI_DIR="~/.config/pai" and DA="MyAI".
```

Your AI will:
1. Read `README.md` for context
2. Follow `INSTALL.md` step by step
3. Copy files from `src/` to your system
4. Complete `VERIFY.md` checklist

### Option 2: Manual

1. Open the pack's `INSTALL.md`
2. Follow each step, copying files from `src/` to the specified locations
3. Complete the `VERIFY.md` checklist to confirm success

---

## Authentication

**All API keys live in ONE place: `$PAI_DIR/.env`**

Packs that require API keys (Voice, Art, etc.) all read from a single environment file. No keys should ever be stored in pack files, configs, or code.

```bash
# Copy the example and add your keys
cp ../.env.example $PAI_DIR/.env
nano $PAI_DIR/.env
```

See [.env.example](../.env.example) for the complete list of supported variables.

---

## Pack Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Foundation** | Core infrastructure that other packs depend on | Hook System |
| **Infrastructure** | Systems that run automatically in the background | History System |
| **Observability** | Real-time monitoring and debugging tools | Observability Server |
| **Routing** | Intent detection and capability dispatch | Skill System |
| **Notifications** | User feedback and accessibility | Voice System |
| **Personality** | Identity, response format, principles | Identity |
| **Delegation** | Agent orchestration and parallel execution | Agents Skill |
| **Creativity** | Visual and creative content generation | Art Skill |
| **Methodology** | Prompt engineering and meta-prompting | Prompting Skill |
| **Automation** | Browser automation and web verification | Browser Skill |

---

## Creating Your Own Pack

See [PAIPackTemplate.md](../Tools/PAIPackTemplate.md) for the complete pack specification.
See [InstallTemplate.md](../Tools/InstallTemplate.md) for the wizard-style INSTALL.md template.

**Quick checklist for directory-based packs:**
- [ ] `README.md` with YAML frontmatter, problem/solution, architecture
- [ ] `INSTALL.md` with wizard-style phases (analysis, questions, install, verify)
- [ ] `VERIFY.md` with mandatory completion checklist
- [ ] `src/` directory with actual code files (not embedded in markdown)
- [ ] 256x256 transparent icon in `icons/`
- [ ] Complete, working code (no snippets or placeholders)

---

## Pack Quality Standards

Every pack in this directory must be:

1. **Complete** - Everything needed to install, no missing components
2. **Self-contained** - Works without external documentation
3. **Tested** - Verified working in production (extracted from Kai)
4. **Sanitized** - No personal data, credentials, or hardcoded paths
5. **Documented** - Clear problem statement, solution, and examples
6. **Verifiable** - VERIFY.md checklist confirms successful installation

---

## Migration from v1.0 (Single-File) to v2.0 (Directory)

If you have existing single-file packs:

1. Create directory with pack name (e.g., `pai-hook-system/`)
2. Extract frontmatter and overview sections to `README.md`
3. Extract installation steps to `INSTALL.md`
4. Extract verification steps to `VERIFY.md`
5. Extract code blocks to actual files in `src/`
6. Update any pack references to use directory paths

---

## Related

- [**Bundles/**](../Bundles/) - Curated collections of packs
- [**PAIPackTemplate.md**](../Tools/PAIPackTemplate.md) - Full pack specification
- [**README.md**](../README.md) - PAI project overview

---

*Each pack is extracted from Daniel Miessler's production Kai system - battle-tested capabilities packaged for anyone to use.*
