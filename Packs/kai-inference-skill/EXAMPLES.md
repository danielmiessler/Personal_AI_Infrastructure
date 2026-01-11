# Inference Skill Usage Examples

Practical examples using multiple LLM backends (Ollama local + Claude API) from Claude Code sessions.

## Quick Model Selection

The `Run.ts` tool makes it easy to choose any backend/model:

### Basic Patterns
```bash
# Model name auto-detects backend
bun run Run.ts "your prompt" [model-name]

# Explicit backend selection
bun run Run.ts "your prompt" --backend [ollama|anthropic] --model [model-name]
```

## Examples by Model

## Claude API Models (Anthropic, Paid)

### claude-sonnet-4.5 (Balanced)
**Best for**: General reasoning, balanced speed/quality, recommended default

```bash
# System design
bun run Run.ts "Design a scalable authentication system with JWT" claude-sonnet-4.5

# Complex analysis
bun run Run.ts "Analyze trade-offs between REST and GraphQL" claude-sonnet-4.5

# Research assistance
bun run Run.ts "Summarize recent papers on transformers" claude-sonnet-4.5

# Architecture review
bun run Run.ts "Review this system design: $(cat architecture.md)" claude-sonnet-4.5
```

### claude-opus-4.5 (Maximum Capability)
**Best for**: Complex reasoning, system design, research, maximum quality

```bash
# System design
bun run Run.ts "Design a scalable authentication system" claude-opus-4.5

# Complex analysis
bun run Run.ts "Analyze this distributed system architecture" claude-opus-4.5

# Research tasks
bun run Run.ts "Explain the trade-offs between consistency models" claude-opus-4.5

# Detailed code architecture review
bun run Run.ts "Review the architecture of: $(cat src/**/*.ts)" claude-opus-4.5
```

### claude-haiku-4 (Fast Responses)
**Best for**: Quick answers, high throughput, simple tasks

```bash
# Quick explanations
bun run Run.ts "What is a closure?" claude-haiku-4

# Simple summaries
bun run Run.ts "Summarize: $(cat README.md)" claude-haiku-4

# Fast iterations
bun run Run.ts "List 5 pros of microservices" claude-haiku-4
```

## Ollama Models (Local, Free)

### llama3.2:3b (Fast & Efficient)
**Best for**: Quick answers, chat, general questions

```bash
# Quick Q&A
bun run Run.ts "What is a closure?" llama3.2:3b

# Explain concept
bun run Run.ts "Explain promise chains briefly" llama3.2:3b

# Simple summaries
bun run Run.ts "Summarize: $(cat README.md)" llama3.2:3b
```

### llama3.2:latest (Balanced Quality)
**Best for**: General tasks, balanced speed/quality

```bash
# Detailed explanations
bun run Run.ts "Explain async/await with examples" llama3.2

# General text generation
bun run Run.ts "Write a product description for a smart watch" llama3.2

# Documentation help
bun run Run.ts "Help me write docs for this function" llama3.2
```

### qwen2.5-coder:7b (Best for Code)
**Best for**: Code review, debugging, technical tasks

```bash
# Code review
bun run Run.ts "Review this function: $(cat src/auth.ts)" qwen2.5-coder:7b

# Bug analysis
bun run Run.ts "Why does this fail? $(cat broken.js)" qwen2.5-coder:7b --system "You are a debugger"

# Code generation
bun run Run.ts "Write a TypeScript function to validate emails" qwen2.5-coder:7b

# Refactoring suggestions
bun run Run.ts "How can I improve this code? $(cat legacy.js)" qwen2.5-coder:7b

# Test generation
bun run Run.ts "Generate unit tests for: $(cat utils.ts)" qwen2.5-coder:7b
```

### codellama:7b (Code Specialist)
**Best for**: Code completion, language-specific help

```bash
# Python help
bun run Run.ts "Explain Python decorators" codellama:7b

# JavaScript patterns
bun run Run.ts "Show me the module pattern in JS" codellama:7b

# Algorithm implementation
bun run Run.ts "Implement quicksort in Python" codellama:7b

# Code explanation
bun run Run.ts "Explain this algorithm: $(cat sort.py)" codellama:7b
```

