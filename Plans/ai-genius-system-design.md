# AI Genius: Personal Superintelligence System Design

## Meta-Level Architecture Plan

---

## 1. VISION & FRAMING

**What this is**: A personal AI system that acts as a team of 1,000 skilled knowledge workers — a "genius brain" that amplifies your capabilities 100-1000x across business, health, content, and life management.

**What it is NOT**: A chatbot, a simple assistant, or a single-purpose tool. It is an autonomous, self-improving infrastructure that proactively works on your behalf.

**Core metaphor**: You are the CEO. The AI Genius is your entire organization — but you don't manage 1,000 workers directly. You talk to your Chief of Staff, who manages a handful of Directors, who each run departments with teams of specialists. The management structure handles delegation, coordination, quality control, and escalation — you only deal with strategy, decisions, and results.

---

## 2. ORGANIZATIONAL STRUCTURE

A CEO of 1,000 people doesn't talk to individual workers. The system mirrors how real high-performing organizations operate: clear hierarchy, defined spans of control, delegation authority, and escalation paths.

### 2.1 The Org Chart

```
                    ┌─────────────────────┐
                    │     YOU (CEO)        │
                    │                      │
                    │ • Set vision & goals │
                    │ • Make key decisions │
                    │ • Review results     │
                    │ • Rate performance   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   CHIEF OF STAFF    │
                    │   (Always-On Agent) │
                    │                      │
                    │ • Your ONLY direct   │
                    │   contact point      │
                    │ • Routes requests    │
                    │ • Aggregates reports │
                    │ • Filters noise      │
                    │ • Manages escalation │
                    │ • Knows everything   │
                    │   at summary level   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
  ┌───────▼───────┐  ┌────────▼────────┐  ┌────────▼────────┐
  │  STRATEGY &   │  │  OPERATIONS     │  │  INTELLIGENCE   │
  │  PLANNING     │  │  DIRECTOR       │  │  DIRECTOR       │
  │  DIRECTOR     │  │                 │  │                 │
  │               │  │ Manages daily   │  │ Manages what    │
  │ Manages the   │  │ execution and   │  │ the system      │
  │ "what" and    │  │ service         │  │ knows and       │
  │ "why"         │  │ delivery        │  │ learns          │
  └───────┬───────┘  └────────┬────────┘  └────────┬────────┘
          │                   │                     │
    ┌─────┴─────┐      ┌─────┴─────┐        ┌─────┴─────┐
    │ Teams     │      │ Teams     │        │ Teams     │
    │ below     │      │ below     │        │ below     │
    └───────────┘      └───────────┘        └───────────┘

  ┌───────▼───────┐  ┌────────▼────────┐  ┌────────▼────────┐
  │ PERSONAL      │  │ COMMUNICATIONS  │  │ SYSTEMS         │
  │ ADVISORY      │  │ DIRECTOR        │  │ DIRECTOR        │
  │ DIRECTOR      │  │                 │  │                 │
  │               │  │ Manages all     │  │ Manages the     │
  │ Health, life, │  │ external comms  │  │ infrastructure  │
  │ relationships │  │ and content     │  │ itself          │
  └───────┬───────┘  └────────┬────────┘  └────────┬────────┘
          │                   │                     │
    ┌─────┴─────┐      ┌─────┴─────┐        ┌─────┴─────┐
    │ Teams     │      │ Teams     │        │ Teams     │
    │ below     │      │ below     │        │ below     │
    └───────────┘      └───────────┘        └───────────┘
```

### 2.2 Detailed Role Definitions

#### CHIEF OF STAFF (CoS) — Your Single Point of Contact

The CoS is the **only agent you interact with directly** in most cases. It is always a high-capability model (Opus or Sonnet) that:

| Responsibility | How it works |
|---|---|
| **Triage** | Every request from you is classified by urgency, domain, and complexity |
| **Routing** | Delegates to the right Director — you never think about who does what |
| **Aggregation** | Collects results from multiple Directors into a single coherent response |
| **Filtering** | 50 things happened today, you hear about the 5 that matter |
| **Escalation** | Directors flag issues, CoS decides what reaches you and when |
| **Context** | Maintains a running summary of ALL domains — the "executive dashboard" |
| **Tone matching** | Knows how you like information presented, adapts to your mood/urgency |
| **Challenge gate** | Applies challenger mode on your behalf before executing questionable requests |

