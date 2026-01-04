---
name: Kai Core Install
pack-id: danielmiessler-kai-core-install-v1.0.1
version: 1.0.1
author: danielmiessler
description: Complete PAI core installation - skill routing, identity system, and architecture tracking. The foundation pack that makes everything else work. Includes SKILL.md format, intent-based routing, personality calibration, and the 14 founding principles.
type: feature
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies:
  - kai-hook-system (required) - Hooks enable session context loading and events
  - kai-history-system (optional) - History capture for skill usage and learnings
keywords: [core, identity, skills, routing, architecture, installation, foundation, personality, response-format, principles]
---

<p align="center">
  <img src="icons/kai-core-install.png" alt="Kai Core Install" width="256">
</p>

# Kai Core Install (kai-core-install)

> The complete foundation for Personal AI Infrastructure - skill routing, identity framework, and architecture tracking in one unified pack.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

This Pack provides the complete foundation for your Personal AI infrastructure:

**Part 1: Skill System**
- **SKILL.md Format**: Standardized structure for all capabilities
- **Intent Matching**: AI activates skills based on natural language triggers
- **Workflow Routing**: Skills route to specific step-by-step procedures
- **Dynamic Loading**: Only load context when actually needed
- **Skill Discovery**: Search and browse available skills

**Part 2: Identity Framework**
- **Mandatory Response Format**: Structured output with emoji sections that integrates with voice
- **Personality Calibration**: Numeric precision for traits like enthusiasm (60/100), precision (95/100)
- **Operating Constitution**: Core values and non-negotiable principles
- **14 Founding Principles**: Architectural philosophy for building AI infrastructure
- **First-Person Voice**: Natural, embodied communication as a collaborator

**Part 3: Architecture Tracking**
- **PAI Architecture.md**: Auto-generated tracking of installed packs, bundles, and plugins
- **Upgrade History**: Running record of all changes to your PAI system
- **System Health**: Status checks for all installed components

**Core principle:** Your AI infrastructure needs both structure (skill routing) AND soul (identity). This pack provides both.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| CORE skill | `skills/CORE/SKILL.md` | Main identity and routing hub |
| Skill system docs | `skills/CORE/SkillSystem.md` | Skill routing architecture |
| Architecture tracker | `skills/CORE/Architecture.md` | Auto-generated system status |
| Architecture tool | `Tools/PaiArchitecture.ts` | Generate architecture tracking |
| CreateSkill templates | `skills/CreateSkill/` | Templates for new skills |
| Identity & Principles | `skills/CORE/Constitution.md` | 14 founding principles |

**Summary:**
- **Files created:** 10+ (skill files, templates, tools)
- **Hooks registered:** 0 (uses hook system from kai-hook-system)
- **Dependencies:** kai-hook-system (required), kai-history-system (optional)

---

# PART 1: THE PROBLEM

## Why You Need This

### Without a Skill System

1. **No Reusability** - You repeat the same instructions every session
2. **No Organization** - Workflows scattered across prompts and files
3. **No Discovery** - AI doesn't know what it can do
4. **Context Bloat** - Loading everything wastes tokens
5. **Inconsistent Quality** - No standardized workflow format

### Without Identity

1. **Inconsistent in tone** - Different responses feel like different people
2. **Variable in output format** - No predictable structure to parse or voice
3. **Unpredictable in personality** - Sometimes formal, sometimes casual, never coherent
4. **Generic and impersonal** - No sense of working with a specific collaborator

### Without Architecture Tracking

1. **No visibility** - Can't tell what's installed or what version
2. **No history** - No record of changes made
3. **No health checks** - Can't verify system is working correctly
4. **No upgrade path** - No way to track what needs updating

---

# PART 2: THE SOLUTION

This pack provides a unified solution with three integrated components:

| Component | Purpose | Integration |
|-----------|---------|-------------|
| **Skill System** | Capability routing and management | Intent matching, workflow routing |
| **Identity Framework** | WHO the AI is, HOW it responds | Voice output, history capture |
| **Architecture Tracking** | WHAT's installed, version history | Health checks, upgrade tracking |

## Why This Is Different

This sounds similar to system prompts or ChatGPT's Custom GPTs. What makes this approach different?

**System prompts** load everything upfront - all context, all instructions, all the time. Token budgets explode. Custom GPTs are static and monolithic.

**Kai Core Install** provides:
- **Layered routing** with dynamic loading at each layer
- **Constitutional framework** with mandatory response formats
- **Numeric calibration** with precise personality settings
- **Integration contracts** with voice and history systems
- **Auto-generated tracking** of installed components

---

# PART 3: SKILL SYSTEM ARCHITECTURE

## The CORE Skill: Foundation of Everything

The CORE skill is not just another skill. It is THE foundational skill that makes the entire system work.

### CORE Auto-Loads at Session Start