### mistral:latest (High Quality)
**Best for**: Long documents, complex tasks, quality over speed

```bash
# Long document summary
bun run Run.ts "Summarize this paper: $(cat research.md)" mistral

# Detailed analysis
bun run Run.ts "Analyze the pros and cons of microservices" mistral

# Complex explanations
bun run Run.ts "Explain distributed consensus algorithms" mistral
```

### deepseek-coder:6.7b (Code Generation)
**Best for**: Writing new code, completions

```bash
# Generate API endpoint
bun run Run.ts "Create a REST API endpoint for user registration" deepseek-coder:6.7b

# Boilerplate generation
bun run Run.ts "Generate Express.js middleware for auth" deepseek-coder:6.7b

# Complete code
bun run Run.ts "Complete this function: function fibonacci(n) {" deepseek-coder:6.7b
```

## Examples by Task Type

### Code Review
```bash
# Security-focused
bun run Run.ts "Security review: $(cat api.ts)" qwen2.5-coder:7b \
  --system "You are a security auditor. Focus on vulnerabilities."

# Performance-focused
bun run Run.ts "Performance review: $(cat query.sql)" qwen2.5-coder:7b \
  --system "You are a performance expert. Find bottlenecks."

# Style-focused
bun run Run.ts "Style review: $(cat component.tsx)" codellama:7b \
  --system "Review code style and best practices."
```

### Documentation
```bash
# Generate README
bun run Run.ts "Create a README for this project: $(ls -la)" llama3.2

# API documentation
bun run Run.ts "Document this API: $(cat api.ts)" qwen2.5-coder:7b

# Inline comments
bun run Run.ts "Add comments to: $(cat complex.js)" qwen2.5-coder:7b
```

### Debugging
```bash
# Error explanation
bun run Run.ts "Explain this error: TypeError: Cannot read property 'map' of undefined" llama3.2:3b

# Stack trace analysis
bun run Run.ts "Analyze this stack trace: $(cat error.log)" qwen2.5-coder:7b

# Root cause
bun run Run.ts "Find the bug: $(cat failing-test.js)" qwen2.5-coder:7b \
  --system "You are a debugger. Find the root cause."
```

### Learning
```bash
# Concept explanation
bun run Run.ts "Explain monads in simple terms" llama3.2

# Tutorial request
bun run Run.ts "Teach me about React hooks with examples" codellama:7b

# Comparison
bun run Run.ts "Compare REST vs GraphQL" mistral
```

### Refactoring
```bash
# Modernize code
bun run Run.ts "Modernize this to ES6: $(cat old.js)" qwen2.5-coder:7b

# Extract function
bun run Run.ts "Extract a helper function from: $(cat messy.js)" qwen2.5-coder:7b

# Improve readability
bun run Run.ts "Make this more readable: $(cat cryptic.ts)" codellama:7b
```

### Translation
```bash
# Language translation
bun run Run.ts "Translate to Python: $(cat script.js)" qwen2.5-coder:7b

# Framework migration
bun run Run.ts "Convert to React: $(cat vue-component.vue)" codellama:7b

# Test framework
bun run Run.ts "Convert Jest to Vitest: $(cat test.spec.js)" qwen2.5-coder:7b
```

## Using from Claude Code Sessions

When working in a Claude Code session, you can ask Claude to invoke Ollama with specific models:

### Example Conversations

**User**: "Review this function locally using qwen2.5-coder"
```typescript
function authenticate(user, pass) {
  return user === 'admin' && pass === '12345';
}
```

**Claude**: I'll review this using the local Ollama qwen2.5-coder model for code analysis.
```bash
bun run $PAI_DIR/skills/Ollama/Tools/Run.ts \
  "Review this authentication function for security issues: function authenticate(user, pass) { return user === 'admin' && pass === '12345'; }" \
  qwen2.5-coder:7b \
  --system "You are a security expert"
```

