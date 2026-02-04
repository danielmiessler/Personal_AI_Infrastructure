# Phase 5: The Algorithm (Execution Engine) — Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for **Phase 5** of the AI Genius transformation. Phases 1–4 are complete and merged to main.

**Reference repo**: `~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ` — clone of Daniel Messler's PAI. Read files there for implementation patterns. Adapt, don't copy.

**Safety rule**: After EVERY sub-step (5A through 5D), commit to git with a descriptive message. If anything breaks, `git revert` that commit.

---

## PART 1: CURRENT STATE AFTER PHASE 4

### What Exists

Phases 1–4 built the full modular architecture, hook system, learning engine, and advanced skills.

```
AI/
├── skills/               # 23 original + review-proposals + research + council
│                         #   + create-skill + telos = ~28 skills
├── context/              # 7 original + research + goals = ~9 context maps
├── policies/             # 8 + security-patterns.yaml
├── telos/                # beliefs, lessons, wisdom, predictions
├── memory/
│   ├── work/             # Auto-tracked sessions
│   ├── learnings/        # Preferences, mistakes, execution, synthesis/
│   ├── proposals/        # Pending, approved, rejected
│   ├── signals/ratings.jsonl
│   ├── security/
│   ├── research/         # Research outputs from Phase 4
│   └── context-log.md
├── hooks/                # 7 hooks
└── scripts/              # 5 original + learning-synthesis.sh
```

### What Phase 5 Adds

The Algorithm is an execution framework that sits ABOVE individual skills. It:
1. Classifies task effort (trivial → determined)
2. Defines what "done well" looks like (ISC — Ideal State Criteria)
3. Routes to appropriate capabilities based on effort level
4. Executes systematically through 7 phases
5. Verifies results with a skeptical agent
6. Learns from the outcome

Think of it as: skills are employees, The Algorithm is the project management methodology.

### What Phase 5 Does NOT Need

PAI's Algorithm is deeply integrated with custom TypeScript tools (ISCManager.ts, EffortClassifier.ts, etc.) and a voice server. This vault doesn't have those systems. Phase 5 adapts the Algorithm's **methodology** as a skill + policy, not as a TypeScript tool chain. The ISC is maintained as Markdown (readable in Obsidian), not JSON managed by CLI tools.

---

## PART 2: PAI REFERENCE FILES

Read these to understand the full Algorithm before simplifying:

### Core Skill Definition
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/SKILL.md
```

### Phase Definitions (read all 7)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Observe.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Think.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Plan.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Build.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Execute.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Verify.md
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Learn.md
```

### ISC Format Reference
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Reference/ISCFormat.md
```

### Tools (read for logic, not to port directly)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/EffortClassifier.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/CapabilitySelector.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/TraitModifiers.ts
```

---

## PART 3: IMPLEMENTATION STEPS

### Constraints

**DO NOT TOUCH**:
- Existing skills, hooks, policies, memory structure
- Vault folder structure, .base files, tools
- CLAUDE.md (unless adding algorithm routing reference)

**DESIGN PRINCIPLES**:
- The Algorithm is a **skill + policy**, not a TypeScript tool chain
- ISC is **Markdown**, not JSON managed by CLI tools
- Keep it simple enough that Claude can execute it without custom tooling
- The user can say "use the algorithm" to invoke it, or it auto-activates for non-trivial tasks

---

### Step 5A: Effort Classification Policy

**What it does**: Defines how to classify task effort. This determines what capabilities are available and how much rigour to apply. Every non-trivial request gets classified.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/EffortClassifier.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/TraitModifiers.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Tools/CapabilitySelector.ts

