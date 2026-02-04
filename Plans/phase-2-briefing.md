# Phase 2: Full Hook System — Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for **Phase 2** of the AI Genius transformation. Phase 1 is complete and merged to main.

**Reference repo**: `~/PAI-reference/` — clone of Daniel Messler's PAI. Read files there for implementation patterns. Adapt, don't copy.

**Safety rule**: After EVERY sub-step (2A through 2F), commit to git with a descriptive message. If anything breaks, `git revert` that commit.

---

## PART 1: PHASE 1 COMPLETION STATE

### What Exists After Phase 1

Phase 1 created the modular architecture. Here's what's in place:

```
AI/
├── skills/           # 23 skill files with YAML frontmatter
├── context/          # 7 domain context maps
├── policies/         # 8 policy files
├── memory/
│   ├── work/current.md          # WIP tracking
│   ├── learnings/
│   │   ├── preferences.md       # User style preferences
│   │   ├── mistakes.md          # Errors to avoid
│   │   └── execution.md         # Task approach learnings
│   ├── signals/ratings.jsonl    # Quality ratings (explicit)
│   └── context-log.md           # Migrated from AI/AI Context Log.md
├── hooks/
│   ├── on-session-start.ts      # Context injection (WIP, context log, preferences)
│   ├── on-session-end.ts        # Session end processing
│   ├── on-feedback.ts           # Explicit rating capture (1-10)
│   └── lib/paths.ts             # Shared path utilities
└── scripts/                     # 5 launchd scripts (enhanced with memory awareness)
```

- `CLAUDE.md` — slim routing file (~1,656 tokens, down from 14,500)
- `CLAUDE-legacy.md` — safety backup (remove after 2 weeks from Phase 1 merge date)
- All 62 automated tests pass

### Phase 1 Lessons Learned (CRITICAL — Read These)

These were discovered during manual testing and will save you from repeating mistakes:

#### 1. Hook settings.json Format

The `.claude/settings.json` hook registration format must be:

```json
{
  "hooks": {
    "EventType": [
      {
        "matcher": "",
        "hooks": [
          {"type": "command", "command": "bun run /path/to/hook.ts"}
        ]
      }
    ]
  }
}
```

**Critical details**:
- `"matcher"` MUST be a **string**, not an object. Use `""` (empty string) for hooks that fire on all events.
- For PreToolUse hooks that target specific tools, use pipe-delimited tool names: `"matcher": "Bash|Edit|Write|Read"`
- Each hook entry is `{"type": "command", "command": "..."}` — the `type` field is required.

#### 2. SessionStart Hooks Do NOT Inject Content

- SessionStart hooks run but their **stdout is NOT passed to Claude's conversation context**.
- To inject content (like WIP state, preferences, reminders) into Claude's context, use **UserPromptSubmit** hooks instead.
- UserPromptSubmit hook stdout appears as `<system-reminder>` blocks in the conversation.
- This is why `on-session-start.ts` is registered under UserPromptSubmit, not SessionStart.

#### 3. Stop Hooks Do NOT Inject Content Either

- Stop hooks run on `/exit` but their stdout is not displayed to the user.
- The `on-session-end.ts` hook fires but its reminder output is not visible.
- For end-of-day processing, rely on `daily-close.sh` launchd script instead.
- Stop hooks ARE useful for fire-and-forget side effects (writing files, logging).

#### 4. Context Injection Fires Every Prompt

- The `on-session-start.ts` hook currently fires on EVERY UserPromptSubmit, not just the first.
- This is wasteful but not harmful — it re-injects WIP/preferences on every prompt.
- **Phase 2 must fix this** with a first-prompt-only guard (see Step 2F below).

#### 5. Hook Runtime

- All hooks use `bun run` as the TypeScript runtime.
- Hooks read JSON from stdin (event data) and write to stdout (content injection or decisions).
- Hooks MUST exit 0 always — a non-zero exit can block Claude Code.
- Exception: PreToolUse hooks can exit 2 to BLOCK a tool call.

