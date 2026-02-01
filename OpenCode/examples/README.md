# OpenCode MCP Server Examples

Example MCP servers demonstrating how to adapt PAI functionality for OpenCode.

---

## Available Examples

### 1. History Server (`history-server-example.ts`)

**Purpose:** Tracks conversation history by monitoring OpenCode's SQLite database.

**What it demonstrates:**
- Database polling pattern
- MCP protocol implementation
- File-based history storage
- Cross-platform path handling

**Usage:**

1. Update `.opencode.json`:
```json
{
  "mcpServers": {
    "pai-history": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/examples/history-server-example.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai"
      }
    }
  }
}
```

2. Start OpenCode - the server will auto-start

3. Check history files in `~/.opencode/pai/history/sessions/`

**Note:** This is a template. You'll need to:
- Adjust database schema queries to match OpenCode's actual structure
- Customize history format to your preferences
- Add error handling for your use case

---

## Creating Your Own MCP Server

### Basic Template

```typescript
#!/usr/bin/env bun
import { readFileSync } from 'fs';
import { join } from 'path';

// Get PAI directory from environment
const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.opencode', 'pai');

// MCP protocol handler
process.stdin.setEncoding('utf8');

process.stdin.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString());

    if (request.method === 'initialize') {
      // Server initialization
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          capabilities: ['your-capability'],
          metadata: {
            name: 'Your Server Name',
            version: '1.0.0',
            description: 'What your server does'
          }
        }
      };

      process.stdout.write(JSON.stringify(response) + '\n');
    }

    // Handle other methods...

  } catch (error) {
    console.error('[Server] Error:', error);
  }
});

// Keep server alive
process.stdin.resume();
```

### MCP Protocol Methods

Common methods to implement:

- `initialize` - Server startup
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read a resource

---

## Testing Your Server

```bash
# Run manually to test
cd ~/.opencode/pai/examples
bun run history-server-example.ts

# Should start and wait for input
# Press Ctrl+C to exit

# Test with echo
echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | bun run history-server-example.ts
```

---

## Resources

- [MCP Protocol Spec](https://spec.modelcontextprotocol.io/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [PAI Pack Conversion Guide](../PACK_CONVERSION_GUIDE.md)

---

**Have an example to share?** Submit a PR!