□ Create AI/policies/effort-classification.md:

  # Effort Classification

  Every non-trivial request is classified into an effort level.
  Effort determines which capabilities are available, how many iterations
  are allowed, and whether parallel agents are used.

  ## Effort Levels

  ### TRIVIAL
  **Trigger**: greetings, yes/no questions, acknowledgements, single-word responses
  **Response**: Direct answer. No ISC. No skill routing overhead.
  **Examples**: "hello", "thanks", "yes", "ok", "what time is it?"

  ### QUICK
  **Trigger**: Simple tasks, ≤15 words, single-step actions, low complexity
  **Capabilities**: Single skill, no parallel agents, 1 iteration max
  **Model**: Default (sonnet)
  **Examples**: "translate this to Polish", "what's on my calendar today",
    "fix the typo in X", "rename this file"

  ### STANDARD (default for most work)
  **Trigger**: Multi-step tasks, requires context, moderate complexity
  **Capabilities**: Skill + research (standard depth), 1-3 parallel agents, 2 iterations
  **Model**: Default (sonnet)
  **ISC**: 5-15 rows
  **Examples**: "draft a newsletter issue", "review this business proposal",
    "plan next week's content", "analyse this investment opportunity"

  ### THOROUGH
  **Trigger**: Complex tasks, explicit request for depth, strategic decisions,
    multi-domain work, architecture, refactoring
  **Capabilities**: Skill + research (extensive) + council debate, 3-5 parallel agents,
    3-5 iterations
  **Model**: Default (sonnet) with deep thinking
  **ISC**: 15-50 rows
  **Examples**: "redesign the newsletter strategy", "evaluate whether to pivot the business",
    "thorough research on X", "create a comprehensive plan for Y"

  ### DETERMINED
  **Trigger**: Explicit keywords ("until done", "keep going", "don't stop until",
    "walk away and come back to results"), mission-critical tasks
  **Capabilities**: Everything — research (extensive), council, all skills,
    unlimited iterations, 10+ parallel agents
  **Model**: Best available (opus if accessible)
  **ISC**: 50+ rows
  **Examples**: "until all tests pass", "keep iterating until this is production-ready",
    "comprehensive due diligence on this acquisition"

  ## Override
  The user can explicitly set effort:
  - "algorithm effort THOROUGH: [task]"
  - "use thorough effort for this"
  - "this is a quick one"

  ## Auto-Classification Signals
  - Word count: ≤15 words → likely QUICK
  - Complexity keywords: "refactor", "redesign", "architecture", "strategy" → THOROUGH+
  - Persistence keywords: "until done", "keep going" → DETERMINED
  - Multi-domain: touches 2+ context maps → STANDARD+
  - Explicit depth: "thorough", "comprehensive", "extensive" → THOROUGH

  ## Display
  When effort is classified, briefly state it:
  "Effort: STANDARD — using research + newsletter skill, 2 iterations max."
  Only state this for STANDARD and above. TRIVIAL and QUICK are silent.

□ Git commit: "add: effort classification policy for capability routing"
```

---

### Step 5B: The Algorithm Skill

**What it does**: The core execution methodology. Seven phases: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN. Uses an ISC (Ideal State Criteria) table to track what "done well" looks like.

**Implementation**:

```
□ Read PAI references (all 7 phase files + SKILL.md + ISCFormat.md)

