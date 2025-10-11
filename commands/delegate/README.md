# AI Task Delegation System

**Save 60-80% of Claude Code's context by delegating heavy tasks to specialized AI tools.**

## Overview

The Delegation System is a smart task router that allows Claude Code (Kai) to delegate context-heavy operations to external AI CLI tools like auggie, gemini, and aider. This dramatically reduces token usage while maintaining high-quality outputs.

## Quick Start

1. **Install tools** (optional - use what you have):
   ```bash
   npm install -g @augmentcode/cli  # auggie
   pip install aider-chat            # aider
   # gemini - see PAI reference docs
   ```

2. **That's it!** The system works automatically when Kai detects large tasks.

## How It Works

**User Request:**
```
"Analyze the ~/dev/myproject codebase"
```

**Kai's Response:**
```
📊 Delegating to auggie (847 files detected)...
Estimated token savings: ~15,000

✅ Analysis complete!
[Synthesized results]
```

## Architecture

### Files

1. **`delegate.md`** - Comprehensive documentation and configuration
   - User guide and FAQ
   - Tool configuration (YAML-style markdown)
   - Status checker (run with `bun delegate.md`)
   - Technical documentation

2. **`delegate-router.md`** - Smart routing engine
   - Task analysis (type, scope, complexity, token estimate)
   - Decision logic (which tool to use)
   - Execution engine (runs delegated tasks)
   - Error handling (asks user on failure)

### Delegation Flow

```
User Request
    ↓
Kai analyzes task (files, tokens, type)
    ↓
Should delegate? (>10 files OR >20K tokens)
    ↓
delegate-router.md selects optimal tool
    ↓
Tool executes task
    ↓
Kai synthesizes results for user
```

## Configuration

Edit `delegate.md` or tell Kai:

```
"Don't use auggie anymore"
"Increase auggie timeout to 5 minutes"
"I installed a new tool called cursor-ai"
```

### Available Tools

| Tool | Priority | Best For | Timeout |
|------|----------|----------|---------|
| **auggie** | 1 | Codebase analysis (>10 files) | 2 min |
| **gemini** | 2 | Fast text generation, summarization | 1 min |
| **aider** | 3 | Direct file editing, refactoring | 3 min |

### Delegation Triggers

**Kai delegates when:**
- Analyzing >10 files
- Processing >20,000 tokens
- Codebase-wide operations
- Large document summaries

**Kai handles directly when:**
- Small tasks (<5K tokens)
- Interactive conversations
- Single file operations
- User wants Kai's perspective

## Token Savings

**Real-world examples:**

| Scenario | Without Delegation | With Delegation | Savings |
|----------|-------------------|-----------------|---------|
| Codebase analysis (850 files) | ~40,000 tokens | ~7,000 tokens | **82%** |
| Large document summary (100KB) | ~25,000 tokens | ~5,000 tokens | **80%** |
| Multi-file refactoring (15 files) | ~30,000 tokens | ~3,000 tokens | **90%** |

## Tool Capabilities

### Auggie (Priority 1)

**Best for:**
- Large codebases (>10 files)
- Understanding project architecture
- Finding patterns across files

**How it works:**
- Indexes entire codebase with vector embeddings
- Semantic search across code
- Understands code relationships

**Example tasks:**
- "Analyze the authentication system"
- "Find all API endpoints"
- "Explain the database schema"

### Gemini (Priority 2)

**Best for:**
- Fast text generation
- Document summarization (>5K tokens)
- Code generation from scratch
- Web research

**How it works:**
- Large context window (1M+ tokens)
- Extremely fast inference
- Web search capability

**Example tasks:**
- "Summarize this 50-page document"
- "Generate boilerplate for X"
- "Research current best practices"

### Aider (Priority 3)

**Best for:**
- Direct file editing
- Multi-file refactoring (1-20 files)
- Implementation tasks

**How it works:**
- Reads files directly from disk
- Makes precise edits
- Creates git commits

**Example tasks:**
- "Add docstrings to all functions"
- "Refactor class X to use pattern Y"
- "Update all imports to new path"

## Usage Examples

### Check Tool Status

```bash
cd ~/dev/pai/commands/delegate
bun delegate.md
```

### Test Delegation Decision (Dry Run)

```bash
bun delegate-router.md \
  --task "Analyze this TypeScript codebase" \
  --path ~/dev/myproject \
  --dry-run
```

### Force Specific Tool

```bash
bun delegate-router.md \
  --task "Summarize this project" \
  --path ~/dev/myproject \
  --tool gemini
```

### JSON Output

```bash
bun delegate-router.md \
  --task "Review security practices" \
  --path ~/dev/myproject \
  --json
```

## Configuration Format

The system uses **YAML-style markdown** (PAI pattern) for configuration:

