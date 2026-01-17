# PAI Pack Template Specification

> **FOR AI AGENTS:** This document contains instructions for creating PAI Packs. When a user asks you to create a pack, follow this template exactly. Each section includes HTML comments with detailed instructions - read them carefully and replace the example content with your pack's actual content.

## Pack Structure (v2.0)

Each pack is a **directory** containing:

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

**CRITICAL:** Packs must be COMPLETE. A pack must contain EVERYTHING needed to go from a fresh AI agent installation to a fully working system. No missing components, no "figure it out yourself," no snippets instead of full code.

---

## 🔴 END-TO-END REQUIREMENT (MANDATORY)

**Every pack MUST be end-to-end complete.** This is the most important requirement.

### What End-to-End Means

If your pack has a data flow, EVERY component in that flow must be included:

```
Hook → sends to → Server → calls → API → plays → Audio
  ✅        ✅        ✅       ✅      ✅       ✅
  ALL of these must be in the pack
```

### Anti-Patterns (NEVER DO THESE)

| ❌ WRONG | ✅ RIGHT |
|----------|----------|
| "A full server implementation is beyond this pack's scope" | Include the complete server implementation |
| "You can implement your own TTS provider" | Include the TTS integration code |
| "See the skeleton pattern below" | Include production-ready code |
| "Adapt to your preferred system" | Include the complete working system |
| "The voice server is a required dependency" | Include the voice server |

### The Chain Test

Before publishing, trace every data flow:

1. **Identify the chain**: What calls what? (Hook → Server → API → Output)
2. **Check each link**: Is the code for this component in the pack?
3. **Find the gaps**: Any "implement your own" or "beyond scope"?
4. **Fill the gaps**: Add the missing components

**If ANY link says "you implement this" or "beyond scope" - the pack is INCOMPLETE.**

### Example: Voice System

A voice system pack MUST include:

| Component | What It Does | Included? |
|-----------|--------------|-----------|
| Stop hook | Extracts completion message | ✅ Required |
| Prosody enhancer | Adds emotional markers | ✅ Required |
| Voice server | HTTP server on port 8888 | ✅ Required |
| ElevenLabs integration | Calls TTS API | ✅ Required |
| Audio playback | Plays the audio | ✅ Required |
| Server management | Start/stop/restart script | ✅ Required |

**NOT:** "The voice server is beyond scope." That makes the pack useless.

---

## Frontmatter (Metadata)

```yaml
---
# name: (24 words max) Human-readable pack name
name: PAI History System

# pack-id: (format) {author}-{pack-name}-{variant}-v{version}
pack-id: danielmiessler-history-system-core-v1.0.0

# version: (format) SemVer major.minor.patch
version: 1.0.0

# author: (1 word) GitHub username or organization
author: danielmiessler

# description: (128 words max) One-line description
description: Granular context-tracking system for the entire AI infrastructure - captures all work, decisions, and learnings automatically

# type: (single) concept | skill | hook | plugin | agent | mcp | workflow | template | other
type: feature

# purpose-type: (multi) security | productivity | research | development | automation | integration | creativity | analysis | other
purpose-type: [productivity, automation, development]

# platform: (single) agnostic | claude-code | opencode | cursor | custom
platform: claude-code

# dependencies: (list) Required pack-ids, empty [] if none
dependencies: []

# keywords: (24 tags max) Searchable tags for discovery
keywords: [history, documentation, memory, capture, hooks, sessions, learnings, automation, context, recovery, debugging]
---
```

---

## Pack Icon (Required)

Every pack MUST have a 256x256 transparent PNG icon immediately after the frontmatter.

