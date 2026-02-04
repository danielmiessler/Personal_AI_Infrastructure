# AI Genius: Phase 2+ Implementation Roadmap

## Context

Phase 1 (the current transformation-briefing.md) covers:
- Modular skill extraction from CLAUDE.md
- Basic memory system (WIP, learnings, preferences, mistakes)
- Basic hooks (session-start, session-end, feedback capture)
- Context maps and policies
- Challenger protocol

This document plans everything that Phase 1 does NOT cover from PAI.

---

## Priority Framework

Phases are ordered by **value to you first, complexity second**:

| Priority | Principle |
|---|---|
| 1st | Things that make the system smarter without you doing anything |
| 2nd | Things that protect you from AI mistakes |
| 3rd | Things that give you superpowers for specific tasks |
| 4th | Things that make the system observable and debuggable |
| 5th | Things that let the system grow itself |

---

## PHASE 2: Full Hook System

**Why first**: Hooks are where the "smart" behavior lives. They run automatically on every interaction — no manual invocation needed. Phase 1 gives you 3 hooks. PAI has 15. The missing 12 are where the system becomes genuinely self-aware.

**Depends on**: Phase 1 complete (modular structure, basic hooks working)

### 2A: Security Validator Hook (PreToolUse)

**What it does**: Intercepts EVERY tool call (Bash, Edit, Write, Read) before execution. Pattern-matches against a security config. Blocks dangerous commands, prompts for confirmation on risky ones, logs everything.

**Why you need it**: Your launchd scripts run with `--permission-mode bypassPermissions`. One bad prompt could `rm -rf` your vault. This prevents that.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/PreToolUse/SecurityValidator.hook.ts
□ Create AI/hooks/security-validator.ts
  → PreToolUse hook (fires before any tool executes)
  → Reads AI/policies/security-patterns.yaml for rules
  → Exit codes: 0 = allow, 2 = block
  → Returns {"decision": "ask"} for confirmable operations
□ Create AI/policies/security-patterns.yaml:
  bash:
    blocked:
      - pattern: "rm -rf /"
      - pattern: "git push --force"
      - pattern: "git reset --hard"
    confirm:
      - pattern: "rm -rf"
      - pattern: "git push"
      - pattern: "chmod -R"
    alert:
      - pattern: "curl.*| sh"
      - pattern: "eval"
  paths:
    zeroAccess: ["~/.ssh", "~/.aws", "credentials", ".env"]
    readOnly: ["/etc", "/System"]
    confirmWrite: ["CLAUDE.md", ".claude/settings.json"]
    noDelete: ["_System/Databases/", "AI/memory/"]
□ Create AI/memory/security/ directory for audit trail
□ Register hook in .claude/settings.json as PreToolUse matcher
□ Test: try a blocked command, verify it's stopped
□ Git commit: "add: security validator hook with pattern-based rules"
```

### 2B: Format Enforcer Hook (UserPromptSubmit)

**What it does**: Injects a response format reminder into every prompt as a `<system-reminder>`. Prevents format drift in long conversations — Claude tends to get sloppy after 20+ exchanges.

**Why you need it**: Your CLAUDE.md has detailed formatting rules (structured output, British English, no slop). But in long sessions these get lost from the context window. This hook re-injects them every single prompt.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/UserPromptSubmit/FormatEnforcer.hook.ts
□ Create AI/hooks/format-enforcer.ts
  → UserPromptSubmit hook
  → Reads AI/policies/formatting-rules.md (already created in Phase 1)
  → Outputs condensed format reminder as <system-reminder>
  → Skips for subagent contexts
  → Fast — just file read + stdout, no inference
□ Register in .claude/settings.json
□ Test: long conversation, verify formatting stays consistent
□ Git commit: "add: format enforcer hook for consistent output quality"
```

### 2C: Auto-Work Creation Hook (UserPromptSubmit)

**What it does**: Automatically creates a work item in `AI/memory/work/` for every session. Classifies each prompt as work/question/conversational. Tracks what you're doing without you thinking about it.

**Why you need it**: Phase 1's `work/current.md` is updated manually at session end. This makes it automatic and richer — every task gets a directory with metadata.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/UserPromptSubmit/AutoWorkCreation.hook.ts
□ Create AI/hooks/auto-work-creation.ts
  → UserPromptSubmit hook
  → On first prompt of session: create AI/memory/work/{timestamp}_{slug}/
    with META.yaml (status, created_at, effort estimate)
  → On subsequent prompts: add items to the work directory
  → Classify prompt: work | question | conversational
  → Track effort level: trivial | quick | standard | thorough
  → Update AI/memory/work/state.json (current session pointer)
