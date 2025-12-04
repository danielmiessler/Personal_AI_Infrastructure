# PAI OS Implementation Map

> How the existing PAI repo structure supports the Life OS vision

## The Core Insight

The **Personal AI Infrastructure (PAI)** already has the architecture for this:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PAI ARCHITECTURE                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                              🤖 AI AGENT                                     ││
│  │                         (CORE Skill + Routing)                               ││
│  │                                                                              ││
│  │  "The agent at the center that orchestrates everything"                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                           │
│                Uses Skills + Hooks + Agents                                      │
│                                      │                                           │
│       ┌──────────────────────────────┼──────────────────────────────┐           │
│       ▼                              ▼                              ▼           │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐         │
│  │   SKILLS    │            │   AGENTS    │            │    HOOKS    │         │
│  │             │            │             │            │             │         │
│  │ Self-       │            │ Specialized │            │ Event-      │         │
│  │ contained   │            │ AI          │            │ driven      │         │
│  │ capabilities│            │ personalities│            │ automation  │         │
│  └─────────────┘            └─────────────┘            └─────────────┘         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**The key:** Each layer of the Life OS becomes a **Skill** (or set of skills) with its own:
- Pipeline/integration logic
- CLI tools (`bin/`)
- Routing patterns
- Documentation

---

## What You've Already Built

### The Knowledge Layer (✅ BUILT)

```
bin/
├── ingest/                    # KNOWLEDGE LAYER - Capture Pipeline
│   ├── ingest.ts              # Main CLI: poll, process, query, status
│   ├── lib/
│   │   ├── telegram.ts        # Input: Telegram channel
│   │   ├── process.ts         # Processing: transcribe, extract, classify
│   │   ├── tag-matcher.ts     # AI: tag generation
│   │   ├── config.ts          # Configuration
│   │   └── state.ts           # State management
│   └── profiles/              # Processing profiles (zettelkasten, simple)
│
└── obs/                       # KNOWLEDGE LAYER - Vault Operations
    ├── obs.ts                 # Main CLI: search, read, write, embed
    └── lib/
        ├── embed.ts           # Semantic search (embeddings)
        ├── search.ts          # Full-text search
        ├── read.ts            # Read notes
        ├── write.ts           # Write notes
        └── tags.ts            # Tag operations
```

**Capabilities built:**
- ✅ Multi-modal capture (voice, documents, URLs, text, photos)
- ✅ AI-powered transcription (Whisper)
- ✅ AI-powered classification and routing
- ✅ AI-powered tagging
- ✅ Archive pipeline with naming conventions
- ✅ Semantic search (embeddings + cosine similarity)
- ✅ Full-text and tag-based search
- ✅ Vault read/write operations
- ✅ Dropbox sync for archive

---

## The Four-Layer Skill Architecture

Each layer becomes a skill (or skill family) in the PAI structure:

```
.claude/skills/                    # Standard PAI skills location
├── CORE/                          # Existing: Core routing and identity
├── fabric/                        # Existing: Fabric patterns
├── research/                      # Existing: Research workflows
│
├── knowledge/                     # LAYER 1: Knowledge (BUILT - in bin/)
│   ├── SKILL.md
│   ├── ingest/                    # → bin/ingest
│   └── obs/                       # → bin/obs
│
├── attention/                     # LAYER 2: Attention (TO BUILD)
│   ├── SKILL.md
│   ├── email/                     # Email triage
│   ├── messages/                  # Slack/Teams aggregation
│   └── notifications/             # Unified notifications
│
├── commitment/                    # LAYER 3: Commitment (TO BUILD)
│   ├── SKILL.md
│   ├── calendar/                  # Calendar sync
│   ├── tasks/                     # JIRA/Linear integration
│   └── promises/                  # Promise detection/tracking
│
├── awareness/                     # LAYER 4: Awareness (TO BUILD)
│   ├── SKILL.md
│   ├── home/                      # Home Assistant integration
│   ├── vehicles/                  # WOF/RUC/service tracking
│   └── resources/                 # Water, power, etc.
│
└── briefing/                      # META: Presidential Briefing
    ├── SKILL.md
    └── generate/                  # Briefing generator
```

---

## How the Agent Orchestrates

The **AI Agent at the center** is essentially an enhanced CORE skill that:

