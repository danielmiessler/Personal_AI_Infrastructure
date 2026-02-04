# Phase 3: Learning & Synthesis Engine — Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for **Phase 3** of the AI Genius transformation. Phases 1 and 2 are complete and merged to main.

**Reference repo**: `~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ` — clone of Daniel Messler's PAI. Read files there for implementation patterns. Adapt, don't copy.

**Safety rule**: After EVERY sub-step (3A through 3E), commit to git with a descriptive message. If anything breaks, `git revert` that commit.

---

## PART 1: CURRENT STATE AFTER PHASE 2

### What Exists

Phase 1 created the modular architecture. Phase 2 added the full hook system. Here's the current state:

```
AI/
├── skills/             # 23 skill files with YAML frontmatter
├── context/            # 7 domain context maps
├── policies/           # 8 policy files + security-patterns.yaml
├── memory/
│   ├── work/
│   │   ├── current.md          # WIP tracking (updated by hooks)
│   │   ├── state.json          # Active session pointer
│   │   └── YYYY-MM-DD_slug/    # Per-session work directories
│   │       └── META.yaml       # Status, timestamps, effort, prompt count
│   ├── learnings/
│   │   ├── preferences.md      # User style preferences
│   │   ├── mistakes.md         # Errors to avoid
│   │   └── execution.md        # Task approach learnings
│   ├── signals/
│   │   └── ratings.jsonl       # Explicit + implicit quality ratings
│   ├── security/               # Security validator audit trail
│   │   └── YYYY-MM-DD.jsonl
│   └── context-log.md          # Current situation, priorities, pipeline
├── hooks/
│   ├── on-session-start.ts     # Context injection (first-prompt-only guard)
│   ├── on-session-end.ts       # Session end + work completion tracking
│   ├── on-feedback.ts          # Explicit rating capture (1-10)
│   ├── security-validator.ts   # PreToolUse security checks
│   ├── format-enforcer.ts      # Format reminder injection
│   ├── auto-work-creation.ts   # Automatic work directory + META.yaml
│   ├── implicit-sentiment.ts   # Passive frustration/satisfaction detection
│   └── lib/
│       └── paths.ts            # Shared path utilities
└── scripts/                    # 5 launchd scripts (memory-aware)
```

### What Phase 2 Produces (Raw Signals)

Phase 2 hooks generate these data streams. Phase 3 turns them into actionable improvements:

| Signal Source | Location | Format | Contents |
|---|---|---|---|
| Explicit ratings | `signals/ratings.jsonl` | JSONL | `{timestamp, type:"explicit", rating:1-10, comment}` |
| Implicit sentiment | `signals/ratings.jsonl` | JSONL | `{timestamp, type:"implicit", rating:1-10, sentiment, confidence, trigger}` |
| Work sessions | `work/YYYY-MM-DD_slug/META.yaml` | YAML | Status, effort, prompt count, duration |
| Mistakes | `learnings/mistakes.md` | Markdown | Errors captured from low ratings |
| Execution patterns | `learnings/execution.md` | Markdown | Task approach observations |
| Preferences | `learnings/preferences.md` | Markdown | Style and behavior preferences |
| Security events | `security/YYYY-MM-DD.jsonl` | JSONL | Tool call decisions + audit trail |

### Lessons Learned from Phase 1 & 2

- **Hook format**: `"matcher": ""` (empty string, not object) for non-tool-specific hooks
- **Content injection**: Only UserPromptSubmit hooks inject into Claude's context (as `<system-reminder>`)
- **SessionStart/Stop**: Fire-and-forget only — stdout not passed to conversation
- **Bun runtime**: All hooks use `bun run` — fast TypeScript execution
- **Exit 0 always**: Hooks must never crash or block Claude Code
- **`.claude/` is gitignored**: settings.json lives only locally, document changes in `AI/hooks/README.md`

---

## PART 2: PAI REFERENCE FILES

Read these before implementing each step:

### Learning Utilities
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/learning-utils.ts
```
- Categorization logic for learnings (SYSTEM vs ALGORITHM)
- Determines if a response represents a "learning moment" via indicator patterns

### Work Completion Learning
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/WorkCompletionLearning.hook.ts
```
- Bridges WORK/ to LEARNING/ at session end
- Captures files changed, tools used, agents spawned
- Creates structured learning files with ideal state criteria
- Categorizes as SYSTEM (tooling) or ALGORITHM (execution)