□ Adapt the SESSION_SUMMARY hook from Phase 1 to mark work COMPLETED on session end
□ Register in .claude/settings.json
□ Test: start session, ask something, verify work directory created
□ Git commit: "add: auto-work creation hook for automatic task tracking"
```

### 2D: Implicit Sentiment Capture Hook (UserPromptSubmit)

**What it does**: Detects frustration, satisfaction, or confusion in your messages WITHOUT you giving an explicit rating. Uses a quick inference call to classify your emotional state.

**Why you need it**: You won't rate every interaction 1-10. But if you say "no, that's wrong, do it again" the system should learn. This captures those implicit signals.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/UserPromptSubmit/ImplicitSentimentCapture.hook.ts
□ Create AI/hooks/implicit-sentiment.ts
  → UserPromptSubmit hook
  → Skips if explicit rating was already detected (by on-feedback hook)
  → Uses Haiku inference call to classify sentiment (fast, cheap)
  → Writes to AI/memory/signals/ratings.jsonl with type: "implicit"
  → If inferred rating < 6: creates learning entry with context
  → Fire-and-forget — never blocks
□ Register in .claude/settings.json
□ Test: express frustration, verify implicit signal captured
□ Git commit: "add: implicit sentiment capture for passive learning"
```

### 2E: Session Summary Hook (Stop)

**What it does**: When a session ends, automatically summarizes what happened and updates the work state. Replaces the manual "update WIP at session end" instruction.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/Stop/SessionSummary.hook.ts
□ Enhance AI/hooks/on-session-end.ts (from Phase 1):
  → Mark active work directory as COMPLETED
  → Update META.yaml with completed_at timestamp
  → Clear AI/memory/work/state.json
  → Capture session summary in the work directory
□ Git commit: "enhance: session end hook with auto-summary and work completion"
```

**Phase 2 total: 5 new/enhanced hooks. After this, every interaction is automatically tracked, classified, secured, and quality-controlled.**

---

## PHASE 3: Learning & Synthesis Engine

**Why next**: Hooks capture raw signals. This phase turns raw signals into actionable improvements. The system starts actually getting smarter over time.

**Depends on**: Phase 2 (hooks producing signals in AI/memory/)

### 3A: Learning Pattern Synthesis

**What it does**: Periodically analyzes all captured learnings, ratings, and mistakes. Produces synthesis reports: what's working, what's not, what patterns are emerging.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/TrendingAnalysis.ts
□ Create AI/scripts/learning-synthesis.sh (launchd weekly, Sunday after weekly review)
  → Reads AI/memory/signals/ratings.jsonl (last 7 days)
  → Reads AI/memory/learnings/ (all categories)
  → Claude prompt: "Analyze these signals. What patterns do you see?
     What skills are performing well/poorly? What preferences are
     emerging? What mistakes are repeating?"
  → Writes synthesis to AI/memory/learnings/synthesis/YYYY-WW.md
  → Proposes specific changes to skill files or policies
□ Create launchd plist for weekly schedule
□ Git commit: "add: weekly learning synthesis for self-improvement"
```

### 3B: Skill Auto-Improvement Proposals

**What it does**: Based on synthesis data, the system proposes concrete edits to skill files. You approve or reject. Rejected proposals get logged so it doesn't suggest again.

**Implementation**:
```
□ Create AI/memory/proposals/ directory
□ Enhance learning-synthesis.sh:
  → When a skill consistently rates poorly: generate a proposal
  → Proposal format: {skill, current_behavior, proposed_change, evidence}
  → Write to AI/memory/proposals/pending/YYYY-MM-DD_{skill}.md
  → Notify via Discord webhook: "I have improvement proposals. Review?"
□ Add a review workflow: you say "show proposals" → Claude reads pending/,
  presents them, you approve/reject, approved get applied, rejected get
  moved to AI/memory/proposals/rejected/
□ Git commit: "add: skill improvement proposal system"
```

### 3C: Preference Learning Aggregation

**What it does**: Consolidates scattered preference observations into authoritative preference files that skills read. Instead of each skill guessing your style, they read your verified preferences.

**Implementation**:
```
□ Enhance AI/memory/learnings/preferences.md:
  → Add confidence scores (observed 1x vs observed 10x)
  → Add source tracking (which session, which interaction)
  → Structure by domain (writing, communication, workflow, formatting)
□ Update skill files to reference preferences.md in their context_files
□ Weekly synthesis reviews preferences, promotes high-confidence ones
  to the relevant policy files (e.g., new formatting preference →
  update AI/policies/formatting-rules.md)
□ Git commit: "enhance: structured preference learning with confidence tracking"
```

