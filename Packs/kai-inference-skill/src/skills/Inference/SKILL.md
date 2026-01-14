---
name: Inference
description: Multi-backend LLM inference (Ollama local + Claude API). USE WHEN user requests local processing, complex reasoning, code review, experimentation, privacy-sensitive tasks, or explicit backend selection. Supports intelligent routing, multi-model selection, embeddings, streaming, and interactive chat.
---

# Inference - Multi-Backend LLM

Run language models using multiple backends: Ollama (local, free, private) or Claude API (best reasoning, requires API key). Smart routing automatically selects the best backend based on task complexity, privacy needs, and user preferences.

## Supported Backends

| Backend | Type | Cost | Privacy | Best For |
|---------|------|------|---------|----------|
| **Ollama** | Local | Free | Complete | Code review, experimentation, privacy-sensitive, offline work |
| **Anthropic** | API | Paid | Cloud | Complex reasoning, research, system design, maximum capability |

## Backend Selection

**Smart Routing** (automatic):
- Privacy keywords → Ollama
- Complex reasoning → Claude API
- Model name detection (claude-* → anthropic, others → ollama)
- Configurable via `INFERENCE_DEFAULT_BACKEND`

**Explicit Selection** (--backend flag):
```bash
bun run Run.ts "prompt" --backend ollama
bun run Generate.ts --prompt "..." --backend anthropic
```

## Workflow Routing

| Workflow | Trigger | File | Purpose |
|----------|---------|------|---------|
| CodeReview | "review locally", "local code review" | Workflows/CodeReview.md | Code quality analysis using local models |
| Summarize | "summarize locally", "ollama summarize" | Workflows/Summarize.md | Document/code summarization |
| Experiment | "test with ollama", "experiment locally" | Workflows/Experiment.md | Prompt engineering and testing |

## Quick Commands

All tools follow deterministic CLI design and support `--help` for full documentation.

### Quick Run (Simplified Interface)
```bash
# Basic - uses default backend (ollama)
bun run Run.ts "Explain closures in JavaScript"

# With specific model (positional argument, auto-detects backend)
bun run Run.ts "Review this code" qwen2.5-coder:7b
bun run Run.ts "Design a system" claude-sonnet-4.5

# Explicit backend selection
bun run Run.ts "Explain async" --backend ollama --model llama3.2
bun run Run.ts "Complex reasoning" --backend anthropic --model claude-opus-4.5

# Code review with code model
bun run Run.ts "Review: function add(a,b) { return a+b }" codellama:7b

# With system prompt
bun run Run.ts "Analyze this" llama3.2 --system "You are a security expert"

# JSON output (Ollama only)
bun run Run.ts "List 3 colors" --format json --backend ollama
```

### Text Generation (Full-Featured)
```bash
# Basic generation (uses default backend)
bun run Generate.ts --prompt "Explain closures in JavaScript"

# Use specific model (auto-detects backend)
bun run Generate.ts --prompt "..." --model qwen2.5-coder:7b
bun run Generate.ts --prompt "..." --model claude-sonnet-4.5

# Explicit backend selection
bun run Generate.ts --prompt "..." --backend ollama --model llama3.2
bun run Generate.ts --prompt "..." --backend anthropic --model claude-opus-4.5

# Add system prompt
bun run Generate.ts --prompt "Review this function" --system "You are a code reviewer"

# Request JSON output (Ollama only)
bun run Generate.ts --prompt "List 3 colors" --format json --backend ollama

# Adjust creativity
bun run Generate.ts --prompt "Write a story" --temperature 0.9
```

### Interactive Chat
```bash
# Start chat session (default backend)
bun run Chat.ts

# Use Ollama coding model
bun run Chat.ts --model codellama:7b

# Use Claude API (auto-detects from model name)
bun run Chat.ts --model claude-sonnet-4.5

# Explicit backend selection
bun run Chat.ts --backend anthropic --model claude-opus-4.5

# Set context
bun run Chat.ts --system "You are a helpful Python tutor"
```