### Implicit Sentiment (for coordination patterns)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/ImplicitSentimentCapture.hook.ts
```
- Shows how PAI uses Sonnet inference for sentiment analysis
- Useful for understanding the analysis depth possible with inference calls

### Explicit Rating Capture (for TrendingAnalysis integration)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/ExplicitRatingCapture.hook.ts
```
- Triggers TrendingAnalysis update on rating capture
- Shows the pattern for reactive analysis

### Ideal State Management
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/IdealState.ts
```
- Tracks dimensions of success (Functional, Quality, Scope, Implicit, Verification)
- Supports fidelity scoring
- Achievement tracking with evidence — useful patterns for proposal tracking

### Algorithm Phases — Learn
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-algorithm-skill/src/skills/THEALGORITHM/Phases/Learn.md
```
- LEARN phase: documents capability usage and performance
- Tracks iteration decisions — useful for the synthesis analysis pattern

### Telos (for goals integration)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-telos-skill/src/Tools/UpdateTelos.ts
```
- Integrates learning data into visual dashboards
- Pattern for synthesizing learnings into actionable views

---

## PART 3: IMPLEMENTATION STEPS

### Constraints

**DO NOT TOUCH**:
- Vault folder structure (Areas/, Projects/, Notes/, Content/, etc.)
- All 24 .base database files
- eventkit-cli, mail-cli, afk-code
- Obsidian plugins
- Existing working hooks from Phase 1 & 2 (unless explicitly enhancing)
- CLAUDE.md (unless adding a reference to new capabilities)

**ALWAYS**:
- Git commit after every sub-step (3A through 3E)
- Test each script/feature individually before moving on
- Use `bun run` for TypeScript, `bash` for shell scripts
- Write results as Markdown files (readable in Obsidian)

---

### Step 3A: Learning Pattern Synthesis Script

**What it does**: A weekly script that analyzes all captured signals (ratings, sentiment, work sessions, mistakes, execution patterns) and produces a synthesis report. Identifies what's working, what's not, and what patterns are emerging.

**Why critical**: Without synthesis, raw signals just accumulate forever. This is the step where the system actually "thinks about its own performance."

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/learning-utils.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/WorkCompletionLearning.hook.ts

□ Create directory: AI/memory/learnings/synthesis/

□ Create AI/scripts/learning-synthesis.sh:
  → Scheduled: Sunday after weekly-review.sh (e.g., 11:00 AM Sunday)
  → Uses: claude -p --permission-mode bypassPermissions --model sonnet
  → Claude prompt includes:

    "You are the LifeOS learning synthesis engine. Analyze the following data
     from the past 7 days and produce a structured synthesis report.

     DATA SOURCES TO READ:
     1. AI/memory/signals/ratings.jsonl — filter to last 7 days
        Count: total ratings, explicit vs implicit, average score, trend
     2. AI/memory/learnings/mistakes.md — any new entries this week
     3. AI/memory/learnings/execution.md — any new entries this week
     4. AI/memory/learnings/preferences.md — any new entries this week
     5. AI/memory/work/ — scan work directories from last 7 days
        Analyze: effort distribution, completion rates, session durations
     6. AI/memory/security/ — scan security logs from last 7 days
        Analyze: any blocked/confirmed events, patterns

     PRODUCE:
     A synthesis report saved to AI/memory/learnings/synthesis/YYYY-WW.md
     with these sections:

     ## Week Summary
     - Total sessions: N
     - Average rating: X.X (explicit) / X.X (implicit)
     - Rating trend: improving / stable / declining
     - Effort distribution: N trivial, N quick, N standard, N thorough

     ## What's Working
     - Skills or patterns that consistently rate well
     - Preferences that seem stable (mentioned 3+ times)

     ## What's Not Working
     - Skills or patterns that rate poorly
     - Recurring mistakes from mistakes.md
     - Any frustration patterns from implicit sentiment

     ## Emerging Patterns
     - New preferences not yet in preferences.md
     - Cross-domain connections observed
     - Usage patterns (which skills used most/least)

     ## Recommendations
     - Specific skill files that should be improved (with reasoning)
     - Preferences ready to be promoted to policy files
     - Mistakes that should become explicit rules in policies

     ## Proposals (for Step 3B)
     - List of concrete improvement proposals, each as:
       Skill: [name]
       Current behavior: [what it does now]
       Proposed change: [what should change]
       Evidence: [which signals support this]
       Confidence: low / medium / high"

  → Sends synthesis notification via Discord webhook (notify-utils.sh)
  → IMPORTANT: The prompt should instruct Claude to read the actual files,
    not receive them as inline content (files may be large)

□ Create launchd plist: AI/scripts/plists/com.lifeos.learning-synthesis.plist
  → Schedule: Sunday 11:00 AM (after weekly-review.sh at 10:00 AM)
  → StandardOutPath: AI/scripts/logs/learning-synthesis.log
  → StandardErrorPath: AI/scripts/logs/learning-synthesis-error.log
  → WorkingDirectory: /Users/krzysztofgoworek/LifeOS

□ Test manually:
  → Run: bash AI/scripts/learning-synthesis.sh
  → Verify: AI/memory/learnings/synthesis/YYYY-WW.md created with all sections
  → Verify: Discord notification sent

□ Git commit: "add: weekly learning synthesis script for pattern analysis"
```

