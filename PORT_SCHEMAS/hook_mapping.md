# LifeOS to Hermes Hook Mapping Schema

This document maps all legacy LifeOS hooks (from `LifeOS/install/hooks/` and `hooks.json`) to their Hermes-native runtime equivalents.

## Hook Mapping Table

| Hook | Trigger | Hermes-native | Port? | Notes |
|---|---|---|---|---|
| `Safety.hook.ts` | `PostToolUse (WebFetch, WebSearch), PermissionRequest (Write, Edit, MultiEdit, Bash, mcp__.*)` | Hermes tool approval + safety middleware | Yes | Enforces command safety and tool permission gating |
| `PreToolGuard.hook.ts` | `PreToolUse (Bash, Write, Edit, MultiEdit)` | Hermes tool approval + path protection | Yes | Includes `CommunicationSkillGuard`, `SystemFileGuard`, `EgressClassGuard` |
| `ISASync.hook.ts` | `PostToolUse (Write, Edit, MultiEdit)` | Hermes post-tool lifecycle → workspace state sync | Yes | Synchronizes ISA state after filesystem modifications |
| `ISARenderOnStop.hook.ts` | `Stop` | Hermes HTML render on completion | Optional | Renders ISA visual dashboard on turn completion |
| `CheckpointPerISC.hook.ts` | `PostToolUse (Write, Edit, MultiEdit)` | Hermes git checkpoint on ISC change | Optional | Automatic git commits on significant file modifications |
| `LoadContext.hook.ts` | `SessionStart` | SOUL.md + `ephemeral_system_prompt` + Hindsight recall | Yes | Injects core persona, context, and recall into initial prompt |
| `MemoryTurnStart.hook.ts` | `UserPromptSubmit` | Hindsight recall via `MemoryManager.prefetch_all()` | Yes | Combines `LoadMemory` and `MemoryDeltaSurface` for memory retrieval |
| `MemoryReviewFire.hook.ts` | `Stop` | Hindsight retain via `MemoryManager.sync_all()` | Yes | Triggers background memory extraction on response complete |
| `MemoryHealthGate.hook.ts` | `SessionEnd` | Hindsight health check (built into plugin) | Yes | Validates memory DB integrity and connection status |
| `LastResponseCache.hook.ts` | `Stop` | Hermes inter-turn state bridge (built-in) | Yes | Caches final output for inter-turn state continuity |
| `StopGates.hook.ts` | `Stop` | Hermes turn-completion middleware | Yes | Combines `VerificationGate` and `WritingGate` for turn compliance |
| `PostToolObserver.hook.ts` | `PostToolUse` | Hermes tool-loop governance | Yes | Includes `LoopDetector` to detect repeating tool calls |
| `AgentInvocation.hook.ts` | `PreToolUse (Agent), PostToolUse (Agent)` | Hermes delegation lifecycle events | Yes | Intercepts subagent spawns and completions |
| `TaskGovernance.hook.ts` | `TaskCreated` | Hermes subagent rate limiting | Yes | Governs concurrent agent limits and subtask throttling |
| `SessionCleanup.hook.ts` | `SessionEnd` | Hermes session teardown | Yes | Cleans temporary scratch files and transient sockets |
| `WorkCompletionLearning.hook.ts` | `SessionEnd` | Hindsight retain + cognitive-graph capture | Yes | Extracts heuristics and learnings into `mind.db` graph |
| `EventLogger.hook.ts` | `PostToolUse, PostToolUseFailure, ConfigChange, StopFailure` | Hermes telemetry/logging layer | Yes | Structured logging of execution events and errors |
| `HookHealer.hook.ts` | `SessionStart` | Not needed (Hermes plugin loader handles this) | No | Auto-heals missing bun hooks in Claude Code |
| `IntegrityCheck.hook.ts` | `SessionEnd` | Hermes session integrity (built-in) | Yes | Validates system state consistency before shutdown |
| `DocIntegrity.hook.ts` | `SessionEnd` | Hermes post-session doc maintenance | Optional | Audits system doc consistency on session exit |
| `AlgorithmNudge.hook.ts` | `PostToolUseFailure` | Hermes skill routing + error recovery | Yes | Constitution guides skill routing and error recovery |
| `ReminderRouter.hook.ts` | `UserPromptSubmit` | Hermes intent interceptor | Optional | Routes pending user reminders into prompt pipeline |
| `SatisfactionCapture.hook.ts` | `UserPromptSubmit` | Hindsight retain on feedback | Yes | Evaluates user satisfaction markers for learning |
| `ContextReduction.hook.sh` | `PreToolUse (Bash)` | Not needed | No | Hermes manages context window natively |
| `TabState.hook.ts` | `PreToolUse (AskUserQuestion), PostToolUse (AskUserQuestion), Stop` | N/A | No | Kitty terminal tab titles (Claude-only) |
| `PromptProcessing.hook.ts` | `UserPromptSubmit` | N/A | No | Kitty terminal titles during prompt processing (Claude-only) |
| `VoiceCompletion.hook.ts` | `Stop` | Hermes TTS plugin | No | Replaced with native Hermes TTS plugin |
| `KittyEnvPersist.hook.ts` | `SessionStart` | N/A | No | Kitty environment persistence (Claude-only) |
| `UpdateCounts.hook.ts` | `SessionEnd` | N/A | No | Claude Code status bar banner metadata (Claude-only) |
| `FormatGate.hook.ts` | (Unregistered / legacy) | N/A | No | Legacy unregistered formatting filter |
| `DriftReminder.hook.ts` | (Unregistered / legacy) | Hermes constitution | No | Replaced by constitutional prompt adherence |
