# Learnings - Multi-Backend Inference

> **Purpose**: Conventions, patterns, and established decisions captured during implementation.
> **Format**: `## [TIMESTAMP] Task: {task-id}` followed by learnings.
> **Instruction to Subagents**: APPEND findings here. Never overwrite. Use bash echo >> or Write tool in append mode.

---


## 2026-03-12 Task: Create package.json for Bun test infrastructure

**Context**: First task of multi-backend inference setup. Creating initial package.json for PAI's test infrastructure in Releases/v4.0.3/.claude/

**Key Findings**:
- Created minimal package.json with name "pai-claude", type "module", and two test scripts
- File location: `Releases/v4.0.3/.claude/package.json`
- JSON validation successful via node CLI
- Scripts configured:
  - `test`: "bun test" (primary test runner)
  - `test:inference`: "bun test PAI/Tools/__tests__/Inference.test.ts" (specific inference tests)

**Verification Results**:
- ✅ JSON is valid (parsed successfully)
- ✅ File structure correct for bun test infrastructure
- ✅ Module type set to "module" (ESM support)
- ✅ No external dependencies needed (bun has built-in test runner)

**Patterns Established**:
- Minimal config is better than bloated setup
- Test scripts are scoped for both broad and specific test runs
- No dependencies = faster setup and fewer compatibility issues

**Infrastructure State**:
- Test infrastructure: READY
- Blocks downstream: Tasks 5, 7 (depend on this test setup)


## 2026-03-12 Task: Add inference config section to settings.json

**Context**: Second task of multi-backend inference setup. Adding the inference section to `Releases/v4.0.3/.claude/settings.json` — the version-controlled template that gets installed to `~/.claude/settings.json` at runtime.

**Key Findings**:
- File location: `Releases/v4.0.3/.claude/settings.json` (1057 lines, starting at line 972 for preferences)
- Inserted `inference` section after `preferences` key to maintain alphabetical-ish ordering
- Structure matches plan lines 404-438 exactly (33 new lines added)
- Used 2-space indentation throughout to match existing file formatting

**Configuration Details**:
- `enabled: false` by default — LiteLLM is opt-in; Claude CLI remains fallback
- `litellm.api_base`: "http://localhost:4000" (standard LiteLLM proxy port)
- `litellm.health_timeout_ms`: 3000 (controls fallback trigger)
- `backends`: maps ollama/groq/github to 3 model tiers (fast/standard/smart)
- `routing`: maps InferenceLevel to preferred backend (fast→groq, standard→ollama, smart→github)
- `_docs` key explains the feature inline (for documentation via settings)

**Verification Results**:
- ✅ Scenario 1: JSON valid, "inference" key present (`valid\nhas inference: true`)
- ✅ Scenario 2: Structure correct (`enabled: false, backends: ollama,groq,github, routing: fast,standard,smart`)
- ✅ Scenario 3: All pre-existing top-level keys intact (hooks, permissions, env, pai, preferences)
- ✅ Git commit successful: `feat: add inference config section to settings.json` (33 insertions)
- ✅ Evidence files created in `.sisyphus/evidence/task-3-*.txt`

**Patterns Established**:
- Insert new top-level keys near related keys (inference after preferences)
- Always include `_docs` for self-documenting settings
- Use exact indentation of existing file (2 spaces, no tabs)
- Verify JSON parsing + structure + pre-existing content all pass before committing

**Critical Decision**:
- `api_key: ""` left empty by default — API keys for Groq/GitHub go in Ollama stack's `.env`, NOT in settings.json (security boundary)

**Infrastructure State**:
- Settings.json with inference config: READY
- Blocks downstream: Tasks 5, 7 (depend on this configuration)


## 2026-03-12 Task: Update .env files with LiteLLM configuration

**Context**: Fourth task of multi-backend inference setup. Appending LiteLLM API key placeholders to both `~/workspace/ollama/.env.example` and `~/workspace/ollama/.env` — the environment files that Docker Compose reads at startup.

**Key Findings**:
- `.env.example` did NOT exist — created it from scratch as a template
- `.env` existed with 26 lines of config (HuggingFace token, OpenRouter keys, Ollama settings)
- Both files now contain identical LiteLLM section (GROQ_API_KEY, GITHUB_API_KEY, LITELLM_MASTER_KEY)
- All keys set to empty values in .example (no secrets leaked)
- All keys appended to .env with empty placeholders (prevents Docker Compose warnings about undefined vars)

**File Modifications**:
- Created: `/home/developer/workspace/ollama/.env.example` (38 lines total)
  - Mirrored structure of .env with sanitized values
  - Added LiteLLM section at end with documentation comments
- Modified: `/home/developer/workspace/ollama/.env` (38 lines total)
  - Preserved all 26 existing lines
  - Appended LiteLLM section (12 new lines)

**LiteLLM Section Format**:
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

**QA Scenarios - ALL PASSED**:
1. ✅ `.env.example` contains 3 LiteLLM key definitions (grep count: 3)
2. ✅ `.env` has empty placeholders for both GROQ_API_KEY and GITHUB_API_KEY
3. ✅ No secret values leaked in `.env.example` (all = signs followed by empty string)

**Evidence Captured**:
- `.sisyphus/evidence/task-4-env-example.txt` — Keys present verification
- `.sisyphus/evidence/task-4-env-placeholders.txt` — Placeholders in .env confirmation
- `.sisyphus/evidence/task-4-no-secrets.txt` — No secrets leak verification