```
┌─────────────────────────────────────────────────────────────────┐
│                   SESSION STARTUP SEQUENCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Claude Code starts                                          │
│         │                                                       │
│         ▼                                                       │
│  2. SessionStart hook fires                                     │
│         │                                                       │
│         ▼                                                       │
│  3. ┌──────────────────────────────────────────────────────┐    │
│     │  🚨 CORE SKILL LOADS AUTOMATICALLY                   │    │
│     │                                                      │    │
│     │  • Identity & Personality → WHO the AI is            │    │
│     │  • Response Format → HOW it responds                 │    │
│     │  • Stack Preferences → WHAT it recommends            │    │
│     │  • Contact Directory → WHO you know                  │    │
│     │  • Security Protocols → WHAT it protects             │    │
│     │  • Workflow Routing Table → WHAT it can do           │    │
│     └──────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  4. AI is NOW personalized with YOUR context                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CORE in the Skill Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│              SKILL LOADING TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 0: CORE (Automatic)                                       │
│  ════════════════════════                                       │
│  • Loads at session start                                       │
│  • NO trigger required                                          │
│  • ALWAYS present                                               │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 1: Frontmatter Only (System Prompt)                       │
│  ════════════════════════════════════════                       │
│  • SKILL.md frontmatter always in context                       │
│  • USE WHEN triggers enable intent routing                      │
│  • Minimal token cost                                           │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 2: Full Skill (On Invoke)                                 │
│  ════════════════════════════════                               │
│  • SKILL.md body loads when triggered                           │
│  • Workflow routing table available                             │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 3: Workflow (On Route)                                    │
│  ════════════════════════════                                   │
│  • Specific workflow.md loads on routing                        │
│  • Step-by-step instructions                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## The 5 Routing Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE 5 ROUTING LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SKILL.md Frontmatter    → System prompt (always loaded)     │
│         │                      - name, description, USE WHEN    │
│         ▼                                                       │
│  2. SKILL.md Body           → Main skill content (on invoke)    │
│         │                      - Workflow routing table         │
│         ▼                                                       │
│  3. Context Files           → Topic-specific context (on-demand)│
│         │                      - CoreStack.md, Contacts.md      │
│         ▼                                                       │
│  4. Workflows/              → HOW to do things (explicit steps) │
│         │                      - Step-by-step procedures        │
│         ▼                                                       │
│  5. Tools/                  → CLI tools (deterministic code)    │
│                                - TypeScript CLI programs        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1: SKILL.md Frontmatter (Always Loaded)

```yaml
---
name: Art
description: Visual content system. USE WHEN art, header images, visualizations, diagrams, PAI icon.
---
```

### Layer 2: SKILL.md Body (On Invocation)

```markdown
# Art Skill

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Essay** | blog header | `Workflows/Essay.md` |
| **CreatePAIPackIcon** | PAI icon | `Workflows/CreatePAIPackIcon.md` |
```

### Layer 3: Context Files (On-Demand)

```
skills/Art/
├── SKILL.md              # Routing + quick ref
├── Aesthetic.md          # Context: design philosophy
├── ColorPalette.md       # Context: brand colors
└── Examples.md           # Context: reference examples
```

### Layer 4: Workflows (Explicit Procedures)

```
skills/Art/Workflows/
├── Essay.md              # How to create blog headers
├── CreatePAIPackIcon.md  # How to create PAI icons
└── TechnicalDiagrams.md  # How to create diagrams
```

### Layer 5: Tools (Deterministic CLI Programs)

```
skills/Art/Tools/
├── Generate.ts           # Image generation CLI
└── Generate.help.md      # Tool documentation
```

---

# PART 4: IDENTITY FRAMEWORK

## The 5-Layer Constitutional Identity Framework

```
┌──────────────────────────────────────────────────────────────────┐
│                  CONSTITUTIONAL IDENTITY FRAMEWORK               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  1. CONSTITUTIONAL FOUNDATION    Non-negotiable principles  │  │
│  │     14 Founding Principles       Permission to fail         │  │
│  │     Security protocols           Prompt injection defense   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  2. PERSONALITY CALIBRATION      Numeric trait precision    │  │
│  │     humor: 60/100                excitement: 60/100         │  │
│  │     curiosity: 90/100            precision: 95/100          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  3. RESPONSE FORMAT              Mandatory structure        │  │
│  │     📋 SUMMARY                   📁 CAPTURE                 │  │
│  │     🔍 ANALYSIS                  ➡️ NEXT                    │  │
│  │     ⚡ ACTIONS / ✅ RESULTS       📖 STORY EXPLANATION       │  │
│  │     📊 STATUS                    🎯 COMPLETED               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  4. VOICE INTEGRATION            Speech output extraction   │  │
│  │     🎯 COMPLETED line            → stop-hook extracts       │  │
│  │     📁 CAPTURE section           → history system stores    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  5. IDENTITY OUTPUT              First-person behavior      │  │
│  │     "I can help" not             Consistent personality     │  │
│  │     "the assistant can"          across all responses       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## The Mandatory Response Format

