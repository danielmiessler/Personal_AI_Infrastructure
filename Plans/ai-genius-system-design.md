# AI Genius: Personal Superintelligence System Design

## Meta-Level Architecture Plan

---

## 1. VISION & FRAMING

**What this is**: A personal AI system that acts as a team of 1,000 skilled knowledge workers — a "genius brain" that amplifies your capabilities 100-1000x across business, health, content, and life management.

**What it is NOT**: A chatbot, a simple assistant, or a single-purpose tool. It is an autonomous, self-improving infrastructure that proactively works on your behalf.

**Core metaphor**: You are the CEO. The AI Genius is your entire executive team, advisory board, research department, operations team, and personal staff — all running 24/7, all with perfect memory, all continuously improving.

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOU (Principal)                          │
│                                                                 │
│  iPhone/iPad/MacBook ──► Text Interface (Discord/Custom Chat)   │
│  Any Device          ──► Voice Interface (Natural Conversation) │
│  Email/Calendar      ──► Passive Input (Auto-ingested)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  GATEWAY LAYER  │
                    │  (Mac Mini 24/7)│
                    │                 │
                    │ • API Server    │
                    │ • Auth & Routing│
                    │ • Rate Limiter  │
                    │ • Queue Manager │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │     CENTRAL DISPATCHER      │
              │     (Orchestrator Daemon)    │
              │                             │
              │ • Intent Classification     │
              │ • Context Assembly          │
              │ • Instance Spawning         │
              │ • Result Aggregation        │
              │ • Priority Management       │
              │ • Token Budget Management   │
              └──────┬──────────────┬───────┘
                     │              │
        ┌────────────▼──┐    ┌─────▼─────────────┐
        │  REACTIVE      │    │  PROACTIVE         │
        │  PIPELINE      │    │  PIPELINE          │
        │                │    │                    │
        │ User-initiated │    │ Scheduled scans    │
        │ requests flow  │    │ Opportunity detect │
        │ through here   │    │ Monitoring tasks   │
        └────────┬───────┘    └─────┬─────────────┘
                 │                  │
        ┌────────▼──────────────────▼───────┐
        │        SPECIALIST INSTANCES       │
        │        (Claude Code Processes)    │
        │                                   │
        │  Each instance receives:          │
        │  • Minimal targeted context       │
        │  • Domain-specific vault slice    │
        │  • Relevant memory/learnings      │
        │  • Clear mission & constraints    │
        │  • Token budget allocation        │
        └────────┬──────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │        OBSIDIAN VAULT             │
        │        (Source of Truth)           │
        │                                   │
        │  • Knowledge Base (notes, docs)   │
        │  • Memory Store (learnings, logs) │
        │  • Context Registry (who knows    │
        │    what, domain maps)             │
        │  • Goal Trees & Strategies        │
        │  • External Files (PDF, XLSX...)  │
        └───────────────────────────────────┘
