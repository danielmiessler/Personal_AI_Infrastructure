# Multi-Backend Inference via LiteLLM Proxy

## TL;DR

> **Quick Summary**: Add multi-backend inference support to PAI by modifying `Inference.ts` to conditionally dispatch through a local LiteLLM proxy (HTTP/OpenAI-compatible API) instead of spawning the Claude CLI. LiteLLM routes to Ollama (local), Groq (cloud), and GitHub Models (cloud) — while Claude CLI remains the zero-config default.
> 
> **Deliverables**:
> - Modified `Inference.ts` with dual-dispatch (Claude CLI + LiteLLM HTTP) and automatic fallback
> - LiteLLM proxy service added to existing Ollama Docker Compose stack
> - `litellm_config.yaml` defining all three backends
> - `inference` config section in `settings.json` with backend mappings and task-based routing rules
> - Bun test suite for config parsing, backend selection, HTTP client, and fallback logic
> - `.env.example` for API keys (Groq, GitHub Models)
> - Documentation for setup and usage
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Final Verification

---

## Context

### Original Request
Add multi-backend inference support to PAI using Approach A (LiteLLM Proxy as Unified Gateway). Route inference calls through a local LiteLLM proxy to reach Ollama (local/private), Groq (fast cloud), and GitHub Models (broad selection) — preserving Claude Code as default.

### Interview Summary
**Key Discussions**:
- **Approach**: User confirmed Approach A — LiteLLM Proxy as Unified Gateway (not direct SDK or OpenAI-compatible modifications)
- **Deployment**: Docker Compose — integrate with existing Ollama stack at `~/workspace/ollama` (already has `overlay` network, GPU support, Open WebUI)
- **Configuration**: `settings.json` as single source of truth for backend mappings and routing rules
- **Routing**: Include task-to-model routing logic — config-driven, not caller-driven (interface unchanged)
- **Testing**: Minimal bun tests for Inference.ts — config parsing, backend selection, HTTP client, fallback

**Research Findings**:
- `Inference.ts` (254 lines) spawns `claude` CLI via `child_process.spawn()` — no HTTP code exists
- 8 call sites import `inference()` — all use the same `InferenceOptions/InferenceResult` interface
- Hooks fire on every user message (RatingCapture, UpdateTabTitle, SessionAutoName) — concurrent inference calls possible
- Existing Ollama Docker stack uses `overlay` external network, Ollama at port 11434
- Available Ollama models: phi4:14b, mistral:7b-instruct, llama3.1:8b, qwen2.5-coder-7b-instruct
- LiteLLM runs config-only without PostgreSQL — sufficient for single-user PAI
- Bun has native `fetch` with `AbortSignal.timeout()` — no external HTTP deps needed
- Zero test files exist in PAI — need to create test infrastructure from scratch

### Metis Review
**Identified Gaps** (addressed):
- **PostgreSQL for LiteLLM**: Skipped — config-only mode sufficient for single user (default applied)
- **LiteLLM auth**: Master key configured but optional — network isolation sufficient for local use (default applied)
- **Routing location**: Config-driven in settings.json — InferenceOptions interface unchanged (user-confirmed)
- **Response format translation**: OpenAI `choices[0].message.content` → raw text extraction needed in HTTP path
- **Fallback behavior**: Health check + 3s connection timeout → auto-fallback to Claude CLI (critical guardrail)
- **Secret leakage**: API keys in `.env` only, never in tracked files
- **Config caching**: DON'T cache inference config — read fresh each call (inference calls infrequent)
- **Cold start**: LiteLLM first request may be slow — startup readiness check recommended
- **Two git repos**: PAI repo (tasks 1-8) and Ollama repo (tasks 9-10) — separate commit workflows

---

## Work Objectives

### Core Objective
Enable PAI's `inference()` function to dispatch sub-task inference calls through a local LiteLLM proxy to reach multiple backends (Ollama, Groq, GitHub Models) via config-driven routing, while preserving Claude CLI as the zero-config default with automatic fallback.

### Concrete Deliverables
- `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts` — modified with dual-dispatch logic
- `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` — bun test suite
- `Releases/v4.0.3/.claude/package.json` — minimal, for bun test runner
- `Releases/v4.0.3/.claude/settings.json` — new `inference` config section added
- `~/workspace/ollama/docker-compose.yml` — LiteLLM service added
- `~/workspace/ollama/litellm_config.yaml` — backend definitions
- `~/workspace/ollama/.env.example` — API key template (Groq, GitHub)
- `Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md` — setup and usage documentation

### Definition of Done
- [ ] `bun test Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` → all pass (config, routing, HTTP, fallback)
- [ ] `docker compose -f ~/workspace/ollama/docker-compose.yml config --quiet` → exit 0
- [ ] All 8 existing call sites work without any code changes
- [ ] When no `inference` section in settings.json → Claude CLI dispatch (existing behavior)
- [ ] When LiteLLM unreachable → automatic fallback to Claude CLI within 3s

### Must Have
- Dual-dispatch: Claude CLI (default) + LiteLLM HTTP (opt-in via config)
- Automatic fallback to Claude CLI when LiteLLM is unreachable (≤3s timeout)
- Config-driven backend selection and task-to-model routing in `settings.json`
- `InferenceOptions` and `InferenceResult` types remain IDENTICAL — no interface changes
- API keys in `.env` files only — never in tracked files
- LiteLLM service on `overlay` network, publishing port 4000 to host
- Bun test suite with mocked fetch/spawn — no real network calls

### Must NOT Have (Guardrails)
- **NO interface changes**: `InferenceOptions` and `InferenceResult` types stay identical
- **NO caller modifications**: All 8 call sites must work without any code changes
- **NO hard LiteLLM dependency**: System must work identically without Docker running
- **NO PostgreSQL**: Config-only LiteLLM mode — no database service
- **NO streaming responses**: Current inference is non-streaming; out of scope
- **NO external HTTP libraries**: Use Bun native `fetch` only
- **NO model management**: Ollama models pre-installed, LiteLLM is just a proxy
- **NO LiteLLM Admin UI**: Not needed without PostgreSQL
- **NO Open WebUI integration**: Separate concern, excluded
- **NO secrets in tracked files**: API keys in `.env` only
- **NO changes to hooks/skills/memory**: Only Inference.ts and settings.json modified in PAI
- **NO new CLI flags**: Inference.ts CLI entry point unchanged
- **NO retry/rate-limit logic in Inference.ts**: LiteLLM handles this via `router_settings`
- **NO backends beyond Ollama/Groq/GitHub Models**: Config is extensible, but only ship these three
- **NO excessive JSDoc/comments**: Minimal, purposeful comments only
- **NO over-abstraction**: No AbstractBackendFactory patterns — keep it simple

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (zero test files, no root package.json)
- **Automated tests**: YES (TDD — tests written before implementation)
- **Framework**: `bun test` (Bun built-in test runner — no jest needed)
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Tests**: Use Bash (`bun test <file>`) — run tests, assert pass count
- **Config**: Use Bash (`bun -e "..."`) — parse JSON/YAML, assert structure
- **Docker**: Use Bash (`docker compose config`) — validate compose file
- **Integration**: Use Bash (`curl`) — hit LiteLLM health endpoint, send test request

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, independent tasks):
├── Task 1: Test infrastructure setup (package.json) [quick]
├── Task 2: LiteLLM config YAML [quick]
├── Task 3: settings.json inference config section [quick]
└── Task 4: .env.example for API keys [quick]

