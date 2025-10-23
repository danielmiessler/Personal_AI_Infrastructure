# Claude Code Slash Commands

## Overview

Slash commands are instructions that control Claude's behavior during interactive sessions. They provide a powerful way to customize workflows, execute common tasks, and extend functionality.

## Built-in Commands

Claude Code includes over 20 built-in slash commands for common operations:

### Core Commands

- `/clear` - Clear conversation history
- `/compact` - Compress conversation with optional focus
- `/config` - Access settings interface
- `/cost` - Display token usage statistics
- `/help` - Get usage information
- `/model` - Change the AI model
- `/rewind` - Revert conversation state
- `/sandbox` - Enable isolated bash execution

## Custom Slash Commands

Users can create personalized commands as Markdown files stored in two locations:

### Storage Locations

**Project-level**: `.claude/commands/` (shared with team)
**User-level**: `~/.claude/commands/` (personal across projects)

### Features

#### Arguments

Use `$ARGUMENTS` for all parameters or `$1`, `$2` for individual positional arguments

Example:
```markdown
Process the following: $ARGUMENTS
```

Or for individual arguments:
```markdown
Compare $1 with $2
```

#### Bash Execution

Prefix commands with `!` to run shell operations before the command executes

Example:
```markdown
!ls -la
Show me the files listed above
```

#### File References

Use `@` prefix to include file contents

Example:
```markdown
Review the code in @src/main.js
```

#### Frontmatter Metadata

Define command metadata using YAML frontmatter:

- `allowed-tools` - Specify which tools the command can use
- `description` - Describe what the command does
- `model` - Set which AI model to use
- `argument-hint` - Provide hints for command arguments

Example:
```markdown
---
description: "Analyze code quality"
allowed-tools: ["Read", "Edit"]
model: "claude-sonnet-4"
argument-hint: "<file-path>"
---

Analyze the code quality in $1
```

## Plugin & MCP Commands

### Plugin Commands

Plugin commands use the format `/plugin-name:command-name` and are automatically discovered from installed plugins.

### MCP Commands

MCP servers expose prompts as commands following the pattern `/mcp__<server-name>__<prompt-name>`.

## SlashCommand Tool

Claude can programmatically execute custom slash commands during conversations. This tool includes a 15,000-character default budget limiting visible commands to prevent token overflow.

## Skills vs. Slash Commands

### When to Use Slash Commands

- Quick, frequently-used prompts in single files
- Simple operations that don't require multiple steps
- Commands that can be invoked with a single line

### When to Use Skills

- Complex multi-file workflows
- Organized reference materials
- Multi-step processes requiring coordination

Both approaches can coexist within projects, allowing you to choose the right tool for each task.

## Best Practices

1. **Keep commands focused** - Each command should do one thing well
2. **Use descriptive names** - Make command names clear and intuitive
3. **Document arguments** - Use `argument-hint` to help users understand what to pass
4. **Organize by context** - Use project-level commands for team workflows, user-level for personal preferences
5. **Leverage metadata** - Use frontmatter to control behavior and provide context
