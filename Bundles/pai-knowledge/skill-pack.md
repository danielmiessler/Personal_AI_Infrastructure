# PAI Knowledge - Skill Pack

> AI-readable workflows, prompts, and knowledge for the Knowledge Transformation Stack

---

## The Problem

We're drowning in information but starving for knowledge.

Every day we capture notes, save articles, bookmark links, record voice memos. Yet when we need that information later, it's buried in a digital graveyard—folders we never open, apps we forgot we used, notes that lost their context.

**The problem isn't capture. The problem is that captured information doesn't become knowledge on its own.**

---

## The Vision

The Knowledge Transformation Stack transforms how you relate to information. Instead of a passive filing cabinet, you have an **active thinking partner that compounds over time**.

```
        ┌─────────────────┐
        │     CREATE      │  💡 New insights emerge
        ├─────────────────┤
        │    CONNECT      │  🔗 Ideas link and compound  ← The magic happens here
        ├─────────────────┤
        │     STORE       │  📁 Organized by actionability
        ├─────────────────┤
        │    CAPTURE      │  📥 Zero-friction input
        └─────────────────┘
```

**This Skill Pack enables the STORE and CONNECT layers**—semantic search, two-phase retrieval, and the foundational cultivation practice: the Sweep.

> *Part of the [Knowledge Transformation Stack](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/147)—enabling knowledge that compounds over time, not a digital graveyard.*

---

## What's Included

This Skill Pack provides the AI with:
- **Skill definition** — Routing triggers and CLI invocation
- **Workflows** — Step-by-step procedures (semantic search, sweep)
- **Knowledge** — Concepts, patterns, taxonomy

**Companion:** See `tool-pack.md` for CLI installation and reference.

---

## Installation

Copy SKILL.md to your skills directory:

```bash
mkdir -p ~/.claude/skills/Context/workflows
# Copy the SKILL.md section below to ~/.claude/skills/Context/SKILL.md
# Copy workflow sections to ~/.claude/skills/Context/workflows/
```

### Post-Installation: Build Embeddings

After installation, build the vector embeddings for semantic search:

```bash
# Initial build (may take a few minutes for large vaults)
ctx embed --verbose

# Check embedding stats
ctx embed --stats

# Force rebuild if needed
ctx embed --force
```

This creates a local vector database for `ctx semantic` searches. Run `ctx embed` periodically or after adding many notes to keep embeddings current.

---

## SKILL.md

Copy to: `~/.claude/skills/Context/SKILL.md`

```markdown
---
name: context
description: |
  Knowledge Management for markdown files. USE WHEN user asks: "what do I know
  about X", "find notes about", "search my notes", "sweep", "triage inbox",
  "load context for project", "tag health", "vault health". Two-phase workflow:
  SEARCH → wait for selection → LOAD.
---

# Context Skill (Knowledge Store)

## CLI Invocation

**ALWAYS use `ctx` directly.** The CLI is globally available via `bun link`.

```bash
# CORRECT
ctx search "topic"
ctx load 1,3
ctx sweep

# WRONG - Never use paths
bun run ~/.claude/bin/ctx/ctx.ts search "topic"
```

---

## Knowledge Transformation Stack

```
CAPTURE ──► ingest CLI
            Telegram → Markdown + Taxonomy tagging

STORE ────► ctx search, ctx load
            Semantic search, two-phase retrieval

CONNECT ──► ctx sweep
            Daily cultivation practice
```

---

## Primary Commands

| Command | Purpose |
|---------|---------|
| `ctx search <query>` | Find notes by content |
| `ctx load <selection>` | Load notes from last search |
| `ctx sweep` | Daily inbox cultivation |
| `ctx tags list` | Show all tags |

---

## Two-Phase Retrieval

**NEVER load notes without user confirmation.**

1. **SEARCH**: `ctx search "query"` → returns numbered results
2. **WAIT**: User selects which notes to load
3. **LOAD**: `ctx load 1,3,5` → loads selected notes

This prevents wasting context on irrelevant notes.

---

## Workflow Routing

| Intent | Workflow | Command |
|--------|----------|---------|
| Find notes | `workflows/semantic-search.md` | `ctx search` |
| Process inbox | `workflows/sweep.md` | `ctx sweep` |
| Tag health | `workflows/tag-grooming.md` | `ctx tags health` |
```