Wave 2 (After Wave 1 — core implementation, MAX PARALLEL):
├── Task 5: Inference.ts test suite (RED phase — tests that fail) [deep]
├── Task 6: Docker Compose — add LiteLLM service [unspecified-high]
└── Task 7: Inference.ts implementation (GREEN phase — make tests pass) [deep]

Wave 3 (After Wave 2 — integration + docs):
├── Task 8: Integration QA — end-to-end verification [unspecified-high]
└── Task 9: Documentation — INFERENCE.md [writing]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Final
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 (package.json) | — | 5, 7 | 1 |
| 2 (litellm_config.yaml) | — | 6, 8 | 1 |
| 3 (settings.json config) | — | 5, 7 | 1 |
| 4 (.env.example) | — | 6 | 1 |
| 5 (test suite RED) | 1, 3 | 7 | 2 |
| 6 (docker-compose LiteLLM) | 2, 4 | 8 | 2 |
| 7 (Inference.ts impl) | 5 | 8 | 2 |
| 8 (integration QA) | 6, 7 | F1-F4 | 3 |
| 9 (documentation) | 7 | F1-F4 | 3 |
| F1-F4 (final verification) | 8, 9 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **3 tasks** — T5 → `deep`, T6 → `unspecified-high`, T7 → `deep`
- **Wave 3**: **2 tasks** — T8 → `unspecified-high`, T9 → `writing`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Test Infrastructure Setup (package.json)

  **What to do**:
  - Create `Releases/v4.0.3/.claude/package.json` with minimal config:
    ```json
    {
      "name": "pai-claude",
      "type": "module",
      "scripts": {
        "test": "bun test",
        "test:inference": "bun test PAI/Tools/__tests__/Inference.test.ts"
      }
    }
    ```
  - Verify `bun test` runs from `Releases/v4.0.3/.claude/` directory (even with zero test files — should exit cleanly)

  **Must NOT do**:
  - Do NOT add any dependencies — Bun has built-in test runner
  - Do NOT add tsconfig.json — Bun handles TypeScript natively
  - Do NOT install anything with `bun install`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file creation, trivial content
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - None applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - No existing package.json in PAI — this is the first one

  **API/Type References**:
  - Bun test runner docs: `bun test` works with `.test.ts` files auto-discovered

  **External References**:
  - Bun package.json: only `name` and `type` needed for module resolution

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: package.json is valid JSON
    Tool: Bash
    Preconditions: File created at Releases/v4.0.3/.claude/package.json
    Steps:
      1. Run: bun -e "JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/package.json','utf8')); console.log('valid')"
      2. Assert stdout contains "valid"
    Expected Result: Exit code 0, stdout "valid"
    Failure Indicators: JSON parse error, file not found
    Evidence: .sisyphus/evidence/task-1-package-json-valid.txt

  Scenario: bun test runs without error (no test files yet)
    Tool: Bash
    Preconditions: package.json exists, no test files
    Steps:
      1. Run: cd Releases/v4.0.3/.claude && bun test 2>&1 || true
      2. Assert output does NOT contain "error" or "SyntaxError"
    Expected Result: Clean exit (may say "no tests found")
    Failure Indicators: SyntaxError, module resolution error
    Evidence: .sisyphus/evidence/task-1-bun-test-clean.txt
  ```

  **Commit**: YES (group 1)
  - Message: `chore: add package.json for bun test infrastructure`
  - Files: `Releases/v4.0.3/.claude/package.json`
  - Pre-commit: `bun -e "JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/package.json','utf8'))"`

- [x] 2. LiteLLM Configuration YAML

  **What to do**:
  - Create `~/workspace/ollama/litellm_config.yaml` with model definitions for all three backends:
    ```yaml
    model_list:
      # Ollama models (local) — prefix: ollama_chat/
      - model_name: ollama/qwen2.5-coder
        litellm_params:
          model: ollama_chat/qwen2.5-coder-7b-instruct
          api_base: http://ollama:11434
      - model_name: ollama/phi4
        litellm_params:
          model: ollama_chat/phi4:14b
          api_base: http://ollama:11434
      - model_name: ollama/mistral
        litellm_params:
          model: ollama_chat/mistral:7b-instruct
          api_base: http://ollama:11434
      - model_name: ollama/llama3.1
        litellm_params:
          model: ollama_chat/llama3.1:8b
          api_base: http://ollama:11434

      # Groq models (fast cloud) — prefix: groq/
      - model_name: groq/llama-3.3-70b
        litellm_params:
          model: groq/llama-3.3-70b-versatile
          api_key: os.environ/GROQ_API_KEY
      - model_name: groq/llama-3.1-8b
        litellm_params:
          model: groq/llama-3.1-8b-instant
          api_key: os.environ/GROQ_API_KEY

      # GitHub Models (broad selection) — prefix: github/
      - model_name: github/gpt-4o
        litellm_params:
          model: github/gpt-4o
          api_key: os.environ/GITHUB_API_KEY
      - model_name: github/gpt-4o-mini
        litellm_params:
          model: github/gpt-4o-mini
          api_key: os.environ/GITHUB_API_KEY

    router_settings:
      routing_strategy: simple-shuffle
      num_retries: 2
      timeout: 60
      retry_after: 5

    litellm_settings:
      drop_params: true
      set_verbose: false
    ```
  - Use `ollama_chat/` prefix (NOT `ollama/`) for Ollama models — this routes to `/api/chat` which returns structured responses
  - API keys reference environment variables via `os.environ/` syntax (LiteLLM convention)
  - Ollama models use `api_base: http://ollama:11434` (Docker internal DNS, NOT localhost)

  **Must NOT do**:
  - Do NOT hardcode API keys — use `os.environ/` references only
  - Do NOT add PostgreSQL/database config
  - Do NOT add more backends beyond Ollama/Groq/GitHub
  - Do NOT enable verbose logging in production config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single YAML file creation with known structure
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - None applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 6, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `~/workspace/ollama/docker-compose.yml:6-45` — Ollama service definition showing model names and internal DNS
  - `~/workspace/ollama/docker/entrypoint.sh:43` — Default model list: `phi4:14b mistral:7b-instruct llama3.1:8b nomic-embed-text:v1.5`

  **External References**:
  - LiteLLM config docs: model_list format with litellm_params
  - LiteLLM Ollama provider: `ollama_chat/<model>` for chat completions
  - LiteLLM Groq provider: `groq/<model>` prefix
  - LiteLLM GitHub provider: `github/<model>` prefix

  **WHY Each Reference Matters**:
  - `docker-compose.yml` shows Ollama is reachable at `http://ollama:11434` within Docker network
  - `entrypoint.sh` confirms which models are pre-installed and available

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: litellm_config.yaml is valid YAML (via Docker Compose)
    Tool: Bash
    Preconditions: File created at ~/workspace/ollama/litellm_config.yaml
    Steps:
      1. Run: bun -e "const fs=require('fs'); const content=fs.readFileSync(process.env.HOME+'/workspace/ollama/litellm_config.yaml','utf8'); const lines=content.split('\n'); const modelLines=lines.filter(l=>l.match(/^\s+-\s+model_name:/)); console.log('valid'); console.log(modelLines.length, 'models')"
      2. Assert stdout contains "valid"
      3. Assert model count >= 8
    Expected Result: "valid" and "8 models" (or more)
    Failure Indicators: File not found, parse error
    Evidence: .sisyphus/evidence/task-2-litellm-yaml-valid.txt

  Scenario: No hardcoded API keys in config
    Tool: Bash
    Preconditions: litellm_config.yaml exists
    Steps:
      1. Run: grep -c "sk-\|ghp_\|gsk_" ~/workspace/ollama/litellm_config.yaml || echo "0 matches"
      2. Assert output is "0 matches" or "0"
    Expected Result: Zero matches — no hardcoded keys
    Failure Indicators: Any match found = secret leaked
    Evidence: .sisyphus/evidence/task-2-no-hardcoded-keys.txt

  Scenario: Ollama models use correct api_base
    Tool: Bash
    Preconditions: litellm_config.yaml exists
    Steps:
      1. Run: bun -e "const fs=require('fs'); const content=fs.readFileSync(process.env.HOME+'/workspace/ollama/litellm_config.yaml','utf8'); const ollamaBlocks=content.split('model_name:').filter(b=>b.includes('ollama/')); const correct=ollamaBlocks.every(b=>b.includes('api_base: http://ollama:11434')); console.log(correct?'correct':'WRONG', ollamaBlocks.length, 'ollama models')"
      2. Assert output starts with "correct"
    Expected Result: "correct 4 ollama models"
    Failure Indicators: Output starts with "WRONG"
    Evidence: .sisyphus/evidence/task-2-ollama-api-base.txt
  ```

  **Commit**: YES (group with Task 4, committed to ollama repo)
  - Message: `feat: add LiteLLM proxy config for multi-backend routing`
  - Files: `litellm_config.yaml`
  - Pre-commit: `test -f litellm_config.yaml && grep -q "model_list" litellm_config.yaml`

- [x] 3. settings.json Inference Config Section

  **What to do**:
   - Add an `inference` top-level key to `Releases/v4.0.3/.claude/settings.json` with this structure:
     **NOTE**: This is the version-controlled template. At runtime, `Inference.ts` reads `~/.claude/settings.json` (the installed copy — see `identity.ts` line 13: `const SETTINGS_PATH = join(HOME, '.claude/settings.json')`). The installer copies the repo template to `~/.claude/` during setup. Integration tests (Task 8) must edit the **runtime copy** (`~/.claude/settings.json`), NOT this repo copy.
    ```json
    "inference": {
      "_docs": "Multi-backend inference configuration. When 'enabled' is true, inference() dispatches through LiteLLM proxy instead of Claude CLI. Claude CLI remains the fallback when LiteLLM is unreachable.",
      "enabled": false,
      "litellm": {
        "api_base": "http://localhost:4000",
        "api_key": "",
        "health_timeout_ms": 3000
      },
      "backends": {
        "ollama": {
          "fast": "ollama/phi4",
          "standard": "ollama/qwen2.5-coder",
          "smart": "ollama/phi4"
        },
        "groq": {
          "fast": "groq/llama-3.1-8b",
          "standard": "groq/llama-3.3-70b",
          "smart": "groq/llama-3.3-70b"
        },
        "github": {
          "fast": "github/gpt-4o-mini",
          "standard": "github/gpt-4o",
          "smart": "github/gpt-4o"
        }
      },
      "default_backend": "ollama",
      "routing": {
        "_docs": "Maps InferenceLevel to a preferred backend. Overrides default_backend per level.",
        "fast": "groq",
        "standard": "ollama",
        "smart": "github"
      }
    }
    ```
  - Insert this section after the existing `preferences` key (or before `_docs` key) — maintain alphabetical-ish ordering
  - `enabled: false` by default — LiteLLM is opt-in, Claude CLI remains default
  - `backends` maps each backend to model names per InferenceLevel (fast/standard/smart)
  - `routing` maps each InferenceLevel to a preferred backend name
  - `api_key` can be empty (if LiteLLM proxy has no master key) or set for authenticated proxy
  - `health_timeout_ms` controls fallback trigger — 3000ms default

  **Must NOT do**:
  - Do NOT delete or modify any existing settings.json content
  - Do NOT put API keys for Groq/GitHub in this file — those go in the Ollama stack's `.env`
  - Do NOT add model-specific parameters (temperature, top_p) — LiteLLM/litellm_config handles that
  - Do NOT change the JSON formatting style — match existing indentation (2 spaces)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding a JSON section to an existing file — surgical edit
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - None applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `Releases/v4.0.3/.claude/settings.json` — Full file (1057 lines). Follow existing patterns: `_docs` key for inline documentation, 2-space indent, section naming conventions
  - `Releases/v4.0.3/.claude/hooks/lib/identity.ts:82-98` — How settings.json is read: `readFileSync(SETTINGS_PATH)` + `JSON.parse` + fallback defaults

  **API/Type References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:13-18` — `InferenceLevel` type: `'fast' | 'standard' | 'smart'` — the routing keys must match these exactly

  **WHY Each Reference Matters**:
  - `settings.json` format must be preserved — existing tools parse it; invalid JSON breaks everything
  - `identity.ts` shows the reading pattern — config must be at top level, not nested under another key
  - `InferenceLevel` type defines the exact routing key names

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: settings.json remains valid JSON after edit
    Tool: Bash
    Preconditions: inference section added to settings.json
    Steps:
      1. Run: bun -e "const s=JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8')); console.log('valid'); console.log('has inference:', 'inference' in s)"
      2. Assert stdout contains "valid" and "has inference: true"
    Expected Result: Valid JSON with inference key present
    Failure Indicators: JSON parse error = file corrupted
    Evidence: .sisyphus/evidence/task-3-settings-valid.txt

  Scenario: inference section has correct structure
    Tool: Bash
    Preconditions: settings.json has inference section
    Steps:
      1. Run: bun -e "const s=JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8')).inference; console.log('enabled:', s.enabled); console.log('backends:', Object.keys(s.backends).join(',')); console.log('routing:', Object.keys(s.routing).filter(k=>k!=='_docs').join(','))"
      2. Assert "enabled: false"
      3. Assert "backends: ollama,groq,github"
      4. Assert "routing: fast,standard,smart"
    Expected Result: All structure checks pass
    Failure Indicators: Missing keys, wrong default values
    Evidence: .sisyphus/evidence/task-3-settings-structure.txt

  Scenario: No existing settings.json content was deleted
    Tool: Bash
    Preconditions: settings.json modified
    Steps:
      1. Run: bun -e "const s=JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8')); const required=['hooks','permissions','env','pai','preferences']; const missing=required.filter(k=>!(k in s)); console.log(missing.length?'MISSING:'+missing.join(','):'all present')"
      2. Assert stdout is "all present"
    Expected Result: All pre-existing top-level keys still present
    Failure Indicators: Any key reported as MISSING
    Evidence: .sisyphus/evidence/task-3-settings-no-deletion.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat: add inference config section to settings.json`
  - Files: `Releases/v4.0.3/.claude/settings.json`
  - Pre-commit: `bun -e "JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8'))"`

- [x] 4. Environment Variable Template (.env.example)

  **What to do**:
  - Update `~/workspace/ollama/.env.example` (or create if it doesn't exist) to include LiteLLM-related API keys:
    ```env
    # === LiteLLM Proxy Configuration ===
    # Groq API Key (get from https://console.groq.com/keys)
    GROQ_API_KEY=

    # GitHub Models API Key (get from https://github.com/settings/tokens)
    GITHUB_API_KEY=

    # LiteLLM Master Key (optional — for proxy authentication)
    # Must start with "sk-" if set
    LITELLM_MASTER_KEY=
    ```
  - Also add these variables to the existing `.env` file at `~/workspace/ollama/.env` as empty placeholders (so Docker Compose doesn't warn about undefined vars)
  - Do NOT overwrite existing .env content — append only

  **Must NOT do**:
  - Do NOT put actual API key values in .env.example
  - Do NOT modify .gitignore (`.env` should already be gitignored)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Appending env var templates — trivial file edits
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `~/workspace/ollama/.env` — Existing env file (26 lines). Contains HuggingFace token, OpenRouter keys, Ollama config. Append new section at end.
  - `Releases/v4.0.3/.claude/.env.example` — PAI's env template style for reference

  **WHY Each Reference Matters**:
  - Must preserve existing `.env` content — it has working Ollama/OpenRouter config
  - Must match existing comment style in the file

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: .env.example contains LiteLLM keys
    Tool: Bash
    Preconditions: .env.example exists in ~/workspace/ollama/
    Steps:
      1. Run: grep -c "GROQ_API_KEY\|GITHUB_API_KEY\|LITELLM_MASTER_KEY" ~/workspace/ollama/.env.example
      2. Assert count >= 3
    Expected Result: All 3 key placeholders present
    Failure Indicators: Missing key definitions
    Evidence: .sisyphus/evidence/task-4-env-example.txt

  Scenario: .env has empty placeholders (no undefined var warnings)
    Tool: Bash
    Preconditions: .env updated with empty placeholders
    Steps:
      1. Run: grep "GROQ_API_KEY" ~/workspace/ollama/.env && grep "GITHUB_API_KEY" ~/workspace/ollama/.env
      2. Assert both grep commands succeed (exit 0)
    Expected Result: Both variables present in .env (may be empty)
    Failure Indicators: grep returns exit 1 (variable not found)
    Evidence: .sisyphus/evidence/task-4-env-placeholders.txt

  Scenario: No actual secrets in .env.example
    Tool: Bash
    Preconditions: .env.example exists
    Steps:
      1. Run: grep -E "^(GROQ_API_KEY|GITHUB_API_KEY|LITELLM_MASTER_KEY)=.+" ~/workspace/ollama/.env.example || echo "clean"
      2. Assert output is "clean" (no values after =)
    Expected Result: All keys have empty values
    Failure Indicators: Any key has a non-empty value
    Evidence: .sisyphus/evidence/task-4-no-secrets.txt
  ```

  **Commit**: YES (group with Task 2, committed to ollama repo)
  - Message: `feat: add LiteLLM proxy config for multi-backend routing`
  - Files: `litellm_config.yaml`, `.env.example`
  - Pre-commit: None