**What the CoS does NOT do**: Execute tasks directly. It manages, delegates, and synthesizes.

```
You: "How's the newsletter going?"

CoS internally:
  → Queries Communications Director for newsletter status
  → Checks MEMORY for last interaction on this topic
  → Checks if there are related items from other Directors
  → Assembles a concise answer

CoS to you: "Issue #48 is drafted, waiting for your review.
  Open rate on #47 was 42%, up from 38%. The Communications
  team suggests we A/B test subject lines starting next issue.
  Also — your blog post from Monday could be repurposed as
  a newsletter segment, want me to have them draft that?"
```

#### STRATEGY & PLANNING DIRECTOR

Manages the "thinking" layer of the organization.

| Team | Role | Model Tier |
|---|---|---|
| **Goal Architect** | Defines, tracks, and refines your goals across all domains | Opus |
| **Strategic Analyst** | Analyzes opportunities, threats, market conditions | Opus/Sonnet |
| **Decision Support** | Prepares decision briefs, tracks decision outcomes | Sonnet |
| **Scenario Planner** | Models "what if" scenarios for major decisions | Opus |
| **Challenger** | Devil's advocate on all strategic matters | Opus |

**Owns**: Goal trees, strategic reviews, decision journal, quarterly planning.

**Reports to CoS**: Weekly strategy summary, goal progress, flagged risks.

#### OPERATIONS DIRECTOR

Manages daily execution across all business and project domains.

| Team | Role | Model Tier |
|---|---|---|
| **Business Ops** (per venture) | Runs day-to-day for each business | Sonnet |
| **Project Manager** | Tracks active projects, deadlines, dependencies | Sonnet |
| **Task Executor** | Does the actual work — research, drafting, analysis | Sonnet/Haiku |
| **Quality Controller** | Reviews outputs before they reach you | Sonnet |
| **Service Connector** | Manages integrations (calendar, reminders, email) | Haiku |

**Owns**: Active projects, task queues, service integrations, daily operations.

**Reports to CoS**: Daily ops summary, blocked items, completed deliverables.

#### INTELLIGENCE DIRECTOR

Manages everything the system knows, learns, and remembers.

| Team | Role | Model Tier |
|---|---|---|
| **Knowledge Manager** | Organizes vault, maintains context maps, tags content | Sonnet |
| **Learning Analyst** | Processes feedback, updates playbooks, tracks mistakes | Sonnet |
| **Research Team** | Deep research on topics across domains | Sonnet/Opus |
| **Vault Scanner** | Proactive review of notes, staleness detection | Haiku |
| **Cross-Domain Linker** | Finds connections between unrelated areas | Opus |

**Owns**: Memory system, learnings, research outputs, vault health, context maps.

**Reports to CoS**: New insights, stale content alerts, learning summaries.

#### COMMUNICATIONS DIRECTOR

Manages all content creation and external communications.

| Team | Role | Model Tier |
|---|---|---|
| **Newsletter Team** | Writes, edits, publishes newsletter issues | Sonnet |
| **Social Media Team** | Creates posts, manages content calendar | Sonnet/Haiku |
| **Email Drafter** | Reads inbox, drafts responses, flags urgent | Sonnet |
| **Content Strategist** | Plans content across channels for coherence | Sonnet |
| **Presentation Builder** | Creates decks, documents, proposals | Sonnet |

**Owns**: All outbound content, email management, content calendar.

**Reports to CoS**: Content pipeline status, urgent emails, engagement metrics.

#### PERSONAL ADVISORY DIRECTOR

Manages health, wellbeing, and personal life domains — with lighter touch.

| Team | Role | Model Tier |
|---|---|---|
| **Health Tracker** | Monitors health metrics, suggests protocols | Sonnet |
| **Life Admin** | Reminders, appointments, travel, logistics | Haiku |
| **Personal Advisor** | Relationship advice, personal decisions (on request only) | Opus |
| **Habit Coach** | Tracks habits, nudges, accountability | Haiku |

