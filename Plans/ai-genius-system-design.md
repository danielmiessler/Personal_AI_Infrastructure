# AI Genius: Transformation Plan

## From Current LifeOS Setup → PAI-Modular Smart Architecture

---

## 1. VISION (Revised)

**Goal**: Maximize your brainpower for synthesis, connection-making, and strategy by offloading all operational work to AI. Not a corporate hierarchy — a smart, modular system that loads the right context for every task, learns from every interaction, and gets better over time.

**What changes**: The current monolithic CLAUDE.md + time-based automation evolves into a modular skill/context/memory architecture following PAI patterns. Everything that works today keeps working. Nothing breaks during transformation.

**What stays the same**: Obsidian vault as source of truth, Claude Code as compute, eventkit-cli and mail-cli as service connectors, Discord/Telegram as remote interfaces, launchd scripts for scheduling, Git for safety.

---

## 2. CURRENT STATE → TARGET STATE MAPPING

### 2.1 What Exists and What It Becomes

| Current | Target | Migration Risk |
|---|---|---|
| **CLAUDE.md** (58KB monolith) | Modular skill files + CORE SKILL.md | Medium — must preserve all 18 modes |
| **18 modes in CLAUDE.md** | 18 skill files in `AI/skills/` | Low — extract, don't rewrite |
| **AI/AI Context Log.md** | `_SYSTEM/MEMORY/context-log.md` + structured state files | Low — add structure around existing |
| **No cross-session memory** | `_SYSTEM/MEMORY/` with learnings, signals, work tracking | New — additive only |
| **No feedback capture** | Rating capture + mistake tracking in MEMORY | New — additive only |
| **5 launchd scripts** | Same scripts + hook system on top | Low — extend, don't replace |
| **afk-code (Discord/Telegram relay)** | Same — it already works | None |
| **eventkit-cli, mail-cli** | Same — they're solid tools | None |
| **6 MCP servers** | Same — keep all | None |
| **AI/Prompts/ (18 templates)** | Move into skill workflows | Low |
| **No context budgeting** | Context maps per domain + selective loading | New — additive |
| **No event-driven hooks** | PAI-style hook system | New — additive |
| **24 .base databases** | Unchanged — vault structure stays | None |

### 2.2 What Does NOT Change

These are working and should not be touched during transformation:

- Vault folder structure (Areas/, Projects/, Notes/, Content/, etc.)
- All 24 .base database files and their frontmatter schemas
- Daily Notes, Meeting Notes, Journal structure
- eventkit-cli and mail-cli source code and functionality
- afk-code remote control system
- Obsidian plugins (obsidian-git, dataview, readwise, etc.)
- Git workflow and .gitignore
- Discord/Telegram webhook notifications
- Apple Reminders as primary task system
- GPR project tracking

---

## 3. TARGET ARCHITECTURE

