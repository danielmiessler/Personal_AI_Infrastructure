# Ollama Skill Verification Checklist

This document provides comprehensive verification tests to ensure the Ollama skill is installed and working correctly.

## Prerequisites Check

### 1. Ollama Installation

```bash
# Check Ollama is installed
ollama --version
# Expected: ollama version 0.1.0 or higher
```

- [ ] Ollama is installed
- [ ] Version is 0.1.0 or higher

### 2. Ollama Server Running

```bash
# Check if server is running
curl -s http://localhost:11434/api/tags | jq '.models | length'
# Expected: Number of installed models (or connection success)

# Alternative check
ps aux | grep "ollama serve"
# Expected: Process is running
```

- [ ] Ollama server is running
- [ ] API endpoint responds

### 3. Models Installed

```bash
# List installed models
ollama list
# Expected: At least one model listed

# Recommended models
ollama list | grep llama3.2
ollama list | grep qwen2.5-coder
ollama list | grep nomic-embed-text
```

- [ ] At least one model is installed
- [ ] Recommended: llama3.2:latest
- [ ] Recommended: qwen2.5-coder:7b
- [ ] Recommended: nomic-embed-text

### 4. PAI Directory Structure

```bash
# Check PAI_DIR is set
echo $PAI_DIR
# Expected: Path to PAI directory (e.g., ~/.claude/pai)

# Check skill files exist
ls -la $PAI_DIR/skills/Ollama
# Expected: Directory with SKILL.md, Tools/, Workflows/
```

- [ ] `$PAI_DIR` environment variable is set
- [ ] `$PAI_DIR/skills/Ollama` directory exists
- [ ] SKILL.md file exists
- [ ] Tools/ directory exists
- [ ] Workflows/ directory exists

### 5. Environment Configuration

```bash
# Check .env file exists
cat $PAI_DIR/.env | grep OLLAMA
# Expected: Ollama configuration variables
```

- [ ] `.env` file contains `OLLAMA_BASE_URL`
- [ ] `.env` file contains `OLLAMA_DEFAULT_MODEL`
- [ ] Configuration values are correct

## Tool Verification

### 1. Generate.ts

```bash
cd $PAI_DIR/skills/Ollama/Tools

# Test 1: Help
bun run Generate.ts --help
# Expected: Help text displays

# Test 2: Basic generation
bun run Generate.ts --prompt "Say hello in 5 words"
# Expected: Streaming response with ~5 words

# Test 3: No streaming
bun run Generate.ts --prompt "Count to 3" --no-stream
# Expected: Complete response at once

# Test 4: JSON mode
bun run Generate.ts --prompt "List 3 colors as JSON array" --format json
# Expected: Valid JSON array

# Test 5: System prompt
bun run Generate.ts --prompt "Review this: function add(a, b) { return a + b }" --system "You are a code reviewer"
# Expected: Code review response

# Test 6: Temperature
bun run Generate.ts --prompt "Write a creative sentence" --temperature 0.9
# Expected: Creative response

# Test 7: Specific model
bun run Generate.ts --prompt "Hello" --model llama3.2:3b
# Expected: Response from llama3.2:3b
```

#### Checklist
- [ ] Help text displays correctly
- [ ] Basic generation works with streaming
- [ ] Non-streaming mode works
- [ ] JSON mode produces valid JSON
- [ ] System prompts are respected
- [ ] Temperature parameter works
- [ ] Can specify different models
- [ ] Performance metrics are displayed
- [ ] Errors are handled gracefully

### 2. Chat.ts

```bash
# Test 1: Help
bun run Chat.ts --help
# Expected: Help text displays

# Test 2: Interactive mode (requires manual interaction)
bun run Chat.ts
# Type: "What is 2+2?"
# Expected: Response
# Type: "/clear"
# Expected: History cleared message
# Type: "/exit"
# Expected: Exits cleanly

# Test 3: With system prompt
bun run Chat.ts --system "You are a helpful math tutor"
# Type: "Explain algebra"
# Expected: Math-focused response

# Test 4: Specific model
bun run Chat.ts --model codellama:7b
# Expected: Uses codellama model
```

#### Checklist
- [ ] Help text displays correctly
- [ ] Interactive chat starts successfully
- [ ] Responses stream correctly
- [ ] Conversation context is maintained
- [ ] `/clear` command works
- [ ] `/exit` command works
- [ ] `/help` command works
- [ ] System prompts work
- [ ] Model selection works

### 3. Embed.ts

