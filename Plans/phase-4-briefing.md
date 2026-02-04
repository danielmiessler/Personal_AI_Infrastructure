# Phase 4: Advanced Skills — Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for **Phase 4** of the AI Genius transformation. Phases 1–3 are complete and merged to main.

**Reference repo**: `~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ` — clone of Daniel Messler's PAI. Read files there for implementation patterns. Adapt, don't copy.

**Safety rule**: After EVERY sub-step (4A through 4D), commit to git with a descriptive message. If anything breaks, `git revert` that commit.

---

## PART 1: CURRENT STATE AFTER PHASE 3

### What Exists

Phases 1–3 built the full foundation: modular architecture, hook system, and learning engine.

```
AI/
├── skills/               # 23 skill files + review-proposals skill (Phase 3)
├── context/              # 7 domain context maps
├── policies/             # 8 policy files + security-patterns.yaml
├── memory/
│   ├── work/             # Auto-tracked sessions (META.yaml per session)
│   ├── learnings/
│   │   ├── preferences.md    # Structured table with confidence scores
│   │   ├── mistakes.md       # Structured table with occurrence counts
│   │   ├── execution.md
│   │   └── synthesis/        # Weekly YYYY-WW.md reports
│   ├── proposals/
│   │   ├── pending/          # Awaiting review
│   │   ├── approved/         # Applied
│   │   └── rejected/         # With reasons + blocklist.md
│   ├── signals/ratings.jsonl # Explicit + implicit ratings
│   ├── security/             # Audit trail
│   └── context-log.md
├── hooks/                # 7 hooks (session-start, end, feedback, security,
│                         #   format-enforcer, auto-work, implicit-sentiment)
└── scripts/              # 5 original + learning-synthesis.sh
```

### What Phase 4 Adds

Four high-value skills that leverage the existing infrastructure:

| Skill | What It Does | Uses |
|---|---|---|
| **Research** | Multi-source research with 3 depth levels | MCP servers (Brave, Firecrawl, Perplexity, Gemini) |
| **Council** | Multi-agent debate for important decisions | Claude subagents (Task tool) |
| **CreateSkill** | Self-extending — creates new skills on demand | Skill file system, validation |
| **Telos** | Life OS / goals management | Tracking/, Areas/, Projects/ |

### Infrastructure These Skills Can Use

- **Memory**: Write to `AI/memory/` for cross-session persistence
- **Learning**: Ratings and feedback captured automatically by hooks
- **Proposals**: Can generate improvement proposals for Phase 3's review system
- **Context maps**: Load relevant vault files per domain
- **Security**: All tool calls pass through security validator

---

## PART 2: PAI REFERENCE FILES

### Research Skill
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/SKILL.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/QuickResearch.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/StandardResearch.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/ExtensiveResearch.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/ExtractAlpha.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/UrlVerificationProtocol.md
```

### Council Skill
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/SKILL.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/CouncilMembers.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/RoundStructure.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/OutputFormat.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/Workflows/Debate.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/Workflows/Quick.md
```

### CreateSkill Skill
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/SKILL.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/CreateSkill.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/ValidateSkill.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/CanonicalizeSkill.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/UpdateSkill.md
```

### Telos Skill
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/SKILL.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Tools/UpdateTelos.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/Update.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/WriteReport.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/CreateNarrativePoints.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/InterviewExtraction.md
```

---

## PART 3: IMPLEMENTATION STEPS

### Constraints

**DO NOT TOUCH**:
- Vault folder structure, .base files, eventkit-cli, mail-cli, afk-code, Obsidian plugins
- Existing working hooks, policies, memory structure
- CLAUDE.md (unless adding skill routing references)

**ALWAYS**:
- Git commit after every sub-step
- Test each skill with at least 2 different prompts
- Skills must follow the existing YAML frontmatter convention from Phase 1
- Store research outputs as Markdown (readable in Obsidian)
- New skills go in `AI/skills/`, new context maps go in `AI/context/`

---

### Step 4A: Research Skill

**What it does**: Multi-source research with 3 depth levels. Orchestrates existing MCP servers (Brave Search, Firecrawl, Perplexity, Gemini) into structured research workflows. Produces synthesized reports, not raw search dumps.