---

### Step 3B: Skill Improvement Proposal System

**What it does**: The synthesis report (3A) generates proposals. This step creates the infrastructure to store, review, and apply those proposals. You say "show proposals" and Claude presents pending improvements. You approve or reject. Approved changes get applied to skill/policy files. Rejected ones are logged so the system stops suggesting them.

**Why needed**: Without a proposal workflow, synthesis reports are just documents. This closes the loop — the system proposes, you decide, and the decision feeds back into learning.

**Implementation**:

```
□ Create directories:
  AI/memory/proposals/
  AI/memory/proposals/pending/
  AI/memory/proposals/approved/
  AI/memory/proposals/rejected/

□ Enhance AI/scripts/learning-synthesis.sh (from 3A):
  → After generating the synthesis report, for each recommendation with
    medium or high confidence:
    - Create a proposal file: AI/memory/proposals/pending/YYYY-MM-DD_{skill-or-policy}.md
    - Format:
      ---
      skill: [skill filename]
      created: [ISO timestamp]
      confidence: [low/medium/high]
      source_synthesis: [path to synthesis report]
      ---
      # Proposal: [Short title]

      ## Current Behavior
      [What the skill/policy currently does]

      ## Proposed Change
      [Specific edit to make — quote the exact text to change and the replacement]

      ## Evidence
      [Which ratings, mistakes, or patterns support this change]

      ## Risk
      [What could go wrong if this change is applied]

□ Create AI/skills/review-proposals.md:
  ---
  name: Review Proposals
  triggers: ["show proposals", "review proposals", "improvement proposals", "what should we improve"]
  context_files:
    - AI/memory/proposals/pending/
  policies:
    - challenger-protocol
  voice: "Analytical, presenting options clearly. Show evidence for each proposal."
  ---

  # Review Proposals

  ## When to Activate
  When user asks to see improvement proposals or says "show proposals".

  ## Instructions
  1. Read all files in AI/memory/proposals/pending/
  2. If none exist: "No pending proposals. The weekly synthesis runs on Sunday."
  3. Present each proposal with:
     - The skill/policy affected
     - What would change
     - Evidence supporting the change
     - Confidence level
  4. For each, ask: "Approve, reject, or skip?"
  5. On APPROVE:
     - Apply the proposed edit to the target skill/policy file
     - Move proposal to AI/memory/proposals/approved/
     - Append to learnings/execution.md: "Applied proposal: [title] on [date]"
     - Git commit: "improve: apply proposal — [short description]"
  6. On REJECT:
     - Move proposal to AI/memory/proposals/rejected/
     - Add rejection reason to the file (ask user why)
     - Append to learnings/execution.md: "Rejected proposal: [title] — reason: [reason]"
  7. On SKIP: leave in pending/ for next review

  ## Guardrails
  - Never apply proposals automatically — always require user approval
  - Never modify CLAUDE.md, hooks, or settings.json via proposals
  - Proposals only target skill files (AI/skills/) and policy files (AI/policies/)
  - If a proposal has been rejected 2+ times (similar topic), stop proposing it
    and log in AI/memory/proposals/rejected/blocklist.md

□ Test:
  → Manually create a test proposal in AI/memory/proposals/pending/
  → Say "show proposals" → verify skill routes to review-proposals
  → Approve one → verify skill file updated, proposal moved to approved/
  → Reject one → verify moved to rejected/ with reason

□ Git commit: "add: skill improvement proposal system with review workflow"
```