#### 6. Current Working settings.json

This is the working `.claude/settings.json` from Phase 1:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-session-start.ts"},
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-feedback.ts"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-session-end.ts"}
        ]
      }
    ]
  }
}
```

---

## PART 2: PAI HOOK REFERENCE FILES

Read these PAI files for implementation patterns before writing each hook:

### Security Validator
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/SecurityValidator.hook.ts
```
- PreToolUse hook — intercepts Bash, Edit, Write, Read
- Pattern categories: blocked (exit 2), confirm (ask user), alert (log + allow)
- Path categories: zeroAccess, readOnly, confirmWrite, noDelete
- Logs to MEMORY/SECURITY/ directory
- Exit codes: 0 = allow, 2 = hard block

### Format Enforcer
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/FormatEnforcer.hook.ts
```
- UserPromptSubmit hook — injects format rules on every prompt
- Self-healing: prevents format drift in long conversations
- Reads format spec from policy files
- Fast — just file read + stdout, no inference

### Auto-Work Creation
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/AutoWorkCreation.hook.ts
```
- UserPromptSubmit hook — creates work entries automatically
- Classifies prompts: work | question | conversational
- Tracks effort level: trivial | quick | standard | thorough
- Creates work directories with META.yaml

### Implicit Sentiment Capture
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/ImplicitSentimentCapture.hook.ts
```
- Detects frustration/satisfaction without explicit ratings
- Uses Haiku inference call (fast, cheap)
- Writes to ratings.jsonl with type: "implicit"
- Fire-and-forget — never blocks

### Stop Orchestrator
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/StopOrchestrator.hook.ts
```
- Single entry point for all Stop event handling
- Reads transcript ONCE, distributes to handlers
- Handlers: capture (work state), tab-state, system-integrity

### Shared Libraries
```
~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/paths.ts
~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/observability.ts
~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/learning-utils.ts
~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/metadata-extraction.ts
```

---

## PART 3: IMPLEMENTATION STEPS

### Constraints

**DO NOT TOUCH**:
- Vault folder structure (Areas/, Projects/, Notes/, Content/, etc.)
- All 24 .base database files
- eventkit-cli, mail-cli, afk-code
- Obsidian plugins
- Existing working hooks from Phase 1 (unless enhancing them)
- CLAUDE.md (unless adding a reference to a new hook or policy)

**ALWAYS**:
- Git commit after every sub-step (2A through 2F)
- Test each hook individually before moving to the next
- Keep hooks fast — no inference calls except where explicitly specified (2D only)
- Exit 0 from every hook — never block Claude Code
- Use `bun run` as the TypeScript runtime (already installed on the system)

---

### Step 2A: Security Validator Hook (PreToolUse)

**What it does**: Intercepts every Bash, Edit, Write, and Read tool call before execution. Pattern-matches against security rules. Blocks dangerous commands, requests confirmation for risky ones, logs everything.

**Why critical**: The launchd scripts run with `--permission-mode bypassPermissions`. One bad prompt could destroy the vault. This prevents that.

**Implementation**:

```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/SecurityValidator.hook.ts
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/lib/paths.ts

□ Create AI/policies/security-patterns.yaml:
  bash:
    blocked:
      - "rm -rf /"
      - "rm -rf ~"
      - "rm -rf $HOME"
      - "git push --force origin main"
      - "git push --force origin master"
      - "git reset --hard"
      - "format"
      - "mkfs"
      - "> /dev/"
    confirm:
      - "rm -rf"
      - "rm -r"
      - "git push --force"
      - "git reset"
      - "chmod -R"
      - "chown -R"
      - "mv ~/LifeOS"
    alert:
      - "curl.*| sh"
      - "curl.*| bash"
      - "wget.*| sh"
      - "eval"
      - "sudo"
  paths:
    zeroAccess:
      - "~/.ssh"
      - "~/.aws"
      - "~/.gnupg"
      - "credentials"
      - ".env"
      - "*.key"
      - "*.pem"
    readOnly:
      - "/etc"
      - "/System"
      - "/usr"
    confirmWrite:
      - "CLAUDE.md"
      - ".claude/settings.json"
      - "AI/policies/"
    noDelete:
      - "_System/Databases/"
      - "AI/memory/"
      - "AI/skills/"
      - "AI/policies/"
      - "AI/hooks/"

□ Create AI/hooks/security-validator.ts:
  → PreToolUse hook
  → Reads JSON from stdin: { tool_name, tool_input }
  → For Bash: check tool_input.command against bash patterns
  → For Edit/Write: check tool_input.file_path against path rules
  → For Read: check tool_input.file_path against zeroAccess paths
  → Exit codes:
    - 0: allowed (or alert-only — log but allow)
    - 2: blocked (hard block, Claude sees rejection)
  → For "confirm" patterns: output {"decision": "ask", "message": "⚠️ This command matches a security rule: [pattern]. Proceed?"}
  → Log all decisions to AI/memory/security/ directory
  → MUST: never crash, wrap everything in try/catch, exit 0 on any error

□ Create AI/memory/security/ directory

□ Register in .claude/settings.json:
  Add to the existing config:
  "PreToolUse": [
    {
      "matcher": "Bash|Edit|Write|Read",
      "hooks": [
        {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/security-validator.ts"}
      ]
    }
  ]

□ Test:
  → Try: a normal command (ls, git status) — should pass silently
  → Try: "rm -rf /" — should be hard-blocked (exit 2)
  → Try: "rm -rf some-dir" — should trigger confirmation prompt
  → Try: reading a file with "credentials" in path — should be blocked
  → Verify: AI/memory/security/ contains log entries

□ Git commit: "add: security validator hook with pattern-based rules"
```

---

### Step 2B: Format Enforcer Hook (UserPromptSubmit)

**What it does**: Injects a condensed format reminder into every prompt as a `<system-reminder>`. Prevents format drift in long conversations.

**Why needed**: CLAUDE.md has formatting rules (British English, no slop, structured output, no emojis). In long sessions these fall out of the context window. This hook re-injects them.

**Implementation**:

```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/FormatEnforcer.hook.ts

□ Create AI/hooks/format-enforcer.ts:
  → UserPromptSubmit hook
  → Reads AI/policies/formatting-rules.md (already exists from Phase 1)
  → Outputs a CONDENSED version (~200 tokens max) as stdout
  → Format of output:
    "FORMAT REMINDER: British English. No emojis. No corporate language.
     Match user's language (Polish/English). Structured output with headers.
     Factual, laconic, no filler. ADHD-aware: clear sections, bullet points."
  → Does NOT re-read the full policy file every time — cache the condensed version
    in the hook itself or in a small separate file
  → Fast execution — pure file read + stdout, no inference
  → MUST: exit 0 always

□ Register in .claude/settings.json:
  Add to the existing UserPromptSubmit hooks array:
  {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/format-enforcer.ts"}

□ Test:
  → Start a session, send 20+ messages
  → Verify formatting stays consistent (British English, structured output)
  → Verify the format reminder appears in <system-reminder> blocks

□ Git commit: "add: format enforcer hook for consistent output quality"
```

---

### Step 2C: Auto-Work Creation Hook (UserPromptSubmit)

**What it does**: Automatically creates a work tracking entry for each session. Classifies prompts. Tracks what you're working on without manual effort.

**Why needed**: Phase 1's `work/current.md` is updated manually at session end. This makes tracking automatic and richer.

**Implementation**:

```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/AutoWorkCreation.hook.ts

□ Create AI/hooks/auto-work-creation.ts:
  → UserPromptSubmit hook
  → On FIRST prompt of session (check state file):
    - Create AI/memory/work/{YYYY-MM-DD}_{slug}/ directory
    - Create META.yaml inside:
      status: active
      created_at: ISO timestamp
      effort: quick  (default, can be updated)
      prompts: 1
    - Update AI/memory/work/state.json with current session pointer:
      {"active_work": "2025-01-15_newsletter-draft", "session_start": "ISO"}
  → On SUBSEQUENT prompts:
    - Increment prompt count in META.yaml
    - Update effort classification based on prompt count:
      1-3 prompts → trivial
      4-10 prompts → quick
      11-25 prompts → standard
      26+ prompts → thorough
  → Slug generation: take first meaningful words from prompt, lowercase, hyphenated
  → MUST: exit 0 always, never block

□ Create AI/memory/work/state.json (initial: {})

□ Register in .claude/settings.json:
  Add to UserPromptSubmit hooks array:
  {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/auto-work-creation.ts"}

□ Test:
  → Start a session, send a prompt
  → Verify: AI/memory/work/{date}_{slug}/ directory created with META.yaml
  → Send more prompts, verify prompt count increments
  → Verify state.json updated

□ Git commit: "add: auto-work creation hook for automatic task tracking"
```

---

### Step 2D: Implicit Sentiment Capture Hook (UserPromptSubmit)

**What it does**: Detects frustration, satisfaction, or confusion in messages WITHOUT explicit ratings. Uses a quick inference call to classify emotional state.

**Why needed**: You won't rate every interaction 1-10. But "no, that's wrong, do it again" should be captured as negative signal. This captures those implicit signals.

**Implementation**:

```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/ImplicitSentimentCapture.hook.ts

□ Create AI/hooks/implicit-sentiment.ts:
  → UserPromptSubmit hook
  → First: check if on-feedback.ts already detected an explicit rating for this prompt
    - If yes: skip (don't double-count)
    - Detection: check if prompt matches rating regex ^(10|[1-9])(?:\s*[-:]\s*|\s+)?
  → Parse the user's prompt text from stdin JSON
  → Quick heuristic check BEFORE inference call (save API costs):
    - Negative signals: "no", "wrong", "that's not", "try again", "redo", "not what I",
      "you missed", "didn't ask for", "ignore that", "sigh", "frustrating"
    - Positive signals: "perfect", "exactly", "great", "thanks", "spot on", "love it"
    - Neutral: no signal detected → skip inference, exit 0
  → If signal detected: classify sentiment as:
    - rating: 1-10 (inferred)
    - sentiment: frustrated | confused | satisfied | neutral
    - confidence: low | medium | high
  → Write to AI/memory/signals/ratings.jsonl:
    {"timestamp": "ISO", "type": "implicit", "rating": N, "sentiment": "X",
     "confidence": "Y", "trigger": "the signal word/phrase detected"}
  → If inferred rating < 6 AND confidence is medium or high:
    Append to AI/memory/learnings/mistakes.md with context
  → MUST: fire-and-forget, never block, exit 0 always
  → MUST: no stdout output (this hook should NOT inject into conversation)

□ Register in .claude/settings.json:
  Add to UserPromptSubmit hooks array:
  {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/implicit-sentiment.ts"}

□ Test:
  → Say "no, that's wrong" → verify implicit rating captured in ratings.jsonl
  → Say "perfect, exactly what I needed" → verify positive signal captured
  → Say a neutral prompt → verify NO entry added (skip)
  → Give an explicit rating "8" → verify implicit capture is SKIPPED

□ Git commit: "add: implicit sentiment capture for passive learning"
```

**Note on inference**: The PAI version uses a Haiku API call for sentiment classification. For the first version, use the heuristic approach above (keyword matching) to avoid API costs and latency. Upgrade to inference in Phase 3 if the heuristic proves too crude.

---

### Step 2E: Enhanced Session End Hook (Stop)

**What it does**: When a session ends, marks the active work as completed, updates metadata, clears session state.

**Why needed**: Phase 1's `on-session-end.ts` is basic. This version integrates with the auto-work system from 2C.