### Embeddings
```bash
# Generate embeddings
bun run Embed.ts --text "Semantic search example"

# Use specific model
bun run Embed.ts --text "..." --model nomic-embed-text

# Output just the array
bun run Embed.ts --text "..." --output array
```

### Model Management
```bash
# List models from all backends
bun run ListModels.ts

# List models from specific backend
bun run ListModels.ts --backend ollama
bun run ListModels.ts --backend anthropic

# JSON output
bun run ListModels.ts --format json
```

## Popular Models

### Ollama (Local, Free)

**General Purpose**:
- **llama3.2:3b** - Fast, efficient, good for chat (3B params)
- **llama3.2:latest** - Balanced performance (8B params)
- **mistral:latest** - High quality, efficient (7B params)

**Code Generation**:
- **qwen2.5-coder:7b** - Excellent coding, understands 80+ languages
- **codellama:7b** - Meta's code specialist
- **deepseek-coder:6.7b** - Strong at code completion

**Embeddings** (Ollama-only):
- **nomic-embed-text:latest** - 768-dim, recommended (137M params)
- **mxbai-embed-large:latest** - 1024-dim, high quality (335M params)
- **all-minilm:latest** - 384-dim, fastest (23M params)

### Claude API (Anthropic, Paid)

**General Purpose**:
- **claude-sonnet-4.5** - Best balance of capability and speed (recommended)
- **claude-opus-4.5** - Maximum capability for complex tasks
- **claude-haiku-4** - Fastest responses for simple tasks

## Environment Configuration

Add to `$PAI_DIR/.env`:

```bash
# Backend Configuration
INFERENCE_DEFAULT_BACKEND=ollama              # Default backend: ollama or anthropic
INFERENCE_ENABLE_ROUTING=true                # Enable smart routing

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=30000
OLLAMA_DEFAULT_MODEL=llama3.2:latest
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_CODE_MODEL=qwen2.5-coder:7b
OLLAMA_EMBED_MODEL=nomic-embed-text:latest

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...                 # Required for Claude API
ANTHROPIC_DEFAULT_MODEL=claude-sonnet-4.5
ANTHROPIC_TIMEOUT=60000

# Backward Compatibility (still supported)
OLLAMA_ENABLE_ROUTING=true                   # Maps to INFERENCE_ENABLE_ROUTING
```

## Examples

### Example 1: Quick Code Review
```
User: "Review this function locally"
Assistant:
→ Invokes CodeReview workflow
→ Uses qwen2.5-coder:7b for code analysis
→ Returns review without API costs
```

### Example 2: Offline Development
```
User: "Summarize this file with ollama"
Assistant:
→ Invokes Summarize workflow
→ Uses local model (no internet required)
→ Returns summary quickly
```

### Example 3: Prompt Experimentation
```
User: "Test this prompt with different models"
Assistant:
→ Invokes Experiment workflow
→ Runs prompt against llama3.2, mistral, qwen2.5-coder
→ Compares outputs and performance
```

### Example 4: Semantic Search
```
User: "Find similar learnings in my history"
Assistant:
→ Uses Embed.ts to generate query embedding
→ Compares against history/ embeddings
→ Returns most similar documents
```

### Example 5: Privacy-Sensitive Work
```
User: "Help me with this proprietary code locally"
Assistant:
→ Uses local Ollama models
→ No data leaves your machine
→ Full privacy guaranteed
```

## Tool Reference

### Run.ts (Recommended)
**Purpose**: Simplified interface for quick Ollama execution

**Key Features**:
- Simple positional arguments
- Model as second argument
- Streaming by default
- Minimal syntax

**Usage**:
```bash
bun run Run.ts "prompt" [model] [options]
bun run Run.ts "Explain async" qwen2.5-coder:7b
```

**Options**:
- First arg: Prompt (required)
- Second arg: Model name (optional)
- `--model` / `-m` - Model (alternative to positional)
- `--system` / `-s` - System prompt
- `--temperature` / `-t` - Creativity level
- `--format` - Output format (json)
- `--no-stream` - Disable streaming

### Generate.ts
**Purpose**: Full-featured text generation with all options