---

**User**: "Summarize this file with mistral"

**Claude**: I'll use the Mistral model for high-quality summarization.
```bash
bun run $PAI_DIR/skills/Ollama/Tools/Run.ts \
  "Summarize this: $(cat architecture.md)" \
  mistral
```

---

**User**: "Explain this error using the fast llama model"

**Claude**: I'll use llama3.2:3b for a quick explanation.
```bash
bun run $PAI_DIR/skills/Ollama/Tools/Run.ts \
  "Explain: ReferenceError: foo is not defined" \
  llama3.2:3b
```

## Model Selection Guide

| Task | Best Model | Alternative | Why |
|------|-----------|-------------|-----|
| Code review | qwen2.5-coder:7b | codellama:7b | Best code understanding |
| Quick Q&A | llama3.2:3b | llama3.2 | Fastest response |
| Code generation | qwen2.5-coder:7b | deepseek-coder | Most accurate code |
| Long documents | mistral | llama3.2 | Large context window |
| Debugging | qwen2.5-coder:7b | codellama:7b | Code-aware |
| General text | llama3.2 | mistral | Good balance |
| Embeddings | nomic-embed-text | mxbai-embed-large | Best for RAG |

## Advanced: Comparing Models

Test same prompt across multiple models:

```bash
# Compare explanations
for model in llama3.2:3b llama3.2 mistral; do
  echo "=== $model ==="
  bun run Run.ts "Explain recursion in one sentence" $model --no-stream
  echo ""
done
```

## Tips

1. **Model as positional arg**: Just add model name after prompt
2. **No flags needed**: `Run.ts "prompt" model` is simplest
3. **Default model**: Omit model to use `OLLAMA_DEFAULT_MODEL`
4. **System prompts**: Add `--system` for specific personas
5. **Streaming**: Enabled by default, see tokens appear live
6. **Performance**: Use 3B models for speed, 7B for quality

## Environment Variables

Set defaults in `$PAI_DIR/.env`:

```bash
# Different defaults for different task types
OLLAMA_DEFAULT_MODEL=llama3.2:latest    # General default
OLLAMA_CODE_MODEL=qwen2.5-coder:7b      # For code tasks
OLLAMA_CHAT_MODEL=llama3.2:3b           # For fast chat
OLLAMA_EMBED_MODEL=nomic-embed-text     # For embeddings
```

Then reference in your workflows:
```bash
# Use code model from env
bun run Run.ts "Review this" $OLLAMA_CODE_MODEL

# Use fast chat model
bun run Run.ts "Quick question" $OLLAMA_CHAT_MODEL
```

## Common Patterns

### Pipeline Processing
```bash
# Review all TypeScript files
find src -name "*.ts" -exec \
  bun run Run.ts "Review: $(cat {})" qwen2.5-coder:7b \;
```

### Git Integration
```bash
# Review uncommitted changes
bun run Run.ts "Review these changes: $(git diff)" qwen2.5-coder:7b
```

### Editor Integration
```bash
# Review current file (set by editor)
bun run Run.ts "Review: $(cat $CURRENT_FILE)" qwen2.5-coder:7b
```

### Multi-Model Consensus
```bash
# Get opinions from multiple models
echo "Prompt: How to handle errors in async code?"
bun run Run.ts "Best practices for async error handling" llama3.2 > answer1.txt
bun run Run.ts "Best practices for async error handling" mistral > answer2.txt
bun run Run.ts "Best practices for async error handling" qwen2.5-coder:7b > answer3.txt
# Compare answers
```

## Troubleshooting

**Model not found**:
```bash
# Pull the model first
ollama pull qwen2.5-coder:7b

# Then try again
bun run Run.ts "test" qwen2.5-coder:7b
```

**Wrong model used**:
```bash
# Verify model name
ollama list

# Check exact name format
bun run Run.ts "test" llama3.2:latest  # Include tag
```

**Slow performance**:
```bash
# Use smaller model
bun run Run.ts "prompt" llama3.2:3b  # Instead of :latest
```