---

## Workflows

### workflows/semantic-search.md

Copy to: `~/.claude/skills/Context/workflows/semantic-search.md`

```markdown
# Semantic Search Workflow

Find notes by meaning, not just keywords.

## Steps

1. **Understand Intent**: What is the user looking for?
2. **Search**: Run `ctx search "query"` with appropriate flags
3. **Present Results**: Show matches with snippets
4. **Wait for Selection**: User picks notes to load
5. **Load**: Run `ctx load <selection>` for selected notes

## Search Options

```bash
# Text search
ctx search "machine learning"

# Tag-filtered search
ctx search --tag topic/ai "neural networks"

# Recent only
ctx search --days 30 "project updates"

# Limit results
ctx search --limit 5 "meeting notes"
```

## Example Flow

```
User: "What do I know about kubernetes?"

AI: [Runs: ctx search "kubernetes"]

    Found 12 notes:
    1. k8s-cluster-setup.md (0.92)
    2. helm-charts-guide.md (0.87)
    3. consensus-algorithms.md (0.85)

    Which would you like me to load?

User: "Load 1 and 2"

AI: [Runs: ctx load 1,2]
    [Content now in context]
```
```

---

### workflows/sweep.md

Copy to: `~/.claude/skills/Context/workflows/sweep.md`

```markdown
# Sweep: Daily Inbox Cultivation

**Cadence:** Daily (5-15 min)
**Purpose:** Clear the inbox with quick decisions.
**Command:** `ctx sweep`

## Workflow

1. `ctx sweep` - Show inbox overview with note IDs
2. User selects: `all` | `1,3,5` | `none`
3. Session starts, flashcards displayed one at a time
4. User picks action for each note

## Action Routing

| User Says | CLI Command | Then |
|-----------|-------------|------|
| `done` | `ctx done <idx>` | `ctx sweep next` |
| `priority high` | `ctx done <idx> -p high` | `ctx sweep next` |
| `rename [name]` | `ctx rename <idx> --to "name"` | `ctx sweep next` |
| `skip` | — | `ctx sweep next` |
| `delete` | `ctx delete <idx>` | `ctx sweep next` |
| `quit` | `ctx sweep clear` | End session |

## Flashcard Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 Note 1 of 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📛 NAME
   Current:   2025-12-30-Document-Telegram-Raw-123
   Suggested: AI Agent Architecture Ideas

📁 CLASSIFICATION
   PARA:  para/resource
   Scope: work

🏷️ TAGS
   On note:   topic/ai, ideas
   Suggested: +type/idea

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 SUMMARY: Article about AI agent architecture...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions: done | priority high | rename | skip | delete | quit
```

## Session Commands

```bash
ctx sweep status        # Check progress
ctx sweep next          # Advance to next
ctx sweep clear         # End session (archives)
ctx sweep clear --force # Discard session
```

## Example Session

