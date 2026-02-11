# Codex PAI Bridge

Lightweight bridge that watches [OpenAI Codex CLI](https://github.com/openai/codex) session logs and triggers PAI hooks, bringing PAI's memory, observability, and automation to Codex sessions.

## What It Does

The bridge polls `~/.codex/sessions/` for JSONL log files, extracts user/assistant messages, and fires the same PAI hook lifecycle that Claude Code uses:

1. **SessionStart** — triggers `StartupGreeting.hook.ts`
2. **UserPromptSubmit** — triggers `AutoWorkCreation.hook.ts` (work tracking, memory)
3. **Stop** — triggers `StopOrchestrator.hook.ts` (session summaries, learning)
4. **Statusline** — feeds session data to `statusline-command.sh`

This means Codex sessions get the same PAI benefits as Claude Code sessions: automatic work tracking, session transcripts, hook-driven automation, and statusline updates.

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- [Codex CLI](https://github.com/openai/codex) installed with sessions at `~/.codex/sessions/`
- PAI installed (hooks available at `$PAI_DIR/hooks/`)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAI_DIR` | `~/.claude` | Root of your PAI installation |
| `CODEX_HOME` | `~/.codex` | Root of your Codex CLI data |
| `BUN_PATH` | auto-detected | Path to bun binary |

## Usage

### Watch live sessions (default)

```bash
bun Tools/codex-bridge/bridge.ts --watch
```

The bridge polls every second for new session data and processes it incrementally.

### Single scan

```bash
bun Tools/codex-bridge/bridge.ts --watch --once --dry-run
```

### Test with fixture data

```bash
bun Tools/codex-bridge/bridge.ts --dry-run --test-fixture Tools/codex-bridge/fixtures/sample.jsonl
```

## Install as macOS LaunchAgent

Run the installer to set up a persistent background service:

```bash
bash Tools/codex-bridge/install.sh
```

This creates a LaunchAgent at `~/Library/LaunchAgents/com.example.codex-pai-bridge.plist` that starts on login and restarts automatically.

### Verify installation

```bash
bash Tools/codex-bridge/install.sh --check
```

### Uninstall

```bash
bash Tools/codex-bridge/uninstall.sh
```

## Tests

```bash
bash Tools/codex-bridge/tests/statusline-dry-run.test.sh
bash Tools/codex-bridge/tests/watch-once.test.sh
bash Tools/codex-bridge/tests/hook-bun-path.test.sh
```

## Self-check

Verify Codex home directory exists:

```bash
bash Tools/codex-bridge/self-check.sh
```

## Architecture

```
~/.codex/sessions/**/*.jsonl  ──poll──▶  bridge.ts  ──fire──▶  PAI hooks
                                              │
                                              ├──▶  transcripts/*.jsonl
                                              └──▶  statusline-command.sh
```

The bridge converts Codex's JSONL log format into PAI's hook input format, allowing a single PAI installation to serve both Claude Code and Codex CLI.