```
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
📊 STATUS: [Current state]
📁 CAPTURE: [Context to preserve]
➡️ NEXT: [Recommended steps]
📖 STORY EXPLANATION:
1. [Point 1]
2. [Point 2]
...
8. [Point 8]
🎯 COMPLETED: [12 words max - drives voice output]
```

**Why This Format Matters:**

1. **Voice Integration** - The 🎯 COMPLETED line is extracted and spoken
2. **History Capture** - 📁 CAPTURE feeds the history system
3. **Predictable Parsing** - Consistent structure enables automation
4. **Scannable Output** - Emoji headers make responses easy to skim

## Personality Calibration

```yaml
personality:
  humor: 60        # Moderate wit
  excitement: 60   # Measured enthusiasm
  curiosity: 90    # Highly inquisitive
  precision: 95    # Exact details
  professionalism: 75  # Competent without stuffy
  directness: 80   # Clear communication
```

---

# PART 5: PAI ARCHITECTURE TRACKING (NEW)

## What It Tracks

The PAI Architecture system provides visibility into your installation:

| Category | What's Tracked |
|----------|---------------|
| **Packs** | All installed packs with versions and dates |
| **Bundles** | Which bundles are installed |
| **Plugins** | Active hooks, tools, and services |
| **Upgrades** | Complete history of all changes |
| **Health** | Status of each component |

## Auto-Generated Architecture.md

The `PaiArchitecture.ts` tool generates `$PAI_DIR/skills/CORE/Architecture.md` with:

```markdown
# PAI Architecture

> Auto-generated tracking file. Run `bun $PAI_DIR/Tools/PaiArchitecture.ts generate` to refresh.

**Last Updated:** 2025-12-29T10:30:00Z

## Installation Summary

| Category | Count | Status |
|----------|-------|--------|
| Packs | 4 | All healthy |
| Bundles | 1 | Installed |
| Plugins | 6 | Active |
| Upgrades | 12 | Applied |

## Installed Packs

| Pack | Version | Installed | Status |
|------|---------|-----------|--------|
| kai-hook-system | 1.0.0 | 2025-12-29 | Healthy |
| kai-history-system | 1.0.0 | 2025-12-29 | Healthy |
| kai-core-install | 1.0.0 | 2025-12-29 | Healthy |
| kai-voice-system | 1.1.0 | 2025-12-29 | Healthy |

## Upgrade History

| Date | Type | Description |
|------|------|-------------|
| 2025-12-29 | Pack | Initial kai-core-install installation |
| 2025-12-28 | Config | Updated personality calibration |

## System Health

- Hook System: ✓ Healthy (4 active hooks)
- History System: ✓ Healthy (147 sessions captured)
- Skills: ✓ 12 loaded (1 CORE, 11 deferred)
```

---

# PART 6: INSTALLATION

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **Write access** to `$PAI_DIR/` (or your PAI directory)
- **kai-hook-system Pack** installed (required for session context loading)

---

## Pre-Installation: System Analysis

### Step 0.1: Verify Environment and Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# Check for hook system (required)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ Hook system is installed (required)"
else
  echo "❌ Hook system NOT installed - install kai-hook-system first!"
fi

# Check for history system (optional)
if [ -d "$PAI_CHECK/history" ]; then
  echo "✓ History system is installed (optional)"
else
  echo "ℹ️  History system not installed (skill usage won't be logged)"
fi
```

### Step 0.2: Detect Existing Installation

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for existing Skills directory
if [ -d "$PAI_CHECK/skills" ]; then
  echo "⚠️  Skills directory EXISTS at: $PAI_CHECK/skills"
  ls -la "$PAI_CHECK/skills" 2>/dev/null

  if [ -d "$PAI_CHECK/skills/CORE" ]; then
    echo ""
    echo "⚠️  CORE skill directory exists - will merge/update"
  fi
else
  echo "✓ No existing Skills directory (clean install)"
fi
```

### Step 0.3: Backup Existing (If Needed)

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

if [ -d "$PAI_CHECK/skills/CORE" ]; then
  mkdir -p "$BACKUP_DIR/skills"
  cp -r "$PAI_CHECK/skills/CORE" "$BACKUP_DIR/skills/CORE"
  echo "✓ Backed up CORE skill to $BACKUP_DIR/skills/CORE"
fi
```

---

## Step 1: Create Directory Structure

```bash
# Create the Skills directory
mkdir -p $PAI_DIR/skills/CORE/Workflows
mkdir -p $PAI_DIR/skills/CORE/Tools
mkdir -p $PAI_DIR/skills/CreateSkill/Workflows
mkdir -p $PAI_DIR/skills/CreateSkill/Tools
mkdir -p $PAI_DIR/Tools
```

---

## Step 2: Create SkillSystem.md

Save the following to `$PAI_DIR/skills/CORE/SkillSystem.md`:

```markdown
# Custom Skill System

**The MANDATORY configuration system for ALL skills.**

## THIS IS THE AUTHORITATIVE SOURCE

This document defines the **required structure** for every skill in the system.

## TitleCase Naming Convention (MANDATORY)