**Why valuable**: You already have 6 MCP servers. Without this skill, you manually invoke each one. This skill routes your request to the right combination of sources at the right depth and produces a coherent synthesis.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/SKILL.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/QuickResearch.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/StandardResearch.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/Workflows/ExtensiveResearch.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-research-skill/src/skills/Research/UrlVerificationProtocol.md

□ Create AI/skills/research.md:
  ---
  name: Research
  triggers: ["research", "do research", "investigate", "find information",
             "quick research", "extensive research", "look into",
             "what do we know about", "gather info"]
  context_files:
    - AI/context/research.md
  policies:
    - security-boundaries
  voice: "Analytical, source-aware. Always cite sources. Distinguish facts from inference."
  ---

  # Research

  ## When to Activate
  When the user asks to research a topic, find information, investigate something,
  or explicitly says "research this". Also activated by other skills that need
  information gathering (e.g., newsletter writing, business decisions).

  ## Depth Modes

  ### Quick Research (default for simple questions)
  Trigger: "quick research", "briefly look into", or simple factual questions
  - Single source: use Claude's WebSearch tool OR one MCP server
  - Time: ~10-15 seconds
  - Output: 3-5 bullet points with source links
  - Use when: factual lookups, quick verification, simple questions

  ### Standard Research (default for "do research")
  Trigger: "research", "do research", "investigate"
  - Two parallel agents:
    Agent 1: WebSearch (Claude's built-in web search)
    Agent 2: Perplexity MCP (alternative perspective)
  - Cross-reference findings, note agreements and disagreements
  - Time: ~15-30 seconds
  - Output: structured report with sections:
    ## Key Findings
    ## Sources Agree On
    ## Sources Disagree On / Nuances
    ## Confidence Assessment
    ## Sources

  ### Extensive Research (explicit request only)
  Trigger: "extensive research", "deep dive", "thorough research"
  - Multiple parallel agents:
    Agent 1-2: WebSearch (broad + specific queries)
    Agent 3: Perplexity MCP (synthesis perspective)
    Agent 4: Brave Search MCP (alternative search engine)
    Agent 5: Firecrawl MCP (if specific URLs need deep scraping)
  - Synthesis phase: combine all findings, resolve contradictions
  - Time: ~60-90 seconds
  - Output: comprehensive report with:
    ## Executive Summary
    ## Detailed Findings (by sub-topic)
    ## Source Analysis (reliability, recency, agreement)
    ## Open Questions (what couldn't be verified)
    ## Recommendations for Further Research
    ## All Sources (with verification status)

  ## URL Verification Protocol
  CRITICAL: Research agents sometimes hallucinate URLs.
  For EVERY URL in the output:
  1. Verify the URL loads (HTTP 200)
  2. Verify the content matches what was claimed
  3. If verification fails: remove the URL, note "source not verified"
  NEVER include unverified URLs in final output.

  ## Available MCP Servers
  Check which are currently connected. As of last check:
  - Brave Search MCP — web search
  - Firecrawl MCP — web scraping, content extraction
  - Perplexity MCP — AI-powered search synthesis
  - Gemini MCP — Google's AI (may be offline — check status)
  Note: google-workspace and gemini MCPs have been flaky. Always fall back
  to WebSearch + Brave + Perplexity if Gemini is unavailable.

  ## Output Storage
  - Save research output to AI/memory/research/YYYY-MM-DD_{topic-slug}.md
  - Include metadata: date, depth mode, sources used, query
  - This allows future sessions to reference past research

  ## Integration with Other Skills
  When another skill needs research (e.g., newsletter-editor needs background on a topic):
  - The calling skill can reference: "Use the Research skill at [depth] for [topic]"
  - Research produces output, the calling skill continues with it

□ Create directory: AI/memory/research/

□ Create AI/context/research.md:
  # Research Context Map

  ## Primary Files
  - AI/memory/research/ — past research outputs (check for existing work on topic)
  - Content/AI Equilibrium/ — for newsletter-related research

  ## MCP Servers Available
  - Brave Search: general web search
  - Firecrawl: web scraping and content extraction
  - Perplexity: AI-synthesised search results
  - Gemini: Google AI (check availability)

  ## Research Quality Rules
  - Always verify URLs before including
  - Distinguish primary sources from secondary
  - Note recency of information
  - Flag when sources disagree

□ Update AI/skills/ai-equilibrium-editor.md (or equivalent newsletter skill):
  → Add to context_files: AI/context/research.md
  → Add note: "For topic research, invoke the Research skill at Standard depth"

□ Test:
  → "quick research on latest Claude Code features" → single source, brief output
  → "do research on AI agent frameworks in 2025" → two parallel agents, structured report
  → "extensive research on personal knowledge management tools" → 4-5 agents, comprehensive
  → Verify: AI/memory/research/ contains output files
  → Verify: URLs in output are verified (no broken links)

□ Git commit: "add: research skill with 3 depth modes and MCP integration"
```

---

### Step 4B: Council Skill (Multi-Agent Debate)

**What it does**: For important decisions, spawns 3-5 specialised agents who debate a topic through 3 rounds. Each agent has a distinct perspective and challenges the others. You get a structured transcript with convergence points and remaining disagreements.

**Why valuable**: You're strong at synthesis and connecting dots. This skill gives you pre-digested intellectual friction from multiple angles — raw material for your synthesis, not a single AI opinion.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/SKILL.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/CouncilMembers.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/RoundStructure.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/Workflows/Debate.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-council-skill/src/skills/Council/Workflows/Quick.md

□ Create AI/skills/council.md:
  ---
  name: Council
  triggers: ["council", "debate this", "get multiple perspectives",
             "what would different experts say", "council:", "multi-perspective"]
  context_files: []
  policies:
    - challenger-protocol
  voice: "Facilitator. Present each agent's voice distinctly. Synthesise at the end."
  ---

  # Council — Multi-Agent Debate

  ## When to Activate
  When the user wants multiple perspectives on a decision, strategy, or problem.
  Especially useful for: business decisions, career moves, strategy questions,
  architecture choices, investment decisions, content strategy.

  ## Workflows

  ### Full Debate (default)
  Trigger: "council:", "debate this", "get perspectives on"
  3 rounds, 4 agents, ~30-90 seconds

  ### Quick Council
  Trigger: "quick council", "fast perspectives"
  1 round, 3-4 agents, ~10-20 seconds

  ## Default Council Members

  Adapt these to the user's domains. The user (Krzysztof) works across:
  business strategy, content creation, AI/tech, investing, health, personal development.

  | Agent | Perspective | Voice Style |
  |---|---|---|
  | **Strategist** | Long-term strategy, competitive dynamics, power | Direct, analytical, cites frameworks |
  | **Pragmatist** | Implementation reality, resource constraints, timing | Grounded, practical, "yes but how" |
  | **Challenger** | Devil's advocate, risks, what could go wrong | Provocative, tough love, contrarian |
  | **Domain Expert** | Deep knowledge of the specific domain (varies per topic) | Technical, precise, evidence-based |

  For specific topics, the Domain Expert adapts:
  - Business question → Business/Finance expert
  - Health question → Health/Science expert
  - Tech question → Engineering/Architecture expert
  - Content question → Media/Audience expert
  - Investing question → Financial analyst

  Optional additional agents (invoke with "council with [role]"):
  - **Creative** — lateral thinking, unexpected connections, "what if"
  - **User Advocate** — end-user perspective, simplicity, accessibility
  - **Historian** — precedent, what happened when others tried this

  ## Three-Round Structure

  ### Round 1: Initial Positions (parallel)
  Each agent gets the topic + relevant context.
  Each states their position in 50-150 words, first person.
  All agents execute IN PARALLEL via Task tool.

  Prompt template for each agent:
  "You are [Agent Name], [perspective description].
   Topic: [the user's question]
   Context: [relevant domain context from context maps]

   State your initial position on this topic in 50-150 words.
   Be specific and substantive. First person voice.
   Do NOT hedge or equivocate — take a clear position."

  ### Round 2: Responses & Challenges (parallel)
  Each agent receives ALL Round 1 positions.
  Each responds to the others' points in 50-150 words.
  Must explicitly reference other agents: "I disagree with Strategist's point about X..."
  All agents execute IN PARALLEL.

  Prompt template:
  "You are [Agent Name]. Here are the Round 1 positions:
   [All positions]

   Respond to the other council members' points. 50-150 words.
   Explicitly agree or disagree with specific points by name.
   Add new arguments that weren't raised in Round 1.
   Genuine intellectual friction — don't be polite for its own sake."

  ### Round 3: Convergence (parallel)
  Each agent receives Rounds 1 + 2.
  Each identifies: what they've changed their mind about (if anything),
  what remains unresolved, their final recommendation.
  50-150 words. All execute IN PARALLEL.

  ### Synthesis (sequential, by you — the facilitator)
  After all 3 rounds, produce:

  ## Council Transcript
  [Full transcript with agent names and rounds clearly marked]

  ## Convergence Points
  - Points where 3+ agents agreed
  - Strongest arguments (by evidence, not just conviction)

  ## Remaining Disagreements
  - Where agents still diverge, and why
  - What information would resolve the disagreement

  ## Recommended Path
  - Based on weight of arguments (not majority vote)
  - Note the risks flagged by the Challenger

  ## Agent Execution

  Use the Task tool to run agents in parallel within each round.
  Between rounds, wait for all agents to complete before starting the next round.

  Round 1: 4 parallel Task calls → wait for all
  Round 2: 4 parallel Task calls (with Round 1 transcript) → wait for all
  Round 3: 4 parallel Task calls (with R1+R2 transcripts) → wait for all
  Synthesis: produce final output

  ## Output Storage
  Save council transcripts to AI/memory/research/YYYY-MM-DD_council_{topic-slug}.md
  (Councils are a form of research — reusable in future sessions)

□ Test:
  → "council: should I pivot my newsletter from weekly to biweekly?"
    → Verify: 4 agents debate across 3 rounds
    → Verify: transcript includes genuine disagreement
    → Verify: synthesis identifies convergence + disagreements
  → "quick council: is it worth learning Rust for my projects?"
    → Verify: 1 round, 3-4 agents, fast output
  → Verify: output saved to AI/memory/research/

□ Git commit: "add: council skill for multi-agent debate on decisions"
```

---

### Step 4C: CreateSkill Skill (Self-Extending)

**What it does**: Creates new skills when a pattern of requests doesn't map to existing skills. Can also be invoked explicitly. Scaffolds the skill file with proper frontmatter, creates context maps, and validates the result.

**Why valuable**: The system grows organically. If you start asking about a new topic regularly, it can create a dedicated skill — complete with the right context maps, policies, and voice settings.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/SKILL.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/CreateSkill.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-createskill-skill/src/skills/CreateSkill/Workflows/ValidateSkill.md

□ Create AI/skills/create-skill.md:
  ---
  name: Create Skill
  triggers: ["create a skill", "new skill", "create skill for",
             "I need a skill that", "add a new mode"]
  context_files: []
  policies:
    - security-boundaries
  voice: "Methodical. Walk through each decision. Confirm before creating."
  ---

  # Create Skill — Self-Extending System

  ## When to Activate
  - User explicitly asks to create a new skill
  - Weekly synthesis (Phase 3) identifies a recurring request pattern
    without a matching skill and proposes creation
  - User says "I keep asking about X, let's make a skill for it"

  ## Workflows

  ### Create (default)
  Interactive skill creation with validation.

  ### Validate
  Check an existing skill file for proper structure.

  ### Update
  Add workflows or modify an existing skill.

  ## Create Workflow

  Step 1: Gather Requirements
  Ask the user (or read from proposal if auto-triggered):
  - What domain does this skill cover?
  - What should trigger it? (keywords, phrases)
  - What vault files are relevant? (for context map)
  - What policies apply? (existing or new?)
  - What tone/voice should it use?
  - Are there existing skills it overlaps with?

  Step 2: Check for Overlap
  - Read ALL existing skills in AI/skills/
  - Check if any existing skill already covers this domain
  - If overlap: suggest enhancing the existing skill instead of creating new
  - If partial overlap: propose how to divide responsibility

  Step 3: Scaffold the Skill File
  Create AI/skills/{skill-name}.md with:
  ```yaml
  ---
  name: [Skill Name]
  triggers: [trigger keywords]
  context_files:
    - AI/context/{domain}.md
  policies:
    - [relevant policies]
  voice: "[tone description]"
  ---
  ```

  Include sections:
  - # [Skill Name]
  - ## When to Activate
  - ## Instructions
  - ## Workflows (if applicable)
  - ## Examples (2-3 concrete usage examples)
  - ## Anti-Patterns (what this skill should NOT do)

  Step 4: Create Context Map (if needed)
  If no existing context map covers this domain:
  - Create AI/context/{domain}.md
  - List primary vault files/folders
  - List secondary references
  - Note related domains

  Step 5: Validate
  Check the created skill:
  - YAML frontmatter is valid
  - Triggers don't conflict with existing skills
  - Referenced context_files exist
  - Referenced policies exist
  - Voice is defined
  - At least 2 examples included

  Step 6: Register
  - The skill is automatically available because CLAUDE.md routes to AI/skills/
  - No manual registration needed (file-based routing)
  - Inform the user: "New skill created: [name]. Trigger with: [keywords]"

  Step 7: Git Commit
  - Commit the new skill file + context map (if created)
  - Message: "add: [skill-name] skill for [domain]"

  ## Validation Rules (for Validate workflow)
  Check any skill file against:
  □ Has valid YAML frontmatter (name, triggers, voice at minimum)
  □ Triggers array is non-empty
  □ No trigger conflicts with other skills' triggers
  □ context_files references exist on disk
  □ policies references exist in AI/policies/
  □ Has ## When to Activate section
  □ Has ## Instructions section
  □ Has at least 2 ## Examples

  ## Integration with Phase 3
  The weekly synthesis (learning-synthesis.sh) can detect:
  - "General Advisor was used 15 times this week for cooking questions"
  → Proposes: "Create a Cooking skill? Evidence: 15 unmatched requests."
  → Proposal goes to AI/memory/proposals/pending/
  → User approves → CreateSkill executes the creation

□ Test:
  → "create a skill for travel planning"
    → Verify: asks requirements, checks overlap, creates file
    → Verify: AI/skills/travel-planning.md exists with proper frontmatter
    → Verify: context map created if needed
    → Verify: git commit made
  → "validate the research skill"
    → Verify: checks all validation rules, reports pass/fail
  → Test trigger overlap: try creating a skill with triggers that match an existing skill
    → Verify: warns about overlap, suggests alternative

□ Git commit: "add: create-skill for self-extending capability"
```

---

### Step 4D: Telos Skill (Life OS / Goals)

**What it does**: Manages goals, beliefs, lessons learned, and life areas as structured data. Integrates with the existing Tracking/ hierarchy (Objectives, Key Results, Habits) and Areas/. Produces progress reports and proposes goal revisions.

**Why valuable**: You already have Tracking/Objectives/, Tracking/Key Results/, and Areas/Life Areas/. This skill connects them into a coherent life operating system with periodic reviews — instead of data sitting in separate files.

**Important adaptation note**: PAI's Telos stores everything in `~/.claude/skills/CORE/USER/TELOS/`. This vault already has the data in Tracking/ and Areas/. Do NOT duplicate it. Create views and workflows that READ from existing locations, not new files.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/SKILL.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/Update.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/WriteReport.md
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Workflows/InterviewExtraction.md

□ Create AI/skills/telos.md:
  ---
  name: Telos
  triggers: ["goals", "objectives", "life review", "telos",
             "update my goals", "how am I doing", "goal progress",
             "quarterly review", "what am I working toward",
             "add lesson", "add belief", "life OS"]
  context_files:
    - AI/context/goals.md
  policies:
    - challenger-protocol
  voice: "Reflective but honest. Report progress factually.
          Challenge goals that aren't being pursued. Celebrate real progress."
  ---

  # Telos — Life Operating System

  ## When to Activate
  When the user asks about goals, objectives, life direction, progress,
  or wants to review/update their personal operating system.

  ## Data Sources (READ from existing vault — do NOT create copies)

  | Data | Location | Format |
  |---|---|---|
  | Objectives | Tracking/Objectives/ | Markdown with frontmatter |
  | Key Results | Tracking/Key Results/ | Markdown with frontmatter |
  | Habits | Tracking/Habits/ | Markdown / .base |
  | Years | Tracking/Years/ | Yearly review docs |
  | Life Areas | Areas/ | Folder per area |
  | Projects | Projects/GPR/ | Active projects |
  | Deep Profile | AI/My AgentOS/Deep Profile & Operating Manual.md | Psych profile |
  | Context Log | AI/memory/context-log.md | Current priorities |

  ## Telos Personal Files (NEW — stored in AI/telos/)

  These files are NEW and managed by this skill. They capture things
  NOT already tracked elsewhere in the vault:

  | File | Purpose |
  |---|---|
  | AI/telos/beliefs.md | What you believe to be true (tested by experience) |
  | AI/telos/lessons.md | Hard-won lessons (not repeated mistakes — deep insights) |
  | AI/telos/wisdom.md | Frameworks and mental models you use |
  | AI/telos/predictions.md | Predictions you've made (track accuracy over time) |

  ## Workflows

  ### Review Progress (default for "how am I doing", "goal progress")
  1. Read Tracking/Objectives/ and Tracking/Key Results/
  2. Read Projects/GPR/ for active projects
  3. Cross-reference: which objectives have active projects? Which don't?
  4. Read AI/memory/work/ — what have you actually been working on?
  5. Produce:
     ## Goal Progress Report
     ### On Track
     - [Objectives with active key results showing progress]
     ### At Risk
     - [Objectives with stalled or missing key results]
     ### Not Started
     - [Objectives with no active projects]
     ### Recommendation
     - [Which goals to focus on, which to reconsider]

  ### Update Goals
  Triggered by "update my goals", "add objective", "revise goals"
  - Interactive: ask what to add/change/remove
  - Update the relevant file in Tracking/Objectives/ or Tracking/Key Results/
  - Follow existing frontmatter schema (read examples first)
  - Git commit after changes

  ### Add to Telos (beliefs, lessons, wisdom, predictions)
  Triggered by "add lesson", "add belief", "I learned that", "I predict"
  - Append to the relevant AI/telos/ file
  - Include date, context, and confidence level
  - For predictions: include timeframe and how to verify

  ### Quarterly Review
  Triggered by "quarterly review" or scheduled (see below)
  1. Read all Tracking/ data
  2. Read AI/memory/learnings/synthesis/ — last 12 weeks of synthesis reports
  3. Read AI/telos/ personal files
  4. Produce comprehensive report:
     ## Quarter in Review
     ### Goals: What Progressed
     ### Goals: What Stalled (and why)
     ### Learning Trends (from synthesis reports)
     ### Predictions Check (any predictions verifiable now?)
     ### Belief Updates (any beliefs challenged by evidence?)
     ### Recommended Focus for Next Quarter

  ### Monthly Report (lightweight)
  Triggered by "monthly review" or scheduled
  Subset of quarterly: just goal progress + learning trends

  ## Integration with Existing Scripts
  - weekly-review.sh already runs Sunday — could include a Telos mini-check
  - Quarterly review could be a new launchd script or triggered manually

  ## Challenger Protocol Integration
  When reviewing goals, ACTIVELY challenge:
  - Goals with no progress for 30+ days: "Is this still a priority?"
  - Goals that conflict with actual time allocation: "You say X is a priority
    but your sessions show you spend time on Y"
  - Beliefs that have been contradicted by recent experience

□ Create directory: AI/telos/

□ Create AI/telos/beliefs.md:
  # Beliefs
  _What I believe to be true, based on experience. Periodically reviewed._

  | Date Added | Belief | Confidence | Domain | Last Challenged |
  |---|---|---|---|---|

□ Create AI/telos/lessons.md:
  # Lessons
  _Hard-won insights. Not repeated mistakes — deep understanding._

  | Date | Lesson | Context | Domain |
  |---|---|---|---|

□ Create AI/telos/wisdom.md:
  # Wisdom — Frameworks & Mental Models
  _Models I use for thinking and decision-making._

  | Model | Description | When to Use | Source |
  |---|---|---|---|

□ Create AI/telos/predictions.md:
  # Predictions
  _Track accuracy over time. Review quarterly._

  | Date | Prediction | Timeframe | Confidence | Outcome | Verified |
  |---|---|---|---|---|---|

□ Create AI/context/goals.md:
  # Goals Context Map

  ## Primary Files
  - Tracking/Objectives/ — all current objectives
  - Tracking/Key Results/ — measurable key results
  - Tracking/Habits/ — habit tracking
  - Tracking/Years/ — yearly reviews and themes

  ## Secondary Files
  - Projects/GPR/ — active projects (linked to objectives)
  - Areas/ — life areas and domains
  - AI/telos/ — beliefs, lessons, wisdom, predictions
  - AI/memory/context-log.md — current priorities
  - AI/My AgentOS/Deep Profile & Operating Manual.md — personal profile

  ## Related Domains
  - business (for business goals)
  - health (for health goals)
  - personal (for life goals)

□ Test:
  → "how am I doing on my goals?" → reads Tracking/, produces progress report
  → "add a lesson: rushing architecture decisions always costs more time later"
    → Verify: appended to AI/telos/lessons.md
  → "I predict AI agents will replace 50% of SaaS tools by 2027"
    → Verify: appended to AI/telos/predictions.md with timeframe
  → "quarterly review" → comprehensive report with challenger pushback

□ Git commit: "add: telos skill for life OS and goal management"
```

---

## PART 4: MANUAL TESTING CHECKLIST

After all skills are implemented:

```
□ Test 1: Research — Quick
  → "quick research on the latest Obsidian plugin releases"
  → Verify: single source, 3-5 bullets, source links verified

□ Test 2: Research — Standard
  → "research the state of personal AI assistants in 2025"
  → Verify: 2 parallel agents, structured report, sources cited

□ Test 3: Research — Extensive
  → "extensive research on knowledge graph tools for Obsidian"
  → Verify: 4-5 agents, comprehensive report, stored in AI/memory/research/

□ Test 4: Council — Full Debate
  → "council: should I invest in building my own AI tools vs using existing ones?"
  → Verify: 4 agents, 3 rounds, genuine disagreement, synthesis

□ Test 5: Council — Quick
  → "quick council: biweekly newsletter — good or bad idea?"
  → Verify: 1 round, fast, distinct positions

□ Test 6: CreateSkill
  → "create a skill for meal planning"
  → Verify: interactive creation, proper frontmatter, no overlap warning (new domain)
  → Verify: AI/skills/meal-planning.md exists

□ Test 7: CreateSkill — Overlap Detection
  → "create a skill for financial advice"
  → Verify: warns about overlap with financial-advisor skill
  → Verify: suggests enhancing existing instead

□ Test 8: Telos — Progress
  → "how am I doing on my goals?"
  → Verify: reads Tracking/, reports progress, flags stalled goals

□ Test 9: Telos — Add
  → "add belief: most productivity advice is designed for neurotypical people"
  → Verify: added to AI/telos/beliefs.md with date and domain

□ Test 10: Cross-Skill
  → "research the best goal-tracking frameworks, then update my telos with findings"
  → Verify: Research runs first, then Telos uses the output
```

---

## PART 5: UPDATING CLAUDE.md

After all skills are created, CLAUDE.md's skill routing section may need updating to mention the new skills. Add to the routing instruction:

```
Available skills include (but are not limited to):
- research.md — Multi-source research at 3 depth levels
- council.md — Multi-agent debate for decisions
- create-skill.md — Create new skills on demand
- telos.md — Life OS, goals, beliefs, lessons
[...existing skills...]
```

Only add these 4 lines. Don't restructure CLAUDE.md.

---

## PART 6: WHAT COMES NEXT (Phase 5 Preview)

Phase 4 gives you four powerful skills. Phase 5 adds The Algorithm — a structured execution engine that classifies task complexity and routes to appropriate capabilities:

- **Trivial** → direct answer
- **Quick** → single skill
- **Standard** → skill + research, parallel agents
- **Thorough** → skill + research + council, multiple agents
- **Determined** → everything, extended thinking, red team

The Algorithm uses an Ideal State Criteria (ISC) framework to define what "done well" looks like for every non-trivial task, then works through each criterion systematically.

Phase 4's skills become the capabilities that Phase 5 orchestrates.