```typescript
// Pseudo-code for the PAI OS Agent

interface PAIOSAgent {
  // The agent has access to all layers
  layers: {
    knowledge: KnowledgeSkill;    // bin/ingest + bin/obs
    attention: AttentionSkill;    // Email, messages, notifications
    commitment: CommitmentSkill;  // Calendar, tasks, promises
    awareness: AwarenessSkill;    // Home, vehicles, resources
  };
  
  // Natural language routing (existing PAI pattern)
  async route(query: string): Promise<Response> {
    // "What should I focus on today?"
    //   → commitment.getPriorities() + attention.getUrgent()
    
    // "What do I know about Henderson project?"
    //   → knowledge.search("Henderson project")
    
    // "Is anyone at the door?"
    //   → awareness.home.checkDoorbell()
    
    // "When is my WOF due?"
    //   → awareness.vehicles.getWOFStatus()
  }
  
  // Proactive briefings (new capability)
  async generateBriefing(type: 'daily' | 'weekly'): Promise<Briefing> {
    const awareness = await this.layers.awareness.getAlerts();
    const attention = await this.layers.attention.getPending();
    const commitment = await this.layers.commitment.getUpcoming();
    const knowledge = await this.layers.knowledge.getRecent();
    
    return this.synthesize(awareness, attention, commitment, knowledge);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Knowledge Layer (✅ COMPLETE)

What you've built:

```
bin/ingest/                        # Capture pipeline
├── Telegram integration           ✅
├── Voice transcription            ✅
├── Document extraction            ✅
├── URL processing                 ✅
├── AI classification              ✅
├── AI tagging                     ✅
├── Archive naming                 ✅
└── Dropbox sync                   ✅

bin/obs/                           # Vault operations
├── Semantic search                ✅
├── Full-text search               ✅
├── Tag search                     ✅
├── Read/write notes               ✅
└── Embedding generation           ✅
```

### Phase 2: Attention Layer (TO BUILD)

```
bin/attention/                     # New CLI tool
├── attention.ts                   # Main CLI
└── lib/
    ├── email.ts                   # Gmail/Outlook integration
    │   ├── connect()              # OAuth flow
    │   ├── fetch()                # Get new emails
    │   ├── triage()               # AI categorization
    │   └── respond()              # Draft responses
    │
    ├── slack.ts                   # Slack integration
    │   ├── connect()              # OAuth
    │   ├── getUnread()            # Unread DMs/mentions
    │   └── summarize()            # Thread summaries
    │
    └── unified.ts                 # Unified inbox
        ├── getAll()               # All attention items
        ├── getPriority()          # Urgent items
        └── markHandled()          # Track responses

# CLI usage:
$ attention inbox                  # Show unified inbox
$ attention triage                 # AI-triage new items
$ attention urgent                 # Show urgent only
$ attention respond <id>           # Draft response
```

**Integrations needed:**
- Gmail API (OAuth)
- Outlook/Microsoft Graph API
- Slack API
- Teams API (optional)
- Telegram (already have!)

### Phase 3: Commitment Layer (TO BUILD)

```
bin/commitment/                    # New CLI tool
├── commitment.ts                  # Main CLI
└── lib/
    ├── calendar.ts                # Calendar integration
    │   ├── connect()              # Google/Outlook OAuth
    │   ├── getEvents()            # Upcoming events
    │   ├── getFreeSlots()         # Available time
    │   └── createEvent()          # Add events
    │
    ├── tasks.ts                   # Task aggregation
    │   ├── jira.ts                # JIRA integration
    │   ├── linear.ts              # Linear integration
    │   ├── github.ts              # GitHub issues
    │   └── unified.ts             # Unified task view
    │
    └── promises.ts                # Promise tracking
        ├── detect()               # Find promises in text
        ├── track()                # Add promise
        ├── getOverdue()           # Overdue promises
        └── remind()               # Send reminders

# CLI usage:
$ commitment today                 # Today's commitments
$ commitment week                  # This week overview
$ commitment tasks                 # All tasks
$ commitment promises              # Promise tracking
$ commitment focus                 # What to work on now
```

**Integrations needed:**
- Google Calendar API
- Microsoft Graph (Outlook calendar)
- JIRA API
- Linear API
- GitHub API

### Phase 4: Awareness Layer (TO BUILD)

```
bin/awareness/                     # New CLI tool
├── awareness.ts                   # Main CLI
└── lib/
    ├── home.ts                    # Home automation
    │   ├── homeassistant.ts       # Home Assistant API
    │   │   ├── getEntities()      # All sensors/devices
    │   │   ├── getSensorValue()   # Specific sensor
    │   │   └── callService()      # Trigger actions
    │   ├── cameras.ts             # Camera/doorbell
    │   └── alerts.ts              # Motion, doorbell, etc.
    │
    ├── vehicles.ts                # Vehicle tracking (NZ)
    │   ├── nzta.ts                # NZTA API (WOF check)
    │   ├── ruc.ts                 # RUC balance
    │   └── manual.ts              # Manual tracking
    │
    ├── resources.ts               # Resource monitoring
    │   ├── water.ts               # Tank levels
    │   ├── power.ts               # Solar/grid
    │   └── predict.ts             # Consumption predictions
    │
    └── subscriptions.ts           # Subscription tracking
        ├── parse()                # Parse renewal emails
        ├── getUpcoming()          # Upcoming renewals
        └── alert()                # Renewal reminders

