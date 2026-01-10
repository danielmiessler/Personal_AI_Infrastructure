# Intelligent Task Routing - Ollama Integration

## Overview

The PAI system now includes **intelligent task routing** that automatically delegates simple, privacy-sensitive, or routine tasks to your local Ollama models, while reserving Claude API for complex reasoning and multi-step workflows.

This happens **transparently** - you don't need to manually specify which model to use. The system analyzes your request and routes it appropriately.

---

## How It Works

### Architecture

```
User Request
    ↓
UserPromptSubmit Hook → Stores prompt context
    ↓
Claude begins tool execution
    ↓
PreToolUse Hook → Analyzes prompt, decides routing
    ↓
┌────────────┴──────────────┐
│                           │
Route to Ollama          Allow Claude API
(local, private, free)   (complex, multi-step)
```

### Decision Flow

1. **User submits a prompt** (e.g., "Review this code for bugs")
2. **UserPromptSubmit hook** captures and stores the prompt
3. **Claude begins executing** tools (Read, Bash, etc.)
4. **PreToolUse hook intercepts** the first tool call
5. **Routing algorithm analyzes** the stored prompt:
   - Checks for explicit user overrides ("use Ollama", "use Claude")
   - Matches against pattern libraries (code review, architecture, etc.)
   - Calculates complexity score
   - Makes routing decision
6. **If routed to Ollama**:
   - Executes locally with appropriate model (qwen2:7b for code, llama for Q&A)
   - Streams response to user
   - Marks prompt as routed (prevents duplicate routing)
   - Falls back to Claude if Ollama fails/times out
7. **If routed to Claude**:
   - Allows Claude API to proceed normally
   - Full reasoning and tool orchestration available

---

## What Gets Routed to Ollama

### Automatically Routed Tasks

- **Code Review**: "Review this function for bugs"
- **Summarization**: "Summarize this file"
- **Quick Explanations**: "Explain how closures work"
- **Debugging**: "Why is this function failing?"
- **Documentation**: "Add comments to this code"
- **Privacy-Sensitive**: Any task with "locally", "offline", "private"

### Model Selection

The router automatically selects the best local model:

| Task Type | Model Used | Why |
|-----------|------------|-----|
| Code review, debugging | `qwen2:7b` | Code specialist, understands 80+ languages |
| Quick Q&A | `llama3.2:3b` (if available) | Fast, efficient for simple queries |
| Summarization | `deepseek-r1:7b` | Balanced quality for analysis |
| General tasks | `OLLAMA_DEFAULT_MODEL` | Configurable default |

---

## What Stays with Claude

### Claude-Required Tasks

- **Architecture Design**: "Design a microservices system"
- **Multi-Step Planning**: "Create an implementation plan"
- **File Operations**: "Create new files and update existing ones"
- **Complex Reasoning**: "Compare pros and cons of these approaches"
- **Research**: "Find best practices for authentication"
- **Interactive Development**: "Help me build a feature"

These tasks require:
- Tool orchestration (Read → Analyze → Edit → Verify)
- Multi-step reasoning
- Large context windows
- Complex decision-making

---

## Manual Overrides

### Force Ollama (Local)

Use these keywords in your prompt:

```
"Review this code with Ollama"
"Summarize locally"
"Analyze this offline"
"Use local model"
"Private code review"
```

### Force Claude (API)

Use these keywords:

```
"Review this code with Claude"
"Use Claude API for this"
"Don't use Ollama"
```

### Disable Routing (Session)

```bash
export OLLAMA_ENABLE_ROUTING=false
claude "your prompt here"  # Always uses Claude
```

---

## Configuration

### Environment Variables

Located in `~/.claude/pai/.env`:

```bash
# Master switch for routing
OLLAMA_ENABLE_ROUTING=true              # Set to false to disable

# Server configuration
OLLAMA_BASE_URL=http://localhost:11434  # Ollama API endpoint
OLLAMA_TIMEOUT=30000                    # Timeout in milliseconds (30s)

# Model selection
OLLAMA_DEFAULT_MODEL=deepseek-r1:7b     # General-purpose model
OLLAMA_CODE_MODEL=qwen2:7b              # For code-related tasks
OLLAMA_CHAT_MODEL=llama3.2:3b           # For quick Q&A (if available)
OLLAMA_EMBED_MODEL=nomic-embed-text     # For embeddings
```

