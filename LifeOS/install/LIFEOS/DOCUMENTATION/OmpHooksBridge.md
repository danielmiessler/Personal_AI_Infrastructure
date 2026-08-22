---
version: 1.0.0
---

# OmpHooksBridge — LifeOS hooks in omp (Oh My Pi)

> The LifeOS hook layer runs on the Claude Code hook contract (`${LIFEOS_DIR}/settings.json`: JSON on stdin, JSON on stdout). omp does not execute that contract. `OmpHooksBridge.ts` is an omp extension that shims it onto the omp event bus, so LifeOS's enforcement layer — observability, memory capture, gates, permission guards — runs in every harness, not just Claude Code. This directly serves LifeOS's harness-agnostic design goal ("it's designed to run wherever your AI does").

## How it works

| omp event | Claude Code event | Effect |
|---|---|---|
| `session_start` | `SessionStart` | startup maintenance hooks |
| `turn_start` | `UserPromptSubmit` | prompt-side hooks |
| `tool_call` | `PreToolUse` | `permissionDecision: deny` → tool blocked; `ask` → UI confirm (fail-closed headless) |
| `tool_result` | `PostToolUse` | result-side hooks (isError → `PostToolUseFailure`) |
| `turn_end` | `Stop` | per-turn stop hooks |
| `session_shutdown` | `SessionEnd` | end-of-session maintenance |

Hooks are invoked exactly as Claude Code invokes them: `sh -c <command>` with the Claude Code JSON payload on stdin. The registry (event → matcher → command) is read live from `${LIFEOS_DIR}/settings.json`, so there is no duplicated configuration.

**Context injection.** Any `additionalContext` a hook returns (e.g. `<lifeos-memory-delta>`, rule updates) is queued and injected as a system message before the next LLM call via the `context` event — the omp equivalent of Claude Code's implicit injection.

**Safety.** A hook returning `deny` blocks the tool. `ask` shows a UI confirm; headless runs fail closed (deny). Hook failures are logged, never crash the session. Per-hook timeout 30s.

## Install

```bash
mkdir -p ~/.omp/agent/extensions
cp OmpHooksBridge.ts ~/.omp/agent/extensions/
```

Restart omp — the extension auto-loads in every new session (user-level extension discovery from `~/.omp/agent/extensions`). Alternatively pass it explicitly: `omp --hook /path/to/OmpHooksBridge.ts`.

Configuration:

- `LIFEOS_DIR` — LifeOS config root (default `~/.claude`)
- `OMP_BRIDGE_LOG` — audit log path (default `~/.omp/lifeos-bridge.log`)

## Verification evidence

Headless run (`omp -p --auto-approve "run: echo bridge-test"`, DeepSeek v4 flash via Ollama). Audit log (`${OMP_BRIDGE_LOG}`):

```
{"event":"bridge_init","hooks":76,"lifeosDir":"${LIFEOS_DIR}"}
{"hook":"HookHealer.hook.ts","cc":"SessionStart","ok":true,"ms":15}
{"hook":"LoadContext.hook.ts","cc":"SessionStart","ok":true,"ms":34}
{"hook":"PromptProcessing.hook.ts","cc":"UserPromptSubmit","ok":true,"ms":1593}
{"hook":"DriftReminder.hook.ts","cc":"UserPromptSubmit","ok":true,"context":true}
{"event":"tool_call","tool":"bash"}
{"hook":"ContextReduction.hook.sh","cc":"PreToolUse","tool":"bash","ok":true,"ms":5}
{"hook":"PreToolGuard.hook.ts","cc":"PreToolUse","tool":"bash","ok":true,"ms":23}
{"hook":"EventLogger.hook.ts","cc":"PostToolUse","tool":"bash","ok":true,"ms":32}
{"hook":"AtlasEventCapture.hook.ts","cc":"PostToolUse","tool":"bash","ok":true,"ms":13}
{"event":"context_inject","chars":118}
{"event":"session_shutdown"}
```

Observability proof — LifeOS `tool-activity.jsonl` gains a real entry written by the EventLogger hook from inside the omp session:

```json
{"event":"tool_use","tool_name":"Bash","tool_input_preview":"{\"command\":\"echo bridge-test\"}","ground_truth":{"command":"echo bridge-test"}}
```

Per-event hook execution in the same run: SessionStart 5 · UserPromptSubmit 24 · PreToolUse 2 · PostToolUse 4 · Stop 16 · SessionEnd 6. Zero hook crashes.

## Known limitations

- `transcript_path` is empty — hooks that parse the Claude transcript (e.g. LastResponseCache, StopGates) degrade gracefully (they log, don't crash).
- UserPromptSubmit receives a placeholder prompt (the omp `input` event is not yet wired) — prompt-text analysis hooks run with reduced signal.
- Hooks run sequentially; heavy prompt-side hooks (inference) add ~1–2s per turn.
- Changes take effect from the next session start.
