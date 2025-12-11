# RemoveMcp Workflow

**Purpose:** Remove an MCP server from the current project's configuration.

## Execution Steps

1. **Identify the MCP to remove**
   - User specifies by name (e.g., "cloudflare", "unifi")

2. **Read current project config**
   ```bash
   cat .mcp.json
   ```

3. **Verify MCP exists in project**
   - Check if `mcpServers.{name}` exists
   - If not, inform user it's not configured

4. **Remove the MCP**
   - Use Edit tool to remove the MCP entry
   - Preserve other MCPs

5. **Handle empty config**
   - If no MCPs remain, can either:
     - Delete .mcp.json entirely
     - Leave empty `{"mcpServers": {}}`

6. **Confirm and instruct**
   - Show what was removed
   - Remind user to restart Claude Code

## Example

**Removing Cloudflare from a project:**

```bash
# 1. Read current config
cat .mcp.json

# 2. Verify cloudflare exists
# 3. Use Edit tool to remove the cloudflare block

# 4. Confirm removal
cat .mcp.json
```

## Error Handling

- **MCP not found:** Show what MCPs ARE configured
- **File doesn't exist:** Inform user no project MCPs are configured

## Notes

- This only removes from project config, not from templates
- Global MCPs (Joplin, GitLab) cannot be removed this way
- Restart Claude Code after removing MCPs