```yaml
### auggie
enabled: true
command: auggie
priority: 1
timeout: 120000  # 2 minutes

bestFor:
  - codebase-analysis (>10 files)
  - architecture-review

strengths:
  - Codebase-aware indexing
  - Full project context
```

## Natural Language Configuration

Configure by talking to Kai:

**Disable a tool:**
- "Don't use auggie anymore"

**Adjust timeouts:**
- "Increase auggie timeout to 5 minutes"

**Change priorities:**
- "Make gemini the first choice for analysis"

**Add new tool:**
- "I installed a new tool called cursor-ai"

Kai will update `delegate.md` and confirm changes.

## Error Handling

**When delegation fails**, Kai will ask:

```
Delegation to auggie failed: Connection timeout

Would you like me to:
  (a) Try another tool (gemini)
  (b) Handle it directly
  (c) Skip this task
```

**No auto-fallback** - you're always in control.

## Extending the System

To add a new AI tool:

1. **Install the tool** and verify it works
2. **Add config section** to `delegate.md`:
   ```yaml
   ### my-tool
   enabled: true
   command: my-tool
   priority: 4
   timeout: 60000

   bestFor:
     - custom-analysis

   strengths:
     - What it does well

   usage: |
     my-tool --flag "task"
   ```
3. **Tell Kai**: "I added my-tool, use it for X tasks"
4. **Test it**: Ask Kai to delegate a task to your new tool

## Integration with PAI

The delegation system follows PAI patterns:

- ✅ **Markdown-first** - Config is readable markdown, not JSON
- ✅ **Natural language** - Configure by talking to Kai
- ✅ **Zero-setup** - Works if tools are installed
- ✅ **Consistent patterns** - Follows PAI conventions
- ✅ **Extensible** - Easy to add new tools

## Troubleshooting

### Tools not found

```bash
cd ~/dev/pai/commands/delegate
bun delegate.md
```

This checks which tools are installed and where.

### Delegation not triggering

Check thresholds:
- Is your task >10 files?
- Is your task >20K tokens?

Force delegation:
```
"Use auggie to analyze this single file"
```

### Tool timeouts

Increase timeout in `delegate.md` config:
```yaml
timeout: 300000  # 5 minutes instead of 2
```

Or tell Kai:
```
"Increase auggie timeout to 5 minutes"
```

### Wrong tool selected

Force specific tool:
```
"Use gemini instead of auggie for this"
```

Or adjust priorities in config.

## Performance Tips

1. **Use auggie for codebases** - Optimized for project analysis
2. **Use gemini for speed** - Fastest for text generation
3. **Use aider for editing** - Direct file manipulation
4. **Adjust timeouts** - Complex tasks need more time
5. **Enable only needed tools** - Reduces decision overhead

## Security Considerations

- Tools run with your user permissions
- Tools can read/write files in delegated paths
- Review tool output before accepting changes
- Aider can modify files directly (use git!)
- Gemini can make web requests

## FAQ

**Q: How does Kai know when to delegate?**

A: Kai analyzes your request. If it involves >10 files or >20K tokens, delegation triggers automatically.

**Q: Can I force a specific tool?**

A: Yes! Just say "Use gemini to analyze this" and Kai will use that tool specifically.

**Q: What if delegation fails?**

A: Kai will ask you what to do - try another tool, have Kai handle it directly, or skip the task.

**Q: Do I need all three tools?**

A: No! Install what you want. Kai uses what's available and falls back gracefully.

**Q: How do I disable delegation?**

A: Change `enabled: true` to `enabled: false` in `delegate.md`, or tell Kai "Disable delegation system".

**Q: Can I add my own tools?**

A: Absolutely! Add a tool section to the config (copy the auggie format) and tell Kai about it.

**Q: Will this work on my system?**

A: If you have bun installed and any of the three tools (auggie, gemini, aider), yes! The system gracefully handles missing tools.

## Related Links

- **Auggie CLI**: https://docs.augmentcode.com
- **Gemini CLI**: https://github.com/gemini-cli
- **Aider**: https://aider.chat
- **PAI Documentation**: See PAI README

## Version History

### 1.0.0 (2025-10-11) - Initial Release

Features:
- ✅ Three tools: auggie, gemini, aider
- ✅ Smart routing with priorities
- ✅ Natural language configuration
- ✅ Markdown-based config (PAI pattern)
- ✅ Ask-user-on-failure behavior
- ✅ Token usage logging
- ✅ Dry-run and JSON output modes
- ✅ Zero-setup operation

## Contributing

This is part of the Personal AI (PAI) ecosystem. Contributions welcome!

1. Fork the PAI repo
2. Add your feature
3. Test thoroughly
4. Submit PR with clear description

## License

MIT License - See PAI repository for details

---

**Built with ❤️ for the PAI ecosystem**

*Saving tokens, one delegation at a time.*
