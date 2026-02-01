# PAI Pack Conversion Guide for OpenCode

> **How to adapt PAI packs from Claude Code to OpenCode**

This guide explains how to convert existing PAI packs designed for Claude Code to work with OpenCode's MCP (Model Context Protocol) server architecture.

---

## 🔍 Understanding the Difference

### Claude Code Architecture
- **Hook System**: Scripts triggered by events (SessionStart, PreToolUse, PostToolUse)
- **Synchronous**: Hooks run inline with AI operations
- **settings.json**: Hook registration in `~/.claude/settings.json`

### OpenCode Architecture
- **MCP Servers**: Standalone processes providing capabilities
- **Asynchronous**: Servers run independently
- **.opencode.json**: Server registration in `~/.opencode.json`

---

## 📋 Conversion Checklist

When converting a pack, check:

- [ ] Does this pack use hooks? → Need MCP server
- [ ] Does this pack use SessionStart? → Load via context
- [ ] Does this pack use PreToolUse/PostToolUse? → Adapt or skip
- [ ] Does this pack have CLIs/tools? → Works as-is
- [ ] Does this pack have skills/workflows? → Works as-is

---

## 🛠️ Conversion Patterns

### Pattern 1: SessionStart Hook → Context Loading

**Claude Code (Hook):**
```typescript
// hooks/load-core-context.ts
import { readFileSync } from 'fs';

const skillPath = `${process.env.PAI_DIR}/skills/CORE/SKILL.md`;
const skillContent = readFileSync(skillPath, 'utf-8');

// Inject into session via stdout
console.log(skillContent);
```

**OpenCode (MCP Server):**
```typescript
// mcp-servers/context-server.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.opencode', 'pai');
const SKILL_PATH = join(PAI_DIR, 'skills', 'CORE', 'SKILL.md');

process.stdin.on('data', (data) => {
  const request = JSON.parse(data.toString());

  if (request.method === 'initialize') {
    let skillContent = '';
    if (existsSync(SKILL_PATH)) {
      skillContent = readFileSync(SKILL_PATH, 'utf-8');
    }

    const response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        context: skillContent
      }
    };

    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

process.stdin.resume();
```

**Config:**
```json
{
  "mcpServers": {
    "pai-context": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/mcp-servers/context-server.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai"
      }
    }
  }
}
```

---

### Pattern 2: PreToolUse/PostToolUse → Not Directly Supported

**Claude Code uses these hooks for:**
- Security validation (blocking dangerous commands)
- Logging tool usage
- Modifying command inputs/outputs

**OpenCode approach:**
1. **Security**: OpenCode has built-in security - no hook needed
2. **Logging**: Create an MCP server that monitors OpenCode's SQLite DB
3. **Modification**: Not supported - OpenCode doesn't allow command interception

**Example - History Logging:**

```typescript
// mcp-servers/history-logger.ts
import Database from 'bun:sqlite';
import { join } from 'path';
import { watch } from 'fs';

const OPENCODE_DB = join(process.env.HOME || '', '.opencode', 'conversations.db');
const HISTORY_DIR = join(process.env.PAI_DIR || '', 'history');

// Watch OpenCode's database for changes
const db = new Database(OPENCODE_DB);

// Query recent tool uses
setInterval(() => {
  const tools = db.query(`
    SELECT tool_name, args, timestamp
    FROM tool_uses
    WHERE timestamp > datetime('now', '-1 minute')
  `).all();

  // Log to PAI history
  for (const tool of tools) {
    const logEntry = {
      timestamp: tool.timestamp,
      tool: tool.tool_name,
      args: tool.args
    };
    // Write to history file
    // ... logging logic
  }
}, 5000);
```

---

### Pattern 3: Voice System → MCP Wrapper

**Claude Code (Hook + Server):**
```typescript
// hooks/session-start-voice.ts
// Triggers voice server on session start

// voice/server.ts
// Standalone TTS server
```