```

---

## 3. THE OBSIDIAN VAULT STRUCTURE

The vault is both the knowledge base AND the system's operating memory. Adapting PAI's SYSTEM/USER two-tier pattern:

```
Vault/
├── _SYSTEM/                          # AI Genius operating system (never manually edited)
│   ├── CONFIG/
│   │   ├── dispatcher-config.yaml    # Orchestrator settings
│   │   ├── domain-registry.yaml      # Maps domains to context slices
│   │   ├── token-budget.yaml         # Claude Max usage management
│   │   ├── interface-config.yaml     # Chat/voice/service settings
│   │   └── security-patterns.yaml    # What the system must never do
│   │
│   ├── MEMORY/
│   │   ├── WORK/                     # Active and completed work items
│   │   ├── LEARNINGS/                # What the system has learned
│   │   │   ├── execution/            # Task execution patterns
│   │   │   ├── preferences/          # Your preferences & style
│   │   │   ├── mistakes/             # Errors to avoid
│   │   │   └── effectiveness/        # What works, what doesn't
│   │   ├── SIGNALS/                  # Your ratings and feedback
│   │   ├── CONTEXT-SNAPSHOTS/        # Periodic state summaries
│   │   └── INTERACTION-LOG/          # Compressed conversation history
│   │
│   ├── DOMAINS/                      # Domain-specific operating context
│   │   ├── business/
│   │   │   ├── DOMAIN.md             # Domain definition & current state
│   │   │   ├── GOALS.md              # Active goals with metrics
│   │   │   ├── PLAYBOOK.md           # Learned strategies & approaches
│   │   │   └── CONTEXT-MAP.md        # What vault files matter for this domain
│   │   ├── newsletter/
│   │   ├── content/
│   │   ├── health/
│   │   ├── personal/                 # Lighter touch, advisory only
│   │   └── [extensible]/
│   │
│   ├── SKILLS/                       # System capabilities (PAI pattern)
│   │   ├── CORE/
│   │   │   ├── SKILL.md
│   │   │   └── Workflows/
│   │   ├── Research/
│   │   ├── Writing/
│   │   ├── Analysis/
│   │   ├── Communication/
│   │   ├── Planning/
│   │   └── [auto-created-skills]/    # System proposes new skills
│   │
│   ├── HOOKS/                        # Event-driven middleware (from PAI)
│   │   ├── on-session-start/
│   │   ├── on-task-complete/
│   │   ├── on-feedback/
│   │   └── on-scheduled/
│   │
│   └── AGENTS/                       # Agent definitions & personalities
│       ├── strategist.md             # High-level planning
│       ├── executor.md               # Task execution
│       ├── researcher.md             # Deep research
│       ├── writer.md                 # Content creation
│       ├── challenger.md             # Devil's advocate
│       ├── health-advisor.md         # Health domain
│       └── [domain-agents]/
│
├── AREAS/                            # Your life areas (you maintain these)
│   ├── Business/
│   │   ├── VentureA/
│   │   ├── VentureB/
│   │   └── Ideas/
│   ├── Newsletter/
│   │   ├── Issues/
│   │   ├── Ideas/
│   │   └── Analytics/
│   ├── Content/
│   │   ├── Social-Media/
│   │   ├── Blog/
│   │   └── Presentations/
│   ├── Health/
│   │   ├── Metrics/
│   │   ├── Protocols/
│   │   └── Notes/
│   ├── Personal/
│   │   └── [your structure]
│   └── [your areas]/
│
├── DAILY-NOTES/                      # Daily journal / input capture
│   └── YYYY-MM-DD.md
│
├── MEETINGS/                         # Meeting notes
│   └── YYYY-MM-DD-topic.md
│
├── INBOX/                            # Unprocessed inputs
│   ├── voice-transcripts/            # Voice conversation logs
│   ├── email-digests/                # Processed email summaries
│   ├── captures/                     # Quick thoughts, ideas
│   └── external-docs/                # PDFs, XLSX, PPTX, etc.
│
├── PROJECTS/                         # Active project workspaces
│   └── [project-name]/
│       ├── BRIEF.md                  # Project definition
│       ├── STATUS.md                 # Current state (auto-updated)
│       ├── DECISIONS.md              # Decision log
│       └── artifacts/
│
└── ARCHIVE/                          # Completed/inactive items
```

---

## 4. THE DISPATCHER (Central Orchestrator)

The dispatcher is a persistent daemon on the Mac Mini that manages all AI operations.

### 4.1 Architecture

```
┌─────────────────────────────────────────────┐
│            DISPATCHER DAEMON                │
│            (TypeScript / Bun)               │
│                                             │
│  ┌─────────────┐    ┌──────────────────┐   │
│  │ Request      │    │ Scheduler        │   │
│  │ Queue        │    │ (Proactive Tasks)│   │
│  │              │    │                  │   │
│  │ Priority:    │    │ • Daily review   │   │
│  │ • URGENT     │    │ • Email check    │   │
│  │ • NORMAL     │    │ • Goal progress  │   │
│  │ • BACKGROUND │    │ • Vault scan     │   │
│  └──────┬───────┘    └────────┬─────────┘   │
│         │                     │             │
│  ┌──────▼─────────────────────▼──────────┐  │
│  │         CONTEXT ASSEMBLER             │  │
│  │                                       │  │
│  │  1. Classify intent → domain          │  │
│  │  2. Load domain CONTEXT-MAP.md        │  │
│  │  3. Pull relevant vault files         │  │
│  │  4. Load domain PLAYBOOK.md           │  │
│  │  5. Load relevant LEARNINGS           │  │
│  │  6. Assemble minimal context payload  │  │
│  │  7. Estimate token usage              │  │
│  └──────┬────────────────────────────────┘  │
│         │                                   │
│  ┌──────▼────────────────────────────────┐  │
│  │         INSTANCE SPAWNER              │  │
│  │                                       │  │
│  │  • Select model tier (opus/sonnet/    │  │
│  │    haiku) based on task complexity    │  │
│  │  • Launch Claude Code process         │  │
│  │  • Inject assembled context           │  │
│  │  • Monitor execution                  │  │
│  │  • Capture results                    │  │
│  │  • Write learnings back to vault      │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │         TOKEN BUDGET MANAGER          │  │
│  │                                       │  │
│  │  • Track daily/hourly token usage     │  │
│  │  • Enforce Claude Max limits          │  │
│  │  • Prioritize reactive over proactive │  │
│  │  • Queue low-priority work for off-   │  │
│  │    peak hours                         │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 4.2 Context Assembly Strategy