```
LifeOS/  (your existing Obsidian vault — unchanged top-level)
│
├── AI/                              # Existing — restructured internals
│   ├── CORE.md                      # NEW: replaces monolithic CLAUDE.md
│   │                                # Contains ONLY: identity, universal
│   │                                # rules, routing table, vault overview
│   │                                # Target: ~4,000 tokens (vs 14,500)
│   │
│   ├── skills/                      # NEW: extracted from CLAUDE.md modes
│   │   ├── _SKILL-TEMPLATE.md       # Template for new skills
│   │   ├── ai-equilibrium-editor.md # From mode 6.1
│   │   ├── translator.md            # From mode 6.2
│   │   ├── editing-rewriting.md     # From mode 6.2b
│   │   ├── zen-jaskiniowca.md       # From mode 6.3
│   │   ├── business-advisor.md      # From mode 6.4
│   │   ├── strategy-advisor.md      # From mode 6.5
│   │   ├── productivity-advisor.md  # From mode 6.6
│   │   ├── vault-janitor.md         # From mode 6.7
│   │   ├── health-fitness.md        # From mode 6.8
│   │   ├── communication-writing.md # From mode 6.9
│   │   ├── network-management.md    # From mode 6.10
│   │   ├── learning-knowledge.md    # From mode 6.11
│   │   ├── technical-architecture.md# From mode 6.12
│   │   ├── legal-advisor.md         # From mode 6.13
│   │   ├── financial-advisor.md     # From mode 6.14
│   │   ├── general-advisor.md       # From mode 6.15
│   │   ├── weekly-review.md         # From mode 6.16
│   │   ├── daily-shutdown.md        # From mode 6.17
│   │   └── meeting-processing.md    # From mode 6.18
│   │
│   ├── context/                     # NEW: domain-specific context maps
│   │   ├── newsletter.md            # What to load for newsletter work
│   │   ├── business.md              # What to load for business work
│   │   ├── health.md                # What to load for health work
│   │   ├── content.md               # What to load for content creation
│   │   ├── investing.md             # What to load for investing
│   │   ├── network.md               # What to load for people/network
│   │   └── personal.md              # What to load for personal
│   │
│   ├── policies/                    # NEW: extracted from CLAUDE.md
│   │   ├── provocation-protocol.md  # Section 4 of current CLAUDE.md
│   │   ├── council-of-experts.md    # Section 7 of current CLAUDE.md
│   │   ├── proactivity-protocol.md  # Current proactivity rules
│   │   ├── linking-rules.md         # Note linking & vault graph rules
│   │   ├── security-boundaries.md   # Tool restrictions, permissions
│   │   ├── emergency-protocols.md   # Anxiety, victim mode responses
│   │   └── formatting-rules.md      # Language, style, anti-slop
│   │
│   ├── memory/                      # NEW: cross-session persistence
│   │   ├── learnings/               # What the system has learned
│   │   │   ├── execution.md         # Task approach improvements
│   │   │   ├── preferences.md       # Your style, tone, habits
│   │   │   └── mistakes.md          # Errors to avoid
│   │   ├── signals/                 # Your feedback
│   │   │   └── ratings.jsonl        # Timestamped quality signals
│   │   ├── work/                    # Work-in-progress tracking
│   │   │   └── current.md           # What's active, what stage, next step
│   │   └── context-log.md           # Existing AI Context Log (moved)
│   │
│   ├── hooks/                       # NEW: event-driven automation
│   │   ├── on-session-start.ts      # Load context, check WIP, greet
│   │   ├── on-session-end.ts        # Capture learnings, update WIP
│   │   ├── on-feedback.ts           # Capture ratings and corrections
│   │   └── lib/                     # Shared utilities
│   │
│   ├── My AgentOS/                  # EXISTING — unchanged
│   │   ├── CV Krzysztof Goworek.md
│   │   ├── Deep Profile & Operating Manual.md
│   │   ├── Personal Information.md
│   │   └── ...
│   │
│   ├── Prompts/                     # EXISTING — gradually migrate into skills
│   │   └── (18 files)
│   │
│   └── scripts/                     # EXISTING — unchanged, extended
│       ├── daily-brief.sh
│       ├── deep-work-block.sh
│       ├── weekly-review.sh
│       ├── vault-cleanup.sh
│       ├── daily-close.sh
│       └── notify-utils.sh
│
├── CLAUDE.md                        # TRANSITIONAL: slim router that
│                                    # points to AI/CORE.md + AI/skills/
│                                    # Eventually becomes just a pointer
│
└── [rest of vault unchanged]
```

### 3.1 How Context Loading Changes

**Current** (every session):
```
Load CLAUDE.md (14,500 tokens) → all 18 modes, all rules, everything
Maybe read AI Context Log (+2,000 tokens)
Maybe read Deep Profile (+3,000 tokens)
= 15,000–20,000 tokens before any work starts
```

**Target** (per session):
```
Load CLAUDE.md slim router (1,000 tokens) → identity, routing table
Auto-load via on-session-start hook:
  → AI/memory/work/current.md (WIP state, 200 tokens)
  → AI/memory/context-log.md (current situation, 2,000 tokens)
  → Relevant skill file ONLY (500–2,000 tokens per skill)
  → Relevant context map ONLY (300 tokens)
  → Relevant policies ONLY (loaded by skill reference)
= 4,000–6,000 tokens, precisely targeted
```

**The key mechanism**: Each skill file declares what it needs:

```yaml
---
name: AI Equilibrium Editor
triggers: ["newsletter", "AI Equilibrium", "content", "AIEQ"]
context_files:
  - AI/context/newsletter.md
  - Content/AI Equilibrium/
policies:
  - provocation-protocol
  - formatting-rules
voice: "British English, authoritative, insightful, direct, pragmatic"
---

# AI Equilibrium Editor

[Mode-specific instructions extracted from CLAUDE.md 6.1]
```

And each context map declares what vault files matter for that domain:

```yaml
# AI/context/newsletter.md
---
domain: newsletter
---

## Primary Files
- Content/AI Equilibrium/ (all issues, ideas, pipeline)
- AI/Prompts/AIEQ*.md (pipeline prompts)
- Content/Newsletter Ideas.md

## Secondary Files (load if relevant)
- Areas/Companies/ (for business angles)
- Notes/Meeting Notes/ (last 7 days, for recency)

## Current State
- Read from: AI/memory/context-log.md → newsletter section
- Active WIP: AI/memory/work/current.md → newsletter items
```