```
User: "Let's sweep"

AI: [Runs: ctx sweep]

📊 INBOX: 5 notes | Generic: 3 (60%)

 #  │ Date       │ Title                          │ Tags
────────────────────────────────────────────────────────────
 1  │ 2025-12-30 │ Document-Telegram-Raw-456      │ topic/ai
 2  │ 2025-12-30 │ Photo-2025-12-30-789           │ home
 3  │ 2025-12-29 │ Kubernetes Best Practices      │ devops

Select: all | 1,2 | none

User: all

AI: [Runs: ctx sweep all]
    [Displays flashcard for note 1]

User: rename AI Agent Patterns

AI: [Runs: ctx rename 1 --to "AI Agent Patterns"]
    [Runs: ctx sweep next]
    [Displays flashcard for note 2]
```
```

---

## Invocation Patterns

The AI should use this skill when user says:

| User Says | AI Does |
|-----------|---------|
| "What do I know about X?" | `ctx search "X"` |
| "Find my notes on Y" | `ctx search "Y"` |
| "Load context for project Z" | `ctx search --tag project/Z` |
| "Let's sweep" / "Triage inbox" | `ctx sweep` |
| "Check tag health" | `ctx tags health` |
| "Sweep status" | `ctx sweep status` |

---

## Concepts

### Two-Phase Retrieval

Prevents loading irrelevant notes into context:
1. Search returns IDs and snippets (low token cost)
2. User confirms which to load
3. Only selected notes consume context

### Cultivation Practices

| Practice | Cadence | Command | Purpose |
|----------|---------|---------|---------|
| Sweep | Daily | `ctx sweep` | Clear inbox |
| Weave | Weekly | `ctx weave` | Connect ideas (future) |
| Dive | As needed | `ctx dive` | Deep exploration (future) |

### 13-Dimension Taxonomy

Notes are tagged across dimensions:
- PARA: project, area, resource, archive
- Type: fleeting, literature, permanent
- Status: inbox, raw, cultivated
- Source: telegram, web, voice, document
- Scope: work, personal, home
- Topic: ai, devops, writing, etc.
- Person: firstname_lastname
- Plus: format, session, project, lifeos, git

---

## Taxonomy Configuration

The taxonomy consolidates the 13-dimension schema, keyword detection, title patterns, and validation rules into a single file.

### taxonomy.yaml

Copy to: `~/.claude/context/taxonomies/default.yaml`

```yaml
# PAI Knowledge Taxonomy - Single Source of Truth
# Consolidates dimensional taxonomy + keyword detection + title patterns
# Version: 2.0

version: "2.0"
name: default
description: |
  Multi-dimensional tag taxonomy combining PARA method for actionability
  and Zettelkasten for intellectual maturity. Includes keyword-based
  auto-detection for ingest processing.

# =============================================================================
# DIMENSIONS - The 13-dimension taxonomy schema
# =============================================================================

dimensions:
  # 1. PARA Classification (Actionability)
  - name: para
    prefix: "para/"
    type: closed
    values: [project, area, resource, archive]
    required: false

  # 2. Instance (Specific project/area/lifeos domain)
  - name: instance
    prefix: "project/|lifeos/|area/"
    type: open
    pattern: "^(project|lifeos|area)/[a-z0-9-]+$"
    freeform: true

  # 3. Note Type - Zettelkasten Maturity
  - name: type
    prefix: "type/"
    type: closed
    values: [fleeting, literature, permanent, synthesized, reference]
    required: true
    default: fleeting

  # 4. Content Format
  - name: format
    prefix: "format/"
    type: closed
    values: [transcript, meeting-notes, article, research, ideas, howto, screenshot, summary, demo, interview, technical]
    required: false

  # 5. Person
  - name: person
    prefix: "person/"
    type: open
    pattern: "^person/[a-z_]+$"
    freeform: true

  # 6. Source (Capture channel)
  - name: source
    prefix: "source/"
    type: closed
    values: [telegram, clipboard, voice, web, file, screenshot, cli]
    required: true
    default: telegram

  # 7. Scope (Privacy)
  - name: scope
    prefix: "scope/"
    type: closed
    values: [work, personal]
    required: false
    default: work

  # 8. Status (Processing state)
  - name: status
    prefix: "status/"
    type: closed
    values: [inbox, processing, cultivated, archived]
    required: true
    default: inbox

  # 9. Topic (Knowledge domain)
  - name: topic
    prefix: "topic/"
    type: open
    pattern: "^topic/[a-z0-9/-]+$"
    freeform: true

  # 10. Session (Cultivation session)
  - name: session
    prefix: "session/"
    type: open
    pattern: "^session/[a-z0-9-]+$"
    freeform: true

  # 11. Git (Source control)
  - name: git
    prefix: "git/"
    type: closed
    values: [track, sensitive]
    required: false

  # 12. Priority (Signal importance)
  - name: priority
    prefix: "priority/"
    type: closed
    values: [high, low]
    required: false

  # 13. Action (Async processing queue)
  - name: action
    prefix: "action/"
    type: closed
    values: [extract-wisdom, fetch-source, summarize]
    required: false