**Owns**: Health domain, personal admin, habit tracking.

**Reports to CoS**: Health summary (weekly), urgent personal items only.

**Special rule**: This Director ONLY acts when asked, or for health/calendar items. No proactive analysis of personal notes unless explicitly requested.

#### SYSTEMS DIRECTOR

Manages the AI Genius infrastructure itself — the meta-layer.

| Team | Role | Model Tier |
|---|---|---|
| **Token Budget Manager** | Tracks usage, allocates across Directors | Haiku |
| **Performance Monitor** | Tracks response times, error rates, quality | Haiku |
| **Skill Developer** | Proposes and builds new skills/capabilities | Sonnet |
| **Security Auditor** | Reviews actions, maintains audit trail | Haiku |
| **Self-Improvement Engine** | Proposes system improvements, optimizations | Sonnet |

**Owns**: System health, token budgets, skill registry, security, self-improvement.

**Reports to CoS**: System health dashboard, budget alerts, improvement proposals.

### 2.3 Management Protocols

#### Span of Control

```
You ──► 1 (Chief of Staff)
CoS ──► 6 (Directors)
Each Director ──► 3-5 (Team Leads / Specialists)
Each Specialist ──► can spawn workers (Haiku instances for grunt work)
```

**Total active at any time**: Typically 2-5 Claude instances, not 1,000 simultaneously. The "1,000 employees" metaphor means 1,000 person-equivalents of capability, not 1,000 running processes.

#### Escalation Protocol

```
Level 0 — HANDLED: Specialist resolves autonomously
  Example: Format a document, look up a fact, draft a social post

Level 1 — DIRECTOR REVIEW: Director reviews before delivery
  Example: Newsletter issue draft, business analysis, email response

Level 2 — CoS REVIEW: CoS reviews before presenting to you
  Example: Strategic recommendation, cross-domain insight, budget change

Level 3 — CEO DECISION: Requires your explicit approval
  Example: Business pivot, goal change, public statement, spending decision

Level 4 — CEO DISCUSSION: Complex, needs interactive dialogue
  Example: Life strategy, major business decision, ethical dilemma
```

#### Inter-Director Communication

Directors don't work in silos. The CoS coordinates cross-cutting work:

```
Example: You say "Launch the new product next month"

CoS decomposes and coordinates:
├── Strategy Director: Validate timing, competitive analysis
├── Operations Director: Create project plan, assign tasks
├── Communications Director: Press release, social campaign, email blast
├── Intelligence Director: Pull all relevant research and past launches
└── CoS: Synthesize into unified launch plan, present to you

Each Director works in parallel, CoS assembles the result.
```

#### Delegation Authority Matrix

What each level can do WITHOUT escalating:

| Action | Specialist | Director | CoS | CEO (You) |
|---|---|---|---|---|
| Read vault files | Yes | Yes | Yes | Yes |
| Write working files | Yes | Yes | Yes | Yes |
| Update memory/learnings | Yes | Yes | Yes | Yes |
| Draft content | Yes | Yes | Yes | Yes |
| Send email | No | Drafts only | Drafts only | Approves send |
| Modify goals | No | Propose | Propose | Decides |
| Create calendar events | No | Yes (routine) | Yes | Yes |
| Change system config | No | No | Propose | Approves |
| Spend tokens on deep research | No | Within budget | Yes | Yes |
| Modify vault structure | No | No | Propose | Approves |
| Create new skills | No | Propose | Review & propose | Approves |

#### Director State Files

Each Director maintains a state file in the vault:

```
_SYSTEM/DIRECTORS/
├── chief-of-staff/
│   ├── ROLE.md                    # Role definition, protocols
│   ├── STATE.md                   # Current status, active items
│   ├── ESCALATION-QUEUE.md        # Items waiting for CEO
│   └── DAILY-BRIEF-TEMPLATE.md    # Morning briefing format
├── strategy/
│   ├── ROLE.md
│   ├── STATE.md
│   ├── ACTIVE-INITIATIVES.md
│   └── REVIEW-SCHEDULE.md
├── operations/
│   ├── ROLE.md
│   ├── STATE.md
│   ├── TASK-QUEUE.md
│   └── PROJECT-STATUS.md
├── intelligence/
│   ├── ROLE.md
│   ├── STATE.md
│   ├── SCAN-SCHEDULE.md
│   └── INSIGHT-QUEUE.md
├── communications/
│   ├── ROLE.md
│   ├── STATE.md
│   ├── CONTENT-CALENDAR.md
│   └── DRAFT-QUEUE.md
├── personal-advisory/
│   ├── ROLE.md
│   ├── STATE.md
│   └── HEALTH-DASHBOARD.md
└── systems/
    ├── ROLE.md
    ├── STATE.md
    ├── TOKEN-USAGE.md
    └── IMPROVEMENT-PROPOSALS.md
```

### 2.4 How a Request Flows Through the Organization

```
You: "I need a competitive analysis for VentureA and
      draft a pitch deck based on the findings"

Step 1 — GATEWAY receives message via Discord/Voice

Step 2 — CHIEF OF STAFF processes:
  • Classifies: Multi-domain, Level 2 complexity
  • Identifies Directors: Strategy (analysis) + Comms (deck) + Intel (research)
  • Checks token budget: Sufficient for Opus research + Sonnet execution
  • Creates work item in MEMORY/WORK/

Step 3 — CoS DELEGATES (in parallel where possible):

  To Intelligence Director:
    "Pull all vault data on VentureA competitors,
     market notes, and previous analyses"
    → Intel spawns Vault Scanner (Haiku) + Research Team (Sonnet)
    → Returns: structured competitive data

  To Strategy Director:
    "Analyze competitive positioning using Intel's findings"
    → Strategy spawns Strategic Analyst (Opus)
    → Returns: SWOT, positioning map, key insights

  To Communications Director:
    "Draft pitch deck from Strategy's analysis"
    → Comms spawns Presentation Builder (Sonnet)
    → Returns: deck outline + slide content

Step 4 — CoS ASSEMBLES:
  • Reviews all outputs for consistency
  • Checks for contradictions between Directors
  • Quality-checks the deck against your style preferences
  • Packages into a single response

Step 5 — CoS RESPONDS to you:
  "Here's the competitive analysis and pitch deck draft.
   Key finding: Competitor X just raised Series B, which
   changes the urgency on your pricing strategy.
   The Strategy team recommends we discuss this.
   Deck is 12 slides, ready for your review."

Step 6 — LEARNING:
  • Your rating (1-10) is captured
  • Time-to-delivery logged
  • If you edit the deck heavily → Communications learns
  • If the strategy was off → Strategy adjusts playbook
```

---

## 3. SYSTEM ARCHITECTURE (Technical)

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOU (CEO)                                │
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
              │      CHIEF OF STAFF         │
              │      (Persistent Agent)     │
              │                             │
              │ • Triage & Classification   │
              │ • Director Delegation       │
              │ • Result Aggregation        │
              │ • Escalation Management     │
              │ • Context Awareness         │
              │ • Token Budget Oversight    │
              └──────┬──────────────┬───────┘
                     │              │
        ┌────────────▼──┐    ┌─────▼─────────────┐
        │  REACTIVE      │    │  PROACTIVE         │
        │  PIPELINE      │    │  PIPELINE          │
        │                │    │                    │
        │ CoS delegates  │    │ Scheduled tasks    │
        │ to Directors   │    │ Director-initiated │
        │ on demand      │    │ via cron/scheduler │
        └────────┬───────┘    └─────┬─────────────┘
                 │                  │
        ┌────────▼──────────────────▼───────┐
        │      DIRECTOR LAYER               │
        │      (6 Directors — Sonnet)       │
        │                                   │
        │  Each Director:                   │
        │  • Owns a domain                  │
        │  • Manages specialist teams       │
        │  • Has delegation authority        │
        │  • Maintains state in vault       │
        │  • Reports up to CoS             │
        └────────┬──────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │      SPECIALIST LAYER             │
        │      (Spawned on demand)          │
        │                                   │
        │  • Receive targeted context only  │
        │  • Execute specific tasks         │
        │  • Return results to Director     │
        │  • Haiku/Sonnet/Opus by task      │
        └────────┬──────────────────────────┘
                 │
        ┌────────▼──────────────────────────┐
        │        OBSIDIAN VAULT             │
        │        (Source of Truth)           │
        │                                   │
        │  • Knowledge Base (notes, docs)   │
        │  • Memory Store (learnings, logs) │
        │  • Director State Files           │
        │  • Context Maps & Domain Configs  │
        │  • Goal Trees & Strategies        │
        │  • External Files (PDF, XLSX...)  │
        └───────────────────────────────────┘
