# LifeOS → Smart Modular Architecture: Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for the transformation project. It contains:

1. **Your current state** — what exists in this vault right now
2. **PAI patterns to adopt** — reference implementation at `~/PAI-reference/`
3. **The transformation plan** — step-by-step, safe, rollback-friendly
4. **Constraints** — what you must NOT break

**Reference repo**: The PAI (Personal AI Infrastructure) repo should be cloned at `~/PAI-reference/`. Read files there for implementation patterns. Do NOT copy files verbatim — adapt patterns to fit this vault's existing structure and conventions.

**Safety rule**: After EVERY step, commit to git with a descriptive message. If anything breaks, `git revert` that commit. CLAUDE.md stays untouched until Step 6.

---

## PART 1: CURRENT STATE (Audit Summary)

### 1.1 Primary Instruction File

`CLAUDE.md` at vault root. 58,119 bytes (~14,500 tokens). Monolithic. Contains:
- Vault overview, folder structure, frontmatter schemas
- Tool documentation (eventkit-cli, mail-cli)
- Identity & core directives (thinking partner, not yes-man)
- Provocation Protocol (counterarguments, draft critique, metacognitive close)
- AI Context Log management rules
- 18 specialized modes (6.1–6.18)
- Council of Experts method
- Emergency protocols
- Proactivity protocol
- Note linking & vault graph building rules

This file is auto-loaded by Claude Code at every session start.

### 1.2 Supplementary Context Files (read on demand)

| File | Purpose |
|---|---|
| `AI/AI Context Log.md` | Current situation, priorities, pipeline — in Polish |
| `AI/My AgentOS/CV Krzysztof Goworek.md` | Professional profile |
| `Areas/Health/Health OS.md` | Health protocols, pharmacotherapy, fitness |
| `AI/My AgentOS/Deep Profile & Operating Manual.md` | Psychological profile, strengths, interaction rules |
| `AI/GPR to Reminders Mapping.md` | Project ↔ Reminders list mappings |

### 1.3 The 18 Modes (to become 18 skills)

| # | Mode | Trigger Keywords |
|---|---|---|
| 6.1 | AI Equilibrium Editor | newsletter, AI Equilibrium, content |
| 6.2 | Translator EN→PL | translation requests |
| 6.2b | Editing & Rewriting | editing existing prose |
| 6.3 | Zen Jaskiniowca | life advice, motivation, existential |
| 6.4 | Business Advisor | revenue, strategy, career |
| 6.5 | Strategy Advisor | negotiation, power dynamics |
| 6.6 | Productivity Advisor | time management, prioritisation |
| 6.7 | Vault Janitor | vault organisation, cleanup |
| 6.8 | Health & Fitness | diet, training, supplements, TRT |
| 6.9 | Communication & Writing | emails, LinkedIn, pitches |
| 6.10 | Network Management | relationships, follow-ups |
| 6.11 | Learning & Knowledge | Readwise, frameworks, research |
| 6.12 | Technical Architecture | tech stack, tools, automation |
| 6.13 | Legal Advisor | contracts, legal questions |
| 6.14 | Financial Advisor | portfolio, allocation |
| 6.15 | General Advisor | fallback mode |
| 6.16 | Weekly Review (GTD) | "start weekly review" |
| 6.17 | Daily Shutdown | "end of day", 18:00+ |
| 6.18 | Meeting Notes Processing | "process meetings" |

### 1.4 Existing Automation

5 launchd scripts in `AI/scripts/`:
| Script | Schedule | What it does |
|---|---|---|
| `daily-brief.sh` | 8:00 AM daily | Morning briefing via Claude CLI |
| `deep-work-block.sh` | 8:30 AM weekdays | Calendar analysis, deep work setup |
| `weekly-review.sh` | 10:00 AM Sunday | 7-phase GTD review |
| `vault-cleanup.sh` | 11:00 AM 1st Saturday | Vault maintenance |
| `daily-close.sh` | 10:00 PM daily | End-of-day processing |

