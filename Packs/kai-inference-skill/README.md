# Inference Skill for PAI

Multi-backend LLM inference supporting Ollama (local) and Claude API (Anthropic). Perfect for privacy-sensitive work, complex reasoning, offline development, and cost optimization.

## Overview

The Inference skill provides unified access to multiple LLM backends within your Personal AI Infrastructure:

### Ollama Backend (Local, Free)
- 🔒 **Privacy**: Process sensitive code without external APIs
- 🚀 **Speed**: Fast local inference with GPU acceleration
- 💰 **Cost**: Zero API costs for unlimited usage
- 🔌 **Offline**: Work without internet connectivity
- 🧪 **Experiment**: Test prompts and models freely

### Claude API Backend (Anthropic, Paid)
- 🧠 **Reasoning**: Best-in-class complex reasoning capabilities
- 📊 **Research**: System design, architecture, research papers
- ⚡ **Reliable**: Enterprise-grade API infrastructure
- 🎯 **Specialized**: Latest frontier models (Opus, Sonnet, Haiku)

## Features

### Core Tools

| Tool | Purpose | Backends | Key Features |
|------|---------|----------|--------------|
| **Run.ts** ⭐ | Quick execution | Both | Simple syntax, auto-detects backend, easy to invoke |
| **Generate.ts** | Text generation | Both | Streaming, JSON mode, system prompts, temperature control |
| **Chat.ts** | Interactive conversations | Both | Multi-turn, context preservation, backend selection |
| **Embed.ts** | Generate embeddings | Ollama only | Multiple models, cosine similarity, RAG support |
| **ListModels.ts** | Model management | Both | View models from all backends, sizes, metadata |
| **CheckHealth.ts** | Health check | Both | Checks all backends, used by SessionStart hook |

### Workflows

| Workflow | Use Case | Best Model |
|----------|----------|------------|
| **CodeReview** | Local code quality analysis | qwen2.5-coder:7b |
| **Summarize** | Document/code summarization | llama3.2:latest |
| **Experiment** | Prompt testing, model comparison | Any model |

### 🎯 Multi-Backend Routing

**Smart routing between Ollama and Claude API** - The system intelligently selects the best backend based on task complexity, privacy requirements, and user preferences.

**Routing Rules:**
1. **Privacy keywords** → Ollama (local, private)
2. **Complex reasoning** → Claude API (best capability)
3. **Model name detection** → Auto-select backend (claude-* → anthropic)
4. **Explicit flag** → User choice (`--backend ollama/anthropic`)
5. **Default** → Ollama (backward compatible)

**Key Features:**
- ✅ **Transparent** - Auto-detects backend from model names
- ✅ **Privacy-First** - Sensitive tasks stay local
- ✅ **Cost-Optimized** - Use free local models when possible
- ✅ **Explicit Control** - Override with `--backend` flag
- ✅ **Configurable** - Set default via `INFERENCE_DEFAULT_BACKEND`

**See [ROUTING.md](ROUTING.md) for complete documentation.**

**Quick Examples:**
```bash
# Auto-detects Ollama from model name
bun run Run.ts "Review this code" qwen2.5-coder:7b

# Auto-detects Claude API from model name
bun run Run.ts "Design a system" claude-sonnet-4.5

# Explicit backend selection
bun run Run.ts "Analyze this" --backend ollama
```

## Quick Start

### Ollama Backend (Local)
```bash
# Install Ollama
brew install ollama  # macOS
# or visit https://ollama.com/download

# Start server
ollama serve

# Pull models
ollama pull llama3.2
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

### Claude API Backend (Optional)
```bash
# Get API key from https://console.anthropic.com/
# Add to environment
echo "ANTHROPIC_API_KEY=sk-ant-..." >> $PAI_DIR/.env
```

### Installation
```bash
# Clone/copy skill to PAI directory
cp -r src/skills/Inference $PAI_DIR/skills/

# Install dependencies
cd Packs/kai-inference-skill && bun install

# Configure
echo "OLLAMA_BASE_URL=http://localhost:11434" >> $PAI_DIR/.env
echo "INFERENCE_DEFAULT_BACKEND=ollama" >> $PAI_DIR/.env

# Test
bun run $PAI_DIR/skills/Inference/Tools/CheckHealth.ts
bun run $PAI_DIR/skills/Inference/Tools/ListModels.ts
```

## Usage Examples

### Quick Run (Simplest Way) ⭐
```bash
# Basic generation with default backend (ollama)
bun run Run.ts "Explain closures in JavaScript"

# Ollama models (local, free)
bun run Run.ts "Explain async/await" qwen2.5-coder:7b
bun run Run.ts "Summarize this doc" mistral
bun run Run.ts "Write unit tests" codellama:7b

# Claude API models (auto-detects from name)
bun run Run.ts "Design an authentication system" claude-sonnet-4.5
bun run Run.ts "Review system architecture" claude-opus-4.5

