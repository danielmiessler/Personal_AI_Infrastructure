# Subagents in Claude Code

## Overview

Subagents are specialized AI assistants that Claude Code can delegate to for handling specific tasks. Each subagent:

- Has a specific purpose and expertise area
- Uses its own context window separate from the main conversation
- Can be configured with specific tools it's allowed to use
- Includes a custom system prompt that guides its behavior

## Key Advantages

The platform offers four main benefits:

1. **Context preservation** - Separate context windows prevent the main conversation from becoming cluttered
2. **Specialized expertise** - Custom instructions enable domain-specific proficiency
3. **Reusability** - Once created, subagents work across projects and teams
4. **Flexible permissions** - Tool access can be granularly controlled per subagent

## Getting Started

Users launch the subagents interface by entering `/agents`. From there, they can:

- Create project-level or user-level agents
- Define their purpose with detailed descriptions
- Select authorized tools
- Save configurations

## Configuration Storage

Subagents are stored as Markdown files with YAML frontmatter in two locations:

- `.claude/agents/` (project-level, highest priority)
- `~/.claude/agents/` (user-level, lower priority)

Required configuration fields include:

- name
- description
- optionally tools and model specifications

## Practical Application

Claude Code automatically delegates work based on task descriptions matching subagent expertise, or users can request specific subagents explicitly:

```
"Use the test-runner subagent to fix failing tests."
```

The documentation provides example subagent templates for:

- Code review
- Debugging
- Data science tasks

**Best Practice**: Focused designs with detailed prompts yield better results.
