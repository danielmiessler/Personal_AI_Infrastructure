# Ollama Quick Reference

Fast reference for common Ollama operations within PAI.

## Tool Commands

### Quick Run (Easiest Way) ⭐
```bash
# Basic - uses default model
bun run Run.ts "Your prompt here"

# Choose model (positional)
bun run Run.ts "Your prompt" llama3.2
bun run Run.ts "Review this code" qwen2.5-coder:7b
bun run Run.ts "Summarize" mistral

# Choose model (flag)
bun run Run.ts "Your prompt" --model codellama:7b

# With system prompt
bun run Run.ts "Analyze this" qwen2.5-coder:7b --system "You are a security expert"

# JSON output
bun run Run.ts "List 3 items" --format json
```

### Generate Text (Full Options)
```bash
# Basic
bun run Generate.ts --prompt "Your prompt here"

# With options
bun run Generate.ts --prompt "..." --model llama3.2 --temperature 0.7

# Code review
bun run Generate.ts --model qwen2.5-coder:7b --system "You are a code reviewer" --prompt "Review: ..."

# JSON output
bun run Generate.ts --prompt "List 3 items" --format json
```

### Interactive Chat
```bash
# Start chat
bun run Chat.ts

# With model
bun run Chat.ts --model codellama:7b

# With system prompt
bun run Chat.ts --system "You are a Python expert"
```

### Generate Embeddings
```bash
# Basic
bun run Embed.ts --text "Your text"

# Get dimensions
bun run Embed.ts --text "Test" --output length

# Specific model
bun run Embed.ts --text "..." --model nomic-embed-text
```

### List Models
```bash
# Table view
bun run ListModels.ts

# JSON output
bun run ListModels.ts --format json
```

### Health Check
```bash
# Silent check
bun run CheckHealth.ts
```

## Model Recommendations

| Use Case | Model | Size | Speed |
|----------|-------|------|-------|
| Fast chat | llama3.2:3b | 1.9GB | ⚡⚡⚡ |
| Balanced | llama3.2:latest | 4.7GB | ⚡⚡ |
| Code | qwen2.5-coder:7b | 4.7GB | ⚡⚡ |
| Quality | mistral:latest | 4.1GB | ⚡ |
| Embeddings | nomic-embed-text | 274MB | ⚡⚡⚡ |

## Common Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| --prompt | string | Text input |
| --model | model-name | Which model to use |
| --system | string | Set context/persona |
| --temperature | 0.0-1.0 | Creativity (0=deterministic, 1=creative) |
| --format | json | Request structured output |
| --stream | boolean | Stream response (default: true) |
| --output | json/array/length | Embed output format |

## Environment Variables

```bash
# Required
OLLAMA_BASE_URL=http://localhost:11434

# Optional (with defaults)
OLLAMA_DEFAULT_MODEL=llama3.2:latest
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_CODE_MODEL=qwen2.5-coder:7b
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_TIMEOUT=30000
```

## Workflow Triggers

| Workflow | Trigger Phrases |
|----------|-----------------|
| CodeReview | "review locally", "local code review" |
| Summarize | "summarize locally", "ollama summarize" |
| Experiment | "test with ollama", "experiment locally" |

## Ollama CLI Commands

```bash
# Server
ollama serve                     # Start server
brew services start ollama       # Start as service (macOS)

# Models
ollama list                      # List installed
ollama pull llama3.2             # Download model
ollama rm llama3.2               # Remove model
ollama show llama3.2             # Show details

# Direct Usage
ollama run llama3.2              # Interactive
ollama run llama3.2 "prompt"     # One-shot
```

## Temperature Guide

| Temperature | Effect | Use For |
|-------------|--------|---------|
| 0.0-0.3 | Deterministic | Code, facts, consistency |
| 0.4-0.6 | Balanced | General text, summaries |
| 0.7-0.9 | Creative | Stories, brainstorming |
| 0.9-1.0 | Very random | Experimental, artistic |

## Model Selection by Task

| Task | Best Model | Alternative |
|------|-----------|-------------|
| Code review | qwen2.5-coder:7b | codellama:7b |
| General chat | llama3.2:3b | mistral:latest |
| Long documents | mistral:latest | llama3.2:latest |
| Embeddings | nomic-embed-text | mxbai-embed-large |
| Fast responses | llama3.2:3b | qwen2.5-coder:1.5b |
| High quality | mistral:latest | llama3.2:latest |

## Performance Tips