# Explicit backend selection
bun run Run.ts "Review: $(cat myfile.ts)" --backend ollama --model qwen2.5-coder:7b
bun run Run.ts "Complex reasoning task" --backend anthropic --model claude-opus-4.5
```

### Full-Featured Generation
```bash
bun run Generate.ts --prompt "Explain closures in JavaScript"
```

### Interactive Chat
```bash
# Default model
bun run Chat.ts

# Specific model
bun run Chat.ts --model codellama:7b
```

### Generate Embeddings
```bash
bun run Embed.ts --text "Semantic search example"
```

### List Models
```bash
bun run ListModels.ts
```

## Use Cases

### Development
- **Code Review**: Analyze code quality locally
- **Documentation**: Generate docs from code
- **Debugging**: Explain errors and suggest fixes
- **Refactoring**: Get refactoring suggestions

### Privacy & Security
- **Proprietary Code**: Review without external APIs
- **Sensitive Data**: Process without data leaving machine
- **Compliance**: Meet data residency requirements
- **Offline Work**: No internet dependency

### Experimentation
- **Prompt Engineering**: Test prompts locally
- **Model Comparison**: Evaluate different models
- **Parameter Tuning**: Find optimal settings
- **Learning**: Experiment with LLMs freely

### Cost Optimization
- **Simple Tasks**: Use local models for basic operations
- **High Volume**: Unlimited usage without API costs
- **Development**: Test without burning API credits
- **Batch Processing**: Process large datasets locally

## Popular Models

### General Purpose
- **llama3.2:3b** (1.9GB) - Fast, efficient, great for chat
- **llama3.2:latest** (4.7GB) - Balanced quality and speed
- **mistral:latest** (4.1GB) - High quality, large context

### Code Specialized
- **qwen2.5-coder:7b** (4.7GB) - Best for code, 80+ languages
- **codellama:7b** (3.8GB) - Meta's code specialist
- **deepseek-coder:6.7b** (3.8GB) - Strong code generation

### Embeddings
- **nomic-embed-text** (274MB) - 768-dim, recommended
- **mxbai-embed-large** (669MB) - 1024-dim, high quality
- **all-minilm** (46MB) - 384-dim, very fast

## Architecture

```
kai-ollama-skill/
├── INSTALL.md                   # Installation guide
├── README.md                    # This file
├── VERIFY.md                    # Verification tests
├── config/
│   ├── settings-hooks.json      # Hook registrations
│   └── settings-permissions.json # Permission rules
└── src/
    ├── skills/Ollama/
    │   ├── SKILL.md             # Skill definition
    │   ├── Tools/               # CLI tools
    │   │   ├── Generate.ts      # Text generation
    │   │   ├── Chat.ts          # Interactive chat
    │   │   ├── Embed.ts         # Embeddings
    │   │   ├── ListModels.ts    # Model management
    │   │   └── CheckHealth.ts   # Health check
    │   └── Workflows/           # Work templates
    │       ├── CodeReview.md    # Code review workflow
    │       ├── Summarize.md     # Summarization workflow
    │       └── Experiment.md    # Experimentation workflow
    └── hooks/
        └── (future hook scripts)
```

## Configuration

Add to `$PAI_DIR/.env`:

```bash
# Server
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=30000

# Default Models
OLLAMA_DEFAULT_MODEL=llama3.2:latest
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_CODE_MODEL=qwen2.5-coder:7b
OLLAMA_EMBED_MODEL=nomic-embed-text:latest