---

### Step 3C: Preference Learning with Confidence Tracking

**What it does**: Restructures `preferences.md` from a flat list to a structured document with confidence scores and source tracking. Preferences observed multiple times get promoted to policy files automatically (via proposals).

**Why needed**: Currently preferences are just notes. A preference seen once ("user prefers bullet points") is treated the same as one seen 20 times. Confidence tracking separates signal from noise.

**Implementation**:

```
□ Read PAI reference:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/IdealState.ts
    (for the pattern of tracking confidence and evidence)

□ Restructure AI/memory/learnings/preferences.md:
  → New format:

  # Learned Preferences

  _Updated by hooks and synthesis. Confidence increases with repeated observation._

  ## Writing & Communication
  | Preference | Confidence | Observations | First Seen | Last Seen |
  |---|---|---|---|---|
  | British English spelling | high | 15 | 2025-01-01 | 2025-01-15 |
  | No emojis unless asked | high | 12 | 2025-01-01 | 2025-01-14 |
  | Bullet points over paragraphs | medium | 5 | 2025-01-05 | 2025-01-13 |

  ## Workflow
  | Preference | Confidence | Observations | First Seen | Last Seen |
  |---|---|---|---|---|

  ## Tools & Technical
  | Preference | Confidence | Observations | First Seen | Last Seen |
  |---|---|---|---|---|
  | eventkit-cli over apple-mcp | high | seeded | 2025-01-01 | 2025-01-01 |

  ## Formatting
  | Preference | Confidence | Observations | First Seen | Last Seen |
  |---|---|---|---|---|

  → Migrate existing preferences from current flat format into the table
  → Seed known preferences from Phase 1 (already in the file) with confidence: high

□ Create AI/hooks/lib/preference-tracker.ts:
  → Shared utility used by multiple hooks
  → Function: recordPreference(category, preference, source)
    - Read preferences.md
    - If preference already exists: increment observations, update last_seen
    - If new: add row with confidence: low, observations: 1
    - Confidence rules:
      1 observation → low
      3-5 observations → medium
      6+ observations → high
    - Write updated preferences.md
  → Function: getHighConfidencePreferences(category?)
    - Returns preferences with confidence: high
    - Used by format-enforcer hook to inject verified preferences

□ Enhance AI/hooks/implicit-sentiment.ts (from Phase 2):
  → When a preference-related signal is detected (e.g., user corrects formatting,
    explicitly states a preference), call recordPreference()
  → Example signals:
    - "use British English" → recordPreference("writing", "British English spelling", session_id)
    - "no emojis" → recordPreference("formatting", "No emojis unless asked", session_id)
    - User corrects a format → infer preference from the correction

□ Enhance AI/scripts/learning-synthesis.sh (from 3A):
  → Add to synthesis: scan preferences.md
  → For preferences with confidence: high AND observations > 10:
    - Check if already in a policy file
    - If not: generate a proposal to add to the relevant policy file
  → For preferences with confidence: low AND last_seen > 30 days ago:
    - Mark as stale, consider removing

□ Test:
  → Manually call recordPreference() a few times
  → Verify: preferences.md table updates correctly
  → Run synthesis → verify high-confidence preferences generate promotion proposals

□ Git commit: "enhance: structured preference learning with confidence tracking"
```

---

### Step 3D: Mistake Pattern Detection

**What it does**: Scans `mistakes.md` for repeating patterns. If the same type of mistake occurs 3+ times, generates a proposal to add an explicit rule to the relevant skill or policy file.

**Why needed**: One-off mistakes are noise. Repeated mistakes are systemic problems that need explicit rules to prevent.

**Implementation**:

