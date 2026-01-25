---
name: PAI CreateCLI Skill
pack-id: danielmiessler-createcli-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Automated CLI generation system - create production-ready TypeScript CLIs with comprehensive documentation, type safety, and error handling
type: skill
purpose-type: [development, productivity, automation]
platform: claude-code
dependencies: []
keywords: [cli, command-line, typescript, bun, automation, api-client, tool-generation, development, code-generation, llcli]
---

<p align="center">
  <img src="../icons/pai-createcli-skill.png" alt="PAI CreateCLI Skill" width="256">
</p>

# PAI CreateCLI Skill

> Generate production-ready TypeScript CLIs in minutes following the battle-tested llcli pattern

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds the CreateCLI skill - an automated CLI generation system that produces production-quality TypeScript command-line interfaces. Instead of writing CLIs from scratch every time, you get complete, immediately usable tools with:

- Full type safety and comprehensive error handling
- Documentation (README + QUICKSTART) following CLI-First Architecture
- Three-tier template system (manual parsing, Commander.js, oclif reference)
- Quality validation gates ensuring production readiness

**Core principle:** "I need a CLI for X" becomes a production tool in minutes.

The skill follows the proven llcli pattern - a 327-line TypeScript CLI that demonstrates the optimal balance of simplicity, completeness, and maintainability.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill Definition | `skills/CreateCLI/SKILL.md` | Routing, activation triggers, capabilities overview |
| Framework Comparison | `skills/CreateCLI/FrameworkComparison.md` | Manual vs Commander vs oclif decision guide |
| CLI Patterns | `skills/CreateCLI/Patterns.md` | Reusable patterns from production CLIs |
| TypeScript Patterns | `skills/CreateCLI/TypescriptPatterns.md` | Type safety patterns from tsx, vite, bun |
| Create Workflow | `skills/CreateCLI/Workflows/CreateCli.md` | 10-step CLI generation process |
| Add Command Workflow | `skills/CreateCLI/Workflows/AddCommand.md` | Extend existing CLIs |
| Upgrade Tier Workflow | `skills/CreateCLI/Workflows/UpgradeTier.md` | Migrate from Tier 1 to Tier 2 |

**Summary:**
- **Files created:** 7
- **Workflows:** 3
- **Dependencies:** None (Bun runtime required)

---

## The Concept and/or Problem

Developers repeatedly face the same CLI creation pattern:

1. Start with a bash script
2. Realize it needs error handling
3. Realize it needs help text
4. Realize it needs type safety
5. Rewrite in TypeScript
6. Add comprehensive documentation
7. Now have a production-ready CLI

This cycle takes hours or days. Every API wrapper, data transformer, and automation tool follows the same journey. And each time:

- Architecture decisions are reinvented
- Help text formats vary wildly
- Error handling patterns differ
- Documentation quality is inconsistent
- Type safety is often an afterthought

**The deeper problem:** There's no standardized way to create CLIs that are:
- Deterministic (same input produces same output)
- Composable (JSON output pipes to jq, grep, other tools)
- Documented (users understand not just "how" but "why")
- Tested (predictable, verifiable behavior)

Without a system, every CLI is an island - different patterns, different quality, different maintainability.

---

## The Solution

The CreateCLI skill automates steps 1-7 with a systematic approach:

**Three-Tier Template System:**

| Tier | Framework | Use Case | % of CLIs |
|------|-----------|----------|-----------|
| **Tier 1** | Manual parsing (llcli pattern) | API clients, file processors, simple automation | 80% |
| **Tier 2** | Commander.js | 10+ commands with subgroups, plugins | 15% |
| **Tier 3** | oclif (reference only) | Enterprise-scale (Heroku CLI) | 5% |

**Decision Tree:** The skill uses deterministic criteria to select the right tier:
- Does it need 10+ commands with grouping? -> Tier 2
- Does it need plugin architecture? -> Tier 2
- Does it need git-style subcommands? -> Tier 2
- Otherwise -> Tier 1 (default)

**What Every Generated CLI Includes:**
1. Complete TypeScript implementation with strict mode
2. Comprehensive documentation (README + QUICKSTART)
3. Error handling with proper exit codes
4. Configuration management from ${PAI_DIR}/.env
5. Help text following CLI-First Architecture principles

---

## What Makes This Different

```
User Request: "Create a CLI for the GitHub API"
                         |
                         v
         +---------------+---------------+
         |   CreateCLI Skill Decision    |
         |         Tree Routing          |
         +---------------+---------------+
                         |
         +---------------+---------------+
         |     Tier Selection (1/2/3)    |
         |  Based on command complexity  |
         +---------------+---------------+
                         |
         +---------------+---------------+
         |    10-Step Generation Flow    |
         +---------------+---------------+
                         |
    +----+----+----+----+----+----+----+----+----+----+
    | 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9  | 10 |
    +----+----+----+----+----+----+----+----+----+----+
    |Req |Tier|Int |Cfg |Cmd |Hlp |Main|Doc |Sup |Val |
    |    |    |Def |    |    |Txt |    |    |File|    |
    +----+----+----+----+----+----+----+----+----+----+
                         |
                         v
         +---------------+---------------+
         |       Production CLI          |
         |  ~/.claude/Bin/ghcli/         |
         |  ghcli.ts (350 lines)         |
         |  README.md, QUICKSTART.md     |
         |  package.json, tsconfig.json  |
         +-------------------------------+
```

**Architecture Layers:**