**Patterns Established**:
- Comment style in .env files: `# === SECTION ===` as header, then short comment per key, then empty value
- APPEND-only operations on .env preserve existing content perfectly
- Empty placeholders in .env prevent Docker Compose "undefined var" warnings at runtime
- .env.example serves as documentation template — includes helpful links to API key sources
- All LiteLLM keys externalized from settings.json to .env for security boundary (Task 3 decision reinforced)

**Infrastructure State**:
- Ollama stack environment files: READY
- Docker Compose can start without warnings about undefined LiteLLM vars
- Blocks downstream: Task 6 (LiteLLM proxy config.yaml depends on these env vars being defined)


## 2026-03-12 Task: 5

**Context**: Created RED-phase test contract for upcoming multi-backend inference implementation in `Releases/v4.0.3/.claude/PAI/Tools/__tests__/Inference.test.ts`.

**Test Strategy Decisions**:
- Designed suite around five contract groups to mirror plan scope and enforce behavior boundaries before implementation.
- Imported future symbols (`readInferenceConfig`, `resolveModel`, `dispatchLiteLLM`, `InferenceConfig`) intentionally to keep RED-phase failures meaningful.
- Used dynamic import cache-busting (`?test=...`) to isolate module state per test and reduce cross-test contamination risk.

**Mocking Patterns Applied**:
- Global `fetch` mocked in `beforeEach` with explicit per-test overrides to prevent real HTTP calls.
- `child_process.spawn` mocked via `mock.module("child_process", ...)` and a controllable fake process emitter for fallback tests.
- OpenAI response schema standardized as `{ choices: [{ message: { content } }] }` in all HTTP extraction assertions.

**Edge Cases Captured**:
- Missing inference config and partial config merge behavior.
- Invalid `health_timeout_ms` normalization to default.
- Routing gaps: missing routing keys, missing backend, and no resolvable model.
- LiteLLM failure modes: fetch throw, non-2xx response, malformed upstream payload.
- Interface invariants: `InferenceResult` required fields and level echo contract.

**Verification Notes**:
- QA commands executed and evidence files written:
  - `.sisyphus/evidence/task-5-test-suite-red.txt`
  - `.sisyphus/evidence/task-5-syntax-check.txt`
- Environment limitation observed: `bun: command not found` (expected command-output evidence captured for orchestrator visibility).


## 2026-03-12 Task: 6 - LiteLLM Service Added to Docker Stack

### Service Architecture Decisions

**Placement Rationale**: litellm positioned between ollama and open-webui
- Logical flow: Core infra (ollama) → Proxy layer (litellm) → UI (open-webui)
- Dependency chain: litellm depends_on ollama with health condition
- Future-proof: Allows open-webui to route through litellm instead of direct ollama access

**Network Topology**: All services on shared `overlay` network
- litellm can reach ollama at `ollama:11434` via Docker DNS
- open-webui can reach litellm at `litellm-proxy:4000` (container name resolution)
- External access: litellm exposed on host port 4000

### Healthcheck Pattern

**LiteLLM Endpoint**: `/health/liveliness` (double 'l' is intentional)
- Not `/health/liveness` - verified against LiteLLM docs
- Uses 127.0.0.1 (localhost inside container), not ollama:11434
- Startup tolerance: 30s interval, 10s timeout, 5 retries (allows ~2.5min startup)

**Service Dependency Chain**:
1. ollama starts → healthcheck waits for `/v1/models` endpoint
2. litellm waits for ollama service_healthy condition → starts proxy
3. open-webui can be configured to depend on litellm in future tasks

### Volume Mount Strategy

**Config File**: `./litellm_config.yaml:/app/config.yaml:ro`
- Read-only (`:ro`) prevents container from modifying host config
- Relative path `./` resolves to `~/workspace/ollama/` (docker-compose working directory)
- litellm reads config at startup via `--config /app/config.yaml` command

### Environment Variable Pattern

**Security Best Practice**: `${VAR:-}` syntax for all API keys
- Empty default prevents Docker Compose warnings when vars not set
- Matches pattern from existing ollama service (HUGGINGFACE_TOKEN)
- Variables sourced from `.env` file (created in Task 4)

**Variables Passed Through**:
- GROQ_API_KEY → for Groq cloud models
- GITHUB_API_KEY → for GitHub Models API
- LITELLM_MASTER_KEY → for LiteLLM proxy authentication

### Container Restart Policy

**on-failure:5**: Restart up to 5 times on failure, then stop
- Matches ollama and open-webui restart policies
- Prevents infinite restart loops on config errors
- Safe for production: allows manual intervention after 5 failures

### Validation Success

**docker compose config --quiet**: Exit code 0 → YAML syntax valid
**grep container_name**: Found ollama-local, litellm-proxy, open-webui → all services present
**Existing services**: ollama and open-webui definitions unchanged

### Evidence Captured
- `.sisyphus/evidence/task-6-docker-syntax.txt` → config validation
- `.sisyphus/evidence/task-6-service-added.txt` → litellm service definition
- `.sisyphus/evidence/task-6-existing-services.txt` → ollama/open-webui unchanged

## 2026-03-12 Task: 5 (addendum)

- Used RED-phase contract-first tests to pin expected multi-backend behavior before implementation.
- Spawn mocking uses event-emitter style callbacks to simulate close/error and stdout/stderr streams safely.
- Environment gap: Bun/TypeScript LSP unavailable in runner, so execution evidence captures tool-missing state for follow-up in orchestrator environment.