# =============================================================================
# KEYWORD DETECTION - Auto-tagging based on content keywords
# =============================================================================

keyword_detection:
  # Format detection
  format/meeting-notes:
    keywords: [meeting, standup, sync, all-hands, retro, 1:1, 1on1, "one on one"]
  format/ideas:
    keywords: [idea, brainstorm, concept, "what if"]
  format/article:
    keywords: [article, blog, post, newsletter]
  format/research:
    keywords: [research, study, paper, analysis]

  # Topic detection
  topic/ai:
    keywords: [ai, artificial intelligence, machine learning, ml, neural, llm, gpt, claude, anthropic]
  topic/ai/genai:
    keywords: [genai, generative ai, chatgpt, copilot, midjourney]
  topic/ai/agents:
    keywords: [agent, agentic, tool use, function calling]
  topic/pkm:
    keywords: [pkm, knowledge management, second brain, zettelkasten]
  topic/security:
    keywords: [security, vulnerability, pentest, threat, exploit, infosec]
  topic/architecture:
    keywords: [architecture, design patterns, system design, enterprise]
  topic/engineering:
    keywords: [engineering, software development, coding, programming]
  topic/cloud/aws:
    keywords: [aws, amazon, ec2, lambda, s3]

  # Para classification hints
  para/resource:
    keywords: [reference, resource, guide, documentation, docs]

# =============================================================================
# PROJECT KEYWORDS - Map keywords to project tags
# Customize with your own project names and keywords
# =============================================================================

project_keywords:
  project/pai:
    keywords: [claude, kai, fabric, ingest, obs, "personal ai", pai, context skill]
  # Add your projects here:
  # project/myproject:
  #   keywords: [myproject, related-term]

# =============================================================================
# TITLE PATTERNS - Extract titles from content
# Patterns tried in order; first match wins
# =============================================================================

title_patterns:
  - name: tldr-read-time
    description: "TLDR newsletter: Title (X minute read)"
    regex: "\\[?\\*{0,2}\\[?\\[?([^\\[\\]\\(\\)]+?)\\s*\\(\\d+\\s*minute\\s*read\\)"
    group: 1
    minLength: 5
    maxLength: 150
    tags: [type/literature, format/article]

  - name: tldr-bold-title
    description: "TLDR bold item: '- **Title:** description'"
    regex: "[-•]\\s*\\*\\*(.+?):\\*\\*"
    group: 1
    minLength: 3
    maxLength: 80
    tags: [type/literature, format/article]

  - name: markdown-bold-start
    description: "Markdown bold at line start: '**Title:** text'"
    regex: "^\\*\\*(.+?)\\*\\*:?\\s"
    group: 1
    minLength: 3
    maxLength: 80

  - name: markdown-heading
    description: "Markdown heading: '# Title' or '## Title'"
    regex: "^#{1,2}\\s+(.+)$"
    group: 1
    minLength: 3
    maxLength: 80

# =============================================================================
# VALIDATION - Post-processing validation rules
# =============================================================================

validation:
  required_dimensions: [status, type, source]
  warn_if_missing: [topic]
  forbidden_patterns:
    - "^[A-Z]"      # No uppercase tags
    - " "           # No spaces in tags
    - "^\\["        # No bracket-wrapped tags
    - "^None"       # No error artifacts
```

---

### migrations/default-rules.yaml

Copy to: `~/.claude/context/migrations/default-rules.yaml`

```yaml
# Tag Migration Rules
# Maps existing tags to new 11-dimension taxonomy