**Phase 3 total: The system now analyzes its own performance weekly, proposes improvements, and learns your preferences with increasing confidence.**

---

## PHASE 4: Advanced Skills from PAI

**Why now**: The infrastructure is solid (hooks, memory, learning). Now port the skills that give you actual superpowers for specific tasks.

**Depends on**: Phase 1 (skill structure), Phase 2 (hooks), Phase 3 (learning)

### 4A: Research Skill

**What it does**: Multi-source research with 3 depth levels (quick/standard/extensive). Uses your existing MCP servers (Brave Search, Firecrawl, Gemini, Perplexity) as research tools. Produces structured research reports.

**Why valuable**: You already have 6 MCP servers. This skill orchestrates them into a coherent research workflow instead of you manually invoking each one.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-research-skill/
□ Create AI/skills/research.md
  → 3 depth modes: Quick (1 source), Standard (3 sources), Extensive (all sources)
  → Integrates with existing MCP servers: Brave Search, Firecrawl, Perplexity, Gemini
  → Output: structured synthesis, not just raw search results
  → Context map: reads relevant domain context to focus research
  → Stores results in AI/memory/research/ for future reference
□ Create AI/context/research.md (context map — where to store, what to reference)
□ Git commit: "add: research skill with multi-source orchestration"
```

### 4B: Council Skill (Multi-Agent Debate)

**What it does**: For important decisions, spawns 3-5 specialized agents who debate the topic for 3 rounds. Each challenges the others' positions. You get a structured transcript with points of agreement and disagreement.

**Why valuable**: You're strong at synthesis — this gives you pre-digested intellectual friction to synthesize from, instead of a single AI opinion.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-council-skill/
□ Create AI/skills/council.md
  → Trigger: "council:", "debate this", "get multiple perspectives"
  → Round 1: Each agent states position (parallel)
  → Round 2: Agents respond to each other (parallel)
  → Round 3: Convergence — what do they agree on, where do they differ?
  → Output: structured transcript + synthesis + recommendation
  → Agents: Strategist, Devil's Advocate, Pragmatist, Domain Expert (varies)
□ Git commit: "add: council skill for multi-agent debate on decisions"
```

### 4C: CreateSkill Skill (Self-Extending)

**What it does**: The system can propose and create new skills when it detects a pattern of requests that don't map to any existing skill. You approve, it scaffolds the skill file.

**Why valuable**: The system grows organically. If you start asking about a new topic regularly, it creates a skill for it — complete with context maps, policies, and learned preferences.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-createskill-skill/
□ Create AI/skills/create-skill.md
  → Trigger: "create a new skill for...", or auto-detected by weekly synthesis
  → Validates: proper frontmatter, trigger keywords, context map reference
  → Scaffolds: skill file + context map + optional policy file
  → Adds to routing table in CLAUDE.md (or skill registry file)
□ Git commit: "add: create-skill for self-extending capability"
```

### 4D: Telos Skill (Life OS / Goals)

**What it does**: Manages your goals, beliefs, lessons learned, and life areas as structured data. Generates progress reports. Tracks what you believe, what you've learned, what you're working toward.

**Why valuable**: You already have Tracking/Objectives/ and Tracking/Key Results/. This skill connects them into a coherent life operating system with periodic reviews and McKinsey-style progress reports.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-telos-skill/
□ Create AI/skills/telos.md
  → Integrates with existing: Tracking/Objectives/, Tracking/Key Results/,
    Areas/Life Areas/, Projects/GPR/
  → Workflows: Update goals, WriteReport, Review progress
  → Stores personal operating data in AI/My AgentOS/telos/
    (BELIEFS.md, GOALS.md, LESSONS.md, WISDOM.md)
  → Monthly: generates goal progress report
  → Quarterly: proposes goal revisions based on actual progress
□ Create AI/context/goals.md (context map)
□ Git commit: "add: telos skill for life OS and goal management"
```

**Phase 4 total: Four high-value skills that leverage existing infrastructure (MCP servers, vault data, memory system) to give you research, debate, self-extension, and goal management capabilities.**

---

## PHASE 5: The Algorithm (Execution Engine)

**Why later**: This is PAI's most sophisticated feature — a universal problem-solving loop. It's powerful but complex. You need the skill system, hooks, and memory working well before adding this layer.