```
□ Restructure AI/memory/learnings/mistakes.md:
  → New format:

  # Mistake Log

  _Errors to avoid. Repeating patterns trigger policy proposals._

  ## Entries
  | Date | Category | Description | Skill | Occurrences |
  |---|---|---|---|---|
  | 2025-01-10 | formatting | Used American spelling | translator | 1 |
  | 2025-01-12 | tool-use | Called apple-mcp instead of eventkit-cli | general-advisor | 2 |

  ## Known Patterns (3+ occurrences)
  | Pattern | Occurrences | Policy Created | Status |
  |---|---|---|---|

  → Migrate existing mistakes from current format into the table

□ Create AI/hooks/lib/mistake-tracker.ts:
  → Function: recordMistake(category, description, skill)
    - Read mistakes.md
    - Fuzzy match: is this similar to an existing entry? (simple keyword overlap)
    - If similar: increment occurrences
    - If new: add row with occurrences: 1
    - If occurrences reaches 3: move to "Known Patterns" section
      and generate a proposal in AI/memory/proposals/pending/
    - Write updated mistakes.md
  → Used by: implicit-sentiment.ts (on negative signals with context),
    on-feedback.ts (on explicit low ratings)

□ Enhance AI/hooks/on-feedback.ts (from Phase 1):
  → When rating < 6 with a comment, try to extract the mistake category
  → Call recordMistake() with extracted info

□ Enhance AI/scripts/learning-synthesis.sh:
  → Add to synthesis: scan mistakes.md "Known Patterns" section
  → For each pattern without a policy rule:
    - Generate proposal to add rule to the relevant skill/policy file
    - Example: pattern "used American spelling" 5 times →
      proposal: add "ALWAYS use British English" to formatting-rules.md

□ Test:
  → Manually record the same mistake 3 times
  → Verify: moves to "Known Patterns" section
  → Verify: proposal generated in proposals/pending/

□ Git commit: "add: mistake pattern detection with automatic rule proposals"
```

---

### Step 3E: Integrate Synthesis with Weekly Review

**What it does**: Connects the learning synthesis to the existing `weekly-review.sh` launchd script so the Sunday review includes AI self-improvement insights alongside the GTD review.

**Why needed**: The weekly review already runs every Sunday at 10:00 AM. The learning synthesis (3A) runs at 11:00 AM. This step makes the weekly review reference the previous week's synthesis and ensures the two scripts work together, not in isolation.

**Implementation**:

```
□ Enhance AI/scripts/weekly-review.sh:
  → Add to the Claude prompt:

    "LEARNING SYNTHESIS REVIEW:
     After completing the GTD review phases, also:

     1. Read the most recent synthesis report from AI/memory/learnings/synthesis/
        If this week's doesn't exist yet (synthesis runs after this script),
        read last week's.

     2. Report on:
        - Rating trends (are we getting better or worse?)
        - Any pending proposals in AI/memory/proposals/pending/
        - Any known mistake patterns in AI/memory/learnings/mistakes.md
        - High-confidence preferences that haven't been promoted yet

     3. Include in the weekly review output:
        ## AI System Health
        - Avg rating this week: X.X
        - Pending improvement proposals: N
        - Known mistake patterns: N
        - Preference confidence: N high, N medium, N low

     4. If there are pending proposals, remind the user:
        'You have N improvement proposals to review. Say show proposals to review them.'"

□ Enhance AI/scripts/daily-brief.sh:
  → Add a lightweight check:
    "If AI/memory/proposals/pending/ has files, add to morning brief:
     'You have N pending AI improvement proposals to review.'"

□ Verify the schedule makes sense:
  → Sunday 10:00 AM: weekly-review.sh (GTD + learning review)
  → Sunday 11:00 AM: learning-synthesis.sh (new synthesis + proposals)
  → The weekly review reads LAST week's synthesis. The new synthesis runs after.
  → This means proposals from the new synthesis are reviewed NEXT Sunday.
  → Alternatively: swap the order (synthesis at 9:00 AM, review at 10:00 AM)
    so the weekly review always has fresh data. Recommend this approach.

□ If reordering:
  → Update learning-synthesis plist: 9:00 AM Sunday
  → Weekly review stays at 10:00 AM
  → Now Sunday flow: synthesis runs → review reads fresh synthesis → user sees latest

□ Test:
  → Run learning-synthesis.sh manually → verify synthesis report created
  → Run weekly-review.sh manually → verify it reads the synthesis report
  → Verify daily-brief.sh mentions pending proposals (if any exist)

□ Git commit: "integrate: learning synthesis with weekly review and daily brief"
```