This is the critical innovation — each Claude instance gets ONLY what it needs:

```
For a task: "Draft next newsletter issue about AI agents"

Context Assembler produces:
├── Domain Brief: Newsletter/DOMAIN.md (500 tokens)
├── Recent Issues: Last 3 newsletter files (2000 tokens)
├── Topic Research: Relevant notes tagged #ai-agents (1000 tokens)
├── Style Guide: Newsletter/PLAYBOOK.md (300 tokens)
├── Learnings: Past newsletter feedback (200 tokens)
├── Active Context: Current newsletter goals (100 tokens)
└── Total: ~4,100 tokens (vs. 500,000+ if loading entire vault)
```

**Context Map files** (per domain) define:
```yaml
# _SYSTEM/DOMAINS/newsletter/CONTEXT-MAP.md
domain: newsletter
primary_files:
  - AREAS/Newsletter/Issues/**
  - AREAS/Newsletter/Ideas/**
  - AREAS/Newsletter/Analytics/metrics.md
secondary_files:
  - AREAS/Content/Social-Media/  # For cross-promotion
  - DAILY-NOTES/                 # Last 7 days for recency
related_domains:
  - content
  - business
learnings_tags:
  - newsletter
  - writing
  - audience
```

### 4.3 Token Budget Management

```yaml
# _SYSTEM/CONFIG/token-budget.yaml
claude_max_plan:
  daily_token_limit: 500000      # Estimated, adjust based on plan
  hourly_soft_limit: 60000       # Spread usage evenly

allocation:
  reactive: 70%                  # User-initiated tasks always priority
  proactive: 20%                 # Scheduled scans and analysis
  learning: 10%                  # Self-improvement tasks

proactive_schedule:
  daily_review:
    time: "06:00"
    budget: 15000                # tokens
    tasks:
      - scan inbox for new items
      - check email digests
      - review daily goals
      - generate morning briefing

  weekly_deep_review:
    day: "sunday"
    time: "02:00"                # Off-peak
    budget: 50000
    tasks:
      - analyze all learnings
      - update playbooks
      - review goal progress
      - propose improvements

  continuous_monitoring:
    interval: "4h"
    budget: 5000
    tasks:
      - check for urgent emails
      - scan calendar for prep needed
```

---

## 5. INTERFACE LAYER

### 5.1 Text Interface (Discord Bot / Custom Chat)