```

---

## 4. THE OBSIDIAN VAULT STRUCTURE

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
│   ├── DIRECTORS/                    # Management layer state & config
│   │   ├── chief-of-staff/
│   │   │   ├── ROLE.md               # Role definition, protocols
│   │   │   ├── STATE.md              # Current status, active items
│   │   │   ├── ESCALATION-QUEUE.md   # Items waiting for CEO
│   │   │   └── DAILY-BRIEF.md        # Morning briefing template
│   │   ├── strategy/
│   │   ├── operations/
│   │   ├── intelligence/
│   │   ├── communications/
│   │   ├── personal-advisory/
│   │   └── systems/
│   │
│   └── AGENTS/                       # Specialist agent definitions
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

## 5. THE DISPATCHER (Central Orchestrator)

The dispatcher is a persistent daemon on the Mac Mini that manages all AI operations. It implements the management hierarchy — the Chief of Staff is the dispatcher's core logic.

### 5.1 Architecture

```
┌──────────────────────────────────────────────────────────┐
│              DISPATCHER DAEMON (TypeScript / Bun)        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │          CHIEF OF STAFF LAYER                      │  │
│  │                                                    │  │
│  │  ┌──────────────┐    ┌──────────────────────────┐ │  │
│  │  │ Request       │    │ Scheduler                │ │  │
│  │  │ Queue         │    │ (Director-managed tasks) │ │  │
│  │  │               │    │                          │ │  │
│  │  │ From: you     │    │ • Strategy: quarterly    │ │  │
│  │  │ From: dirs    │    │ • Ops: daily tasks       │ │  │
│  │  │ From: cron    │    │ • Intel: vault scan      │ │  │
│  │  └──────┬────────┘    │ • Comms: email check     │ │  │
│  │         │             │ • Systems: health check  │ │  │
│  │         │             └────────┬─────────────────┘ │  │
│  │  ┌──────▼──────────────────────▼────────────────┐  │  │
│  │  │         TRIAGE & ROUTING                     │  │  │
│  │  │                                              │  │  │
│  │  │  1. Classify intent → Director(s)            │  │  │
│  │  │  2. Determine escalation level (0-4)         │  │  │
│  │  │  3. Check delegation authority matrix        │  │  │
│  │  │  4. Check token budget with Systems Dir      │  │  │
│  │  │  5. Delegate to Director(s) in parallel      │  │  │
│  │  │  6. Aggregate Director responses             │  │  │
│  │  │  7. Apply challenge gate if warranted        │  │  │
│  │  │  8. Format and deliver to CEO                │  │  │
│  │  └──────┬───────────────────────────────────────┘  │  │
│  └─────────┼──────────────────────────────────────────┘  │
│            │                                             │
│  ┌─────────▼─────────────────────────────────────────┐   │
│  │         DIRECTOR SPAWNER                          │   │
│  │                                                   │   │
│  │  For each Director task:                          │   │
│  │  1. Load Director ROLE.md (responsibilities)      │   │
│  │  2. Load Director STATE.md (current context)      │   │
│  │  3. Run Context Assembler for the domain          │   │
│  │  4. Spawn Claude instance (Sonnet for Directors)  │   │
│  │  5. Director may spawn Specialists (Haiku/Sonnet) │   │
│  │  6. Capture results, update STATE.md              │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │         CONTEXT ASSEMBLER (shared utility)        │   │
│  │                                                   │   │
│  │  1. Load domain CONTEXT-MAP.md                    │   │
│  │  2. Pull relevant vault files                     │   │
│  │  3. Load domain PLAYBOOK.md                       │   │
│  │  4. Load relevant LEARNINGS                       │   │
│  │  5. Assemble minimal context payload              │   │
│  │  6. Estimate token usage                          │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │         TOKEN BUDGET MANAGER                      │   │
│  │         (Managed by Systems Director)             │   │
│  │                                                   │   │
│  │  • Track per-Director token usage                 │   │
│  │  • Enforce Claude Max limits                      │   │
│  │  • Directors have individual budgets              │   │
│  │  • CoS can reallocate between Directors           │   │
│  │  • Reactive requests always get priority          │   │
│  │  • Queue proactive work for off-peak              │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Context Assembly Strategy

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