# CLI usage:
$ awareness status                 # Full status
$ awareness home                   # Home sensors
$ awareness vehicles               # Vehicle compliance
$ awareness water                  # Water tank status
$ awareness alerts                 # Active alerts
```

**Integrations needed:**
- Home Assistant REST API
- NZTA vehicle query API
- Sensor APIs (tank monitors, power meters)
- Email parsing for subscriptions

### Phase 5: Briefing Agent (TO BUILD)

```
bin/briefing/                      # New CLI tool
├── briefing.ts                    # Main CLI
└── lib/
    ├── generate.ts                # Briefing generation
    │   ├── daily()                # Morning briefing
    │   ├── weekly()               # Weekly presidential
    │   └── adhoc()                # On-demand summary
    │
    ├── deliver.ts                 # Delivery channels
    │   ├── telegram()             # Send to Telegram
    │   ├── email()                # Email digest
    │   └── voice()                # TTS briefing
    │
    └── interact.ts                # Interactive features
        ├── askFollowUp()          # "Tell me more about..."
        ├── takeAction()           # "Book the appointment"
        └── snooze()               # "Remind me tomorrow"

# CLI usage:
$ briefing daily                   # Generate daily briefing
$ briefing weekly                  # Generate weekly presidential
$ briefing send telegram           # Send to Telegram
$ briefing ask "what about the contract?"
```

---

## The Skill Routing Pattern

Each layer registers with the PAI routing system:

```markdown
<!-- .claude/skills/awareness/SKILL.md -->

# Awareness Skill

## Routing

This skill activates for:
- "what's happening at home"
- "check the doorbell"
- "water tank status"
- "when is my WOF due"
- "upcoming renewals"
- "alerts"
- "home status"

## Commands

- `awareness status` - Full awareness status
- `awareness home` - Home sensors and cameras
- `awareness vehicles` - Vehicle compliance (WOF, RUC, service)
- `awareness resources` - Water, power, heating status
- `awareness subscriptions` - Upcoming renewals

## Integration

Uses:
- Home Assistant API (configured in ~/.pai/awareness/home-assistant.json)
- NZTA API (for WOF checks)
- Manual tracking (vehicles, subscriptions)
```

---

## Unified CLI Architecture

All layers share a consistent CLI pattern:

```bash
# Knowledge Layer (existing)
$ ingest poll                      # Poll for new content
$ ingest process <id>              # Process specific message
$ ingest query "search term"       # Query vault
$ obs search "term"                # Search vault
$ obs semantic "query"             # Semantic search

# Attention Layer (new)
$ attention inbox                  # Unified inbox
$ attention triage                 # AI categorization
$ attention respond <id>           # Draft response

# Commitment Layer (new)
$ commitment today                 # Today's commitments
$ commitment week                  # Week overview
$ commitment focus                 # What to work on now

# Awareness Layer (new)
$ awareness status                 # Full status
$ awareness alerts                 # Active alerts
$ awareness vehicles               # Vehicle compliance

# Briefing (new)
$ briefing daily                   # Daily briefing
$ briefing weekly                  # Presidential briefing

