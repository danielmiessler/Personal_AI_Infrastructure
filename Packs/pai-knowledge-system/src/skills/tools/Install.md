# Install Knowledge System

Workflow for installing and configuring the PAI Knowledge System.

## When to Use

Use this workflow when the user requests:
- "install knowledge"
- "setup knowledge system"
- "configure knowledge graph"
- "install knowledge system"

## Prerequisites Check

Before installation, verify:

1. **Container runtime available:**
   ```bash
   command -v podman || command -v docker
   ```

2. **Bun runtime installed:**
   ```bash
   command -v bun
   ```

3. **API key configured:**
   - Check for `OPENAI_API_KEY` or `PAI_KNOWLEDGE_OPENAI_API_KEY` in environment
   - Or in `~/.config/pai/.env`

## Installation Steps

### Step 1: Start MCP Server

```bash
cd /path/to/pai-knowledge-system
bun run src/server/run.ts
```

### Step 2: Verify Server Health

```bash
curl -s http://localhost:8000/health
```

Expected: `{"status":"healthy"}`

### Step 3: Install Skill

```bash
PAI_SKILLS_DIR="${PAI_DIR:-$HOME/.claude}/skills"
cp -r src/skills "$PAI_SKILLS_DIR/Knowledge"
```

### Step 4: Configure MCP in Claude

Add to `~/.claude.json`:
```json
{
  "mcpServers": {
    "pai-knowledge": {
      "type": "sse",
      "url": "http://localhost:8000/sse"
    }
  }
}
```

### Step 5: Restart Claude Code

Restart Claude Code to load the MCP configuration.

## Verification

After installation, test with:

1. **Check status:** "Show knowledge graph status"
2. **Capture test:** "Remember that PAI Knowledge System is now installed"
3. **Search test:** "What do I know about PAI?"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server won't start | Check logs: `bun run src/server/logs.ts` |
| MCP tools not available | Verify `~/.claude.json` has pai-knowledge entry |
| API errors | Check API key is valid and has quota |

## Related

- `INSTALL.md` - Full installation guide in pack root
- `VERIFY.md` - Complete verification checklist
- `diagnose.ts` - Diagnostic tool for troubleshooting