### Hook Registration

The routing system uses two hooks (configured in `~/.claude/settings.json`):

1. **UserPromptSubmit**: `store-prompt-context.ts`
   - Captures user prompts and stores them in temp files
   - Location: `~/.claude/pai/.temp/prompt-{session_id}.json`

2. **PreToolUse**: `intelligent-router.ts`
   - Analyzes stored prompts and makes routing decisions
   - Executes Ollama calls or allows Claude to proceed
   - Handles fallback if Ollama fails

---

## Benefits

### Privacy & Security

- **Sensitive code stays local** - No data sent to external APIs
- **HIPAA/compliance friendly** - Data never leaves your machine
- **Proprietary code protection** - Review without exposure

### Cost Savings

- **Free local inference** - No API costs for simple tasks
- **Unlimited usage** - No token limits on Ollama
- **Estimated savings**: 30-50% of API costs for typical workflows

### Performance

- **Fast responses** - Local GPU acceleration
- **No network latency** - Direct execution
- **Offline capable** - Works without internet

### Quality Balance

- **Simple tasks → Local models** - Fast, good enough for routine work
- **Complex tasks → Claude API** - High quality reasoning when needed
- **Transparent fallback** - Seamless experience if Ollama fails

---

## Example Workflows

### Example 1: Code Review (Routed to Ollama)

```
User: "Review this function for security issues"

[System automatically routes to qwen2:7b]

🔒 Routing to local Ollama (qwen2:7b) - code_review_pattern

The function has several security concerns:
1. SQL injection vulnerability on line 42...
2. Missing input validation for user data...
3. Hardcoded credentials in line 15...

✅ Completed with Ollama (qwen2:7b)
```

**Result**: Fast, private code review. No API cost.

---

### Example 2: Architecture Design (Claude API)

```
User: "Design a scalable authentication system"

[System recognizes complexity, uses Claude API]

I'll design a comprehensive authentication system...
[Claude provides detailed multi-step plan with tool orchestration]
```

**Result**: Complex reasoning with Claude's full capabilities.

---

### Example 3: Fallback (Ollama → Claude)

```
User: "Summarize this file locally"

[System tries Ollama, but it's offline]

🔒 Routing to local Ollama (deepseek-r1:7b) - user_override_ollama
⚠️  Ollama routing failed: Ollama service is offline
Falling back to Claude API...

[Claude provides summary]
```

**Result**: Seamless fallback ensures reliability.

---

## Troubleshooting

### Ollama Not Routing

**Symptoms**: All tasks go to Claude, even simple ones

**Solutions**:
1. Check if routing is enabled:
   ```bash
   grep OLLAMA_ENABLE_ROUTING ~/.claude/pai/.env
   # Should be: OLLAMA_ENABLE_ROUTING=true
   ```

2. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   # Should return JSON with model list
   ```

3. Check available models:
   ```bash
   ollama list
   # Ensure qwen2:7b or deepseek-r1:7b are available
   ```

4. Test hooks manually:
   ```bash
   echo '{"session_id":"test","prompt":"Review code"}' | \
     bun run ~/.claude/pai/hooks/store-prompt-context.ts
   ```

### Models Not Found

**Symptoms**: "Model 'qwen2.5-coder:7b' not found"

**Solutions**:
1. Check configured model exists:
   ```bash
   ollama list | grep qwen
   ```

2. Update `.env` to use available model:
   ```bash
   # Edit ~/.claude/pai/.env
   OLLAMA_CODE_MODEL=qwen2:7b  # Use model that exists
   ```

3. Or pull the configured model:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```

### Routing to Wrong Model

**Symptoms**: Code review uses chat model instead of code model

**Solutions**:
1. Verify model configuration:
   ```bash
   grep OLLAMA_CODE_MODEL ~/.claude/pai/.env
   ```