# Or unified:
$ pai status                       # Overall status from all layers
$ pai ask "what should I focus on?"
$ pai briefing                     # Today's briefing
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PAI OS DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INPUTS                           PROCESSING                   STORAGE          │
│  ──────                          ───────────                  ─────────          │
│                                                                                  │
│  ┌────────────┐                                              ┌──────────────┐   │
│  │ Telegram   │──┐                                           │              │   │
│  └────────────┘  │                                           │  KNOWLEDGE   │   │
│  ┌────────────┐  │   ┌──────────────────────────────────┐   │  ──────────  │   │
│  │ Voice      │──┼──▶│  bin/ingest                      │──▶│  Obsidian    │   │
│  └────────────┘  │   │  (transcribe, extract, classify) │   │  Vault       │   │
│  ┌────────────┐  │   └──────────────────────────────────┘   │  + Dropbox   │   │
│  │ Documents  │──┘                                           │  Archive     │   │
│  └────────────┘                                              └──────────────┘   │
│                                                                                  │
│  ┌────────────┐                                              ┌──────────────┐   │
│  │ Gmail      │──┐   ┌──────────────────────────────────┐   │              │   │
│  └────────────┘  │   │  bin/attention                   │   │  ATTENTION   │   │
│  ┌────────────┐  ├──▶│  (fetch, triage, summarize)      │──▶│  ──────────  │   │
│  │ Slack      │──┤   └──────────────────────────────────┘   │  PostgreSQL  │   │
│  └────────────┘  │                                           │  (or SQLite) │   │
│  ┌────────────┐  │                                           └──────────────┘   │
│  │ Teams      │──┘                                                               │
│  └────────────┘                                                                  │
│                                                                                  │
│  ┌────────────┐                                              ┌──────────────┐   │
│  │ Google Cal │──┐   ┌──────────────────────────────────┐   │              │   │
│  └────────────┘  │   │  bin/commitment                  │   │  COMMITMENT  │   │
│  ┌────────────┐  ├──▶│  (sync, aggregate, detect)       │──▶│  ──────────  │   │
│  │ JIRA       │──┤   └──────────────────────────────────┘   │  PostgreSQL  │   │
│  └────────────┘  │                                           │  (or SQLite) │   │
│  ┌────────────┐  │                                           └──────────────┘   │
│  │ Linear     │──┘                                                               │
│  └────────────┘                                                                  │
│                                                                                  │
│  ┌────────────┐                                              ┌──────────────┐   │
│  │ Home Asst  │──┐   ┌──────────────────────────────────┐   │              │   │
│  └────────────┘  │   │  bin/awareness                   │   │  AWARENESS   │   │
│  ┌────────────┐  ├──▶│  (poll, predict, alert)          │──▶│  ──────────  │   │
│  │ Sensors    │──┤   └──────────────────────────────────┘   │  SQLite      │   │
│  └────────────┘  │                                           │  + Cache     │   │
│  ┌────────────┐  │                                           └──────────────┘   │
│  │ NZTA API   │──┘                                                               │
│  └────────────┘                                                                  │
│                                                                                  │
│                           ORCHESTRATION                                          │
│                          ───────────────                                         │
│                                                                                  │
│                    ┌──────────────────────────────────┐                         │
│                    │  bin/briefing                    │                         │
│                    │  (synthesize all layers)         │                         │
│                    │                                  │                         │
│                    │  "Good morning. Here's your      │                         │
│                    │   presidential briefing..."      │                         │
│                    └──────────────────────────────────┘                         │
│                                   │                                              │
│                    ┌──────────────┼──────────────┐                              │
│                    ▼              ▼              ▼                              │
│               ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│               │Telegram │  │ Email   │  │ Voice   │                            │
│               │ Output  │  │ Digest  │  │ (TTS)   │                            │
│               └─────────┘  └─────────┘  └─────────┘                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Immediate Steps

### 1. Formalize Knowledge Layer as Skill

Move existing `bin/ingest` and `bin/obs` into the skills structure:

```bash
.claude/skills/knowledge/
├── SKILL.md                       # Routing and documentation
├── README.md                      # Detailed docs
└── bin -> ../../bin/              # Symlink to existing tools
```

### 2. Build Attention Layer MVP

Start with email integration:

```bash
bin/attention/
├── attention.ts                   # CLI
└── lib/
    └── email.ts                   # Gmail integration first
```

### 3. Build Awareness Layer MVP

Start with Home Assistant + manual vehicle tracking:

```bash
bin/awareness/
├── awareness.ts                   # CLI
└── lib/
    ├── homeassistant.ts           # Home Assistant API
    └── vehicles.ts                # Manual WOF/RUC tracking
```

### 4. Build Briefing Generator

Once we have 2+ layers with data:

```bash
bin/briefing/
├── briefing.ts                    # CLI
└── lib/
    └── generate.ts                # Briefing synthesis
```

---

## Summary

**You already have:**
- The PAI architecture (Skills, Agents, Hooks)
- The Knowledge Layer built (`bin/ingest`, `bin/obs`)
- The processing pipeline patterns
- The CLI-first approach

**The vision maps directly to:**
- Each layer = A PAI Skill (or skill family)
- Each integration = A module in `bin/`
- The Agent = Enhanced CORE routing + Briefing skill
- Multi-tenant = The hosted product

**The repo structure supports this:**
```
Personal_AI_Infrastructure/
├── .claude/skills/                # Skill definitions and routing
│   ├── CORE/                      # Agent orchestration
│   ├── knowledge/                 # → bin/ingest, bin/obs
│   ├── attention/                 # → bin/attention (to build)
│   ├── commitment/                # → bin/commitment (to build)
│   ├── awareness/                 # → bin/awareness (to build)
│   └── briefing/                  # → bin/briefing (to build)
│
└── bin/                           # CLI tools
    ├── ingest/                    # ✅ Built
    ├── obs/                       # ✅ Built
    ├── attention/                 # To build
    ├── commitment/                # To build
    ├── awareness/                 # To build
    └── briefing/                  # To build
```

---

*Created: December 4, 2025*