```
┌──────────────────────────────────────────┐
│            TEXT INTERFACE                 │
│                                          │
│  Option A: Discord Bot                   │
│  • Private Discord server                │
│  • Channels per domain (#business,       │
│    #newsletter, #health, #general)       │
│  • Thread-based conversations            │
│  • File upload support                   │
│  • Works on all devices                  │
│  • Rich formatting (embeds, buttons)     │
│                                          │
│  Option B: Custom Web Chat               │
│  • Hosted on Mac Mini                    │
│  • Tailscale/Cloudflare tunnel for       │
│    access from anywhere                  │
│  • PWA for mobile                        │
│  • More control, more work to build      │
│                                          │
│  RECOMMENDATION: Start with Discord,     │
│  migrate to custom later if needed       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Discord Bot → Gateway API → Dispatcher  │
│                                          │
│  Features:                               │
│  • /ask [question] - Quick answers       │
│  • /task [description] - Create task     │
│  • /brief - Get daily briefing           │
│  • /review [domain] - Domain review      │
│  • /draft [type] - Draft content         │
│  • /challenge [idea] - Get challenged    │
│  • Mention @genius for freeform          │
│  • React with rating emojis (1-10)       │
│  • Upload files → INBOX/                 │
└──────────────────────────────────────────┘
```

### 5.2 Voice Interface

```
┌──────────────────────────────────────────┐
│            VOICE INTERFACE               │
│                                          │
│  Input Pipeline:                         │
│  Phone/Device → Whisper API (STT)        │
│       → Text → Dispatcher                │
│       → Claude Instance                  │
│       → Response Text                    │
│       → ElevenLabs (TTS)                 │
│       → Audio → Phone/Device             │
│                                          │
│  Implementation Options:                 │
│  A. Phone call via Twilio/Vonage         │
│     • Call a number, talk to genius      │
│     • Works from any phone               │
│     • ~2-5 second latency                │
│                                          │
│  B. Custom voice app (web-based)         │
│     • WebRTC for audio streaming         │
│     • Lower latency (~1-3s)              │
│     • Push-to-talk or VAD               │
│                                          │
│  C. Discord voice channel                │
│     • Uses existing Discord bot          │
│     • Join voice channel, talk           │
│     • Moderate latency                   │
│                                          │
│  RECOMMENDATION: Start with (C) Discord  │
│  voice, add (A) Twilio for on-the-go     │
│                                          │
│  Latency Budget:                         │
│  STT: 500ms | Think: 2-5s | TTS: 500ms  │
│  Total: 3-6 seconds (acceptable)         │
│                                          │
│  For fast acknowledgments:               │
│  "Got it, working on that..." (instant)  │
│  [Full response follows] (3-6s)          │
└──────────────────────────────────────────┘
```

### 5.3 Service Integrations

