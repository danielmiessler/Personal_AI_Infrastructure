# Connect Claude Code to tools via MCP

Claude Code integrates with hundreds of external tools through the Model Context Protocol (MCP), an open standard for AI-tool connections. MCP servers provide access to databases, APIs, and services.

## What you can do with MCP

With connected MCP servers, Claude Code can:

- Implement features from issue trackers
- Analyze monitoring and analytics data
- Query databases directly
- Integrate design files
- Automate workflows across services

## Popular MCP servers

**Development & Testing:**
- Sentry (error monitoring)
- Socket (dependency security)
- Hugging Face (AI models)
- Jam (debugging with recordings)

**Project Management:**
- Asana, Atlassian, ClickUp, Linear, Notion
- Intercom, Box, Fireflies, Monday

**Databases & Data:**
- Airtable, Daloopa, HubSpot

**Payments:**
- PayPal, Plaid, Square, Stripe

**Design & Media:**
- Figma, Cloudinary, Canva, invideo

**Infrastructure:**
- Cloudflare, Netlify, Vercel, Stytch

## Installing MCP servers

### Option 1: HTTP servers (recommended)

```bash
claude mcp add --transport http <name> <url>
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

### Option 2: SSE servers (deprecated)

```bash
claude mcp add --transport sse <name> <url>
```

### Option 3: Local stdio servers

```bash
claude mcp add --transport stdio <name> -- <command>
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY -- npx -y airtable-mcp-server
```

**Windows note:** Use `cmd /c` wrapper for npx commands:
```bash
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

## Managing servers

```bash
claude mcp list              # List all servers
claude mcp get <name>        # Get server details
claude mcp remove <name>     # Remove a server
/mcp                         # Check status in Claude Code
```

**Tips:**
- Use `--scope` flag: `local` (default), `project`, or `user`
- Set environment variables: `--env KEY=value`
- Configure timeout: `MCP_TIMEOUT=10000`
- Increase output limit: `MAX_MCP_OUTPUT_TOKENS=50000`

## Plugin-provided MCP servers

Plugins can bundle MCP servers automatically. Configure in `.mcp.json` at plugin root or inline in `plugin.json`:

```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    }
  }
}
```

## MCP installation scopes

**Local scope:** Private to current project (default)
```bash
claude mcp add --transport http stripe https://mcp.stripe.com
```

**Project scope:** Shared via `.mcp.json` in version control
```bash
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

**User scope:** Available across all projects
```bash
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### Scope precedence

Local > Project > User (local overrides others)

### Environment variable expansion

Supported in `.mcp.json`:
```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

Use `${VAR}` or `${VAR:-default}` syntax.

## Practical examples

**Monitor errors with Sentry:**
```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
/mcp  # authenticate
# "What are the most common errors in the last 24 hours?"
```

**Connect to GitHub:**
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
/mcp  # authenticate
# "Review PR #456 and suggest improvements"
```

**Query PostgreSQL:**
```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:[email protected]:5432/analytics"
# "What's our total revenue this month?"
```

## Authentication

Use `/mcp` command within Claude Code to authenticate with OAuth 2.0 services. Tokens refresh automatically and can be revoked via the `/mcp` menu.

## Add servers from JSON

```bash
claude mcp add-json weather-api '{"type":"http","url":"https://api.weather.com/mcp"}'
```

## Import from Claude Desktop

```bash
claude mcp add-from-claude-desktop
# Select servers in interactive dialog
```

Works on macOS and WSL.

## Use Claude Code as an MCP server

```bash
claude mcp serve
```

Add to Claude Desktop's `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"]
    }
  }
}
```

## MCP output limits

- **Warning threshold:** 10,000 tokens
- **Default maximum:** 25,000 tokens
- **Adjust:** `export MAX_MCP_OUTPUT_TOKENS=50000`

## MCP resources

Reference resources with `@` mentions:
```
@server:protocol://resource/path
@github:issue://123
@docs:file://api/authentication
```

Resources autocomplete and are fetched automatically.

## MCP prompts as slash commands

Available prompts appear with `/mcp__servername__promptname`:
```
/mcp__github__list_prs
/mcp__github__pr_review 456
/mcp__jira__create_issue "Bug in login flow" high
```

## Enterprise MCP configuration

Administrators deploy `managed-mcp.json`:
- **macOS:** `/Library/Application Support/ClaudeCode/managed-mcp.json`
- **Windows:** `C:\ProgramData\ClaudeCode\managed-mcp.json`
- **Linux:** `/etc/claude-code/managed-mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

### Restricting servers

In `managed-settings.json`, use allowlists and denylists:
```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverName": "sentry" }
  ],
  "deniedMcpServers": [
    { "serverName": "filesystem" }
  ]
}
```

- **Allowlist undefined:** No restrictions
- **Allowlist empty `[]`:** Complete lockdown
- **Denylist takes precedence:** Even if in allowlist