**All naming in the skill system MUST use TitleCase (PascalCase).**

| Component | Wrong | Correct |
|-----------|-------|---------|
| Skill directory | `createskill`, `create-skill` | `CreateSkill` |
| Workflow files | `create.md`, `update-info.md` | `Create.md`, `UpdateInfo.md` |
| Tool files | `manage-server.ts` | `ManageServer.ts` |
| YAML name | `name: create-skill` | `name: CreateSkill` |

## The Required Structure

Every SKILL.md has two parts:

### 1. YAML Frontmatter (Single-Line Description)

```yaml
---
name: SkillName
description: [What it does]. USE WHEN [intent triggers using OR]. [Additional capabilities].
---
```

**Rules:**
- `name` uses **TitleCase**
- `description` is a **single line** (not multi-line with `|`)
- `USE WHEN` keyword is **MANDATORY**
- Max 1024 characters

### 2. Markdown Body (Workflow Routing + Examples)

```markdown
# SkillName

[Brief description]

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **WorkflowOne** | "trigger phrase" | `Workflows/WorkflowOne.md` |

## Examples

**Example 1: [Use case]**
\`\`\`
User: "[Request]"
→ Invokes WorkflowOne workflow
→ [Result]
\`\`\`
```

## Directory Structure

```
SkillName/
├── SKILL.md              # Main skill file
├── QuickStartGuide.md    # Context files in root (TitleCase)
├── Tools/                # CLI tools (ALWAYS present)
│   └── ToolName.ts
└── Workflows/            # Work execution workflows
    └── Create.md
```

## Complete Checklist

- [ ] Skill directory uses TitleCase
- [ ] YAML `name:` uses TitleCase
- [ ] Single-line `description` with `USE WHEN` clause
- [ ] `## Workflow Routing` section with table format
- [ ] `## Examples` section with 2-3 usage patterns
- [ ] `Tools/` directory exists (even if empty)
- [ ] All workflow files use TitleCase
```

---

## Step 3: Create SkillSearch Tool

Save to `$PAI_DIR/Tools/SkillSearch.ts`:

```typescript
#!/usr/bin/env bun
/**
 * SkillSearch.ts
 *
 * Search the skill index to discover capabilities dynamically.
 *
 * Usage:
 *   bun run $PAI_DIR/Tools/SkillSearch.ts <query>
 *   bun run $PAI_DIR/Tools/SkillSearch.ts --list
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const INDEX_FILE = join(PAI_DIR, 'skills', 'skill-index.json');

interface SkillEntry {
  name: string;
  path: string;
  fullDescription: string;
  triggers: string[];
  workflows: string[];
  tier: 'always' | 'deferred';
}

interface SkillIndex {
  generated: string;
  totalSkills: number;
  skills: Record<string, SkillEntry>;
}

function searchSkills(query: string, index: SkillIndex) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const results: { skill: SkillEntry; score: number }[] = [];

  for (const [key, skill] of Object.entries(index.skills)) {
    let score = 0;

    if (key.includes(query.toLowerCase())) score += 10;

    for (const term of queryTerms) {
      for (const trigger of skill.triggers) {
        if (trigger.includes(term)) score += 5;
      }
      if (skill.fullDescription.toLowerCase().includes(term)) score += 2;
    }

    if (score > 0) results.push({ skill, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

async function main() {
  if (!existsSync(INDEX_FILE)) {
    console.error('❌ Skill index not found. Run GenerateSkillIndex.ts first.');
    process.exit(1);
  }

  const index: SkillIndex = JSON.parse(await readFile(INDEX_FILE, 'utf-8'));
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.length === 0) {
    console.log(`\n📚 Skill Index (${index.totalSkills} skills)\n`);
    for (const skill of Object.values(index.skills).sort((a, b) => a.name.localeCompare(b.name))) {
      const icon = skill.tier === 'always' ? '🔒' : '📦';
      console.log(`  ${icon} ${skill.name.padEnd(20)} │ ${skill.triggers.slice(0, 3).join(', ')}`);
    }
    return;
  }

  const query = args.join(' ');
  const results = searchSkills(query, index).slice(0, 5);

  console.log(`\n🔍 Searching for: "${query}"\n`);
  for (const { skill, score } of results) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`${skill.tier === 'always' ? '🔒' : '📦'} **${skill.name}** (score: ${score})`);
    console.log(`Path: ${skill.path}`);
    console.log(`Workflows: ${skill.workflows.join(', ')}`);
  }
}

main().catch(console.error);
```

---

## Step 4: Create GenerateSkillIndex Tool

Save to `$PAI_DIR/Tools/GenerateSkillIndex.ts`:

```typescript
#!/usr/bin/env bun
/**
 * GenerateSkillIndex.ts
 *
 * Parses all SKILL.md files and builds a searchable index.
 *
 * Usage: bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const SKILLS_DIR = join(PAI_DIR, 'skills');
const OUTPUT_FILE = join(SKILLS_DIR, 'skill-index.json');

const ALWAYS_LOADED_SKILLS = ['CORE', 'Development', 'Research'];

async function findSkillFiles(dir: string): Promise<string[]> {
  const skillFiles: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const skillMdPath = join(dir, entry.name, 'SKILL.md');
      if (existsSync(skillMdPath)) skillFiles.push(skillMdPath);
    }
  }
  return skillFiles;
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const nameMatch = match[1].match(/^name:\s*(.+)$/m);
  const descMatch = match[1].match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || ''
  };
}

function extractTriggers(description: string): string[] {
  const triggers: string[] = [];
  const useWhenMatch = description.match(/USE WHEN[^.]+/gi);

  if (useWhenMatch) {
    for (const match of useWhenMatch) {
      const words = match.replace(/USE WHEN/gi, '').split(/[,\s]+/)
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 2);
      triggers.push(...words);
    }
  }
  return [...new Set(triggers)];
}

async function main() {
  console.log('Generating skill index...\n');

  const skillFiles = await findSkillFiles(SKILLS_DIR);
  const index: any = {
    generated: new Date().toISOString(),
    totalSkills: 0,
    alwaysLoadedCount: 0,
    deferredCount: 0,
    skills: {}
  };

  for (const filePath of skillFiles) {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm?.name) continue;

    const tier = ALWAYS_LOADED_SKILLS.includes(fm.name) ? 'always' : 'deferred';
    const key = fm.name.toLowerCase();

    index.skills[key] = {
      name: fm.name,
      path: filePath.replace(SKILLS_DIR, '').replace(/^\//, ''),
      fullDescription: fm.description,
      triggers: extractTriggers(fm.description),
      workflows: [],
      tier
    };

    index.totalSkills++;
    if (tier === 'always') index.alwaysLoadedCount++;
    else index.deferredCount++;

    console.log(`  ${tier === 'always' ? '🔒' : '📦'} ${fm.name}`);
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Index generated: ${OUTPUT_FILE}`);
  console.log(`   Total: ${index.totalSkills} skills`);
}

main().catch(console.error);
```

---

## Step 5: Create PaiArchitecture Tool

Save to `$PAI_DIR/Tools/PaiArchitecture.ts`:

```typescript
#!/usr/bin/env bun
/**
 * PaiArchitecture.ts
 *
 * Scans the PAI installation and generates Architecture.md
 * tracking all installed packs, bundles, plugins, and upgrades.
 *
 * Usage:
 *   bun PaiArchitecture.ts generate    # Generate/refresh Architecture.md
 *   bun PaiArchitecture.ts status      # Show current state (stdout)
 *   bun PaiArchitecture.ts check       # Verify installation health
 *   bun PaiArchitecture.ts log-upgrade "description"  # Add upgrade entry
 */