version: "1.0"
taxonomy_target: "default"  # The taxonomy these rules migrate TO

# ═══════════════════════════════════════════════════════════════════════════════
# DIRECT REPLACEMENTS
# One-to-one tag mappings
# ═══════════════════════════════════════════════════════════════════════════════

replacements:
  # Status dimension (processing pipeline)
  # NOTE: 'incoming' has age-based rules - see 'age_based_migrations' section
  # incoming: status/inbox  # Simple case - but see age-based rules below

  # Type dimension (intellectual maturity)
  raw: type/fleeting
  main: type/permanent
  wisdom: type/literature
  bibliography: type/reference

  # Format dimension (content structure)
  transcript: format/transcript
  meeting-notes: format/meeting-notes
  meeting_minutes: format/meeting-notes
  meeting: format/meeting-notes
  phone-call: format/meeting-notes
  1on1: format/meeting-notes
  workshop: format/meeting-notes
  howto: format/howto
  research: format/research
  ideas: format/ideas
  screenshot: format/screenshot

  # Scope normalization
  scope/private: scope/personal

  # PARA classification
  resources: para/resource
  archive: status/archived

# ═══════════════════════════════════════════════════════════════════════════════
# PREFIX ADDITIONS
# Add dimension prefix to existing tags
# ═══════════════════════════════════════════════════════════════════════════════

prefix_rules:
  # Topic tags - add topic/ prefix
  topic:
    pattern: "^(ai|artificial-intelligence|genai|genai-use-case|agentic-tool-use|llm|reasoning-models|rag|architecture|enterprise-architecture|pkm|zettelkasten|knowledge-transformation-stack|productivity-strategies|software-engineering|software-development|aws|data|data-platform|security|automation|innovation|strategy|governance|health|life-os|off-grid|prompt|chatgpt|openai|anthropic|microsoft|amazon)$"
    prefix: "topic/"

  # Person tags - add person/ prefix
  person:
    pattern: "^[a-z]+_[a-z_]+$"  # firstname_lastname pattern
    prefix: "person/"
    exclude:
      - meeting_minutes  # Not a person
      - meeting_notes

  # Project orphans - add project/ prefix
  project:
    tags:
      - northpower
      - aitelity
      - fibre
      - dgwg
      - gref
    prefix: "project/"

# ═══════════════════════════════════════════════════════════════════════════════
# CONSOLIDATIONS
# Merge multiple tags into one canonical form
# ═══════════════════════════════════════════════════════════════════════════════

consolidations:
  # AI-related consolidation
  - sources: [ai, artificial-intelligence]
    target: topic/ai

  - sources: [genai, genai-use-case]
    target: topic/ai/genai

  - sources: [software-engineering, software-development]
    target: topic/engineering

  - sources: [eea2024, eea24]
    target: project/eea24

  - sources: [life-os, lifeos]
    target: topic/lifeos

# ═══════════════════════════════════════════════════════════════════════════════
# HIERARCHICAL MAPPINGS
# Map flat tags to hierarchical topic structure
# ═══════════════════════════════════════════════════════════════════════════════

hierarchy:
  topic/ai:
    - genai → topic/ai/genai
    - llm → topic/ai/llm
    - agentic-tool-use → topic/ai/agents
    - reasoning-models → topic/ai/reasoning
    - rag → topic/ai/rag
    - prompt → topic/ai/prompting
    - chatgpt → topic/ai/chatgpt

  topic/architecture:
    - enterprise-architecture → topic/architecture/enterprise
    - ea → topic/architecture/enterprise

  topic/pkm:
    - zettelkasten → topic/pkm/zettelkasten
    - knowledge-transformation-stack → topic/pkm/kts

  topic/cloud:
    - aws → topic/cloud/aws

# ═══════════════════════════════════════════════════════════════════════════════
# REMOVALS
# Tags to delete (provide no value)
# ═══════════════════════════════════════════════════════════════════════════════

