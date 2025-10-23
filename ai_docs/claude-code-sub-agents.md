# Claude Code Sub-agents

## Overview

Subagents are specialized AI assistants in Claude Code designed to handle task-specific workflows. Each operates with its own context window, custom system prompt, and configurable tool access.

## Key Features

**Context Preservation**: Subagents maintain separate context from main conversations, preventing context pollution.

**Specialized Expertise**: Each can be fine-tuned with domain-specific instructions for improved task performance.

**Reusability**: Once created, subagents work across projects and enable team collaboration.

**Flexible Permissions**: Individual tool access control per subagent.

## Quick Start

1. Run `/agents` command
2. Select "Create New Agent"
3. Choose project-level or user-level scope
4. Define the subagent (recommended: generate with Claude first, then customize)
5. Select tools and save

## Configuration Structure

Subagents use Markdown files with YAML frontmatter:

```yaml
---
name: subagent-name
description: When this subagent should be invoked
tools: tool1, tool2, tool3
model: sonnet
---

System prompt content describing role and behavior
```

## Storage Locations

- **Project-level**: `.claude/agents/` (highest priority)
- **User-level**: `~/.claude/agents/` (available across projects)
- **Plugin agents**: Via plugin manifest configuration

## Configuration Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Unique lowercase identifier |
| `description` | Yes | Natural language purpose statement |
| `tools` | No | Comma-separated tool list (inherits all if omitted) |
| `model` | No | Model alias or `'inherit'` for main conversation model |

## Usage Methods

**Automatic Delegation**: Claude recognizes matching tasks based on descriptions.

**Explicit Invocation**: "Use the code-reviewer subagent to check my recent changes"

## Example Subagents

**Code Reviewer**: Analyzes code quality, security, and maintainability after modifications.

**Debugger**: Specializes in root cause analysis for errors and test failures.

**Data Scientist**: Handles SQL queries and data analysis tasks.

## Best Practices

- Start with Claude-generated templates, then customize
- Design focused subagents with single responsibilities
- Write detailed system prompts with examples
- Limit tool access to necessary permissions only
- Version control project subagents for team collaboration

## Advanced Capabilities

**Chaining**: Sequence multiple subagents for complex workflows.

**Dynamic Selection**: Claude intelligently chooses appropriate subagents based on task context.

## Performance Considerations

Subagents preserve main conversation context but may add latency as they gather task-specific context initially.
