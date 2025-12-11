# ListMcp Workflow

**Purpose:** List available MCP templates and current project configuration.

## Execution Steps

1. **List available templates**
   ```bash
   ls ~/.claude/mcp-templates/
   ```

2. **For each template, show details**
   - Name
   - Description
   - Use cases
   - Required env vars

3. **Show global MCPs**
   ```bash
   cat ~/.claude/.mcp.json
   ```

4. **Show current project MCPs**
   ```bash
   cat .mcp.json 2>/dev/null || echo "No project MCPs configured"
   ```

## Output Format

```
=== AVAILABLE MCP TEMPLATES ===

cloudflare
  Description: Cloudflare infrastructure: DNS, Pages, Workers, D1, KV, R2, WAF
  Use cases: web deployment, DNS management, edge functions, static sites
  Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_MCP_PATH

unifi
  Description: UniFi Network Controller: devices, clients, VLANs, firewall, WiFi
  Use cases: network management, infrastructure, home lab
  Requires: UNIFI_HOST, UNIFI_USERNAME, UNIFI_PASSWORD

brightdata
  Description: BrightData web scraping with CAPTCHA bypass
  Use cases: web scraping, data collection, CAPTCHA bypass
  Requires: BRIGHTDATA_API_KEY

apify
  Description: Apify web scraping and automation actors
  Use cases: web scraping, automation, data extraction
  Requires: APIFY_API_KEY

playwright
  Description: Playwright browser automation and testing
  Use cases: browser automation, E2E testing, screenshots
  Requires: (none)

ref
  Description: Ref.ai documentation search
  Use cases: documentation search, API reference
  Requires: (none)

=== GLOBAL MCPs (all projects) ===
- joplin: Documentation source of truth
- gitlab: Repo and CI/CD management

=== PROJECT MCPs (this project) ===
- unifi: UniFi Network Controller
```

## Notes

- Templates are in `~/.claude/mcp-templates/`
- Global config is `~/.claude/.mcp.json`
- Project config is `.mcp.json` at project root