### 5.3 Token Budget Management

```yaml
# _SYSTEM/CONFIG/token-budget.yaml
claude_max_plan:
  daily_token_limit: 500000      # Estimated, adjust based on plan
  hourly_soft_limit: 60000       # Spread usage evenly

allocation:
  reactive: 70%                  # User-initiated tasks always priority
  proactive: 20%                 # Scheduled scans and analysis
  learning: 10%                  # Self-improvement tasks

per_director_budget:             # % of daily total
  strategy: 15%                  # Deep thinking, less frequent
  operations: 30%                # Highest volume
  intelligence: 15%              # Research & learning
  communications: 25%            # Content creation
  personal_advisory: 5%          # Low volume
  systems: 10%                   # Infrastructure overhead
  # CoS overhead comes from the Director it's delegating to

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

## 6. INTERFACE LAYER

### 6.1 Text Interface (Discord Bot / Custom Chat)

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

### 6.2 Voice Interface

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

### 6.3 Service Integrations

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

## 7. SELF-LEARNING & SELF-IMPROVEMENT SYSTEM

This is the most critical differentiator. Adapting PAI's learning patterns and extending them:

### 7.1 Learning Loop Architecture

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

### 7.2 Mistake Tracking & Correction

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

### 7.3 Skill Self-Improvement

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

## 8. THE CHALLENGER MODE

A key requirement — the system should think critically, not just comply:

### 8.1 Implementation

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

### 8.2 Cross-Domain Intelligence

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

## 9. IMPLEMENTATION PHASES

### Phase 0: Foundation (Week 1)

**Goal**: Core infrastructure on Mac Mini with management hierarchy

```
Tasks:
□ Set up the Obsidian vault structure (as defined in Section 4)
□ Install Bun runtime and dependencies on Mac Mini
□ Write all Director ROLE.md files (6 Directors + CoS)
□ Write the Chief of Staff routing logic (triage, delegation, aggregation)
□ Write the escalation protocol and delegation authority matrix
□ Create the dispatcher daemon skeleton with CoS as entry point
□ Set up PAI-compatible hook system
□ Create domain registry with your life areas
□ Write the context assembler (core algorithm)
□ Create token budget manager with per-Director budgets
□ Write Director STATE.md templates
□ Set up basic logging and error handling

Deliverable: Ask a question → CoS triages → delegates to Director →
Director spawns specialist → result flows back up → CoS responds.
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

## 10. TECHNICAL DECISIONS & RATIONALE

### 10.1 Why Obsidian Vault as Source of Truth

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Storage | Markdown files | Human-readable, version-controllable, no vendor lock |
| Structure | Folder hierarchy | Natural organization, easy to navigate manually |
| Metadata | YAML frontmatter | Standard, parseable, Obsidian-native |
| Search | File-based grep | No database overhead, instant for vault sizes <100K files |
| Sync | Git or Obsidian Sync | Proven, reliable, conflict-resolvable |
| External files | Store alongside | PDFs, XLSX etc. in same vault, referenced by markdown |

### 10.2 Why Multiple Claude Instances (Not One Big Context)

| Problem with single context | Solution with multiple instances |
|---|---|
| 200K token limit fills with vault data | Each instance gets 5-20K tokens of targeted context |
| Slow responses when context is large | Fast responses with minimal context |
| All-or-nothing failure mode | Isolated failures per domain |
| Can't parallelize | Multiple instances work simultaneously |
| Context window = all or nothing | Context assembler picks exactly what's needed |

