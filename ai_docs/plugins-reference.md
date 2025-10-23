# Claude Code Plugins Reference

## Overview

This technical reference covers Claude Code's plugin system, which enables developers to extend Claude's capabilities through five component types: commands, agents, skills, hooks, and MCP servers.

## Plugin Components

### Commands

Custom slash commands integrated into Claude Code's command system. Located in the `commands/` directory as markdown files with frontmatter, these enable users to invoke specialized functionality.

### Agents

Specialized subagents for specific tasks that Claude can invoke automatically. Stored in `agents/` directory, these markdown files describe agent capabilities and expertise areas.

### Skills

Agent Skills extend Claude's autonomous capabilities. Located in `skills/` directories, each skill contains a `SKILL.md` file with optional supporting documentation and scripts.

### Hooks

Event handlers responding to Claude Code activities automatically. Configure via `hooks/hooks.json` or inline in `plugin.json`. Available events include:

- PreToolUse
- PostToolUse
- UserPromptSubmit
- Notification
- Stop
- SubagentStop
- SessionStart
- SessionEnd
- PreCompact

### MCP Servers

Model Context Protocol servers connecting Claude to external tools. Defined in `.mcp.json` or inline, these integrate seamlessly with Claude's existing toolkit.

## Plugin Manifest Schema

### Required Fields

- **name**: Unique identifier in kebab-case

### Metadata Fields

- **version**: Semantic versioning format
- **description**: Plugin purpose explanation
- **author**: Name, email, URL information
- **homepage**: Documentation URL
- **repository**: Source code location
- **license**: MIT, Apache-2.0, etc.
- **keywords**: Discovery tags array

### Component Path Fields

- **commands**: Custom command file or directory paths
- **agents**: Agent file locations
- **hooks**: Hook configuration path or inline object
- **mcpServers**: MCP configuration path or inline object

## Directory Structure

Standard plugin layout requires:

```
plugin-name/
├── .claude-plugin/plugin.json
├── commands/
├── agents/
├── skills/
├── hooks/
├── .mcp.json
├── scripts/
└── LICENSE
```

**Critical**: Component directories must exist at plugin root, not inside `.claude-plugin/`.

## Path Behavior Rules

Custom paths supplement rather than replace default directories. If `commands/` exists, it's loaded in addition to custom command paths. All paths require relative notation starting with `./`.

## Environment Variables

`${CLAUDE_PLUGIN_ROOT}` provides absolute plugin directory paths, ensuring correct script and server configurations regardless of installation location.

## Debugging

Use `claude --debug` to display:

- Plugin loading details
- Manifest validation results
- Component registration status
- MCP initialization information

## Common Issues and Solutions

| Issue | Cause | Resolution |
|-------|-------|-----------|
| Plugin not loading | Invalid plugin.json | Validate JSON syntax |
| Commands missing | Wrong directory structure | Ensure commands/ at root |
| Hooks not firing | Script not executable | Run chmod +x |
| MCP server fails | Missing environment variable | Use ${CLAUDE_PLUGIN_ROOT} |
| Path errors | Absolute paths used | Convert to relative paths |

## Version Management

Follow semantic versioning for plugin releases to maintain compatibility and clarity across versions.