### 3.2 How Memory Works

**Cross-session memory** (the biggest gap in the audit):

```
Session ends →
  on-session-end hook fires →
    1. Updates AI/memory/work/current.md
       (what was worked on, what stage, next step)
    2. Appends to AI/memory/learnings/ if corrections occurred
    3. Captures rating if given (to signals/ratings.jsonl)
    4. Updates AI/memory/context-log.md if significant changes

Next session starts →
  on-session-start hook fires →
    1. Reads AI/memory/work/current.md
       → "Last session you were drafting newsletter #48,
          you completed the outline, next step is writing
          the intro section"
    2. Reads recent learnings
    3. Reads context-log.md
    → Provides continuity without user re-explaining
```

**Learnings structure**:

```markdown
# AI/memory/learnings/preferences.md

## Writing Style
- Newsletter tone: conversational expert, like explaining to a smart friend
- Anti-patterns: never use "furthermore", "it is worth noting", "in conclusion"
- [Added 2026-02-04 after user rewrote 60% of newsletter #47 draft]

## Communication
- LinkedIn posts: max 1300 chars, hook in first line, no hashtags in body
- Email: direct, no pleasantries beyond first line
- [Added 2026-01-20]

## Workflow
- Don't suggest reorganizing vault structure proactively — user said no 4 times
- When doing weekly review, always check Reminders BEFORE calendar
- [Added 2026-01-26]
```

### 3.3 How Feedback Capture Works

**Explicit** (user rates or corrects):
```
User: "That draft was a 3/10, way too formal"
→ on-feedback hook captures:
  {timestamp, task: "newsletter-draft", rating: 3, feedback: "too formal"}
→ Appends to signals/ratings.jsonl
→ If rating < 6: auto-creates learning entry in mistakes.md
```

**Implicit** (user rewrites, corrects, or re-asks):
```
User significantly edits AI output → detected by diff
→ Learning: "User changed [what] to [what], in context [task]"
→ Stored in learnings/preferences.md
```

**Proactivity learning** (from current CLAUDE.md, but now persistent):
```
User rejects suggestion type 3+ times →
→ Stored in learnings/preferences.md as negative preference
→ Persists across sessions (currently lost at session end)
```

---

## 4. SAFE TRANSFORMATION PROGRAM

### Guiding Principles

1. **Never break what works**. Every step must leave the system functional.
2. **Additive before subtractive**. Create new structure first, then migrate.
3. **Git checkpoint after every step**. Commit with descriptive messages. Rollback = `git revert`.
4. **Test after each step**. Run a representative task to verify nothing broke.
5. **CLAUDE.md is the last thing to slim down**. It stays as the authority until all skills are verified.

### Step 0: Prepare (no vault changes)

```
□ Git status clean, all committed
□ Create a git branch: ai-genius-transformation
□ Document current CLAUDE.md section boundaries (line numbers for each mode)
□ Verify all 5 launchd scripts are working
□ Verify eventkit-cli and mail-cli are working
□ Baseline: run one session with current setup, note behavior
```

### Step 1: Create the New Directory Structure

**Risk: ZERO** — only creates new empty folders and template files.

```
□ Create AI/skills/ directory
□ Create AI/context/ directory
□ Create AI/policies/ directory
□ Create AI/memory/ directory structure
    └── learnings/, signals/, work/
□ Create AI/hooks/ directory
□ Create _SKILL-TEMPLATE.md with standard skill format
□ Git commit: "scaffold: create modular AI architecture directories"
```

### Step 2: Extract Policies from CLAUDE.md

**Risk: LOW** — creates new files, does NOT modify CLAUDE.md yet.

```
□ Extract Provocation Protocol (Section 4) → AI/policies/provocation-protocol.md
□ Extract Council of Experts (Section 7) → AI/policies/council-of-experts.md
□ Extract proactivity rules → AI/policies/proactivity-protocol.md
□ Extract note linking rules → AI/policies/linking-rules.md
□ Extract security/boundary rules → AI/policies/security-boundaries.md
□ Extract emergency protocols → AI/policies/emergency-protocols.md
□ Extract formatting/style rules → AI/policies/formatting-rules.md
□ Each policy file is a clean standalone document
□ Verify: read each policy file, confirm it matches CLAUDE.md source
□ Git commit: "extract: policies from CLAUDE.md into modular files"
```

### Step 3: Extract Skills from CLAUDE.md

**Risk: LOW** — creates new files, does NOT modify CLAUDE.md yet.

