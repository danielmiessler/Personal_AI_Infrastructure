# AddMcp Workflow

**Purpose:** Add an MCP server to the current project from templates.

## Execution Steps

1. **Identify the MCP to add**
   - User specifies by name (e.g., "cloudflare", "unifi")
   - Or by use case (e.g., "I need web scraping") → suggest appropriate MCP

2. **Read the template**
   ```bash
   cat ~/.claude/mcp-templates/{name}.json
   ```

3. **Check required environment variables**
   - Read `required_env` from template
   - Verify each exists in `~/.config/.env`
   - Warn if any are missing

4. **Read or create project .mcp.json**
   - Check if `<project-root>/.mcp.json` exists
   - If not, create with empty `mcpServers` object

5. **Add the MCP config**
   - Extract `config` from template
   - Add to project's `.mcp.json` under `mcpServers.{name}`
   - Preserve any existing MCPs

6. **Confirm and instruct**
   - Show what was added
   - Remind user to restart Claude Code

## Example

**Adding Cloudflare to a project:**

```bash
# 1. Read template
cat ~/.claude/mcp-templates/cloudflare.json

# 2. Check env vars
grep -E "CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_MCP_PATH" ~/.config/.env

# 3. Read current project config (or create empty)
cat .mcp.json 2>/dev/null || echo '{"mcpServers": {}}'

# 4. Add cloudflare to .mcp.json
# (Use Edit tool to add the config block)
```

**Result in .mcp.json:**
```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "bash",
      "args": [
        "-c",
        "source ~/.config/.env && node \"${CLOUDFLARE_MCP_PATH}/dist/index.js\""
      ]
    }
  }
}
```

## Error Handling

- **Template not found:** List available templates
- **Missing env vars:** Show which are missing, where to add them
- **MCP already exists:** Ask to overwrite or skip

## Notes

- Always use template configs exactly (ensures consistency)
- Never add credentials directly to .mcp.json
- Restart Claude Code after adding MCPs
