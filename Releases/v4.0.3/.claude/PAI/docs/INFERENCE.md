# Multi-Backend Inference

PAI supports high-performance, multi-backend inference through a centralized LiteLLM proxy. This allows routing tasks to local models via Ollama or cloud providers like Groq and GitHub Models based on speed, quality, and cost requirements.

## Overview

The inference system decouples the PAI logic from specific model providers. By using LiteLLM as a unified interface, PAI can switch between local and cloud backends without internal code changes.

```
PAI Inference.ts
      ↓
  LiteLLM Proxy (localhost:4000)
      ↓          ↓          ↓
    Ollama      Groq      GitHub
    (local)    (cloud)    (cloud)
```

By default, inference is disabled, and PAI uses the Claude CLI directly. Enabling the inference system provides intelligent routing across different "levels" of model capability.

## Quick Start

1.  **Start the Infrastructure**: Ensure the `litellm-proxy` and `ollama` services are running via Docker.
    ```bash
    cd ~/workspace/ollama && docker compose up -d
    ```
2.  **Configure API Keys**: Add your provider keys to `~/workspace/ollama/.env`.
    ```bash
    GROQ_API_KEY=your_groq_api_key_here
    GITHUB_API_KEY=your_github_token_here
    ```
3.  **Enable Inference**: Set `inference.enabled` to `true` in `~/.claude/PAI/settings.json`.
4.  **Test Connection**: Run a simple prompt in PAI. If LiteLLM is unreachable, PAI automatically falls back to the Claude CLI.

## Configuration Reference

The `inference` section in `settings.json` controls how PAI interacts with models.

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `inference.enabled` | boolean | `false` | When true, routes requests through LiteLLM. Falls back to Claude CLI if LiteLLM is down. |
| `inference.litellm.api_base` | string | `"http://localhost:4000"` | The local endpoint for the LiteLLM proxy service. |
| `inference.litellm.api_key` | string | `""` | Optional master key for LiteLLM proxy authentication. |
| `inference.litellm.health_timeout_ms` | number | `3000` | Milliseconds to wait for a health check before falling back to Claude CLI. |
| `inference.backends` | object | - | Defines available models for each provider (ollama, groq, github). |
| `inference.default_backend` | string | `"ollama"` | The fallback backend used if a specific routing level is not defined. |
| `inference.routing` | object | - | Maps capability levels (`fast`, `standard`, `smart`) to a preferred backend. |

### Backend Model Definitions

Each backend in `inference.backends` defines three capability levels:

*   **fast**: Lightweight models for quick tasks or simple logic.
*   **standard**: Balanced models for general coding and reasoning.
*   **smart**: High-reasoning models for complex architecture and debugging.

## Available Backends

### Ollama (Local)
Runs models locally on your hardware. Best for privacy and offline work.
*   **Default models**: `phi4`, `qwen2.5-coder`, `mistral`.

### Groq (Cloud)
Ultra-fast inference using LPU technology. Best for `fast` and `standard` routing.
*   **Default models**: `llama-3.1-8b`, `llama-3.3-70b`.

### GitHub Models (Cloud)
Access to flagship models via GitHub's inference API. Best for `smart` tasks.
*   **Default models**: `gpt-4o-mini`, `gpt-4o`.

## Routing

Routing allows you to distribute load across backends based on the task requirement.

### Hybrid (Default)
The recommended configuration for balance:
*   **fast** → `groq`: Instant responses for simple tasks.
*   **standard** → `ollama`: Private, local processing for standard work.
*   **smart** → `github`: High-quality reasoning for complex tasks.

### All-Local
Route everything to Ollama for maximum privacy.
```json
"routing": {
  "fast": "ollama",
  "standard": "ollama",
  "smart": "ollama"
}
```

### All-Cloud
Route everything to Groq or GitHub for maximum speed and performance.
```json
"routing": {
  "fast": "groq",
  "standard": "groq",
  "smart": "github"
}
```

## Troubleshooting

### LiteLLM not starting
Check Docker logs for the `litellm-proxy` service. Common causes include port 4000 being occupied or an invalid `litellm_config.yaml`.
```bash
docker logs litellm-proxy
```

### Model not found
Verify that the model names in `settings.json` match the `model_name` fields in `~/workspace/ollama/litellm_config.yaml`.

### Slow responses
If using Ollama, ensure your GPU is correctly detected and that you have enough VRAM for the selected model. Cloud backends may be throttled if API limits are reached.

### Fallback behavior
If PAI detects LiteLLM is unreachable (or times out after `health_timeout_ms`), it will use the Claude CLI directly. You will see a "falling back to Claude CLI" message in the logs.
