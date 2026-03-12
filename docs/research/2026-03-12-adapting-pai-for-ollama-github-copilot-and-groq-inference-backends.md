## 1. Task Overview
- **Task Name:** Adapting PAI for Ollama, GitHub Models, and Groq Inference Backends
- **Task Description:** Investigate how to adapt danielmiessler/Personal_AI_Infrastructure (PAI) — a Claude Code-native personal AI framework — to use three alternative inference backends: local Ollama, GitHub Models (via GitHub Copilot's ecosystem), and Groq. The research covers feasibility analysis, architecture impact, integration strategies, and a concrete implementation roadmap. PAI v4.0.3 is Claude Code-native with no existing multi-backend support; the roadmap lists "Local Model Support" as planned but unimplemented.
- **Assigned By:** User (joao-costa00 fork)
- **Date:** 2026-03-12

## 2. Research Summary
- **Sources Consulted:**
  - [PAI GitHub Repository](https://github.com/danielmiessler/Personal_AI_Infrastructure) – Primary source for architecture, primitives, hook system, skill system, and roadmap analysis
  - [PAI Fork](https://github.com/joao-costa00/AI_Personal_Infra) – User's fork, target for implementation
  - [LiteLLM Documentation - Ollama Provider](https://docs.litellm.ai/docs/providers/ollama) – LiteLLM proxy configuration for Ollama backend routing
  - [LiteLLM Documentation - Groq Provider](https://docs.litellm.ai/docs/providers/groq) – LiteLLM proxy configuration for Groq backend routing
  - [LiteLLM Documentation - GitHub Models Provider](https://docs.litellm.ai/docs/providers/github) – LiteLLM proxy configuration for GitHub Models backend routing
  - [Ollama Docker Documentation](https://docs.ollama.com/docker) – Official Ollama containerization guide with GPU passthrough
  - [GitHub Models API](https://models.github.ai/inference/) – GitHub's OpenAI-compatible inference endpoint (30+ models, free tier)
  - [DeepWiki - PAI Architecture](https://deepwiki.com/danielmiessler/Personal_AI_Infrastructure) – AI-generated architectural analysis of PAI internals (Algorithm v3.5.0, 63 skills, 21 hooks, memory system)

- **Key Findings:**
  - **PAI is entirely Claude Code-native.** There is no Docker stack, no LiteLLM, no Open WebUI. The runtime is Claude Code with TypeScript/Bun hooks, `.claude/` configuration, and Anthropic's API as the sole inference backend. This means adding alternative backends requires fundamental architecture changes, not simple configuration.
  - **PAI's inference layer (`Inference.ts`) is the key integration point.** Located in `~/.claude/PAI/Tools/Inference.ts`, this module handles all model calls. It currently targets Anthropic Claude exclusively. Any multi-backend strategy must intercept or extend this layer.
  - **LiteLLM is the proven unification layer.** LiteLLM proxy supports all three target backends natively: `ollama_chat/` prefix for Ollama, `groq/` prefix for Groq, and `github/` prefix for GitHub Models. It presents a unified OpenAI-compatible API, enabling PAI to target one endpoint while LiteLLM routes to the appropriate backend.
  - **GitHub Copilot itself is NOT a programmable inference API.** The correct target is **GitHub Models** (`https://models.github.ai/inference/`), which provides an OpenAI-compatible REST API authenticated via GitHub Personal Access Token (PAT) with `models:read` scope. It offers 30+ models (GPT-4o, Claude 3.5, Llama 3.3, DeepSeek R1, etc.) with a free tier subject to rate limits.
  - **Ollama provides a local, private inference option.** Runs as a Docker container with optional NVIDIA GPU passthrough. Supports Llama 3, Mistral, CodeLlama, Phi-3, Gemma, and many others. Ollama's API is OpenAI-compatible, making LiteLLM integration straightforward.
  - **Groq offers ultra-fast cloud inference.** Groq's LPU hardware provides sub-second responses for supported models (Llama 3, Mixtral, Gemma). API key authentication, OpenAI-compatible endpoint. Free tier with generous rate limits for development.
  - **PAI's roadmap explicitly plans for this.** The roadmap lists "Local Model Support (Ollama, llama.cpp)" and "Granular Model Routing" as future features, confirming this direction is architecturally anticipated but not yet built.
  - **The Hook system enables non-invasive integration.** PAI's 21 hooks (8 event types) can intercept inference calls, route based on task complexity, and manage backend selection without modifying core skill logic.

## 3. Analysis

- **Alternatives Considered:**

  ### Approach A: LiteLLM Proxy as Unified Gateway (Recommended)
  Deploy LiteLLM as a local proxy service. Modify `Inference.ts` to route sub-task inference calls through LiteLLM instead of directly to Anthropic. PAI's Claude Code runtime remains intact for orchestration; only model inference calls are redirected.

  | Aspect | Assessment |
  |--------|-----------|
  | **Pros** | Minimal PAI code changes (only `Inference.ts` + config). All three backends supported via one integration point. LiteLLM handles auth, retries, fallbacks, load balancing natively. Model routing rules configurable in YAML. Battle-tested OSS with active maintenance. |
  | **Cons** | Adds a local service dependency (LiteLLM proxy must be running). Slight latency overhead from proxy hop (~5-15ms). LiteLLM updates may lag behind provider API changes. |
  | **Applicability** | **High.** This is the approach PAI's own roadmap implicitly targets. It preserves PAI's architecture while unlocking multi-backend routing. |

  ### Approach B: Companion Docker Stack (Ollama + LiteLLM + Open WebUI)
  Build a standalone Docker Compose stack alongside PAI. PAI skills dispatch to the stack via HTTP. Open WebUI provides a browser-based interface for direct model interaction.

  | Aspect | Assessment |
  |--------|-----------|
  | **Pros** | Clean separation of concerns. Open WebUI adds a GUI for non-CLI users. Stack is independently testable and upgradeable. Can be used with or without PAI. |
  | **Cons** | Higher resource footprint (3+ containers). More complex setup and maintenance. PAI-to-stack integration requires custom HTTP client code in skills. Duplicates some PAI functionality (Open WebUI has its own conversation management). |
  | **Applicability** | **Medium.** Good for users wanting a standalone AI toolkit alongside PAI, but adds complexity without proportional benefit for the core goal of multi-backend inference. |

  ### Approach C: Direct Provider SDK Integration
  Add provider-specific SDK clients (Ollama JS, Groq SDK, GitHub Models SDK) directly into PAI's codebase, bypassing any proxy.

  | Aspect | Assessment |
  |--------|-----------|
  | **Pros** | No proxy dependency. Potentially lower latency (one fewer hop). Full control over each provider's specific features. |
  | **Cons** | 3x the integration code (one client per provider). Each provider update requires PAI code changes. No unified fallback/routing logic — must build from scratch. Breaks PAI's principle of "Code Before Prompts" by adding significant infrastructure code. |
  | **Applicability** | **Low.** Violates DRY, increases maintenance burden dramatically, and rebuilds what LiteLLM already provides. |

  ### Approach D: Full PAI Fork (Remove Claude Code Dependency)
  Fork PAI and replace the Claude Code runtime entirely with a custom orchestrator that talks to arbitrary backends.

  | Aspect | Assessment |
  |--------|-----------|
  | **Pros** | Full independence from Anthropic. Complete control over every layer. |
  | **Cons** | Estimated 200+ hours of work. Loses Claude Code's hook system, context management, and agentic capabilities — all of which PAI deeply depends on. Would need to reimplement the entire runtime. Diverges permanently from upstream. |
  | **Applicability** | **Very Low.** Not recommended. The effort-to-value ratio is extreme, and the result would be an entirely different project. |

- **Dependencies & Impacts:**

  | Dimension | Impact Assessment |
  |-----------|------------------|
  | **Performance** | Ollama: Depends on local hardware (GPU recommended for >7B models). Groq: Fastest option (sub-200ms for most queries). GitHub Models: Moderate latency (200-800ms typical). LiteLLM proxy adds ~5-15ms overhead. |
  | **Security** | Ollama: Fully local, no data leaves the machine — best for sensitive data. Groq: Cloud-based, API key required, data transits to Groq servers. GitHub Models: Cloud-based, PAT auth, data transits to GitHub/Azure. LiteLLM: Runs locally, credentials stored in config file (must be gitignored). |
  | **Maintainability** | LiteLLM proxy approach has the lowest maintenance burden — provider changes are handled by LiteLLM updates, not PAI code changes. Config-driven routing means adding new backends requires only YAML changes. |
  | **Compatibility** | All three backends are OpenAI-compatible, which is why LiteLLM works as a unifier. PAI's Claude Code runtime is unaffected — only the inference dispatch layer changes. Existing skills, hooks, memory, and TELOS systems remain functional. |

## 4. Proposed Action / Recommendation

- **Recommended Option:** Approach A — LiteLLM Proxy as Unified Gateway, with elements of Approach B for Ollama containerization.

- **Reasoning:**
  1. **Minimal invasion**: Only `Inference.ts` and a new config file need modification in PAI. All 63 skills, 21 hooks, and the memory system remain untouched.
  2. **Single integration point**: LiteLLM exposes one OpenAI-compatible endpoint. PAI talks to one URL regardless of which backend serves the request.
  3. **Native support for all three backends**: LiteLLM supports `ollama_chat/llama3` (Ollama), `groq/llama-3.3-70b-versatile` (Groq), and `github/gpt-4o` (GitHub Models) out of the box.
  4. **Config-driven routing**: A `litellm_config.yaml` file defines which models map to which backends, with fallback chains (e.g., try Groq first, fall back to Ollama if rate-limited).
  5. **Aligns with PAI's own roadmap**: The planned "Local Model Support" and "Granular Model Routing" features map directly to LiteLLM's capabilities.
  6. **Future-proof**: Adding new backends (e.g., Cerebras, Together AI, local llama.cpp) requires only adding entries to the YAML config.

  **Implementation architecture:**
  ```
  PAI (Claude Code Runtime)
    └── Inference.ts (modified)
          └── LiteLLM Proxy (localhost:4000)
                ├── ollama_chat/* → Ollama (localhost:11434)
                ├── groq/* → Groq API (api.groq.com)
                └── github/* → GitHub Models (models.github.ai)
  ```

  **LiteLLM config example (`litellm_config.yaml`):**
  ```yaml
  model_list:
    # Local models via Ollama
    - model_name: "local/llama3"
      litellm_params:
        model: "ollama_chat/llama3"
        api_base: "http://localhost:11434"

    - model_name: "local/codellama"
      litellm_params:
        model: "ollama_chat/codellama"
        api_base: "http://localhost:11434"

    # Fast cloud inference via Groq
    - model_name: "fast/llama3-70b"
      litellm_params:
        model: "groq/llama-3.3-70b-versatile"
        api_key: "os.environ/GROQ_API_KEY"

    - model_name: "fast/mixtral"
      litellm_params:
        model: "groq/mixtral-8x7b-32768"
        api_key: "os.environ/GROQ_API_KEY"

    # GitHub Models (broad model selection)
    - model_name: "github/gpt4o"
      litellm_params:
        model: "github/gpt-4o"
        api_key: "os.environ/GITHUB_TOKEN"

    - model_name: "github/deepseek"
      litellm_params:
        model: "github/DeepSeek-R1"
        api_key: "os.environ/GITHUB_TOKEN"

  # Routing: try fast cloud first, fall back to local
  router_settings:
    routing_strategy: "latency-based-routing"
    num_retries: 2
    timeout: 30
    fallbacks:
      - "fast/llama3-70b": ["local/llama3"]
      - "github/gpt4o": ["fast/llama3-70b", "local/llama3"]
  ```

- **Confidence Level:** High — LiteLLM is a mature, well-documented proxy with native support for all three target backends. The PAI codebase has a clear inference abstraction layer (`Inference.ts`) that serves as a natural integration point. The approach requires minimal code changes and is aligned with PAI's stated roadmap.

- **Assumptions:**
  - User has Docker installed (for Ollama containerization) or can install Ollama natively
  - User has or can obtain: a Groq API key (free tier available), a GitHub PAT with `models:read` scope (free)
  - The host machine has sufficient resources for local model inference (minimum 8GB RAM for 7B models, GPU recommended)
  - Claude Code remains the PAI runtime — we are augmenting inference, not replacing the orchestrator
  - `Inference.ts` can be modified to conditionally route to LiteLLM based on a configuration flag (preserving direct Anthropic calls as the default)

- **Limitations:**
  - **Claude Code orchestration is still Anthropic-only**: PAI's core runtime (the Algorithm, hook execution, skill routing) runs on Claude Code, which requires an Anthropic API subscription. The alternative backends handle *sub-task inference* only — tasks explicitly dispatched by PAI skills.
  - **Model capability variance**: Local Llama 3 8B is significantly less capable than Claude 3.5 Sonnet. Complex reasoning tasks may produce degraded results on smaller models. Task-to-model routing logic will need careful calibration.
  - **Groq model selection is limited**: Groq supports a curated set of models, not arbitrary ones. If a specific model is needed that Groq doesn't offer, fallback to Ollama or GitHub Models is required.
  - **GitHub Models free tier has rate limits**: 15-30 requests per minute depending on model, with daily token caps. Production-scale use requires a paid plan.
  - **Ollama GPU support requires NVIDIA**: AMD GPU support exists but is experimental. Apple Silicon (M1/M2/M3) works natively without Docker GPU passthrough.
  - **Untested integration**: No existing PAI fork has implemented multi-backend inference. This will be first-of-kind work requiring iterative debugging.

## 5. Verification Plan

- **Tests or Validation Needed:**
  1. **LiteLLM proxy health check**: `curl http://localhost:4000/health` returns `200 OK` with all three backends listed as available.
  2. **Ollama backend test**: `curl -X POST http://localhost:4000/chat/completions -H "Content-Type: application/json" -d '{"model": "local/llama3", "messages": [{"role": "user", "content": "Hello"}]}'` returns a valid completion.
  3. **Groq backend test**: Same curl pattern with `"model": "fast/llama3-70b"` — verify sub-500ms response time.
  4. **GitHub Models backend test**: Same pattern with `"model": "github/gpt4o"` — verify response includes model metadata.
  5. **Fallback routing test**: Stop Ollama, send request to a model with Ollama fallback — verify LiteLLM routes to the next backend in the fallback chain.
  6. **PAI integration smoke test**: Run a PAI skill that uses `Inference.ts` and verify it correctly dispatches through LiteLLM instead of directly to Anthropic (when configured).
  7. **PAI regression test**: With LiteLLM integration disabled (default config), verify all existing PAI functionality works unchanged — skills, hooks, memory, Algorithm execution.
  8. **Latency benchmark**: Compare response times for identical prompts across all three backends + direct Anthropic, documenting the overhead.

- **Expected Results:**
  - LiteLLM proxy runs as a background service (systemd or Docker) and routes to all three backends based on model prefix
  - PAI skills can dispatch inference to any configured backend by specifying the model name in `Inference.ts` calls
  - Existing PAI functionality (Claude Code orchestration, hooks, memory, TELOS) is completely unaffected
  - Fallback routing transparently handles backend failures without skill-level error handling
  - A configuration file (`litellm_config.yaml`) controls all routing without code changes

## 6. Next Steps
1. **Set up LiteLLM proxy locally**: Install via `pip install litellm[proxy]` or Docker. Create `litellm_config.yaml` with all three backends. Start with `litellm --config litellm_config.yaml` and verify health endpoint.
2. **Deploy Ollama**: Install Ollama (native or Docker with GPU passthrough). Pull target models (`ollama pull llama3`, `ollama pull codellama`). Verify local inference works via `curl http://localhost:11434/api/chat`.
3. **Obtain API credentials**: Create a Groq API key at `console.groq.com` (free tier). Generate a GitHub PAT with `models:read` scope at `github.com/settings/tokens`. Store both in `.env` (gitignored).
4. **Modify `Inference.ts`**: Add a conditional path that routes inference calls to `http://localhost:4000` (LiteLLM) when a `PAI_INFERENCE_BACKEND=litellm` environment variable is set. Preserve the existing Anthropic path as default. Map PAI's model selection to LiteLLM model names.
5. **Build task-to-model routing logic**: Create a `model_routing.yaml` config in PAI's `USER/` directory that maps task types (e.g., "code generation" → `local/codellama`, "fast summarization" → `fast/llama3-70b`, "complex reasoning" → `github/gpt4o`) to specific LiteLLM model names. Wire this into the hook system for automatic routing.

## 7. References & Notes

**Primary Documentation:**
- PAI Repository: https://github.com/danielmiessler/Personal_AI_Infrastructure
- PAI v4.0.3 Release Notes: `Releases/v4.0.3/README.md`
- PAI Roadmap (from README): Lists "Local Model Support (Ollama, llama.cpp)" and "Granular Model Routing"

**Backend Provider Docs:**
- LiteLLM Proxy Docs: https://docs.litellm.ai/docs/simple_proxy
- LiteLLM Ollama Provider: https://docs.litellm.ai/docs/providers/ollama
- LiteLLM Groq Provider: https://docs.litellm.ai/docs/providers/groq
- LiteLLM GitHub Models Provider: https://docs.litellm.ai/docs/providers/github
- Ollama Docker Guide: https://docs.ollama.com/docker
- Ollama Model Library: https://ollama.com/library
- Groq Console (API Keys): https://console.groq.com
- GitHub Models Marketplace: https://github.com/marketplace/models
- GitHub Models API: https://models.github.ai/inference/

**Architecture Notes:**
- PAI's `Inference.ts` is the sole inference dispatch point — located at `~/.claude/PAI/Tools/Inference.ts`
- PAI uses Bun as the TypeScript runtime for hooks and tools
- The Algorithm v3.5.0 (7-phase problem-solving loop) runs entirely within Claude Code's runtime — it does not make separate inference calls that can be redirected
- Hook system (21 hooks, 8 event types) provides lifecycle interception points for routing logic
- Memory system (3-tier: hot/warm/cold) is independent of inference backend — no changes needed
- TELOS files (10 goal/identity files) are static context — no changes needed
- Skills (63 total, 12 categories) use `Inference.ts` for any model calls — all benefit from multi-backend routing automatically once `Inference.ts` is modified

**Clarification on "GitHub Copilot" vs "GitHub Models":**
The user requested "copilot" as a backend. GitHub Copilot is a code completion product, not a programmable inference API. The correct programmatic inference service in GitHub's ecosystem is **GitHub Models** (`models.github.ai`), which provides an OpenAI-compatible API with 30+ models including GPT-4o, Claude 3.5 Sonnet, Llama 3.3, DeepSeek R1, and Phi-4. Authentication uses a GitHub PAT with `models:read` scope. LiteLLM supports it via the `github/` model prefix. This report uses "GitHub Models" throughout to reflect the correct service.