import { readdir, readFile, writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const ARCHITECTURE_FILE = join(PAI_DIR, 'skills', 'CORE', 'PaiArchitecture.md');
const BUNDLES_FILE = join(PAI_DIR, '.installed-bundles.json');
const UPGRADES_FILE = join(PAI_DIR, 'history', 'Upgrades.jsonl');

interface PackInfo {
  name: string;
  version: string;
  installedDate: string;
  status: 'healthy' | 'warning' | 'error';
}

interface BundleInfo {
  name: string;
  packs: string[];
  installedDate: string;
}

interface UpgradeEntry {
  date: string;
  type: 'pack' | 'config' | 'bundle' | 'plugin';
  description: string;
}

async function detectInstalledPacks(): Promise<PackInfo[]> {
  const packs: PackInfo[] = [];
  const skillsDir = join(PAI_HOME, 'skills');

  if (!existsSync(skillsDir)) return packs;

  const entries = await readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const content = await readFile(skillFile, 'utf-8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);

    packs.push({
      name: nameMatch?.[1]?.trim() || entry.name,
      version: '1.0.0',
      installedDate: new Date().toISOString().split('T')[0],
      status: 'healthy'
    });
  }

  return packs;
}

async function detectInstalledBundles(): Promise<BundleInfo[]> {
  if (!existsSync(BUNDLES_FILE)) return [];

  try {
    const content = await readFile(BUNDLES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function loadUpgradeHistory(): Promise<UpgradeEntry[]> {
  if (!existsSync(UPGRADES_FILE)) return [];

  try {
    const content = await readFile(UPGRADES_FILE, 'utf-8');
    return content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

async function checkSystemHealth(): Promise<Record<string, string>> {
  const health: Record<string, string> = {};

  // Check hooks
  const hooksDir = join(PAI_HOME, 'hooks');
  health['Hook System'] = existsSync(hooksDir) ? '✓ Healthy' : '✗ Not installed';

  // Check history
  const historyDir = join(PAI_HOME, 'history');
  health['History System'] = existsSync(historyDir) ? '✓ Healthy' : '✗ Not installed';

  // Check skills
  const skillsDir = join(PAI_HOME, 'skills');
  if (existsSync(skillsDir)) {
    const skills = (await readdir(skillsDir)).filter(f => !f.startsWith('.') && !f.endsWith('.json'));
    health['skills'] = `✓ ${skills.length} loaded`;
  } else {
    health['skills'] = '✗ Not installed';
  }

  return health;
}

async function generateArchitectureMd(): Promise<string> {
  const packs = await detectInstalledPacks();
  const bundles = await detectInstalledBundles();
  const upgrades = await loadUpgradeHistory();
  const health = await checkSystemHealth();

  let md = `# PAI Architecture

> Auto-generated tracking file. Run \`bun $PAI_DIR/Tools/PaiArchitecture.ts generate\` to refresh.

**Last Updated:** ${new Date().toISOString()}

## Installation Summary

| Category | Count |
|----------|-------|
| Packs | ${packs.length} |
| Bundles | ${bundles.length} |
| Upgrades | ${upgrades.length} |

## Installed Packs

| Pack | Version | Status |
|------|---------|--------|
${packs.map(p => `| ${p.name} | ${p.version} | ${p.status} |`).join('\n')}

## Upgrade History

| Date | Type | Description |
|------|------|-------------|
${upgrades.slice(-10).reverse().map(u => `| ${u.date} | ${u.type} | ${u.description} |`).join('\n') || '| - | - | No upgrades recorded |'}

## System Health

${Object.entries(health).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

---

*This file is auto-generated. Do not edit manually.*
`;

  return md;
}

async function logUpgrade(description: string, type: string = 'pack'): Promise<void> {
  const entry: UpgradeEntry = {
    date: new Date().toISOString().split('T')[0],
    type: type as any,
    description
  };

  const dir = join(PAI_HOME, 'history');
  if (!existsSync(dir)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(dir, { recursive: true });
  }

  await appendFile(UPGRADES_FILE, JSON.stringify(entry) + '\n');
  console.log(`✓ Logged upgrade: ${description}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  switch (command) {
    case 'generate':
      const md = await generateArchitectureMd();
      await writeFile(ARCHITECTURE_FILE, md);
      console.log(`✓ Generated: ${ARCHITECTURE_FILE}`);
      break;

    case 'status':
      console.log(await generateArchitectureMd());
      break;

    case 'check':
      const health = await checkSystemHealth();
      console.log('\n📊 System Health Check\n');
      for (const [k, v] of Object.entries(health)) {
        console.log(`  ${k}: ${v}`);
      }
      break;

    case 'log-upgrade':
      if (!args[1]) {
        console.error('Usage: PaiArchitecture.ts log-upgrade "description"');
        process.exit(1);
      }
      await logUpgrade(args[1], args[2] || 'pack');
      break;

    default:
      console.log('Usage: PaiArchitecture.ts [generate|status|check|log-upgrade]');
  }
}

main().catch(console.error);
```

---

## Step 6: Create the CORE Skill

Save to `$PAI_DIR/skills/CORE/SKILL.md`:

**NOTE:** Placeholders in `[BRACKETS]` should be filled in during installation.

```markdown
---
name: CORE
description: Personal AI Infrastructure core. AUTO-LOADS at session start. USE WHEN any session begins OR user asks about identity, response format, contacts, stack preferences, security protocols, or asset management.
---

# CORE - Personal AI Infrastructure

**Auto-loads at session start.** This skill defines your AI's identity, response format, and core operating principles.

## Examples

**Example: Check contact information**
\`\`\`
User: "What's Angela's email?"
→ Reads Contacts.md
→ Returns contact information
\`\`\`

---

## Identity

**Assistant:**
- Name: [YOUR_AI_NAME]
- Role: [YOUR_NAME]'s AI assistant

**User:**
- Name: [YOUR_NAME]
- Profession: [YOUR_PROFESSION]

---

## Personality Calibration

| Trait | Value | Description |
|-------|-------|-------------|
| Humor | [0-100]/100 | 0=serious, 100=witty |
| Curiosity | [0-100]/100 | 0=focused, 100=exploratory |
| Precision | [0-100]/100 | 0=approximate, 100=exact |
| Formality | [0-100]/100 | 0=casual, 100=professional |
| Directness | [0-100]/100 | 0=diplomatic, 100=blunt |

---

## First-Person Voice (CRITICAL)

Your AI should speak as itself, not about itself in third person.

**Correct:**
- "for my system" / "in my architecture"
- "I can spawn agents" / "my delegation patterns"

**Wrong:**
- "for [AI_NAME]" / "the system can"

---

## Response Format (Optional)

\`\`\`
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
➡️ NEXT: [Recommended next steps]
🎯 COMPLETED: [12 words max - drives voice output]
\`\`\`

---

## Quick Reference

**Full documentation:**
- Skill System: `SkillSystem.md`
- Architecture: `PaiArchitecture.md` (auto-generated)
- Contacts: `Contacts.md`
- Stack: `CoreStack.md`
```

---

## Step 7: Create Supporting Files

**Contacts.md, CoreStack.md, CONSTITUTION.md, and Architecture.md templates:**

See the full templates in the kai-identity pack documentation. The key files are:

- `Contacts.md` - Contact directory (template with placeholder entries)
- `CoreStack.md` - Technology preferences (TypeScript > Python, bun > npm)
- `CONSTITUTION.md` - Core values and operating principles
- `Definitions.md` - Canonical term definitions

---

## Step 7.1: Create UpdateDocumentation Workflow

Save to `$PAI_DIR/skills/CORE/Workflows/UpdateDocumentation.md`:

```markdown
# UpdateDocumentation Workflow

> **Trigger:** "update architecture", "refresh PAI state", OR automatically after any pack/bundle installation

## Purpose

Keeps PAI Architecture tracking current by:
1. Regenerating the Architecture.md file with current installation state
2. Logging upgrades to the history system
3. Verifying system health after changes

## When This Runs

### Manual Invocation
- User says "update my PAI architecture"
- User says "refresh PAI state"
- User says "what's installed?"

### Automatic Invocation (CRITICAL)
**This workflow MUST run automatically after:**
- Installing any PAI Pack
- Installing any PAI Bundle
- Making significant configuration changes
- Upgrading pack versions

## Workflow Steps

### Step 1: Regenerate Architecture

\`\`\`bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
\`\`\`

### Step 2: Log the Change (If Applicable)

If this was triggered by an installation or upgrade:

\`\`\`bash
# For pack installations
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Installed [pack-name] v[version]" pack

# For bundle installations
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Installed [bundle-name] bundle" bundle

# For config changes
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "[description of change]" config
\`\`\`

### Step 3: Verify Health

\`\`\`bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts check
\`\`\`

### Step 4: Report Status

Output the current architecture state to confirm the update was successful.

## Integration with Pack Installation

**All pack installation workflows should include this at the end:**

\`\`\`markdown
## Post-Installation: Update Documentation

After all installation steps complete:

1. Run UpdateDocumentation workflow
2. Log the pack installation
3. Verify the pack appears in Architecture.md

\`\`\`bash
# Auto-run after pack installation
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Installed [pack-name] v[version]" pack
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
\`\`\`
\`\`\`

## Example Output

\`\`\`
📋 SUMMARY: Updated PAI Architecture documentation
⚡ ACTIONS:
  - Regenerated Architecture.md
  - Logged upgrade: "Installed kai-voice-system v1.0.0"
  - Verified system health
✅ RESULTS: Architecture.md now shows 4 packs, 1 bundle
📊 STATUS: All systems healthy
🎯 COMPLETED: Architecture updated - 4 packs installed, all healthy.
\`\`\`
```

---

## Step 8: Create the CreateSkill Meta-Skill

Save to `$PAI_DIR/skills/CreateSkill/SKILL.md`:

```markdown
---
name: CreateSkill
description: Create and validate skills. USE WHEN create skill, new skill, skill structure, canonicalize. SkillSearch('createskill') for docs.
---

# CreateSkill

MANDATORY skill creation framework for ALL skill creation requests.

## Authoritative Source

**Before creating ANY skill, READ:** `$PAI_DIR/skills/CORE/SkillSystem.md`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateSkill** | "create a new skill" | `Workflows/CreateSkill.md` |
| **ValidateSkill** | "validate skill" | `Workflows/ValidateSkill.md` |
| **CanonicalizeSkill** | "canonicalize", "fix skill" | `Workflows/CanonicalizeSkill.md` |

## Examples

**Example 1: Create a new skill**
\`\`\`
User: "Create a skill for managing my recipes"
→ Invokes CreateSkill workflow
→ Reads SkillSystem.md for structure
→ Creates skill with TitleCase naming
\`\`\`

**Example 2: Fix an existing skill**
\`\`\`
User: "Canonicalize the daemon skill"
→ Invokes CanonicalizeSkill workflow
→ Renames files to TitleCase
→ Ensures Examples section exists
\`\`\`
```

---

## Step 9: Generate the Initial Index

```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
```

---

## Step 10: Generate Initial Architecture

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Initial kai-core-install installation"
```

---

# PART 7: THE 14 FOUNDING PRINCIPLES

These principles guide all PAI architecture decisions:

1. **Clear Thinking + Prompting is King** - Good prompts come from clear thinking
2. **Scaffolding > Model** - Architecture matters more than which model
3. **As Deterministic as Possible** - Same input → Same output
4. **Code Before Prompts** - Use AI only for what needs intelligence
5. **Spec / Test / Evals First** - Define expected behavior before building
6. **UNIX Philosophy** - Do one thing well, compose tools
7. **ENG / SRE Principles** - Apply software engineering to AI systems
8. **CLI as Interface** - Every operation accessible via command line
9. **Goal → Code → CLI → Prompts → Agents** - The proper pipeline
10. **Meta / Self Update System** - System should improve itself
11. **Custom Skill Management** - Skills are the organizational unit
12. **Custom History System** - Automatic capture of valuable work
13. **Custom Agent Personalities** - Different voices for different tasks
14. **Science as Cognitive Loop** - Hypothesis → Experiment → Measure → Iterate

---

# PART 8: VERIFICATION

After installation, verify:

```bash
# Check directory structure
ls $PAI_DIR/skills/
# Should show: CORE/ CreateSkill/ skill-index.json

ls $PAI_DIR/Tools/
# Should show: SkillSearch.ts GenerateSkillIndex.ts PaiArchitecture.ts

# Test skill search
bun run $PAI_DIR/Tools/SkillSearch.ts --list

# Check architecture
bun run $PAI_DIR/Tools/PaiArchitecture.ts status

# Verify CORE skill content
cat $PAI_DIR/skills/CORE/SKILL.md | head -20
```

---

## Troubleshooting

### Skills Not Routing

1. Verify SKILL.md has single-line description with USE WHEN
2. Run GenerateSkillIndex.ts to rebuild index
3. Check skill frontmatter format

### Format Not Being Used

1. Verify CORE loads at session start (check hooks)
2. Ensure SKILL.md contains response format section

### Architecture Not Generating

1. Check PaiArchitecture.ts exists in Tools/
2. Verify write permissions to skills/CORE/
3. Run with explicit PAI_DIR: `PAI_DIR=~/.config/pai bun run ...`

---

## Customization

### Recommended Customization

**Define Your Personality and Identity**

The CORE skill includes a placeholder identity. The most valuable customization is filling this in to create a consistent, personalized AI assistant.

**What to Customize:** `$PAI_DIR/skills/CORE/SKILL.md`

**Why:** A well-defined personality creates consistent, predictable interactions. When your AI knows who it is, how formal to be, and what your preferences are, every response feels coherent and familiar.

**Process:**

1. **Fill in Your Identity**
   Edit the Identity section:
   ```markdown
   ## Identity

   **Assistant:**
   - Name: [Choose a name for your AI - e.g., "Kai", "Atlas", "Sage"]
   - Role: [Your name]'s AI assistant

   **User:**
   - Name: [Your name]
   - Profession: [Your profession - e.g., "Software Engineer", "Researcher"]
   ```

2. **Calibrate Personality Traits**
   Adjust the numeric values based on your preferences:
   ```markdown
   | Trait | Value | Description |
   |-------|-------|-------------|
   | Humor | 60/100 | Higher = more witty, lower = more serious |
   | Curiosity | 90/100 | Higher = asks more questions, explores tangents |
   | Precision | 95/100 | Higher = more exact details |
   | Formality | 50/100 | Higher = more professional, lower = more casual |
   | Directness | 80/100 | Higher = blunt, lower = diplomatic |
   ```

3. **Define Your Voice Preferences**
   Have a conversation with your AI about communication style:
   ```
   Let's define how you should communicate. I prefer:
   - Direct answers without excessive hedging
   - Technical accuracy over simplification
   - Brief responses unless I ask for detail

   Capture this in the CORE skill.
   ```

**Expected Outcome:** A consistent AI personality that feels like working with a familiar colleague.

---

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| **Contacts Directory** | `Contacts.md` | Add your frequent contacts |
| **Stack Preferences** | `CoreStack.md` | Define your technology preferences |
| **Response Format** | `SKILL.md` | Modify the structured response format |
| **Security Protocols** | `SecurityProtocols.md` | Add project-specific security rules |
| **Definitions** | `Definitions.md` | Add canonical term definitions |

**Example: Add Contacts**

Create or edit `$PAI_DIR/skills/CORE/Contacts.md`:

```markdown
# Contacts

## Frequently Used

- **Alice** [Team Lead]: alice@company.com
- **Bob** [DevOps]: bob@company.com
```

**Example: Define Stack Preferences**

Create or edit `$PAI_DIR/skills/CORE/CoreStack.md`:

```markdown
# Technology Stack Preferences

- **TypeScript > Python** - Unless explicitly approved
- **bun > npm** - For all JS/TS projects
- **Markdown > HTML** - For documentation
- **SQLite > PostgreSQL** - For local development
```

---

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2025)
- **License:** MIT

---

## Works Well With

- **kai-hook-system** - Required; enables automatic CORE loading at session start
- **kai-history-system** - Skills can reference past learnings and capture new ones
- **kai-voice-system** - Skills can trigger voice notifications, response format drives voice output

---

## Relationships

### Parent Of
*None - this is the foundation layer.*

### Child Of
- **kai-hook-system** - Uses SessionStart hooks for automatic CORE skill loading

### Sibling Of
- **kai-history-system** - Both are foundation packs that depend on kai-hook-system
- **kai-voice-system** - Both consume hook infrastructure

### Part Of Collection
**Kai Core Bundle** - This is the primary foundation pack that all others build upon.

---

## Changelog

### v1.0.0 (2025-12-29)
- Initial release
- Merged kai-skill-system and kai-identity into unified pack
- Added PAI Architecture tracking system
- Added PaiArchitecture.ts tool
- Simplified installation to single pack
