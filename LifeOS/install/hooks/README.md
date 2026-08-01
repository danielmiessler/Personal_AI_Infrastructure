# LifeOS Hook System

> **Lifecycle event handlers that extend Claude Code with voice, memory, classifier routing, and integrity checks.**

This document is the authoritative reference for LifeOS's hook system. When modifying any hook, update both the hook's inline documentation AND this README.

*Last updated: 2026-07-29 — registry regenerated against `settings.json` (48 `.hook.ts` on disk, 37 registered, 11 dispatched-only). Ports public PRs #1595 / #1591, credit @anikinsasha.*

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hook Lifecycle Events](#hook-lifecycle-events)
3. [Hook Registry](#hook-registry)
4. [Inter-Hook Dependencies](#inter-hook-dependencies)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Shared Libraries](#shared-libraries)
7. [Configuration](#configuration)
8. [Documentation Standards](#documentation-standards)
9. [Maintenance Checklist](#maintenance-checklist)
10. [Migration Notes](#migration-notes)

---

## Architecture Overview

Hooks are TypeScript scripts that execute at specific lifecycle events in Claude Code. They enable:

- **Event nudges**: `AlgorithmNudge` fires bounded, deterministic questions at answerable moments (skill USE WHEN matches, depth directives, run state) — the mode/tier classifier (`TheRouter`) and the MINIMAL/NATIVE/ALGORITHM modes were retired 2026-07-11
- **Voice feedback**: spoken phase announcements and completion lines
- **Memory capture**: session summaries, work tracking, learnings, relationship notes
- **Security**: native `permissions.deny` + a single `Safety.hook.ts` that dispatches by event — gates outgoing tool calls (PermissionRequest) and tags external content (PostToolUse)
- **Context injection**: identity, dynamic context, post-compaction restoration

### Design Principles

1. **Non-blocking by default**: Hooks should not delay the user experience.
2. **Fail gracefully**: Errors in one hook must not crash the session.
3. **Single responsibility**: Each hook does one thing well.
4. **Shared utilities over duplication**: Use `hooks/lib/hook-io.ts` for stdin reading.
5. **The model is the security boundary**: Constitutional Security Protocol in `LIFEOS_SYSTEM_PROMPT.md` + native `permissions.deny` in `settings.json`. Hooks don't enforce — they tag.

### Execution Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude Code Session                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SessionStart ──┬──► HookHealer (exec-bit self-heal)                │
│                 ├──► KittyEnvPersist (terminal env + tab reset)     │
│                 ├──► LoadContext (dynamic context injection)        │
│                 ├──► FreshnessCache (statusline jq cache)           │
│                 └──► SettingsBackport + MergeSettings (config merge) │
│                                                                     │
│  UserPromptSubmit ──┬──► PromptProcessing (tab title + naming)      │
│                     ├──► SatisfactionCapture (rating + signals)     │
│                     ├──► ReminderRouter (/remind → labeled issue)   │
│                     ├──► VersionDrift (core-surface drift → /vb)    │
│                     ├──► DriftReminder (doctrine drift surfacing)   │
│                     ├──► MemoryTurnStart (hot-layer + deltas)       │
│                     ├──► AlgorithmNudge (deterministic event nudges)│
│                     └──► TimeContext (live wall-clock line)         │
│                                                                     │
│  PreToolUse ──┬──► ContextReduction (Bash → rtk rewrite)            │
│               ├──► SkillGuard (HTTP route on Pulse 31337)           │
│               ├──► AgentGuard (HTTP route on Pulse 31337)           │
│               ├──► AgentInvocation (Agent → subagent_start)         │
│               ├──► TabState (AskUserQuestion → teal tab)            │
│               └──► PreToolGuard (Bash/Write/Edit/MultiEdit blockers)│
│                                                                     │
│  PostToolUse ──┬──► AgentInvocation (Agent → subagent_stop)         │
│                ├──► Safety (WebFetch/WebSearch/mail/ToolSearch tag) │
│                ├──► TabState (AskUserQuestion → reset tab)          │
│                ├──► ISAStaleWriteGuard (Read/Write/Edit/MultiEdit)  │
│                ├──► ISASync (Write/Edit/MultiEdit → work.json)      │
│                ├──► CheckpointPerISC (Write/Edit/MultiEdit commit)  │
│                ├──► ConfigEvalFire (Write/Edit/MultiEdit → evals)   │
│                ├──► AtlasEventCapture (Bash/Write/Edit/MultiEdit)   │
│                ├──► PostToolObserver (catch-all sync dispatcher)    │
│                ├──► LoopDetector (catch-all loop/oscillation watch) │
│                └──► EventLogger (catch-all observability)           │
│                                                                     │
│  PostToolUseFailure ──┬──► EventLogger (error logging)              │
│                       ├──► AlgorithmNudge (failure-state nudge)     │
│                       └──► LoopDetector (repeat-failure detection)  │
│                                                                     │
│  Stop ──┬──► LastResponseCache (cache for SatisfactionCapture)      │
│         ├──► TabState           (Kitty tab reset)                   │
│         ├──► VoiceCompletion    (TTS voice line)                    │
│         ├──► ISARenderOnStop    (re-render edited ISAs)             │
│         ├──► SpendAuditor       (outcome-side spend verification)   │
│         ├──► StopGates          (Format/Verification/ISA/Writing)   │
│         ├──► MemoryReviewFire   (memory-review cadence)             │
│         └──► MemoryHealthGate   (autonomic memory health check)     │
│                                                                     │
│  StopFailure ──► EventLogger (API error logging)                    │
│  PermissionRequest ──► Safety (shape-classifier allow gate)         │
│  TaskCreated ──► TaskGovernance (rate-limit + quality gate)         │
│  ConfigChange ──► EventLogger (settings.json diff log)              │
│                                                                     │
│  SessionEnd ──┬──► WorkCompletionLearning (insight extraction)      │
│               ├──► SessionCleanup (work completion + state clear)   │
│               ├──► UpdateCounts (settings.json counts + cache)      │
│               ├──► MemoryHealthGate (end-of-session memory health)  │
│               ├──► DocIntegrity (cross-refs + arch summary regen)   │
│               ├──► IntegrityCheck (system file change detection)    │
│               └──► ULWorkSync (Algorithm work → GitHub issue)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hook Lifecycle Events

| Event | When It Fires | Typical Use Cases |
|-------|---------------|-------------------|
| `SessionStart` | Session begins | Exec-bit self-heal, context loading, terminal env, freshness cache, settings merge |
| `UserPromptSubmit` | User sends a message | Tab title, session naming, satisfaction capture, reminder routing, drift teeth, memory injection, event nudges, wall clock |
| `PreToolUse` | Before a tool executes | Command rewrite, skill/agent enforcement, blocking guards, UI state |
| `PostToolUse` | After a tool executes | ISA sync, checkpoint commit, Atlas capture, observability, external content tagging, loop detection |
| `PostToolUseFailure` | Tool execution fails | Error tracking, failure-state nudges, repeat-failure detection |
| `Stop` | Claude responds | Voice feedback, tab updates, ISA render, spend audit, output gates, memory cadence |
| `StopFailure` | Turn ends due to API error | Error logging |
| `PermissionRequest` | Native permission engine asks | Shape-classifier auto-allow for safe tool calls |
| `TaskCreated` | Subagent creates a task | Rate-limit + quality gate |
| `ConfigChange` | settings.json modified | Security audit trail |
| `SessionEnd` | Session terminates | Learning extraction, cleanup, counts, memory health, doc integrity, GitHub sync |

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

> **Census (2026-07-29).** 48 `.hook.ts` files exist on disk; **37 distinct `.hook.ts` files are registered in `settings.json`** (38 counting `ContextReduction.hook.sh`), plus 2 Pulse HTTP routes. The other 11 `.hook.ts` files are NOT dead — each is imported as a `run()`/`check()` module by a consolidating dispatcher and remains runnable standalone via its own shim. See [Dispatched-Only Modules](#dispatched-only-modules) below. This registry is generated against `settings.json`; when the two disagree, `settings.json` wins.
>
> LifeOS registers hooks **bare** — the path alone, no `bun` prefix — relying on the `#!/usr/bin/env bun` shebang plus the executable bit. `HookHealer` is the one deliberate exception (it carries an explicit `bun` prefix so it can still repair a cleared exec bit on everything else).

### SessionStart Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `HookHealer.hook.ts` | Restore the `+x` bit on registered hook scripts the Write tool created as 0644 | No | `settings.json` (timeout 10; the one `bun`-prefixed registration) |
| `KittyEnvPersist.hook.ts` | Persist Kitty env vars + tab reset | No | None |
| `LoadContext.hook.ts` | Inject dynamic context (identity, work, projects) | Yes (stdout) | `settings.json`, `MEMORY/` |
| (inline) `LIFEOS/TOOLS/FreshnessCache.ts` | Statusline freshness cache (`--quiet`) | No | None (timeout 5) |
| (inline) `SettingsBackport.ts` + `MergeSettings.ts` | Merge `settings.system.json` + `USER/CONFIG/settings.user.json` → `settings.json` | No | System/user settings split (timeout 15) |

### UserPromptSubmit Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `PromptProcessing.hook.ts` | Tab title + session naming | No | Inference, Voice Server, `session-names.json` (timeout 30) |
| `SatisfactionCapture.hook.ts` | Rating capture + low-rating learning signals | No | `last-response.txt` (from LastResponseCache), `ratings.jsonl` (timeout 20) |
| `ReminderRouter.hook.ts` | "remind me to X" → labeled GitHub issue | No | `WORK.REPO` config, `gh` CLI (timeout 5) |
| `VersionDrift.hook.ts` | Deterministic version-drift tooth — core surface drifted past last bump → surface `/vb` | No | Ledger registry, version anchors (timeout 10) |
| `DriftReminder.hook.ts` | Surface doctrine/behaviour drift reminders | No | `MEMORY/STATE/` (timeout 5) |
| `MemoryTurnStart.hook.ts` | The ONE per-prompt memory hook — dispatches `LoadMemory` + `MemoryDeltaSurface` | No | `USER/PRINCIPAL/PRINCIPAL_MEMORY.md`, `DA_MEMORY.md` (timeout 8) |
| `AlgorithmNudge.hook.ts` | Deterministic event nudges (skill USE WHEN match, depth directives, run state) → additionalContext | No | Prebuilt USE WHEN index — zero inference (timeout 5) |
| `TimeContext.hook.ts` | Inject a live, per-turn wall-clock line | No | `settings.json` `principal.timezone`, falls back to UTC (timeout 5). Ported from public PR #1511, credit @anikinsasha |

### PreToolUse Hooks (in fire order)

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `ContextReduction.hook.sh` | `Bash` | rtk rewrite of STATUS-path commands — scope is **git + gh only** (plus an interceptor-screenshot output redirect) as of the 2026-07-13 shrink; the old test/build/lint/container families were cut as dead weight for this stack. `rtk` is an OPTIONAL dependency — absent from PATH, the hook is an inert passthrough (never errors). READ-path commands (rg/grep, cat/head, ls/tree/find, diff, curl/wget, psql/aws) are NEVER rewritten: rtk's parse-fail falls back to a different binary (rg→BSD grep) and silently corrupts results the model reasons over. Invariant in hook header; incident 2026-06-10. Regression gate: `cd hooks && bun test ContextReduction.test.ts` (40 probes). **Stays a separate Bash hook** because it REWRITES the command (`updatedInput`) rather than blocking or allowing. | Yes (updatedInput) | `rtk` binary (optional), `jq` |
| *(Pulse HTTP route)* SkillGuard | `Skill` | Erroneous-invocation guard | No | Pulse server `localhost:31337` |
| *(Pulse HTTP route)* AgentGuard | `Agent` | Foreground agent warn / background watchdog inject | No | Pulse server `localhost:31337`, `Tools/AgentWatchdog.ts` |
| `AgentInvocation.hook.ts` | `Agent` | Log subagent_start with real subagent_type; log the resolved model for every dispatch | No | `MEMORY/OBSERVABILITY/` |
| `TabState.hook.ts` | `AskUserQuestion` | Set teal tab for questions | No | Kitty terminal |
| `PreToolGuard.hook.ts` | `Bash\|Write\|Edit\|MultiEdit` | The ONE PreToolUse blocking-guard dispatcher — reads stdin once, then runs `SystemFileGuard`, `CommunicationSkillGuard`, and `EgressClassGuard`, each in its own try/catch so one guard throwing can never suppress the others | Yes (decision) | `lib/system-file-guard-core.ts`, `lib/egress-class-core.ts`, `lib/containment-zones.ts` |

### PostToolUse Hooks

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `AgentInvocation.hook.ts` | `Agent` | Log subagent_stop with duration | No | `MEMORY/OBSERVABILITY/` |
| `Safety.hook.ts` | `WebFetch`, `WebSearch`, `mcp__.*(Gmail\|Mail\|Drive\|Calendar\|Inbox).*`, `ToolSearch` | Tag external content with "treat as data" warning + injection-shape marker. Same file as the PermissionRequest hook below; dispatches by event. | No | `lib/safety-classifier.ts` (timeout 5) |
| `TabState.hook.ts` | `AskUserQuestion` | Reset tab state after question answered | No | Kitty terminal |
| `ISAStaleWriteGuard.hook.ts` | `Read`, `Write`, `Edit`, `MultiEdit` | Stop a whole-file Write from silently discarding ISA changes the writing session never saw | No | ISA read-state ledger |
| `ISASync.hook.ts` | `Write`, `Edit`, `MultiEdit` | Sync ISA frontmatter (incl. `phase:`/`progress:`) → `work.json` + KV push | No | `MEMORY/WORK/`, `work.json` |
| `CheckpointPerISC.hook.ts` | `Write`, `Edit`, `MultiEdit` | Auto-commit per-ISC durability checkpoint — stages only paths dirty at-or-after the ISA's `started`, never the whole tree | No | `~/.claude/checkpoint-repos.txt` (timeout 30) |
| `ConfigEvalFire.hook.ts` | `Write`, `Edit`, `MultiEdit` | Fire behavioural evals when CLAUDE.md / OPERATIONAL_RULES / a hook changes. Never blocks the edit. | No | Evals harness |
| `AtlasEventCapture.hook.ts` | `Write`, `Edit`, `MultiEdit`, `Bash` | Mutation hints for the Atlas asset graph (deploys, DNS changes, tracked-asset edits) | No | Atlas store (timeout 5) |
| `PostToolObserver.hook.ts` | (catch-all) | The ONE sync catch-all — dispatches `SystemChangeSurface`. Must stay on the empty matcher so it fires on every tool call. | No | `lib/system-surfaces.ts` (timeout 5) |
| `LoopDetector.hook.ts` | (catch-all) | Exact-repeat / oscillation / hammering detection. Graduated to a direct registration — no longer dispatcher-only. | No | `MEMORY/STATE/` (timeout 5) |
| `EventLogger.hook.ts` | (catch-all) | Unified observability event logger — ground-truth audit log of every tool call | No | `MEMORY/OBSERVABILITY/tool-activity.jsonl` (timeout 5) |

### PermissionRequest Hooks

| Hook | Matcher | Purpose | Blocking | Dependencies |
|------|---------|---------|----------|--------------|
| `Safety.hook.ts` | `Write\|Edit\|MultiEdit\|Bash`, `mcp__.*` | Shape-classifier gate on outgoing tool calls. Auto-allows safe shapes (read-only commands, dev binaries, trusted-workspace paths, shell-control-flow over data, mcp pre-vetted). Falls through to the native engine prompt on dangerous/credential/injection shapes or unknown commands. Cache + observability. Same file as the PostToolUse hook above; dispatches by event. | Yes (allow JSON when safe) | `lib/safety-classifier.ts`, `MEMORY/STATE/permission-cache.json`, `MEMORY/OBSERVABILITY/permission-decisions.jsonl` |

### PostToolUseFailure Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `EventLogger.hook.ts` | Log tool failures for debugging observability | No | `MEMORY/OBSERVABILITY/` |
| `AlgorithmNudge.hook.ts` | Failure-state nudge on the failing tool call | No | Prebuilt nudge index (timeout 5) |
| `LoopDetector.hook.ts` | Repeat-failure / hammering detection | No | `MEMORY/STATE/` (timeout 5) |

### Stop Hooks (in fire order — matters for the LastResponseCache → SatisfactionCapture bridge)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `LastResponseCache.hook.ts` | Cache last response for the SatisfactionCapture bridge | No | None |
| `TabState.hook.ts` | Reset Kitty tab title/color after response | No | Kitty terminal |
| `VoiceCompletion.hook.ts` | Send 🗣️ voice line to TTS server | No | Voice Server |
| `ISARenderOnStop.hook.ts` | Re-render ISAs edited during the turn, from the per-session state file `ISASync` writes | No | `MEMORY/WORK/`, ISA renderer |
| `SpendAuditor.hook.ts` | Outcome-side spend verification — did a HEAVY ask get matching effort | No | `MEMORY/OBSERVABILITY/` |
| `StopGates.hook.ts` | The ONE Stop-event gate hook — dispatches `FormatGate`, `VerificationGate`, `ISACloseGate`, `ISAGate`, `WritingGate` | Yes (decision) | `lib/hook-io.ts`, `PangramScore.ts` (WritingGate) |
| `MemoryReviewFire.hook.ts` | Owns the whole memory-review cadence | No | `USER/CONFIG/memory-review.json`, `MEMORY/` |
| `MemoryHealthGate.hook.ts` | Autonomic-memory health check; never fails the Stop chain | No | `MEMORY/OBSERVABILITY/memory-health.jsonl` (timeout 15) |

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
| `EventLogger.hook.ts` | settings.json diff log for security audit | No | `MEMORY/OBSERVABILITY/config-changes.jsonl` |

### Subagent Lifecycle Hooks

Subagent lifecycle is tracked via `AgentInvocation.hook.ts` on `PreToolUse:Agent` and `PostToolUse:Agent` — Claude Code's built-in `SubagentStart`/`SubagentStop` payloads omit `subagent_type` / `description` / `prompt`, so we capture at the tool-use boundary where that data is reliably present.

Outputs: `subagent-events.jsonl` (start + stop events), correlated by `session_id + description`.

### SessionEnd Hooks (in fire order)

| Hook | Purpose | Blocking | Dependencies |
|------|---------|----------|--------------|
| `WorkCompletionLearning.hook.ts` | Extract learnings from work | No | Inference API, `MEMORY/LEARNING/` |
| `SessionCleanup.hook.ts` | Mark work complete + clear state | No | `MEMORY/WORK/`, `MEMORY/STATE/work.json` |
| `UpdateCounts.hook.ts` | Update settings.json counts (skills/hooks/...) + Anthropic usage cache | No | `settings.json`, Anthropic API |
| `MemoryHealthGate.hook.ts` | End-of-session autonomic-memory health check | No | `MEMORY/OBSERVABILITY/memory-health.jsonl` |
| `DocIntegrity.hook.ts` | Cross-ref + semantic drift checks + arch summary regen | No | Inference API, `handlers/` |
| `IntegrityCheck.hook.ts` | System file change detection → spawn IntegrityMaintenance | No | `MEMORY/STATE/integrity-state.json`, `handlers/` |
| `ULWorkSync.hook.ts` | Sync Algorithm work to GitHub issue in `WORK.REPO` | No | `gh` CLI, `WORK.REPO` config (timeout 60) |

### Dispatched-Only Modules

These 11 `.hook.ts` files are on disk but carry no direct `settings.json` registration. Each exports a `run()`/`check()` module its dispatcher imports, and each keeps a standalone shim so it can still be run by hand for debugging.

| Module | Dispatcher | Event |
|--------|-----------|-------|
| `SystemFileGuard.hook.ts` | `PreToolGuard.hook.ts` | PreToolUse |
| `CommunicationSkillGuard.hook.ts` | `PreToolGuard.hook.ts` | PreToolUse |
| `EgressClassGuard.hook.ts` | `PreToolGuard.hook.ts` | PreToolUse |
| `FormatGate.hook.ts` | `StopGates.hook.ts` | Stop |
| `VerificationGate.hook.ts` | `StopGates.hook.ts` | Stop |
| `ISACloseGate.hook.ts` | `StopGates.hook.ts` | Stop |
| `ISAGate.hook.ts` | `StopGates.hook.ts` | Stop |
| `WritingGate.hook.ts` | `StopGates.hook.ts` | Stop |
| `LoadMemory.hook.ts` | `MemoryTurnStart.hook.ts` | UserPromptSubmit |
| `MemoryDeltaSurface.hook.ts` | `MemoryTurnStart.hook.ts` | UserPromptSubmit |
| `SystemChangeSurface.hook.ts` | `PostToolObserver.hook.ts` | PostToolUse |

`LoopDetector` was formerly on this list; it graduated to a direct `PostToolUse` + `PostToolUseFailure` registration and is now a first-class registered hook.

### Retired Hooks

Removed from disk in the 2026-07-10 and 2026-07-11 consolidation passes. They appear in older docs and in the public repo's cut; none of them exist now.

| Retired hook | Where its behaviour went |
|--------------|--------------------------|
| `TheRouter.hook.ts` | Deleted outright — mode/tier classification abolished 2026-07-11. Model rungs live in `LIFEOS/TOOLS/models.ts` + `AgentInvocation.hook.ts` |
| `ToolActivityTracker`, `ToolFailureTracker`, `StopFailureHandler`, `ConfigAudit`, `InstructionsLoadedHandler` | Folded into `EventLogger.hook.ts` |
| `SetQuestionTab`, `QuestionAnswered`, `ResponseTabReset` | Folded into `TabState.hook.ts` |
| `RelationshipMemory` | Folded into the memory-review cadence (`MemoryReviewFire.hook.ts`) |
| `ArtWorkflowGuard` | Folded into the `PreToolGuard` dispatch chain |
| `TelosSummarySync` | Replaced by `DerivedSync.ts` + launchd `com.lifeos.derivedsync` (WatchPaths, not a hook) |
| `PreCompact`, `RestoreContext` | Compaction handover is handled by the harness's own summarization; no LifeOS hook registers on `PreCompact`/`PostCompact` |

---

## Inter-Hook Dependencies

### Event-Nudge Flow

```
User Message
    │
    ▼
AlgorithmNudge ─── deterministic, zero-inference matching against prebuilt indexes:
    │                 • skill USE-WHEN index (prompt matches a capability → "invoke it, don't handroll")
    │                 • depth-directive detection ("go heavy" / "quick pass" → likely a run)
    │                 • run-state rows (fire only inside a live Algorithm run)
    │
    └── Emit: bounded nudge lines → additionalContext via hookSpecificOutput.
        A row may only ask about an outcome already stated in the Algorithm file;
        rows that map phrases to mandated procedure are banned by construction.

PromptProcessing ── Tab title (Haiku) + session naming (Haiku) ──► tab state + session-names.json
SatisfactionCapture ── Rating + signals (reads last-response.txt) ──► ratings.jsonl + learning capture
ReminderRouter ── /remind parser ──► gh issue create with reminder labels
```

**No classifier.** The MINIMAL/NATIVE/ALGORITHM modes, the E1–E5 effort tiers, and the `TheRouter` classifier that predicted them were all retired 2026-07-11 — spend is discovered from the work, not predicted per prompt. SatisfactionCapture reads `last-response.txt` written by `LastResponseCache.hook.ts` at the previous Stop.

### Stop → UserPromptSubmit Bridge

```
Stop:
  LastResponseCache  →  writes MEMORY/STATE/last-response.txt
  TabState           →  Kitty tab → completion state
  VoiceCompletion    →  🗣️ line → TTS
  ISARenderOnStop    →  re-render ISAs edited this turn
  SpendAuditor       →  outcome-side spend verification
  StopGates          →  Format / Verification / ISA / Writing gates
  MemoryReviewFire   →  memory-review cadence
  MemoryHealthGate   →  memory health check

[Next user prompt arrives]

UserPromptSubmit:
  PromptProcessing     (independent of last-response)
  SatisfactionCapture  ◄─ reads last-response.txt for sentiment scoring
  ReminderRouter       (independent of last-response)
  MemoryTurnStart      (independent of last-response)
  AlgorithmNudge       (independent of last-response)
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
            ├─► ULWorkSync ─► finds slug via work.json, pushes ISA to gh issue in WORK.REPO
            └─► SessionCleanup ─► Marks phase=complete in work.json
```

**Coordination:** `MEMORY/STATE/work.json` is the shared registry. `ISASync` writes it on every ISA edit; `PromptProcessing` upserts native rows; SessionEnd hooks resolve "what was this session working on" by matching `sessionUUID`. The legacy `current-work.json` / `current-work-{sessionId}.json` contract was a phantom (read by 7+ files, written by zero) and is gone — `work.json` is the single source of truth.

### Voice + Tab State Flow

```
UserPromptSubmit
    ├─► AlgorithmNudge   (no tab interaction)
    ├─► PromptProcessing
    │       ├─► Sets tab to PURPLE (#5B21B6) ─► "🧠 Processing..."
    │       ├─► Single Haiku inference (title + name)
    │       └─► Sets tab to ORANGE (#B35A00) ─► "⚙️ Fixing auth..."
    └─► SatisfactionCapture  (no tab interaction)

PreToolUse (AskUserQuestion)
    └─► TabState ─► Sets tab to AMBER (#604800) ─► Shows question summary

PostToolUse (AskUserQuestion)
    └─► TabState ─► Restores tab to working state

Stop
    ├─► TabState → DEFAULT (UL blue) + past-tense title
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
│  EventLogger ─────────────────────────────────► tool-activity    │
│                                                 tool-failures    │
│                                                 config-changes   │
│  AgentInvocation ─────────────────────────────► subagent-events  │
│  WorkCompletionLearning ──────────────────────► LEARNING/        │
│  MemoryReviewFire ────────────────────────────► hot-layer + KNOWLEDGE│
│  MemoryHealthGate ────────────────────────────► memory-health    │
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
| `output-validators.ts` | Tab title + voice output validation | PromptProcessing, TabState, VoiceNotification |
| `isa-utils.ts` | ISA / work.json manipulation | PromptProcessing, ISASync |
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

Hooks are configured in `settings.json` under the `hooks` key:

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
      }
    ],
    "PostToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          { "type": "command", "command": "$HOME/.claude/hooks/Safety.hook.ts" }
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

## Block messages

A hook that returns `decision: "block"` (or a deny permission decision) hands Claude Code a `reason` string, and that string is rendered in the red-outlined box. It is the only thing the model and the principal see when a gate fires.

**Every block message states the problem AND the recommended fix** ({{PRINCIPAL_NAME}}, 2026-07-31). Two parts, both required:

- **Problem** — what was claimed or attempted, and what the gate actually observed. Name the gap, not just the rule: "You claimed X; the transcript shows the deploy was never probed" beats "verification required".
- **Fix** — the concrete next action. Where an honest downgrade is a legitimate exit, give the wording that passes, so the way out is never "reword until the gate stops firing".

A block that states only the problem stops the work without moving it, and the cheapest response to it is to soften the claim — which is the exact failure the gate exists to prevent.

`VerificationGate`'s messages are the reference shape: claim, observation, then `Do ONE, then restate: (a) verify … or (b) downgrade honestly …`.

Enforced by `bun LIFEOS/TOOLS/BlockMessageGate.ts`, also wired into `/ic` as `block-messages`.

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
- [ ] Add to `settings.json` under appropriate event
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

- [ ] Remove from `settings.json`
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

1. Verify hook is in `settings.json` under correct event
2. Check shebang: `#!/usr/bin/env bun`
3. Run manually: `echo '{"session_id":"test"}' | bun hooks/HookName.hook.ts`
4. For Pulse HTTP routes (AgentGuard, SkillGuard): verify Pulse is running at `localhost:31337/health`

### Hook Blocking Session

1. Check if hook writes to stdout (only LoadContext / AlgorithmNudge / MemoryTurnStart / TimeContext should)
2. Verify timeouts are set for external calls
3. Check for infinite loops or blocking I/O

### Event Nudge Not Firing

1. Confirm `AlgorithmNudge.hook.ts` is registered in the `UserPromptSubmit` block of `settings.json`
2. Tail `MEMORY/OBSERVABILITY/algo-nudge-routing.jsonl` to see which rows matched
3. Test with synthetic prompt: `echo '{"session_id":"t","prompt":"test"}' | bun hooks/AlgorithmNudge.hook.ts`

### External Content Tagging

1. Verify `Safety.hook.ts` registered on `PostToolUse` with matcher `WebFetch` and `WebSearch`
2. Test: `echo '{"session_id":"t","hook_event_name":"PostToolUse","tool_name":"WebFetch","tool_input":{},"tool_response":"hello"}' | bun hooks/Safety.hook.ts`

### Permission Auto-Approval

1. Verify `Safety.hook.ts` registered on `PermissionRequest` with matcher `Write|Edit|MultiEdit|Bash`
2. Test: `echo '{"session_id":"t","hook_event_name":"PermissionRequest","tool_name":"Bash","tool_input":{"command":"ls /tmp"}}' | bun hooks/Safety.hook.ts` — should emit `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}`
3. Tail observability: `tail -f ~/.claude/LIFEOS/MEMORY/OBSERVABILITY/permission-decisions.jsonl`

---

## Migration Notes

### 2026-05-06 — bpe-cuts (this commit)

Removed:
- `RepeatDetection.hook.ts` (UserPromptSubmit) — pre-classifier-era safety net, redundant with the model reading conversation context directly.
- `TeammateIdle.hook.ts` (TeammateIdle) — pure logging hook with zero readers.
- `ElicitationHandler.hook.ts` (Elicitation) — pure logging hook with zero readers.
- `FileChanged.hook.ts` (FileChanged) — duplicate of `ToolActivityTracker` capture.

Trimmed:
- `TaskGovernance.hook.ts` — audit log writes removed (zero readers); rate-limit + quality-gate behavior preserved.
- `PromptProcessing.hook.ts` — docstring rewritten to accurately reflect single responsibility (tab + naming, no longer claims classification).

Pre-state tag: `pre-bpe-cuts-2026-05-06`. Restoration: see `LIFEOS/MEMORY/WORK/20260506-comprehensive-hook-bpe-audit/RESTORATION.md`.

### 2026-05-06 — security simplification (yesterday's commit)

Removed (`a4e3522ca`):
- `SecurityPipeline.hook.ts`, `ContentScanner.hook.ts`, `PromptGuard.hook.ts`, `SmartApprover.hook.ts`, `ContainmentGuard.hook.ts`
- `hooks/security/` directory (pipeline, types, logger, 5 inspectors)
- `LIFEOS/USER/SECURITY/{PATTERNS.yaml, ...}` plus 8 of 9 `LIFEOS/DOCUMENTATION/Security/*.md`

Replacement: native `permissions.deny` in `settings.json` (42 entries) + a single 48-LOC `PromptInjection.hook.ts` on WebFetch/WebSearch. The model is the security boundary.

### 2026-04-19 — naming-context isolation

`PromptProcessing.hook.ts` (then `SessionAnalysis.hook.ts`) `getRecentContext()` strips Assistant turns when `isFirstPrompt` is true. Session names are permanent; Algorithm scaffolding in assistant output (phase headers, agent names, SUMMARY lines) must never reach the naming prompt.

### Earlier — classifier split, then retirement

`PromptProcessing.hook.ts` (formerly `SessionAnalysis.hook.ts`) once briefly held a `Mode + Tier` classifier role, later extracted to a dedicated `TheRouter.hook.ts`. The whole mode/tier classification apparatus was **retired 2026-07-11** — no modes, no effort tiers, no per-prompt classifier; the live layer is `AlgorithmNudge.hook.ts`, which asks bounded questions on events rather than predicting a class up front. PromptProcessing does only tab + naming via Haiku.