1. **SKILL.md** - Activation triggers and routing (loaded first)
2. **Reference Docs** - Framework comparison, patterns (loaded on-demand)
3. **Workflows/** - Step-by-step procedures for each operation
4. **Quality Gates** - Validation before declaring success

**Why This Architecture Matters:**

The skill encodes expert knowledge about CLI development:
- When manual parsing beats frameworks (80% of cases)
- TypeScript patterns from tsx, vite, turbo, bun
- Error handling from pnpm, Shopify CLI
- Documentation patterns from llcli

A naive approach would just generate code. This approach:
- Routes to the right tier automatically
- Uses proven patterns from production CLIs
- Validates output before declaring success
- Produces consistent, maintainable results

---

## Why This Is Different

This sounds similar to Yeoman generators which also scaffold CLI tools. What makes this approach different?

Yeoman creates project scaffolding - directories, config files, basic structure. This skill creates COMPLETE, WORKING CLIs. You don't scaffold and then implement; you describe what you need and receive production-ready code with documentation, error handling, type safety, and configuration management already done.

- Complete implementation, not just project skeleton structure
- Intelligent tier selection based on actual requirements
- Documentation explains "why" not just "how" to use
- Quality gates validate output before declaring success

---

## Installation

See [INSTALL.md](INSTALL.md) for complete installation instructions.

---

## Invocation Scenarios

The skill activates on these patterns:

| Trigger | Example | Workflow |
|---------|---------|----------|
| **Create CLI** | "Create a CLI for the Notion API" | CreateCli.md |
| **Build CLI** | "Build a command-line tool for CSV processing" | CreateCli.md |
| **Add command** | "Add search command to ghcli" | AddCommand.md |
| **Extend CLI** | "Extend notioncli with export feature" | AddCommand.md |
| **Upgrade tier** | "Upgrade ghcli to use Commander" | UpgradeTier.md |

**Context-based activation:**
- User describes repetitive API calls -> Suggest CLI
- User mentions "I keep typing this command" -> Suggest CLI wrapper
- User has bash script doing complex work -> Suggest TypeScript CLI replacement

---

## Example Usage

### Example 1: API Client CLI (Tier 1)

**Request:** "Create a CLI for the GitHub API that can list repos, create issues, and search code"

**Generated:**
```
~/.claude/Bin/ghcli/
  ghcli.ts              # 350 lines, complete implementation
  package.json          # Bun + TypeScript configuration
  tsconfig.json         # Strict mode enabled
  .env.example          # GITHUB_TOKEN=your_token
  README.md             # Full documentation with philosophy
  QUICKSTART.md         # Common use cases
```

**Usage:**
```bash
ghcli repos --user exampleuser
ghcli issues create --repo pai --title "Bug fix"
ghcli search "typescript CLI"
ghcli --help
```

### Example 2: File Processor (Tier 1)

**Request:** "Build a CLI to convert markdown files to HTML with frontmatter extraction"

**Generated:**
```bash
md2html convert input.md output.html
md2html batch *.md output/
md2html extract-frontmatter post.md
```

### Example 3: Data Pipeline (Tier 2 - Commander.js)

**Request:** "Create a CLI for data transformation with multiple formats, validation, and analysis"

**Generated:**
```bash
data-cli convert json csv input.json --output data.csv
data-cli validate schema data.json --strict
data-cli analyze stats data.csv
data-cli transform filter --column=status --value=active
```

---

## Configuration

**No global configuration required.**

Each generated CLI configures itself:
- API keys: `${PAI_DIR}/.env` (per PAI convention)
- Output directory: `${PAI_DIR}/Bin/[cli-name]/` (default)
- Project CLIs: `~/Projects/[project-name]/` (when specified)

**Bun runtime required:**
```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Customization

### Recommended Customization

**What to Customize:** Add organization-specific patterns to Patterns.md

**Why:** If your team has specific CLI conventions (error codes, logging format, configuration paths), codifying them ensures all generated CLIs follow the same standards.

**Process:**
1. Identify your team's CLI patterns
2. Add them to `skills/CreateCLI/Patterns.md`
3. Reference them in the CreateCli workflow

**Expected Outcome:** All generated CLIs follow your organization's standards automatically.

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Default output directory | SKILL.md | Changes where CLIs are created |
| Additional tier templates | Workflows/CreateCli.md | New generation patterns |
| Framework preferences | FrameworkComparison.md | Different tier recommendations |

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of PAI infrastructure
- **Reference implementation**: llcli (Limitless.ai CLI) - 327 lines, zero dependencies, production-ready
- **Research sources**: tsx, vite, turbo, bun, pnpm, Shopify CLI

---

## Related Work

- **Commander.js** - Framework used for Tier 2 CLIs
- **oclif** - Reference for enterprise-scale Tier 3 patterns
- **cleye** - Alternative type-safe CLI library (mentioned in patterns)

---

## Works Well With

- **pai-development-skill** - For complex feature development
- **pai-core-install** - Core PAI infrastructure

---

## Recommended

- **Bun runtime** - Required for generated CLIs
- **jq** - For parsing CLI JSON output

---

## Relationships

### Parent Of
*None*

### Child Of
*None*

### Sibling Of
- **Development Skill** - For non-CLI development work

### Part Of Collection
- **PAI Development Tools** - Development productivity packs

---

## Changelog

### 2.3.0 - 2026-01-14
- Initial PAI pack release
- Three-tier template system (manual, Commander.js, oclif reference)
- Configuration flags standard (mode, output, resource flags)
- Quality gates for validation
- Comprehensive documentation patterns

### History (Pre-Pack)
- Developed as internal skill in PAI system
- Based on llcli production implementation
- Refined through dozens of CLI generations
