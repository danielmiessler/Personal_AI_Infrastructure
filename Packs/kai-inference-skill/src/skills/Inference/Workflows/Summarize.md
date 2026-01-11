# Summarize Workflow

**Purpose**: Summarize documents, code, or conversations using local Ollama models.

**Best for**: Quick overviews, documentation generation, meeting notes, code understanding.

## Workflow Steps

1. **Detect Request**
   - User asks for local summarization
   - Triggers: "summarize locally", "ollama summarize", "summarize with local model"

2. **Select Model**
   - Default: `llama3.2:latest` (good at comprehension)
   - Alternative: `mistral:latest`, `qwen2.5-coder:7b` (for code)
   - Read from `OLLAMA_DEFAULT_MODEL` environment variable

3. **Prepare System Prompt**
   ```
   You are an expert at creating clear, concise summaries.
   Extract the key points and main ideas.
   Focus on what's most important and actionable.
   ```

4. **Execute Summarization**
   ```bash
   bun run Generate.ts \
     --model llama3.2:latest \
     --system "You are an expert at creating clear summaries..." \
     --prompt "Summarize this:\n\n${CONTENT}"
   ```

5. **Format Output**
   - Bullet points for key takeaways
   - Hierarchical structure for complex content
   - Optional: Different length summaries (brief, detailed)

## Example Usage

### Document Summarization
```
User: "Summarize this file with ollama"
Assistant: I'll create a local summary using llama3.2

[Reads file content]
[Calls Generate.ts with content]
[Returns structured summary]

Summary (852 words → 127 words):

Key Points:
- Main topic: Authentication system refactor
- Breaking changes: New token format
- Action required: Update clients by Jan 15
- Benefits: 3x faster, more secure
```

### Code Summarization
```
User: "Summarize what this module does locally"
Assistant: I'll analyze this code using qwen2.5-coder:7b

[Reads code]
[Uses code-specific model]
[Returns technical summary]

Module Summary:

Purpose: User authentication and session management
Key Components:
- login() - Validates credentials, issues JWT
- refresh() - Renews expired tokens
- logout() - Invalidates sessions
Dependencies: jsonwebtoken, bcrypt, redis
```

### Multi-Document Summary
```
User: "Summarize all markdown files in docs/"
Assistant: I'll summarize each document locally

[Iterates through files]
[Generates individual summaries]
[Creates aggregate overview]

Documentation Summary (15 files):

Getting Started (3 files):
- Installation guide covers 3 platforms
- Quick start in under 5 minutes
- Troubleshooting common issues

API Reference (8 files):
- REST endpoints for CRUD operations
- Authentication via JWT
- Rate limiting: 1000 req/hour

Advanced Topics (4 files):
- Deployment strategies
- Performance tuning
- Security best practices
```

## Summarization Types

### Brief Summary
```bash
bun run Generate.ts \
  --model llama3.2:latest \
  --system "Create a 1-2 sentence summary of the main point." \
  --prompt "${CONTENT}"
```

### Bullet Points
```bash
bun run Generate.ts \
  --model llama3.2:latest \
  --system "Extract 3-5 key points as bullet points." \
  --prompt "${CONTENT}"
```

### Detailed Summary
```bash
bun run Generate.ts \
  --model llama3.2:latest \
  --system "Create a comprehensive summary with sections and details." \
  --prompt "${CONTENT}"
```

### Technical Summary (Code)
```bash
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "Summarize this code: purpose, inputs, outputs, dependencies." \
  --prompt "${CODE}"
```

### Executive Summary
```bash
bun run Generate.ts \
  --model llama3.2:latest \
  --system "Create an executive summary focusing on business impact and actions needed." \
  --prompt "${CONTENT}"
```

## Model Recommendations

**General Text**:
- **llama3.2:latest** (8B) - Best balance
- **mistral:latest** (7B) - High quality
- **llama3.2:3b** - Faster, good enough

**Technical/Code**:
- **qwen2.5-coder:7b** - Best for code
- **codellama:7b** - Good alternative

**Long Documents**:
- **mistral:latest** - Large context window
- **llama3.2:latest** - Good comprehension

## Output Formats

### Standard Format
```markdown
## Summary

**Main Topic**: [One sentence]

**Key Points**:
- Point 1
- Point 2
- Point 3

**Conclusion**: [Final takeaway]
```

### Hierarchical Format
```markdown
## Summary

### Overview
[High-level description]

### Main Sections
1. **Section 1**: Summary
2. **Section 2**: Summary
3. **Section 3**: Summary

### Action Items
- Action 1
- Action 2
```

### Comparison Format
```markdown
## Summary

**Before**: [Old state]
**After**: [New state]
**Changes**: [What changed]
**Impact**: [Effect of changes]
```

## Advanced Techniques

### Chunked Summarization (Large Files)
```bash
# Split large document into chunks
# Summarize each chunk
# Combine summaries into final overview

for chunk in chunks; do
  bun run Generate.ts --prompt "Summarize: ${chunk}"
done
```

### Progressive Summarization
```bash
# First pass: Extract key points
# Second pass: Condense key points
# Third pass: Final polish

summary1=$(bun run Generate.ts --prompt "${content}")
summary2=$(bun run Generate.ts --prompt "Condense: ${summary1}")
summary3=$(bun run Generate.ts --prompt "Polish: ${summary2}")
```

### Multi-Language Summary
```bash
# Summarize in original language, then translate
bun run Generate.ts \
  --prompt "Summarize in English:\n\n${spanish_content}"
```

## Performance Tips

1. **Model Selection**: Use 3B models for speed, 8B+ for quality
2. **Prompt Engineering**: Be specific about length and format
3. **Streaming**: Watch summary build in real-time
4. **Batch Processing**: Summarize multiple docs in parallel
5. **Context Window**: Split very large documents

## Use Cases

### Development
- PR descriptions from diffs
- Code module documentation
- Commit message generation
- API endpoint summaries

### Documentation
- README generation
- Changelog summaries
- Tutorial overviews
- Architecture summaries

### Research
- Paper abstracts
- Article highlights
- Note condensation
- Literature reviews

### Business
- Meeting notes
- Email threads
- Report summaries
- Decision records

## Integration with PAI

**History System**:
```bash
# Summarize recent sessions
bun run Generate.ts \
  --prompt "Summarize these work sessions: ${history}"
```

**Learning Capture**:
```bash
# Create learning summaries
bun run Generate.ts \
  --system "Extract key learnings and insights" \
  --prompt "${session_transcript}"
```

**Documentation**:
```bash
# Auto-generate docs from code
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --system "Create user documentation" \
  --prompt "${code_and_comments}"
```

## Quality Tips

1. **Clear Instructions**: Specify desired length and format
2. **Context Matters**: Provide enough context for accurate summary
3. **Iterate**: Refine prompts based on output quality
4. **Verify**: Check summaries for accuracy
5. **Format Consistency**: Use templates for predictable output