**Icon specs:**
- 256x256 pixels
- **ACTUAL transparent background** (not baked-in checkerboard)
- Blue (#4a90d9) primary color
- Purple (#8b5cf6) accent only (10-15%)
- Simple, recognizable at 64x64

**CRITICAL - Icon Generation:**

When generating icons, you MUST use the `--remove-bg` flag to ensure actual transparency:

```bash
bun run ~/.claude/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[ICON_DESCRIPTION], simple flat icon design, 256x256 pixels. COLOR PALETTE: Background solid dark (#0a0a0f), Primary electric blue (#4a90d9), Accent purple (#8b5cf6). Simple enough to read at 64x64." \
  --size 1K \
  --aspect-ratio 1:1 \
  --remove-bg \
  --output ~/Downloads/pack-icon.png
```

**The `--remove-bg` flag is MANDATORY.** Without it, the image will have a baked-in checkerboard pattern instead of actual transparency.

After generation, verify transparency by viewing in a browser - the browser's background should show through, not a checkerboard pattern.

**Format in pack file:**
```markdown
---
name: Pack Name
...frontmatter...
---

<p align="center">
  <img src="icons/{pack-name}.png" alt="Pack Name" width="256">
</p>

# Pack Name
...
```

---

## Required Sections

> **FOR AI AGENTS:** Every pack file MUST include these sections in order. The HTML comments in each section contain detailed instructions - read them and follow them exactly. Replace the example content with your pack's actual content.

Below is the PAI History System pack as the reference implementation demonstrating COMPLETE pack structure.

```markdown
<p align="center">
  <img src="icons/history-system.png" alt="PAI History System" width="256">
</p>

# PAI History System

> Granular context-tracking system for the entire AI infrastructure - captures all work, decisions, and learnings automatically with zero manual effort

## Installation Prompt
<!--
(512 words max)

INSTRUCTIONS FOR AI: Write a brief context briefing for the AI that will receive and install this pack.
Include:
- What PAI is (link to README)
- What this specific pack does
- Why the user would want it
- A call to action to follow installation instructions

Keep it welcoming but concise. The receiving AI needs enough context to understand
what it's installing without reading the whole pack first.
-->

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds automatic memory to your entire AI infrastructure. The PAI History System is not just about agent outputs - it's a granular context-tracking system for EVERYTHING that happens in your system:

- **Continuous Learning**: Capture insights as they happen
- **Bug Fixing**: Trace exactly what was done when debugging
- **Avoiding Mistakes**: Learn from past errors automatically
- **After-Action Reviews**: Analyze what worked and what didn't
- **Restoration Points**: Recover from data loss with historical snapshots

**Core principle:** Work normally, documentation handles itself.

No more forgotten context between sessions. No more lost learnings. Your DA remembers everything so you don't have to.

Please follow the installation instructions below to integrate this pack into your infrastructure.

---

## What's Included
<!--
(256 words max)

INSTRUCTIONS FOR AI: Provide a quick manifest of what this pack creates.
This gives users an at-a-glance summary of the pack's contents BEFORE
they commit to installation.

Include:
- A table with Component | File | Purpose columns
- Summary counts: Files created, Hooks registered, Dependencies
- This section is REQUIRED for all packs

Example:
| Component | File | Purpose |
|-----------|------|---------|
| Session initializer | `hooks/initialize-session.ts` | Sets up session context |
| Security validator | `hooks/security-validator.ts` | Blocks dangerous commands |
| Observability lib | `hooks/lib/observability.ts` | Event logging to dashboard |

**Summary:**
- **Files created:** 3
- **Hooks registered:** 2
- **Dependencies:** pai-hook-system (required)
-->

| Component | File | Purpose |
|-----------|------|---------|
| [Component 1] | `path/to/file1.ts` | [What it does] |
| [Component 2] | `path/to/file2.ts` | [What it does] |
| [Library 1] | `hooks/lib/library.ts` | [Shared functionality] |

**Summary:**
- **Files created:** [N]
- **Hooks registered:** [N]
- **Dependencies:** [List or "None"]

---

## The Concept and/or Problem
<!--
(2048 words max)

INSTRUCTIONS FOR AI: Explain the problem this pack solves or the concept it implements.
Include:
- The core problem/challenge (be specific)
- Why this matters (consequences of not solving it)
- Who faces this problem
- Any relevant background context

Write for someone who may not be familiar with the domain. Make the problem
feel real and urgent enough that they want the solution.
-->

AI agents are powerful but forgetful. Each session starts fresh with no memory of:

- What you built last week
- Why you made certain architectural decisions
- What bugs you've already fixed (and might reintroduce)
- Lessons learned from debugging sessions
- Research you've already conducted
- What agents discovered during parallel execution

This creates cascading problems across your entire AI infrastructure:

**For Development Work:**
- You fix the same bug twice because you forgot the root cause
- Architectural decisions lack rationale when revisited months later
- Code reviews miss context because the "why" is lost

**For Agent Orchestration:**
- Parallel agents complete work that's never captured
- Background research disappears when the session ends
- Agent outputs aren't categorized or searchable

**For Operational Continuity:**
- Session handoffs require manual context transfer
- Multi-day projects need constant re-explanation
- Team members can't see what the AI worked on

**For Learning and Improvement:**
- Insights get lost in conversation history
- No after-action reviews are possible
- Mistakes repeat because there's no institutional memory

**The Fundamental Problem:**

Traditional AI systems treat each interaction as ephemeral. But real work is cumulative. Today's debugging session informs tomorrow's architecture decision. Last month's research prevents this month's repeated mistake.

Without a history system, your DA is brilliant but amnesiac. Every session is day one. Every context is fresh. Every lesson must be relearned.

## The Solution
<!--
(4096 words max)

INSTRUCTIONS FOR AI: Explain how this pack solves the problem.
Include:
- High-level approach (the "what")
- Key insights or innovations (the "why this works")
- Architecture overview if applicable
- Design principles that guided the implementation
- Trade-offs made and why

Don't include code here - that goes in Installation. Focus on helping the reader
understand the approach conceptually before diving into implementation.
-->

## What Makes This Different
<!--
(4096 words max)

🚨 THIS SECTION IS CRITICAL - IT'S WHAT MAKES PACKS VALUABLE 🚨

INSTRUCTIONS FOR AI: This is where you explain WHY this pack is architecturally
interesting and BETTER than a baseline AI installation. This is what makes it different
that justifies the pack's existence.

Every pack MUST explain its architectural innovation:
- What layers/components exist and how they interact
- How data/intent flows through the system
- Why this architecture is superior to naive approaches
- What makes it deterministic, composable, or debuggable

USE VISUAL DIAGRAMS - ASCII art showing the flow is extremely valuable.

EXAMPLE (from pai-skill-system):
The skill system has 5 explicit routing layers:
1. SKILL.md frontmatter → loaded into system prompt for routing
2. SKILL.md body → workflow routing table, loads on invocation
3. Context files → topic-specific docs, load on-demand
4. Workflows/ → HOW to do things (prompts/procedures)
5. Tools/ → CLI programs called by workflows

Each layer has a purpose. Intent flows explicitly through them. This is
FUNDAMENTALLY DIFFERENT from "just adding custom instructions" because:
- Progressive loading (not everything upfront)
- Explicit routing (not fuzzy matching)
- Separation of concerns (metadata, docs, procedures, code)
- Deterministic execution (workflows map intent to CLI flags)

WITHOUT this section, readers won't understand why your pack is better than
just writing a prompt. WITH this section, they see the architectural insight
that makes the pack genuinely valuable.

Include:
- Visual diagram (ASCII) showing components and flow
- Explanation of each layer/component
- How intent/data flows through the system
- Why this architecture matters (explicit benefits)
- What problems this architecture prevents

This is NOT optional. If your pack doesn't have interesting architecture,
it might not be worth being a pack.
-->

The PAI History System solves this through **automatic, hook-based documentation**. Instead of requiring manual effort, it captures work as a byproduct of doing the work.

**Core Architecture:**

```
$PAI_DIR/
├── hooks/                           # Hook implementations
│   ├── capture-all-events.ts        # Universal event capture (all hooks)
│   ├── stop-hook.ts                 # Main agent completion capture
│   ├── subagent-stop-hook.ts        # Subagent output routing
│   ├── capture-session-summary.ts   # Session end summarization
│   └── lib/                         # Shared libraries
│       ├── observability.ts         # Dashboard integration
│       └── metadata-extraction.ts   # Agent instance tracking
├── history/                         # Captured outputs
│   ├── sessions/YYYY-MM/            # Session summaries
│   ├── learnings/YYYY-MM/           # Problem-solving narratives
│   ├── research/YYYY-MM/            # Investigation reports
│   ├── decisions/YYYY-MM/           # Architectural decisions
│   ├── execution/
│   │   ├── features/YYYY-MM/        # Feature implementations
│   │   ├── bugs/YYYY-MM/            # Bug fixes
│   │   └── refactors/YYYY-MM/       # Code improvements
│   └── raw-outputs/YYYY-MM/         # JSONL event logs
└── settings.json                    # Hook configuration
```

**Four Hooks, Complete Coverage:**

1. **capture-all-events.ts** (Universal Event Capture)
   - Hooks: ALL events (PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, etc.)
   - Captures: Every event to daily JSONL logs with full payload
   - Output: `raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
   - Purpose: Complete audit trail, debugging, analytics

2. **stop-hook.ts** (Main Agent Completion)
   - Hook: Stop
   - Captures: Main agent work summaries and learnings
   - Output: `learnings/` or `sessions/` based on content analysis
   - Purpose: Capture what was accomplished and what was learned

3. **subagent-stop-hook.ts** (Subagent Output Routing)
   - Hook: SubagentStop
   - Captures: All spawned agent outputs
   - Output: Routed to `research/`, `decisions/`, or `execution/` by agent type
   - Purpose: Never lose agent work, automatic categorization

4. **capture-session-summary.ts** (Session End)
   - Hook: SessionEnd
   - Captures: Session summary with files changed, commands run, tools used
   - Output: `sessions/YYYY-MM/timestamp_SESSION_focus.md`
   - Purpose: Know what happened in each session

**Design Principles:**

1. **Zero Overhead**: Hooks run silently, no action required from user
2. **Never Block**: All hooks fail gracefully - never interrupt work
3. **Future-Proof**: Generic payload capture means new fields are automatically stored
4. **Queryable**: Consistent file naming enables powerful search and filtering
5. **Categorized**: Different work types route to appropriate directories
6. **Complete**: Every component included - nothing left to figure out

**The Key Insight:**

Documentation is a byproduct, not a task. By instrumenting the work itself, you get perfect records without any effort. The history system sees everything because it's wired into the event stream.

## Why This Is Different
<!--
(128 words max)

INSTRUCTIONS FOR AI: Explain what makes this pack unique compared to similar solutions.
Format EXACTLY as follows:
1. Opening line: "This sounds similar to [ALTERNATIVE] which also does [CAPABILITY]. What makes this approach different?"
2. A 64-word paragraph explaining the key differentiator
3. Four bullets of exactly 8 words each

Example:
"This sounds similar to mem0 which also does AI memory. What makes this approach different?

[64-word paragraph explaining the unique value proposition]

- First eight-word bullet explaining a key difference
- Second eight-word bullet explaining another key difference
- Third eight-word bullet explaining another key difference
- Fourth eight-word bullet explaining another key difference"
-->

This sounds similar to [ALTERNATIVE] which also does [CAPABILITY]. What makes this approach different?

[64-word paragraph answering the question - what makes your approach fundamentally different from existing solutions? Focus on the architectural insight, the unique methodology, or the problem framing that sets this apart.]

- [First eight-word bullet explaining a key difference]
- [Second eight-word bullet explaining another key difference]
- [Third eight-word bullet explaining another key difference]
- [Fourth eight-word bullet explaining another key difference]

---

## Installation
<!--
(16384 words max)

INSTRUCTIONS FOR AI: Provide step-by-step installation instructions.
Include:
- Prerequisites (dependencies, API keys, system requirements)
- PRE-INSTALLATION SYSTEM ANALYSIS (REQUIRED):
  - Scripts to detect existing PAI installation
  - Scripts to check for conflicting files/hooks
  - Scripts to verify dependencies are installed
  - Conflict Resolution Matrix table
  - Backup instructions for existing files
- Numbered steps with clear actions
- All code needed (use fenced code blocks with language tags)
- Code languages: typescript (bun), bash, python (uv), json, html
- Configuration file locations
- How to verify installation succeeded

Write for an AI assistant that will execute these steps. Be explicit about file
paths, commands to run, and expected outputs. Include ALL code - no snippets,
no "add more patterns here", no placeholders.

The Pre-Installation section is CRITICAL - it ensures the AI understands the
current system state before making changes. This prevents conflicts and allows
for proper merge/replace/skip decisions.
-->

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with hook support)
- **Write access** to `$PAI_DIR/` (or your PAI directory)

---

### Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state to detect conflicts and ensure dependencies are met.

#### Step 0.1: Detect Current Configuration

Run these commands to understand your current system:

```bash
# 1. Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK" ]; then
  echo "⚠️  PAI directory EXISTS at: $PAI_CHECK"
  echo "Contents:"
  ls -la "$PAI_CHECK" 2>/dev/null || echo "  (empty or inaccessible)"
else
  echo "✓ PAI directory does not exist (clean install)"
fi

# 3. Check for existing files that this pack will create
# TODO: Add pack-specific file checks here
echo ""
echo "Checking for files this pack will create..."
# if [ -f "$PAI_CHECK/path/to/file" ]; then
#   echo "⚠️  file.ts already exists"
# fi

# 4. Check Claude settings for existing hooks
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
  echo "Claude settings.json EXISTS"
  if grep -q '"hooks"' "$CLAUDE_SETTINGS" 2>/dev/null; then
    echo "⚠️  Existing hooks configuration found"
  else
    echo "✓ No hooks configured in settings.json"
  fi
else
  echo "✓ No Claude settings.json (will be created)"
fi

# 5. Check environment variables
echo ""
echo "Environment variables:"
echo "  DA: ${DA:-'NOT SET'}"
echo "  TIME_ZONE: ${TIME_ZONE:-'NOT SET'}"
echo "  PAI_DIR: ${PAI_DIR:-'NOT SET'}"
```

#### Step 0.2: Verify Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for required packs (customize for your pack)
# Example: Check if hook system is installed
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ pai-hook-system is installed"
else
  echo "⚠️  pai-hook-system not installed (may be required)"
fi

# Add checks for other dependencies your pack needs
```

#### Step 0.3: Conflict Resolution Matrix

Based on the detection above, follow the appropriate path:

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No PAI_DIR, no conflicts | Proceed normally with Step 1 |
| **Directory Exists** | PAI_DIR has files | Review files, backup if needed, then proceed |
| **Files Exist** | Pack files already present | Backup old files, compare versions, then replace |
| **Hooks Exist** | Claude settings has hooks | **MERGE** - add new hooks to existing array |
| **Missing Dependencies** | Required packs missing | Install dependencies first |

#### Step 0.4: Backup Existing Configuration (If Needed)

If conflicts were detected, create a backup before proceeding:

```bash
# Create timestamped backup
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Backup files this pack will modify
# TODO: Add pack-specific backup commands
# Example:
# if [ -d "$PAI_CHECK/history" ]; then
#   cp -r "$PAI_CHECK/history" "$BACKUP_DIR/history"
#   echo "✓ Backed up history directory"
# fi

echo "Backup location: $BACKUP_DIR"
```

**After completing system analysis, proceed to Step 1.**

---

### Step 1: Create Directory Structure

```bash
# Create all required directories
mkdir -p $PAI_DIR/hooks/lib
mkdir -p $PAI_DIR/history/{sessions,learnings,research,decisions,raw-outputs}
mkdir -p $PAI_DIR/history/execution/{features,bugs,refactors}

# Verify structure
ls -la $PAI_DIR/
ls -la $PAI_DIR/history/
```

Expected output: All directories created with no errors.

---

### Step 2: Create Library Files

These shared libraries are used by multiple hooks.

#### 2.1: Create observability.ts

```typescript
// $PAI_DIR/hooks/lib/observability.ts
// Dashboard integration for real-time monitoring

export interface ObservabilityEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  timestamp: string;
  transcript_path?: string;
  summary?: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  agent_type?: string;
  [key: string]: any;
}