removals:
  # Processing artifacts
  exact:
    - fabric-extraction
    - "fabric-extraction wisdom"
    - "fabric-extraction raw"
    - "None extract_wisdom"
    - "None raw"
    - "[excalidraw]"
    - "[]"
    - link
    - interesting-reads
    - prio
    - todo
    - notes
    - project  # Orphan, meaningless without name
    - northpower  # Employer - redundant with scope/work

  # Pattern-based removals (regex)
  patterns:
    # HTML/CSS garbage from web scraping
    - "^cmplz-"           # Cookie consent plugin
    - "^jp-carousel-"     # Jetpack carousel
    - "^__codelineno-"    # Code block line numbers
    - "^smallhead"        # CSS class
    - "^icon-"            # Icon classes
    - "^section-?\\d*$"   # Section IDs

    # Color codes
    - "^[0-9a-f]{6}$"     # Hex colors like ffffff, dddddd

    # Generic HTML elements
    - "^(wrapper|primary|secondary|content|page|header|footer)$"

    # Compound artifacts
    - "^None "
    - "^fabric-extraction "

# ═══════════════════════════════════════════════════════════════════════════════
# AGE-BASED MIGRATIONS
# Tags where migration depends on document age
# ═══════════════════════════════════════════════════════════════════════════════

backlog_cultivation:
  # Incoming tag - cultivate, don't discard
  incoming:
    description: |
      With 801 incoming notes (many from daily research captures), there are
      nuggets hidden in the noise. These were captured for a reason - they
      had value at the time. Cultivate through the CONNECT process rather
      than bulk archiving.
    migration:
      to:
        - status/inbox
        - type/fleeting
      note: "Queue for cultivation - use backlog tools to process"

    # Tools needed for backlog processing (not migration, cultivation)
    cultivation_tools:
      - name: "obs cultivate backlog"
        purpose: "AI-assisted scan, cluster by theme, surface nuggets"

      - name: "obs cultivate daily-split"
        purpose: "Split daily notes into atomic notes per entry"

      - name: "obs cultivate insights"
        purpose: "Pattern analysis - topics, interests over time, clusters"

    philosophy: |
      "Once upon a time, I found it interesting to capture that data.
      So there was a reason." - Don't archive without cultivation.
      Work through backlog via themed sessions using the 7-phase
      CONNECT process. Archive only AFTER cultivation extracts value.

# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-TAG EXPANSIONS
# Single tags that expand to multiple dimension tags
# ═══════════════════════════════════════════════════════════════════════════════

expansions:
  # Feed captures - daily reading that needs cultivation
  feed:
    description: |
      Daily feed captures from RSS/reading. These are external sources
      captured for later integration. They need cultivation to become
      useful knowledge.
    expand_to:
      - para/resource      # Reference material
      - type/literature    # From external source
      - status/inbox       # Needs processing
      - source/web         # Captured from web
    remove_original: true
    note: "Feed items are literature notes needing cultivation"

  # Resources tag - similar pattern
  resources:
    expand_to:
      - para/resource
    remove_original: true

# ═══════════════════════════════════════════════════════════════════════════════
# SPECIAL HANDLING
# Tags requiring custom logic
# ═══════════════════════════════════════════════════════════════════════════════

