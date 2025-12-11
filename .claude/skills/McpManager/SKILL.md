---
name: McpManager
description: MCP server configuration management. USE WHEN user wants to add, remove, list, or audit MCP servers for the current project. Manages project-level .mcp.json from templates in ~/.claude/mcp-templates/.
---

# McpManager

Manages MCP server configurations for projects using a template-based approach. Keeps global MCPs minimal (Joplin, GitLab) and uses templates for project-specific needs.

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName McpManager
```

| Workflow | Trigger | File |
|----------|---------|------|
| **AddMcp** | "add MCP", "enable cloudflare", "I need unifi" | `workflows/AddMcp.md` |
| **RemoveMcp** | "remove MCP", "disable playwright" | `workflows/RemoveMcp.md` |
| **ListMcp** | "list MCPs", "what MCPs available", "show templates" | `workflows/ListMcp.md` |
| **AuditMcp** | "audit MCPs", "check MCP config", "MCP health" | `workflows/AuditMcp.md` |

## Examples

**Example 1: Add Cloudflare to a project**
```
User: "I need Cloudflare for this project"
→ Invokes AddMcp workflow
→ Reads template from ~/.claude/mcp-templates/cloudflare.json
→ Adds to project's .mcp.json (creates if needed)
→ Lists required env vars to verify
```

**Example 2: See available MCP templates**
```
User: "What MCPs can I add?"
→ Invokes ListMcp workflow
→ Reads all templates from ~/.claude/mcp-templates/
→ Shows name, description, and use cases for each
```

**Example 3: Audit current project's MCP setup**
```
User: "Check my MCP configuration"
→ Invokes AuditMcp workflow
→ Compares global vs project MCPs
→ Warns about unnecessary globals or missing project MCPs
→ Checks required env vars are set
```

## Architecture

```
~/.claude/
├── .mcp.json                    # GLOBAL: Only Joplin + GitLab
├── mcp-templates/               # Templates for project-level MCPs
│   ├── cloudflare.json
│   ├── unifi.json
│   ├── brightdata.json
│   ├── apify.json
│   ├── playwright.json
│   └── ref.json
├── mcp-configs/                 # Config files for global MCPs
│   └── joplin.json
└── mcp-venvs/                   # Python venvs for global MCPs
    └── joplin/

<project>/.mcp.json              # PROJECT: From templates as needed
```

## Governance Principles

1. **Global MCPs are minimal** - Only truly universal tools (Joplin, GitLab)
2. **Project MCPs from templates** - Consistent configuration, easy setup
3. **Env vars in ~/.config/.env** - Credentials never in MCP configs
4. **Audit regularly** - Check for sprawl and misconfigurations

## Available Templates

| Template | Use Cases |
|----------|-----------|
| `cloudflare` | Web deployment, DNS, edge functions, static sites |
| `unifi` | Network management, infrastructure, UniFi devices |
| `brightdata` | Web scraping, CAPTCHA bypass, proxy rotation |
| `apify` | Web scraping, automation, data extraction |
| `playwright` | Browser automation, E2E testing, screenshots |
| `ref` | Documentation search, API reference |

## Template Schema

Each template in `~/.claude/mcp-templates/` follows this structure:

```json
{
  "name": "mcp-name",
  "description": "What this MCP does",
  "config": {
    "command": "...",
    "args": ["..."]
  },
  "required_env": ["ENV_VAR_1", "ENV_VAR_2"],
  "use_cases": ["use case 1", "use case 2"]
}
```