/**
 * Send event to observability dashboard (optional)
 * Fails silently if dashboard is not running
 */
export async function sendEventToObservability(event: ObservabilityEvent): Promise<void> {
  try {
    const response = await fetch('http://localhost:4000/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PAI-Hook/1.0'
      },
      body: JSON.stringify(event),
    });
    // Silently ignore failures - dashboard may be offline
  } catch (error) {
    // Fail silently - hooks should never fail due to observability issues
  }
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function getSourceApp(): string {
  return process.env.PAI_SOURCE_APP || process.env.DA || 'PAI';
}
```

#### 2.2: Create metadata-extraction.ts

```typescript
// $PAI_DIR/hooks/lib/metadata-extraction.ts
// Extract agent instance metadata from Task tool calls

export interface AgentInstanceMetadata {
  agent_instance_id?: string;
  agent_type?: string;
  instance_number?: number;
  parent_session_id?: string;
  parent_task_id?: string;
}

/**
 * Extract agent instance ID from Task tool input
 */
export function extractAgentInstanceId(
  toolInput: any,
  description?: string
): AgentInstanceMetadata {
  const result: AgentInstanceMetadata = {};

  // Strategy 1: Extract from description [agent-type-N]
  if (description) {
    const descMatch = description.match(/\[([a-z-]+-researcher)-(\d+)\]/);
    if (descMatch) {
      result.agent_type = descMatch[1];
      result.instance_number = parseInt(descMatch[2], 10);
      result.agent_instance_id = `${result.agent_type}-${result.instance_number}`;
    }
  }

  // Strategy 2: Extract from prompt [AGENT_INSTANCE: ...]
  if (!result.agent_instance_id && toolInput?.prompt && typeof toolInput.prompt === 'string') {
    const promptMatch = toolInput.prompt.match(/\[AGENT_INSTANCE:\s*([^\]]+)\]/);
    if (promptMatch) {
      result.agent_instance_id = promptMatch[1].trim();
      const parts = result.agent_instance_id.match(/^([a-z-]+)-(\d+)$/);
      if (parts) {
        result.agent_type = parts[1];
        result.instance_number = parseInt(parts[2], 10);
      }
    }
  }

  // Strategy 3: Fallback to subagent_type
  if (!result.agent_type && toolInput?.subagent_type) {
    result.agent_type = toolInput.subagent_type;
  }

  return result;
}