**Implementation**:

```
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/StopOrchestrator.hook.ts
□ Read PAI reference: ~/PAI-reference/Packs/pai-hook-system/src/hooks/handlers/capture.ts

□ Enhance AI/hooks/on-session-end.ts:
  → Keep existing functionality
  → Add: read AI/memory/work/state.json for active work pointer
  → If active work exists:
    - Update META.yaml: status → completed, completed_at → ISO timestamp
    - Calculate duration from created_at to now
    - Update final effort classification based on prompt count
  → Clear AI/memory/work/state.json (reset to {})
  → Update AI/memory/work/current.md with:
    - What was worked on (from work directory name)
    - Status: completed
    - Duration
    - Effort level
  → Remember: Stop hook stdout is NOT displayed to user — this is fire-and-forget
  → MUST: exit 0 always, fast execution

□ Test:
  → Start a session (triggers auto-work creation from 2C)
  → Do some work
  → Exit with /exit
  → Verify: META.yaml updated with completed_at
  → Verify: state.json cleared
  → Verify: work/current.md updated

□ Git commit: "enhance: session end hook with auto-work completion tracking"
```

---

### Step 2F: First-Prompt-Only Guard for Context Injection

**What it does**: Makes the `on-session-start.ts` context injection fire only on the FIRST prompt of each session, not on every prompt.

**Why needed**: Currently, WIP state + preferences + context log are re-injected on every single UserPromptSubmit. This wastes tokens and clutters the conversation with repeated `<system-reminder>` blocks.

**Implementation**:

```
□ Modify AI/hooks/on-session-start.ts:
  → Add session tracking using a state file (e.g., AI/hooks/lib/.session-state.json)
  → On each invocation:
    1. Read .session-state.json
    2. Check if "session_id" matches current process/time window
       - Option A: Use the Claude session transcript path from stdin JSON
       - Option B: Use a timestamp — if last injection was < 5 minutes ago, skip
       - Option C (simplest): Use state.json from auto-work hook (2C) —
         if state.json already has an active_work entry, skip injection
    3. If this is the first prompt: output context, write state
    4. If not first prompt: exit 0 with no output (silent)
  → Recommended approach: Option C — piggyback on auto-work state.
    If AI/memory/work/state.json has active_work set, context was already injected.
    This naturally pairs with auto-work creation (2C).

□ Alternative simpler approach (if Option C is too coupled):
  → Create AI/hooks/lib/.last-injection timestamp file
  → On invocation: read file, if timestamp is < 30 minutes old → skip
  → On first prompt: inject context, write current timestamp
  → On session end (2E): delete the timestamp file

□ Test:
  → Start new session → first prompt should show context injection
  → Send second prompt → should NOT show context injection
  → Wait 30+ minutes (or delete state file) → should re-inject
  → Start completely new session → should inject again

□ Git commit: "fix: context injection fires only on first prompt per session"
```

---

### Step 2G: Update settings.json Registration

**What it does**: Ensures all new hooks are properly registered in `.claude/settings.json`.

**Implementation**:

```
□ Final .claude/settings.json should look like:

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read",
        "hooks": [
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/security-validator.ts"}
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-session-start.ts"},
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-feedback.ts"},
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/format-enforcer.ts"},
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/auto-work-creation.ts"},
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/implicit-sentiment.ts"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/on-session-end.ts"}
        ]
      }
    ]
  }
}

□ IMPORTANT: .claude/ is gitignored — this file lives only locally.
  You cannot commit it. The user must update it manually or you must
  write it directly to /Users/krzysztofgoworek/LifeOS/.claude/settings.json

□ After updating, verify:
  → Start new Claude Code session
  → First prompt: should see context injection (on-session-start) + format reminder (format-enforcer)
  → Security: try a dangerous command, verify it's blocked
  → Feedback: give a rating, verify it's captured
  → Work: verify work directory was created

□ Git commit: "docs: document final settings.json hook registration"
  (commit a reference copy or documentation, since .claude/ is gitignored)
```