All invoke `claude -p --permission-mode bypassPermissions --model sonnet`.
Notifications via Discord webhook + Telegram bot fallback (`notify-utils.sh`).

### 1.5 Tools & Integrations

**Custom CLI tools** (Swift, in `Tools/`):
- `eventkit-cli` — Apple Calendar & Reminders
- `mail-cli` — Apple Mail

**Remote control**: `afk-code` (Node.js, `~/afk-code`) — Discord/Telegram → Claude Code relay

**6 MCP servers**: Gemini, Google Workspace, Brave Search, Firecrawl, Apple MCP (overridden by eventkit-cli), Perplexity

**Obsidian plugins** (integration-relevant): obsidian-git, dataview, readwise-official, obsidian-claude-chat, templater-obsidian, auto-template-trigger, quickadd, calendar, obsidian-advanced-uri

### 1.6 Vault Structure

```
LifeOS/
├── AI/                  # AgentOS config, prompts, skills, scripts, context log
│   ├── My AgentOS/      # 22 files: CV, deep profile, brand context, cue cards
│   ├── Prompts/         # 18 prompt templates (AIEQ pipeline, Quintant, meta)
│   ├── scripts/         # 5 automation scripts + utilities + launchd plists
│   └── skills/          # 5 existing skill build specs + eventkit-cli docs
├── Archive/             # Completed GPR projects, archived tasks
├── Areas/               # Companies, People, Investing, Health, Life Areas
├── Content/             # AI Equilibrium newsletter, ideas, video, landing pages
├── Notes/               # Daily Notes, Journal, Meeting Notes, Inbox, Topics
├── Projects/            # Active GPR projects, Deals, Proposals
├── Readwise/            # Synced highlights
├── Resources/           # Processes, coaching material
├── Tools/               # eventkit-cli, mail-cli source code
├── Tracking/            # Habits, Objectives, Key Results, Years
├── _System/             # Dashboard, 24 .base database files, Templates, Media
└── CLAUDE.md            # Primary instruction file (58KB)
```

24 active `.base` database files in `_System/Databases/`.

### 1.7 Critical Gaps (from audit)

1. **No cross-session memory** — every session starts from zero
2. **No feedback/improvement loop** — system is static until manually edited
3. **Monolithic instruction file** — 58KB, no conditional loading
4. **No event-driven hooks** — everything is time-scheduled or manual
5. **No work-in-progress persistence** — multi-session tasks have no handoff
6. **No rule priority/conflict resolution** — left to AI judgement
7. **No context budget management** — no selective loading
8. **Proactivity learning resets** every session (not persistent)

---

## PART 2: PAI PATTERNS TO ADOPT