- [x] 5. Inference.ts Test Suite (RED Phase — TDD)

  **What to do**:
  - Create `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` with comprehensive test suite covering:

  **Test Group 1: Config Parsing**
  - Parse valid inference config from settings.json mock
  - Handle missing `inference` section → returns null/undefined (default to Claude CLI)
  - Handle `enabled: false` → returns config but dispatch skips LiteLLM
  - Handle malformed inference section (missing backends, missing routing) → graceful fallback

  **Test Group 2: Backend Selection / Routing**
  - `level: 'fast'` + routing config `{ fast: 'groq' }` → resolves to `groq/llama-3.1-8b`
  - `level: 'standard'` + routing config `{ standard: 'ollama' }` → resolves to `ollama/qwen2.5-coder`
  - `level: 'smart'` + routing config `{ smart: 'github' }` → resolves to `github/gpt-4o`
  - Unknown backend in routing → falls back to `default_backend`
  - No routing config → uses `default_backend` for all levels

  **Test Group 3: HTTP Client (LiteLLM dispatch)**
  - Mock `fetch` returning OpenAI-format response → extracts `choices[0].message.content` into `InferenceResult.output`
  - Mock `fetch` returning JSON in content → `InferenceResult.parsed` populated when `expectJson: true`
  - Mock `fetch` throwing (connection refused) → `InferenceResult.success: false` with error message
  - Mock `fetch` timing out (AbortError) → `InferenceResult.success: false` with timeout error
  - Mock `fetch` returning non-200 status → `InferenceResult.success: false` with status in error

  **Test Group 4: Fallback Behavior**
  - LiteLLM unreachable (fetch throws) → falls back to Claude CLI spawn
  - LiteLLM times out (>3s) → falls back to Claude CLI spawn
  - `enabled: false` → always uses Claude CLI spawn (never calls fetch)
  - No inference config in settings → always uses Claude CLI spawn

  **Test Group 5: Interface Preservation**
  - `InferenceResult` has all required fields: `success`, `output`, `parsed`, `error`, `latencyMs`, `level`
  - `InferenceOptions` accepted by both dispatch paths without modification

  - **RED PHASE**: Tests should be written to FAIL initially (implementation doesn't exist yet). Import the functions/types that WILL exist, mock the dependencies. The test file defines the expected behavior contract.
  - Use `bun:test` module: `import { describe, it, expect, mock, beforeEach } from 'bun:test'`
  - Mock `fetch` globally with `mock.module` or `globalThis.fetch = mock()`
  - Mock `child_process.spawn` for Claude CLI path tests

  **Must NOT do**:
  - Do NOT make real HTTP calls to LiteLLM or any backend
  - Do NOT spawn real `claude` CLI processes
  - Do NOT read the actual `settings.json` — use inline mock config objects
  - Do NOT add test framework dependencies — bun:test is built-in

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex test design requiring understanding of async patterns, mocking strategies, and OpenAI API format
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `webapp-testing`: Not applicable — these are unit tests, not browser tests

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete before Task 7)
  - **Parallel Group**: Wave 2 (sequential with Task 7)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:1-60` — Type definitions (`InferenceOptions`, `InferenceResult`, `InferenceLevel`, `LEVEL_CONFIG`) — these are the contracts tests must verify
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:62-254` — Current `inference()` function showing spawn logic, JSON extraction, error handling, timeout — tests must cover equivalent behavior for both dispatch paths

  **API/Type References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:5-12` — `InferenceOptions` interface: `{ systemPrompt: string, userPrompt: string, level?: InferenceLevel, expectJson?: boolean, timeout?: number }`
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:14-21` — `InferenceResult` interface: `{ success: boolean, output: string, parsed?: unknown, error?: string, latencyMs: number, level: InferenceLevel }`

  **External References**:
  - OpenAI Chat Completions response format: `{ choices: [{ message: { content: "..." } }] }` — this is what LiteLLM returns
  - Bun test API: `describe`, `it`, `expect`, `mock`, `beforeEach`, `afterEach`

  **WHY Each Reference Matters**:
  - Inference.ts types define the EXACT contract tests must enforce — any drift means interface broke
  - OpenAI response format is what the HTTP path must parse — tests mock this exact shape
  - Current spawn logic shows the fallback behavior tests must verify

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Test file runs and all tests are defined (RED phase — expected failures OK)
    Tool: Bash
    Preconditions: package.json exists (Task 1), test file created
    Steps:
      1. Run: cd Releases/v4.0.3/.claude && bun test PAI/Tools/__tests__/Inference.test.ts 2>&1
      2. Count total test cases in output
      3. Assert at least 15 test cases defined
    Expected Result: 15+ test cases listed (may fail if implementation missing — that's expected in RED phase)
    Failure Indicators: Syntax error in test file, import resolution failure, 0 tests found
    Evidence: .sisyphus/evidence/task-5-test-suite-red.txt

  Scenario: Test file has no syntax errors
    Tool: Bash
    Preconditions: Test file exists
    Steps:
      1. Run: bun build --no-bundle Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts 2>&1
      2. Assert no "SyntaxError" or "TypeError" in output
    Expected Result: File parses without syntax errors
    Failure Indicators: SyntaxError, unexpected token
    Evidence: .sisyphus/evidence/task-5-syntax-check.txt
  ```

  **Commit**: YES (group 3)
  - Message: `test: add inference multi-backend test suite`
  - Files: `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts`
  - Pre-commit: `cd Releases/v4.0.3/.claude && bun test PAI/Tools/__tests__/Inference.test.ts 2>&1 || true` (RED phase — failures expected)

- [x] 6. Docker Compose - Add LiteLLM Proxy Service

  **What to do**:
  - Add a `litellm` service to `~/workspace/ollama/docker-compose.yml` with this specification:
    - Image: `ghcr.io/berriai/litellm:main-stable`
    - Container name: `litellm-proxy`
    - Restart: `on-failure:5`
    - Networks: `overlay` (same as Ollama)
    - Ports: `4000:4000` (published to host)
    - Volumes: `./litellm_config.yaml:/app/config.yaml:ro`
    - Command: `--config /app/config.yaml --port 4000`
    - Environment: `GROQ_API_KEY`, `GITHUB_API_KEY`, `LITELLM_MASTER_KEY` (all from `.env` via `${VAR:-}`)
    - Depends_on: `ollama` with `condition: service_healthy`
    - Healthcheck: `curl -sf http://127.0.0.1:4000/health/liveliness || exit 1` (30s interval, 10s timeout, 5 retries)
  - Place AFTER the `ollama` service, BEFORE `open-webui` (logical grouping: core infra then proxy then UI)
  - Mount `litellm_config.yaml` as read-only volume
  - Pass API keys from environment (Docker Compose resolves from `.env`)

  **Must NOT do**:
  - Do NOT add PostgreSQL service - config-only mode
  - Do NOT modify the existing `ollama`, `open-webui`, or `pipelines` services
  - Do NOT change the `overlay` network configuration
  - Do NOT add GPU reservation to LiteLLM - it is a proxy, not a model runner

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Docker Compose modification requires understanding service dependencies, network topology, and health check patterns
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `docker-local-dev`: Close but designed for generating new stacks, not modifying existing ones

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 4

  **References**:

  **Pattern References**:
  - `~/workspace/ollama/docker-compose.yml:1-45` - Existing Ollama service definition: follow same patterns for `restart`, `networks`, `healthcheck`, `environment` formatting
  - `~/workspace/ollama/docker-compose.yml:1-3` - Network config: `networks: overlay: external: true` - LiteLLM must join this same network
  - `~/workspace/ollama/docker-compose.yml:39-45` - Ollama healthcheck pattern: `CMD-SHELL` + `curl -sf` + `interval/timeout/retries` - replicate this style

  **API/Type References**:
  - LiteLLM health endpoint: `GET /health/liveliness` returns `200 OK` when proxy is running
  - LiteLLM CLI: `--config /path/to/config.yaml --port 4000`

  **WHY Each Reference Matters**:
  - Existing docker-compose.yml patterns must be matched exactly for consistency
  - Network config is critical - LiteLLM needs to reach Ollama by hostname `ollama`
  - Healthcheck pattern ensures LiteLLM is ready before other services depend on it

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Docker Compose validates with LiteLLM service
    Tool: Bash
    Preconditions: docker-compose.yml modified, litellm_config.yaml exists
    Steps:
      1. Run: docker compose -f ~/workspace/ollama/docker-compose.yml config --quiet 2>&1
      2. Assert exit code is 0
    Expected Result: Clean validation, no errors
    Failure Indicators: YAML error, undefined variable warning, service dependency error
    Evidence: .sisyphus/evidence/task-6-compose-validates.txt

  Scenario: LiteLLM service has correct configuration
    Tool: Bash
    Preconditions: docker-compose.yml has litellm service
    Steps:
      1. Run: docker compose -f ~/workspace/ollama/docker-compose.yml config 2>&1
      2. Assert output contains litellm service with container_name litellm-proxy
      3. Assert port 4000:4000 is mapped
      4. Assert overlay network is attached
      5. Assert config.yaml volume mount exists
    Expected Result: All config elements present
    Failure Indicators: Missing port, network, or volume mapping
    Evidence: .sisyphus/evidence/task-6-litellm-config.txt

  Scenario: Existing services unchanged
    Tool: Bash
    Preconditions: docker-compose.yml modified
    Steps:
      1. Run: docker compose -f ~/workspace/ollama/docker-compose.yml config 2>&1 | grep container_name
      2. Assert output contains ollama-local, open-webui, litellm-proxy
    Expected Result: All 3 containers present, original 2 unchanged
    Failure Indicators: Missing ollama-local or open-webui
    Evidence: .sisyphus/evidence/task-6-existing-services.txt
  ```

  **Commit**: YES (group with Tasks 2, 4 - committed to ollama repo)
  - Message: `feat: add LiteLLM proxy service for multi-backend routing`
  - Files: `docker-compose.yml`, `litellm_config.yaml`, `.env.example`
  - Pre-commit: `docker compose -f ~/workspace/ollama/docker-compose.yml config --quiet`

- [ ] 7. Inference.ts Multi-Backend Implementation (GREEN Phase - TDD)

  **What to do**:
  - Modify `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts` to add conditional LiteLLM HTTP dispatch while preserving existing Claude CLI dispatch as default.

  **New functions to add** (internal, not exported):

  1. **`readInferenceConfig()`**: Read `inference` section from `~/.claude/settings.json` (runtime path)
      - Use `join(process.env.HOME!, '.claude/settings.json')` — matching the `identity.ts` pattern at line 13: `const SETTINGS_PATH = join(HOME, '.claude/settings.json')`
      - Use `readFileSync` + `JSON.parse` (match `identity.ts` pattern)
      - Return `null` if section missing or `enabled: false`
      - Do NOT cache - read fresh each call (inference calls are infrequent)
      - Return typed `InferenceConfig` interface
      - **IMPORTANT**: This reads the RUNTIME path (`~/.claude/settings.json`), NOT the repo path (`Releases/v4.0.3/.claude/settings.json`)

  2. **`resolveModel(level, config)`**: Resolve InferenceLevel to model name
     - Look up `config.routing[level]` to get backend name
     - If routing not defined for level, use `config.default_backend`
     - Look up `config.backends[backend][level]` to get model name
     - Return `{ backend: string, model: string }`

  3. **`dispatchLiteLLM(options, model, config)`**: HTTP dispatch to LiteLLM proxy
     - POST to `config.litellm.api_base + /chat/completions`
     - Body: `{ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }`
     - Headers: `Content-Type: application/json` + optional `Authorization: Bearer api_key` if key set
     - Use `AbortSignal.timeout(timeout)` for request timeout
     - Parse response: extract `choices[0].message.content`
     - If `expectJson`, run existing JSON extraction regex on the content
     - Return `InferenceResult` with all fields populated
     - On any error: return `{ success: false, error: message, ... }`

  **Modify existing `inference()` function** (~15 lines added at top):
  - At the TOP (before existing spawn logic):
    1. Call `readInferenceConfig()`
    2. If config is non-null (enabled):
       a. Call `resolveModel()` to get target model
       b. Try `dispatchLiteLLM()`
       c. On success: return result
       d. On failure (connection error, timeout): log warning, fall through to Claude CLI
    3. If config is null: skip directly to existing Claude CLI spawn (unchanged)
  - The existing `spawn('claude', ...)` logic remains EXACTLY as-is - it is the fallback path
  - The fallback is AUTOMATIC - no user intervention needed

  **Connection timeout for fallback**:
  - Use `config.litellm.health_timeout_ms` (default 3000ms) as the connection timeout
  - If fetch throws AbortError or network error, fall back to Claude CLI
  - This prevents slow LiteLLM from blocking hooks that fire on every user message

  **Type definitions** (new, internal to file):
  - `interface InferenceConfig` with: enabled, litellm (api_base, api_key, health_timeout_ms), backends (Record of string to Record of InferenceLevel to string), default_backend, routing (Record of InferenceLevel to string)
  - Keep types local to Inference.ts - do NOT export them

  **Must NOT do**:
  - Do NOT change `InferenceOptions` or `InferenceResult` interfaces
  - Do NOT change `LEVEL_CONFIG` - still used for Claude CLI fallback
  - Do NOT change the function signature of `inference()`
  - Do NOT remove existing Claude CLI dispatch code - it becomes the fallback
  - Do NOT add external dependencies - use Bun native `fetch` only
  - Do NOT add retry logic - LiteLLM handles retries via router_settings
  - Do NOT add streaming support
  - Do NOT cache the inference config
  - Do NOT add console.log in production code
  - Do NOT over-abstract - no BackendFactory, no DispatchStrategy classes

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core implementation requiring careful modification of existing code, async patterns, error handling, and TDD GREEN phase
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 5 completing)
  - **Parallel Group**: Wave 2 (sequential after Task 5)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:1-254` - ENTIRE FILE. The executor must read and understand all 254 lines before modifying. Key sections: Lines 1-4 imports, Lines 5-21 type definitions (DO NOT MODIFY), Lines 23-28 LEVEL_CONFIG (DO NOT MODIFY), Lines 30-60 inference() start (modify here to add config check), Lines 62-254 existing spawn logic (keep as fallback)
  - `Releases/v4.0.3/.claude/hooks/lib/identity.ts:12-13` - Settings.json reading pattern: `const HOME = process.env.HOME!; const SETTINGS_PATH = join(HOME, '.claude/settings.json')`. Lines 86-98 show readFileSync + JSON.parse + fallback. Follow this exact pattern for readInferenceConfig() — read from `~/.claude/settings.json` (runtime), NOT the repo copy

  **API/Type References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:5-12` - InferenceOptions interface (DO NOT MODIFY)
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:14-21` - InferenceResult interface (DO NOT MODIFY)
  - OpenAI Chat Completions format: POST /chat/completions with model + messages, response has choices[0].message.content

  **Test References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` (from Task 5) - ALL tests must pass. Run bun test after every significant change.

  **WHY Each Reference Matters**:
  - Full Inference.ts is the implementation target - must understand every line
  - identity.ts shows the established pattern for reading settings.json
  - Test file defines the behavioral contract
  - OpenAI format is what LiteLLM speaks

  **Acceptance Criteria**:

  **If TDD (GREEN phase):**
  - [ ] `bun test PAI/Tools/__tests__/Inference.test.ts` runs with ALL PASS
  - [ ] Zero test failures, zero test skips

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All tests pass (GREEN phase complete)
    Tool: Bash
    Preconditions: Task 5 tests exist, implementation complete
    Steps:
      1. Run: cd Releases/v4.0.3/.claude && bun test PAI/Tools/__tests__/Inference.test.ts 2>&1
      2. Assert 0 failures in output
      3. Assert at least 15 tests passed
    Expected Result: All 15+ tests pass with 0 failures
    Failure Indicators: Any test failure, import error, type error
    Evidence: .sisyphus/evidence/task-7-all-tests-pass.txt

  Scenario: InferenceOptions interface unchanged
    Tool: Bash
    Preconditions: Inference.ts modified
    Steps:
      1. Run: grep -A6 "export interface InferenceOptions" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
      2. Assert contains systemPrompt, userPrompt, level, expectJson, timeout
      3. Assert does NOT contain backend, model, or provider fields
    Expected Result: Interface identical to original - no new fields
    Failure Indicators: New fields added, existing fields changed
    Evidence: .sisyphus/evidence/task-7-interface-unchanged.txt

  Scenario: InferenceResult interface unchanged
    Tool: Bash
    Preconditions: Inference.ts modified
    Steps:
      1. Run: grep -A8 "export interface InferenceResult" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
      2. Assert contains success, output, parsed, error, latencyMs, level
    Expected Result: Interface identical to original
    Failure Indicators: New or changed fields
    Evidence: .sisyphus/evidence/task-7-result-interface.txt

  Scenario: No external dependencies added
    Tool: Bash
    Preconditions: Inference.ts modified
    Steps:
      1. Run: grep "^import" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
      2. Assert only stdlib imports (child_process, path, fs, os)
    Expected Result: No axios, node-fetch, got, or other external packages
    Failure Indicators: External package import found
    Evidence: .sisyphus/evidence/task-7-no-external-deps.txt

  Scenario: Fallback path preserved - Claude CLI spawn code still exists
    Tool: Bash
    Preconditions: Inference.ts modified
    Steps:
      1. Run: grep -c "spawn(" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
      2. Assert count >= 1
      3. Run: grep "LEVEL_CONFIG" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts | head -1
      4. Assert LEVEL_CONFIG still defined
    Expected Result: spawn() and LEVEL_CONFIG still present
    Failure Indicators: spawn removed, LEVEL_CONFIG deleted
    Evidence: .sisyphus/evidence/task-7-fallback-preserved.txt
  ```

  **Commit**: YES (group 4)
  - Message: `feat: add multi-backend dispatch to Inference.ts with LiteLLM support`
  - Files: `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts`
  - Pre-commit: `cd Releases/v4.0.3/.claude && bun test PAI/Tools/__tests__/Inference.test.ts`

- [ ] 8. Integration QA - End-to-End Verification

  **What to do**:
  - Verify the complete chain works end-to-end: `~/.claude/settings.json config` → `Inference.ts reads config` → `HTTP dispatch to LiteLLM` → `LiteLLM routes to Ollama` → `response returned`
  - Also verify fallback: `LiteLLM unreachable` → `automatic fallback to Claude CLI`

  **Steps**:

  1. **Docker Stack Verification**:
     - Start the Ollama Docker stack: `docker compose -f ~/workspace/ollama/docker-compose.yml up -d`
     - Wait for LiteLLM healthcheck to pass: poll `http://localhost:4000/health/liveliness` until 200 (max 60s)
     - Verify Ollama connectivity from LiteLLM: `curl http://localhost:4000/v1/models` returns model list

  2. **Direct LiteLLM API Test**:
     - Send a chat completion request directly to LiteLLM proxy:
       ```bash
       curl -s http://localhost:4000/chat/completions \
         -H "Content-Type: application/json" \
         -d '{"model":"ollama/phi4","messages":[{"role":"user","content":"Say hello in one word"}]}'
       ```
     - Assert response contains `choices[0].message.content` with non-empty string

   3. **Inference.ts Integration Test** (with LiteLLM running):
      - Temporarily set `inference.enabled: true` in `~/.claude/settings.json` (runtime copy)
      - Run Inference.ts directly: `bun Releases/v4.0.3/.claude/PAI/Tools/Inference.ts --level fast "Reply with one word" "What is 2+2?"`
      - Assert output contains a response (not an error)
      - Revert `~/.claude/settings.json` change

   4. **Fallback Verification** (with LiteLLM stopped):
      - Stop LiteLLM container: `docker stop litellm-proxy`
      - Keep `inference.enabled: true` in `~/.claude/settings.json` (runtime copy)
      - Run Inference.ts — should fallback to Claude CLI within 3s
      - Verify the response comes from Claude (content quality check)
      - Restart LiteLLM: `docker start litellm-proxy`
      - Revert `~/.claude/settings.json`

   5. **Default Behavior Verification** (no config):
      - Set `inference.enabled: false` in `~/.claude/settings.json` (or remove inference section)
      - Run Inference.ts — should use Claude CLI directly
      - Verify normal operation unchanged

  **Must NOT do**:
   - Do NOT leave `inference.enabled: true` in `~/.claude/settings.json` after testing — revert to `false`
  - Do NOT modify any source code during integration QA
  - Do NOT commit any changes — this is a verification-only task
  - Do NOT leave Docker containers running unless they were running before

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-step integration testing across Docker services, config files, and TypeScript runtime
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6, 7

  **References**:

  **Pattern References**:
  - `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts:225-254` — CLI entry point: `if (import.meta.main)` block. Usage: `bun Inference.ts [--level fast|standard|smart] [--json] [--timeout <ms>] <system_prompt> <user_prompt>` — positional args for system and user prompts, flags optional
  - `~/workspace/ollama/docker-compose.yml` — Docker stack with all services including LiteLLM
  - `~/.claude/settings.json` — The runtime `inference` config to toggle `enabled` flag (this is the file Inference.ts reads — do NOT edit the repository copy under `Releases/`)

  **API/Type References**:
  - LiteLLM health: `GET http://localhost:4000/health/liveliness` → `200 OK`
  - LiteLLM models: `GET http://localhost:4000/v1/models` → JSON list of available models
  - LiteLLM chat: `POST http://localhost:4000/chat/completions` → OpenAI-format response

  **WHY Each Reference Matters**:
  - CLI entry point shows exactly how to invoke Inference.ts — use positional args `<system_prompt> <user_prompt>`, NOT `--system`/`--prompt` flags
  - Docker compose is needed to start/stop services
  - `~/.claude/settings.json` (runtime copy) is what Inference.ts actually reads — toggle `inference.enabled` here, NOT in the repo copy

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: LiteLLM proxy starts and passes healthcheck
    Tool: Bash
    Preconditions: Docker stack running, litellm_config.yaml present
    Steps:
      1. Run: docker compose -f ~/workspace/ollama/docker-compose.yml up -d
      2. Poll: for i in $(seq 1 12); do curl -sf http://localhost:4000/health/liveliness && break; sleep 5; done
      3. Assert curl returns 200 within 60 seconds
    Expected Result: LiteLLM responds to health check
    Failure Indicators: Timeout after 60s, connection refused, 500 error
    Evidence: .sisyphus/evidence/task-8-litellm-health.txt

  Scenario: LiteLLM routes to Ollama successfully
    Tool: Bash
    Preconditions: Docker stack running, LiteLLM healthy
    Steps:
      1. Run: curl -s http://localhost:4000/chat/completions -H "Content-Type: application/json" -d '{"model":"ollama/phi4","messages":[{"role":"user","content":"Say hello in one word"}]}' --max-time 30
      2. Assert response contains "choices" key
      3. Assert choices[0].message.content is non-empty string
    Expected Result: Valid chat completion response from Ollama via LiteLLM
    Failure Indicators: Connection refused, 404, empty content, timeout
    Evidence: .sisyphus/evidence/task-8-litellm-ollama-route.txt

  Scenario: Inference.ts dispatches through LiteLLM when enabled
    Tool: Bash
    Preconditions: Docker stack running, LiteLLM healthy, inference.enabled temporarily set to true in ~/.claude/settings.json
    Steps:
      1. Set inference.enabled=true in ~/.claude/settings.json (temporary, runtime copy)
      2. Run: bun Releases/v4.0.3/.claude/PAI/Tools/Inference.ts --level fast "Reply with one word" "What is 2+2?" 2>&1
      3. Assert output contains a response (non-error)
      4. Revert inference.enabled=false in ~/.claude/settings.json
    Expected Result: Inference returns a valid response routed through LiteLLM
    Failure Indicators: Error message, fallback to Claude CLI when LiteLLM is running
    Evidence: .sisyphus/evidence/task-8-inference-litellm.txt

  Scenario: Inference.ts falls back to Claude CLI when LiteLLM is down
    Tool: Bash
    Preconditions: inference.enabled=true in ~/.claude/settings.json, LiteLLM container stopped
    Steps:
      1. Run: docker stop litellm-proxy
      2. Set inference.enabled=true in ~/.claude/settings.json (temporary, runtime copy)
      3. Run: timeout 30 bun Releases/v4.0.3/.claude/PAI/Tools/Inference.ts --level fast "Reply with one word" "What is 2+2?" 2>&1
      4. Assert response received (from Claude CLI fallback)
      5. Assert total time < 10s (3s timeout + Claude CLI time)
      6. Revert inference.enabled=false in ~/.claude/settings.json
      7. Run: docker start litellm-proxy
    Expected Result: Automatic fallback to Claude CLI within ~3s + Claude response time
    Failure Indicators: Hang longer than 10s, crash, no response
    Evidence: .sisyphus/evidence/task-8-fallback-claude.txt

  Scenario: Default behavior unchanged (inference disabled)
    Tool: Bash
    Preconditions: inference.enabled=false in ~/.claude/settings.json (default)
    Steps:
      1. Verify inference.enabled is false in ~/.claude/settings.json (runtime copy)
      2. Run: bun Releases/v4.0.3/.claude/PAI/Tools/Inference.ts --level fast "Reply with one word" "What is 2+2?" 2>&1
      3. Assert response received (from Claude CLI directly)
    Expected Result: Normal Claude CLI behavior, no LiteLLM involvement
    Failure Indicators: HTTP connection attempt to port 4000
    Evidence: .sisyphus/evidence/task-8-default-behavior.txt
  ```

  **Evidence to Capture:**
  - [ ] Screenshots/logs for each scenario
  - [ ] Docker container status before/after
  - [ ] settings.json verified reverted to enabled=false in ~/.claude/settings.json after testing

  **Commit**: NO (verification-only task, no code changes)

- [ ] 9. Documentation - INFERENCE.md

  **What to do**:
  - Create `Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md` documenting multi-backend inference setup and usage:

  **Structure**:
  ```markdown
  # Multi-Backend Inference

  ## Overview
  - What it does: routes inference() through LiteLLM proxy to multiple backends
  - Architecture diagram (text-based): PAI → LiteLLM → Ollama/Groq/GitHub
  - Default behavior: Claude CLI (no config changes needed)

  ## Quick Start
  1. Start Docker stack: `docker compose -f ~/workspace/ollama/docker-compose.yml up -d`
  2. Set API keys in `~/workspace/ollama/.env`
  3. Enable in settings.json: set `inference.enabled: true`
  4. Test: run a PAI command that uses inference

  ## Configuration Reference
  - Full settings.json `inference` section with all fields documented
  - Each field: type, default, description
  - Example routing configurations (all-local, all-cloud, hybrid)

  ## Available Backends
  - **Ollama**: Local models, private, no API key needed
  - **Groq**: Fast cloud inference, requires API key
  - **GitHub Models**: Broad model selection, requires GitHub token

  ## Routing
  - How routing works: InferenceLevel → routing config → backend → model
  - Default routing: fast→groq, standard→ollama, smart→github
  - How to customize routing

  ## Troubleshooting
  - LiteLLM not starting: check Docker logs
  - Model not found: verify litellm_config.yaml model names
  - Slow responses: check Ollama model loading
  - Fallback behavior: when/why Claude CLI is used
  ```

  **Must NOT do**:
  - Do NOT document internal implementation details (function names, code structure)
  - Do NOT include actual API keys or secret values
  - Do NOT over-document — keep it concise and actionable
  - Do NOT document features that don't exist (streaming, model management, admin UI)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation creation — clear, structured technical writing
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `documentation-guidelines`: PAI doesn't have DOCUMENTATION_GUIDELINES.md — follow existing docs patterns instead

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `Releases/v4.0.3/.claude/PAI/docs/` — Check if this directory exists and what other docs are there for style reference
  - `Releases/v4.0.3/README.md` — PAI README for documentation tone and formatting style

  **API/Type References**:
  - `Releases/v4.0.3/.claude/settings.json` (inference section) — Document every field with type and default
  - `~/workspace/ollama/litellm_config.yaml` — Reference for available models and backend names

  **WHY Each Reference Matters**:
  - Existing docs set the tone and level of detail expected
  - settings.json inference section is the primary config surface users interact with
  - litellm_config.yaml shows what models are available by default

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: INFERENCE.md exists and is well-structured
    Tool: Bash
    Preconditions: Documentation file created
    Steps:
      1. Run: test -f Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md && echo "exists"
      2. Run: grep -c "^##" Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md
      3. Assert file exists and has at least 5 level-2 headings
    Expected Result: File exists with proper structure
    Failure Indicators: File missing, fewer than 5 sections
    Evidence: .sisyphus/evidence/task-9-doc-structure.txt

  Scenario: Documentation contains all required sections
    Tool: Bash
    Preconditions: INFERENCE.md exists
    Steps:
      1. Run: grep -i "quick start\|configuration\|backends\|routing\|troubleshooting" Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md | wc -l
      2. Assert count >= 5 (all major sections present)
    Expected Result: All required sections found
    Failure Indicators: Missing sections
    Evidence: .sisyphus/evidence/task-9-doc-sections.txt

  Scenario: No secrets in documentation
    Tool: Bash
    Preconditions: INFERENCE.md exists
    Steps:
      1. Run: grep -iE "sk-|ghp_|gsk_|api_key.*=.*[a-zA-Z0-9]{10}" Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md || echo "clean"
      2. Assert output is "clean"
    Expected Result: Zero hardcoded secrets
    Failure Indicators: Any secret-like string found
    Evidence: .sisyphus/evidence/task-9-no-secrets.txt
  ```

  **Commit**: YES (group 5)
  - Message: `docs: add multi-backend inference documentation`
  - Files: `Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md`
  - Pre-commit: None

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run `bun test`, `docker compose config`). For each "Must NOT Have": search codebase for forbidden patterns (interface changes, secrets in tracked files, PostgreSQL config, external HTTP libs). Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun test` on all test files. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify `InferenceOptions` and `InferenceResult` types are IDENTICAL to original. Verify no secrets in tracked files.
  Output: `Tests [N pass/N fail] | Files [N clean/N issues] | Interface [UNCHANGED/CHANGED] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: settings.json config → Inference.ts backend selection → LiteLLM proxy routing. Test edge cases: no config (default behavior), invalid config, LiteLLM unreachable. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT Have" compliance: no interface changes, no caller mods, no PostgreSQL, no streaming, no external libs. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Scope [CLEAN/N creep items] | Interface [INTACT/BROKEN] | VERDICT`