---

## PART 4: MANUAL TESTING CHECKLIST

After all steps are implemented:

```
□ Test 1: Synthesis Report Generation
  → Ensure there are some ratings in ratings.jsonl (give a few explicit ratings first)
  → Run: bash AI/scripts/learning-synthesis.sh
  → Verify: AI/memory/learnings/synthesis/YYYY-WW.md exists
  → Verify: report has all sections (Summary, Working, Not Working, Patterns, Recommendations, Proposals)
  → Verify: Discord notification sent

□ Test 2: Proposal Creation
  → Verify: synthesis created proposals in AI/memory/proposals/pending/
  → If no proposals generated (not enough data), create a test proposal manually
  → Say "show proposals"
  → Verify: review-proposals skill activates
  → Approve one → verify skill file changed, proposal moved to approved/
  → Reject one → verify moved to rejected/ with reason

□ Test 3: Preference Tracking
  → In a session, correct Claude's formatting twice
  → Verify: preferences.md updated with new/incremented entry
  → Repeat in another session → verify observation count increases
  → After 6+ observations → verify confidence changes to high

□ Test 4: Mistake Pattern Detection
  → Record similar mistake 3 times (via low ratings with comments)
  → Verify: mistake moves to "Known Patterns" in mistakes.md
  → Verify: proposal generated in proposals/pending/

□ Test 5: Weekly Review Integration
  → Run learning-synthesis.sh → produces report
  → Run weekly-review.sh → verify it includes AI System Health section
  → Verify it mentions pending proposals count

□ Test 6: Daily Brief Reminder
  → Create a test proposal in proposals/pending/
  → Run daily-brief.sh
  → Verify: morning brief mentions pending proposals
```

---

## PART 5: DIRECTORY STRUCTURE AFTER PHASE 3

```
AI/memory/
├── work/
│   ├── current.md
│   ├── state.json
│   └── YYYY-MM-DD_slug/
│       └── META.yaml
├── learnings/
│   ├── preferences.md          # NOW: structured table with confidence scores
│   ├── mistakes.md             # NOW: structured table with occurrence counts
│   ├── execution.md
│   └── synthesis/
│       └── YYYY-WW.md          # Weekly synthesis reports
├── proposals/
│   ├── pending/                # Awaiting user review
│   │   └── YYYY-MM-DD_skill.md
│   ├── approved/               # Applied proposals
│   │   └── YYYY-MM-DD_skill.md
│   └── rejected/               # Rejected proposals
│       ├── YYYY-MM-DD_skill.md
│       └── blocklist.md        # Topics to stop proposing
├── signals/
│   └── ratings.jsonl
├── security/
│   └── YYYY-MM-DD.jsonl
└── context-log.md
```

New/modified files:
- `AI/hooks/lib/preference-tracker.ts` — shared preference recording utility
- `AI/hooks/lib/mistake-tracker.ts` — shared mistake recording utility
- `AI/scripts/learning-synthesis.sh` — weekly synthesis script
- `AI/scripts/plists/com.lifeos.learning-synthesis.plist` — launchd schedule
- `AI/skills/review-proposals.md` — new skill for reviewing proposals
- Enhanced: `implicit-sentiment.ts`, `on-feedback.ts`, `weekly-review.sh`, `daily-brief.sh`

---

## PART 6: WHAT COMES NEXT (Phase 4 Preview)

Phase 3 closes the feedback loop — the system captures signals, synthesizes patterns, proposes improvements, and you approve. Phase 4 adds high-value skills that leverage this infrastructure:

- **Research**: Multi-source research using existing MCP servers (Brave, Firecrawl, Perplexity, Gemini)
- **Council**: Multi-agent debate for important decisions (3-5 agents, 3 rounds)
- **CreateSkill**: Self-extending — system proposes and scaffolds new skills
- **Telos**: Life OS / goals management integrated with Tracking/Objectives/

Phase 3 makes these skills smarter from day one because they inherit the learning infrastructure.
