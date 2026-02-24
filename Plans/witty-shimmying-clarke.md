# Comprehensive Cross-Platform PAI Test Suite (v2 — Revised)

## Context

PAI v3.0 now has Windows 11 support (platform.ts abstractions, hook guards, installer updates). We've verified it works via manual E2E testing on Justin's Windows machine. Now we need **automated CI tests** that verify all core PAI functionality works on Windows, macOS, and Linux — preventing regressions as development continues.

**Current state:** 13 test files (3,169 lines, ~165 tests) covering platform abstractions, forbidden patterns, some hooks, installer detection, voice server, and statusline. Only 2 of 20 hooks are execution-tested. Zero skill structure validation. CI runs on 3 platforms but with redundant job definitions.

**Goal:** ~550+ tests across ~10 new test files, covering all 20 hooks, 41 skill SKILL.md files, 13 hook lib modules, 7 hook handlers, installer steps, settings.json integrity, browser-dependent skills via Playwright, API skill invocation with dummy keys, audio playback via PulseAudio null sinks, and full E2E testing with real Claude CLI — running on all 3 platforms via GitHub Actions.

### Key Research Findings (v2 changes)

These 4 findings from targeted research significantly expanded our CI capabilities:

1. **Playwright/Chromium installs on all 3 CI platforms** via `npx playwright install chromium --with-deps` ([docs](https://playwright.dev/docs/ci)). Browser-dependent skills (Browser, WebAssessment, PromptInjection) are now testable.

2. **Dummy API keys enable skill invocation testing.** We can't call real APIs, but we CAN test the entire invocation pipeline up to the API call, and verify graceful degradation when the call fails. This catches import errors, missing dependencies, and broken skill wiring.

3. **PulseAudio null sink provides virtual audio on Linux CI.** `sudo apt-get install -y pulseaudio && pulseaudio --start && pactl load-module module-null-sink` creates a virtual audio device. Audio playback commands succeed (exit 0) without physical hardware. Used by Electron CI and audio projects.

4. **Claude CLI installs via npm and runs headless in CI.** `npm install -g @anthropic-ai/claude-code` + `ANTHROPIC_API_KEY` secret + `claude -p "prompt" --max-turns 1` enables full E2E testing with real Claude Code executing PAI hooks and skills. Anthropic officially supports this via [claude-code-action](https://github.com/anthropics/claude-code-action).

---

## Plan

### Phase A: Foundation (must come first)

#### A1. Extend `tests/windows/helpers.ts` with hook event input constants

Add standardized JSON input payloads for each hook event type — these are needed by all hook execution tests.

```
File: Releases/v3.0/.claude/tests/windows/helpers.ts
Change: Add ~50 lines — 6 event type input constants + SKILLS_DIR + handler constants + dummy key env
```

New exports:
- `SESSION_START_INPUT` — `{ session_id, session_type, event: 'init', conversation: [] }`
- `USER_PROMPT_INPUT` — `{ session_id, event: 'user_prompt_submit', user_prompt, conversation }`
- `PRE_TOOL_USE_INPUT` — `{ session_id, event: 'pre_tool_use', tool_name, tool_input }`
- `POST_TOOL_USE_INPUT` — `{ session_id, event: 'post_tool_use', tool_name, tool_result }`
- `SESSION_END_INPUT` — `{ session_id, event: 'session_end', transcript_path }`
- `STOP_INPUT` — `{ session_id, transcript_path, hook_event_name: 'Stop' }`
- `SKILLS_DIR` — path to `skills/` directory
- `HANDLERS_DIR` — path to `hooks/handlers/`
- `ALL_HANDLERS` — list of 7 handler files
- `DUMMY_API_ENV` — env object with dummy API keys for skill invocation testing

#### A2. Create `tests/cross-platform/` directory

New directory alongside `tests/windows/` for tests designed cross-platform from the start.

### Phase B: New Test Files (can be parallelized)

#### B1. `tests/cross-platform/11-skills.test.ts` — Skill Structure + Invocation Validation (~65 tests, ~400 lines)

**Part 1 — Structure validation** for all 41 SKILL.md files:
- Every skill directory has a SKILL.md (dynamically scanned, not hardcoded)
- Each SKILL.md is non-empty and under 100KB
- Each has valid frontmatter with `name` and `description`
- Each description contains trigger words (USE WHEN clause)
- No skill directory contains node_modules/ or .env files
- Skills with Workflows/ subdirectory have .md files inside

**Part 2 — Invocation pipeline testing** (NEW in v2) with dummy API keys:
- For each API-dependent skill (Research, ExtractWisdom, Fabric, Apify, BrightData, OSINT, etc.):
  - SKILL.md loads and parses without error
  - Any TypeScript files in the skill directory import without crashing
  - If the skill has a main entry point, executing it with dummy API keys either:
    - Returns a graceful error message about invalid/missing keys, OR
    - Exits with non-zero code (not a crash/SIGSEGV)
  - stderr does NOT contain unhandled promise rejections or stack traces from missing modules
- For locally-testable skills (FirstPrinciples, BeCreative, Council, RedTeam, etc.):
  - SKILL.md has no external dependency declarations
  - Skill files import cleanly

**Key pattern:** Dynamically scan `skills/` directory so new skills are automatically covered. Use `DUMMY_API_ENV` from helpers for consistent dummy key injection.

#### B2. `tests/cross-platform/12-hook-execution.test.ts` — All 20 Hooks Execution (~60 tests, ~500 lines)

**The single most important new file.** Executes every hook with event-type-appropriate JSON stdin via the existing `executeHook()` helper.

For each of the 20 hooks:
- Executes without crash (exit 0 or 1, not null/SIGSEGV)
- stderr does NOT contain panic/segfault
- JSON stdout when expected (hooks that return `{ continue: true/false }`)
- Graceful degradation for missing settings.json/MEMORY files

Grouped by event type:
- **SessionStart (3):** StartupGreeting, LoadContext, CheckVersion
- **UserPromptSubmit (4):** SkillGuard, RelationshipMemory, AutoWorkCreation, SessionAutoName
- **PreToolUse (2):** VoiceGate, AgentExecutionGuard
- **PostToolUse (5):** AlgorithmTracker, UpdateTabTitle, RatingCapture, QuestionAnswered, UpdateCounts
- **SessionEnd (2):** SessionSummary, WorkCompletionLearning
- **Stop (4):** StopOrchestrator, IntegrityCheck, SetQuestionTab, SecurityValidator

**All hooks run with `PAI_TEST_MODE=1` env var** to prevent destructive side effects.

#### B3. `tests/cross-platform/13-hook-lib-modules.test.ts` — 13 Hook Lib Modules (~50 tests, ~350 lines)

For each of the 13 modules in `hooks/lib/`:
- Import succeeds on all platforms
- Key exports are functions/constants (not undefined)
- Core functions return expected types

Modules: paths.ts, stdin.ts, tab-setter.ts, tab-constants.ts, identity.ts, notifications.ts, time.ts, output-validators.ts, metadata-extraction.ts, learning-utils.ts, change-detection.ts, algorithm-state.ts, prd-template.ts

#### B4. `tests/cross-platform/14-hook-handlers.test.ts` — 7 Hook Handlers (~25 tests, ~200 lines)

For each handler in `hooks/handlers/`:
- Import succeeds
- Exported handler function exists and is callable
- Does not throw with empty/minimal input

Handlers: VoiceNotification.ts, TabState.ts, RebuildSkill.ts, AlgorithmEnrichment.ts, DocCrossRefIntegrity.ts, SystemIntegrity.ts, UpdateCounts.ts

#### B5. `tests/cross-platform/15-installer-steps.test.ts` — Installer Steps (~30 tests, ~250 lines)

Tests each installer engine module independently:
- `generateSettingsJson()` produces valid JSON with all required sections (env, contextFiles, daidentity, principal, pai)
- Generated config includes platform-appropriate paths
- `runValidation()` is importable and returns expected structure
- `generateSummary()` works with mock completed state
- Step definitions (STEPS array) have correct names, numbers, and dependencies
- `getProgress()` calculates correctly

#### B6. `tests/cross-platform/16-installer-upgrade.test.ts` — Upgrade/Merge Path (~15 tests, ~180 lines)

Tests the configuration merge strategy:
- `generateSettingsJson()` preserves existing API keys when upgrading
- Hooks section is updated (not wiped) during config generation
- Identity fields are correctly populated
- PROJECTS_DIR uses `path.resolve()` (the bug we just fixed)

#### B7. `tests/cross-platform/17-settings-integrity.test.ts` — Settings/Filesystem Consistency (~20 tests, ~200 lines)

Validates that the template `settings.json` is internally consistent:
- Every hook command references an existing `.hook.ts` file
- Every `.hook.ts` file in `hooks/` is referenced by a settings.json hook entry
- Hook commands use `${PAI_DIR}` variable (not hardcoded paths)
- `statusLine.command` references an existing file
- `contextFiles` entries reference existing files
- `env` section has required PAI_DIR and PAI_CONFIG_DIR

#### B8. `tests/cross-platform/18-browser-skills.test.ts` — Browser-Dependent Skills via Playwright (NEW in v2, ~20 tests, ~250 lines)

**Requires Playwright + Chromium installed in CI.**

Tests the 3 browser-dependent skills:
- **Browser skill:** Playwright launches Chromium headless, navigates to a test page, takes screenshot, returns result
- **WebAssessment skill:** Skill files import without error, assessment functions accept URL input
- **PromptInjection skill:** Skill files import without error, injection test framework initializes

For each:
- Skill TypeScript entry points import without error
- Playwright `chromium.launch({ headless: true })` succeeds
- A basic page navigation (`page.goto('about:blank')`) completes
- Skill-specific Playwright operations work (screenshot, DOM inspection)
- Graceful cleanup (browser.close()) on success and failure

**Platform notes:** Playwright works on all 3 CI platforms. `npx playwright install chromium --with-deps` handles OS-level deps.

#### B9. `tests/cross-platform/19-audio-playback.test.ts` — Audio Playback via Virtual Audio (NEW in v2, ~15 tests, ~150 lines)

**Requires PulseAudio null sink on Linux, native audio subsystem on Windows/macOS.**

Tests VoiceServer audio pipeline beyond command generation:
- `getAudioPlayCommand()` returns a valid command for the current platform
- On Linux with PulseAudio: `paplay` command executes against null sink (exit 0)
- On macOS: `afplay` command is available (`which afplay` succeeds)
- On Windows: PowerShell audio commands are syntactically valid
- Voice notification curl to localhost:8888 either connects (if server running) or fails gracefully with connection refused (not crash)
- Audio file path resolution uses platform-appropriate separators

**CI setup step (Linux only):**
```bash
sudo apt-get install -y pulseaudio
pulseaudio --start --daemonize
pactl load-module module-null-sink sink_name=virtual_speaker
```

### Phase C: GitHub Actions Workflow

#### C1. Create `cross-platform-tests.yml` — Expanded Matrix-Based Workflow

Replace the 4 separate job definitions with a comprehensive matrix + specialized jobs:

```yaml
name: Cross-Platform PAI Test Suite

on:
  pull_request:
    paths: ['Releases/v3.0/.claude/**', '.github/workflows/cross-platform-tests.yml']
  push:
    branches: [main, 'feature/windows-*']
    paths: ['Releases/v3.0/.claude/**', '.github/workflows/cross-platform-tests.yml']
  workflow_dispatch:

jobs:
  # ─── Core Test Matrix (3 platforms) ──────────────────────────────
  test:
    name: Tests (${{ matrix.os-label }})
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        include:
          - { os: windows-latest, os-label: Windows }
          - { os: ubuntu-latest, os-label: Linux }
          - { os: macos-latest, os-label: macOS }
    steps:
      - Checkout
      - Install Bun (oven-sh/setup-bun@v2)
      - Install Node.js (actions/setup-node@v4) — needed for Playwright
      - Install Playwright Chromium: npx playwright install chromium --with-deps
      - Setup virtual audio (Linux only):
          if: runner.os == 'Linux'
          run: |
            sudo apt-get install -y pulseaudio
            pulseaudio --start --daemonize
            pactl load-module module-null-sink sink_name=virtual_speaker
      - Run platform unit tests (lib/*.test.ts)
      - Run full test suite (tests/windows/ + tests/cross-platform/) with dummy API env:
          env:
            ANTHROPIC_API_KEY: "sk-ant-dummy-ci-test-key"
            OPENAI_API_KEY: "sk-dummy-ci-test-key"
            APIFY_TOKEN: "apify_dummy_ci_token"
            PAI_TEST_MODE: "1"
      - Run forbidden pattern audit

  # ─── Windows Install E2E (Windows-only) ────────────────────────
  windows-install-e2e:
    name: Windows Install E2E
    runs-on: windows-latest
    timeout-minutes: 15
    steps:
      - Checkout, Install Bun
      - Run installer E2E tests
      - Test detect module, config generation, manage.ts CLI
      - Test directory structure creation
      - Test platform.ts imports

  # ─── Claude CLI E2E (NEW — full PAI stack test) ─────────────────
  claude-e2e:
    name: Claude CLI E2E (${{ matrix.os-label }})
    runs-on: ${{ matrix.os }}
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        include:
          - { os: ubuntu-latest, os-label: Linux }
          - { os: macos-latest, os-label: macOS }
          - { os: windows-latest, os-label: Windows }
    steps:
      - Checkout
      - Install Bun
      - Install Node.js
      - Install Claude CLI: npm install -g @anthropic-ai/claude-code
      - Setup PAI directory structure:
          Copy Releases/v3.0/.claude/ contents to ~/.claude/ (CI runner home)
      - Configure settings.json:
          Write minimal settings.json with test identity, hooks pointing to PAI files
      - Test: claude -p "Say hello" --max-turns 1 --output-format json
          env: ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          Verify: output contains JSON, no crash, exit 0
      - Test: claude -p "What skills do you have?" --max-turns 1
          Verify: output mentions PAI skills (FirstPrinciples, Research, etc.)
      - Test: Hook execution via Claude:
          claude -p "Run /commit on an empty repo" --max-turns 1
          Verify: hooks fire (SessionStart, UserPromptSubmit), PAI loads
      - Test: Algorithm format output:
          claude -p "Use first principles to analyze why 1+1=2" --max-turns 2
          Verify: output contains "PAI ALGORITHM" header, phase markers
```

**Cost controls for Claude CLI E2E:**
- `--max-turns 1` or `--max-turns 2` — minimal API usage
- Use `claude-sonnet-4-6` model (cheaper than Opus) via `--model claude-sonnet-4-6`
- Only 4-5 test prompts per platform = ~10 API calls per CI run
- `ANTHROPIC_API_KEY` stored as GitHub repository secret
- This job can be made `workflow_dispatch`-only if costs need limiting

**Migration:** Run both old and new workflows for 1-2 PRs, then remove `windows-tests.yml`.

### Phase D: Integration Extension

#### D1. Extend `tests/windows/08-integration.test.ts` — Cross-Module Chain Tests (~2 tests, ~25 lines)

Add verification that StopOrchestrator references all 7 handler files and all are importable.

---

## Critical Files

| File | Role |
|------|------|
| `Releases/v3.0/.claude/tests/windows/helpers.ts` | Foundation — all tests depend on it |
| `Releases/v3.0/.claude/tests/windows/02-hooks.test.ts` | Reference pattern for hook testing |
| `Releases/v3.0/.claude/lib/platform.ts` | Central abstraction, tested by multiple files |
| `Releases/v3.0/.claude/hooks/*.hook.ts` | 20 hooks to execution-test |
| `Releases/v3.0/.claude/hooks/lib/*.ts` | 13 lib modules to import-test |
| `Releases/v3.0/.claude/hooks/handlers/*.ts` | 7 handlers to import-test |
| `Releases/v3.0/.claude/skills/*/SKILL.md` | 41 skill files to validate |
| `Releases/v3.0/.claude/settings.json` | Template validated for integrity |
| `Releases/v3.0/.claude/PAI-Install/engine/*.ts` | Installer modules to step-test |
| `.github/workflows/windows-tests.yml` | Current CI — to be superseded |

## Test Count Summary

| File | Tests | Lines |
|------|-------|-------|
| 11-skills.test.ts (structure + invocation) | ~65 | ~400 |
| 12-hook-execution.test.ts | ~60 | ~500 |
| 13-hook-lib-modules.test.ts | ~50 | ~350 |
| 14-hook-handlers.test.ts | ~25 | ~200 |
| 15-installer-steps.test.ts | ~30 | ~250 |
| 16-installer-upgrade.test.ts | ~15 | ~180 |
| 17-settings-integrity.test.ts | ~20 | ~200 |
| 18-browser-skills.test.ts (NEW) | ~20 | ~250 |
| 19-audio-playback.test.ts (NEW) | ~15 | ~150 |
| helpers.ts additions | — | ~50 |
| 08-integration.test.ts additions | ~2 | ~25 |
| **New total (bun test)** | **~302** | **~2,555** |
| **Claude CLI E2E (separate job)** | ~12 | ~(workflow YAML) |
| **Existing** | ~165 | ~3,169 |
| **Grand total** | **~479** | **~5,724** |

## What Cannot Be Tested in CI (Revised — much smaller list)

| Item | Reason | Mitigation |
|------|--------|------------|
| Real API responses from external services | Would cost money + rate limits | Dummy keys test invocation pipeline; graceful degradation verified |
| Full interactive installer wizard | Requires user input via readline | Test individual steps with mock state |
| SecurityValidator with yaml package | `yaml` npm package not installed in CI | Skip gracefully when import fails |
| Kitty terminal tab colors | No Kitty terminal in CI | Test adapter factory + no-op behavior (existing) |
| Voice notification actual audio heard | CI has no speakers | PulseAudio null sink verifies commands succeed; audio discarded |

## Verification

After implementation:
1. `bun test tests/windows/ tests/cross-platform/` passes locally on WSL2
2. `powershell.exe -Command "cd $env:USERPROFILE\code\pai\Releases\v3.0\.claude; bun test tests\windows\ tests\cross-platform\"` passes on Windows
3. Push to `feature/windows-11-support` branch
4. GitHub Actions `cross-platform-tests.yml` runs — all 3 platforms green
5. GitHub Actions `claude-e2e` job runs — Claude CLI executes PAI successfully on all 3 platforms
6. Total bun test count: ~479 tests
7. Runtime: under 15 minutes per platform (bun tests), under 20 minutes for Claude E2E
8. `ANTHROPIC_API_KEY` secret configured in repository settings

## Implementation Order

1. **Phase A** — helpers.ts extensions + directory creation (foundation, must be first)
2. **Phase B1-B7** — Original test files (can parallelize, no new CI deps needed)
3. **Phase B8** — Browser skills tests (needs Playwright in CI)
4. **Phase B9** — Audio playback tests (needs PulseAudio setup in CI)
5. **Phase C** — GitHub Actions workflow (ties everything together)
6. **Phase D** — Integration extensions (last, after new tests proven)
7. **Secret setup** — Add `ANTHROPIC_API_KEY` to repository secrets for Claude E2E job