---

## Commit Strategy

> **TWO REPOS**: PAI repo (`Personal_AI_Infrastructure`) and Ollama repo (`~/workspace/ollama`). Commits are separate.

### PAI Repo Commits
| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `chore: add package.json for bun test infrastructure` | `Releases/v4.0.3/.claude/package.json` | — |
| 2 | `feat: add inference config section to settings.json` | `Releases/v4.0.3/.claude/settings.json` | `bun -e "JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8'))"` |
| 3 | `test: add inference multi-backend test suite` | `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` | `bun test Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` |
| 4 | `feat: add multi-backend dispatch to Inference.ts with LiteLLM support` | `Releases/v4.0.3/.claude/PAI/Tools/Inference.ts` | `bun test Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts` |
| 5 | `docs: add multi-backend inference documentation` | `Releases/v4.0.3/.claude/PAI/docs/INFERENCE.md` | — |

### Ollama Repo Commits
| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 6 | `feat: add LiteLLM proxy service for multi-backend routing` | `docker-compose.yml`, `litellm_config.yaml`, `.env.example` | `docker compose config --quiet` |

---

## Success Criteria

### Verification Commands
```bash
# Tests pass
bun test Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts
# Expected: All tests pass (config parsing, routing, HTTP client, fallback)

# Docker Compose validates
docker compose -f ~/workspace/ollama/docker-compose.yml config --quiet
# Expected: Exit code 0

# settings.json still valid
bun -e "JSON.parse(require('fs').readFileSync('Releases/v4.0.3/.claude/settings.json','utf8')); console.log('valid')"
# Expected: "valid"

# LiteLLM config valid YAML
bun -e "const f=require('fs').readFileSync(require('os').homedir()+'/workspace/ollama/litellm_config.yaml','utf8'); const models=(f.match(/model_name:/g)||[]).length; console.log('models:', models); if(models<3) throw 'Expected 3+ model_name entries'"
# Expected: "models: N" (N >= 3)

# No interface changes
grep -A5 "export interface InferenceOptions" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
# Expected: Identical to original (systemPrompt, userPrompt, level?, expectJson?, timeout?)
grep -A8 "export interface InferenceResult" Releases/v4.0.3/.claude/PAI/Tools/Inference.ts
# Expected: Identical to original (success, output, parsed?, error?, latencyMs, level)
```

### Final Checklist
- [ ] All "Must Have" items verified present
- [ ] All "Must NOT Have" items verified absent
- [ ] All bun tests pass
- [ ] Docker Compose validates
- [ ] settings.json remains valid JSON
- [ ] No secrets in any tracked file
- [ ] All 8 call sites work without modification
- [ ] Default behavior (no config) unchanged
