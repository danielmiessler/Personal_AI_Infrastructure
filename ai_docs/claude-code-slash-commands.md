# Claude Code Slash Commands

## Overview

Slash commands in Claude Code allow you to control Claude's behavior during interactive sessions. They provide quick access to various functions and can be customized to fit your workflow.

## Built-in Commands

Claude Code includes 20+ built-in commands for essential functions:

### Session Management
- `/clear` - Clear conversation history
- `/rewind` - Rewind conversation to a previous state
- `/compact` - Compact conversation with optional instructions

### Configuration
- `/config` - Open Settings interface
- `/status` - Show version and connectivity information
- `/settings` - Access settings configuration
- `/permissions` - View and update permissions

### Authentication
- `/login` - Authenticate with your Claude account
- `/logout` - Sign out of your account
- `/mcp` - Manage Model Context Protocol connections

### Information
- `/help` - Get usage help and command information
- `/cost` - Show token usage statistics
- `/usage` - Display usage information
- `/doctor` - Run diagnostics and health checks

### Project Management
- `/add-dir` - Add working directories to your project
- `/init` - Initialize project with setup guide
- `/model` - Select or change the AI model

### Advanced Features
- `/sandbox` - Enable sandboxed bash execution
- `/vim` - Enable vim mode
- `/terminal-setup` - Configure terminal integration

## Custom Slash Commands

You can create personalized commands stored as Markdown files in two locations:

- **Project-level commands**: `.claude/commands/` - Shared with your team
- **Personal commands**: `~/.claude/commands/` - Work across all your projects

### Key Features

#### Arguments
Commands support dynamic values using:
- `$ARGUMENTS` - All arguments passed to the command
- `$1`, `$2`, etc. - Positional arguments

#### Bash Execution
Prefix commands with `!` to execute shell scripts before running. The output gets included in the context.

#### File References
Use the `@` prefix to include file contents in your command.

#### Frontmatter Metadata
Define metadata at the top of your command files:
- `allowed-tools` - Specify which tools Claude can use
- `description` - Describe what the command does
- `model` - Specify the model to use
- Argument hints and other configuration options

#### Namespacing
Organize commands in subdirectories for better structure and organization.

### Example Custom Command

```markdown
---
description: Run tests for a specific module
allowed-tools: [Bash, Read]
---

Run the test suite for the $1 module and analyze the results.

!npm test -- $1

@test-results.log
```

## Plugin Commands

Plugins can provide custom slash commands with the format `/plugin-name:command-name`. These commands are automatically integrated once the plugin is installed.

### Plugin Command Features
- Follow the same structure as custom commands
- Use namespacing to avoid conflicts
- Distributed through plugin marketplaces
- Support all custom command features (arguments, bash execution, file references)

## MCP Slash Commands

Model Context Protocol (MCP) servers expose prompts as commands following the pattern:

```
/mcp__<server-name>__<prompt-name>
```

### MCP Command Features
- Dynamically discovered from connected servers
- Support arguments defined by the server
- Automatically integrated when MCP servers are connected
- Follow MCP protocol specifications

## SlashCommand Tool

Claude can programmatically execute custom commands via the `SlashCommand` tool.

### Tool Capabilities
- Includes command descriptions in context (up to 15,000 character budget by default)
- Supports exact match and prefix permission rules
- Can be disabled entirely or per-command via frontmatter
- Allows Claude to invoke commands autonomously when appropriate

### Permission Rules
Commands can be controlled with permission patterns:
- **Exact match**: Allow specific commands by name
- **Prefix match**: Allow commands by prefix pattern
- **Frontmatter control**: Disable tool access per command

## Skills vs. Slash Commands

Choose the right tool for your use case:

### Use Slash Commands When
- You need quick, frequently-used prompts
- The functionality fits in a single file
- You want simple, immediate execution
- The command is straightforward and doesn't require complex setup

### Use Agent Skills When
- You need complex capabilities spanning multiple files
- You want organized resources and documentation
- You require standardized team workflows
- The functionality needs structured guidance and examples

## Best Practices

1. **Organize commands logically** - Use subdirectories for namespacing
2. **Write clear descriptions** - Help Claude understand when to use each command
3. **Use appropriate locations** - Project commands for team sharing, personal commands for individual preferences
4. **Leverage arguments** - Make commands flexible with parameters
5. **Include examples** - Document usage patterns in command descriptions
6. **Test bash execution** - Ensure shell scripts work as expected
7. **Set appropriate permissions** - Control when Claude can invoke commands automatically

## Troubleshooting

- Use `/doctor` to diagnose issues with commands
- Check `/status` for connectivity and configuration problems
- Review `/permissions` to ensure proper access control
- Use `/help` for command syntax and usage information

---

Source: https://docs.claude.com/en/docs/claude-code/slash-commands
