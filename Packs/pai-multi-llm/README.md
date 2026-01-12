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
optional-dependencies: [pai-second-brain]
keywords: [multi-llm, cli, ollama, claude, codex, gemini, opencode, session-management, cognitive-diversity]
---

# pai-multi-llm

> CLI-based Multi-LLM orchestration infrastructure with intelligent session management.

**v0.1.0** - Wraps existing CLI tools for cognitive diversity without API keys.

---

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack enables **cognitive diversity** by orchestrating multiple LLM CLI tools. Instead of relying on a single AI's perspective, you can query Claude, Ollama, Codex, Gemini, and OpenCode - each with different training, architectures, and blind spots.

**Key principle:** Wraps existing CLI tools - no API keys required. If you can run `ollama run llama3` or `claude -p "hello"` in your terminal, this pack can orchestrate it.

Please follow the installation instructions in `INSTALL.md` to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Provider detection | `Tools/DetectProviders.ts` | Auto-detect installed LLM CLIs |
| Query interface | `Tools/Query.ts` | Unified query command for all providers |
| Session manager | `Tools/SessionManager.ts` | Track and resume sessions per provider |
| Team generator | `Tools/GenerateTeam.ts` | Generate team.yaml configuration |
| Health check | `Tools/HealthCheck.ts` | Verify provider availability |
| Team config | `config/team-defaults.yaml` | Default provider roles |

**Summary:**
- **Files created:** 6 tools + config
- **Dependencies:** pai-core-install (required)

---

## The Problem

Single-AI systems have inherent limitations:

**The Monoculture Problem:**
```
User asks question
  → Claude answers from Claude's perspective
  → Same training data, same architecture
  → Same blind spots every time
  → No friction, no alternative viewpoints
```

**Problems this creates:**

1. **Single Architecture Bias**
   - Claude thinks in Claude patterns
   - Codex thinks in code-first patterns
   - Gemini thinks in multi-modal patterns
   - **They never challenge each other**

2. **No Cognitive Diversity**
   - One model = one cognitive framework
   - Breakthroughs come from friction between different approaches
   - "What if we asked a code-focused model this strategy question?"

3. **API Key Dependency**
   - Most multi-LLM solutions require multiple API keys
   - Expensive, complex authentication
   - **But you already have CLI tools installed**

---

## The Solution

This pack wraps your existing CLI tools into a unified orchestration layer:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         pai-multi-llm                                    │
│                   (CLI Orchestration Layer)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
    ┌──────────┐            ┌──────────┐            ┌──────────┐
    │ Claude   │            │  Ollama  │            │  Codex   │
    │   CLI    │            │   CLI    │            │   CLI    │
    └──────────┘            └──────────┘            └──────────┘
          │                        │                        │
          ▼                        ▼                        ▼
    ┌──────────┐            ┌──────────┐            ┌──────────┐
    │ Session  │            │ Session  │            │ Session  │
    │ Tracking │            │ Tracking │            │ Tracking │
    └──────────┘            └──────────┘            └──────────┘
```

**Key Innovations:**

1. **Zero API Keys** - Uses CLI tools you already have installed
2. **Auto-Detection** - Scans for available providers automatically
3. **Session Continuity** - Preserves context across queries per provider
4. **Role Assignment** - Configure which AI handles which task types
5. **Unified Interface** - One command to query any provider

---

## Features

- **Auto-Detection**: Automatically detects installed LLM CLIs
- **Session Management**: Tracks sessions per provider, continues context automatically
- **Unified Interface**: Single `query` command for all providers
- **User-Configurable**: Define your own team roles and assignments
- **Context Efficient**: Reuses sessions instead of re-explaining context

---

## Installation

See `INSTALL.md` for the complete installation guide.

**Quick start:**
```bash
cd Packs/pai-multi-llm
bun install
bun run detect
```

---

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

---

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

---

## Supported Providers

| Provider | Detection | Session Resume |
|----------|-----------|----------------|
| Claude | `which claude` | Full (`-c`, `-r <id>`) |
| Codex | `which codex` | Full (`resume --last`) |
| Gemini | `which gemini` | Full (`--resume`) |
| Ollama | `which ollama` + `ollama list` | Manual (`/save`, `/load`) |
| OpenCode | `which opencode` | Partial (`/continue`) |

---

## Configuration

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PAI_DIR` | `~/.claude` | PAI installation directory |
| `MULTI_LLM_DEFAULT_PROVIDER` | `claude` | Default provider for queries |
| `MULTI_LLM_SESSION_DIR` | `~/.claude/multi-llm/sessions` | Session storage |

---

## Credits

- **Original concept:** Nabil BA-MOH (@NavNab) - CLI-based multi-LLM orchestration
- **Inspired by:** Cognitive diversity research, ensemble AI systems
- **Built on:** PAI infrastructure by Daniel Miessler

---

## Works Well With

- **pai-core-install** (required) - Foundation for identity and memory
- **pai-second-brain** - Enables multi-AI debates with real external LLMs
- **pai-voice-system** - Voice notifications for query results

---

## Relationships

### Parent Of
*None specified.*

### Child Of
- **pai-core-install** - Requires CORE for configuration management

### Sibling Of
- **pai-second-brain** - Complementary cognitive diversity

---

## Future Roadmap

| Feature | Description | Status |
|---------|-------------|--------|
| **Parallel queries** | Query multiple providers simultaneously | Planned |
| **Response comparison** | Side-by-side response analysis | Planned |
| **Auto-routing** | Route queries based on task type | Planned |

---

## Changelog

### 0.1.0 - 2025-01-12
- Initial release
- Provider auto-detection (Claude, Ollama, Codex, Gemini, OpenCode)
- Session management per provider
- Unified query interface
- Team configuration with role assignment

---

## License

Apache-2.0