```bash
# Test 1: Help
bun run Embed.ts --help
# Expected: Help text displays

# Test 2: Basic embedding
bun run Embed.ts --text "Hello world"
# Expected: JSON with embedding array

# Test 3: Array output
bun run Embed.ts --text "Test" --output array
# Expected: Just the array

# Test 4: Length output
bun run Embed.ts --text "Test" --output length
# Expected: Number (e.g., 768)

# Test 5: Specific model
bun run Embed.ts --text "Test" --model nomic-embed-text
# Expected: Embedding from nomic-embed-text
```

#### Checklist
- [ ] Help text displays correctly
- [ ] Basic embedding generation works
- [ ] JSON output format is valid
- [ ] Array output works
- [ ] Length output works
- [ ] Specific model selection works
- [ ] Embeddings have correct dimensions
- [ ] Errors handled gracefully

### 4. ListModels.ts

```bash
# Test 1: Help
bun run ListModels.ts --help
# Expected: Help text displays

# Test 2: Table format
bun run ListModels.ts
# Expected: Table with models, sizes, dates

# Test 3: JSON format
bun run ListModels.ts --format json
# Expected: Valid JSON array

# Test 4: Verify model count
bun run ListModels.ts --format json | jq 'length'
# Expected: Number matches `ollama list`
```

#### Checklist
- [ ] Help text displays correctly
- [ ] Table format displays properly
- [ ] JSON format is valid
- [ ] Model names are correct
- [ ] Sizes are formatted (GB/MB)
- [ ] Modified dates are human-readable
- [ ] Parameter counts are shown
- [ ] Total count is correct

### 5. CheckHealth.ts

```bash
# Test 1: When Ollama running
bun run CheckHealth.ts
echo "Exit code: $?"
# Expected: Exit code 0 (silent success)

# Test 2: When Ollama not running
# Stop ollama first: pkill ollama
bun run CheckHealth.ts
echo "Exit code: $?"
# Expected: Exit code 0 (silent failure, no error output)
# Restart ollama: ollama serve
```

#### Checklist
- [ ] Exits successfully when Ollama running
- [ ] Exits gracefully when Ollama not running
- [ ] No output produced (silent operation)
- [ ] Fast execution (< 3 seconds)

## Workflow Verification

### 1. CodeReview Workflow

```bash
# Create test file
cat > /tmp/test.js << 'EOF'
function calculate(x, y) {
  return x + y
}
EOF

# Run code review
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "You are a code reviewer. Analyze for bugs and style." \
  --prompt "Review this code: $(cat /tmp/test.js)"
# Expected: Code review output with suggestions
```

#### Checklist
- [ ] Code review completes successfully
- [ ] Review mentions code quality aspects
- [ ] Specific suggestions are provided
- [ ] Format is clear and actionable
- [ ] Uses appropriate code model

### 2. Summarize Workflow

```bash
# Create test document
cat > /tmp/test.md << 'EOF'
# Machine Learning Basics

Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. There are three main types: supervised learning (learning from labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error with rewards and penalties).
EOF

# Run summarization
bun run Generate.ts \
  --prompt "Summarize this in 3 bullet points: $(cat /tmp/test.md)"
# Expected: 3 bullet point summary
```

#### Checklist
- [ ] Summarization completes successfully
- [ ] Summary captures key points
- [ ] Output format matches request
- [ ] Length is appropriate
- [ ] Information is accurate

### 3. Experiment Workflow

```bash
# Test multiple models
for model in llama3.2:3b mistral:latest qwen2.5-coder:7b; do
  echo "=== Testing $model ==="
  bun run Generate.ts \
    --model $model \
    --prompt "Explain recursion in one sentence" \
    --no-stream
  echo ""
done
# Expected: Different responses from each model
```

#### Checklist
- [ ] All models run successfully
- [ ] Responses vary between models
- [ ] Performance metrics are shown
- [ ] Comparison is possible
- [ ] No errors occur

## Integration Verification

### 1. Hook Registration

```bash
# Check SessionStart hook
cat ~/.claude/settings.json | jq '.hooks.SessionStart[] | select(.hooks[].command | contains("CheckHealth"))'
# Expected: Hook configuration found
```

#### Checklist
- [ ] SessionStart hook is registered
- [ ] Hook command path is correct
- [ ] Hook uses bun runtime
- [ ] $PAI_DIR variable is used

### 2. Permissions

```bash
# Check permissions
cat ~/.claude/settings.json | jq '.permissions.allow[] | select(contains("Ollama"))'
# Expected: Ollama-related permissions
```

#### Checklist
- [ ] Read permission for Ollama files
- [ ] Bash permission for Ollama tools
- [ ] Bash permission for ollama commands

### 3. Claude Code Integration

```bash
# Start Claude Code session
claude-code

# In session, try:
# "List my local ollama models"
# "Generate text locally: explain async/await"
# "Review this function locally"
```