### 10.3 Why Dispatcher Pattern

| Alternative | Problem | Dispatcher Advantage |
|---|---|---|
| Direct Claude calls | No context management | Assembles perfect context per task |
| Single long-running session | Context window limits | Fresh instances with targeted context |
| Manual context selection | Cognitive overhead on you | Automated domain routing |
| Database-backed system | Complexity, vendor lock | File-based, simple, inspectable |

### 10.4 Model Selection Strategy

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

## 11. THINGS YOU HAVEN'T CONSIDERED (MY ADDITIONS)

### 11.1 Context Decay & Freshness

Your notes age. A strategy from 6 months ago may be outdated. The system should:
- Weight recent information higher than old
- Flag stale context ("This business plan hasn't been updated in 90 days")
- Auto-archive completed projects
- Maintain a "freshness score" for each domain

### 11.2 Attention Management

With a genius system, the risk is information overload in reverse — the AI knows too much and overwhelms you. Solution:
- **Morning brief**: Top 5 things that need your attention today
- **Interrupt threshold**: Only notify for truly urgent items
- **Weekly digest**: Comprehensive but structured review
- **On-demand depth**: You drill down when YOU want to

### 11.3 Decision Journal

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

### 11.4 Delegation Levels

Not every task should require your approval. Define delegation levels:

| Level | Description | Example |
|-------|-------------|---------|
| **0 - Inform** | System does it, tells you after | Archive old emails, update status docs |
| **1 - Brief** | System does it, includes in daily brief | Email triage, calendar prep |
| **2 - Propose** | System prepares, you approve | Newsletter draft, strategy changes |
| **3 - Discuss** | System presents options, you decide | Business pivots, goal changes |
| **4 - Assist** | You lead, system supports | Personal decisions, relationship matters |

### 11.5 Graceful Degradation

When Claude Max rate limits hit, or API is down:
- Queue non-urgent tasks
- Use cached responses where possible
- Prioritize user-initiated over proactive tasks
- Fall back to simpler models (haiku) for background work
- Maintain a "last known state" summary per domain

### 11.6 Privacy Boundaries

Define clear boundaries for the personal domain:
```yaml
personal_domain:
  system_access: advisory_only
  auto_analysis: false
  proactive_suggestions: false
  data_retention: minimal
  notes: "System reads personal notes only when explicitly asked"
```

### 11.7 Multi-Vault Sync Strategy

If you use Obsidian on multiple devices:
- Mac Mini vault is source of truth
- Changes sync via Obsidian Sync or Git
- Conflict resolution: Mac Mini wins (it has the AI context)
- Mobile vault is read-heavy, write-light

### 11.8 Emergency Protocols

What if the Mac Mini goes down?
- Cloud backup of vault (encrypted)
- Fallback Discord bot on cloud VM (minimal version)
- Critical contacts/numbers accessible without the system
- Monthly "disaster recovery" test

---

## 12. RISK REGISTER

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

## 13. SUCCESS METRICS

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

## 14. FIRST SESSION: BOOTSTRAPPING THE SYSTEM

When implementation begins, the first Claude Code session should:

1. **Create the vault structure** (Section 4) including `_SYSTEM/DIRECTORS/`
2. **Write the Director ROLE.md files** (Section 2) — defining each Director's responsibilities, teams, and protocols
3. **Write the Chief of Staff ROLE.md** — the most critical file, defines how requests flow
4. **Write the dispatcher skeleton** (Section 5) — implementing the CoS as the entry point
5. **Create the domain registry** with your actual life areas
6. **Write the first DOMAIN.md files** based on information you provide
7. **Set up the hook system** (adapted from PAI)
8. **Create the context assembler** algorithm
9. **Write the escalation protocol and delegation authority matrix** into CoS config
10. **Write the first connector** (Apple Reminders — simplest)
11. **Test end-to-end**: Ask a question → Gateway → CoS → Director delegation → Specialist execution → CoS aggregation → answer

This document itself should be stored in `_SYSTEM/CONFIG/ARCHITECTURE.md` as the system's founding document.