# Features
OLLAMA_ENABLE_ROUTING=true
```

## Integration with PAI

### Hooks
- **SessionStart**: Health check on startup
- **PreToolUse**: (Future) Route tasks to Ollama when appropriate
- **PostToolUse**: (Future) Log interactions to history

### History System
All Ollama interactions can be captured in the PAI history system for later review and learning extraction.

### Agent System
Use with AgentFactory to create specialized agents powered by local models.

### Voice System
Responses follow PAI response format, compatible with voice output.

## Performance

### Speed Comparison (7B models, M2 MacBook Pro)

| Model | Tokens/sec | Quality | Use Case |
|-------|------------|---------|----------|
| llama3.2:3b | 45 | Good | Fast chat |
| llama3.2:latest | 38 | Better | Balanced |
| qwen2.5-coder:7b | 42 | Best | Code tasks |
| mistral:latest | 35 | Best | Long context |

### Resource Usage

| Model Size | RAM | GPU VRAM | Disk |
|-----------|-----|----------|------|
| 3B | ~4GB | ~2GB | ~1.9GB |
| 7B | ~8GB | ~4GB | ~4GB |
| 13B | ~16GB | ~8GB | ~7GB |

## Comparison: Ollama vs Claude API

| Aspect | Ollama (Local) | Claude API |
|--------|----------------|------------|
| **Privacy** | ✅ Stays local | ❌ Sent to API |
| **Cost** | ✅ Free | ❌ Per token |
| **Speed** | ⚡ Very fast (GPU) | 🌐 Network latency |
| **Quality** | 📊 Good (7B models) | 🌟 Excellent |
| **Offline** | ✅ Works offline | ❌ Needs internet |
| **Context** | 📏 Limited (8K-32K) | 📐 Large (200K) |
| **Setup** | 🔧 Requires install | ✅ Ready to use |

**Recommendation**: Use Ollama for simple tasks, privacy-sensitive work, and experimentation. Use Claude API for complex reasoning and production work.

## Requirements

- **Ollama**: Version 0.1.0 or higher
- **Bun**: Runtime for TypeScript tools
- **PAI**: Core and hook system installed
- **System**: 8GB+ RAM recommended, GPU optional but recommended

## Installation

See [INSTALL.md](INSTALL.md) for complete installation instructions.

## Verification

See [VERIFY.md](VERIFY.md) for comprehensive verification tests.

## Limitations

### Small Model Constraints

Locally-hosted small models (3B-7B parameters) have important limitations compared to large API models:

#### 1. **Long Response Times for Complex Tasks**
- **Issue**: Models can spend 60+ seconds in "thinking" phase without producing output
- **Affected Tasks**: Code summarization, large file analysis, complex reasoning
- **Symptoms**: Ollama shows loading spinner indefinitely, eventually times out
- **Example**: Summarizing a 277-line C++ file may never complete on qwen2:7b or deepseek-r1:7b

#### 2. **Large Output Files**
- **Issue**: Models generate verbose stderr output (spinners, progress indicators)
- **Impact**: Output files can exceed 25,000 tokens, hitting Claude Code's Read tool limit
- **Error Message**: `"File content (31861 tokens) exceeds maximum allowed tokens (25000)"`
- **Workaround**: Use `head`, `tail`, or `grep` instead of Read tool for large output files

#### 3. **Quality vs Speed Tradeoffs**
- **7B models**: Better quality, but 2-10x slower on complex tasks
- **3B models**: Faster, but may produce lower quality or incomplete responses
- **Recommendation**: Use Claude API for complex tasks, Ollama for simple ones

### Best Practices

1. **Set Timeouts**: Always use `--timeout` parameter or expect potential hangs
2. **Simple Tasks Only**: Use Ollama for straightforward summaries, simple code reviews, quick Q&A
3. **Avoid Large Inputs**: Keep input size under 1000 lines for 7B models
4. **Check Output Size**: If output might be large, pipe to file and use Bash tools to inspect
5. **Fallback Strategy**: If Ollama times out, fall back to Claude API or provide manual summary

### Example: Handling Large Outputs
```bash
# Bad: Read tool will fail on large output
ollama run model "task" > output.txt
claude-read output.txt  # Error: exceeds 25000 tokens

# Good: Use Bash tools first
ollama run model "task" > output.txt
head -50 output.txt      # Preview first 50 lines
grep -E "summary|conclusion" output.txt  # Extract key parts
wc -l output.txt        # Check size before reading
```

## Troubleshooting

Common issues and solutions:

1. **Cannot connect**: Ensure `ollama serve` is running
2. **Model not found**: Pull model with `ollama pull <model>`
3. **Slow performance**: Use smaller models or enable GPU
4. **Out of memory**: Close other apps or use 3B models
5. **Permission denied**: Check file permissions or run with `bun run`
6. **Timeout/Hang**: Task too complex for local model, use Claude API instead
7. **Output too large**: Use Bash tools (`head`, `grep`) instead of Read tool

## Contributing

This skill follows PAI conventions:
- **TitleCase** for all file/directory names
- **Deterministic CLI** design with `--help`
- **Environment-driven** configuration via `$PAI_DIR/.env`
- **Fail-safe** operation (don't crash on errors)
- **Graceful degradation** when Ollama unavailable

## Resources

- **Ollama**: https://ollama.com
- **Model Library**: https://ollama.com/library
- **API Docs**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Discord**: https://discord.gg/ollama
- **GitHub**: https://github.com/ollama/ollama

## License

Part of the Personal AI Infrastructure (PAI) project.

## Version

**v1.0.0** - Initial release

## Changelog

### v1.0.0 (2026-01-07)
- ✨ Initial release
- ✅ Generate, Chat, Embed, ListModels tools
- ✅ CodeReview, Summarize, Experiment workflows
- ✅ SessionStart health check hook
- ✅ Comprehensive documentation
- ✅ Environment-driven configuration
- ✅ Streaming support
- ✅ JSON mode
- ✅ Performance metrics

## Future Enhancements

- [x] ~~Intelligent task routing (PreToolUse hook)~~ **IMPLEMENTED** (v1.1.0)
- [x] ~~Fallback when Claude API unavailable~~ **IMPLEMENTED** (v1.1.0)
- [ ] History integration for embeddings-based search
- [ ] Model auto-selection based on task
- [ ] Response caching
- [ ] Multi-model ensemble
- [ ] Fine-tuning support
- [ ] Model performance profiling
- [ ] Auto-pull missing models
- [ ] Model update notifications

## Support

For issues:
1. Check [VERIFY.md](VERIFY.md) for diagnostics
2. Review [INSTALL.md](INSTALL.md) for setup
3. See troubleshooting section above
4. Check Ollama logs: `journalctl --user -u ollama`
5. Open issue in PAI repository