#### Checklist
- [ ] Claude Code starts successfully
- [ ] Skill context is loaded
- [ ] Can invoke tools from chat
- [ ] Responses are formatted correctly
- [ ] Errors are handled gracefully

## Performance Verification

### 1. Speed Test

```bash
# Measure generation speed
time bun run Generate.ts \
  --prompt "Count from 1 to 100" \
  --no-stream > /dev/null
# Expected: < 10 seconds for 7B model
```

#### Checklist
- [ ] Generation completes in reasonable time
- [ ] Tokens/sec metric is displayed
- [ ] Speed matches model size expectations

### 2. Memory Usage

```bash
# Check memory before and after
free -h
bun run Generate.ts --prompt "Generate a story" --no-stream
free -h
# Expected: Memory increases during generation, returns after
```

#### Checklist
- [ ] Memory usage is reasonable
- [ ] Memory is released after generation
- [ ] No memory leaks observed

### 3. GPU Utilization (if available)

```bash
# Monitor GPU usage
watch -n 1 nvidia-smi  # NVIDIA GPUs

# Run generation in another terminal
bun run Generate.ts --prompt "Write a long story"
# Expected: GPU utilization increases
```

#### Checklist
- [ ] GPU is detected by Ollama
- [ ] GPU utilization increases during generation
- [ ] Generation is faster with GPU

## Error Handling Verification

### 1. Ollama Not Running

```bash
# Stop Ollama
pkill ollama

# Try generation
bun run Generate.ts --prompt "Hello"
# Expected: Clear error message about connection

# Restart Ollama
ollama serve
```

#### Checklist
- [ ] Clear error message displayed
- [ ] Suggests starting Ollama
- [ ] Exits with code 1
- [ ] No stack trace shown

### 2. Model Not Found

```bash
# Try non-existent model
bun run Generate.ts --prompt "Hello" --model nonexistent:latest
# Expected: Error about model not found
```

#### Checklist
- [ ] Clear error message
- [ ] Suggests pulling model
- [ ] Exits gracefully

### 3. Invalid Arguments

```bash
# Missing required argument
bun run Generate.ts
# Expected: Error about missing --prompt

# Invalid format
bun run Generate.ts --prompt "test" --format invalid
# Expected: Error or warning about invalid format
```

#### Checklist
- [ ] Missing argument errors are clear
- [ ] Invalid values are caught
- [ ] Help suggestion is provided

## Final Checklist

### Installation
- [ ] Ollama installed and running
- [ ] Models pulled and available
- [ ] Skill files copied to PAI
- [ ] Environment configured
- [ ] Hooks registered
- [ ] Permissions set

### Tools
- [ ] All 5 tools run successfully
- [ ] Help text works for all tools
- [ ] Core functionality works
- [ ] Error handling is graceful

### Workflows
- [ ] CodeReview workflow works
- [ ] Summarize workflow works
- [ ] Experiment workflow works

### Integration
- [ ] Hooks execute on SessionStart
- [ ] Permissions allow tool execution
- [ ] Claude Code can invoke tools
- [ ] History system compatible

### Performance
- [ ] Speed is acceptable
- [ ] Memory usage is reasonable
- [ ] GPU acceleration works (if available)

### Documentation
- [ ] README is clear
- [ ] INSTALL guide is complete
- [ ] SKILL.md is comprehensive
- [ ] Workflows are documented

## Troubleshooting Failed Tests

If any verification fails:

1. **Check prerequisites**: Ensure Ollama and PAI are properly installed
2. **Verify paths**: Confirm `$PAI_DIR` points to correct directory
3. **Check permissions**: Ensure files are executable
4. **Review logs**: Check Ollama logs for errors
5. **Test manually**: Run commands step-by-step
6. **Consult INSTALL.md**: Review installation steps
7. **Check resources**: Ensure sufficient RAM/disk space

## Success Criteria

The Ollama skill is verified when:

✅ All prerequisite checks pass
✅ All 5 tools work correctly
✅ All 3 workflows execute successfully
✅ Integration with Claude Code works
✅ Performance meets expectations
✅ Error handling is graceful
✅ Documentation is complete

## Reporting Issues

If verification fails:

1. Note which tests failed
2. Capture error messages
3. Check system resources
4. Review Ollama logs: `journalctl --user -u ollama`
5. Verify Ollama version: `ollama --version`
6. Test Ollama directly: `ollama run llama3.2`
7. Report issue with full context

## Next Steps

After successful verification:

1. ✨ Start using Ollama skill in your workflow
2. 📚 Read workflow documentation for advanced usage
3. 🎨 Customize models and prompts
4. 🔧 Optimize configuration for your use case
5. 🚀 Explore experiment workflow for testing
6. 📊 Monitor performance and adjust
7. 🤝 Share feedback and improvements