1. **Use smaller models** for speed (3B-7B)
2. **Enable GPU** for 3-5x speedup
3. **Stream responses** for immediate feedback
4. **Lower temperature** for consistency
5. **Batch similar tasks** together
6. **Quantized models** (Q4_K_M) for speed
7. **Close other apps** to free RAM
8. **Use SSD** for faster model loading

## Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| Cannot connect | `ollama serve` |
| Model not found | `ollama pull llama3.2` |
| Slow performance | Use 3B model |
| Out of memory | Close apps, use smaller model |
| Permission denied | `chmod +x Tools/*.ts` |

## Quick Model Download

```bash
# Essential set (8GB total)
ollama pull llama3.2:3b          # 1.9GB - Fast chat
ollama pull qwen2.5-coder:7b     # 4.7GB - Code
ollama pull nomic-embed-text     # 274MB - Embeddings

# Extended set (additional 8GB)
ollama pull llama3.2:latest      # 4.7GB - Balanced
ollama pull mistral:latest       # 4.1GB - Quality
```

## Example Workflows

### Quick Code Review
```bash
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "You are a code reviewer" \
  --prompt "Review: $(cat file.ts)"
```

### Document Summary
```bash
bun run Generate.ts \
  --prompt "Summarize in 3 bullets: $(cat doc.md)"
```

### Multi-Model Test
```bash
for model in llama3.2:3b mistral:latest; do
  echo "=== $model ==="
  bun run Generate.ts --model $model --prompt "Explain recursion"
done
```

### Search Similar Content
```bash
# Generate embedding for query
query_embed=$(bun run Embed.ts --text "authentication" --output array)

# Compare with stored embeddings
# (implement similarity search)
```

## Integration Examples

### Git Hook
```bash
# .git/hooks/pre-commit
bun run $PAI_DIR/skills/Ollama/Tools/Generate.ts \
  --model qwen2.5-coder:7b \
  --prompt "Review these changes: $(git diff --cached)"
```

### Editor Integration
```bash
# Review current file
current_file=$(cat $CURRENT_FILE)
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --prompt "Review: $current_file"
```

### Pipeline Processing
```bash
# Process multiple files
find . -name "*.md" -exec \
  bun run Generate.ts --prompt "Summarize: $(cat {})" \;
```

## Resource Monitoring

```bash
# Check Ollama status
curl -s http://localhost:11434/api/tags

# Monitor GPU (NVIDIA)
watch -n 1 nvidia-smi

# Check memory
free -h

# Check disk space
df -h
```

## Common Model Commands

```bash
# Update model
ollama pull llama3.2:latest

# Copy model with custom name
ollama cp llama3.2 my-model

# Create custom model
ollama create my-assistant -f Modelfile

# Export model
ollama show llama3.2 --modelfile > Modelfile
```

## API Endpoints

```bash
# Generate
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello"
}'

# Chat
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello"}]
}'

# Embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Hello"
}'
```

## Keyboard Shortcuts (Chat)

| Key/Command | Action |
|-------------|--------|
| Enter | Send message |
| /exit | Exit chat |
| /quit | Exit chat |
| /clear | Clear history |
| /help | Show commands |
| Ctrl+C | Interrupt generation |

## File Paths

```
$PAI_DIR/skills/Ollama/
├── SKILL.md                     # Skill definition
├── QuickReference.md            # This file
├── Tools/
│   ├── Generate.ts              # Text generation
│   ├── Chat.ts                  # Interactive chat
│   ├── Embed.ts                 # Embeddings
│   ├── ListModels.ts            # Model list
│   └── CheckHealth.ts           # Health check
└── Workflows/
    ├── CodeReview.md            # Code review
    ├── Summarize.md             # Summarization
    └── Experiment.md            # Experimentation
```

## Quick Links

- Ollama: https://ollama.com
- Models: https://ollama.com/library
- API: https://github.com/ollama/ollama/blob/main/docs/api.md
- Discord: https://discord.gg/ollama

## Version Info

```bash
# Check versions
ollama --version
bun --version
node --version

# Check PAI
echo $PAI_DIR
ls -la $PAI_DIR/skills/Ollama
```

## Emergency Reset

```bash
# Restart Ollama
pkill ollama
ollama serve

# Clear Ollama cache
rm -rf ~/.ollama/models

# Re-pull models
ollama pull llama3.2

# Reset PAI config
# Edit $PAI_DIR/.env
```