---

## PART 4: MANUAL TESTING CHECKLIST

After all hooks are implemented, run through these tests:

```
□ Test 1: Security Validator
  → Run: a normal git status → passes
  → Run: try "rm -rf /" in a prompt → blocked
  → Run: try editing CLAUDE.md → confirmation prompt
  → Check: AI/memory/security/ has log entries

□ Test 2: Format Enforcement
  → Start a long conversation (15+ exchanges)
  → Verify: formatting stays consistent (British English, structured, no emojis)
  → Verify: <system-reminder> with format rules appears

□ Test 3: Auto-Work Tracking
  → Start session, ask about newsletter → work directory created
  → Send 5 more prompts → prompt count = 6, effort = quick
  → Exit session → META.yaml shows completed, work/current.md updated

□ Test 4: Implicit Sentiment
  → Say "that's wrong, try again" → check ratings.jsonl for implicit negative
  → Say "perfect, exactly right" → check for implicit positive
  → Say a neutral question → no new entry in ratings.jsonl

□ Test 5: First-Prompt Guard
  → Start session → context injection on first prompt
  → Second prompt → NO context injection
  → New session → context injection again

□ Test 6: Explicit Rating (regression)
  → Give a "7 - good response" rating
  → Verify: ratings.jsonl has explicit entry
  → Verify: implicit sentiment did NOT also create an entry

□ Test 7: Combined Flow
  → Start session (auto-work created, context injected, format reminder)
  → Do some work
  → Express frustration ("no, redo this")
  → Give explicit rating ("8 - better")
  → Exit session
  → Verify: work directory complete, both ratings captured, security log clean
```

---

## PART 5: KNOWN ISSUES & EDGE CASES

### Hook Execution Order

UserPromptSubmit hooks fire sequentially in the order registered. The recommended order is:
1. `on-session-start.ts` — context injection (first-prompt only)
2. `on-feedback.ts` — explicit rating capture
3. `format-enforcer.ts` — format reminder injection
4. `auto-work-creation.ts` — work tracking
5. `implicit-sentiment.ts` — sentiment (runs last, checks if explicit rating already captured)

### .claude/ is Gitignored

The `.claude/settings.json` file cannot be committed. Options:
- Document the expected settings.json in `AI/hooks/README.md`
- Create `AI/hooks/settings.json.example` as a reference copy
- The user updates .claude/settings.json manually

### Concurrent Hook Execution

Multiple UserPromptSubmit hooks share state via the filesystem. Be careful with:
- `state.json` — both auto-work and session-start hooks may read/write it
- `ratings.jsonl` — both feedback and sentiment hooks append to it
- Use file locking or append-only patterns to avoid race conditions

### Memory Directory Structure After Phase 2

```
AI/memory/
├── work/
│   ├── current.md              # Latest WIP summary
│   ├── state.json              # Active session pointer
│   └── 2025-01-15_task-name/   # Per-session work directories
│       └── META.yaml           # Status, timestamps, effort, prompt count
├── learnings/
│   ├── preferences.md
│   ├── mistakes.md
│   └── execution.md
├── signals/
│   └── ratings.jsonl           # Explicit + implicit ratings
├── security/                   # Security validator audit trail
│   └── YYYY-MM-DD.jsonl
└── context-log.md
```

---

## PART 6: WHAT COMES NEXT (Phase 3 Preview)

Phase 2 produces raw signals (ratings, sentiment, work tracking, security logs). Phase 3 turns those signals into actionable improvements:

- **Weekly learning synthesis** — analyzes ratings.jsonl + learnings/ to find patterns
- **Skill improvement proposals** — suggests concrete edits to skill files
- **Preference aggregation** — promotes high-confidence preferences to policy files

Phase 2 is the foundation that makes Phase 3 possible. Get the hooks right, and the system starts learning automatically.
