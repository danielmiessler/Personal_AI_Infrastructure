# Agent SDK Reference - TypeScript Documentation

## Overview

The TypeScript Agent SDK provides a comprehensive API for interacting with Claude Code programmatically. It enables developers to create autonomous agents, manage tool usage, configure permissions, and handle multi-turn conversations.

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

## Core Functions

### `query()`

The primary entry point for agent interactions. Creates an async generator that streams responses.

**Signature:**
```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query
```

Returns a `Query` object extending `AsyncGenerator<SDKMessage, void>` with methods for interrupting and modifying permission modes.

### `tool()`

Creates type-safe MCP tool definitions using Zod schemas for input validation.

```typescript
function tool<Schema extends ZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args, extra) => Promise<CallToolResult>
): SdkMcpToolDefinition<Schema>
```

### `createSdkMcpServer()`

Instantiates an in-process MCP server for tool management.

## Key Configuration Options

| Option | Type | Purpose |
|--------|------|---------|
| `model` | string | Claude model selection |
| `cwd` | string | Working directory |
| `allowedTools` | string[] | Permitted tool names |
| `permissionMode` | PermissionMode | 'default'\|'acceptEdits'\|'bypassPermissions'\|'plan' |
| `systemPrompt` | string\|object | Custom or preset instructions |
| `settingSources` | SettingSource[] | Load filesystem config: 'user'\|'project'\|'local' |
| `maxThinkingTokens` | number | Extended reasoning budget |
| `hooks` | HookCallbacks | Event listeners for lifecycle events |

## Message Types

The SDK returns union types representing conversation flow:

- **SDKAssistantMessage**: Model responses with tool calls
- **SDKUserMessage**: User inputs with optional UUID
- **SDKResultMessage**: Final outcomes with usage metrics
- **SDKSystemMessage**: Initialization details
- **SDKPartialAssistantMessage**: Streaming events (when enabled)

## Tool System

Built-in tools include file operations (Read, Write, Edit, Glob, Grep), shell execution (Bash, KillBash), web access (WebFetch, WebSearch), notebook editing, and MCP resource management.

Each tool has documented input schemas and output formats supporting structured data validation.

## Hooks & Events

Register callbacks for lifecycle events:
- PreToolUse / PostToolUse
- UserPromptSubmit
- SessionStart / SessionEnd
- Notifications
- Compaction boundaries

## Permission Management

Control tool access through:
- **PermissionMode**: Session-level authorization strategy
- **CanUseTool**: Custom permission functions
- **PermissionUpdate**: Dynamic rule modifications

## Settings Precedence

When using `settingSources`, configuration loads in this order (highest priority first):
1. Local settings (`.claude/settings.local.json`)
2. Project settings (`.claude/settings.json`)
3. User settings (`~/.claude/settings.json`)

Programmatic options override filesystem settings.

## Advanced Features

- **Subagents**: Delegate complex tasks via AgentDefinition
- **Extended Thinking**: Configure max thinking tokens for deeper reasoning
- **Streaming Input**: Async message iteration for continuous interaction
- **Session Management**: Resume conversations, fork sessions, compact history

The SDK provides comprehensive type safety through TypeScript interfaces and Zod schema validation for tool arguments.

## Additional Resources

- Source URL: https://docs.claude.com/en/api/agent-sdk/typescript
- Official Documentation: https://docs.claude.com