Reference: `~/PAI-reference/` (clone of https://github.com/danielmiessler/PAI)

Read these directories for implementation patterns. Adapt, don't copy.

### 2.1 Skill System

**Read**: `~/PAI-reference/Packs/pai-core-install/skills/CORE/`

PAI skill structure:
```yaml
---
name: SkillName              # TitleCase
description: What it does. USE WHEN [triggers]. [Capabilities].
---

# SkillName

## Voice Notification
[What to say when executing]

## Customization
Check USER/SKILLCUSTOMIZATIONS/{SkillName}/PREFERENCES.md

## Workflows
- WorkflowName: Description

## Tools
- ToolName.ts: Does X
```

**Adapt for this vault**: Use the same YAML frontmatter pattern, but:
- Add `triggers:` array (keyword matching for routing)
- Add `context_files:` array (which context maps to load)
- Add `policies:` array (which policy files apply)
- Add `voice:` (tone/style for this mode)
- Keep the mode content from current CLAUDE.md — don't rewrite it

### 2.2 Memory System

**Read**: `~/PAI-reference/Packs/pai-core-install/skills/CORE/SYSTEM/MEMORYSYSTEM.md`

PAI memory structure:
```
MEMORY/
├── WORK/           # Active work tracking
├── LEARNING/       # By category: SYSTEM, ALGORITHM, SYNTHESIS, SIGNALS
├── RESEARCH/       # Agent outputs
├── SECURITY/       # Audit trail
└── STATE/          # Runtime state (ephemeral)
```

**Adapt for this vault**: Simpler version in `AI/memory/`:
```
memory/
├── work/current.md         # WIP tracking (what, stage, next step)
├── learnings/
│   ├── execution.md        # How to approach tasks
│   ├── preferences.md      # User style, tone, habits
│   └── mistakes.md         # Errors to not repeat
├── signals/ratings.jsonl   # Timestamped quality ratings
└── context-log.md          # Moved from AI/AI Context Log.md
```

### 2.3 Hook System

**Read**: `~/PAI-reference/Packs/pai-hook-system/hooks/`

PAI hooks are TypeScript files registered in Claude Code's `settings.json`. Key patterns:
- `SessionStart` hooks — inject context at session start
- `Stop` hooks — capture learnings at session end
- `UserPromptSubmit` hooks — process user input (e.g., rating capture)
- All hooks: read JSON from stdin, write JSON to stdout, exit 0 (never block)
- Fire-and-forget design — never crash Claude Code

**Key files to study**:
- `~/PAI-reference/Packs/pai-hook-system/hooks/SessionStart/LoadContext.hook.ts`
- `~/PAI-reference/Packs/pai-hook-system/hooks/Stop/SessionSummary.hook.ts`
- `~/PAI-reference/Packs/pai-hook-system/hooks/Stop/WorkCompletionLearning.hook.ts`
- `~/PAI-reference/Packs/pai-hook-system/hooks/UserPromptSubmit/ExplicitRatingCapture.hook.ts`
- `~/PAI-reference/Packs/pai-hook-system/hooks/lib/` (shared utilities)

**Adapt for this vault**: Create hooks in `AI/hooks/`:
- `on-session-start.ts` — read WIP state, context log, recent learnings
- `on-session-end.ts` — update WIP, capture learnings
- `on-feedback.ts` — detect ratings (1-10 pattern), store in signals
- Register in `~/.claude/settings.json` or project-level `.claude/settings.json`

### 2.4 CORE Skill (Routing Layer)

**Read**: `~/PAI-reference/Packs/pai-core-install/skills/CORE/SKILL.md`

PAI's CORE skill is the "operating system" — auto-loaded, routes to other skills.

**Adapt for this vault**: The slim CLAUDE.md becomes this. It should contain:
1. Identity (who the AI is, who the user is)
2. Universal rules (apply to ALL skills)
3. Skill routing instruction ("read the matching skill file from AI/skills/")
4. Memory instruction ("read WIP and context at session start, update at end")
5. Vault structure overview (condensed)
6. Tool reference (eventkit-cli, mail-cli essentials)

Target: ~4,000 tokens vs current 14,500.

### 2.5 Learning & Feedback Capture

**Read**: `~/PAI-reference/Packs/pai-hook-system/hooks/UserPromptSubmit/ExplicitRatingCapture.hook.ts`
**Read**: `~/PAI-reference/Packs/pai-hook-system/hooks/Stop/WorkCompletionLearning.hook.ts`

PAI captures:
- Explicit ratings: regex pattern `^(10|[1-9])(?:\s*[-:]\s*|\s+)?(.*)$`
- Work completion learnings: at session end, captures what worked/didn't
- Implicit sentiment: detects frustration in prompts

**Adapt**: Same patterns, writing to `AI/memory/signals/` and `AI/memory/learnings/`.

### 2.6 Two-Tier Configuration (SYSTEM/USER)

**Read**: `~/PAI-reference/Packs/pai-core-install/skills/CORE/SYSTEM/` and `~/PAI-reference/Packs/pai-core-install/skills/CORE/USER/`

PAI separates system-authored config (SYSTEM/) from user-authored overrides (USER/). System files update with PAI releases; USER files never get overwritten.

**Adapt**: Not directly needed for this vault (no external updates to protect against), but the principle applies: keep policies as standalone files so skills can be modified independently.

---

## PART 3: TRANSFORMATION STEPS

### Constraints

**DO NOT TOUCH**:
- Vault folder structure (Areas/, Projects/, Notes/, Content/, etc.)
- All 24 .base database files and their frontmatter schemas
- Daily Notes, Meeting Notes, Journal structure
- eventkit-cli and mail-cli (Tools/ directory)
- afk-code remote control system
- Obsidian plugins and their configs
- Git workflow and .gitignore
- Discord/Telegram webhook setup
- Apple Reminders as primary task system
- GPR project tracking
- CLAUDE.md (until Step 6)

**ALWAYS**:
- Git commit after every step with descriptive message
- Verify the system works after each step
- Preserve ALL content from the 18 modes — extract, don't rewrite
- Keep everything in the AI/ directory (don't create new top-level folders)

### Step 0: Prepare

```
□ Ensure git status is clean, all committed
□ Create branch: git checkout -b ai-genius-transformation
□ Read CLAUDE.md and document section boundaries (line ranges for each mode, each policy section)
□ Verify all 5 launchd scripts work: check AI/scripts/*.log for recent successful runs
□ Verify eventkit-cli works: run `eventkit-cli reminders list`
□ Verify mail-cli works: run `mail-cli inbox --limit 1`
□ Git commit: "docs: document section boundaries in CLAUDE.md for extraction"
```

### Step 1: Create Directory Structure

**Risk: ZERO**

```
□ Create directories:
  AI/skills/
  AI/context/
  AI/policies/
  AI/memory/
  AI/memory/learnings/
  AI/memory/signals/
  AI/memory/work/
  AI/hooks/
  AI/hooks/lib/
□ Create AI/skills/_SKILL-TEMPLATE.md with:
  ---
  name: [Skill Name]
  triggers: ["keyword1", "keyword2"]
  context_files:
    - AI/context/[domain].md
  policies:
    - [policy-name]
  voice: "[tone description]"
  ---
  # [Skill Name]
  ## When to Activate
  ## Instructions
  ## Workflows
  ## Examples
□ Git commit: "scaffold: create modular AI architecture directories"
```

### Step 2: Extract Policies

**Risk: LOW** — new files only, CLAUDE.md unchanged.

Read CLAUDE.md. Find each of these sections. Extract to standalone files:

```
□ Provocation Protocol (Section 4) → AI/policies/provocation-protocol.md
  Include: counterargument requirement, draft critique mode, metacognitive close,
  provenance tagging, bypass commands ("just execute", "skip provocation")

□ Council of Experts (Section 7) → AI/policies/council-of-experts.md
  Include: the full method definition

□ Proactivity Protocol → AI/policies/proactivity-protocol.md
  Include: when to suggest, when to back off, the "3 nos" rule

□ Note Linking Rules (Section 3) → AI/policies/linking-rules.md
  Include: cross-linking mandates, bidirectional linking, daily note linking

□ Security & Tool Boundaries → AI/policies/security-boundaries.md
  Include: "NEVER use apple-mcp" rules, eventkit-cli mandate, legal disclaimers,
  strategy advisor boundaries, all NEVER/ALWAYS rules that apply globally

□ Emergency Protocols → AI/policies/emergency-protocols.md
  Include: anxiety responses, victim mode detection

□ Formatting & Style Rules → AI/policies/formatting-rules.md
  Include: language matching (Polish/English), British English rule,
  anti-slop rules, anti-corporatese, structured output rules,
  no emojis rule, ADHD-aware formatting

□ Git commit: "extract: 7 policy files from CLAUDE.md sections"
```

### Step 3: Extract Skills

**Risk: LOW** — new files only, CLAUDE.md unchanged.

For each mode, create a skill file. Read the PAI skill template at `~/PAI-reference/Packs/pai-core-install/skills/CORE/SKILL.md` for formatting reference.

```
□ For EACH of the 18 modes:
  1. Read the mode's full content from CLAUDE.md
  2. Create AI/skills/{skill-name}.md
  3. Add YAML frontmatter with:
     - name, triggers, context_files, policies, voice
  4. Copy the FULL mode content (instructions, templates, examples, anti-patterns)
  5. Add policy references (which AI/policies/ files this skill needs)
  6. Add context map references (which AI/context/ files this skill needs)

□ CRITICAL: Do NOT rewrite mode content. Extract verbatim.
  The mode instructions were carefully crafted. Preserve them exactly.
  Only add structure (frontmatter, headers) around them.

□ VERIFY: For each skill file, compare against CLAUDE.md source section.
  Nothing should be lost. Every rule, every example, every anti-pattern
  must be in the skill file.

□ Git commit: "extract: 18 skill files from CLAUDE.md modes"
```

### Step 4: Create Context Maps

**Risk: LOW** — new files only.

Each context map tells Claude which vault files matter for a domain. Read the vault structure, identify which folders/files are relevant to each domain.

```
□ Create AI/context/newsletter.md
  Primary: Content/AI Equilibrium/, AI/Prompts/AIEQ*, _System/Databases/Newsletter Ideas.base
  Secondary: Areas/Companies/ (business angles), Notes/Meeting Notes/ (last 7 days)
  Related domains: content, business

□ Create AI/context/business.md
  Primary: Projects/GPR/, Areas/Companies/, Projects/Deals/, Projects/Proposals/
  Secondary: AI/GPR to Reminders Mapping.md, Tracking/Objectives/
  Related domains: strategy, network, financial

□ Create AI/context/health.md
  Primary: Areas/Health/, Areas/Health/Health OS.md
  Secondary: Tracking/Habits/, Notes/Daily Notes/ (last 3 days for patterns)
  Related domains: personal

□ Create AI/context/content.md
  Primary: Content/, _System/Databases/Content Calendar.base, _System/Databases/Short-form Video Ideas.base
  Secondary: AI/Prompts/, Content/AI Equilibrium/ (for cross-promotion)
  Related domains: newsletter, business

□ Create AI/context/investing.md
  Primary: Areas/Investing/, _System/Databases/Investing Holdings.base
  Secondary: none
  Related domains: financial

□ Create AI/context/network.md
  Primary: Areas/People/, _System/Databases/People.base
  Secondary: Notes/Meeting Notes/ (last 14 days), Projects/Deals/
  Related domains: business

□ Create AI/context/personal.md
  Primary: [minimal — advisory only]
  Flag: advisory_only: true — do not proactively analyze personal notes
  Related domains: health

□ Git commit: "create: 7 domain context maps for selective loading"
```

### Step 5: Bootstrap Memory System

**Risk: LOW** — mostly new files. One file move (AI Context Log).

```
□ Create AI/memory/context-log.md
  → Copy FULL content from AI/AI Context Log.md
  → In the OLD file (AI/AI Context Log.md), replace content with:
    "This file has moved to AI/memory/context-log.md.
     All scripts and references should use the new location."
  → Update any references in CLAUDE.md to point to new location
  → Check AI/scripts/*.sh for references to the old path — update them

□ Create AI/memory/work/current.md with template:
  # Current Work in Progress
  _Updated by hooks at session end. Read by hooks at session start._
  ## Active Items
  None — fresh start.
  ## Last Session
  No previous session recorded.
  ## Next Steps
  None pending.

□ Create AI/memory/learnings/execution.md with template:
  # Execution Learnings
  _How to approach tasks better. Updated when patterns are noticed._

□ Create AI/memory/learnings/preferences.md
  → Seed with KNOWN preferences extracted from CLAUDE.md:
    - Language preferences (Polish/English matching, British English)
    - Anti-slop rules
    - Formatting preferences
    - Tool preferences (eventkit-cli over apple-mcp)
    - Any explicit "user prefers X" rules

□ Create AI/memory/learnings/mistakes.md with template:
  # Mistake Log
  _Errors to avoid. Updated when corrections occur._

□ Create empty AI/memory/signals/ratings.jsonl

□ Git commit: "bootstrap: memory system with initial state and migrated context log"
```

### Step 6: Slim Down CLAUDE.md

**Risk: MEDIUM** — this changes the primary instruction file.

```
□ FIRST: Rename current CLAUDE.md → CLAUDE-legacy.md
  (safety net — instant rollback by renaming back)

□ Create NEW CLAUDE.md containing ONLY (~4,000 tokens):

  1. IDENTITY (condensed from Section 2)
     - Who you are: expert assistant, thinking partner, not a yes-man
     - Who the user is: Krzysztof, creator/strategist, ADHD-aware
     - Voice: laconic, factual, structured, British English / natural Polish
     - No emojis unless requested

  2. UNIVERSAL RULES (apply to ALL skills)
     - Read AI/memory/work/current.md at session start
     - Read AI/memory/context-log.md at session start
     - Before substantive work: read AI/My AgentOS/Deep Profile & Operating Manual.md
     - At session end: update AI/memory/work/current.md
     - Always read relevant policies referenced by the active skill

  3. SKILL ROUTING
     "Based on the user's request, identify the relevant skill from AI/skills/.
      Read the matching skill file. Follow its instructions.
      If the skill references context maps (context_files), read them.
      If the skill references policies, read those policy files from AI/policies/.
      If no skill matches, use AI/skills/general-advisor.md.
      Inform the user which skill you selected."

  4. VAULT STRUCTURE (condensed to ~500 tokens)
     - Key folders and what's in them (one line each)
     - Database location: _System/Databases/
     - Frontmatter: always include base: reference

  5. TOOL REFERENCE (condensed)
     - eventkit-cli: calendar and reminders operations (NEVER use apple-mcp)
     - mail-cli: Apple Mail operations
     - Full docs: reference the tool documentation files for details

  6. GIT WORKFLOW (condensed)
     - Commit conventions
     - Branch rules

□ TEST the new CLAUDE.md:
  → Start a new Claude Code session
  → Ask "help me draft a newsletter issue" — should route to ai-equilibrium-editor skill
  → Ask "translate this to Polish" — should route to translator skill
  → Ask "what's on my calendar today" — should use eventkit-cli
  → Ask something that triggers provocation protocol — verify it still fires
  → Verify formatting matches expectations (British English, structured, no slop)

□ If tests pass: git commit "refactor: slim CLAUDE.md as modular skill router"
□ If tests fail: mv CLAUDE-legacy.md CLAUDE.md (instant rollback), debug

□ Keep CLAUDE-legacy.md for 2 weeks minimum
```

### Step 7: Add Hooks

**Risk: LOW** — additive, does not change existing behavior.

Study PAI hook implementations first:
```
Read: ~/PAI-reference/Packs/pai-hook-system/hooks/SessionStart/LoadContext.hook.ts
Read: ~/PAI-reference/Packs/pai-hook-system/hooks/Stop/SessionSummary.hook.ts
Read: ~/PAI-reference/Packs/pai-hook-system/hooks/UserPromptSubmit/ExplicitRatingCapture.hook.ts
Read: ~/PAI-reference/Packs/pai-hook-system/hooks/lib/
```

Then create adapted versions:

```
□ Create AI/hooks/on-session-start.ts
  → Reads AI/memory/work/current.md
  → Reads last 50 lines of AI/memory/context-log.md
  → Reads AI/memory/learnings/preferences.md (latest entries)
  → Outputs summary as session context injection
  → MUST: exit 0 always, never block, fast execution

□ Create AI/hooks/on-session-end.ts
  → Triggered on Stop event
  → Prompts Claude to update AI/memory/work/current.md
  → Prompts Claude to capture learnings if corrections occurred
  → MUST: fire-and-forget, never block

□ Create AI/hooks/on-feedback.ts
  → Triggered on UserPromptSubmit
  → Regex: detect rating pattern (1-10 with optional comment)
  → Append to AI/memory/signals/ratings.jsonl
  → If rating < 6: log to AI/memory/learnings/mistakes.md
  → MUST: exit 0 always

□ Create AI/hooks/lib/paths.ts
  → Shared vault paths, memory paths
  → File read/write utilities

□ Register hooks in project .claude/settings.json
  → Check PAI's settings.json for the registration format

□ Test: start session (verify on-session-start fires),
  give a rating (verify on-feedback captures it),
  end session (verify on-session-end updates WIP)

□ Git commit: "add: PAI-style hook system for memory and feedback"
```

### Step 8: Enhance Existing Automation

**Risk: LOW** — minimal changes to working scripts.

```
□ Update AI/scripts/daily-brief.sh:
  → Add to the Claude prompt: "Also read AI/memory/work/current.md
     for any work in progress, and include WIP status in the briefing."
  → Add: "Read AI/memory/learnings/mistakes.md for recent mistakes
     to be aware of today."

□ Update AI/scripts/daily-close.sh:
  → Add to the Claude prompt: "Update AI/memory/work/current.md
     with end-of-day status."
  → Add: "Update AI/memory/context-log.md if today had significant changes."

□ Update AI/scripts/weekly-review.sh:
  → Add: "Read AI/memory/signals/ratings.jsonl for this week's
     quality ratings. Summarize trends."
  → Add: "Read AI/memory/learnings/ and synthesize patterns.
     Propose any improvements to skill files or policies."
  → Add: "Check AI/memory/learnings/mistakes.md — are any
     mistakes repeating? If so, update the relevant skill file."

□ Test each script: run manually, verify output includes memory data

□ Git commit: "enhance: launchd scripts with memory awareness"
```

### Step 9: Add Challenger Protocol

**Risk: LOW** — new policy file only.

```
□ Create AI/policies/challenger-protocol.md:

  # Challenger Protocol

  ## When to Activate
  - Before executing any task that involves strategy, planning, or decisions
  - When the user asks for something that could be done significantly better
  - When cross-domain connections are relevant but not mentioned

  ## Behavior
  - Consider: can this task be improved beyond what was asked?
  - Consider: are there related items in other domains that connect?
  - Consider: is the user's approach the best one, or is there a better path?
  - If yes to any: briefly suggest the improvement BEFORE executing
  - Format: "Before I do this — [suggestion]. Want me to proceed as asked,
    or incorporate this?"

  ## Guardrails
  - Maximum 1 challenge per interaction (don't be annoying)
  - If user says "just do it" or similar: execute immediately, no further challenge
  - Track in AI/memory/learnings/execution.md: was challenge accepted or overridden?
  - Learn from patterns: if user always overrides a challenge type, stop offering it

  ## Integration
  - This policy should be referenced by business-advisor, strategy-advisor,
    communication-writing, and ai-equilibrium-editor skills
  - Does NOT apply to: translator, vault-janitor, meeting-processing (execution-only skills)

□ Add reference to challenger-protocol in relevant skill files' policies array

□ Git commit: "add: challenger protocol for proactive quality improvement"
```

### Step 10: Verify and Clean Up

```
□ Full verification:
  → Trigger at least 5 different skills explicitly — verify routing
  → Test memory: end session, start new session, verify WIP handoff
  → Test feedback: give a rating, verify it appears in ratings.jsonl
  → Test challenger: give a suboptimal business request, verify pushback
  → Test cross-domain: ask about newsletter + business, verify both context maps load
  → Run all 5 launchd scripts manually, verify they work with memory
  → Test afk-code: send a command via Discord, verify response

□ If all pass:
  □ Remove CLAUDE-legacy.md
  □ Final commit: "complete: LifeOS transformation to modular architecture"

□ If any fail:
  □ Fix the specific issue
  □ Or: git revert [specific commit] to undo just that step
  □ Re-test after fix
```

---

## PART 4: POST-TRANSFORMATION

Once complete, the system supports:

- **Adding new skills**: create one .md file in AI/skills/
- **Adding new domains**: create a context map in AI/context/
- **Adding new policies**: create a .md file in AI/policies/
- **Adding new hooks**: create a .ts file in AI/hooks/, register in settings.json
- **System self-improvement**: weekly review analyzes ratings and proposes changes to skill files
- **Cross-session continuity**: WIP state + learnings persist automatically
- **Feedback loop**: ratings and corrections accumulate, inform future behavior

The architecture grows by adding files. No monolith to edit. Each component is independent, testable, and replaceable.
