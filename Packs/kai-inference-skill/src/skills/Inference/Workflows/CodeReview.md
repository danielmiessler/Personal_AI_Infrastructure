# CodeReview Workflow

**Purpose**: Perform local code reviews using Ollama models without sending code to external APIs.

**Best for**: Privacy-sensitive code, proprietary projects, offline development, cost reduction.

## Workflow Steps

1. **Detect Request**
   - User asks for local code review
   - Triggers: "review locally", "local code review", "review with ollama"

2. **Select Model**
   - Default: `qwen2.5-coder:7b` (excellent code understanding)
   - Alternative: `codellama:7b`, `deepseek-coder:6.7b`
   - Read from `OLLAMA_CODE_MODEL` environment variable

3. **Prepare System Prompt**
   ```
   You are an expert code reviewer. Analyze the code for:
   - Bugs and potential errors
   - Security vulnerabilities
   - Performance issues
   - Code style and best practices
   - Maintainability concerns

   Provide specific, actionable feedback.
   ```

4. **Execute Review**
   ```bash
   bun run Generate.ts \
     --model qwen2.5-coder:7b \
     --system "You are an expert code reviewer..." \
     --prompt "Review this code:\n\n${CODE}"
   ```

5. **Format Output**
   - Present findings clearly
   - Categorize: Critical, Important, Minor
   - Provide specific line numbers if possible
   - Suggest improvements

## Example Usage

### Basic Code Review
```
User: "Review this function locally"
Assistant: I'll review this using a local Ollama model for privacy.

[Reads code context]
[Calls Generate.ts with code and system prompt]
[Returns structured review]

Review complete! Found 2 issues:
- Critical: SQL injection vulnerability (line 45)
- Minor: Variable naming could be more descriptive (line 12)
```

### Multi-File Review
```
User: "Review these files with ollama"
Assistant: I'll review each file using qwen2.5-coder:7b

[Iterates through files]
[Reviews each with Generate.ts]
[Aggregates findings]

Summary across 3 files:
- 1 security issue
- 3 performance optimizations
- 5 style improvements
```

## Model Recommendations

**Best Performance**:
- **qwen2.5-coder:7b** - Best balance, understands 80+ languages
- **codellama:7b** - Strong code analysis
- **deepseek-coder:6.7b** - Excellent at finding bugs

**Faster (Lower Quality)**:
- **qwen2.5-coder:1.5b** - Very fast, decent quality
- **codellama:7b-python** - Specialized for Python

**Higher Quality (Slower)**:
- **qwen2.5-coder:14b** - More thorough analysis
- **codellama:13b** - Deeper understanding

## Customization

### Specialized Reviews

**Security Focus**:
```bash
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "You are a security auditor. Focus on vulnerabilities." \
  --prompt "${CODE}"
```

**Performance Focus**:
```bash
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "You are a performance expert. Find bottlenecks and inefficiencies." \
  --prompt "${CODE}"
```

**Style Focus**:
```bash
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "Review code style, naming, and maintainability." \
  --prompt "${CODE}"
```

## Output Format

Structure reviews clearly:

```markdown
## Code Review Summary

### Critical Issues
- [Issue 1]: Description and location
- [Issue 2]: Description and location

### Important Improvements
- [Item 1]: Suggestion with reasoning
- [Item 2]: Suggestion with reasoning

### Minor Suggestions
- [Item 1]: Optional improvement
- [Item 2]: Optional improvement

### Positive Aspects
- [Strength 1]: What was done well
- [Strength 2]: What was done well
```

## Performance Tips

1. **Batch Reviews**: Review multiple functions together for context
2. **Stream Output**: Enable streaming for immediate feedback
3. **Model Selection**: Use smaller models for quick feedback, larger for thorough analysis
4. **Focused Prompts**: Specify exact concerns to get targeted reviews
5. **Iterative**: Start broad, then deep-dive on specific concerns

## Privacy Benefits

- ✅ Code never leaves your machine
- ✅ No API logs or retention
- ✅ No rate limiting or costs
- ✅ Works offline
- ✅ Perfect for proprietary code

## Integration

Works seamlessly with:
- Git hooks (pre-commit reviews)
- CI/CD pipelines (local runners)
- IDE integrations
- Pull request workflows