**Key Features**:
- Multiple model support
- System prompts
- JSON mode
- Temperature control
- Token-by-token streaming
- Performance metrics

**Options**:
- `--prompt` - Text prompt (required)
- `--model` - Model name
- `--system` - System prompt
- `--temperature` - 0.0-1.0 creativity
- `--format json` - Structured output
- `--no-stream` - Disable streaming

### Chat.ts
**Purpose**: Interactive multi-turn conversations

**Key Features**:
- Conversation history
- Context preservation
- Commands (/exit, /clear, /help)
- Token-by-token streaming

**Options**:
- `--model` - Model name
- `--system` - System prompt
- `--temperature` - Creativity level

### Embed.ts
**Purpose**: Generate embeddings for semantic operations

**Key Features**:
- Multiple embedding models
- Multiple output formats
- Cosine similarity helper
- Vector dimensions info

**Options**:
- `--text` - Text to embed (required)
- `--model` - Embedding model
- `--output` - json/array/length

### ListModels.ts
**Purpose**: View installed models and metadata

**Key Features**:
- Table and JSON output
- Size information
- Last modified dates
- Parameter counts

**Options**:
- `--format` - table/json

### CheckHealth.ts
**Purpose**: Verify Ollama connectivity (used by hooks)

**Key Features**:
- Silent operation
- Fast timeout
- Used by SessionStart hook

## Use Cases

1. **Local Code Review** - Review PRs without API costs (Ollama)
2. **Complex Reasoning** - System design, research papers (Claude API)
3. **Offline Development** - Work without internet connectivity (Ollama)
4. **Privacy Protection** - Process sensitive code locally (Ollama)
5. **Prompt Engineering** - Test prompts before production (Both)
6. **Cost Optimization** - Smart routing between free/paid backends
7. **RAG Implementation** - Embed documents for semantic search (Ollama)
8. **Multi-Model Comparison** - Test different backends on same task
9. **Learning & Research** - Experiment with LLMs freely (Ollama)

## Installation

### Ollama Backend (Local, Free)
1. **Install Ollama**: https://ollama.com/download
2. **Start Server**: `ollama serve`
3. **Pull Models**:
   ```bash
   ollama pull llama3.2
   ollama pull qwen2.5-coder:7b
   ollama pull nomic-embed-text
   ```

### Anthropic Backend (API, Paid)
1. **Get API Key**: https://console.anthropic.com/
2. **Add to Environment**: `ANTHROPIC_API_KEY=sk-ant-...` in `$PAI_DIR/.env`
3. **No installation needed** - API-based

### Final Steps
1. **Install Dependencies**: `cd Packs/kai-inference-skill && bun install`
2. **Configure PAI**: Add settings to `$PAI_DIR/.env`
3. **Verify**: `bun run CheckHealth.ts` (checks all backends)

## Performance Tips

- **Use smaller models** for faster responses (3B-7B range)
- **Stream responses** for immediate feedback (default enabled)
- **GPU acceleration** dramatically improves speed
- **Quantized models** (Q4, Q5) balance quality and speed
- **Batch operations** when processing multiple items
- **Cache embeddings** for repeated queries

## Troubleshooting

**Cannot connect to Ollama**:
```bash
# Ensure Ollama is running
ollama serve

# Check with health check
bun run CheckHealth.ts
```

**Model not found**:
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.2
```

**Slow performance**:
- Use smaller models (3B-7B)
- Enable GPU acceleration
- Use quantized versions (Q4_K_M)

**Out of memory**:
- Use smaller models
- Close other applications
- Increase swap space

## Integration with PAI

- **Hooks**: Automatically check health on session start
- **History**: All interactions logged to history system
- **Workflows**: Pre-built templates for common tasks
- **Voice**: Response format compatible with voice output
- **Observability**: Events sent to observability dashboard

## Related Skills

- **Agents**: Use AgentFactory with Ollama models
- **History**: Search history with embeddings
- **Prompting**: Test prompts locally before production

## Resources

- **Ollama Library**: https://ollama.com/library
- **Model Cards**: Detailed specs for each model
- **API Docs**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Community**: Discord, GitHub discussions
