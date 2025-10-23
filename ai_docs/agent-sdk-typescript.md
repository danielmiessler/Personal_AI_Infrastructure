# Agent SDK Reference - TypeScript

## Overview

The TypeScript Agent SDK provides programmatic access to Claude Code functionality, enabling integration of AI capabilities into applications through a structured API.

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

## Core Functions

### `query()`

The main entry point for interacting with Claude. Returns an async generator streaming messages.

**Parameters:**
- `prompt`: String or async iterable of user messages
- `options`: Optional configuration object

**Key Options:**
- `model`: Claude model selection
- `cwd`: Working directory
- `allowedTools`/`disallowedTools`: Tool access control
- `mcpServers`: Model Context Protocol configurations
- `permissionMode`: Controls permission behavior ('default', 'acceptEdits', 'bypassPermissions', 'plan')
- `systemPrompt`: Custom or preset system instructions
- `settingSources`: Filesystem settings to load ('user', 'project', 'local')

### `tool()`

Creates type-safe MCP tool definitions using Zod schemas. Accepts name, description, input schema, and async handler function.

### `createSdkMcpServer()`

Instantiates an in-process MCP server with tools for local execution.

## Message Types

The SDK streams various message types:

- **SDKAssistantMessage**: AI responses with UUID and session tracking
- **SDKUserMessage**: User inputs
- **SDKResultMessage**: Final execution results with cost/usage data
- **SDKSystemMessage**: System initialization and status
- **SDKPartialAssistantMessage**: Streaming events (optional)
- **SDKCompactBoundaryMessage**: Conversation compaction markers

## Tools

Built-in tools include file operations (Read, Write, Edit, Glob, Grep), shell execution (Bash), web capabilities (WebFetch, WebSearch), notebook editing, and MCP resource access.

## Permission System

Configure via `canUseTool` function or `permissionMode` setting. Results specify allow/deny with optional input modifications and permission updates.

## Hooks

Event-based system supporting PreToolUse, PostToolUse, SessionStart, SessionEnd, and other lifecycle events with async/sync callbacks.

## Settings Management

The `settingSources` option controls loading from `.claude/settings.json` (project), `~/.claude/settings.json` (user), or `.claude/settings.local.json` (local). Defaults to empty array for SDK isolation.