```
□ For each of the 18 modes (6.1–6.18):
  □ Create AI/skills/{skill-name}.md
  □ Copy the full mode definition
  □ Add YAML frontmatter: name, triggers, context_files, policies, voice
  □ Add references to which policies this skill uses
  □ Add references to which context maps this skill needs
□ Verify: each skill file is self-contained and readable
□ Verify: no mode content was lost in extraction
□ Git commit: "extract: 18 skill modes from CLAUDE.md into skill files"
```

### Step 4: Create Context Maps

**Risk: LOW** — new files only, additive.

```
□ Create AI/context/newsletter.md
  → Map: Content/AI Equilibrium/, AI/Prompts/AIEQ*, Newsletter Ideas
□ Create AI/context/business.md
  → Map: Projects/GPR/, Areas/Companies/, Projects/Deals/
□ Create AI/context/health.md
  → Map: Areas/Health/, Health OS
□ Create AI/context/content.md
  → Map: Content/, short-form video ideas
□ Create AI/context/investing.md
  → Map: Areas/Investing/
□ Create AI/context/network.md
  → Map: Areas/People/
□ Create AI/context/personal.md
  → Map: light references only, advisory-only flag
□ Each context map lists: primary files, secondary files, related domains
□ Git commit: "create: domain context maps for selective loading"
```

### Step 5: Bootstrap Memory System

**Risk: LOW** — new files, additive. Moves AI Context Log (creates symlink or updates references).

```
□ Create AI/memory/context-log.md
  → Copy content from AI/AI Context Log.md
  → Add symlink or update CLAUDE.md reference to point to new location
  → Keep old file with a redirect note (don't break existing scripts)
□ Create AI/memory/work/current.md
  → Start with empty template: "No active WIP from previous session"
□ Create AI/memory/learnings/execution.md (empty template)
□ Create AI/memory/learnings/preferences.md
  → Seed with known preferences from CLAUDE.md (language rules, style, etc.)
□ Create AI/memory/learnings/mistakes.md (empty template)
□ Create AI/memory/signals/ratings.jsonl (empty)
□ Git commit: "bootstrap: memory system with initial state"
```

### Step 6: Slim Down CLAUDE.md (The Critical Step)

**Risk: MEDIUM** — this changes the primary instruction file.

**Strategy**: Don't delete anything from CLAUDE.md yet. Instead, create a NEW slim CLAUDE.md that references the modular files, and rename the old one as CLAUDE-legacy.md for safety.

```
□ Rename CLAUDE.md → CLAUDE-legacy.md
□ Create new CLAUDE.md (~4,000 tokens) containing ONLY:
  1. Identity & voice (Section 2 essentials — who you are, who user is)
  2. Universal rules (formatting, language, anti-slop — the ones that apply to ALL modes)
  3. Vault structure overview (condensed)
  4. Tool reference (eventkit-cli, mail-cli — just the essentials)
  5. Skill routing table:
     "Based on the user's request, identify the relevant skill from AI/skills/.
      Read the skill file. Follow its instructions.
      If no skill matches, use AI/skills/general-advisor.md."
  6. Policy loading instruction:
     "Each skill references policies. Read the referenced policies from AI/policies/."
  7. Context loading instruction:
     "Each skill references context maps. Read the context map from AI/context/.
      Load the primary files listed. Load secondary files only if relevant."
  8. Memory instruction:
     "At session start, read AI/memory/work/current.md and AI/memory/context-log.md.
      At session end, update these files."
□ Test: run a session with the new CLAUDE.md
  → Verify skill routing works (try triggering 3-4 different skills)
  → Verify context loading works (are the right files being read?)
  → Verify formatting/style is preserved
  → Verify provocation protocol still fires
□ If test fails: git checkout CLAUDE.md (instant rollback)
□ If test passes: git commit "refactor: slim CLAUDE.md with modular skill routing"
□ Keep CLAUDE-legacy.md for 2 weeks, then remove
```

### Step 7: Add Hook System

**Risk: LOW** — additive automation on top of working system.

```
□ Create AI/hooks/on-session-start.ts (Bun script)
  → Read AI/memory/work/current.md
  → Read AI/memory/context-log.md (last 50 lines)
  → Read AI/memory/learnings/ (recent entries)
  → Output: context summary injected into session
□ Create AI/hooks/on-session-end.ts
  → Prompt: update work/current.md with session summary
  → Prompt: capture any learnings from this session
  → Prompt: update context-log.md if significant changes occurred
□ Create AI/hooks/on-feedback.ts
  → Detect explicit ratings (1-10 pattern)
  → Append to signals/ratings.jsonl
  → If rating < 6: trigger learning capture
□ Register hooks in Claude Code settings.json
□ Test: run a session, verify hooks fire correctly
□ Git commit: "add: PAI-style hook system for memory persistence"
```

