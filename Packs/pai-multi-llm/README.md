---
name: PAI Multi-LLM
pack-id: nabilbamoh-pai-multi-llm-core-v0.1.0
version: 0.1.0
author: nabilbamoh
description: CLI-based Multi-LLM orchestration infrastructure with intelligent session management
type: feature
purpose-type: [productivity, multi-llm, orchestration]
platform: claude-code
dependencies: [danielmiessler-pai-core-install-core-v1.4.0]
keywords: [multi-llm, cli, ollama, claude, codex, gemini, opencode, session-management, cognitive-diversity]
---

# pai-multi-llm

> CLI-based Multi-LLM orchestration infrastructure with intelligent session management.

## Overview

This pack provides infrastructure for orchestrating multiple LLM CLI tools (Claude CLI, Codex, Gemini, Ollama, OpenCode) with automatic session management to preserve context across queries.

**Key principle:** Wraps existing CLI tools - no API keys required. If you can run `ollama run llama3` or `claude -p "hello"` in your terminal, this pack can orchestrate it.

## Features

- **Auto-Detection**: Automatically detects installed LLM CLIs
- **Session Management**: Tracks sessions per provider, continues context automatically
- **Unified Interface**: Single `query` command for all providers
- **User-Configurable**: Define your own team roles and assignments
- **Context Efficient**: Reuses sessions instead of re-explaining context

## Installation

```bash
# From PAI repository
cd Packs/pai-multi-llm
bun install
bun run install-pack
```

The installer will:
1. Detect available LLM providers on your system
2. Generate `team.yaml` with detected providers
3. Configure session management for each provider

## Quick Start

```bash
# Detect available providers
bun run detect

# Generate team configuration
bun run generate-team

# Query a provider
bun run query -p "Your prompt here"

# Query specific provider
bun run query -p "Review this code" --provider codex

# Continue previous session
bun run query -p "Now improve it" --continue
```

## Team Configuration

After installation, customize `$PAI_DIR/config/team.yaml`:

```yaml
team:
  version: "1.0"
  providers:
    - name: claude
      cli: 'claude -p "{prompt}"'
      role: coordinator           # Your custom role
      use_for:
        - Strategic thinking
        - Synthesis

    - name: deepseek-r1-14b
      cli: 'ollama run deepseek-r1:14b "{prompt}"'
      role: deep_reasoner
      use_for:
        - Complex analysis
        - Multi-step reasoning
```

## Session Management

Sessions are tracked automatically. When you query the same provider multiple times, context is preserved:

```bash
# First query - new session created
bun run query -p "Analyze this architecture" --provider claude

# Second query - continues same session
bun run query -p "What are the weak points?" --continue --provider claude
```

## Supported Providers

| Provider | Detection | Session Resume |
|----------|-----------|----------------|
| Claude | `which claude` | Full (`-c`, `-r <id>`) |
| Codex | `which codex` | Full (`resume --last`) |
| Gemini | `which gemini` | Full (`--resume`) |
| Ollama | `which ollama` + `ollama list` | Manual (`/save`, `/load`) |
| OpenCode | `which opencode` | Partial (`/continue`) |

## Requirements

- Bun >= 1.0.0
- pai-core-install (PAI base)
- At least one LLM CLI installed

## Integration with pai-second-brain

When installed alongside `pai-second-brain`, this pack enables:
- Multi-AI debates with real external LLMs
- Cognitive diversity through different model architectures
- Parallel querying of multiple providers

Without this pack, `pai-second-brain` falls back to Claude subagents only.

## License

Apache-2.0