/**
 * Enrich event with agent metadata
 */
export function enrichEventWithAgentMetadata(
  event: any,
  toolInput: any,
  description?: string
): any {
  const metadata = extractAgentInstanceId(toolInput, description);
  const enrichedEvent = { ...event };

  if (metadata.agent_instance_id) enrichedEvent.agent_instance_id = metadata.agent_instance_id;
  if (metadata.agent_type) enrichedEvent.agent_type = metadata.agent_type;
  if (metadata.instance_number !== undefined) enrichedEvent.instance_number = metadata.instance_number;

  return enrichedEvent;
}

/**
 * Check if a tool call is spawning a subagent
 */
export function isAgentSpawningCall(toolName: string, toolInput: any): boolean {
  return toolName === 'Task' && toolInput?.subagent_type !== undefined;
}
```

---

### Step 3: Create Hook Files

> **FOR AI AGENTS:** Create each of these files exactly as shown. All four hooks are required for full functionality.

[Include all 4 hook files here - capture-all-events.ts, stop-hook.ts, subagent-stop-hook.ts, capture-session-summary.ts - with complete code]

---

### Step 4: Register Hooks in settings.json

Claude Code looks for settings in `~/.claude/settings.json`. Add or merge the following hook configuration:

**File location:** `~/.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type PreToolUse"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type PostToolUse"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/stop-hook.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Stop"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/subagent-stop-hook.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SubagentStop"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-session-summary.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionEnd"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionStart"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type UserPromptSubmit"
          }
        ]
      }
    ]
  }
}
```

**Important:** If you already have a settings.json, merge the hooks section with your existing configuration.

---

### Step 5: Verify Installation

```bash
# 1. Check all hooks exist
ls -la $PAI_DIR/hooks/*.ts
# Should show 4 hook files

# 2. Check lib files exist
ls -la $PAI_DIR/hooks/lib/*.ts
# Should show 2 lib files

# 3. Check directory structure
ls -la $PAI_DIR/history/
# Should show: sessions, learnings, research, decisions, execution, raw-outputs

# 4. Verify Bun can run the hooks
bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Test <<< '{"test": true}'
# Should create an entry in raw-outputs

# 5. Restart Claude Code to activate hooks
```

## Invocation Scenarios
<!--
(8192 words max)

INSTRUCTIONS FOR AI: Document when and how this pack gets triggered.
Include:
- Trigger conditions (what causes it to activate)
- Event hooks or entry points
- Input/output flow diagrams if helpful
- Table of scenarios with triggers and actions
- Edge cases and how they're handled

Help users understand the pack's behavior in their system so they can
predict when it will activate and what it will do.
-->

The history system triggers automatically on Claude Code events:

| Event | Hook | Output Location | Captured Data |
|-------|------|-----------------|---------------|
| Any tool starts | PreToolUse | `raw-outputs/` | Tool name, input, session |
| Any tool completes | PostToolUse | `raw-outputs/` | Tool name, input, output |
| Main agent finishes | Stop | `learnings/` or `sessions/` | Full response, categorized |
| Subagent completes | SubagentStop | `research/`, `decisions/`, or `execution/` | Agent output, routed by type |
| User quits session | SessionEnd | `sessions/` | Files changed, tools used |

## Example Usage
<!--
(8192 words max)

INSTRUCTIONS FOR AI: Show concrete examples of the pack in action.
Include:
- 2-4 realistic usage scenarios
- For each: user input, system behavior, output
- Both success cases AND failure/edge cases
- Exact commands, responses, or outputs shown
-->

### Example 1: Searching Past Work

```bash
# User: "Have we worked on authentication before?"
grep -r "authentication" $PAI_DIR/history/

# Results show files with dates and categories
```

### Example 2: Reviewing Session Activity

```bash
ls -lt $PAI_DIR/history/sessions/2025-12/ | head -5
# Shows recent session files with their focus
```

## Configuration
<!--
(512 words max)

INSTRUCTIONS FOR AI: Document configuration options.
If no configuration is needed, write "No configuration required."

IMPORTANT: Always document BOTH approaches for environment variables:
1. .env file (for users who used the Kai Bundle wizard)
2. Shell profile exports (for manual installation)
-->

**Environment variables:**

**Option 1: `.env` file** (recommended - created by Kai Bundle wizard):
```bash
# $PAI_DIR/.env
DA="MyAI"
PAI_DIR="$HOME/.config/pai"
TIME_ZONE="America/Los_Angeles"
```

**Option 2: Shell profile** (for manual installation):
```bash
# Add to ~/.zshrc or ~/.bashrc
export PAI_DIR="$HOME/.config/pai"
export TIME_ZONE="America/Los_Angeles"
export DA="MyAI"
```

## Customization
<!--
(2048 words max)

INSTRUCTIONS FOR AI: This section documents how users can personalize and customize
the pack beyond basic configuration. This is OPTIONAL but highly encouraged for packs
that benefit from personalization.

Structure this section with two subsections:
1. **Recommended Customization** - Personalization steps that significantly improve
   the pack's value for individual users. These are things most users SHOULD do.
2. **Optional Customization** - Additional tweaks users CAN make if desired.

For each customization:
- Explain WHAT to customize
- Explain WHY it improves the experience
- Provide specific STEPS or a process
- Note the EXPECTED OUTCOME

Example from Art Skill:
- RECOMMENDED: Have an extended conversation with your DA about your aesthetic preferences,
  capture this in Aesthetic.md, so all generated images reflect your personal style.
- OPTIONAL: Add your own color palette, create custom prompt templates for your use cases.

If no customization is applicable, write "No customization options. This pack works
as-is without personalization."
-->

### Recommended Customization

[Describe customization steps that significantly improve the pack for individual users]

**What to Customize:** [The component/file/setting to personalize]

**Why:** [How this improves the experience]

**Process:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Outcome:** [What users should expect after customization]

---

### Optional Customization

[Describe additional tweaks users can make]

| Customization | File | Impact |
|--------------|------|--------|
| [Custom option 1] | [file.md] | [What it affects] |
| [Custom option 2] | [file.md] | [What it affects] |

## Credits
<!--
(256 words max)
INSTRUCTIONS FOR AI: Attribution for ideas, inspiration, and contributions.
-->

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Inspired by**: Git's version history, engineering logbooks, Zettelkasten method

## Related Work
<!--
(256 words max)
INSTRUCTIONS FOR AI: DO NOT FABRICATE. Leave empty or ask the maintainer.
Only fill in if the maintainer provides specific projects to link.
-->

*None specified - maintainer to provide if applicable.*

## Works Well With
<!--
(256 words max)
INSTRUCTIONS FOR AI: DO NOT FABRICATE. Leave empty or ask the maintainer.
Only fill in if the maintainer specifies which packs complement this one.
-->

*None specified - maintainer to provide if applicable.*

## Recommended
<!--
(256 words max)
INSTRUCTIONS FOR AI: DO NOT FABRICATE. Leave empty or ask the maintainer.
Only fill in if the maintainer specifies recommended companion packs.
-->

*None specified - maintainer to provide if applicable.*

## Relationships
<!--
(512 words max total)
INSTRUCTIONS FOR AI: DO NOT FABRICATE. Leave empty or ask the maintainer.
These relationships must be REAL, verified connections to other packs.
Only fill in if the maintainer provides specific pack relationships.
-->

### Parent Of
*None specified.*

### Child Of
*None specified.*

### Sibling Of
*None specified.*

### Part Of Collection
*None specified.*

## Changelog
<!--
INSTRUCTIONS FOR AI: Document version history.
Format: ### {version} - {YYYY-MM-DD}
-->

### 1.0.0 - 2025-12-28
- Initial release
- Four hooks for complete event capture
- Automatic categorization by content and agent type
```

---

## Section Summary Table

| Section | Word Limit | Purpose |
|---------|------------|---------|
| `## Installation Prompt` | 512 | Context briefing for receiving AI |
| `## What's Included` | 256 | Quick manifest of pack contents |
| `## The Concept and/or Problem` | 2048 | What problem does this solve? |
| `## The Solution` | 4096 | How does this pack solve it? |
| `## Why This Is Different` | 128 | Differentiation from similar solutions |
| `## Installation` | 16384 | Step-by-step with ALL code |
| `## Invocation Scenarios` | 8192 | When/how it triggers |
| `## Example Usage` | 8192 | Concrete examples |
| `## Configuration` | 512 | Options and environment variables |
| `## Customization` | 2048 | Personalization beyond basic config |
| `## Credits` | 256 | Attribution |
| `## Related Work` | 256 | Similar projects |
| `## Works Well With` | 256 | Complementary packs |
| `## Recommended` | 256 | Suggested companions |
| `## Relationships` | 512 | Parent Of, Child Of, Sibling Of, Part Of Collection |
| `## Changelog` | - | Version history |

---

## Pack Completeness Checklist

> **FOR AI AGENTS:** Before publishing, verify your pack includes ALL of these:

### Directory Structure (REQUIRED)
- [ ] **Pack directory created**: `pack-name/` in `Packs/` directory
- [ ] **README.md**: Pack overview, problem/solution, architecture diagram
- [ ] **INSTALL.md**: Step-by-step installation with file copy commands
- [ ] **VERIFY.md**: Mandatory verification checklist with pass/fail criteria
- [ ] **src/ directory**: All source code files (not embedded in markdown)

### End-to-End Chain (MOST IMPORTANT)
- [ ] **Chain test passed**: Traced every data flow - no "implement your own" gaps
- [ ] **Server included**: If pack needs a server, full server code is in `src/`
- [ ] **Server management**: Start/stop/restart scripts included (if server required)
- [ ] **No "beyond scope"**: Every component mentioned is fully implemented

### Standard Requirements
- [ ] **Why Different**: 64-word paragraph + 4 eight-word bullets
- [ ] **Full context**: What, why, who needs it
- [ ] **All code in src/**: Complete, working implementations (no snippets, no placeholders)
- [ ] **File locations**: Exact paths for every file in INSTALL.md
- [ ] **Directory structure**: Commands to create directories in INSTALL.md
- [ ] **Hook code**: If hooks required, full implementations in `src/hooks/`
- [ ] **Library dependencies**: All lib/ files included in `src/`
- [ ] **settings.json**: Exact JSON configuration in `src/config/`
- [ ] **Environment variables**: Required vars documented in INSTALL.md
- [ ] **Verification steps**: VERIFY.md checklist with commands
- [ ] **256x256 icon**: Transparent PNG in `Packs/icons/` (generated with `--remove-bg` flag)
- [ ] **Customization section**: If pack benefits from personalization, document in README.md

**The test:** Can someone go from fresh Claude Code to fully working system using ONLY this pack directory?

**The chain test:** Trace every data flow. If ANY link is missing, the pack is incomplete.

---

## File Naming Convention

- Pack directories in `Packs/` directory
- kebab-case for directory names: `pai-history-system/`, `pai-hook-system/`
- Each pack directory contains: `README.md`, `INSTALL.md`, `VERIFY.md`, `src/`
- Source files in `src/` use appropriate extensions: `.ts`, `.yaml`, `.hbs`, etc.

---

## Versioning

- SemVer: `major.minor.patch`
- Major: Breaking changes
- Minor: New features, backwards compatible
- Patch: Bug fixes