### Step 8: Enhance Existing Automation

**Risk: LOW** — modifies existing scripts minimally.

```
□ Update daily-brief.sh:
  → Add: read AI/memory/work/current.md for WIP items in briefing
  → Add: read AI/memory/learnings/ for recent learnings in briefing
□ Update daily-close.sh:
  → Add: update AI/memory/work/current.md at end of day
  → Add: update AI/memory/context-log.md
□ Update weekly-review.sh:
  → Add: review AI/memory/learnings/ — synthesize weekly patterns
  → Add: review AI/memory/signals/ — analyze quality trends
  → Add: propose CLAUDE.md or skill file improvements based on data
□ Test each script after modification
□ Git commit: "enhance: existing launchd scripts with memory awareness"
```

### Step 9: Add Challenger Behavior as Policy

**Risk: LOW** — new policy file + CORE.md reference.

```
□ Create AI/policies/challenger-protocol.md
  → Rules: always consider if the task can be improved before executing
  → Rules: connect to other domains when relevant
  → Rules: if user asks for something suboptimal, suggest the better path
  → Guardrails: max 1 challenge per interaction, accept "just do it" gracefully
  → Track: when challenges are accepted vs. overridden (in learnings)
□ Reference from CLAUDE.md universal rules
□ Git commit: "add: challenger protocol for proactive quality improvement"
```

### Step 10: Verify and Clean Up

```
□ Run full test suite:
  → Trigger each of the 18 skills explicitly
  → Test cross-domain context loading (newsletter + business)
  → Test memory persistence (end session, start new, verify WIP handoff)
  → Test feedback capture (give rating, verify it's stored)
  → Test challenger mode (give a suboptimal request, verify pushback)
  → Test all 5 launchd scripts
  → Test afk-code remote control
□ If all pass:
  □ Remove CLAUDE-legacy.md
  □ Update AI/My AgentOS/ references if needed
  □ Git commit: "complete: AI Genius transformation verified"
□ If any fail:
  □ Fix individually, test again
  □ Or rollback specific steps: git revert [commit]
```

---

## 5. WHAT THIS ENABLES (Future Expansion)

Once the modular architecture is in place, these become straightforward additions:

| Capability | How to add it | Effort |
|---|---|---|
| **New skill** | Create one .md file in AI/skills/ | 15 minutes |
| **New domain** | Create context map + optionally new skill | 30 minutes |
| **Voice interface** | New interface that reads skills/context maps, pipes to Claude | Separate project |
| **More hooks** | Add .ts files to AI/hooks/, register in settings.json | 1 hour each |
| **Proactive scanning** | New launchd script that reads context maps, runs analysis | Half day |
| **New service connector** | New CLI tool or MCP server, reference in skills | Per service |
| **A/B testing prompts** | Version skill files (v1, v2), track ratings by version | 2 hours |
| **Cross-domain intelligence** | Skill reads multiple context maps, pulls from several domains | Built into architecture |

The architecture is designed so that Claude Code — running on your Mac Mini or anywhere — can itself propose and create new skills, policies, and context maps. The system improves by adding files, not by editing a monolith.

---

## 6. WHAT I IMPROVED ON YOUR THINKING

1. **No management hierarchy needed.** The modular file structure IS the management structure. Skills are your "employees." Context maps are their "briefings." Policies are the "company handbook." Memory is the "institutional knowledge." You don't need CoS/Directors — you need good file organization and smart context loading.

2. **Context maps are more valuable than a dispatcher daemon.** A daemon is complex software to build and maintain. Context maps are markdown files that tell Claude what to read. Same result, 100x simpler.

3. **The hook system does what a dispatcher does, but lighter.** PAI's hook pattern (on-session-start, on-session-end, on-feedback) gives you event-driven behavior without building a custom server.

4. **Keep the existing CLAUDE.md as the routing layer.** Claude Code already loads this automatically. Don't fight that — use it as the thin router that points to the modular system. No need for a separate dispatcher.

5. **Memory solves your #1 problem without infrastructure.** Cross-session persistence via markdown files in AI/memory/ is simple, inspectable, version-controlled, and works immediately. No database, no daemon, no server.

6. **Your launchd scripts are already the "proactive pipeline."** They run daily/weekly on schedule. Enhancing them with memory awareness (read learnings, update WIP) gives you proactive behavior without building new infrastructure.

7. **The transformation is ~10 steps, each independently rollbackable.** No big bang migration. No risk of losing your current working system.