**Depends on**: All previous phases

### 5A: Ideal State Criteria (ISC) Framework

**What it does**: For every non-trivial task, the system defines what "ideal" looks like as a table of criteria. Then it works through each criterion systematically, tracking progress.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-algorithm-skill/
□ Create AI/skills/algorithm.md
  → 7-phase execution: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
  → ISC table: What Ideal Looks Like | Source | Capability | Status
  → Effort classification: TRIVIAL → QUICK → STANDARD → THOROUGH → DETERMINED
  → Higher effort = more capabilities unlocked (parallel agents, research, debate)
□ Create AI/policies/algorithm-protocol.md
  → When to invoke: non-trivial tasks (user can say "use the algorithm")
  → Effort classification rules
  → Which capabilities unlock at which effort level
□ Git commit: "add: the algorithm execution engine with ISC tracking"
```

### 5B: Effort-Based Capability Routing

**What it does**: Classifies task complexity, then unlocks appropriate tools. A trivial task gets a direct answer. A thorough task gets research, council debate, and parallel execution.

**Implementation**:
```
□ Create AI/policies/effort-classification.yaml:
  trivial:  → direct answer, no tools
  quick:    → single skill, haiku model
  standard: → skill + research, sonnet model, 1-3 parallel agents
  thorough: → skill + research + council, opus model, 3-5 parallel agents
  determined: → everything, extended thinking, red team
□ Integrate with algorithm skill: auto-classify, auto-route
□ Git commit: "add: effort-based capability routing"
```

**Phase 5 total: The system now has a structured problem-solving methodology that scales its effort to match task complexity.**

---

## PHASE 6: Observability & Monitoring

**Why last**: Not a user-facing feature — it's a debugging and insight tool. Valuable once the system is complex enough to need monitoring.

**Depends on**: Phase 2 (hooks generating events to observe)

### 6A: Event Logging

**What it does**: All hook events, tool calls, and agent actions are logged to JSONL files. Structured, searchable, append-only.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-observability-server/src/
□ Create AI/hooks/agent-output-capture.ts (PostToolUse hook)
  → Logs every tool call and result to AI/memory/history/YYYY-MM-DD.jsonl
  → Fire-and-forget, never blocks
□ This feeds into weekly learning synthesis (Phase 3)
□ Git commit: "add: event logging hook for observability"
```

### 6B: Dashboard (Optional)

**What it does**: Real-time web dashboard showing what the system is doing. Swim lanes for parallel agents, event timeline, performance metrics.

**Implementation**:
```
□ Read PAI reference: ~/PAI-reference/Packs/pai-observability-server/
□ Adapt: Bun HTTP + WebSocket server on Mac Mini
  → Reads JSONL event files
  → Streams to Vue dashboard
  → Accessible via Tailscale from any device
□ This is optional — the event logs alone are useful without a dashboard
□ Git commit: "add: observability dashboard"
```

**Phase 6 total: Full visibility into what the system is doing, when, and how well.**

---

## PHASE SUMMARY

| Phase | What | Key Outcome | Depends On |
|---|---|---|---|
| **1** (current) | Modular structure, basic hooks, memory | System works modularly | Nothing |
| **2** | Full hook system (security, format, work tracking, sentiment) | Every interaction auto-tracked and protected | Phase 1 |
| **3** | Learning synthesis, improvement proposals, preference aggregation | System gets measurably smarter over time | Phase 2 |
| **4** | Research, Council, CreateSkill, Telos | Superpowers for specific tasks | Phases 1-3 |
| **5** | The Algorithm, ISC, effort routing | Structured problem-solving at any scale | Phases 1-4 |
| **6** | Event logging, dashboard | Full observability | Phase 2 |

### Execution Notes

- **Each phase is independently valuable**. You don't need Phase 6 for Phase 2 to work. Stop at any phase and have a better system than before.
- **Phases 2 and 3 are the highest ROI**. Hooks + learning give you an auto-improving system with minimal effort from you.
- **Phase 4 skills can be done in any order** or partially. Research and Council are the most valuable. CreateSkill and Telos are nice-to-have.
- **Phase 5 (Algorithm) is optional power**. It's PAI's most complex feature. Skip it unless you find yourself regularly working on thorough/determined-level tasks.
- **Phase 6 is for debugging**. Add it when the system is complex enough that you can't tell what's happening by reading log files.
- **For each phase**: create the briefing by reading the transformation plan + the relevant PAI reference files, then hand it to a Claude Code instance in your vault. Same pattern as Phase 1.