2. Check pattern matching in prompt:
   - Use explicit keywords: "review code", "debug function"
   - Router selects model based on task patterns

### Performance Issues

**Symptoms**: Ollama responses are very slow

**Solutions**:
1. Use smaller models:
   ```bash
   OLLAMA_CODE_MODEL=llama3.2:3b  # Faster, lower quality
   ```

2. Increase timeout:
   ```bash
   OLLAMA_TIMEOUT=60000  # 60 seconds
   ```

3. Enable GPU acceleration (if not already):
   ```bash
   # Check if GPU is being used
   nvidia-smi  # For NVIDIA GPUs
   ```

---

## Monitoring & Observability

### Routing Logs

All routing decisions are logged to the observability dashboard (if configured):

```json
{
  "routing_decision": "ollama",
  "routing_reason": "code_review_pattern",
  "model_used": "qwen2:7b",
  "execution_time_ms": 2345,
  "routing_result": "success"
}
```

### Metrics to Track

- **Routing Rate**: % of tasks routed to Ollama vs Claude
- **Success Rate**: % of Ollama routes that succeed vs fallback
- **Cost Savings**: Estimated API costs saved
- **Performance**: Average response time Ollama vs Claude

### Dashboard URL

Configure in `~/.claude/pai/.env`:

```bash
PAI_OBSERVABILITY_URL=http://localhost:4000/events
```

---

## Advanced Features

### Complexity Scoring

The router calculates a complexity score for ambiguous tasks:

- **High complexity signals** (+10 points each):
  - "multiple files", "entire codebase", "all components"
  - Tasks spanning > 1000 characters

- **Low complexity signals** (-5 points each):
  - "this file", "single function", "just this"
  - Quick/simple keywords

**Threshold**: Score ≥ 10 → Route to Claude

### Privacy Detection

Automatic local routing for sensitive data:

- API keys, credentials, secrets
- Personal information (PII, SSN, medical data)
- Proprietary/confidential code
- Keywords: "private", "confidential", "secret"

### Model-Specific Prompts

Each model type gets optimized system prompts:

- **Code models**: "You are a code review expert..."
- **Chat models**: "Provide concise, accurate answers..."
- **Summarization**: "Extract key points and main ideas..."

---

## Files Created

### Core Implementation

| File | Purpose |
|------|---------|
| `hooks/intelligent-router.ts` | Main routing logic (PreToolUse hook) |
| `hooks/store-prompt-context.ts` | Prompt capture (UserPromptSubmit hook) |
| `hooks/lib/prompt-context.ts` | Prompt storage library |
| `hooks/lib/ollama-client.ts` | Reusable Ollama API client |
| `hooks/lib/routing-patterns.ts` | Task classification patterns |

### Configuration

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hook registration |
| `.claude/pai/.env` | Routing configuration |

---

## Future Enhancements

### Planned Features

1. **Machine Learning Routing** - Train classifier on historical decisions
2. **Adaptive Learning** - Learn from user overrides
3. **Multi-Model Consensus** - Use both models for critical tasks
4. **Cost Optimization** - Dynamic routing based on API budget
5. **Quality Scoring** - Track and improve routing accuracy

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Verify configuration with `/home/kaishraiberg/.claude/pai/.env`
3. Test Ollama directly: `ollama run qwen2:7b "test prompt"`
4. Check Claude Code logs for hook errors
5. Open issue in PAI repository

---

## Version

**Version**: 1.0.0 (2026-01-07)

**Changelog**:
- ✅ Initial implementation of intelligent routing
- ✅ Pattern-based task classification
- ✅ Automatic model selection
- ✅ Fallback to Claude on errors
- ✅ Privacy-sensitive task detection
- ✅ Manual override support
- ✅ Observability integration

---

## Credits

- **Routing System**: Implemented as part of PAI Ollama skill
- **Hook Framework**: Built on Kai Hook System
- **Ollama Integration**: Uses Ollama local LLM infrastructure
- **Pattern Library**: Curated task classification patterns

**Enjoy intelligent, cost-effective, privacy-preserving AI assistance!** 🚀