**OpenCode (MCP Server):**
```typescript
// mcp-servers/voice-server.ts
import { exec } from 'child_process';

// MCP server that provides TTS as a tool
process.stdin.on('data', (data) => {
  const request = JSON.parse(data.toString());

  if (request.method === 'tools/call' && request.params.name === 'speak') {
    const text = request.params.arguments.text;

    // Call ElevenLabs or other TTS
    exec(`curl -X POST https://api.elevenlabs.io/v1/text-to-speech/...`,
      (error, stdout, stderr) => {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: { success: !error }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    );
  }
});
```

---

### Pattern 4: Skills/Workflows → No Changes Needed

Skills and workflows work identically in both systems. The markdown files are loaded by the AI.

**Works as-is:**
- `skills/CORE/SKILL.md`
- `skills/CORE/workflows/*.md`
- `skills/CORE/tools/*`

Just ensure they're in the PAI directory that OpenCode can access.

---

## 🔧 Example: Converting pai-history-system

### Original (Claude Code)

**Structure:**
```
pai-history-system/
├── hooks/
│   ├── capture-session-summary.ts
│   ├── capture-tool-output.ts
│   └── initialize-session.ts
└── hooks/lib/
    └── history-lib.ts
```

**settings.json:**
```json
{
  "hooks": {
    "SessionStart": ["hooks/initialize-session.ts"],
    "PostToolUse": ["hooks/capture-tool-output.ts"]
  }
}
```

### Converted (OpenCode)

**Structure:**
```
mcp-servers/
├── history-server.ts      # Single MCP server
└── lib/
    └── history-lib.ts     # Shared library (no changes)
```

**Server:**
```typescript
// mcp-servers/history-server.ts
import Database from 'bun:sqlite';
import { join } from 'path';
import { writeHistory } from './lib/history-lib';

const OPENCODE_DB = join(process.env.HOME || '', '.opencode', 'conversations.db');

// Monitor OpenCode's conversation database
const db = new Database(OPENCODE_DB);

// MCP initialization
process.stdin.on('data', (data) => {
  const request = JSON.parse(data.toString());

  if (request.method === 'initialize') {
    // Start monitoring
    startHistoryCapture();

    const response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        capabilities: ['history-tracking']
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

function startHistoryCapture() {
  // Poll database for new conversations
  setInterval(() => {
    const recentConversations = db.query(`
      SELECT * FROM messages
      WHERE created_at > datetime('now', '-1 minute')
    `).all();

    // Process and save to PAI history
    for (const msg of recentConversations) {
      writeHistory(msg);
    }
  }, 60000); // Every minute
}

process.stdin.resume();
```

**.opencode.json:**
```json
{
  "mcpServers": {
    "pai-history": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/mcp-servers/history-server.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai"
      }
    }
  }
}
```

---

## ✅ Validation Checklist

After converting a pack:

- [ ] MCP server starts without errors
- [ ] Server responds to initialization request
- [ ] Environment variables are passed correctly
- [ ] Logs show expected behavior
- [ ] OpenCode loads the server on startup
- [ ] Skills/workflows still work
- [ ] Cross-platform compatibility (Windows, Linux, macOS)

---

## 🐛 Debugging Tips

### Server won't start

```bash
# Test server manually
cd ~/.opencode/pai/mcp-servers
bun run context-server.ts

# Should wait for stdin, not crash
```

### Server starts but doesn't respond

```typescript
// Add debug logging
process.stdin.on('data', (data) => {
  console.error('[DEBUG] Received:', data.toString());
  // ... rest of handler
});
```

### Environment variables not working

Check `.opencode.json` uses correct path format:
- Linux/macOS: `${HOME}/.opencode/pai`
- Windows: Can use `${HOME}` (Bun resolves to `%USERPROFILE%`)

---

## 📚 Resources

- [OpenCode MCP Documentation](https://opencode.ai/docs/agents/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Original PAI Packs](../Packs/)

---

## 🤝 Contributing Conversions

Converted a pack to OpenCode? Share it!

1. Create `{pack-name}-opencode.md` variant
2. Document differences from original
3. Submit PR to PAI repository
4. Help expand OpenCode support

---

**Questions?** Open an issue in the PAI repository with `[OpenCode]` tag.