```
┌──────────────────────────────────────────┐
│        SERVICE INTEGRATION LAYER         │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Apple Ecosystem (via AppleScript   │  │
│  │ + Shortcuts + local APIs)          │  │
│  │                                    │  │
│  │ • Reminders: Create/read/complete  │  │
│  │ • Calendar: Read events, create    │  │
│  │ • Mail: Read inbox, draft replies  │  │
│  │ • Notes: Read (if needed)          │  │
│  │                                    │  │
│  │ Implementation: AppleScript        │  │
│  │ commands executed by dispatcher    │  │
│  │ on Mac Mini                        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Email (Gmail + Microsoft)          │  │
│  │                                    │
│  │ • Gmail API (OAuth2)               │  │
│  │ • Microsoft Graph API (OAuth2)     │  │
│  │ • Periodic inbox scan              │  │
│  │ • Priority classification          │  │
│  │ • Draft response generation        │  │
│  │ • Summary → INBOX/email-digests/   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Document Processing                │  │
│  │                                    │  │
│  │ • PDF: pdf-parse / pdf.js          │  │
│  │ • Excel: xlsx / exceljs            │  │
│  │ • PowerPoint: pptxgenjs            │  │
│  │ • Gamma.app: API (if available)    │  │
│  │   or browser automation            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Extensible Service Framework       │  │
│  │                                    │  │
│  │ Each service = a connector file:   │  │
│  │ _SYSTEM/CONNECTORS/               │  │
│  │ ├── gmail.connector.ts             │  │
│  │ ├── calendar.connector.ts          │  │
│  │ ├── reminders.connector.ts         │  │
│  │ ├── gamma.connector.ts             │  │
│  │ └── [new-service].connector.ts     │  │
│  │                                    │  │
│  │ Connector interface:               │  │
│  │ • read() → structured data         │  │
│  │ • write() → create/update          │  │
│  │ • sync() → bidirectional sync      │  │
│  │ • schema → what data it provides   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 6. SELF-LEARNING & SELF-IMPROVEMENT SYSTEM

This is the most critical differentiator. Adapting PAI's learning patterns and extending them:

### 6.1 Learning Loop Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   LEARNING LOOP                             │
│                                                             │
│  INPUT SIGNALS                                              │
│  ├── Explicit: Your ratings (1-10), verbal feedback         │
│  ├── Implicit: Task completion rate, re-dos, corrections    │
│  ├── Outcome: Did the business strategy work? Revenue data  │
│  ├── Behavioral: What you actually do vs. what was advised  │
│  └── Environmental: Market data, news, competitor moves     │
│                                                             │
│  PROCESSING                                                 │
│  ├── Per-interaction: Capture immediate learnings           │
│  ├── Daily synthesis: What patterns emerged today?          │
│  ├── Weekly review: What strategies are working?            │
│  ├── Monthly analysis: Update playbooks & approaches        │
│  └── Quarterly: Reassess goals, propose strategic shifts    │
│                                                             │
│  OUTPUT                                                     │
│  ├── Updated PLAYBOOK.md files per domain                   │
│  ├── Refined CONTEXT-MAP.md (what's relevant)               │
│  ├── New/updated SKILLS                                     │
│  ├── Adjusted proactive schedules                           │
│  ├── Proposed new goals or goal modifications               │
│  └── Self-improvement proposals (for your approval)         │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Mistake Tracking & Correction

```markdown
# _SYSTEM/MEMORY/LEARNINGS/mistakes/2026-02-04-newsletter-tone.md

## Mistake Record
- **Date**: 2026-02-04
- **Domain**: Newsletter
- **Task**: Draft newsletter issue #47
- **What happened**: Used overly formal tone, you re-wrote 60% of it
- **Root cause**: Style guide didn't capture your casual-but-expert voice
- **Correction applied**: Updated Newsletter/PLAYBOOK.md with:
  - 5 example paragraphs in your actual voice
  - Tone descriptors: "conversational expert, like explaining to a smart friend"
  - Anti-patterns: "never use 'furthermore', 'it is worth noting'"
- **Verified**: Issue #48 drafted with new style, rated 8/10
```

### 6.3 Skill Self-Improvement

```
The system can propose new skills:

1. Notices pattern: "You ask me to analyze competitor pricing every week"
2. Proposes: "Should I create a CompetitorAnalysis skill that:
   - Auto-scrapes competitor sites weekly
   - Compares pricing changes
   - Generates a summary report
   - Alerts you only on significant changes?"
3. On approval: Creates _SYSTEM/SKILLS/CompetitorAnalysis/SKILL.md
4. Registers in scheduler for weekly execution
5. Tracks effectiveness, iterates
```

---

## 7. THE CHALLENGER MODE

A key requirement — the system should think critically, not just comply:

### 7.1 Implementation

```yaml
# _SYSTEM/AGENTS/challenger.md

role: Devil's Advocate & Strategic Advisor
activation:
  - Always review tasks before execution for improvement opportunities
  - Activate fully when asked for opinions or strategies
  - Tone: Respectful but direct. Like a trusted advisor who has skin in the game.