special:
  # Fix malformed person tags
  - pattern: "^qurious/(.+)$"
    action: replace
    target: "person/$1"

  # Strategy tags - determine from context
  - tag: strategy
    action: contextualize
    rules:
      - if_with: [project/*, lifeos/*]
        then: keep  # Contextual strategy
      - else: topic/strategy

  # Board meetings
  - tag: board
    action: add_format
    target: format/meeting-notes
    note: "Keep 'board' as context indicator"

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION RULES
# Post-migration validation
# ═══════════════════════════════════════════════════════════════════════════════

validation:
  required_dimensions:
    - status   # Every note needs status
    - type     # Every note needs type
    - source   # Every note needs source

  warn_if_missing:
    - topic    # Most notes should have a topic

  forbidden_patterns:
    - "^[A-Z]"           # No uppercase tags
    - " "                # No spaces in tags
    - "^\\["             # No bracket-wrapped tags
    - "^None"            # No error artifacts
    - "^fabric-"         # No processing artifacts
```

---

### config/aliases.yaml

Copy to: `~/.claude/context/config/aliases.yaml`

```yaml
# Tag Aliases Registry
# Maps canonical tags to their aliases (bidirectional matching)
#
# Used by:
# - Inference: Prevent creating duplicate tags
# - Maintenance: Find duplicate tag clusters
# - Migration: Generate consolidation rules

version: "1.0"

aliases:
  # Technology
  kubernetes: [k8s, kube]
  javascript: [js]
  typescript: [ts]
  python: [py]

  # AI/ML
  artificial-intelligence: [ai, artificialintelligence]
  machine-learning: [ml, machinelearning]
  large-language-model: [llm]
  retrieval-augmented-generation: [rag]

  # DevOps
  continuous-integration: [ci]
  continuous-deployment: [cd]
  devops: [dev-ops]
  infrastructure-as-code: [iac]

  # Cloud
  amazon-web-services: [aws]
  google-cloud-platform: [gcp]
  microsoft-azure: [azure]

  # General
  api: [apis]
  database: [db, databases]
  user-interface: [ui]
  user-experience: [ux]
  application: [app, apps]
  configuration: [config, configs]
  documentation: [docs, doc]
  repository: [repo, repos]
```

---

## Dependencies

### CORE Skill Routing

This bundle requires the CORE skill for NLP-based routing. The following routing entries should be appended to `CORE/SKILL.md` in the WORKFLOW ROUTING section:

Append to: `~/.claude/skills/CORE/SKILL.md` (WORKFLOW ROUTING section)

```markdown
**When user asks about vault, context, knowledge, or notes:**
Examples: "what do I know about", "what context on", "#project/", "#tag", "find notes",
"load context", "search vault", "save to vault", "capture this", "ingest", "what's incoming"
→ **READ:** ${PAI_DIR}/skills/Context/SKILL.md (entry point - contains CLI reference)
→ **EXECUTE:** Follow two-phase workflow: SEARCH (show table, wait) → LOAD (only after user selects)

**When user asks about sweep (daily inbox triage):**
Examples: "sweep", "let's sweep", "triage inbox", "daily review", "process inbox",
"sweep session", "active sweep", "sweep status", "next note", "continue sweep"
→ **READ:** ${PAI_DIR}/skills/Context/SKILL.md (entry point - CLI rules)
→ **THEN READ:** ${PAI_DIR}/skills/Context/workflows/sweep.md (workflow details)
→ **⚠️ FLASHCARD FORMAT OVERRIDES STANDARD RESPONSE FORMAT** during sweep
→ **EXECUTE:** Follow action routing table and flashcard rendering from sweep.md

**When user asks about other cultivation horizons:**
Examples by horizon:
- 🧵 Weave: "weave", "connect notes", "weekly cultivation", "link ideas"
- 🔬 Dive: "dive into X", "deep exploration", "focus on topic"
- 🗺️ Survey: "survey vault", "monthly review", "landscape assessment"
- 🧭 Compass: "check compass", "quarterly review", "strategic alignment"
- 🪞 Mirror: "mirror", "annual reflection", "identity review"
- Fabric: "extract wisdom", "summarize with fabric", "fabric pattern"
→ **READ:** ${PAI_DIR}/skills/Context/SKILL.md
→ **EXECUTE:** Follow cultivation workflow for the appropriate horizon

**When user asks about tag or vault health:**
Examples: "validate tags", "tag health", "migrate tags", "vault health", "maintenance"
→ **READ:** ${PAI_DIR}/skills/Context/SKILL.md
→ **EXECUTE:** Run health checks and show dashboard
```

---

**Note:** If CORE skill is not installed, NLP routing to Context skill will not work. Users can still invoke Context directly via `ctx` CLI commands.
