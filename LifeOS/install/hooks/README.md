# LifeOS Hook System

> **Lifecycle event handlers that extend Claude Code with tab state, memory, observability, gates, and integrity checks.**

This document is the authoritative reference for LifeOS's hook system. When modifying any hook, update both the hook's inline documentation AND this README.

*Last updated: 2026-07-24 — synced to v7.1.1 registration truth (`hooks/hooks.json`). See Migration Notes.*

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hook Lifecycle Events](#hook-lifecycle-events)
3. [Hook Registry](#hook-registry)
4. [Consolidation Dispatchers](#consolidation-dispatchers)
5. [Inter-Hook Dependencies](#inter-hook-dependencies)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Shared Libraries](#shared-libraries)
8. [Configuration](#configuration)
9. [Documentation Standards](#documentation-standards)
10. [Maintenance Checklist](#maintenance-checklist)
11. [Migration Notes](#migration-notes)

---

## Architecture Overview

Hooks are TypeScript scripts that execute at specific lifecycle events in Claude Code. They enable:

- **Tab + voice feedback**: Kitty tab state through the question/answer/completion cycle, spoken completion lines
- **Memory**: hot-layer injection at turn start, review cadence, health checks, session learning capture
- **Observability**: unified append-JSONL event logging (tool activity, failures, config changes)
- **Security**: native `permissions.deny` + a single `Safety.hook.ts` that dispatches by event — gates outgoing tool calls (PermissionRequest) and tags external content (PostToolUse)
- **Gates**: blocking guards before dangerous tool calls (PreToolGuard) and end-of-turn quality gates (StopGates)
- **Context injection**: identity, dynamic context, per-turn memory state

### Design Principles

1. **Non-blocking by default**: Hooks should not delay the user experience.
2. **Fail gracefully**: Errors in one hook must not crash the session.
3. **Single responsibility**: Each hook does one thing well.
4. **Consolidated dispatch**: one registered hook per event class reads stdin once and dispatches to standalone sub-hook modules (see [Consolidation Dispatchers](#consolidation-dispatchers)).
5. **Shared utilities over duplication**: Use `hooks/lib/hook-io.ts` for stdin reading.
6. **The model is the security boundary**: Constitutional Security Protocol in `LIFEOS_SYSTEM_PROMPT.md` + native `permissions.deny` in `settings.json`. Hooks don't enforce — they tag.

### Execution Model

Fire order below matches `hooks/hooks.json` array order per event.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude Code Session                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SessionStart ──┬──► HookHealer (exec-bit self-repair sweep)        │
│                 ├──► KittyEnvPersist (terminal env + tab reset)     │
│                 ├──► LoadContext (dynamic context injection)        │
│                 ├──► FreshnessCache (statusline cache, TOOLS)       │
│                 └──► SettingsBackport + MergeSettings (TOOLS)       │
│                                                                     │
│  UserPromptSubmit ──┬──► PromptProcessing (tab title + naming)      │
│                     ├──► SatisfactionCapture (rating + signals)     │
│                     ├──► ReminderRouter (reminder → labeled issue)  │
│                     └──► MemoryTurnStart (memory injection + delta) │
│                                                                     │
│  PreToolUse ──┬──► ContextReduction (Bash → rtk rewrite)            │
│               ├──► SkillGuard (Skill, HTTP route on Pulse 31337)    │
│               ├──► AgentGuard (Agent, HTTP route on Pulse 31337)    │
│               ├──► AgentInvocation (Agent → subagent_start)         │
│               ├──► TabState (AskUserQuestion → question tab)        │
│               └──► PreToolGuard (Bash|Write|Edit|MultiEdit blocker) │
│                                                                     │
│  PostToolUse ──┬──► AgentInvocation (Agent → subagent_stop)         │
│                ├──► Safety (WebFetch/WebSearch → tag as data)       │
│                ├──► TabState (AskUserQuestion → restore tab)        │
│                ├──► ISASync (Write/Edit/MultiEdit → work.json)      │
│                ├──► CheckpointPerISC (Write/Edit/MultiEdit commit)  │
│                └──► EventLogger (catch-all observability, async)    │
│                                                                     │
│  PostToolUseFailure ──┬──► EventLogger (failure logging)            │
│                       └──► AlgorithmNudge (live nudge layer)        │
│                                                                     │
│  Stop ──┬──► LastResponseCache  (cache for SatisfactionCapture)     │
│         ├──► TabState           (completion tab reset)              │
│         ├──► VoiceCompletion    (TTS voice line)                    │
│         ├──► ISARenderOnStop    (re-render edited ISAs)             │
│         ├──► StopGates          (format/verification/writing gates) │
│         └──► MemoryReviewFire   (memory-review cadence)             │
│                                                                     │
│  StopFailure ──► EventLogger (API error logging)                    │
│  TaskCreated ──► TaskGovernance (rate-limit + quality gate)         │
│  ConfigChange ──► EventLogger (settings.json diff log)              │
│  PermissionRequest ──► Safety (shape-classifier auto-allow)         │
│                                                                     │
│  SessionEnd ──┬──► WorkCompletionLearning (insight extraction)      │
│               ├──► SessionCleanup (work completion + state clear)   │
│               ├──► UpdateCounts (settings.json counts + cache)      │
│               ├──► MemoryHealthGate (autonomic memory health check) │
│               ├──► DocIntegrity (cross-refs + arch summary regen)   │
│               └──► IntegrityCheck (system file change detection)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hook Lifecycle Events

| Event | When It Fires | Typical Use Cases |
|-------|---------------|-------------------|
| `SessionStart` | Session begins | Self-repair sweep, context loading, terminal env, freshness cache, settings merge |
| `UserPromptSubmit` | User sends a message | Tab title, session naming, satisfaction capture, reminder routing, memory injection |
| `PreToolUse` | Before a tool executes | Command rewrite, blocking guards, UI state, subagent tracking |
| `PostToolUse` | After a tool executes | ISA sync, checkpoint commit, observability, external content tagging |
| `PostToolUseFailure` | Tool execution fails | Failure logging, Algorithm nudges |
| `Stop` | Claude responds | Tab reset, voice feedback, ISA render, quality gates, memory cadence |
| `StopFailure` | Turn ends due to API error | Error logging |
| `TaskCreated` | Subagent creates a task | Rate-limit + quality gate |
| `ConfigChange` | settings.json modified | Security audit trail |
| `PermissionRequest` | Tool call needs permission | Shape-classifier auto-allow of safe calls |
| `SessionEnd` | Session terminates | Learning, cleanup, counts, memory health, doc + system integrity |

### Event Payload Structure

All hooks receive JSON via stdin with event-specific fields:

```typescript
interface BasePayload {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

interface UserPromptPayload extends BasePayload {
  prompt: string;
}

interface PreToolUsePayload extends BasePayload {
  tool_name: string;
  tool_input: Record<string, any>;
}

interface StopPayload extends BasePayload {
  stop_hook_active: boolean;
}
```

---

## Hook Registry

### SessionStart Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `HookHealer.hook.ts` | Self-heal exec-bit loss on registered hook scripts (`chmod +x` sweep; registered via `bun <path>` so it can't lose its own) | No | `settings.json`, `MEMORY/OBSERVABILITY/hook-healer.jsonl` |
| `KittyEnvPersist.hook.ts` | Persist Kitty env vars (shared + per-session) + tab reset | No | None |
| `LoadContext.hook.ts` | Inject dynamic context (relationship, learning, work) | Yes (stdout) | `settings.json`, `MEMORY/` |
| *(TOOLS)* `FreshnessCache.ts` | Statusline freshness cache (async) | No | None |
| *(TOOLS)* `SettingsBackport.ts` + `MergeSettings.ts` | Backport drift, then regenerate `settings.json` from `settings.system.json` + `settings.user.json` (async) | No | `settings.system.json`, `LIFEOS/USER/CONFIG/settings.user.json` |

### UserPromptSubmit Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `PromptProcessing.hook.ts` | Tab title + session naming via Haiku (async) | No | Inference (Haiku), `session-names.json` |
| `SatisfactionCapture.hook.ts` | Rating capture + low-rating learning signals (async) | No | `last-response.txt` (from LastResponseCache), `ratings.jsonl` |
| `ReminderRouter.hook.ts` | Precision-biased "remind me to X" → labeled issue in `WORK.REPO` (async) | No | `WORK.REPO` config, `gh` CLI |
| `MemoryTurnStart.hook.ts` | Memory dispatcher: hot-layer `<lifeos-memory>` injection + delta/health surfacing | Yes (stdout) | `MEMORY/`, sub-hooks (see [dispatchers](#consolidation-dispatchers)) |

### PreToolUse Hooks

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `ContextReduction.hook.sh` | Bash | rtk rewrite of STATUS-path commands only (git/gh/test/build/lint/containers — 60-90% token savings). READ-path commands (rg/grep, cat/head, ls/tree/find, diff, curl/wget, psql/aws) are NEVER rewritten: rtk's parse-fail falls back to a different binary (rg→BSD grep) and silently corrupts results the model reasons over. Invariant in hook header; incident 2026-06-10. Regression gate: `cd hooks && bun test ContextReduction.test.ts` (30 probes — read-path identity + kept-class structure). | Yes (updatedInput) | `rtk` binary, `jq` |
| *(Pulse HTTP route)* SkillGuard | Skill | Erroneous-invocation guard | No | Pulse server `localhost:31337` |
| *(Pulse HTTP route)* AgentGuard | Agent | Foreground agent warn / background watchdog inject | No | Pulse server `localhost:31337` |
| `AgentInvocation.hook.ts` | Agent | Log subagent_start with real subagent_type | No | `MEMORY/OBSERVABILITY/` |
| `TabState.hook.ts` | AskUserQuestion | Set question tab (teal) + save previous title | No | Kitty terminal |
| `PreToolGuard.hook.ts` | Bash\|Write\|Edit\|MultiEdit | Blocking-guard dispatcher: SYSTEM-file deny, raw-email guard, egress-class ceiling (see [dispatchers](#consolidation-dispatchers)) | Yes (exit 2 on block) | sub-hook guards, `lib/` |

> **Note:** AgentGuard and SkillGuard are NOT files on disk — they run as routes within the Pulse server.

### PostToolUse Hooks

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `AgentInvocation.hook.ts` | Agent | Log subagent_stop with duration | No | `MEMORY/OBSERVABILITY/` |
| `Safety.hook.ts` | WebFetch / WebSearch | Tag external content with "treat as data" warning + injection-shape marker. Same file as the PermissionRequest hook below; dispatches by event. | No | `lib/safety-classifier.ts` |
| `TabState.hook.ts` | AskUserQuestion | Restore tab to working state after question answered | No | Kitty terminal |
| `ISASync.hook.ts` | Write / Edit / MultiEdit | Sync ISA frontmatter → `work.json` + render-state tracking | No | `MEMORY/WORK/`, `work.json` |
| `CheckpointPerISC.hook.ts` | Write / Edit / MultiEdit | Auto-commit per-ISC durability checkpoint | No | `~/.claude/checkpoint-repos.txt` |
| `EventLogger.hook.ts` | (catch-all, async) | Ground-truth audit log of every tool call + ISA heartbeat bump | No | `MEMORY/OBSERVABILITY/tool-activity.jsonl` |

### PermissionRequest Hooks

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `Safety.hook.ts` | Write / Edit / MultiEdit / Bash, mcp__.* | Shape-classifier gate on outgoing tool calls. Auto-allows safe shapes (read-only commands, dev binaries, trusted-workspace paths, shell-control-flow over data, mcp pre-vetted). Falls through to native engine prompt on dangerous/credential/injection shapes or unknown commands. Cache + observability. Same file as the PostToolUse hook above; dispatches by event. | Yes (allow JSON when safe) | `lib/safety-classifier.ts`, `MEMORY/STATE/permission-cache.json`, `MEMORY/OBSERVABILITY/permission-decisions.jsonl` |

### PostToolUseFailure Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `EventLogger.hook.ts` | Log tool failures for debugging observability | No | `MEMORY/OBSERVABILITY/` |
| `AlgorithmNudge.hook.ts` | Algorithm live nudge layer (run-scoped nudges + always-on late-ISA advisory) | No (additionalContext) | `MEMORY/STATE/` |

### Stop Hooks (in fire order — matters for the LastResponseCache → SatisfactionCapture bridge)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `LastResponseCache.hook.ts` | Cache last response for SatisfactionCapture bridge | No | None |
| `TabState.hook.ts` | Reset Kitty tab title/color to completion state | No | Kitty terminal, `handlers/TabState.ts` |
| `VoiceCompletion.hook.ts` | Send 🗣️ voice line to TTS server | No | Voice Server |
| `ISARenderOnStop.hook.ts` | Re-render ISAs edited this turn (only after first `phase: complete` — pre-completion edits never render) | No | `ISARender.ts`, `MEMORY/STATE/isa-render-debounce/` |
| `StopGates.hook.ts` | Quality-gate dispatcher: format → verification → writing gates; first block wins (see [dispatchers](#consolidation-dispatchers)) | Yes (decision on block) | sub-hook gates, `lib/transcript-evidence.ts` |
| `MemoryReviewFire.hook.ts` | Owns the whole memory-review cadence: turn counter + time threshold → fire review | No | `MEMORY/STATE/` |

### StopFailure Hooks

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `EventLogger.hook.ts` | Log API errors (rate limit, auth, server errors) | No | `MEMORY/OBSERVABILITY/` |

### TaskCreated Hooks

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `TaskGovernance.hook.ts` | Block empty descriptions; rate-limit 50 tasks/session | Yes (decision) | None (per-session counter in `/tmp`) |

### ConfigChange Hooks

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `EventLogger.hook.ts` | Settings.json diff log for security audit | No | `MEMORY/OBSERVABILITY/config-changes.jsonl` |

### Subagent Lifecycle Hooks

Subagent lifecycle is tracked via `AgentInvocation.hook.ts` on `PreToolUse:Agent` and `PostToolUse:Agent` — Claude Code's built-in `SubagentStart`/`SubagentStop` payloads omit `subagent_type` / `description` / `prompt`, so we capture at the tool-use boundary where that data is reliably present.

Outputs: `subagent-events.jsonl` (start + stop events), correlated by `session_id + description`.

### SessionEnd Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `WorkCompletionLearning.hook.ts` | Extract learnings from work | No | Inference API, `MEMORY/LEARNING/` |
| `SessionCleanup.hook.ts` | Mark work complete + clear state | No | `MEMORY/WORK/`, `MEMORY/STATE/work.json` |
| `UpdateCounts.hook.ts` | Update settings.json counts (skills/hooks/...) + Anthropic usage cache | No | `settings.json`, Anthropic API |
| `MemoryHealthGate.hook.ts` | Run autonomic-memory health check; one-line stderr warning when overall != ok | No | `MEMORY/OBSERVABILITY/memory-health.jsonl` |
| `DocIntegrity.hook.ts` | Cross-ref + semantic drift checks + arch summary regen | No | Inference API, handlers/ |
| `IntegrityCheck.hook.ts` | System file change detection → spawn IntegrityMaintenance | No | `MEMORY/STATE/integrity-state.json`, handlers/ |

---

## Consolidation Dispatchers

The 2026-07-10/11 consolidation replaced families of single-purpose hooks with one registered dispatcher per event class. Each dispatcher reads stdin ONCE and calls its sub-hooks' exported `run()`/`check()`; every sub-hook file remains on disk, owns its logic and fail policy, and stays runnable standalone via its own `import.meta.main` shim. Sub-hooks are NOT registered in `hooks.json` — only their dispatcher is.

| Dispatcher (registered) | Event | Sub-hooks (in dispatch order) | Semantics |
|---|---|---|---|
| `StopGates.hook.ts` | Stop | `FormatGate` → `VerificationGate` → `WritingGate` | First `decision:"block"` wins; each gate fails open; the dispatcher never breaks a Stop |
| `PreToolGuard.hook.ts` | PreToolUse | Write/Edit/MultiEdit → `SystemFileGuard`; Bash → `CommunicationSkillGuard`, then `EgressClassGuard` | First block wins (stderr + exit 2). Fail policies preserved per guard: SystemFileGuard fail-open, CommunicationSkillGuard fail-open, EgressClassGuard fail-closed on a Tier-2-signature call |
| `MemoryTurnStart.hook.ts` | UserPromptSubmit | `LoadMemory` → `MemoryDeltaSurface` | Outputs concatenated; sub-hook errors caught per-run(); never blocks a prompt |
| `TabState.hook.ts` | PreToolUse / PostToolUse / Stop | (single file, dispatches on `hook_event_name`) | Question tab → restore → completion reset |
| `EventLogger.hook.ts` | PostToolUse / PostToolUseFailure / ConfigChange / StopFailure | (single file, dispatches on `hook_event_name`) | Append-JSONL observability only; no model-context output |
| `Safety.hook.ts` | PostToolUse / PermissionRequest | (single file, dispatches on `hook_event_name`) | Tag external content / auto-allow safe shapes |

Also on disk but not registered by this manifest: `PostToolObserver.hook.ts` (sync catch-all dispatcher for `LoopDetector` + `AlgorithmNudge`), `LoopDetector.hook.ts` (reached only via PostToolObserver), and `DriftReminder.hook.ts`. See `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` for the fuller post-consolidation account.

---

## Inter-Hook Dependencies

### Prompt-Start Flow

```
User Message
    │
    ├─► PromptProcessing ── Tab title (Haiku) + session naming (Haiku) ──► tab state + session-names.json
    ├─► SatisfactionCapture ── Rating + signals (reads last-response.txt) ──► ratings.jsonl + learning capture
    ├─► ReminderRouter ── precision-biased reminder parser ──► labeled issue in WORK.REPO
    └─► MemoryTurnStart ── LoadMemory + MemoryDeltaSurface ──► <lifeos-memory> context injection
```

There is no per-prompt mode/tier classifier: `TheRouter.hook.ts` was retired entirely in the 2026-07-11 consolidation (classification abolished — the model discovers difficulty from the work; model rungs live in `LIFEOS/TOOLS/models.ts` + `AgentInvocation.hook.ts`). SatisfactionCapture reads `last-response.txt` written by `LastResponseCache.hook.ts` at the previous Stop.

### Stop → UserPromptSubmit Bridge

```
Stop:
  LastResponseCache  →  writes MEMORY/STATE/last-response.txt
  TabState           →  Kitty tab → completion state
  VoiceCompletion    →  🗣️ line → TTS
  ISARenderOnStop    →  re-render ISAs edited this turn
  StopGates          →  format/verification/writing gates (may block for a recovery turn)
  MemoryReviewFire   →  cadence tick; fires memory review at threshold

[Next user prompt arrives]

UserPromptSubmit:
  PromptProcessing        (independent of last-response)
  SatisfactionCapture  ◄─ reads last-response.txt for sentiment scoring
  ReminderRouter          (independent of last-response)
  MemoryTurnStart         (independent of last-response)
```

### Work Tracking Flow

```
SessionStart
    │
    ▼
Algorithm (AI) ─► Creates WORK/<slug>/ISA.md directly
    │                                          │
    │                                          ▼ ISASync.hook.ts (PostToolUse)
    │                               MEMORY/STATE/work.json
    │                              (canonical session registry,
    │                               keyed by slug, includes sessionUUID)
    ▼
SessionEnd ─┬─► WorkCompletionLearning ─► reads work.json by sessionUUID
            └─► SessionCleanup ─► Marks phase=complete in work.json
```

**Coordination:** `MEMORY/STATE/work.json` is the shared registry. `ISASync` writes it on every ISA edit; `PromptProcessing` upserts native rows; SessionEnd hooks resolve "what was this session working on" by matching `sessionUUID`. The legacy `current-work.json` / `current-work-{sessionId}.json` contract was a phantom (read by 7+ files, written by zero) and is gone — `work.json` is the single source of truth.

### Voice + Tab State Flow

```
UserPromptSubmit
    ├─► PromptProcessing
    │       ├─► Sets tab to PURPLE (#5B21B6) ─► "🧠 Processing..."
    │       ├─► Single Haiku inference (title + name)
    │       └─► Sets tab to ORANGE (#B35A00) ─► "⚙️ Fixing auth..."
    └─► (other UserPromptSubmit hooks: no tab interaction)

PreToolUse (AskUserQuestion)
    └─► TabState ─► Sets tab to question state (teal) ─► Shows question summary

PostToolUse (AskUserQuestion)
    └─► TabState ─► Restores tab to working state

Stop
    ├─► TabState → completion state + past-tense title
    └─► VoiceCompletion → 🗣️ TTS announcement
```

---

## Data Flow Diagrams

### Memory System Integration

```
┌──────────────────────────────────────────────────────────────────┐
│                         MEMORY/                                  │
├────────────────┬─────────────────┬───────────────────────────────┤
│    WORK/       │   LEARNING/     │   STATE/  +  OBSERVABILITY/   │
│ ┌────────────┐ │ ┌─────────────┐ │ ┌───────────────────────────┐ │
│ │ Session    │ │ │ SIGNALS/    │ │ │ work.json (sessions)      │ │
│ │ ISA.md     │ │ │ ratings.jsonl│ │ │ last-response.txt         │ │
│ │ ephemeral/ │ │ │ FAILURES/   │ │ │ session-names.json        │ │
│ └─────▲──────┘ │ └──────▲──────┘ │ │ tool-activity.jsonl       │ │
└───────┼────────┴────────┼────────┴─┴───────▲───────────────────┴─┘
        │                 │                  │
┌───────┴─────────────────┴──────────────────┴─────────────────────┐
│                            HOOKS                                 │
│  ISASync ─────────────────────────────────────► work.json        │
│  PromptProcessing ────────────────────────────► session-names.json│
│  SatisfactionCapture ─────────────────────────► ratings.jsonl    │
│  LastResponseCache ───────────────────────────► last-response.txt│
│  EventLogger ────────────► tool-activity + failures + config     │
│  AgentInvocation ─────────────────────────────► subagent-events  │
│  MemoryTurnStart ◄──────── reads hot layer ──── MEMORY/          │
│  MemoryReviewFire ────────────────────────────► review state     │
│  MemoryHealthGate ────────────────────────────► memory-health    │
│  WorkCompletionLearning ──────────────────────► LEARNING/        │
│  SessionCleanup ──────────────────────────────► WORK/ + state    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Shared Libraries

Located in `hooks/lib/`:

| Library | Purpose | Used By |
|---------|---------|---------|
| `identity.ts` | Get DA name, principal from settings | Most hooks |
| `time.ts` | PST timestamps, ISO formatting | Rating hooks, work hooks |
| `paths.ts` | Canonical path construction | All hooks |
| `notifications.ts` | ntfy push notifications | SessionEnd hooks |
| `output-validators.ts` | Tab title + voice output validation | PromptProcessing, TabState, VoiceCompletion |
| `isa-utils.ts` | ISA / work.json manipulation | PromptProcessing, ISASync |
| `isa-template.ts` | ISA markdown template | Algorithm |
| `hook-io.ts` | Shared stdin reader + transcript parser | All Stop hooks |
| `learning-utils.ts` | Learning categorization | Rating hooks, WorkCompletion |
| `change-detection.ts` | Detect file/code changes via transcript parse | IntegrityCheck (SystemIntegrity handler) |
| `tab-constants.ts` | Tab title colors and states | tab-setter.ts |
| `tab-setter.ts` | Kitty + cmux tab title manipulation | All tab-related hooks |
| `containment-zones.ts` | Release-pipeline zone inventory | `ShadowRelease.ts` (used at release time, not by runtime hooks) |
| `learning-readback.ts` | Read prior failures for context | WorkCompletionLearning |

> Note: there is no log-rotation lib — observability JSONLs are NOT auto-rotated today. Rotation is queued with the sensor-loop iteration. (The former log-rotation lib here was dead code with zero importers and was removed 2026-06-12.)

---

## Configuration

`hooks/hooks.json` is the registration manifest for this directory — `skills/LifeOS/Tools/InstallHooks.ts` installs its entries into `settings.json` under the `hooks` key, and the running session reads them from there. Entry shape:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "$HOME/.claude/hooks/KittyEnvPersist.hook.ts" },
          { "type": "command", "command": "$HOME/.claude/hooks/LoadContext.hook.ts" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "$HOME/.claude/hooks/ContextReduction.hook.sh" }
        ]
      },
      {
        "matcher": "Skill",
        "hooks": [
          { "type": "http", "url": "http://localhost:31337/hooks/skill-guard" }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "Write|Edit|MultiEdit|Bash",
        "hooks": [
          { "type": "command", "command": "$HOME/.claude/hooks/Safety.hook.ts" }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

For `PreToolUse` and `PostToolUse` hooks, matchers filter by tool name:
- `"Bash"`, `"Edit"`, `"Write"`, `"MultiEdit"`, `"Read"`, `"Skill"`, `"Agent"`, `"AskUserQuestion"`, `"WebFetch"`, `"WebSearch"`
- Empty matcher (or absent) = catch-all on the event.

---

## Documentation Standards

### Hook File Structure

Every hook MUST follow this documentation structure:

```typescript
#!/usr/bin/env bun
/**
 * HookName.hook.ts - [Brief Description] ([Event Type])
 *
 * PURPOSE:
 * [2-3 sentences explaining what this hook does and why it exists]
 *
 * TRIGGER: [Event type, e.g., UserPromptSubmit]
 *
 * INPUT:
 * - [Field]: [Description]
 *
 * OUTPUT:
 * - stdout: [What gets injected into context, if any]
 * - exit(0): [Normal completion]
 * - exit(2): [Hard block, when applicable]
 *
 * SIDE EFFECTS:
 * - [File writes]
 * - [External calls]
 * - [State changes]
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: [Other hooks this requires]
 * - COORDINATES WITH: [Hooks that share data/state]
 * - MUST RUN BEFORE: [Ordering constraints]
 * - MUST RUN AFTER: [Ordering constraints]
 *
 * ERROR HANDLING:
 * - [How errors are handled]
 *
 * PERFORMANCE:
 * - [Blocking vs async]
 * - [Typical execution time]
 */

// Implementation follows...
```

### Update Protocol

When modifying ANY hook:

1. Update the hook's header documentation
2. Update this README's Hook Registry section
3. Update Inter-Hook Dependencies if relationships change
4. Update Data Flow Diagrams if data paths change
5. Test the hook in isolation AND with related hooks

---

## Maintenance Checklist

### Adding a New Hook

- [ ] Create hook file with full documentation header
- [ ] Add to `hooks/hooks.json` under the appropriate event (and re-run InstallHooks, or add to `settings.json` directly on a live install)
- [ ] Add to Hook Registry table in this README
- [ ] Document inter-hook dependencies
- [ ] Update Data Flow Diagrams if needed
- [ ] Add to shared library imports if using `lib/`
- [ ] Test hook in isolation
- [ ] Test hook with related hooks
- [ ] Verify no performance regressions

### Modifying an Existing Hook

- [ ] Update inline documentation
- [ ] Update hook header if behavior changes
- [ ] Update this README if interface changes
- [ ] Update inter-hook docs if dependencies change
- [ ] Test modified hook
- [ ] Test hooks that depend on this hook

### Removing a Hook

- [ ] Remove from `hooks/hooks.json` AND `settings.json`
- [ ] Remove from Hook Registry in this README
- [ ] Update inter-hook dependencies
- [ ] Update Data Flow Diagrams
- [ ] Check for orphaned shared state files
- [ ] Tag pre-state for restoration: `git tag pre-<change>-YYYY-MM-DD`
- [ ] Per-hook commit with rationale + restore command in body
- [ ] Delete hook file
- [ ] Test related hooks still function

---

## Troubleshooting

### Hook Not Executing

1. Verify hook is in `settings.json` under correct event (and in `hooks/hooks.json` so installs carry it)
2. Check shebang: `#!/usr/bin/env bun`
3. Run manually: `echo '{"session_id":"test"}' | bun hooks/HookName.hook.ts`
4. For Pulse HTTP routes (AgentGuard, SkillGuard): verify Pulse is running at `localhost:31337/health`
5. Exec-bit lost (`Permission denied` in hook output)? `HookHealer.hook.ts` repairs this class at next SessionStart; run it manually to fix now.

### Hook Blocking Session

1. Check if hook writes to stdout (only LoadContext and MemoryTurnStart inject context; PreToolGuard/StopGates/TaskGovernance emit blocking decisions by design)
2. Verify timeouts are set for external calls
3. Check for infinite loops or blocking I/O

### External Content Tagging

1. Verify `Safety.hook.ts` registered on `PostToolUse` with matcher `WebFetch` and `WebSearch`
2. Test: `echo '{"session_id":"t","hook_event_name":"PostToolUse","tool_name":"WebFetch","tool_input":{},"tool_response":"hello"}' | bun hooks/Safety.hook.ts`

### Permission Auto-Approval

1. Verify `Safety.hook.ts` registered on `PermissionRequest` with matcher `Write|Edit|MultiEdit|Bash`
2. Test: `echo '{"session_id":"t","hook_event_name":"PermissionRequest","tool_name":"Bash","tool_input":{"command":"ls /tmp"}}' | bun hooks/Safety.hook.ts` — should emit `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}`
3. Tail observability: `tail -f ~/.claude/LIFEOS/MEMORY/OBSERVABILITY/permission-decisions.jsonl`

---

## Migration Notes

### 2026-07-24 — README resynced to v7.1.1 registration truth

This README's event inventory had drifted from `hooks/hooks.json` — it still described the pre-consolidation topology. Resynced. The underlying changes (all landed in the 2026-07-10/11 consolidation + BPE passes; see `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` for full details):

- **Consolidated into dispatchers:** `SetQuestionTab` + `QuestionAnswered` + `ResponseTabReset` → `TabState`; `ToolActivityTracker` + `SkillExecutionLog` + `ToolFailureTracker` + `ConfigAudit` + `StopFailureHandler` → `EventLogger`; format/verification/writing gate registrations → `StopGates`; `SystemFileGuard` + `CommunicationSkillGuard` + `EgressClassGuard` → `PreToolGuard`; `MemoryReviewTrigger` + `LoadMemory` + `MemoryDeltaSurface` → `MemoryTurnStart` (cadence moved to `MemoryReviewFire` on Stop).
- **Retired:** `TheRouter.hook.ts` (mode/tier classification abolished — no successor classifier), `ArtWorkflowGuard`, `TelosSummarySync`, `PreCompact`/`RestoreContext` (events unregistered), `InstructionsLoadedHandler`, `RelationshipMemory` (deleted 7.0.0), `IsaNudge` (renamed → `AlgorithmNudge`).
- **Not in the public payload:** `ULWorkSync.hook.ts` is a private, rsync-excluded hook (see `LIFEOS/DOCUMENTATION/Work/WorkSystem.md`); it no longer appears in this README's inventory.
- **Added to the inventory:** `HookHealer`, `MemoryTurnStart`, `PreToolGuard`, `TabState`, `EventLogger`, `AlgorithmNudge`, `ISARenderOnStop`, `StopGates`, `MemoryReviewFire`, `MemoryHealthGate` (moved Stop → SessionEnd 2026-07-11).

### 2026-05-06 — bpe-cuts

Removed:
- `RepeatDetection.hook.ts` (UserPromptSubmit) — pre-classifier-era safety net, redundant with the model reading conversation context.
- `TeammateIdle.hook.ts` (TeammateIdle) — pure logging hook with zero readers.
- `ElicitationHandler.hook.ts` (Elicitation) — pure logging hook with zero readers.
- `FileChanged.hook.ts` (FileChanged) — duplicate of tool-activity capture.

Trimmed:
- `TaskGovernance.hook.ts` — audit log writes removed (zero readers); rate-limit + quality-gate behavior preserved.
- `PromptProcessing.hook.ts` — docstring rewritten to accurately reflect single responsibility (tab + naming, no longer claims classification).

Pre-state tag: `pre-bpe-cuts-2026-05-06`. Restoration: see `LIFEOS/MEMORY/WORK/20260506-comprehensive-hook-bpe-audit/RESTORATION.md`.

### 2026-05-06 — security simplification

Removed (`a4e3522ca`):
- `SecurityPipeline.hook.ts`, `ContentScanner.hook.ts`, `PromptGuard.hook.ts`, `SmartApprover.hook.ts`, `ContainmentGuard.hook.ts`
- `hooks/security/` directory (pipeline, types, logger, 5 inspectors)
- `LIFEOS/USER/SECURITY/{PATTERNS.yaml, ...}` plus 8 of 9 `LIFEOS/DOCUMENTATION/Security/*.md`

Replacement: native `permissions.deny` in `settings.json` (42 entries) + a single 48-LOC `PromptInjection.hook.ts` on WebFetch/WebSearch. The model is the security boundary.

### 2026-04-19 — naming-context isolation

`PromptProcessing.hook.ts` (then `SessionAnalysis.hook.ts`) `getRecentContext()` strips Assistant turns when `isFirstPrompt` is true. Session names are permanent; Algorithm scaffolding in assistant output (phase headers, agent names, SUMMARY lines) must never reach the naming prompt.

### Earlier — classifier split

`PromptProcessing.hook.ts` (formerly `SessionAnalysis.hook.ts`) once briefly held the `Mode + Tier` classifier role. That responsibility was extracted to `TheRouter.hook.ts` to give the classifier its own three-stage cascade with dedicated telemetry; `TheRouter` itself was later retired entirely (see the 2026-07-24 note above).