□ Create AI/skills/algorithm.md:
  ---
  name: The Algorithm
  triggers: ["use the algorithm", "algorithm:", "algorithm effort",
             "structured execution", "ISC", "ideal state"]
  context_files: []
  policies:
    - effort-classification
    - challenger-protocol
  voice: "Systematic, methodical. Report progress by phase.
          Be transparent about what's been done and what remains."
  ---

  # The Algorithm — Structured Execution Engine

  ## When to Activate

  Explicitly:
  - User says "use the algorithm" or "algorithm effort [LEVEL]: [task]"
  - User says "ISC" or "ideal state"

  Implicitly (auto-activate for STANDARD+ effort):
  - When effort classification is STANDARD or above AND the task is non-trivial
  - Do NOT auto-activate for TRIVIAL or QUICK tasks

  When NOT auto-activated, still follow the effort classification policy
  for capability routing. The Algorithm adds the ISC discipline on top.

  ## The ISC (Ideal State Criteria)

  The ISC is a Markdown table that defines what "done well" looks like.
  It is THE central artifact of The Algorithm. Every phase mutates the ISC.

  ### ISC Format

  ```markdown
  ## ISC: [One-line summary of the request]
  **Effort:** [LEVEL] | **Phase:** [CURRENT PHASE] | **Iteration:** [N]

  | # | What Ideal Looks Like | Source | Capability | Status |
  |---|---|---|---|---|
  | 1 | [Success criterion] | EXPLICIT | [skill/tool] | PENDING |
  | 2 | [Inferred requirement] | INFERRED | [skill/tool] | PENDING |
  | 3 | [Universal standard] | IMPLICIT | [verification] | PENDING |
  ```

  ### Source Types
  - **EXPLICIT**: User literally asked for this
  - **INFERRED**: Derived from context (e.g., user's tech stack, preferences, domain)
  - **IMPLICIT**: Universal quality standards (no errors, consistent formatting,
    follows existing patterns)
  - **RESEARCH**: Discovered during research phase

  ### Status Lifecycle
  PENDING → ACTIVE → DONE / ADJUSTED / BLOCKED

  - **PENDING**: Not started
  - **ACTIVE**: Currently being worked on
  - **DONE**: Completed and verified
  - **ADJUSTED**: Completed with acceptable deviation (note why)
  - **BLOCKED**: Cannot complete (note blocker)

  ### ISC Size by Effort
  - QUICK: No ISC (too lightweight)
  - STANDARD: 5-15 rows
  - THOROUGH: 15-50 rows
  - DETERMINED: 50+ rows (no limit)

  ## The 7 Phases

  ### Phase 1: OBSERVE
  **Goal**: Understand the request. Create the ISC.
  **Actions**:
  1. Read the user's request carefully
  2. Load relevant context (context maps, memory, preferences)
  3. Create ISC rows:
     - EXPLICIT rows: what the user literally asked for
     - INFERRED rows: what context implies (preferences, patterns, tech stack)
     - IMPLICIT rows: universal standards (no errors, consistent style,
       follows existing vault patterns, tests pass)
  4. If the request is unclear, ask up to 5 clarifying questions:
     - What does success look like when this is done?
     - Who will use this and what will they do with it?
     - What existing thing is this most similar to?
     - What should this definitely NOT do?
     - (Only ask what's genuinely unclear — don't interrogate for simple tasks)

  **Gate**: Do I have at least 2 ISC rows? Did I use context to infer beyond the literal request?

  **Show the ISC table to the user after OBSERVE.**

  ### Phase 2: THINK
  **Goal**: Ensure nothing is missing. Challenge assumptions.
  **Actions**:
  1. Review all ISC rows for completeness
  2. Check for gaps: security, error handling, edge cases, formatting
  3. Consider: what could go wrong? What's the user NOT thinking about?
  4. Invoke challenger protocol: is there a better approach?
  5. For THOROUGH+: use extended thinking or council skill
  6. Add any new rows discovered

  **Gate**: All rows are clear and testable? No obvious gaps?

  ### Phase 3: PLAN
  **Goal**: Sequence the work. Identify what can run in parallel.
  **Actions**:
  1. Identify dependencies between rows (what must happen before what?)
  2. Mark rows that can execute in parallel (no dependencies, no shared files)
  3. Group into execution phases:
     - Phase A: Research (gather information needed)
     - Phase B: Thinking (analysis, strategy, decisions)
     - Phase C: Execution (do the actual work)
     - Phase D: Verification (test results)
  4. Assign capabilities to each row:
     - Research skill for research rows
     - Relevant domain skill for execution rows
     - Council for debate/decision rows

  **Gate**: Dependencies mapped? Execution sequence clear?

  ### Phase 4: BUILD
  **Goal**: Make each ISC row testable. Define success criteria.
  **Actions**:
  1. For each row: how will we know it's DONE?
  2. Refine vague descriptions:
     - "Works well" → specific measurable criterion
     - "Looks good" → matches existing style, follows formatting policy
     - "Is complete" → all sub-items enumerated
  3. Define verification method for each row:
     - Read the output and check
     - Run a test/command
     - Compare against a reference
     - Ask the user to confirm

  **Gate**: Every row has a specific, verifiable success criterion?

  ### Phase 5: EXECUTE
  **Goal**: Do the work. Update ISC status as you go.
  **Actions**:
  1. Work through rows in the planned sequence
  2. For parallel rows: use the Task tool to run multiple agents simultaneously
  3. Update status: PENDING → ACTIVE → DONE (as each completes)
  4. If a row hits a blocker: mark BLOCKED, note the blocker, continue with other rows
  5. If a row needs adjustment: mark ADJUSTED, note the deviation

  **Capability routing by effort**:
  - STANDARD: single skill, sequential or 1-3 parallel agents
  - THOROUGH: multiple skills, research + execution, 3-5 parallel agents
  - DETERMINED: everything available, 10+ parallel agents

  **Gate**: Every row has a final status (DONE, ADJUSTED, or BLOCKED)?

  ### Phase 6: VERIFY
  **Goal**: Test results with a skeptical eye. Don't trust your own work blindly.
  **Actions**:
  1. For each DONE row: verify against the success criterion from BUILD phase
  2. Be genuinely skeptical — try to find problems, don't just confirm
  3. Run tests, read outputs, check formatting, verify links
  4. If verification fails: mark row back to ACTIVE or BLOCKED
  5. For THOROUGH+: use a separate verification pass (re-read with fresh eyes)

  **Results**:
  - PASS → row stays DONE
  - ADJUSTED → acceptable deviation, note why
  - BLOCKED → issue found, needs iteration

  **Gate**: All DONE rows verified? All BLOCKED rows noted?

  ### Phase 7: LEARN
  **Goal**: Capture what happened. Let the user rate the result.
  **Actions**:
  1. Show the final ISC table with all statuses
  2. Present deliverables to the user
  3. Note what worked well and what didn't
  4. Do NOT self-rate — let the user provide a rating (captured by feedback hook)
  5. If BLOCKED rows exist: explain what's needed to unblock
  6. Suggest whether to iterate (go back to an earlier phase) or ship as-is

  **Iteration logic** (when BLOCKED rows exist):
  - Execution problem → loop back to EXECUTE
  - Planning problem → loop back to PLAN
  - Requirements problem → loop back to THINK or OBSERVE
  - Iteration count bounded by effort level:
    STANDARD: 2 iterations max
    THOROUGH: 3-5 iterations
    DETERMINED: unlimited

  ## ISC Storage

  Save the ISC to AI/memory/work/{current-session-dir}/ISC.md
  This is automatically created by the auto-work hook (Phase 2).
  The ISC persists within the session and is readable in Obsidian.

  ## Example: Algorithm in Action

  User: "Draft this week's newsletter about AI agents"
  Effort: STANDARD (multi-step, needs context + research + writing)

  OBSERVE → Creates ISC:
  | # | What Ideal Looks Like | Source | Capability | Status |
  |---|---|---|---|---|
  | 1 | Topic covers AI agents with fresh angle | EXPLICIT | research | PENDING |
  | 2 | 3-5 key insights, not obvious takes | EXPLICIT | research | PENDING |
  | 3 | Matches AI Equilibrium voice and format | INFERRED | newsletter skill | PENDING |
  | 4 | Includes 2-3 actionable takeaways for readers | INFERRED | newsletter skill | PENDING |
  | 5 | Cross-links to relevant vault notes | IMPLICIT | linking rules | PENDING |
  | 6 | British English, no slop, no emojis | IMPLICIT | formatting policy | PENDING |
  | 7 | Draft saved to Content/AI Equilibrium/ | IMPLICIT | vault structure | PENDING |

  THINK → Adds row 8: "References recent AI agent news (last 7 days)"
  PLAN → Research first (rows 1,2,8 parallel), then writing (rows 3,4,5,6,7 sequential)
  BUILD → Refines "fresh angle" to "angle not covered by top 5 AI newsletters this week"
  EXECUTE → Runs research skill, then newsletter skill with findings
  VERIFY → Checks format, voice, links, British English
  LEARN → Presents draft, shows ISC, awaits user rating

□ Create AI/memory/work/ISC-TEMPLATE.md:
  ## ISC: [Request Summary]
  **Effort:** [LEVEL] | **Phase:** [PHASE] | **Iteration:** 1

  | # | What Ideal Looks Like | Source | Capability | Status |
  |---|---|---|---|---|

  _Created by The Algorithm. Updated through execution phases._

□ Test:
  → "algorithm effort STANDARD: draft this week's newsletter about AI agents"
    → Verify: ISC created with 5-15 rows
    → Verify: phases execute in order
    → Verify: ISC status updates as work progresses
    → Verify: final ISC shown with all statuses
  → "use the algorithm: redesign my morning routine" (STANDARD)
    → Verify: reads health context, telos goals, creates ISC
  → Simple request without "algorithm": "what's on my calendar?"
    → Verify: does NOT invoke algorithm (TRIVIAL/QUICK)

□ Git commit: "add: the algorithm skill with ISC-based structured execution"
```

---

### Step 5C: Algorithm Protocol Policy

**What it does**: Defines when The Algorithm activates, how effort maps to capabilities, and the rules for ISC management. Referenced by the algorithm skill and by CLAUDE.md for automatic activation on STANDARD+ tasks.

**Implementation**:

```
□ Create AI/policies/algorithm-protocol.md:

  # Algorithm Protocol

  ## When The Algorithm Activates

  ### Explicit Activation
  User says: "use the algorithm", "algorithm:", "algorithm effort [LEVEL]:", "ISC"
  → Always activate. Use the specified effort level, or classify if not specified.

  ### Implicit Activation
  Task is classified as STANDARD or higher effort AND is non-trivial.
  → Activate The Algorithm automatically.
  → State: "This looks like a STANDARD task. Using The Algorithm."

  ### Never Activate
  - TRIVIAL tasks (greetings, acknowledgements)
  - QUICK tasks (single-step, simple actions)
  - When user says "just do it", "skip the algorithm", "no need for ISC"

  ## Capability Routing Matrix

  | Effort | Skills | Research | Council | Parallel Agents | Iterations | ISC Rows |
  |---|---|---|---|---|---|---|
  | QUICK | 1 skill | none | none | 1 | 1 | none |
  | STANDARD | 1-2 skills | standard | none | 1-3 | 2 | 5-15 |
  | THOROUGH | any skills | extensive | yes | 3-5 | 3-5 | 15-50 |
  | DETERMINED | everything | extensive | yes + red team | 10+ | unlimited | 50+ |

  ## ISC Rules

  1. **ISC is shown to the user** after OBSERVE phase. User can modify before proceeding.
  2. **ISC rows are never deleted** — only status changes. This preserves the audit trail.
  3. **ADJUSTED is acceptable** — not everything needs to be perfectly DONE.
     Document the deviation.
  4. **BLOCKED rows require a decision**: iterate, skip, or escalate to user.
  5. **ISC is saved** to the current work directory (AI/memory/work/{session}/ISC.md).
  6. **Verification is skeptical** — don't just confirm your own work.
     Re-read outputs, check for errors, verify against criteria.

  ## Phase Transition Rules

  - Never skip phases (OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN)
  - Each phase has a gate question. Don't proceed until the gate is satisfied.
  - For QUICK tasks that don't use the algorithm: just execute directly.
  - For STANDARD: phases can be lightweight (2-3 sentences each for THINK/PLAN/BUILD)
  - For THOROUGH/DETERMINED: phases should be substantive

  ## Iteration Rules

  When VERIFY finds issues:
  - Execution error → loop to EXECUTE (try a different approach)
  - Planning error → loop to PLAN (resequence or reassign capabilities)
  - Requirements error → loop to THINK or OBSERVE (clarify with user)
  - Each loop increments the iteration counter
  - At max iterations for effort level: present results as-is, note what's unresolved

  ## Integration with Existing Skills

  The Algorithm does NOT replace skills. It orchestrates them:
  - OBSERVE reads context maps to understand the domain
  - PLAN assigns capabilities (research skill, newsletter skill, council, etc.)
  - EXECUTE invokes those skills
  - VERIFY checks the output against ISC criteria
  - LEARN feeds into the memory/learning system (Phase 3)

  The Algorithm also works with:
  - Challenger protocol (during THINK phase)
  - Preferences (loaded during OBSERVE from memory)
  - Mistake patterns (checked during THINK — don't repeat known mistakes)

□ Git commit: "add: algorithm protocol policy for activation and routing rules"
```

---

### Step 5D: CLAUDE.md Integration

**What it does**: Updates CLAUDE.md to reference effort classification and The Algorithm for automatic activation on non-trivial tasks.

**Implementation**:

```
□ Read current CLAUDE.md

□ Add to CLAUDE.md's universal rules section (keep it brief — 5-10 lines):

  ## Effort & Execution
  - Classify every request by effort level (see AI/policies/effort-classification.md)
  - TRIVIAL/QUICK: execute directly via the matching skill
  - STANDARD and above: use The Algorithm (AI/skills/algorithm.md)
    — create an ISC, work through 7 phases, verify results
  - User can override: "algorithm effort THOROUGH: [task]" or "skip the algorithm"
  - Route capabilities based on effort level (see AI/policies/algorithm-protocol.md)

□ Do NOT restructure or rewrite CLAUDE.md. Just add the above block.

□ Test:
  → Simple request: "what's on my calendar?" → TRIVIAL, no algorithm
  → Medium request: "draft a newsletter issue" → STANDARD, algorithm activates,
    ISC created, phases execute
  → Complex request: "algorithm effort THOROUGH: redesign my content strategy"
    → THOROUGH, full algorithm with council and research
  → Override: "just translate this, skip the algorithm" → executes directly

□ Git commit: "integrate: add effort classification and algorithm routing to CLAUDE.md"
```

---

## PART 4: MANUAL TESTING CHECKLIST

```
□ Test 1: Effort Classification — TRIVIAL
  → "hello" → no algorithm, no ISC, direct response
  → Verify: no effort classification displayed

□ Test 2: Effort Classification — QUICK
  → "translate 'good morning' to Polish" → no algorithm, routes to translator skill
  → Verify: no ISC, direct execution

□ Test 3: Effort Classification — STANDARD (auto-algorithm)
  → "draft this week's newsletter about personal AI assistants"
  → Verify: effort stated as STANDARD
  → Verify: ISC created with 5-15 rows
  → Verify: ISC shown to user after OBSERVE
  → Verify: phases execute in order
  → Verify: final ISC with statuses shown

□ Test 4: Effort Classification — THOROUGH (explicit)
  → "algorithm effort THOROUGH: evaluate whether I should start a YouTube channel"
  → Verify: effort stated as THOROUGH
  → Verify: research skill invoked (extensive)
  → Verify: council debate invoked
  → Verify: ISC with 15+ rows
  → Verify: multiple iterations if needed

□ Test 5: Override — Skip
  → "just do it, skip the algorithm: draft a quick email to John"
  → Verify: no ISC, direct execution via communication skill

□ Test 6: ISC Persistence
  → Start a STANDARD algorithm task
  → Verify: ISC saved to AI/memory/work/{session}/ISC.md
  → Verify: ISC readable in Obsidian

□ Test 7: Iteration
  → Start a task where VERIFY finds an issue
  → Verify: iteration back to appropriate phase
  → Verify: iteration counter increments
  → Verify: at max iterations, results presented as-is

□ Test 8: Cross-Skill Integration
  → "algorithm effort STANDARD: research AI agent frameworks and recommend one for my setup"
  → Verify: PLAN assigns research skill for gathering, then analysis
  → Verify: research skill actually executes within the algorithm
  → Verify: results feed back into ISC status updates
```

---

## PART 5: WHAT THE ALGORITHM LOOKS LIKE IN PRACTICE

Here's what a STANDARD interaction looks like end-to-end:

```
User: "Help me plan next month's newsletter topics"

Claude: Effort: STANDARD — using The Algorithm with newsletter + research skills.

**OBSERVE** — Creating ISC:

## ISC: Plan next month's newsletter topics
**Effort:** STANDARD | **Phase:** OBSERVE | **Iteration:** 1

| # | What Ideal Looks Like | Source | Capability | Status |
|---|---|---|---|---|
| 1 | 4 newsletter topics identified (one per week) | EXPLICIT | research | PENDING |
| 2 | Each topic has a unique angle not covered by competitors | EXPLICIT | research | PENDING |
| 3 | Topics align with AI Equilibrium brand voice | INFERRED | newsletter skill | PENDING |
| 4 | Topics connect to current AI industry trends | INFERRED | research | PENDING |
| 5 | At least 1 topic connects to user's business interests | INFERRED | business context | PENDING |
| 6 | Draft outline for each topic (3-5 bullet points) | INFERRED | newsletter skill | PENDING |
| 7 | Topics saved to Content/AI Equilibrium/ | IMPLICIT | vault structure | PENDING |

Does this ISC look right? Want to adjust before I proceed?

[User confirms or adjusts]

**THINK** — Checking for gaps...
Added row 8: "Topics shouldn't overlap with last 4 published issues"
All rows clear and testable.

**PLAN** — Sequencing:
Phase A (Research): rows 1, 2, 4, 8 in parallel — research trends + competitor analysis
Phase B (Execution): rows 3, 5, 6 sequential — apply brand voice, connect to business, outline
Phase C (Verification): row 7 — save to vault

**BUILD** — Refining success criteria:
Row 2 refined: "Angle not found in first page of results for 'AI newsletter topics January 2026'"
Row 5 refined: "Connects to at least one active GPR project or business area"

**EXECUTE** — Working...
[Research skill runs, newsletter skill applies findings, outlines drafted]
[ISC statuses update to DONE as each completes]

**VERIFY** — Checking results...
All 8 rows verified. Row 5 marked ADJUSTED (connects to investing area, not a GPR project).

**LEARN** — Here are your 4 newsletter topics with outlines:
[Presents results + final ISC table]
```

---

## PART 6: WHAT COMES NEXT (Phase 6 Preview)

Phase 6 adds observability — event logging for every tool call and hook execution, with an optional web dashboard. This is useful for debugging complex Algorithm executions and understanding system behaviour over time. It's the final phase and entirely optional.