behaviors:
  task_review:
    - "Before I execute: have you considered X?"
    - "I can do this, but if we also did Y, the result would be 3x better"
    - "This conflicts with your stated goal Z. Want to proceed anyway?"

  idea_challenge:
    - Test assumptions against available data
    - Present counter-arguments
    - Score idea on effort/impact matrix
    - Suggest alternatives from cross-domain knowledge

  proactive_insights:
    - "Based on your notes from last month, this pattern suggests..."
    - "Your competitor just did X, this affects your plan Y"
    - "You haven't reviewed Z in 3 weeks, it may need attention"

guardrails:
  - Never block execution — always offer alternative, never just refuse
  - If challenged back, accept gracefully ("Fair point, proceeding as asked")
  - Maximum 1 challenge per interaction (don't be annoying)
  - Track when challenges are accepted vs. overridden (learn from it)
```

### 7.2 Cross-Domain Intelligence

```
When you ask: "Draft a blog post about AI in healthcare"

Normal assistant: Writes the blog post.

AI Genius:
1. Checks AREAS/Newsletter/ → "You covered a related angle last month"
2. Checks AREAS/Business/ → "This aligns with VentureB's positioning"
3. Checks INBOX/email-digests/ → "A contact emailed about this topic yesterday"
4. Suggests: "I'll draft the post, but consider:
   - Referencing your newsletter #42 for continuity
   - Positioning it to support VentureB's launch next month
   - Replying to that contact's email with the post as a conversation starter
   - This could become a 3-part series based on your notes in Business/Ideas/"
```

---

## 8. IMPLEMENTATION PHASES

### Phase 0: Foundation (Week 1)

**Goal**: Core infrastructure on Mac Mini

```
Tasks:
□ Set up the Obsidian vault structure (as defined in Section 3)
□ Install Bun runtime and dependencies on Mac Mini
□ Create the dispatcher daemon skeleton
□ Set up PAI-compatible hook system
□ Create domain registry with your life areas
□ Write the context assembler (core algorithm)
□ Create token budget manager
□ Set up basic logging and error handling

Deliverable: Dispatcher can receive a task, assemble context,
spawn a Claude instance, and return a result.
```

### Phase 1: Text Interface (Week 2)

**Goal**: Chat with your genius from any device

```
Tasks:
□ Set up Discord bot (discord.js)
□ Create domain-specific channels
□ Implement command routing (/ask, /task, /brief, etc.)
□ Connect Discord bot to dispatcher API
□ Implement file upload → INBOX pipeline
□ Add rating capture (emoji reactions)
□ Set up Tailscale for secure Mac Mini access
□ Test from iPhone, iPad, MacBook

Deliverable: Full text conversation from any device,
responses within 5-15 seconds.
```

### Phase 2: Memory & Learning (Week 3)

**Goal**: System remembers everything and improves

```
Tasks:
□ Implement work tracking (MEMORY/WORK/)
□ Build learning capture pipeline
□ Create explicit rating system (1-10 + feedback)
□ Implement implicit signal detection
□ Build daily synthesis job (scheduled)
□ Create playbook auto-update mechanism
□ Implement mistake tracking and correction
□ Build context-map refinement based on usage

Deliverable: System demonstrably improves over 7 days of use.
Playbooks contain real learnings. Mistakes are not repeated.
```

### Phase 3: Service Integrations (Week 4)

**Goal**: Connected to your digital life

```
Tasks:
□ Build connector framework (_SYSTEM/CONNECTORS/)
□ Implement Apple Reminders connector (AppleScript)
□ Implement Apple Calendar connector (AppleScript)
□ Implement Gmail API connector (OAuth2)
□ Implement Microsoft email connector (Graph API)
□ Build email digest pipeline (scan → classify → summarize)
□ Implement document processing (PDF, XLSX, PPTX)
□ Create morning briefing workflow

Deliverable: Daily morning briefing with email summary,
calendar overview, and task priorities. Can create
reminders and calendar events via chat.
```

### Phase 4: Voice Interface (Week 5)

**Goal**: Natural voice conversation

```
Tasks:
□ Integrate Whisper API for speech-to-text
□ Integrate ElevenLabs for text-to-speech (PAI pattern)
□ Build voice pipeline with latency optimization
□ Implement Discord voice channel integration
□ Add quick-acknowledge pattern ("Got it, working...")
□ Create voice-specific response formatting
□ Implement Twilio integration for phone calls (optional)
□ Test conversation flow and latency

Deliverable: Voice conversation with 3-6 second latency.
Natural back-and-forth on any topic.
```

### Phase 5: Proactive Intelligence (Week 6)

**Goal**: System works for you without being asked

```
Tasks:
□ Implement scheduled vault scanning
□ Build opportunity detection (cross-domain insights)
□ Create proactive notification system
□ Implement the challenger mode
□ Build goal tracking and progress reports
□ Create weekly strategic review automation
□ Implement skill self-improvement proposals
□ Build attention management (what needs your focus)

Deliverable: System proactively surfaces insights,
challenges assumptions, proposes improvements,
and manages attention across all domains.
```

### Phase 6: Refinement & Scale (Ongoing)

```
Tasks:
□ Performance tuning (latency, token efficiency)
□ Add new service connectors as needed
□ Refine challenger behavior based on feedback
□ Build dashboard for system health (PAI observability)
□ Implement advanced scheduling (context-aware timing)
□ Add new domains as your life evolves
□ Security hardening
□ Backup and disaster recovery
```

---

## 9. TECHNICAL DECISIONS & RATIONALE

### 9.1 Why Obsidian Vault as Source of Truth

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Storage | Markdown files | Human-readable, version-controllable, no vendor lock |
| Structure | Folder hierarchy | Natural organization, easy to navigate manually |
| Metadata | YAML frontmatter | Standard, parseable, Obsidian-native |
| Search | File-based grep | No database overhead, instant for vault sizes <100K files |
| Sync | Git or Obsidian Sync | Proven, reliable, conflict-resolvable |
| External files | Store alongside | PDFs, XLSX etc. in same vault, referenced by markdown |

### 9.2 Why Multiple Claude Instances (Not One Big Context)

| Problem with single context | Solution with multiple instances |
|---|---|
| 200K token limit fills with vault data | Each instance gets 5-20K tokens of targeted context |
| Slow responses when context is large | Fast responses with minimal context |
| All-or-nothing failure mode | Isolated failures per domain |
| Can't parallelize | Multiple instances work simultaneously |
| Context window = all or nothing | Context assembler picks exactly what's needed |

### 9.3 Why Dispatcher Pattern

| Alternative | Problem | Dispatcher Advantage |
|---|---|---|
| Direct Claude calls | No context management | Assembles perfect context per task |
| Single long-running session | Context window limits | Fresh instances with targeted context |
| Manual context selection | Cognitive overhead on you | Automated domain routing |
| Database-backed system | Complexity, vendor lock | File-based, simple, inspectable |

### 9.4 Model Selection Strategy

```
HAIKU: Quick lookups, classification, simple formatting
  → Email triage, calendar queries, reminders
  → ~90% of proactive background tasks

SONNET: Standard work, writing, analysis
  → Newsletter drafts, email responses, research
  → ~80% of reactive user tasks

OPUS: Deep strategy, complex reasoning, planning
  → Business strategy, goal setting, life planning
  → Used sparingly for maximum impact
  → Always for challenger mode on important decisions
```

---

## 10. THINGS YOU HAVEN'T CONSIDERED (MY ADDITIONS)

### 10.1 Context Decay & Freshness

Your notes age. A strategy from 6 months ago may be outdated. The system should:
- Weight recent information higher than old
- Flag stale context ("This business plan hasn't been updated in 90 days")
- Auto-archive completed projects
- Maintain a "freshness score" for each domain

### 10.2 Attention Management

With a genius system, the risk is information overload in reverse — the AI knows too much and overwhelms you. Solution:
- **Morning brief**: Top 5 things that need your attention today
- **Interrupt threshold**: Only notify for truly urgent items
- **Weekly digest**: Comprehensive but structured review
- **On-demand depth**: You drill down when YOU want to

### 10.3 Decision Journal

Track every significant decision and its outcome:
```markdown
# DECISION: Pivot VentureA pricing to usage-based
- Date: 2026-02-01
- Context: [what led to this]
- Alternatives considered: [what else was on the table]
- Expected outcome: [what you predicted]
- Actual outcome: [filled in later]
- Learning: [what you'd do differently]
```

This feeds the learning loop with high-signal data about your judgment patterns.

### 10.4 Delegation Levels

Not every task should require your approval. Define delegation levels:

| Level | Description | Example |
|-------|-------------|---------|
| **0 - Inform** | System does it, tells you after | Archive old emails, update status docs |
| **1 - Brief** | System does it, includes in daily brief | Email triage, calendar prep |
| **2 - Propose** | System prepares, you approve | Newsletter draft, strategy changes |
| **3 - Discuss** | System presents options, you decide | Business pivots, goal changes |
| **4 - Assist** | You lead, system supports | Personal decisions, relationship matters |

### 10.5 Graceful Degradation

When Claude Max rate limits hit, or API is down:
- Queue non-urgent tasks
- Use cached responses where possible
- Prioritize user-initiated over proactive tasks
- Fall back to simpler models (haiku) for background work
- Maintain a "last known state" summary per domain

### 10.6 Privacy Boundaries

Define clear boundaries for the personal domain:
```yaml
personal_domain:
  system_access: advisory_only
  auto_analysis: false
  proactive_suggestions: false
  data_retention: minimal
  notes: "System reads personal notes only when explicitly asked"
```

### 10.7 Multi-Vault Sync Strategy

If you use Obsidian on multiple devices:
- Mac Mini vault is source of truth
- Changes sync via Obsidian Sync or Git
- Conflict resolution: Mac Mini wins (it has the AI context)
- Mobile vault is read-heavy, write-light

### 10.8 Emergency Protocols

What if the Mac Mini goes down?
- Cloud backup of vault (encrypted)
- Fallback Discord bot on cloud VM (minimal version)
- Critical contacts/numbers accessible without the system
- Monthly "disaster recovery" test

---

## 11. RISK REGISTER

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Max rate limits | Can't respond | Token budget manager, queue system |
| Over-reliance on AI | You stop thinking critically | Challenger mode, delegation levels |
| Context assembly errors | Wrong info to wrong task | Validation layer, cross-check |
| Vault corruption | Lost knowledge | Git versioning, cloud backup |
| Security breach | Sensitive data exposed | Security patterns, audit trail |
| Scope creep | Never finished | Strict phases, working system at each phase |
| Stale knowledge | Bad advice from old data | Freshness scoring, staleness alerts |
| Information overload | Too many notifications | Attention management, interrupt thresholds |

---

## 12. SUCCESS METRICS

How to know if this is working:

| Metric | Baseline (no system) | Target (with system) |
|--------|---------------------|---------------------|
| Decisions made per week | ~10 significant | 30-50 (with AI analysis) |
| Newsletter publish rate | Irregular | Consistent weekly |
| Email response time | Hours-days | Minutes (for drafts) |
| Missed opportunities | Unknown | Tracked, near zero |
| Strategic review frequency | Monthly if lucky | Weekly automated |
| Cross-domain connections | Manual, rare | Automatic, frequent |
| Learning from mistakes | Informal | Systematic, tracked |
| Time to information | Search manually | Ask, get answer in seconds |

---

## 13. FIRST SESSION: BOOTSTRAPPING THE SYSTEM

When implementation begins, the first Claude Code session should:

1. **Create the vault structure** (Section 3)
2. **Write the dispatcher skeleton** (Section 4)
3. **Create the domain registry** with your actual life areas
4. **Write the first DOMAIN.md files** based on information you provide
5. **Set up the hook system** (adapted from PAI)
6. **Create the context assembler** algorithm
7. **Write the first connector** (Apple Reminders — simplest)
8. **Test end-to-end**: Ask a question → dispatcher → context assembly → Claude instance → answer

This document itself should be stored in `_SYSTEM/CONFIG/ARCHITECTURE.md` as the system's founding document.
